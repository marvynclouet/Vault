import { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius, spacing, type, cardStyle, fadeInUp } from "../theme";

function IntegrationRow({ icon, name, desc, badge, badgeColor, badgeBg, dimmed, last }) {
  return (
    <View style={[styles.integrationRow, last && { borderBottomWidth: 0 }, dimmed && { opacity: 0.5 }]}>
      <Text style={styles.integrationIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.integrationName, dimmed && { color: colors.textMuted }]}>{name}</Text>
        {desc && <Text style={styles.integrationDesc}>{desc}</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.statusText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      fadeInUp(fadeAnim),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const initial = (user?.email || "?")[0].toUpperCase();

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Réglages</Text>

      {/* Account */}
      <Text style={styles.sectionLabel}>COMPTE</Text>
      <View style={styles.card}>
        <View style={styles.accountRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.email}>{user?.email || "—"}</Text>
        </View>
      </View>

      {/* Integrations */}
      <Text style={styles.sectionLabel}>INTÉGRATIONS</Text>
      <View style={styles.card}>
        <IntegrationRow icon="📋" name="Trello" desc="Clés API dans le backend (.env)" badge="BACKEND" badgeColor={colors.accentLight} badgeBg={colors.accentBg} />
        <IntegrationRow icon="💬" name="Webhook (n8n / Make)" desc="WEBHOOK_URL dans le backend (.env)" badge="BACKEND" badgeColor={colors.accentLight} badgeBg={colors.accentBg} last />
      </View>

      <View style={styles.card}>
        <IntegrationRow icon="📝" name="Jira" dimmed badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <IntegrationRow icon="📓" name="Notion" dimmed badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <IntegrationRow icon="📊" name="Asana" dimmed last badge="BIENTÔT" badgeColor={colors.textMuted} badgeBg="rgba(255,255,255,0.05)" />
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>À PROPOS</Text>
      <View style={styles.card}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Version</Text>
          <Text style={styles.aboutValue}>0.3.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>Backend</Text>
          <Text style={styles.aboutValue}>FastAPI + Supabase</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.aboutLabel}>Sécurité</Text>
          <Text style={styles.aboutValue}>Zero-Retention IA</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        🔒 Zero-Retention · Vos données ne sont jamais stockées sur nos serveurs IA
      </Text>

      <Text style={styles.madeWith}>Vault-PM v0.3.0 — Made with 🤖</Text>

      <View style={{ height: 120 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: spacing.xl, paddingTop: spacing.xxxl + 12 },
  title: { ...type.h1, marginBottom: spacing.xxl },
  sectionLabel: { ...type.label, marginBottom: spacing.md, marginTop: spacing.lg },
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  integrationIcon: { fontSize: 22 },
  integrationName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  integrationDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.badge },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  aboutLabel: { ...type.body, color: colors.textSecondary },
  aboutValue: { ...type.body, color: colors.textPrimary, fontWeight: "600" },
  logoutBtn: {
    borderColor: colors.borderInput,
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  logoutText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  madeWith: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 16,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 24,
    lineHeight: 16,
  },
});
