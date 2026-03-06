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
import { loadProjects, loadProfile, loadQuickNotes, addQuickNote, updateQuickNote, updateProject, addProject, deleteProject, touchStreak, getWeeklyGoals, saveWeeklyGoals } from "../storage";
import { analyzeText, generateWeeklyReview } from "../api";
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
  const [streak, setStreak] = useState(0);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [goalsModal, setGoalsModal] = useState(false);
  const [goalsInputs, setGoalsInputs] = useState(["", "", ""]);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, prof, notes, streakCount, goals] = await Promise.all([
        loadProjects(),
        loadProfile(),
        loadQuickNotes(),
        touchStreak(),
        getWeeklyGoals(),
      ]);
      setProjects(p);
      setProfile(prof);
      setQuickNotes(notes);
      setStreak(streakCount);
      if (goals.length > 0) {
        setWeeklyGoals(goals);
      } else {
        const defaults = [
          { text: "Avancer sur mon projet principal", done: false },
          { text: "Contacter 2 prospects", done: false },
          { text: "Préparer la semaine prochaine", done: false },
        ];
        setWeeklyGoals(defaults);
        await saveWeeklyGoals(defaults);
      }
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

  const dormantProjects = useMemo(() => {
    const now = Date.now();
    return projects.filter((p) => {
      const tasks = p.tasks || [];
      const pending = tasks.filter((t) => (t.status || "todo") !== "done");
      if (!pending.length) return false;
      let lastActivity = new Date(p.created_at).getTime();
      for (const t of tasks) {
        if (t.completed_at) {
          const d = new Date(t.completed_at).getTime();
          if (d > lastActivity) lastActivity = d;
        }
      }
      return (now - lastActivity) / 86400000 >= 5;
    });
  }, [projects]);

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

  const handleToggleGoal = useCallback(async (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = weeklyGoals.map((g, i) => (i === index ? { ...g, done: !g.done } : g));
    setWeeklyGoals(updated);
    await saveWeeklyGoals(updated);
  }, [weeklyGoals]);

  const handleSaveGoals = useCallback(async () => {
    const updated = goalsInputs.map((text, i) => ({
      text: text.trim() || weeklyGoals[i]?.text || `Objectif ${i + 1}`,
      done: weeklyGoals[i]?.done || false,
    }));
    setWeeklyGoals(updated);
    await saveWeeklyGoals(updated);
    setGoalsModal(false);
  }, [goalsInputs, weeklyGoals]);

  const handleOpenGoalsModal = useCallback(() => {
    setGoalsInputs(weeklyGoals.map((g) => g.text));
    setGoalsModal(true);
  }, [weeklyGoals]);

  const handleWeeklyReview = useCallback(async () => {
    setReviewModal(true);
    if (reviewData) return;
    setReviewLoading(true);
    try {
      const data = await generateWeeklyReview(projects);
      setReviewData(data);
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible de générer la revue.");
      setReviewModal(false);
    } finally {
      setReviewLoading(false);
    }
  }, [projects, reviewData]);

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
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>Bonjour, {prénom} 👋</Text>
          <Text style={[styles.date, { color: c.textMuted }]}>{formatDate()}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streak}j</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("Réglages", { screen: "Profile" })} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
              <Text style={[styles.avatarText, { color: c.accentLight }]}>
                {(profile?.avatar_url || profile?.display_name?.[0] || profile?.username?.[0] || "?")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
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

      {/* 2b. Alertes stagnation */}
      {dormantProjects.length > 0 && (
        <View style={[styles.section, { marginTop: SECTION_GAP }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted, marginBottom: 8 }]}>ATTENTION</Text>
          {dormantProjects.map((p) => (
            <TouchableOpacity
              key={p.id}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("Projets", { screen: "ProjectDetail", params: { projectId: p.id } })}
              style={[styles.alertRow, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }]}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: c.textPrimary }]} numberOfLines={1}>
                  {p.project_name}
                </Text>
                <Text style={[styles.alertDesc, { color: c.textMuted }]}>Aucune activité depuis 5+ jours</Text>
              </View>
              <Text style={{ color: "rgba(239,68,68,0.8)", fontSize: 13, fontWeight: "600" }}>Reprendre →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 2c. Objectifs de la semaine */}
      <View style={[styles.section, { marginTop: SECTION_GAP }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Cette semaine</Text>
          <TouchableOpacity onPress={handleOpenGoalsModal} activeOpacity={0.7}>
            <Text style={[styles.seeAll, { color: c.accentLight }]}>Modifier ›</Text>
          </TouchableOpacity>
        </View>
        {weeklyGoals.map((g, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => handleToggleGoal(i)}
            style={[styles.goalRow, { borderColor: c.border }]}
          >
            <View style={[styles.goalCheck, g.done && { backgroundColor: c.success, borderColor: c.success }]}>
              {g.done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text
              style={[styles.goalText, { color: c.textPrimary }, g.done && styles.taskDone]}
              numberOfLines={1}
            >
              {g.text}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleWeeklyReview}
          style={[styles.reviewBtn, { borderColor: "rgba(124,58,237,0.4)", backgroundColor: "rgba(124,58,237,0.1)" }]}
        >
          <Text style={{ fontSize: 16 }}>📊</Text>
          <Text style={[styles.reviewBtnText, { color: c.accentLight }]}>Revue IA de la semaine</Text>
          <Text style={{ color: c.accentLight, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Text style={[styles.projectScoreLabel, { color: c.textDisabled }]}>Score IA</Text>
                    <Text style={[styles.projectScore, { color: c.accentLight }]}>{scoreNorm}/10</Text>
                  </View>
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

      {/* Modal revue hebdomadaire */}
      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, borderColor: c.border, maxHeight: "85%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {reviewLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator color={c.accent} size="large" />
                  <Text style={[{ color: c.textMuted, marginTop: 16, fontSize: 14 }]}>Analyse de ta semaine...</Text>
                </View>
              ) : reviewData ? (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <Text style={[styles.modalTitle, { color: c.textPrimary, flex: 1 }]}>{reviewData.headline}</Text>
                    <View style={[styles.reviewScore, { backgroundColor: c.accentBg }]}>
                      <Text style={[{ color: c.accentLight, fontSize: 20, fontWeight: "800" }]}>{reviewData.score}</Text>
                      <Text style={[{ color: c.textMuted, fontSize: 10 }]}>/10</Text>
                    </View>
                  </View>

                  {reviewData.highlights?.length > 0 && (
                    <View style={styles.reviewSection}>
                      <Text style={[styles.reviewSectionTitle, { color: c.success }]}>✅ Réalisations</Text>
                      {reviewData.highlights.map((h, i) => (
                        <Text key={i} style={[styles.reviewItem, { color: c.textSecondary }]}>• {h}</Text>
                      ))}
                    </View>
                  )}

                  {reviewData.stuck?.length > 0 && (
                    <View style={styles.reviewSection}>
                      <Text style={[styles.reviewSectionTitle, { color: c.warning }]}>⚠️ Points bloquants</Text>
                      {reviewData.stuck.map((s, i) => (
                        <Text key={i} style={[styles.reviewItem, { color: c.textSecondary }]}>• {s}</Text>
                      ))}
                    </View>
                  )}

                  {reviewData.next_week?.length > 0 && (
                    <View style={styles.reviewSection}>
                      <Text style={[styles.reviewSectionTitle, { color: c.accentLight }]}>🎯 Semaine prochaine</Text>
                      {reviewData.next_week.map((n, i) => (
                        <Text key={i} style={[styles.reviewItem, { color: c.textSecondary }]}>• {n}</Text>
                      ))}
                    </View>
                  )}

                  {reviewData.motivation && (
                    <View style={[styles.reviewMotivation, { backgroundColor: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.3)" }]}>
                      <Text style={[{ color: c.textPrimary, fontSize: 14, fontStyle: "italic", lineHeight: 20 }]}>
                        "{reviewData.motivation}"
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setReviewModal(false)}
              style={[styles.modalBtn, { backgroundColor: c.accent, marginTop: 16, alignItems: "center" }]}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal modifier objectifs */}
      <Modal visible={goalsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Objectifs de la semaine</Text>
            {[0, 1, 2].map((i) => (
              <TextInput
                key={i}
                style={[styles.modalInput, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary, minHeight: 44, marginBottom: 10 }]}
                placeholder={`Objectif ${i + 1}`}
                placeholderTextColor={c.textDisabled}
                value={goalsInputs[i] || ""}
                onChangeText={(v) => setGoalsInputs((prev) => prev.map((x, j) => (j === i ? v : x)))}
              />
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGoalsModal(false)} style={[styles.modalBtn, { borderColor: c.border }]}>
                <Text style={{ color: c.textSecondary }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveGoals} style={[styles.modalBtn, { backgroundColor: c.accent }]}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  projectScore: { fontSize: 11, fontWeight: "700" },
  projectScoreLabel: { fontSize: 9 },

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

  streakBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: { fontSize: 13, fontWeight: "700", color: "#F59E0B" },

  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  alertTitle: { fontSize: 14, fontWeight: "600" },
  alertDesc: { fontSize: 12, marginTop: 2 },

  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  goalCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalText: { fontSize: 14, flex: 1 },

  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  reviewBtnText: { flex: 1, fontSize: 14, fontWeight: "600" },

  reviewScore: {
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: 26,
    marginLeft: 10,
  },
  reviewSection: { marginBottom: 16 },
  reviewSectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  reviewItem: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  reviewMotivation: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
});
