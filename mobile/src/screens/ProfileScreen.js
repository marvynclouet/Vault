import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  StyleSheet,
} from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { loadProfile, updateProfile } from "../storage";
import { spacing, radius, fadeInUp } from "../theme";

const AVATARS = ["😎", "🚀", "💡", "🎯", "🧠", "⚡", "🔥", "💻", "🎨", "📊", "🦊", "🐺"];

export default function ProfileScreen({ navigation }) {
  const { colors: c } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeInUp(fadeAnim).start();
    loadProfile()
      .then((p) => {
        setProfile(p);
        setDisplayName(p.display_name || "");
        setUsername(p.username || "");
        setBio(p.bio || "");
        setSelectedAvatar(p.avatar_url || "😎");
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatar_url: selectedAvatar,
      });
      Alert.alert("Profil mis à jour", "Tes modifications sont sauvegardées.");
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    profile &&
    (displayName !== (profile.display_name || "") ||
      username !== (profile.username || "") ||
      bio !== (profile.bio || "") ||
      selectedAvatar !== (profile.avatar_url || "😎"));

  return (
    <Animated.ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary, opacity: fadeAnim }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: c.textPrimary }]}>Mon profil</Text>

      {/* Avatar picker */}
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 12, delay: 150 }}
        style={styles.avatarSection}
      >
        <View style={[styles.avatarBig, { backgroundColor: c.accentBg }]}>
          <Text style={styles.avatarBigText}>{selectedAvatar || "😎"}</Text>
        </View>
        <Text style={[styles.avatarHint, { color: c.textMuted }]}>Choisis ton avatar</Text>

        <View style={styles.avatarGrid}>
          {AVATARS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setSelectedAvatar(emoji)}
              activeOpacity={0.7}
              style={[
                styles.avatarOption,
                {
                  backgroundColor: selectedAvatar === emoji ? c.accentBg : c.bgCard,
                  borderColor: selectedAvatar === emoji ? c.accent : c.border,
                },
              ]}
            >
              <Text style={styles.avatarOptionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </MotiView>

      {/* Fields */}
      <MotiView
        from={{ opacity: 0, translateY: 15 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 18, delay: 300 }}
        style={styles.fields}
      >
        <Text style={[styles.label, { color: c.textMuted }]}>NOM D'AFFICHAGE</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Comment tu veux qu'on t'appelle"
          placeholderTextColor={c.textDisabled}
          maxLength={30}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>PSEUDO</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]}
          value={username}
          onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
          placeholder="ton_pseudo"
          placeholderTextColor={c.textDisabled}
          autoCapitalize="none"
          maxLength={20}
        />

        <Text style={[styles.label, { color: c.textMuted }]}>BIO</Text>
        <TextInput
          style={[styles.inputBio, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Entrepreneur, dev, designer..."
          placeholderTextColor={c.textDisabled}
          multiline
          maxLength={120}
        />
        <Text style={[styles.charCount, { color: c.textDisabled }]}>
          {bio.length}/120
        </Text>

        <Text style={[styles.label, { color: c.textMuted }]}>EMAIL</Text>
        <View style={[styles.emailRow, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <Text style={[styles.emailText, { color: c.textSecondary }]}>
            {user?.email || "—"}
          </Text>
          <View style={[styles.lockedBadge, { backgroundColor: c.accentBg }]}>
            <Text style={{ fontSize: 10, color: c.accentLight, fontWeight: "600" }}>🔒</Text>
          </View>
        </View>
      </MotiView>

      {/* Save button */}
      <View style={[styles.saveSection, { opacity: hasChanges ? 1 : 0.4 }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[c.accent, "#6D28D9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={{ height: 120 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5, marginBottom: spacing.xxl },

  avatarSection: { alignItems: "center", marginBottom: spacing.xxl },
  avatarBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarBigText: { fontSize: 44 },
  avatarHint: { fontSize: 12, marginBottom: 14 },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  avatarOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOptionText: { fontSize: 22 },

  fields: { gap: 4 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.9,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputBio: {
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: { textAlign: "right", fontSize: 11, marginTop: 4 },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emailText: { fontSize: 15 },
  lockedBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  saveSection: { marginTop: spacing.xxl },
  saveBtn: {
    borderRadius: radius.input,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
