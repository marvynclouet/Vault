import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeChunk, transcribeAudioFull, updateProjectFromTranscript } from "../api";
import { getProject, updateProject } from "../storage";
import RecordButton from "../components/RecordButton";
import LiveTranscript from "../components/LiveTranscript";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

export default function UpdateProjectScreen({ route, navigation }) {
  const { colors: c } = useTheme();
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [liveLines, setLiveLines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const liveTranscribing = useRef(false);

  useEffect(() => {
    getProject(projectId).then(setProject).catch(console.error);
  }, [projectId]);

  const handleChunk = useCallback(async (uri, blob) => {
    if (liveTranscribing.current) return;
    liveTranscribing.current = true;
    try {
      const text = await transcribeChunk(uri, blob);
      if (text?.trim()) setLiveLines((prev) => [...prev, text.trim()]);
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

  const handleApply = useCallback(async () => {
    if (!audioUri && !audioBlob) return;
    if (!project) return;
    setProcessing(true);
    setError(null);
    try {
      const transcript = await transcribeAudioFull(audioUri, audioBlob);
      if (!transcript?.trim()) throw new Error("Transcription vide.");
      const { analysis } = await updateProjectFromTranscript(project, transcript);
      const tasks = (analysis.tasks || []).map((t, i) => ({
        ...t,
        status: t.status || "todo",
        due_date: t.due_date ?? null,
        completed_at: t.completed_at ?? null,
        order: t.order ?? i,
      }));
      await updateProject(projectId, {
        transcript: project.transcript + "\n\n--- Mise à jour ---\n" + transcript,
        project_name: analysis.project_name ?? project.project_name,
        summary: analysis.summary ?? project.summary,
        review: analysis.review ?? project.review,
        tasks,
      });
      resetRecording();
      setLiveLines([]);
      setShowActions(false);
      navigation.goBack();
    } catch (err) {
      setError(err?.message || "Erreur lors de la mise à jour.");
    } finally {
      setProcessing(false);
    }
  }, [audioUri, audioBlob, project, projectId, navigation, resetRecording]);

  const handleReset = () => {
    resetRecording();
    setLiveLines([]);
    setError(null);
    setShowActions(false);
  };

  if (!project) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const hasContent = isRecording || showActions || processing || liveLines.length > 0;
  const wordCount = liveLines.join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bgPrimary }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "spring", damping: 18 }}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Mettre à jour</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Dicte les changements pour "{project.project_name}". L'IA fusionne avec le projet existant.
        </Text>
      </MotiView>

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
              from={{ opacity: 0, translateY: 15, scale: 0.9 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 14 }}
              style={styles.actionRow}
            >
              <TouchableOpacity onPress={handleApply} activeOpacity={0.85}>
                <LinearGradient
                  colors={[c.accent, "#6D28D9"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.analyzeBtn}
                >
                  <Text style={styles.analyzeBtnText}>✓ Appliquer les changements</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={[styles.resetBtn, { borderColor: c.border }]}>
                <Text style={[styles.resetBtnText, { color: c.textSecondary }]}>Effacer</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>

        {processing && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.processingRow}>
            <ActivityIndicator size="small" color={c.accent} />
            <Text style={[styles.processingText, { color: c.textSecondary }]}>Mise à jour en cours...</Text>
          </MotiView>
        )}
      </View>

      <LiveTranscript lines={liveLines} isRecording={isRecording} />

      {liveLines.length > 0 && (
        <Text style={[styles.wordCount, { color: c.textMuted }]}>{wordCount} mot{wordCount > 1 ? "s" : ""}</Text>
      )}

      {error && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={[styles.errorCard, { backgroundColor: c.dangerSoft, borderColor: c.dangerBorderSoft }]}>
          <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={[styles.dismissText, { color: c.danger }]}>Fermer</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: spacing.xl, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: spacing.lg, lineHeight: 21 },
  recordZone: { alignItems: "center", paddingVertical: 4, marginBottom: spacing.md },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  analyzeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.input },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  resetBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.input, borderWidth: 1 },
  resetBtnText: { fontWeight: "500", fontSize: 14 },
  processingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  processingText: { fontSize: 14 },
  wordCount: { textAlign: "right", fontSize: 11, marginTop: -8, marginBottom: 12 },
  errorCard: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  errorText: { fontSize: 13, flex: 1, marginRight: 10 },
  dismissText: { fontWeight: "600", fontSize: 12 },
});
