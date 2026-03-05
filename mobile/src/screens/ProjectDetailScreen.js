import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
} from "react-native";
import { getProject, updateProject } from "../storage";
import { pushToTrello } from "../api";
import TaskCard from "../components/TaskCard";
import ChatView from "../components/ChatView";
import { colors, radius, spacing, type, cardStyle } from "../theme";

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
      const result = await pushToTrello({
        project_name: project.project_name,
        summary: project.summary,
        tasks: project.tasks,
      });
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
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const review = project.review;
  const v = VERDICT[review?.verdict] || VERDICT.go;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.projectName} numberOfLines={1}>{project.project_name}</Text>
        <View style={[styles.verdictChip, { backgroundColor: v.bg, borderColor: v.border }]}>
          <Text style={{ fontSize: 12 }}>{v.icon}</Text>
          <Text style={[styles.verdictChipText, { color: v.color }]}>{v.label}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBarOuter}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Overview */}
      {activeTab === "overview" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.summary}>{project.summary}</Text>

          {review && (
            <View style={[styles.reviewCard, { backgroundColor: v.bg, borderColor: v.border }]}>
              <Text style={styles.oneLiner}>{review.one_liner}</Text>

              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confiance</Text>
                <View style={styles.confidenceTrack}>
                  <View style={[styles.confidenceFill, { width: `${(review.confidence || 0) * 10}%`, backgroundColor: v.color }]} />
                </View>
                <Text style={[styles.confidenceValue, { color: v.color }]}>{review.confidence}/10</Text>
              </View>

              <View style={styles.reviewCols}>
                <View style={styles.reviewCol}>
                  <Text style={[styles.colTitle, { color: colors.success }]}>✅ Forces</Text>
                  {review.strengths?.map((s, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={styles.bulletText}>{s}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.reviewCol}>
                  <Text style={[styles.colTitle, { color: colors.danger }]}>⚠️ Risques</Text>
                  {review.risks?.map((r, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={styles.bulletText}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {review.suggestions?.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={[styles.colTitle, { color: colors.accentLight }]}>💡 Recommandations</Text>
                  {review.suggestions.map((s, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={styles.bulletText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Collapsible transcript */}
          <TouchableOpacity
            onPress={() => setTranscriptOpen(!transcriptOpen)}
            activeOpacity={0.7}
            style={styles.transcriptToggle}
          >
            <Text style={styles.transcriptToggleText}>
              📝 {transcriptOpen ? "Masquer" : "Voir"} la dictée originale
            </Text>
            <Text style={styles.transcriptChevron}>{transcriptOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {transcriptOpen && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>"{project.transcript}"</Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Tasks */}
      {activeTab === "tasks" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabInner} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>
            PLAN D'ACTION — {project.tasks?.length || 0} TÂCHES
          </Text>

          {project.tasks?.map((task, i) => (
            <TaskCard key={i} task={task} index={i} />
          ))}

          <View style={{ marginTop: spacing.section }}>
            <Text style={styles.sectionLabel}>EXPORTER</Text>

            <TouchableOpacity
              onPress={handlePushTrello}
              disabled={pushing || project.synced_to === "Trello"}
              activeOpacity={0.7}
              style={[styles.exportBtn, project.synced_to === "Trello" && styles.exportBtnDone]}
            >
              {pushing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Text style={styles.exportIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exportTitle}>Trello</Text>
                    <Text style={styles.exportDesc}>
                      {project.synced_to === "Trello" ? "Déjà synchronisé" : "Créer les cartes"}
                    </Text>
                  </View>
                  {project.synced_to === "Trello" && <Text style={styles.checkmark}>✓</Text>}
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.exportBtn, { opacity: 0.4 }]}>
              <Text style={styles.exportIcon}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitle}>Jira / Notion / Asana</Text>
                <Text style={styles.exportDesc}>Bientôt</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 80 }} />
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
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  projectName: { ...type.h2, flex: 1, marginRight: 10 },
  verdictChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.badge,
    borderWidth: 1,
  },
  verdictChipText: { fontSize: 11, fontWeight: "700" },
  tabBarOuter: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.tab,
  },
  tabActive: { backgroundColor: colors.accentBg },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.accentLight },
  tabContent: { flex: 1 },
  tabInner: { padding: spacing.xl },
  summary: { ...type.sub, lineHeight: 23, marginBottom: spacing.xl },
  reviewCard: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  oneLiner: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, lineHeight: 22, marginBottom: 16 },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  confidenceLabel: { fontSize: 12, color: colors.textMuted },
  confidenceTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  confidenceFill: { height: "100%", borderRadius: 3 },
  confidenceValue: { fontSize: 13, fontWeight: "700" },
  reviewCols: { flexDirection: "row", gap: 12 },
  reviewCol: { flex: 1 },
  colTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  bulletCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radius.sm,
    padding: 8,
    marginBottom: 4,
  },
  bulletText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  suggestionsSection: { marginTop: 16, paddingTop: 16, borderTopColor: "rgba(255,255,255,0.04)", borderTopWidth: 1 },
  transcriptToggle: {
    ...cardStyle,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  transcriptToggleText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  transcriptChevron: { fontSize: 10, color: colors.textMuted },
  transcriptBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  transcriptText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontStyle: "italic" },
  sectionLabel: { ...type.label, marginBottom: 12 },
  exportBtn: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: spacing.sm,
  },
  exportBtnDone: { borderColor: colors.successBorder },
  exportIcon: { fontSize: 22 },
  exportTitle: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  exportDesc: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  checkmark: { fontSize: 18, color: colors.success, fontWeight: "700" },
});
