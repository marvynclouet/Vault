import { useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateProject } from "../storage";
import { radius, spacing, getGlassStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const COLUMNS = [
  { key: "todo", label: "À faire", status: "todo" },
  { key: "in_progress", label: "En cours", status: "in_progress" },
  { key: "done", label: "Terminé", status: "done" },
];

const TAB_BAR_HEIGHT = 110;

function KanbanCard({ task, onMove }) {
  const { colors: c } = useTheme();
  const col = COLUMNS.find((x) => x.status === (task.status || "todo"));
  const others = COLUMNS.filter((x) => x.status !== col?.status);

  return (
    <View style={[styles.card, getGlassStyle(c)]}>
      <Text style={[styles.cardTitle, { color: c.textPrimary }]} numberOfLines={2}>
        {task.title}
      </Text>
      <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={2}>
        {task.description}
      </Text>
      <View style={styles.cardActions}>
        {others.map((x) => (
          <TouchableOpacity
            key={x.key}
            onPress={() => onMove(task, x.status)}
            style={[styles.moveBtn, { borderColor: c.border }]}
          >
            <Text style={[styles.moveBtnText, { color: c.textSecondary }]}>→ {x.label}</Text>
          </TouchableOpacity>
        ))}
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
                <Text style={[styles.emptyColText, { color: c.textMuted }]}>Glisse une tâche ici</Text>
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
  cardTitle: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardDesc: { fontSize: 11, marginBottom: 8 },
  cardActions: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  moveBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  moveBtnText: { fontSize: 10, fontWeight: "500" },
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
