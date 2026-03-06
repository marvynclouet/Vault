import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadProjects, loadProfile, loadQuickNotes, addQuickNote, updateQuickNote, updateProject, addProject, deleteProject } from "../storage";
import { analyzeText } from "../api";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const PADDING_H = 20;
const SECTION_GAP = 32;
const CARD_WIDTH = 170;
const CARD_HEIGHT = 130;

function formatDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Hier" : `Il y a ${days}j`;
}

function getTasksForToday(projects) {
  const out = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of projects || []) {
    for (const t of p.tasks || []) {
      const due = t.due_date ? t.due_date.slice(0, 10) : null;
      const isDueToday = due === today;
      const isHigh = (t.priority || "").toLowerCase().includes("haute") || (t.priority || "").toLowerCase() === "high";
      if (isDueToday || isHigh) {
        out.push({ ...t, project_name: p.project_name, project_id: p.id });
      }
    }
  }
  return out;
}

function getVerdictStyle(verdict, c) {
  const map = {
    go: { color: c.success, label: "GO" },
    pivot: { color: c.warning, label: "À AJUSTER" },
    drop: { color: c.danger, label: "ABANDON" },
  };
  return map[verdict] || map.go;
}

function getProjectColor(project, c) {
  const v = project?.review?.verdict;
  if (v === "go") return c.success;
  if (v === "pivot") return c.warning;
  if (v === "drop") return c.danger;
  return c.accent;
}

function buildActivityFeed(projects) {
  const items = [];
  for (const p of projects || []) {
    items.push({
      type: "project",
      icon: "📝",
      text: `Nouveau projet : ${p.project_name}`,
      date: p.created_at,
    });
    for (const t of p.tasks || []) {
      if (t.completed_at) {
        items.push({
          type: "task",
          icon: "✅",
          text: `Tâche complétée : ${t.title}`,
          date: t.completed_at,
        });
      }
    }
  }
  return items
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);
}


