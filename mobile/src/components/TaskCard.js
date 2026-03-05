import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { radius, spacing, cardStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const ROLE_ICONS = {
  Designer: "🎨", Developer: "💻", Dev: "💻", Marketing: "📣",
  "Chef de Projet": "📋", PM: "📋",
};

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function TaskCard({ task, index, onToggle, onPressDate }) {
  const { colors: c } = useTheme();
  const status = task.status || "todo";
  const isDone = status === "done";

  const PRIORITY = {
    Haute: { bg: c.dangerBg, text: c.danger, border: c.dangerBorder },
    Moyenne: { bg: c.warningBg, text: c.warning, border: c.warningBorder },
    Basse: { bg: c.successBg, text: c.success, border: c.successBorder },
  };

  const p = PRIORITY[task.priority] || PRIORITY.Basse;
  const icon = ROLE_ICONS[task.assignee_role] || "👤";
  const dueStr = formatDueDate(task.due_date);

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: "spring", damping: 18, delay: index * 80 }}
      style={[styles.card, isDone && styles.cardDone]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle?.(task);
          }}
          activeOpacity={0.7}
          style={[styles.checkbox, isDone && { backgroundColor: c.success }]}
        >
          {isDone && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: c.textPrimary }, isDone && styles.titleDone]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: p.bg, borderColor: p.border }]}>
              <Text style={[styles.priorityText, { color: p.text }]}>{task.priority}</Text>
            </View>
          </View>

          <Text style={[styles.description, { color: c.textSecondary }, isDone && styles.descDone]}>
            {task.description}
          </Text>

          <View style={styles.footer}>
            <View style={[styles.roleBadge, { backgroundColor: c.accentBg }]}>
              <Text style={[styles.roleText, { color: c.accentLight }]}>{icon} {task.assignee_role}</Text>
            </View>
            {dueStr && (
              <TouchableOpacity
                onPress={() => onPressDate?.(task)}
                style={[styles.dateBadge, { borderColor: c.border }]}
              >
                <Text style={[styles.dateText, { color: c.textMuted }]}>📅 {dueStr}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, marginBottom: spacing.md, padding: 16 },
  cardDone: { opacity: 0.75 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 },
  title: { fontSize: 14, fontWeight: "700", flex: 1 },
  titleDone: { textDecorationLine: "line-through", opacity: 0.7 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.badge, borderWidth: 1 },
  priorityText: { fontSize: 11, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  descDone: { opacity: 0.7 },
  footer: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: "500" },
  dateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  dateText: { fontSize: 11 },
});
