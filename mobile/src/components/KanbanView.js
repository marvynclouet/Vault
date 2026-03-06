import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateProject } from "../storage";
import { radius, spacing, getGlassStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const COLUMNS = [
  { key: "todo", label: "À faire", status: "todo", emptyText: "Toutes les tâches sont en cours" },
  { key: "in_progress", label: "En cours", status: "in_progress", emptyText: "Aucune tâche en cours" },
  { key: "done", label: "Terminé", status: "done", emptyText: "Aucune tâche terminée" },
];

const PRIORITY_COLORS = {
  Haute: "#EF4444",
  Moyenne: "#F59E0B",
  Basse: "#6B7280",
};

const MOVE_BTN_COLORS = {
  todo: { bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.3)", text: "#A78BFA" },
  in_progress: { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "#60A5FA" },
  done: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)", text: "#34D399" },
};

const TAB_BAR_HEIGHT = 110;

function KanbanCard({ task, onMove }) {
  const { colors: c } = useTheme();
  const col = COLUMNS.find((x) => x.status === (task.status || "todo"));
  const others = COLUMNS.filter((x) => x.status !== col?.status);
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Basse;

  return (
    <View style={[styles.card, getGlassStyle(c)]}>
      <View style={styles.cardHeader}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <Text style={[styles.priorityLabel, { color: priorityColor }]}>{task.priority || "Basse"}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={2}>
        {task.description}
      </Text>
      {task.assignee_role ? (
        <Text style={[styles.cardRole, { color: c.textDisabled }]} numberOfLines={1}>
          {task.assignee_role}
        </Text>
      ) : null}
      <View style={styles.cardActions}>
        {others.map((x) => {
          const btnStyle = MOVE_BTN_COLORS[x.status];
          return (
            <TouchableOpacity
              key={x.key}
              onPress={() => onMove(task, x.status)}
              style={[styles.moveBtn, { backgroundColor: btnStyle.bg, borderColor: btnStyle.border }]}
            >
              <Text style={[styles.moveBtnText, { color: btnStyle.text }]}>{x.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function KanbanView({ project, onProjectUpdate }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();

  const handleMove = useCallback(
    async (task, newStatus) => {
      if (!project) return;
      const updated = (project.tasks || []).map((t) =>
        t === task
          ? {
              ...t,
              status: newStatus,
              completed_at: newStatus === "done" ? new Date().toISOString() : null,
            }
          : t
      );
      await updateProject(project.id, { tasks: updated });
      onProjectUpdate?.({ tasks: updated });
    },
    [project, onProjectUpdate]
  );

  const tasksByCol = COLUMNS.reduce((acc, col) => {
    acc[col.key] = (project?.tasks || []).filter((t) => (t.status || "todo") === col.status);
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.columns, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 100 }]}
    >
      {COLUMNS.map((col) => (
        <View key={col.key} style={[styles.column, getGlassStyle(c)]}>
          <View style={styles.columnHeader}>
            <Text style={[styles.columnTitle, { color: c.textPrimary }]}>{col.label}</Text>
            <View style={[styles.countBadge, { backgroundColor: c.accentBg }]}>
              <Text style={[styles.countText, { color: c.accentLight }]}>
                {tasksByCol[col.key]?.length || 0}
              </Text>
            </View>
          </View>
          <ScrollView style={styles.columnContent} showsVerticalScrollIndicator={false}>
            {(tasksByCol[col.key] || []).length === 0 ? (
              <View style={[styles.emptyCol, { borderColor: c.border }]}>
                <Text style={[styles.emptyColText, { color: c.textMuted }]}>{col.emptyText}</Text>
              </View>
            ) : (
              (tasksByCol[col.key] || []).map((task, i) => (
                <KanbanCard key={i} task={task} onMove={handleMove} />
              ))
            )}
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  columns: { flexDirection: "row", gap: 12, padding: spacing.lg, paddingRight: spacing.xl + 60 },
  column: {
    width: 200,
    minHeight: 120,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxHeight: 400,
  },
  columnHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  columnTitle: { fontSize: 13, fontWeight: "700" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: "600" },
  columnContent: { flex: 1 },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  cardTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardDesc: { fontSize: 11, marginBottom: 6 },
  cardRole: { fontSize: 10, fontStyle: "italic", marginBottom: 8 },
  cardActions: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 2 },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  moveBtnText: { fontSize: 10, fontWeight: "600" },
  emptyCol: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  emptyColText: { fontSize: 12, opacity: 0.6, fontStyle: "italic" },
});
