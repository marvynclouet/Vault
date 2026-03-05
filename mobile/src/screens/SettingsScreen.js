import { ScrollView, StyleSheet } from "react-native";
import {
  YStack,
  XStack,
  Text,
  Card,
  Button,
  Separator,
} from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { colors, type as t } from "../theme";

function IntegrationItem({ icon, name, desc, badge, badgeColor, badgeBg, dimmed }) {
  return (
    <XStack
      alignItems="center"
      gap="$3"
      padding="$3.5"
      opacity={dimmed ? 0.5 : 1}
    >
      <Text fontSize={22}>{icon}</Text>
      <YStack flex={1}>
        <Text color={dimmed ? colors.textMuted : colors.textPrimary} fontSize={15} fontWeight="600">
          {name}
        </Text>
        {desc && (
          <Text color={colors.textMuted} fontSize={12} marginTop={2}>
            {desc}
          </Text>
        )}
      </YStack>
      <Card
        backgroundColor={badgeBg}
        paddingHorizontal="$2"
        paddingVertical="$1"
        borderRadius={8}
      >
        <Text color={badgeColor} fontSize={9} fontWeight="700" letterSpacing={0.5}>
          {badge}
        </Text>
      </Card>
    </XStack>
  );
}

function AboutRow({ label, value, last }) {
  return (
    <>
      <XStack justifyContent="space-between" alignItems="center" padding="$3.5">
        <Text color={colors.textSecondary} fontSize={14}>{label}</Text>
        <Text color={colors.textPrimary} fontSize={14} fontWeight="600">{value}</Text>
      </XStack>
      {!last && <Separator borderColor={colors.border} />}
    </>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const initial = (user?.email || "?")[0].toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text color={colors.textPrimary} fontSize={28} fontWeight="700" letterSpacing={-0.5} marginBottom="$5">
        Réglages
      </Text>

      {/* Account */}
      <Text {...labelStyle}>COMPTE</Text>
      <Card backgroundColor={colors.bgCard} borderColor={colors.border} borderWidth={1} borderRadius={16} marginBottom="$3">
        <XStack alignItems="center" gap="$3" padding="$3.5">
          <YStack
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor={colors.accent}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="#fff" fontSize={20} fontWeight="700">{initial}</Text>
          </YStack>
          <Text color={colors.textPrimary} fontSize={15} fontWeight="500">
            {user?.email || "—"}
          </Text>
        </XStack>
      </Card>

      {/* Integrations */}
      <Text {...labelStyle}>INTÉGRATIONS</Text>
      <Card backgroundColor={colors.bgCard} borderColor={colors.border} borderWidth={1} borderRadius={16} marginBottom="$3">
        <IntegrationItem icon="📋" name="Trello" desc="Clés API dans le backend (.env)" badge="BACKEND" badgeColor={colors.accentLight} badgeBg={colors.accentBg} />
        <Separator borderColor={colors.border} />
        <IntegrationItem icon="💬" name="Webhook (n8n / Make)" desc="WEBHOOK_URL dans le backend (.env)" badge="BACKEND" badgeColor={colors.accentLight} badgeBg={colors.accentBg} />
      </Card>

      <Card backgroundColor={colors.bgCard} borderColor={colors.border} borderWidth={1} borderRadius={16} marginBottom="$3">
        <IntegrationItem icon="📝" name="Jira" dimmed badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <Separator borderColor={colors.border} />
        <IntegrationItem icon="📓" name="Notion" dimmed badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <Separator borderColor={colors.border} />
        <IntegrationItem icon="📊" name="Asana" dimmed badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
      </Card>

      {/* About */}
      <Text {...labelStyle}>À PROPOS</Text>
      <Card backgroundColor={colors.bgCard} borderColor={colors.border} borderWidth={1} borderRadius={16} marginBottom="$3">
        <AboutRow label="Version" value="0.3.0" />
        <AboutRow label="Backend" value="FastAPI + Supabase" />
        <AboutRow label="Sécurité" value="Zero-Retention IA" last />
      </Card>

      {/* Logout */}
      <Button
        size="$5"
        chromeless
        borderColor="rgba(255,255,255,0.08)"
        borderWidth={1}
        borderRadius={14}
        color={colors.textSecondary}
        fontWeight="600"
        fontSize={14}
        marginTop="$4"
        pressStyle={{ scale: 0.97, opacity: 0.8 }}
        onPress={signOut}
      >
        Se déconnecter
      </Button>

      <Text color={colors.textDisabled} fontSize={11} textAlign="center" marginTop="$5">
        🔒 Zero-Retention · Vos données ne sont jamais stockées sur nos serveurs IA
      </Text>

      <Text color={colors.textDisabled} fontSize={11} textAlign="center" marginTop="$3">
        Vault-PM v0.3.0 — Made with 🤖
      </Text>

      <YStack height={120} />
    </ScrollView>
  );
}

const labelStyle = {
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: "600",
  letterSpacing: 0.9,
  marginBottom: 10,
  marginTop: 16,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingTop: 56 },
});
