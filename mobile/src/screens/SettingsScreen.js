import { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  StyleSheet,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { radius, spacing, type, cardStyle, fadeInUp } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

function IntegrationRow({ icon, name, desc, badge, badgeColor, badgeBg, dimmed, last }) {
  const { colors: c } = useTheme();
  return (
    <View style={[styles.integrationRow, { borderBottomColor: c.border }, last && { borderBottomWidth: 0 }, dimmed && { opacity: 0.5 }]}>
      <Text style={styles.integrationIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.integrationName, { color: c.textPrimary }, dimmed && { color: c.textMuted }]}>{name}</Text>
        {desc && <Text style={[styles.integrationDesc, { color: c.textMuted }]}>{desc}</Text>}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.statusText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { colors: c, isDark, toggleTheme } = useTheme();
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
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: c.bgPrimary }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Réglages</Text>

      {/* Account */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>COMPTE</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate("Profile")}
        style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <View style={styles.accountRow}>
          <View style={[styles.avatar, { backgroundColor: c.accent }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.email, { color: c.textPrimary }]}>{user?.email || "—"}</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>Modifier le profil →</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Appearance */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>APPARENCE</Text>
      <View style={[styles.themeRow, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <Text style={{ fontSize: 20 }}>{isDark ? "🌙" : "☀️"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.themeLabel, { color: c.textPrimary }]}>
            {isDark ? "Mode sombre" : "Mode clair"}
          </Text>
        </View>
        <Switch
          value={!isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: "rgba(255,255,255,0.1)", true: c.accentBg }}
          thumbColor={isDark ? "#555" : c.accent}
        />
      </View>

      {/* Integrations */}
      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>INTÉGRATIONS</Text>
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <IntegrationRow icon="📋" name="Trello" desc="Clés API dans le backend (.env)" badge="BACKEND" badgeColor={c.accentLight} badgeBg={c.accentBg} />
        <IntegrationRow icon="💬" name="Webhook (n8n / Make)" desc="WEBHOOK_URL dans le backend (.env)" badge="BACKEND" badgeColor={c.accentLight} badgeBg={c.accentBg} last />
      </View>

      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <IntegrationRow icon="📝" name="Jira" dimmed badge="BIENTÔT" badgeColor={c.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <IntegrationRow icon="📓" name="Notion" dimmed badge="BIENTÔT" badgeColor={c.textMuted} badgeBg="rgba(255,255,255,0.05)" />
        <IntegrationRow icon="📊" name="Asana" dimmed last badge="BIENTÔT" badgeColor={c.textMuted} badgeBg="rgba(255,255,255,0.05)" />
      </View>

      {/* About */}
      <Text style={styles.sectionLabel}>À PROPOS</Text>
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={[styles.aboutRow, { borderBottomColor: c.border }]}>
          <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>Version</Text>
          <Text style={[styles.aboutValue, { color: c.textPrimary }]}>0.3.0</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomColor: c.border }]}>
          <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>Backend</Text>
          <Text style={[styles.aboutValue, { color: c.textPrimary }]}>FastAPI + Supabase</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>Sécurité</Text>
          <Text style={[styles.aboutValue, { color: c.textPrimary }]}>Zero-Retention IA</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={[styles.logoutBtn, { borderColor: c.borderInput }]}>
        <Text style={[styles.logoutText, { color: c.textSecondary }]}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: c.textDisabled }]}>
        🔒 Zero-Retention · Vos données ne sont jamais stockées sur nos serveurs IA
      </Text>

      <Text style={[styles.madeWith, { color: c.textDisabled }]}>Vault-PM v0.3.0 — Made with 🤖</Text>

      <View style={{ height: 120 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxxl + 12 },
  title: { ...type.h1, marginBottom: spacing.xxl },
  sectionLabel: { ...type.label, marginBottom: spacing.md, marginTop: spacing.lg },
  card: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { fontSize: 15, fontWeight: "500" },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  integrationIcon: { fontSize: 22 },
  integrationName: { fontSize: 15, fontWeight: "600" },
  integrationDesc: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.badge },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  aboutLabel: { ...type.body },
  aboutValue: { ...type.body, fontWeight: "600" },
  logoutBtn: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  logoutText: { fontWeight: "600", fontSize: 14 },
  madeWith: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 16,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 24,
    lineHeight: 16,
  },
});
