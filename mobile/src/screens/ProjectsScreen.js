import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { loadProjects, deleteProject } from "../storage";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

function getVerdict(c) {
  return {
    go: { label: "GO 🟢", color: c.success, bg: c.successBg, border: c.successBorder, band: c.success },
    pivot: { label: "PIVOT 🟡", color: c.warning, bg: c.warningBg, border: c.warningBorder, band: c.warning },
    drop: { label: "DROP 🔴", color: c.danger, bg: c.dangerBg, border: c.dangerBorder, band: c.danger },
  };
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

function getRoles(tasks) {
  return [...new Set((tasks || []).map((t) => t.assignee_role))].slice(0, 3);
}

function StatsBar({ projects }) {
  const { colors: c } = useTheme();
  const goCount = projects.filter((p) => p.review?.verdict === "go").length;
  const pivotCount = projects.filter((p) => p.review?.verdict === "pivot").length;
  const stats = [
    { value: projects.length, label: "Projets", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)" },
    { value: goCount, label: "GO 🟢", bg: c.successBg, border: c.successBorder },
    { value: pivotCount, label: "PIVOT 🟡", bg: c.warningBg, border: c.warningBorder },
  ];
  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.border }]}>
          <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ProjectCard({ item, index, onPress, onDelete }) {
  const { colors: c } = useTheme();
  const VERDICT = getVerdict(c);
  const v = VERDICT[item.review?.verdict] || VERDICT.go;
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const roles = getRoles(item.tasks);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
        style={[styles.card, { borderColor: c.border }]}
      >
        <View style={[styles.colorBand, { backgroundColor: v.band }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.project_name}</Text>
            <Text style={[styles.cardChevron, { color: c.textDisabled }]}>›</Text>
          </View>
          <View style={styles.cardMetaRow}>
            <View style={[styles.verdictBadge, { backgroundColor: v.bg, borderColor: v.border }]}>
              <Text style={[styles.verdictText, { color: v.color }]}>{v.label}</Text>
            </View>
            <Text style={[styles.timeText, { color: c.textDisabled }]}>il y a {timeAgo(item.created_at)}</Text>
          </View>
          <Text style={[styles.cardSummary, { color: c.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.miniTag, { borderColor: c.border }]}>
              <Text style={[styles.miniTagText, { color: c.textSecondary }]}>{item.tasks?.length || 0} tâches</Text>
            </View>
            {roles.map((role) => (
              <View key={role} style={[styles.miniTag, { borderColor: c.border }]}>
                <Text style={[styles.miniTagText, { color: c.textSecondary }]}>{role}</Text>
              </View>
            ))}
            {item.synced_to && (
              <View style={[styles.miniTag, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
                <Text style={[styles.miniTagText, { color: c.success }]}>→ {item.synced_to}</Text>
              </View>
            )}
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { backgroundColor: v.band, width: `${Math.min(100, Math.max(10, (item.tasks?.length || 1) * 15))}%` }]} />
          </View>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.deleteBtn}>
          <Text style={[styles.deleteText, { color: c.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProjectsScreen({ navigation }) {
  const { colors: c, type: t } = useTheme();
  const [projects, setProjects] = useState([]);
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects().then(setProjects).catch(console.error);
    }, [])
  );

  const handleDelete = async (id) => {
    await deleteProject(id);
    const updated = await loadProjects();
    setProjects(updated);
  };

  const initial = (user?.email || "?")[0].toUpperCase();

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.bgPrimary, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={t.h1}>Mes projets</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Profile")}
          style={[styles.avatarSmall, { backgroundColor: c.accent }]}
        >
          <Text style={styles.avatarSmallText}>{initial}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar — always visible, even at 0 */}
      <StatsBar projects={projects} />

      {projects.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIcon}>🎙️</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Lance ton premier projet</Text>
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            Décris ton idée à voix haute,{"\n"}l'IA crée ton plan d'action en 30 secondes.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Dicter")}
            activeOpacity={0.8}
            style={[styles.emptyCta, { backgroundColor: c.accent, shadowColor: c.accent }]}
          >
            <Text style={styles.emptyCtaText}>🎙️ Dicter mon idée</Text>
          </TouchableOpacity>
          <Text style={[styles.trustText, { color: c.textMuted }]}>30 sec · 100% privé · Aucune carte bancaire</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ProjectCard
              item={item}
              index={index}
              onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + 16,
    paddingBottom: spacing.md,
  },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarSmallText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2, letterSpacing: 0.3 },
  list: { padding: spacing.xl, paddingTop: 0, paddingBottom: 120 },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderRadius: 20, overflow: "hidden", marginBottom: spacing.md, position: "relative" },
  colorBand: { height: 4, width: "100%" },
  cardBody: { padding: spacing.lg },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  cardChevron: { fontSize: 22 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  verdictBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.badge, borderWidth: 1 },
  verdictText: { fontSize: 11, fontWeight: "700" },
  timeText: { fontSize: 12 },
  cardSummary: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  miniTag: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  miniTagText: { fontSize: 11 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  deleteBtn: { position: "absolute", top: 18, right: 14, zIndex: 2 },
  deleteText: { fontSize: 14 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, marginTop: -20 },
  emptyCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(124,58,237,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 28 },
  emptyCta: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyCtaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  trustText: { fontSize: 12, marginTop: 16, textAlign: "center" },
});
