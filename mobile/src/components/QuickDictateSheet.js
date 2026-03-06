import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView, AnimatePresence } from "moti";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeChunk, analyzeAudio, updateProjectFromTranscript } from "../api";
import { addProject, updateProject, loadProjects } from "../storage";
import RecordButton from "./RecordButton";
import LiveTranscript from "./LiveTranscript";
import { useQuickDictate } from "../contexts/QuickDictateContext";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

const ANALYSIS_STEPS = [
  { key: "transcript", label: "Transcription terminée", delay: 0 },
  { key: "market", label: "Analyse du marché...", delay: 2500 },
  { key: "tasks", label: "Génération des tâches...", delay: 5000 },
];

export default function QuickDictateSheet({ onNavigateToProject }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { visible, close } = useQuickDictate();
  const [liveLines, setLiveLines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null); // null = nouveau projet
  const [showActions, setShowActions] = useState(false);
  const liveTranscribing = useRef(false);
  const stepTimers = useRef([]);

  useEffect(() => {
    if (visible) {
      loadProjects().then(setProjects).catch(() => {});
      setSelectedProjectId(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!processing) {
      setAnalysisStep(0);
      stepTimers.current.forEach((t) => clearTimeout(t));
      stepTimers.current = [];
      return;
    }
    ANALYSIS_STEPS.forEach((s, i) => {
      const t = setTimeout(() => setAnalysisStep((prev) => Math.max(prev, i + 1)), s.delay);
      stepTimers.current.push(t);
    });
    return () => stepTimers.current.forEach((t) => clearTimeout(t));
  }, [processing]);

  const handleChunk = useCallback(async (uri, blob) => {
    if (liveTranscribing.current) return;
    liveTranscribing.current = true;
    try {
      const text = await transcribeChunk(uri, blob);
      if (text && text.trim()) setLiveLines((prev) => [...prev, text.trim()]);
    } catch {} finally { liveTranscribing.current = false; }
  }, []);

  const { isRecording, duration, audioUri, audioBlob, startRecording, stopRecording, resetRecording } =
    useAudioRecorder(handleChunk);

  const handleStart = useCallback(async () => {
    setLiveLines([]);
    setError(null);
    setShowActions(false);
    await startRecording();
  }, [startRecording]);

  const handleStop = useCallback(async () => {
    await stopRecording();
    setShowActions(true);
  }, [stopRecording]);

  const handleAnalyze = useCallback(async () => {
    if (!audioUri && !audioBlob) return;
    setProcessing(true);
    setError(null);
    try {
      if (selectedProjectId) {
        const { transcribeAudioFull } = await import("../api");
        const transcript = await transcribeAudioFull(audioUri, audioBlob);
        const project = projects.find((p) => p.id === selectedProjectId);
        const result = await updateProjectFromTranscript(project, transcript);
        const analysis = result?.analysis || result;
        if (analysis) {
          await updateProject(selectedProjectId, {
            project_name: analysis.project_name,
            summary: analysis.summary,
            review: analysis.review,
            tasks: analysis.tasks,
          });
        }
        resetRecording();
        setLiveLines([]);
        setShowActions(false);
        close();
        onNavigateToProject?.(selectedProjectId);
      } else {
        const data = await analyzeAudio(audioUri, audioBlob);
        const saved = await addProject({
          transcript: data.transcript,
          project_name: data.analysis.project_name,
          summary: data.analysis.summary,
          review: data.analysis.review,
          tasks: data.analysis.tasks,
          synced_to: null,
        });
        resetRecording();
        setLiveLines([]);
        setShowActions(false);
        close();
        onNavigateToProject?.(saved.id);
      }
    } catch (err) {
      const msg = err?.message || "Erreur lors de l'analyse.";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  }, [audioUri, audioBlob, selectedProjectId, projects, close, onNavigateToProject, resetRecording]);

  const handleReset = useCallback(() => {
    resetRecording();
    setLiveLines([]);
    setError(null);
    setShowActions(false);
  }, [resetRecording]);

  const handleClose = useCallback(() => {
    if (!isRecording && !processing) {
      handleReset();
      close();
    }
  }, [isRecording, processing, handleReset, close]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide">
      <TouchableOpacity
        style={[styles.overlay, { paddingTop: insets.top }]}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[styles.sheet, { backgroundColor: c.bgSecondary, paddingBottom: insets.bottom + 24 }]}
        >
          <View style={[styles.handle, { backgroundColor: c.border }]} />

          <Text style={[styles.title, { color: c.textPrimary }]}>Quick dictée</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Dis ce que tu as en tête...
          </Text>

          {/* Project selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.projectScroll}
            contentContainerStyle={styles.projectRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedProjectId(null)}
              activeOpacity={0.7}
              style={[
                styles.projectChip,
                { borderColor: c.border, backgroundColor: !selectedProjectId ? c.accentBg : "transparent" },
              ]}
            >
              <Text style={[styles.projectChipText, { color: !selectedProjectId ? c.accentLight : c.textSecondary }]}>
                ✨ Nouveau projet
              </Text>
            </TouchableOpacity>
            {projects.slice(0, 5).map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProjectId(p.id)}
                activeOpacity={0.7}
                style={[
                  styles.projectChip,
                  { borderColor: c.border, backgroundColor: selectedProjectId === p.id ? c.accentBg : "transparent" },
                ]}
              >
                <Text
                  style={[styles.projectChipText, { color: selectedProjectId === p.id ? c.accentLight : c.textSecondary }]}
                  numberOfLines={1}
                >
                  {p.project_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Record zone */}
          <View style={styles.recordZone}>
            <RecordButton
              isRecording={isRecording}
              duration={duration}
              onStart={handleStart}
              onStop={handleStop}
              disabled={processing}
            />

            <AnimatePresence>
              {showActions && !processing && (
                <MotiView
                  from={{ opacity: 0, translateY: 10, scale: 0.95 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 14 }}
                  style={styles.actionRow}
                >
                  <TouchableOpacity onPress={handleAnalyze} activeOpacity={0.85}>
                    <LinearGradient
                      colors={[c.accent, "#6D28D9"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.analyzeBtn}
                    >
                      <Text style={styles.analyzeBtnText}>✨ Analyser</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleReset}
                    activeOpacity={0.7}
                    style={[styles.resetBtn, { borderColor: c.border }]}
                  >
                    <Text style={[styles.resetBtnText, { color: c.textSecondary }]}>Effacer</Text>
                  </TouchableOpacity>
                </MotiView>
              )}
            </AnimatePresence>

            {processing && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={[styles.processingCard, { borderColor: c.border }]}
              >
                <Text style={[styles.processingTitle, { color: c.textPrimary }]}>
                  🧠 Analyse en cours...
                </Text>
                {ANALYSIS_STEPS.map((s, i) => {
                  const done = i < analysisStep;
                  return (
                    <View key={s.key} style={styles.stepRow}>
                      <Text style={styles.stepIcon}>{done ? "✅" : "⏳"}</Text>
                      <Text style={[styles.stepLabel, { color: done ? c.success : c.textSecondary }]}>
                        {s.label}
                      </Text>
                    </View>
                  );
                })}
              </MotiView>
            )}
          </View>

          <LiveTranscript lines={liveLines} isRecording={isRecording} />

          {error && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={[styles.errorCard, { backgroundColor: c.dangerSoft, borderColor: c.dangerBorderSoft }]}
            >
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Text style={[styles.dismissText, { color: c.danger }]}>Fermer</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  projectScroll: { marginHorizontal: -spacing.xl, marginBottom: 16 },
  projectRow: { paddingHorizontal: spacing.xl, gap: 8 },
  projectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  projectChipText: { fontSize: 13, fontWeight: "600" },
  recordZone: { alignItems: "center", marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  analyzeBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.input },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  resetBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.input, borderWidth: 1 },
  resetBtnText: { fontWeight: "500", fontSize: 14 },
  processingCard: {
    marginTop: 16,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
  },
  processingTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  stepIcon: { fontSize: 12 },
  stepLabel: { fontSize: 12 },
  errorCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  errorText: { fontSize: 13, flex: 1, marginRight: 10 },
  dismissText: { fontWeight: "600", fontSize: 12 },
});
