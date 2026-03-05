import { View, Text, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { radius, spacing, cardStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const ROLE_ICONS = {
  Designer: "🎨", Developer: "💻", Dev: "💻", Marketing: "📣",
  "Chef de Projet": "📋", PM: "📋",
};

export default function TaskCard({ task, index }) {
  const { colors: c } = useTheme();

  const PRIORITY = {
    Haute: { bg: c.dangerBg, text: c.danger, border: c.dangerBorder },
    Moyenne: { bg: c.warningBg, text: c.warning, border: c.warningBorder },
    Basse: { bg: c.successBg, text: c.success, border: c.successBorder },
  };

  const p = PRIORITY[task.priority] || PRIORITY.Basse;
  const icon = ROLE_ICONS[task.assignee_role] || "👤";

  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: "spring", damping: 18, delay: index * 80 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textPrimary }]} numberOfLines={2}>{task.title}</Text>
        <View style={[styles.priorityBadge, { backgroundColor: p.bg, borderColor: p.border }]}>
          <Text style={[styles.priorityText, { color: p.text }]}>{task.priority}</Text>
        </View>
      </View>

      <Text style={[styles.description, { color: c.textSecondary }]}>{task.description}</Text>

      <View style={[styles.roleBadge, { backgroundColor: c.accentBg }]}>
        <Text style={[styles.roleText, { color: c.accentLight }]}>{icon} {task.assignee_role}</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: { ...cardStyle, marginBottom: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 },
  title: { fontSize: 14, fontWeight: "700", flex: 1 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.badge, borderWidth: 1 },
  priorityText: { fontSize: 11, fontWeight: "600" },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: "500" },
});