export default function HomeScreen({ navigation }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [analyzingNote, setAnalyzingNote] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, prof, notes] = await Promise.all([
        loadProjects(),
        loadProfile(),
        loadQuickNotes(),
      ]);
      setProjects(p);
      setProfile(prof);
      setQuickNotes(notes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tasksToday = useMemo(() => getTasksForToday(projects), [projects]);
  const tasksDoneCount = useMemo(() => {
    return tasksToday.filter((t) => (t.status || "todo") === "done").length;
  }, [tasksToday]);
  const allTasksDone = tasksToday.length > 0 && tasksDoneCount === tasksToday.length;
  const lastProject = projects[0];
  const lastProjectScore = lastProject?.review?.confidence ?? lastProject?.review?.score_global;
  const scoreNorm = lastProjectScore != null ? Math.min(10, Math.round(Number(lastProjectScore) / 4) || 0) : null;
  const activityFeed = useMemo(() => buildActivityFeed(projects), [projects]);
  const prénom = profile?.display_name?.split(" ")[0] || profile?.username || "toi";

  const bannerMessage = useMemo(() => {
    if (allTasksDone) return "Bravo, journée clear ! 🎉";
    if (tasksToday.length > 0 && tasksDoneCount === 0) return "C'est le moment de passer à l'action 🚀";
    if (lastProject && scoreNorm != null && scoreNorm >= 7) return `Ton dernier projet a un score de ${scoreNorm}/10 !`;
    if (lastProject) return "Continue sur ta lancée 💪";
    return "C'est le moment de passer à l'action 🚀";
  }, [allTasksDone, tasksToday.length, tasksDoneCount, lastProject, scoreNorm]);

  const handleToggleTask = useCallback(async (task, projectId) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    const newStatus = (task.status || "todo") === "done" ? "todo" : "done";
    const updated = (proj.tasks || []).map((t) =>
      t.title === task.title && t.description === task.description
        ? { ...t, status: newStatus, completed_at: newStatus === "done" ? new Date().toISOString() : null }
        : t
    );
    await updateProject(projectId, { tasks: updated });
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, tasks: updated } : p)));
  }, [projects]);

  const handleSaveNote = useCallback(async () => {
    const text = noteInput.trim();
    if (!text) return;
    setSavingNote(true);
    try {
      const n = await addQuickNote(text);
      setQuickNotes((prev) => [n, ...prev]);
      setNoteInput("");
      setNoteModal(false);
    } catch (e) {
      Alert.alert("Erreur", e.message);
    } finally {
      setSavingNote(false);
    }
  }, [noteInput]);

  const handleConvertNote = useCallback(async (note) => {
    setAnalyzingNote(note.id);
    try {
      const analysis = await analyzeText(note.content);
      const tasks = (analysis.tasks || []).map((t, i) => ({
        ...t,
        status: t.status || "todo",
        due_date: t.due_date ?? null,
        completed_at: t.completed_at ?? null,
        order: t.order ?? i,
      }));
      const saved = await addProject({
        transcript: note.content,
        project_name: analysis.project_name || "Nouveau projet",
        summary: analysis.summary || "",
        review: analysis.review || null,
        tasks,
        synced_to: null,
      });
      await updateQuickNote(note.id, { status: "converted", converted_to_project: saved.id });
      setQuickNotes((prev) => prev.filter((n) => n.id !== note.id));
      navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: saved.id } });
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d'analyser l'idée.");
    } finally {
      setAnalyzingNote(null);
    }
  }, [navigation]);

  const handleDismissNote = useCallback(async (id) => {
    await updateQuickNote(id, { status: "dismissed" });
    setQuickNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleDeleteProject = useCallback(async (id) => {
    const msg = "Supprimer ce projet ?\n\nTu es sûr ? C'est irréversible.";
    if (Platform.OS === "web") {
      if (window.confirm(msg)) {
        await deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
      }
    } else {
      Alert.alert(
        "Supprimer ce projet ?",
        "Tu es sûr ? C'est irréversible.",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: async () => {
              await deleteProject(id);
              setProjects((prev) => prev.filter((p) => p.id !== id));
            },
          },
        ]
      );
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      contentContainerStyle={{
        paddingHorizontal: PADDING_H,
        paddingBottom: insets.bottom + 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>Bonjour, {prénom} 👋</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{formatDate()}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Réglages", { screen: "Profile" })} activeOpacity={0.7}>
          <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
            <Text style={[styles.avatarText, { color: c.accentLight }]}>
              {(profile?.avatar_url || profile?.display_name?.[0] || profile?.username?.[0] || "?")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Bannière motivation */}
      <View style={[styles.section, { marginTop: SECTION_GAP }]}>
        <LinearGradient
          colors={["rgba(124,58,237,0.25)", "rgba(124,58,237,0.05)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Text style={[styles.bannerText, { color: c.textPrimary }]}>{bannerMessage}</Text>
        </LinearGradient>
      </View>

      {/* 3. Section Aujourd'hui — affichée seulement si tâches */}
      {tasksToday.length > 0 && (
        <View style={[styles.section, { marginTop: SECTION_GAP }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Aujourd'hui</Text>
            <View style={[styles.pill, { backgroundColor: c.accentBg }]}>
              <Text style={[styles.pillText, { color: c.accentLight }]}>{tasksToday.length} tâches</Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(tasksDoneCount / tasksToday.length) * 100}%`,
                  backgroundColor: c.accent,
                },
              ]}
            />
          </View>
          {tasksToday.slice(0, 3).map((t, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleToggleTask(t, t.project_id);
              }}
              style={[styles.taskRow, { borderColor: c.border }]}
            >
              <View style={[styles.checkbox, (t.status || "todo") === "done" && { backgroundColor: c.success }]}>
                {(t.status || "todo") === "done" && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.taskContent}>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: c.textPrimary },
                    (t.status || "todo") === "done" && styles.taskDone,
                  ]}
                  numberOfLines={1}
                >
                  {t.title}
                </Text>
                <Text style={[styles.taskProject, { color: c.textMuted }]} numberOfLines={1}>
                  {t.project_name}
                </Text>
              </View>
              <View style={[styles.projectDot, { backgroundColor: getProjectColor(projects.find((p) => p.id === t.project_id), c) }]} />
            </TouchableOpacity>
          ))}
          {tasksToday.length > 3 && (
            <TouchableOpacity
              onPress={() => navigation.navigate("Projets")}
              style={[styles.seeMoreBtn, { borderColor: c.border }]}
            >
              <Text style={[styles.seeMoreText, { color: c.accentLight }]}>Voir les {tasksToday.length - 3} autres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Section Projets actifs */}
      <View style={[styles.section, { marginTop: SECTION_GAP }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Projets actifs</Text>
          {projects.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Projets")}>
              <Text style={[styles.seeAll, { color: c.accentLight }]}>Voir tout ›</Text>
            </TouchableOpacity>
          )}
        </View>
        {projects.length === 0 ? (
          <TouchableOpacity
            onPress={() => navigation.navigate("Dicter")}
            style={[styles.ctaEmpty, { backgroundColor: c.accent }]}
          >
            <Text style={styles.ctaEmptyText}>Crée ton premier projet →</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.projectsRow}
            snapToInterval={CARD_WIDTH + 12}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {projects.map((p, i) => {
              const done = (p.tasks || []).filter((t) => (t.status || "todo") === "done").length;
              const total = (p.tasks || []).length || 1;
              const pct = Math.round((done / total) * 100);
              const score = p.review?.confidence ?? p.review?.score_global ?? 0;
              const scoreNorm = Math.min(10, Math.round(Number(score) / 4) || 0);
              const v = getVerdictStyle(p.review?.verdict, c);
              return (
<TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: p.id } })}
                onLongPress={() => handleDeleteProject(p.id)}
                style={[styles.projectCard, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: c.border }]}
              >
                  <View style={[styles.verdictBadge, { backgroundColor: v.color + "22" }]}>
                    <Text style={[styles.verdictBadgeText, { color: v.color }]}>{v.label}</Text>
                  </View>
                  <Text style={[styles.projectName, { color: c.textPrimary }]} numberOfLines={2}>
                    {p.project_name}
                  </Text>
                  <View style={[styles.miniProgress, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                    <View style={[styles.miniProgressFill, { width: `${pct}%`, backgroundColor: c.accent }]} />
                  </View>
                  <Text style={[styles.projectScore, { color: c.textMuted }]}>{scoreNorm}/10</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 5. Section Activité récente */}
      {activityFeed.length > 0 && (
        <View style={[styles.section, { marginTop: SECTION_GAP }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted, marginBottom: 8 }]}>ACTIVITÉ RÉCENTE</Text>
          {activityFeed.map((item, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: c.accent }]} />
              <Text style={[styles.activityIcon]}>{item.icon}</Text>
              <Text style={[styles.activityText, { color: c.textSecondary }]} numberOfLines={1}>
                {item.text}
              </Text>
              <Text style={[styles.activityTime, { color: c.textMuted }]}>{timeAgo(item.date)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 6. Section Idées en vrac */}
      <View style={[styles.section, { marginTop: SECTION_GAP }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>IDÉES EN VRAC</Text>
          <TouchableOpacity onPress={() => setNoteModal(true)} style={[styles.addBtn, { backgroundColor: c.accent }]}>
            <Text style={styles.addBtnText}>+ Capturer</Text>
          </TouchableOpacity>
        </View>
        {quickNotes.length === 0 ? (
          <View style={[styles.emptyIdeas, { borderColor: c.border }]}>
            <Text style={[styles.emptyIdeasEmoji]}>💡</Text>
            <Text style={[styles.emptyIdeasText, { color: c.textMuted }]}>Capture ta prochaine pépite</Text>
          </View>
        ) : (
          quickNotes.map((n) => (
            <View key={n.id} style={[styles.postIt, { backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.25)" }]}>
              <Text style={[styles.postItText, { color: c.textPrimary }]} numberOfLines={2}>
                {n.content}
              </Text>
              <View style={styles.postItActions}>
                <TouchableOpacity
                  onPress={() => handleConvertNote(n)}
                  disabled={analyzingNote === n.id}
                  style={[styles.postItBtn, { backgroundColor: c.accent }]}
                >
                  {analyzingNote === n.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.postItBtnText}>→ Créer un projet</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDismissNote(n.id)}>
                  <Text style={[styles.postItDismiss, { color: c.textMuted }]}>Suppr.</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal note rapide */}
      <Modal visible={noteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Nouvelle idée</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]}
              placeholder="Écris ou dicte ton idée..."
              placeholderTextColor={c.textDisabled}
              value={noteInput}
              onChangeText={setNoteInput}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNoteModal(false)} style={[styles.modalBtn, { borderColor: c.border }]}>
                <Text style={{ color: c.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveNote}
                disabled={!noteInput.trim() || savingNote}
                style={[styles.modalBtn, { backgroundColor: c.accent }]}
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  greeting: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "600" },
  section: {},
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionLabel: { fontSize: 13, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "700" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: "600" },

  banner: {
    height: 80,
    borderRadius: 16,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  bannerText: { fontSize: 16, fontWeight: "600" },

  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 3 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  taskContent: { flex: 1, marginLeft: 0 },
  taskTitle: { fontSize: 14, fontWeight: "700" },
  taskDone: { textDecorationLine: "line-through", opacity: 0.6 },
  taskProject: { fontSize: 12, marginTop: 2, fontStyle: "italic" },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  seeMoreBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 4,
  },
  seeMoreText: { fontSize: 13, fontWeight: "600" },

  projectsRow: { gap: 12, paddingRight: PADDING_H },
  projectCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  verdictBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verdictBadgeText: { fontSize: 9, fontWeight: "700" },
  projectName: { fontSize: 14, fontWeight: "600", marginTop: 4, marginBottom: 8 },
  miniProgress: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  miniProgressFill: { height: "100%", borderRadius: 2 },
  projectScore: { fontSize: 11 },

  activityRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3 },
  activityIcon: { fontSize: 12 },
  activityText: { fontSize: 13, flex: 1 },
  activityTime: { fontSize: 11 },

  emptyIdeas: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyIdeasEmoji: { fontSize: 24, marginBottom: 4 },
  emptyIdeasText: { fontSize: 13 },
  postIt: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  postItText: { fontSize: 14, marginBottom: 10 },
  postItActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  postItBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  postItBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  postItDismiss: { fontSize: 12 },

  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  ctaEmpty: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaEmptyText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    fontSize: 15,
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
