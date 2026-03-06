import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { radius, spacing, cardStyle } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const ROLE_ICONS = {
  Designer: "🎨", Developer: "💻", Dev: "💻", Marketing: "📣",
  "Chef de Projet": "📋", PM: "📋",
};

const DAYS_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function getDaysOverdue(iso) {
  if (!iso) return 0;
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
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
  const daysOverdue = !isDone && task.due_date ? getDaysOverdue(task.due_date) : 0;

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
                style={[styles.dateBadge, { borderColor: daysOverdue > 0 ? c.dangerBorder : c.border }]}
              >
                <Text style={[styles.dateText, daysOverdue > 0 && { color: c.danger }]}>
                  {daysOverdue > 0 ? `⚠️ En retard de ${daysOverdue}j` : `📅 ${dueStr}`}
                </Text>
              </TouchableOpacity>
            )}
            {!dueStr && (
              <TouchableOpacity
                onPress={() => onPressDate?.(task)}
                style={[styles.dateBadge, { borderColor: c.border, borderStyle: "dashed" }]}
              >
                <Text style={[styles.dateText, { color: c.textMuted }]}>📅 Définir échéance</Text>
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
  cardDone: { opacity: 0.5 },
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
