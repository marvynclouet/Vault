import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProject, updateProject, deleteProject } from "../storage";
import { pushToTrello } from "../api";
import TaskCard from "../components/TaskCard";
import ChatView from "../components/ChatView";
import KanbanView from "../components/KanbanView";
import RadialChart from "../components/RadialChart";
import { radius, spacing, type, cardStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const useNativeDriver = Platform.OS !== "web";

const TABS = [
  { key: "overview", label: "Résumé" },
  { key: "tasks", label: "Tâches" },
  { key: "board", label: "Board" },
  { key: "chat", label: "Chat PM" },
];

const TASK_FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "todo", label: "À faire" },
  { key: "done", label: "Terminées" },
];

const PRIORITY_ORDER = { Haute: 0, Moyenne: 1, Basse: 2 };

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function ProjectDetailScreen({ route, navigation }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [taskFilter, setTaskFilter] = useState("all");
  const [pushing, setPushing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [taskForDate, setTaskForDate] = useState(null);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const VERDICT = {
    go: { label: "GO", icon: "🟢", color: c.success, bg: c.successBg, border: c.successBorder },
    pivot: { label: "À AJUSTER", icon: "🟡", color: c.warning, bg: c.warningBg, border: c.warningBorder },
    drop: { label: "ABANDON", icon: "🔴", color: c.danger, bg: c.dangerBg, border: c.dangerBorder },
  };

  useEffect(() => {
    getProject(projectId).then((p) => {
      setProject(p);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver }).start();
    }).catch(console.error);
  }, [projectId]);

  const handleProjectUpdate = useCallback((updates) => {
    setProject((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const handleDeleteProject = useCallback(async () => {
    const msg = "Supprimer ce projet ?\n\nTu es sûr ? C'est irréversible. Le projet, ses tâches et les messages du chat seront supprimés.";
    if (Platform.OS === "web") {
      if (window.confirm(msg)) {
        await deleteProject(projectId);
        navigation.goBack();
      }
    } else {
      Alert.alert(
        "Supprimer ce projet ?",
        "Tu es sûr ? C'est irréversible. Le projet, ses tâches et les messages du chat seront supprimés.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              await deleteProject(projectId);
              navigation.goBack();
            },
          },
        ]
      );
    }
  }, [projectId, navigation]);

  const handlePressDate = useCallback((task) => {
    setTaskForDate(task);
    setDatePickerDate(task.due_date ? new Date(task.due_date) : new Date());
    setShowDatePicker(true);
  }, []);

  const handleDateChange = useCallback(
    async (event, selectedDate) => {
      setShowDatePicker(false);
      if (event?.type === "set" && selectedDate && taskForDate && project) {
        const iso = selectedDate.toISOString().slice(0, 10);
        const updated = (project.tasks || []).map((t) =>
          t === taskForDate ? { ...t, due_date: iso } : t
        );
        await updateProject(project.id, { tasks: updated });
        setProject((p) => ({ ...p, tasks: updated }));
      }
      setTaskForDate(null);
    },
    [taskForDate, project]
  );

  const handleToggleTask = useCallback(
    async (task) => {
      if (!project) return;
      const status = (task.status || "todo") === "done" ? "todo" : "done";
      const updated = (project.tasks || []).map((t) =>
        t === task ? { ...t, status, completed_at: status === "done" ? new Date().toISOString() : null } : t
      );
      await updateProject(project.id, { tasks: updated });
      setProject((p) => ({ ...p, tasks: updated }));
    },
    [project]
  );

  const sortedAndFilteredTasks = useMemo(() => {
    const tasks = project?.tasks || [];
    const filtered =
      taskFilter === "all"
        ? tasks
        : taskFilter === "done"
          ? tasks.filter((t) => (t.status || "todo") === "done")
          : tasks.filter((t) => (t.status || "todo") !== "done");
    return [...filtered].sort((a, b) => {
      const sa = a.status || "todo";
      const sb = b.status || "todo";
      if (sa === "done" && sb !== "done") return 1;
      if (sa !== "done" && sb === "done") return -1;
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return pa - pb;
    });
  }, [project?.tasks, taskFilter]);

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

  const handleExportPdf = useCallback(async () => {
    if (!project) return;
    setExportingPdf(true);
    try {
      const review = project.review || {};
      const v = VERDICT[review.verdict] || VERDICT.go;
      const dateStr = new Date(project.created_at || Date.now()).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const score = review.confidence ?? review.score_global ?? "—";
      const strengths = (review.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
      const risks = (review.risks || []).map((r) => `<li>${escapeHtml(r)}</li>`).join("");
      const suggestions = (review.suggestions || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
      const tasks = (project.tasks || []).map((t) => `<tr><td>${escapeHtml(t.title || "")}</td><td>${escapeHtml(t.priority || "")}</td><td>${escapeHtml(t.assignee_role || "")}</td></tr>`).join("");
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;padding:24px;color:#1a1a1a;max-width:600px;margin:0 auto}
h1{font-size:22px;margin:0 0 8px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.score{display:inline-block;padding:6px 12px;border-radius:8px;font-weight:700;margin-bottom:16px}
h2{font-size:14px;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.5px}
ul{margin:0;padding-left:20px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{padding:8px;text-align:left;border-bottom:1px solid #eee}
th{font-size:11px;text-transform:uppercase;color:#666}
</style></head>
<body>
<h1>${escapeHtml(project.project_name)}</h1>
<p class="meta">${dateStr}</p>
<p><span class="score" style="background:${v.color}22;color:${v.color}">${v.label} — Score: ${score}</span></p>
<p>${escapeHtml(project.summary || "")}</p>
${review.one_liner ? `<h2>Synthèse</h2><p>${escapeHtml(review.one_liner)}</p>` : ""}
${strengths ? `<h2>✅ Forces</h2><ul>${strengths}</ul>` : ""}
${risks ? `<h2>⚠️ Risques</h2><ul>${risks}</ul>` : ""}
${suggestions ? `<h2>💡 Recommandations</h2><ul>${suggestions}</ul>` : ""}
<h2>Tâches</h2>
<table><thead><tr><th>Tâche</th><th>Priorité</th><th>Rôle</th></tr></thead><tbody>${tasks || "<tr><td colspan=3>Aucune tâche</td></tr>"}</tbody></table>
</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Exporter le projet" });
      } else {
        Alert.alert("PDF généré", "Le fichier a été généré. Partage non disponible sur cette plateforme.");
      }
    } catch (err) {
      Alert.alert("Erreur", err?.message || "Impossible d'exporter le PDF.");
    } finally {
      setExportingPdf(false);
    }
  }, [project]);

  if (!project) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const review = project.review;
  const v = VERDICT[review?.verdict] || VERDICT.go;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor: c.bgPrimary }]}>
      {/* FAB Mettre à jour — au-dessus de la tab bar */}
      <TouchableOpacity
        onPress={() => navigation.navigate("UpdateProject", { projectId })}
        activeOpacity={0.85}
        style={[styles.fab, { backgroundColor: c.accent, bottom: Math.max(insets.bottom, 16) + 100 }]}
      >
        <Text style={styles.fabIcon}>🎙️</Text>
        <Text style={styles.fabLabel}>Mettre à jour</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.projectName} numberOfLines={1}>{project.project_name}</Text>
        <View style={styles.headerRight}>
          <View style={[styles.verdictChip, { backgroundColor: v.bg, borderColor: v.border }]}>
            <Text style={{ fontSize: 12 }}>{v.icon}</Text>
            <Text style={[styles.verdictChipText, { color: v.color }]}>{v.label}</Text>
          </View>
          <TouchableOpacity
            onPress={handleDeleteProject}
            activeOpacity={0.7}
            style={[styles.deleteBtn, Platform.OS === "web" && { cursor: "pointer" }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.deleteBtnText}>Supprimer</Text>
          </TouchableOpacity>
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
              style={[styles.tab, activeTab === tab.key && { backgroundColor: c.accent }]}
            >
              <Text style={[styles.tabText, { color: c.textMuted }, activeTab === tab.key && { color: "#fff" }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Overview */}
      {activeTab === "overview" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={[styles.tabInner, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.summary}>{project.summary}</Text>

          {review && (
            <View style={[styles.reviewCard, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }]}>
              <View style={styles.reviewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.oneLiner, { color: c.textPrimary }]}>{review.one_liner}</Text>
                </View>
                <RadialChart score={review.confidence || 0} size={80} />
              </View>

              <View style={styles.reviewCols}>
                <View style={styles.reviewCol}>
                  <Text style={[styles.colTitle, { color: c.success }]}>✅ Forces</Text>
                  {review.strengths?.map((s, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={[styles.bulletText, { color: c.textSecondary }]}>{s}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.reviewCol}>
                  <Text style={[styles.colTitle, { color: c.danger }]}>⚠️ Risques</Text>
                  {review.risks?.map((r, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={[styles.bulletText, { color: c.textSecondary }]}>{r}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {review.suggestions?.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <Text style={[styles.colTitle, { color: c.accentLight }]}>💡 Recommandations</Text>
                  {review.suggestions.map((s, i) => (
                    <View key={i} style={styles.bulletCard}>
                      <Text style={[styles.bulletText, { color: c.textSecondary }]}>{s}</Text>
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
            <Text style={[styles.transcriptToggleText, { color: c.textSecondary }]}>
              📝 {transcriptOpen ? "Masquer" : "Voir"} la dictée originale
            </Text>
            <Text style={[styles.transcriptChevron, { color: c.textMuted }]}>{transcriptOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {transcriptOpen && (
            <View style={styles.transcriptBox}>
              <Text style={[styles.transcriptText, { color: c.textSecondary }]}>"{project.transcript}"</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={exportingPdf}
            activeOpacity={0.8}
            style={[styles.exportPdfBtnOutline, { borderColor: c.border }]}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color={c.textMuted} />
            ) : (
              <Text style={[styles.exportPdfTextOutline, { color: c.textSecondary }]}>📄 Exporter en PDF</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Tasks */}
      {activeTab === "tasks" && (
        <ScrollView style={styles.tabContent} contentContainerStyle={[styles.tabInner, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {TASK_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setTaskFilter(f.key)}
                style={[styles.filterBtn, taskFilter === f.key && { backgroundColor: c.accent }]}
              >
                <Text style={[styles.filterText, { color: taskFilter === f.key ? "#fff" : c.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionLabel}>
            PLAN D'ACTION — {sortedAndFilteredTasks.length} TÂCHES
          </Text>

          {sortedAndFilteredTasks.map((task, i) => (
            <TaskCard
              key={i}
              task={task}
              index={i}
              onToggle={handleToggleTask}
              onPressDate={handlePressDate}
            />
          ))}

          <View style={{ marginTop: spacing.section }}>
            <Text style={styles.sectionLabel}>EXPORTER</Text>

            <TouchableOpacity
              onPress={handlePushTrello}
              disabled={pushing || project.synced_to === "Trello"}
              activeOpacity={0.7}
              style={[styles.exportBtn, project.synced_to === "Trello" && { borderColor: c.successBorder }]}
            >
              {pushing ? (
                <ActivityIndicator size="small" color={c.accent} />
              ) : (
                <>
                  <Text style={styles.exportIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportTitle, { color: c.textPrimary }]}>Trello</Text>
                    <Text style={[styles.exportDesc, { color: c.textMuted }]}>
                      {project.synced_to === "Trello" ? "Déjà synchronisé" : "Créer les cartes"}
                    </Text>
                  </View>
                  {project.synced_to === "Trello" && <Text style={[styles.checkmark, { color: c.success }]}>✓</Text>}
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.exportBtn, { opacity: 0.4 }]}>
              <Text style={styles.exportIcon}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportTitle, { color: c.textPrimary }]}>Jira / Notion / Asana</Text>
                <Text style={[styles.exportDesc, { color: c.textMuted }]}>Bientôt</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Kanban Board */}
      {activeTab === "board" && (
        <KanbanView project={project} onProjectUpdate={handleProjectUpdate} />
      )}

      {/* Chat */}
      {activeTab === "chat" && (
        <ChatView project={project} onProjectUpdate={handleProjectUpdate} />
      )}

      {/* Date picker modal */}
      {showDatePicker && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={[styles.datePickerContent, { backgroundColor: c.bgSecondary, borderColor: c.border }]}
            >
              <Text style={[styles.datePickerTitle, { color: c.textPrimary }]}>Échéance</Text>
              <DateTimePicker
                value={datePickerDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, d) => {
                  if (d) setDatePickerDate(d);
                  if (e?.type === "set") handleDateChange(e, d);
                }}
                locale="fr-FR"
              />
              <TouchableOpacity
                onPress={() => handleDateChange({ type: "set" }, datePickerDate)}
                style={[styles.datePickerBtn, { backgroundColor: c.accent }]}
              >
                <Text style={styles.datePickerBtnText}>Valider</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  projectName: { ...type.h2, flex: 1, marginRight: 10 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  deleteBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  deleteBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "600" },
  tabBarOuter: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  tabContent: { flex: 1 },
  tabInner: { padding: spacing.xl },
  exportPdfBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    borderWidth: 1,
    marginTop: spacing.lg,
  },
  exportPdfTextOutline: { fontSize: 13, fontWeight: "500" },
  summary: { ...type.sub, lineHeight: 23, marginBottom: spacing.xl },
  reviewCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  oneLiner: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 20 },
  reviewCols: { flexDirection: "row", gap: 12 },
  reviewCol: { flex: 1 },
  colTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  bulletCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  bulletText: { fontSize: 12, lineHeight: 17 },
  suggestionsSection: { marginTop: 16, paddingTop: 16, borderTopColor: "rgba(255,255,255,0.04)", borderTopWidth: 1 },
  transcriptToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  transcriptToggleText: { fontSize: 13, fontWeight: "600" },
  transcriptChevron: { fontSize: 10 },
  transcriptBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  transcriptText: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  filterText: { fontSize: 13, fontWeight: "600" },
  sectionLabel: { ...type.label, marginBottom: 12 },
  exportBtn: {
    ...cardStyle,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: spacing.sm,
  },
  exportIcon: { fontSize: 22 },
  exportTitle: { fontSize: 14, fontWeight: "600" },
  exportDesc: { fontSize: 11, marginTop: 2 },
  checkmark: { fontSize: 18, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 12px rgba(0,0,0,0.35)" }
      : { elevation: 12 }),
  },
  fabIcon: { fontSize: 18 },
  fabLabel: { color: "#fff", fontSize: 13, fontWeight: "600" },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  datePickerContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    minWidth: 280,
  },
  datePickerTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  datePickerBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  datePickerBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
