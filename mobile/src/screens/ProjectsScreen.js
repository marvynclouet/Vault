import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { loadProjects, deleteProject, loadProfile } from "../storage";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

function getVerdict(c) {
  return {
    go: { label: "GO 🟢", color: c.success, bg: c.successBg, border: c.successBorder, band: c.success },
    pivot: { label: "À AJUSTER 🟡", color: c.warning, bg: c.warningBg, border: c.warningBorder, band: c.warning },
    drop: { label: "ABANDON 🔴", color: c.danger, bg: c.dangerBg, border: c.dangerBorder, band: c.danger },
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
  const dropCount = projects.filter((p) => p.review?.verdict === "drop").length;
  const stats = [
    { value: projects.length, label: "Projets", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)" },
    { value: goCount, label: "GO", bg: c.successBg, border: c.successBorder },
    { value: pivotCount, label: "À AJUSTER", bg: c.warningBg, border: c.warningBorder },
    { value: dropCount, label: "ABANDON", bg: c.dangerBg, border: c.dangerBorder },
  ];
  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.statCard, { backgroundColor: s.bg, borderColor: s.border }]}>
          <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted, opacity: 0.7 }]}>{s.label}</Text>
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
    const native = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: native }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay: index * 70, useNativeDriver: native }),
    ]).start();
  }, []);

  const handleLongPress = () => {
    const msg = "Supprimer ce projet ?\n\nTu es sûr ? C'est irréversible. Le projet, ses tâches et les messages du chat seront supprimés.";
    if (Platform.OS === "web") {
      if (window.confirm(msg)) onDelete(item.id);
    } else {
      Alert.alert(
        "Supprimer ce projet ?",
        "Tu es sûr ? C'est irréversible. Le projet, ses tâches et les messages du chat seront supprimés.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Supprimer", style: "destructive", onPress: () => onDelete(item.id) },
        ]
      );
    }
  };

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }, { scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onLongPress={handleLongPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: Platform.OS !== "web", speed: 50 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 20, bounciness: 8 }).start()}
        style={[styles.card, { borderColor: c.border }]}
      >
        <View style={[styles.verdictBar, { backgroundColor: v.band }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.project_name}</Text>
            <View style={styles.cardTitleRight}>
              <View style={styles.scoreChip}>
                <Text style={[styles.scoreChipLabel, { color: c.textDisabled }]}>Score IA</Text>
                <Text style={[styles.cardScore, { color: c.accentLight }]}>
                  {Math.min(10, Math.round((item.review?.confidence ?? item.review?.score_global ?? 0) / 4) || 0)}/10
                </Text>
              </View>
              <Text style={[styles.cardChevron, { color: c.textDisabled }]}>›</Text>
            </View>
          </View>
          <View style={styles.cardMetaRow}>
            <View style={[styles.verdictBadge, { backgroundColor: v.bg }]}>
              <Text style={[styles.verdictText, { color: v.color }]}>{v.label}</Text>
            </View>
            <Text style={[styles.timeText, { color: c.textDisabled }]}>il y a {timeAgo(item.created_at)}</Text>
          </View>
          <Text style={[styles.cardSummary, { color: c.textSecondary }]} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.miniTag, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: c.border }]}>
              <Text style={[styles.miniTagText, { color: c.textSecondary }]}>{item.tasks?.length || 0} tâches</Text>
            </View>
            {roles.map((role) => (
              <View key={role} style={[styles.miniTag, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: c.border }]}>
                <Text style={[styles.miniTagText, { color: c.textSecondary }]}>{role}</Text>
              </View>
            ))}
            {item.synced_to && (
              <View style={[styles.miniTag, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
                <Text style={[styles.miniTagText, { color: c.success }]}>→ {item.synced_to}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ProjectsScreen({ navigation }) {
  const { colors: c, type: t } = useTheme();
  const [projects, setProjects] = useState([]);
  const [profile, setProfile] = useState(null);
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: Platform.OS !== "web" }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects().then(setProjects).catch(console.error);
      loadProfile().then(setProfile).catch(() => setProfile(null));
    }, [])
  );

  const handleDelete = async (id) => {
    await deleteProject(id);
    const updated = await loadProjects();
    setProjects(updated);
  };

  const avatarDisplay = profile?.avatar_url || (user?.email || "?")[0].toUpperCase();

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.bgPrimary, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={t.h1}>Mes projets</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate("Profile")}
          style={[styles.avatarSmall, { backgroundColor: profile?.avatar_url ? c.accentBg : c.accent }]}
        >
          <Text style={[styles.avatarSmallText, profile?.avatar_url && { fontSize: 18, color: c.textPrimary }]}>{avatarDisplay}</Text>
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
            style={[styles.emptyCta, { backgroundColor: c.accent }]}
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
  card: { backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderRadius: 20, overflow: "hidden", marginBottom: spacing.md, position: "relative" },
  verdictBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  cardBody: { padding: spacing.lg, paddingLeft: spacing.lg + 8 },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  cardTitleRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  scoreChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreChipLabel: { fontSize: 10 },
  cardScore: { fontSize: 11, fontWeight: "700" },
  cardChevron: { fontSize: 22 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  verdictBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.badge },
  verdictText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  timeText: { fontSize: 12 },
  cardSummary: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  miniTag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  miniTagText: { fontSize: 11 },
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
    ...(Platform.OS === "web"
      ? { boxShadow: "0 6px 16px rgba(0,0,0,0.35)" }
      : { elevation: 8 }),
  },
  emptyCtaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  trustText: { fontSize: 12, marginTop: 16, textAlign: "center" },
});
