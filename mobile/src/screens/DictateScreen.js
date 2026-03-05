import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ScrollView, Animated, StyleSheet } from "react-native";
import { YStack, XStack, Text, Card, Button } from "tamagui";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { transcribeChunk, analyzeAudio } from "../api";
import { addProject, loadProjects } from "../storage";
import RecordButton from "../components/RecordButton";
import LiveTranscript from "../components/LiveTranscript";
import { colors, fadeInUp } from "../theme";

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
    <Card
      backgroundColor="rgba(245,158,11,0.06)"
      borderColor="rgba(245,158,11,0.12)"
      borderWidth={1}
      borderRadius={14}
      padding="$3"
      marginBottom="$3"
    >
      <Text color="#F5C842" fontSize={13} lineHeight={19}>{tip}</Text>
    </Card>
  );
}

function HowItWorks() {
  return (
    <YStack marginTop="$3" marginBottom="$4">
      <Text color={colors.textMuted} fontSize={11} fontWeight="600" letterSpacing={0.9} marginBottom={12}>
        COMMENT ÇA MARCHE
      </Text>
      <XStack gap={10}>
        {STEPS.map((step, i) => (
          <Card
            key={i}
            flex={1}
            backgroundColor="rgba(255,255,255,0.04)"
            borderColor={colors.border}
            borderWidth={1}
            borderRadius={14}
            padding="$3"
            alignItems="center"
          >
            <Text fontSize={24} marginBottom={8}>{step.emoji}</Text>
            <Text color={colors.textPrimary} fontSize={13} fontWeight="700" marginBottom={4}>
              {step.title}
            </Text>
            <Text color={colors.textSecondary} fontSize={11} textAlign="center" lineHeight={15}>
              {step.desc}
            </Text>
          </Card>
        ))}
      </XStack>
    </YStack>
  );
}

function RecentProject({ item, onPress }) {
  const v = item.review?.verdict || "go";
  const bandColor = v === "go" ? colors.success : v === "pivot" ? colors.warning : colors.danger;
  return (
    <Card
      onPress={onPress}
      pressStyle={{ scale: 0.97 }}
      width={140}
      backgroundColor={colors.bgCard}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius={12}
      overflow="hidden"
    >
      <YStack height={3} width="100%" backgroundColor={bandColor} />
      <Text color={colors.textPrimary} fontSize={12} fontWeight="600" padding={10} paddingBottom={4} numberOfLines={1}>
        {item.project_name}
      </Text>
      <Text color={colors.textMuted} fontSize={11} paddingHorizontal={10} paddingBottom={10}>
        {item.tasks?.length || 0} tâches
      </Text>
    </Card>
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

  const { isRecording, duration, audioUri, audioBlob, startRecording, stopRecording, resetRecording } =
    useAudioRecorder(handleChunk);

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
      navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: saved.id } });
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
      <Text color={colors.textPrimary} fontSize={28} fontWeight="700" letterSpacing={-0.5} marginBottom={4}>
        Nouvelle dictée
      </Text>
      <Text color={colors.textSecondary} fontSize={15} marginBottom="$4" lineHeight={21}>
        Décris ton idée librement. L'IA structure tout.
      </Text>

      {!hasContent && <TipCard />}

      <YStack alignItems="center" paddingVertical={4} marginBottom="$3">
        <RecordButton
          isRecording={isRecording}
          duration={duration}
          onStart={handleStart}
          onStop={handleStop}
          disabled={processing}
        />

        {showActions && (
          <Animated.View style={{ flexDirection: "row", gap: 10, marginTop: 4, opacity: analyzeBtnAnim, transform: [{ scale: analyzeBtnScale }] }}>
            <Button
              size="$4"
              backgroundColor={colors.accent}
              color="#fff"
              fontWeight="600"
              borderRadius={14}
              pressStyle={{ scale: 0.97, opacity: 0.9 }}
              onPress={handleAnalyze}
              shadowColor={colors.accent}
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.3}
              shadowRadius={12}
            >
              ✨ Analyser le projet
            </Button>
            <Button
              size="$4"
              chromeless
              borderColor={colors.border}
              borderWidth={1}
              borderRadius={14}
              color={colors.textSecondary}
              pressStyle={{ scale: 0.97 }}
              onPress={handleReset}
            >
              Effacer
            </Button>
          </Animated.View>
        )}

        {processing && (
          <XStack alignItems="center" gap={10} marginTop={20}>
            <Text color={colors.textSecondary} fontSize={14}>L'IA analyse ton projet...</Text>
          </XStack>
        )}
      </YStack>

      <LiveTranscript lines={liveLines} isRecording={isRecording} />

      {liveLines.length > 0 && (
        <Text color={colors.textMuted} fontSize={11} textAlign="right" marginTop={-8} marginBottom={12}>
          {wordCount} mot{wordCount > 1 ? "s" : ""}
        </Text>
      )}

      {error && (
        <Card
          backgroundColor={colors.dangerSoft}
          borderColor={colors.dangerBorderSoft}
          borderWidth={1}
          borderRadius={16}
          padding="$3.5"
          marginBottom="$3"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <Text color={colors.danger} fontSize={13} flex={1} marginRight={10}>{error}</Text>
            <Button size="$2" chromeless color={colors.danger} fontWeight="600" onPress={() => setError(null)}>
              Fermer
            </Button>
          </XStack>
        </Card>
      )}

      {!hasContent && <HowItWorks />}

      {recentProjects.length > 0 && !hasContent && (
        <YStack marginBottom="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <Text color={colors.textMuted} fontSize={11} fontWeight="600" letterSpacing={0.9}>
              RÉCENTS
            </Text>
            <Button size="$2" chromeless color={colors.accentLight} fontSize={12} onPress={() => navigation.navigate("Projets")}>
              Voir tout →
            </Button>
          </XStack>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
            {recentProjects.map((p) => (
              <RecentProject
                key={p.id}
                item={p}
                onPress={() => navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: p.id } })}
              />
            ))}
          </ScrollView>
        </YStack>
      )}

      <Text color={colors.textDisabled} fontSize={11} textAlign="center" marginTop="$3">
        🔒 Ton audio n'est jamais stocké
      </Text>

      <YStack height={120} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingTop: 56 },
});
