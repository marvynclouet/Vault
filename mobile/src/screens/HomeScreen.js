import { useState, useCallback, useRef, useEffect } from "react";
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
} from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadProjects, loadProfile, loadQuickNotes, addQuickNote, updateQuickNote, updateProject, addProject } from "../storage";
import { analyzeText } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing, getGlassStyle } from "../theme";
import RadialChart from "../components/RadialChart";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatDate() {
  const d = new Date();
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function getTasksForToday(projects) {
  const out = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of projects || []) {
    for (const t of p.tasks || []) {
      const status = t.status || "todo";
      if (status === "done") continue;
      const due = t.due_date ? t.due_date.slice(0, 10) : null;
      const isDueToday = due === today;
      const isHigh = (t.priority || "").toLowerCase().includes("haute") || (t.priority || "").toLowerCase() === "high";
      if (isDueToday || isHigh) {
        out.push({ ...t, project_name: p.project_name, project_id: p.id });
      }
    }
  }
  return out.slice(0, 10);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tasksToday = getTasksForToday(projects);
  const prénom = profile?.display_name?.split(" ")[0] || profile?.username || "toi";

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
      navigation.getParent()?.navigate("Projets", { screen: "ProjectDetail", params: { projectId: saved.id } });
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
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>Bonjour, {prénom} 👋</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{formatDate()}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate("Réglages", { screen: "Profile" })} activeOpacity={0.7}>
          <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
            <Text style={[styles.avatarText, { color: c.accentLight }]}>
              {(profile?.avatar_url || profile?.display_name?.[0] || profile?.username?.[0] || "?")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Tâches du jour */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
          Aujourd'hui
          {tasksToday.length > 0 && (
            <Text style={{ color: c.textMuted, fontWeight: "500" }}> — {tasksToday.length} tâche(s)</Text>
          )}
        </Text>
        {tasksToday.length === 0 ? (
          <View style={[styles.emptyCard, getGlassStyle(c)]}>
            <Text style={[styles.emptyEmoji]}>🎉</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>Rien à faire ! Profite ou lance un nouveau projet</Text>
          </View>
        ) : (
          tasksToday.map((t, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleToggleTask(t, t.project_id);
              }}
              style={[styles.taskRow, getGlassStyle(c)]}
            >
              <View style={[styles.checkbox, (t.status || "todo") === "done" && { backgroundColor: c.success }]}>
                {(t.status || "todo") === "done" && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
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
                <Text style={[styles.taskProject, { color: c.textMuted }]}>{t.project_name}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Projets actifs */}
      <View style={styles.section}>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate("Projets")}
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
        >
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Projets actifs</Text>
          <Text style={[styles.seeAll, { color: c.accentLight }]}>Voir tout ›</Text>
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectsRow}>
          {(projects || []).slice(0, 5).map((p) => {
            const done = (p.tasks || []).filter((t) => (t.status || "todo") === "done").length;
            const total = (p.tasks || []).length || 1;
            const pct = Math.round((done / total) * 100);
            const score = p.review?.confidence ?? p.review?.score_global ?? 0;
            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                onPress={() => navigation.getParent()?.navigate("Projets", { screen: "ProjectDetail", params: { projectId: p.id } })}
                style={[styles.projectCard, getGlassStyle(c)]}
              >
                <View style={styles.projectCardHeader}>
                  <Text style={[styles.projectName, { color: c.textPrimary }]} numberOfLines={1}>
                    {p.project_name}
                  </Text>
                  <RadialChart score={Math.min(10, Math.round(score / 4) || 0)} size={36} />
                </View>
                <View style={[styles.progressBar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${pct}%`, backgroundColor: c.accent },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: c.textMuted }]}>
                  {done}/{total} tâches
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Inbox idées */}
      <View style={styles.section}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
            💡 Idées en vrac
            {quickNotes.length > 0 && (
              <Text style={{ color: c.textMuted, fontWeight: "500" }}> ({quickNotes.length})</Text>
            )}
          </Text>
          <TouchableOpacity
            onPress={() => setNoteModal(true)}
            style={[styles.addBtn, { backgroundColor: c.accent }]}
          >
            <Text style={styles.addBtnText}>+ Capturer</Text>
          </TouchableOpacity>
        </View>
        {quickNotes.length === 0 ? (
          <View style={[styles.emptyCard, getGlassStyle(c)]}>
            <Text style={[styles.emptyEmoji]}>💡</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>Capture ta prochaine pépite</Text>
          </View>
        ) : (
          quickNotes.slice(0, 5).map((n) => (
          <View key={n.id} style={[styles.noteRow, getGlassStyle(c)]}>
            <Text style={[styles.noteContent, { color: c.textSecondary }]} numberOfLines={2}>
              {n.content}
            </Text>
            <View style={styles.noteActions}>
              <TouchableOpacity
                onPress={() => handleConvertNote(n)}
                disabled={analyzingNote === n.id}
                style={[styles.noteBtn, { borderColor: c.accent }]}
              >
                {analyzingNote === n.id ? (
                  <ActivityIndicator size="small" color={c.accent} />
                ) : (
                  <Text style={[styles.noteBtnText, { color: c.accentLight }]}>Analyser →</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDismissNote(n.id)}>
                <Text style={[styles.noteBtnText, { color: c.textMuted }]}>Suppr.</Text>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  greeting: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "600" },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: "600" },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 15 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  taskTitle: { fontSize: 14, fontWeight: "600" },
  taskDone: { textDecorationLine: "line-through", opacity: 0.6 },
  taskProject: { fontSize: 11, marginTop: 2 },
  projectsRow: { gap: 12, paddingRight: spacing.xl },
  projectCard: {
    width: 160,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  projectCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  projectName: { fontSize: 14, fontWeight: "600", flex: 1 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  progressText: { fontSize: 11 },
  noteRow: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  noteContent: { fontSize: 13, marginBottom: 8 },
  noteActions: { flexDirection: "row", gap: 12 },
  noteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  noteBtnText: { fontSize: 12, fontWeight: "600" },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
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
