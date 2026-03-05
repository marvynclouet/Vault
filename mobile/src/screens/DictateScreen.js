import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeChunk, analyzeAudio } from "../api";
import { addProject, loadProjects } from "../storage";
import RecordButton from "../components/RecordButton";
import LiveTranscript from "../components/LiveTranscript";
import { colors, radius, spacing, type, fadeInUp } from "../theme";

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

function TipCard() {
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  return (
    <View style={styles.tipCard}>
      <Text style={styles.tipText}>{tip}</Text>
    </View>
  );
}

function HowItWorks() {
  return (
    <View style={styles.howSection}>
      <Text style={styles.sectionLabel}>COMMENT ÇA MARCHE</Text>
      <View style={styles.stepsRow}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentProject({ item, onPress }) {
  const v = item.review?.verdict || "go";
  const bandColor = v === "go" ? colors.success : v === "pivot" ? colors.warning : colors.danger;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.recentCard}>
      <View style={[styles.recentBand, { backgroundColor: bandColor }]} />
      <Text style={styles.recentName} numberOfLines={1}>{item.project_name}</Text>
      <Text style={styles.recentTasks}>{item.tasks?.length || 0} tâches</Text>
    </TouchableOpacity>
  );
}

export default function DictateScreen({ navigation }) {
  const [liveLines, setLiveLines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const liveTranscribing = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  const analyzeBtnAnim = useRef(new Animated.Value(0)).current;
  const analyzeBtnScale = useRef(new Animated.Value(0.8)).current;
  const btnPressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      fadeInUp(fadeAnim),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

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
    } catch { /* skip */ } finally {
      liveTranscribing.current = false;
    }
  }, []);

  const {
    isRecording, duration, audioUri, audioBlob,
    startRecording, stopRecording, resetRecording,
  } = useAudioRecorder(handleChunk);

  const handleStart = useCallback(async () => {
    setLiveLines([]);
    setError(null);
    analyzeBtnAnim.setValue(0);
    await startRecording();
  }, [startRecording]);

  const handleStop = useCallback(async () => {
    await stopRecording();
    Animated.parallel([
      Animated.spring(analyzeBtnScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }),
      fadeInUp(analyzeBtnAnim),
    ]).start();
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
      navigation.navigate("Projets", {
        screen: "ProjectDetail",
        params: { projectId: saved.id },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  }, [audioUri, audioBlob, navigation, resetRecording]);

  const handleReset = () => {
    resetRecording();
    setLiveLines([]);
    setError(null);
    analyzeBtnAnim.setValue(0);
  };

  const showActions = (audioUri || audioBlob) && !processing;
  const hasContent = isRecording || showActions || processing || liveLines.length > 0;
  const wordCount = liveLines.join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Nouvelle dictée</Text>
      <Text style={styles.subtitle}>Décris ton idée librement. L'IA structure tout.</Text>

      {!hasContent && <TipCard />}

      <View style={styles.recordZone}>
        <RecordButton
          isRecording={isRecording}
          duration={duration}
          onStart={handleStart}
          onStop={handleStop}
          disabled={processing}
        />

        {showActions && (
          <Animated.View
            style={[styles.actionRow, { opacity: analyzeBtnAnim, transform: [{ scale: analyzeBtnScale }] }]}
          >
            <Animated.View style={{ transform: [{ scale: btnPressScale }] }}>
              <TouchableOpacity
                onPress={handleAnalyze}
                onPressIn={() => Animated.spring(btnPressScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
                onPressOut={() => Animated.spring(btnPressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
                activeOpacity={1}
                style={styles.analyzeBtn}
              >
                <Text style={styles.analyzeBtnText}>✨ Analyser le projet</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Effacer</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.processingText}>L'IA analyse ton projet...</Text>
          </View>
        )}
      </View>

      <LiveTranscript lines={liveLines} isRecording={isRecording} />

      {liveLines.length > 0 && (
        <Text style={styles.wordCount}>{wordCount} mot{wordCount > 1 ? "s" : ""}</Text>
      )}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.dismissText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* How it works — only when idle */}
      {!hasContent && <HowItWorks />}

      {/* Recent projects — only when idle */}
      {recentProjects.length > 0 && !hasContent && (
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionLabel}>RÉCENTS</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Projets")}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
            {recentProjects.map((p) => (
              <RecentProject
                key={p.id}
                item={p}
                onPress={() =>
                  navigation.navigate("Projets", {
                    screen: "ProjectDetail",
                    params: { projectId: p.id },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.privacyNote}>🔒 Ton audio n'est jamais stocké</Text>

      <View style={{ height: 120 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: spacing.xxxl + 16 },
  title: { ...type.h1, marginBottom: 4 },
  subtitle: { ...type.sub, marginBottom: spacing.lg, lineHeight: 21 },

  tipCard: {
    backgroundColor: "rgba(245,158,11,0.06)",
    borderColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: spacing.lg,
  },
  tipText: { fontSize: 13, color: "#F5C842", lineHeight: 19 },

  recordZone: { alignItems: "center", paddingVertical: 4, marginBottom: spacing.md },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  analyzeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: radius.input,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  analyzeBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  resetBtn: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radius.input,
    borderColor: colors.border,
    borderWidth: 1,
  },
  resetBtnText: { color: colors.textSecondary, fontWeight: "500", fontSize: 14 },
  processingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  processingText: { color: colors.textSecondary, fontSize: 14 },

  wordCount: { textAlign: "right", fontSize: 11, color: colors.textMuted, marginTop: -8, marginBottom: 12 },

  errorCard: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorderSoft,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1, marginRight: 10 },
  dismissText: { color: colors.danger, fontWeight: "600", fontSize: 12 },

  // How it works
  howSection: { marginTop: spacing.md, marginBottom: spacing.xl },
  sectionLabel: { ...type.label, marginBottom: 12 },
  stepsRow: { flexDirection: "row", gap: 10 },
  stepCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1,
  },
  stepEmoji: { fontSize: 24, marginBottom: 8 },
  stepTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  stepDesc: { fontSize: 11, color: colors.textSecondary, textAlign: "center", lineHeight: 15 },

  // Recent
  recentSection: { marginBottom: spacing.xl },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  seeAll: { fontSize: 12, color: colors.accentLight, fontWeight: "500" },
  recentScroll: { gap: 10, paddingRight: 20 },
  recentCard: {
    width: 140,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  recentBand: { height: 3, width: "100%" },
  recentName: { fontSize: 12, fontWeight: "600", color: colors.textPrimary, padding: 10, paddingBottom: 4 },
  recentTasks: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 10, paddingBottom: 10 },

  privacyNote: { textAlign: "center", fontSize: 11, color: colors.textDisabled, marginTop: spacing.lg },
});
