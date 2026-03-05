import { useState, useCallback, useRef, useMemo } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeChunk, analyzeAudio } from "../api";
import { addProject, loadProjects } from "../storage";
import RecordButton from "../components/RecordButton";
import LiveTranscript from "../components/LiveTranscript";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

const TIPS = [
  "💡 Parle de ton problème, ta cible client, et ta solution idéale.",
  "💡 Décris le parcours utilisateur idéal de ton app.",
  "💡 Quel est ton avantage par rapport à la concurrence ?",
  "💡 Imagine que tu pitches à un investisseur en 2 minutes.",
  "💡 Commence par : le problème c'est que..., ma solution c'est...",
];

const STEPS = [
  { emoji: "🎙️", title: "Parle", desc: "Décris ton idée librement" },
  { emoji: "🤖", title: "L'IA analyse", desc: "PM virtuel en action" },
  { emoji: "✅", title: "Plan d'action", desc: "Tâches prêtes à exécuter" },
];

export default function DictateScreen({ navigation }) {
  const { colors: c } = useTheme();
  const [liveLines, setLiveLines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [showActions, setShowActions] = useState(false);
  const liveTranscribing = useRef(false);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  useFocusEffect(
    useCallback(() => {
      loadProjects().then((p) => setRecentProjects(p.slice(0, 5))).catch(() => {});
    }, [])
  );

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
      navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: saved.id } });
    } catch (err) { setError(err.message); }
    finally { setProcessing(false); }
  }, [audioUri, audioBlob, navigation, resetRecording]);

  const handleReset = () => { resetRecording(); setLiveLines([]); setError(null); setShowActions(false); };

  const hasContent = isRecording || showActions || processing || liveLines.length > 0;
  const wordCount = liveLines.join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bgPrimary }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "spring", damping: 18 }}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Nouvelle dictée</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Décris ton idée librement. L'IA structure tout.</Text>
      </MotiView>

      {/* Tip card */}
      <AnimatePresence>
        {!hasContent && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "timing", duration: 300 }}
            style={styles.tipCard}
          >
            <Text style={styles.tipText}>{tip}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Record button */}
      <View style={styles.recordZone}>
        <RecordButton
          isRecording={isRecording}
          duration={duration}
          onStart={handleStart}
          onStop={handleStop}
          disabled={processing}
        />

        {/* Action buttons */}
        <AnimatePresence>
          {showActions && !processing && (
            <MotiView
              from={{ opacity: 0, translateY: 15, scale: 0.9 }}
              animate={{ opacity: 1, translateY: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
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
                  <Text style={styles.analyzeBtnText}>✨ Analyser le projet</Text>
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
            <Text style={[styles.processingText, { color: c.textSecondary }]}>L'IA analyse ton projet...</Text>
          </MotiView>
        )}
      </View>

      <LiveTranscript lines={liveLines} isRecording={isRecording} />

      {liveLines.length > 0 && (
        <Text style={[styles.wordCount, { color: c.textMuted }]}>{wordCount} mot{wordCount > 1 ? "s" : ""}</Text>
      )}

      {error && (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={[styles.errorCard, { backgroundColor: c.dangerSoft, borderColor: c.dangerBorderSoft }]}>
          <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={[styles.dismissText, { color: c.danger }]}>Fermer</Text>
          </TouchableOpacity>
        </MotiView>
      )}

      {/* How it works */}
      <AnimatePresence>
        {!hasContent && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 200 }}
          >
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>COMMENT ÇA MARCHE</Text>
            <View style={styles.stepsRow}>
              {STEPS.map((step, i) => (
                <MotiView
                  key={i}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", damping: 18, delay: 300 + i * 120 }}
                  style={[styles.stepCard, { borderColor: c.border }]}
                >
                  <Text style={styles.stepEmoji}>{step.emoji}</Text>
                  <Text style={[styles.stepTitle, { color: c.textPrimary }]}>{step.title}</Text>
                  <Text style={[styles.stepDesc, { color: c.textSecondary }]}>{step.desc}</Text>
                </MotiView>
              ))}
            </View>

            {/* Recent projects */}
            {recentProjects.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={[styles.sectionLabel, { color: c.textMuted, marginBottom: 0, marginTop: 0 }]}>RÉCENTS</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Projets")}>
                    <Text style={[styles.seeAll, { color: c.accentLight }]}>Voir tout →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {recentProjects.map((p, i) => {
                    const bandColor = p.review?.verdict === "go" ? c.success : p.review?.verdict === "pivot" ? c.warning : c.danger;
                    return (
                      <MotiView
                        key={p.id}
                        from={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", damping: 18, delay: i * 80 }}
                      >
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: p.id } })}
                          style={[styles.recentCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
                        >
                          <View style={[styles.recentBand, { backgroundColor: bandColor }]} />
                          <Text style={[styles.recentName, { color: c.textPrimary }]} numberOfLines={1}>{p.project_name}</Text>
                          <Text style={[styles.recentTasks, { color: c.textMuted }]}>{p.tasks?.length || 0} tâches</Text>
                        </TouchableOpacity>
                      </MotiView>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </MotiView>
        )}
      </AnimatePresence>

      <Text style={[styles.privacyNote, { color: c.textDisabled }]}>🔒 Ton audio n'est jamais stocké</Text>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: spacing.lg, lineHeight: 21 },
  tipCard: { backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: spacing.lg },
  tipText: { fontSize: 13, color: "#F5C842", lineHeight: 19 },
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
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, marginBottom: 12, marginTop: spacing.md },
  stepsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.xl },
  stepCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1 },
  stepEmoji: { fontSize: 24, marginBottom: 8 },
  stepTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  stepDesc: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  recentSection: { marginBottom: spacing.xl },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 12, fontWeight: "500" },
  recentCard: { width: 140, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  recentBand: { height: 3, width: "100%" },
  recentName: { fontSize: 12, fontWeight: "600", padding: 10, paddingBottom: 4 },
  recentTasks: { fontSize: 11, paddingHorizontal: 10, paddingBottom: 10 },
  privacyNote: { textAlign: "center", fontSize: 11, marginTop: spacing.lg },
});
