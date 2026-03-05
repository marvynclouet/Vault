import { YStack, XStack, Text, Card } from "tamagui";
import { colors } from "../theme";

const PRIORITY = {
  Haute: { bg: colors.dangerBg, text: colors.danger, border: colors.dangerBorder },
  Moyenne: { bg: colors.warningBg, text: colors.warning, border: colors.warningBorder },
  Basse: { bg: colors.successBg, text: colors.success, border: colors.successBorder },
};

const ROLE_ICONS = {
  Designer: "🎨", Developer: "💻", Dev: "💻", Marketing: "📣",
  "Chef de Projet": "📋", PM: "📋",
};

export default function TaskCard({ task, index }) {
  const p = PRIORITY[task.priority] || PRIORITY.Basse;
  const icon = ROLE_ICONS[task.assignee_role] || "👤";

  return (
    <Card
      backgroundColor={colors.bgCard}
      borderColor={colors.border}
      borderWidth={1}
      borderRadius={16}
      padding="$3.5"
      marginBottom="$2.5"
      pressStyle={{ scale: 0.98, borderColor: colors.borderHover }}
    >
      <XStack justifyContent="space-between" alignItems="flex-start" marginBottom={8} gap={8}>
        <Text color={colors.textPrimary} fontSize={14} fontWeight="700" flex={1} numberOfLines={2}>
          {task.title}
        </Text>
        <YStack backgroundColor={p.bg} borderColor={p.border} borderWidth={1} borderRadius={8} paddingHorizontal={10} paddingVertical={3}>
          <Text color={p.text} fontSize={11} fontWeight="600">{task.priority}</Text>
        </YStack>
      </XStack>

      <Text color={colors.textSecondary} fontSize={13} lineHeight={19} marginBottom={10}>
        {task.description}
      </Text>

      <YStack alignSelf="flex-start" backgroundColor={colors.accentBg} borderRadius={6} paddingHorizontal={10} paddingVertical={4}>
        <Text color={colors.accentLight} fontSize={11} fontWeight="500">
          {icon} {task.assignee_role}
        </Text>
      </YStack>
    </Card>
  );
}
