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
import { colors, radius, spacing } from "../theme";

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MotiView from={{ opacity: 0, translateY: 15 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "spring", damping: 18 }}>
        <Text style={styles.title}>Nouvelle dictée</Text>
        <Text style={styles.subtitle}>Décris ton idée librement. L'IA structure tout.</Text>
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
                  colors={[colors.accent, "#6D28D9"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.analyzeBtn}
                >
                  <Text style={styles.analyzeBtnText}>✨ Analyser le projet</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Effacer</Text>
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>

        {processing && (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.processingText}>L'IA analyse ton projet...</Text>
          </MotiView>
        )}
      </View>

      <LiveTranscript lines={liveLines} isRecording={isRecording} />

      {liveLines.length > 0 && (
        <Text style={styles.wordCount}>{wordCount} mot{wordCount > 1 ? "s" : ""}</Text>
      )}

      {error && (
        <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.dismissText}>Fermer</Text>
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
            <Text style={styles.sectionLabel}>COMMENT ÇA MARCHE</Text>
            <View style={styles.stepsRow}>
              {STEPS.map((step, i) => (
                <MotiView
                  key={i}
                  from={{ opacity: 0, translateY: 20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "spring", damping: 18, delay: 300 + i * 120 }}
                  style={styles.stepCard}
                >
                  <Text style={styles.stepEmoji}>{step.emoji}</Text>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </MotiView>
              ))}
            </View>

            {/* Recent projects */}
            {recentProjects.length > 0 && (
              <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                  <Text style={styles.sectionLabel}>RÉCENTS</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("Projets")}>
                    <Text style={styles.seeAll}>Voir tout →</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {recentProjects.map((p, i) => {
                    const bandColor = p.review?.verdict === "go" ? colors.success : p.review?.verdict === "pivot" ? colors.warning : colors.danger;
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
                          style={styles.recentCard}
                        >
                          <View style={[styles.recentBand, { backgroundColor: bandColor }]} />
                          <Text style={styles.recentName} numberOfLines={1}>{p.project_name}</Text>
                          <Text style={styles.recentTasks}>{p.tasks?.length || 0} tâches</Text>
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

      <Text style={styles.privacyNote}>🔒 Ton audio n'est jamais stocké</Text>
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 21 },
  tipCard: { backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: spacing.lg },
  tipText: { fontSize: 13, color: "#F5C842", lineHeight: 19 },
  recordZone: { alignItems: "center", paddingVertical: 4, marginBottom: spacing.md },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  analyzeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.input },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  resetBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: radius.input, borderColor: colors.border, borderWidth: 1 },
  resetBtnText: { color: colors.textSecondary, fontWeight: "500", fontSize: 14 },
  processingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  processingText: { color: colors.textSecondary, fontSize: 14 },
  wordCount: { textAlign: "right", fontSize: 11, color: colors.textMuted, marginTop: -8, marginBottom: 12 },
  errorCard: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorderSoft, borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  errorText: { color: colors.danger, fontSize: 13, flex: 1, marginRight: 10 },
  dismissText: { color: colors.danger, fontWeight: "600", fontSize: 12 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, color: colors.textMuted, marginBottom: 12, marginTop: spacing.md },
  stepsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.xl },
  stepCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14, alignItems: "center", borderColor: colors.border, borderWidth: 1 },
  stepEmoji: { fontSize: 24, marginBottom: 8 },
  stepTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  stepDesc: { fontSize: 11, color: colors.textSecondary, textAlign: "center", lineHeight: 15 },
  recentSection: { marginBottom: spacing.xl },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 12, color: colors.accentLight, fontWeight: "500" },
  recentCard: { width: 140, backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  recentBand: { height: 3, width: "100%" },
  recentName: { fontSize: 12, fontWeight: "600", color: colors.textPrimary, padding: 10, paddingBottom: 4 },
  recentTasks: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 10, paddingBottom: 10 },
  privacyNote: { textAlign: "center", fontSize: 11, color: colors.textDisabled, marginTop: spacing.lg },
});
