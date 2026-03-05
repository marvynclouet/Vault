import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { colors, radius, spacing, type, fadeInUp } from "../theme";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      fadeInUp(fadeAnim),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        setSuccess("Compte créé ! Vérifie ton email pour confirmer.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoGlow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>V</Text>
            </View>
          </View>
          <Text style={styles.appName}>Vault-PM</Text>
          <Text style={styles.tagline}>Ton Chef de Projet IA</Text>
          <Text style={styles.slogan}>Parle. L'IA structure.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textDisabled}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textDisabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {success && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              onPress={handleSubmit}
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
              disabled={loading}
              activeOpacity={1}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp ? "Créer mon compte" : "Se connecter"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? Créer un compte"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feature chips */}
        <View style={styles.chipRow}>
          {["🎙️ Vocal", "🤖 IA PM", "📋 Plan"].map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          🔒 Zero-Retention · Vos données restent les vôtres
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { flex: 1, justifyContent: "center", padding: spacing.xxl },
  logoSection: { alignItems: "center", marginBottom: 48 },
  logoGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
    marginBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 30, fontWeight: "700" },
  appName: { fontSize: 26, fontWeight: "700", color: colors.textPrimary },
  tagline: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
  slogan: { fontSize: 14, fontStyle: "italic", color: colors.accentLight, marginTop: 4 },
  form: { gap: 12 },
  input: {
    backgroundColor: colors.bgInput,
    borderColor: colors.borderInput,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorderSoft,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 12,
  },
  errorText: { color: colors.danger, fontSize: 13 },
  successBox: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 12,
  },
  successText: { color: colors.success, fontSize: 13 },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.input,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchBtn: { alignItems: "center", paddingVertical: 14 },
  switchText: { color: colors.accentLight, fontSize: 14, fontWeight: "500" },
  chipRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 28,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 11, color: colors.textSecondary },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 20,
  },
});
