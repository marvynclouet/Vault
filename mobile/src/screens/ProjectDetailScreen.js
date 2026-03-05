import { useState, useEffect, useCallback, useRef } from "react";
import { ScrollView, Animated, StyleSheet, Alert } from "react-native";
import { YStack, XStack, Text, Card, Button, Separator } from "tamagui";
import { getProject, updateProject } from "../storage";
import { pushToTrello } from "../api";
import TaskCard from "../components/TaskCard";
import ChatView from "../components/ChatView";
import { colors } from "../theme";

const TABS = [
  { key: "overview", label: "Résumé" },
  { key: "tasks", label: "Tâches" },
  { key: "chat", label: "Chat PM" },
];

const VERDICT = {
  go: { label: "FONCE", icon: "🟢", color: colors.success, bg: colors.successBg, border: colors.successBorder },
  pivot: { label: "À AJUSTER", icon: "🟡", color: colors.warning, bg: colors.warningBg, border: colors.warningBorder },
  drop: { label: "À REPENSER", icon: "🔴", color: colors.danger, bg: colors.dangerBg, border: colors.dangerBorder },
};

export default function ProjectDetailScreen({ route }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [pushing, setPushing] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getProject(projectId).then((p) => {
      setProject(p);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }).catch(console.error);
  }, [projectId]);

  const handleProjectUpdate = useCallback((updates) => {
    setProject((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const handlePushTrello = useCallback(async () => {
    if (!project) return;
    setPushing(true);
    try {
      const result = await pushToTrello({ project_name: project.project_name, summary: project.summary, tasks: project.tasks });
      await updateProject(project.id, { synced_to: "Trello" });
      setProject((p) => ({ ...p, synced_to: "Trello" }));
      Alert.alert("Trello", `${result.cards_created?.length || 0} carte(s) créée(s).`);
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setPushing(false);
    }
  }, [project]);

  if (!project) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor={colors.bgPrimary}>
        <Text color={colors.textMuted}>Chargement...</Text>
      </YStack>
    );
  }

  const review = project.review;
  const v = VERDICT[review?.verdict] || VERDICT.go;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingTop={4} paddingBottom={12}>
        <Text color={colors.textPrimary} fontSize={20} fontWeight="700" flex={1} marginRight={10} numberOfLines={1}>
          {project.project_name}
        </Text>
        <YStack flexDirection="row" alignItems="center" gap={5} backgroundColor={v.bg} borderColor={v.border} borderWidth={1} borderRadius={8} paddingHorizontal={10} paddingVertical={5}>
          <Text fontSize={12}>{v.icon}</Text>
          <Text color={v.color} fontSize={11} fontWeight="700">{v.label}</Text>
        </YStack>
      </XStack>

      {/* Tab bar */}
      <YStack paddingHorizontal={20} paddingBottom={12}>
        <XStack backgroundColor="rgba(255,255,255,0.04)" borderRadius={12} padding={4}>
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              flex={1}
              size="$3"
              backgroundColor={activeTab === tab.key ? colors.accentBg : "transparent"}
              color={activeTab === tab.key ? colors.accentLight : colors.textMuted}
              fontWeight="600"
              fontSize={13}
              borderRadius={10}
              pressStyle={{ opacity: 0.8 }}
              onPress={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </XStack>
      </YStack>

      {/* Overview */}
      {activeTab === "overview" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabInner} showsVerticalScrollIndicator={false}>
          <Text color={colors.textSecondary} fontSize={15} lineHeight={23} marginBottom={20}>
            {project.summary}
          </Text>

          {review && (
            <Card backgroundColor={v.bg} borderColor={v.border} borderWidth={1} borderRadius={16} padding="$4" marginBottom={20}>
              <Text color={colors.textPrimary} fontSize={15} fontWeight="600" lineHeight={22} marginBottom={16}>
                {review.one_liner}
              </Text>

              <XStack alignItems="center" gap={8} marginBottom={18}>
                <Text color={colors.textMuted} fontSize={12}>Confiance</Text>
                <YStack flex={1} height={6} borderRadius={3} backgroundColor="rgba(255,255,255,0.06)" overflow="hidden">
                  <YStack height="100%" borderRadius={3} backgroundColor={v.color} width={`${(review.confidence || 0) * 10}%`} />
                </YStack>
                <Text color={v.color} fontSize={13} fontWeight="700">{review.confidence}/10</Text>
              </XStack>

              <XStack gap={12}>
                <YStack flex={1}>
                  <Text color={colors.success} fontSize={11} fontWeight="700" letterSpacing={0.5} marginBottom={8}>
                    ✅ Forces
                  </Text>
                  {review.strengths?.map((s, i) => (
                    <Card key={i} backgroundColor="rgba(255,255,255,0.03)" borderRadius={8} padding={8} marginBottom={4}>
                      <Text color={colors.textSecondary} fontSize={12} lineHeight={17}>{s}</Text>
                    </Card>
                  ))}
                </YStack>
                <YStack flex={1}>
                  <Text color={colors.danger} fontSize={11} fontWeight="700" letterSpacing={0.5} marginBottom={8}>
                    ⚠️ Risques
                  </Text>
                  {review.risks?.map((r, i) => (
                    <Card key={i} backgroundColor="rgba(255,255,255,0.03)" borderRadius={8} padding={8} marginBottom={4}>
                      <Text color={colors.textSecondary} fontSize={12} lineHeight={17}>{r}</Text>
                    </Card>
                  ))}
                </YStack>
              </XStack>

              {review.suggestions?.length > 0 && (
                <YStack marginTop={16} paddingTop={16} borderTopWidth={1} borderTopColor="rgba(255,255,255,0.04)">
                  <Text color={colors.accentLight} fontSize={11} fontWeight="700" letterSpacing={0.5} marginBottom={8}>
                    💡 Recommandations
                  </Text>
                  {review.suggestions.map((s, i) => (
                    <Card key={i} backgroundColor="rgba(255,255,255,0.03)" borderRadius={8} padding={8} marginBottom={4}>
                      <Text color={colors.textSecondary} fontSize={12} lineHeight={17}>{s}</Text>
                    </Card>
                  ))}
                </YStack>
              )}
            </Card>
          )}

          <Card
            backgroundColor={colors.bgCard}
            borderColor={colors.border}
            borderWidth={1}
            borderRadius={16}
            padding="$3.5"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setTranscriptOpen(!transcriptOpen)}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text color={colors.textSecondary} fontSize={13} fontWeight="600">
                📝 {transcriptOpen ? "Masquer" : "Voir"} la dictée originale
              </Text>
              <Text color={colors.textMuted} fontSize={10}>{transcriptOpen ? "▲" : "▼"}</Text>
            </XStack>
          </Card>

          {transcriptOpen && (
            <Card backgroundColor="rgba(255,255,255,0.02)" borderRadius={12} padding="$3.5" marginTop={4}>
              <Text color={colors.textSecondary} fontSize={13} lineHeight={20} fontStyle="italic">
                "{project.transcript}"
              </Text>
            </Card>
          )}

          <YStack height={120} />
        </ScrollView>
      )}

      {/* Tasks */}
      {activeTab === "tasks" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabInner} showsVerticalScrollIndicator={false}>
          <Text color={colors.accentLight} fontSize={11} fontWeight="600" letterSpacing={0.9} marginBottom={12}>
            PLAN D'ACTION — {project.tasks?.length || 0} TÂCHES
          </Text>

          {project.tasks?.map((task, i) => (
            <TaskCard key={i} task={task} index={i} />
          ))}

          <YStack marginTop={28}>
            <Text color={colors.accentLight} fontSize={11} fontWeight="600" letterSpacing={0.9} marginBottom={12}>
              EXPORTER
            </Text>

            <Card
              backgroundColor={colors.bgCard}
              borderColor={project.synced_to === "Trello" ? colors.successBorder : colors.border}
              borderWidth={1}
              borderRadius={16}
              padding="$3.5"
              marginBottom={8}
              pressStyle={{ scale: 0.98 }}
              onPress={handlePushTrello}
              disabled={pushing || project.synced_to === "Trello"}
            >
              <XStack alignItems="center" gap={14}>
                <Text fontSize={22}>📋</Text>
                <YStack flex={1}>
                  <Text color={colors.textPrimary} fontSize={14} fontWeight="600">Trello</Text>
                  <Text color={colors.textMuted} fontSize={11} marginTop={2}>
                    {project.synced_to === "Trello" ? "Déjà synchronisé" : "Créer les cartes"}
                  </Text>
                </YStack>
                {project.synced_to === "Trello" && (
                  <Text color={colors.success} fontSize={18} fontWeight="700">✓</Text>
                )}
              </XStack>
            </Card>

            <Card
              backgroundColor={colors.bgCard}
              borderColor={colors.border}
              borderWidth={1}
              borderRadius={16}
              padding="$3.5"
              opacity={0.4}
            >
              <XStack alignItems="center" gap={14}>
                <Text fontSize={22}>📝</Text>
                <YStack flex={1}>
                  <Text color={colors.textPrimary} fontSize={14} fontWeight="600">Jira / Notion / Asana</Text>
                  <Text color={colors.textMuted} fontSize={11} marginTop={2}>Bientôt</Text>
                </YStack>
              </XStack>
            </Card>
          </YStack>

          <YStack height={120} />
        </ScrollView>
      )}

      {/* Chat */}
      {activeTab === "chat" && (
        <ChatView project={project} onProjectUpdate={handleProjectUpdate} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  tabContent: { flex: 1 },
  tabInner: { padding: 20 },
});
