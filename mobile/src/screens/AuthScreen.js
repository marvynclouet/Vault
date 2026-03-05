import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { radius, spacing } from "../theme";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors: c } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 18, delay: 100 }}
        style={styles.content}
      >
        {/* Logo with glow */}
        <View style={styles.logoSection}>
          <MotiView
            from={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, delay: 200 }}
          >
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </MotiView>
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 500, delay: 400 }}
          >
            <Text style={[styles.appName, { color: c.textPrimary }]}>Vault-PM</Text>
            <Text style={[styles.tagline, { color: c.textSecondary }]}>Ton Chef de Projet IA</Text>
            <Text style={[styles.slogan, { color: c.accentLight }]}>Parle. L'IA structure.</Text>
          </MotiView>
        </View>

        {/* Form */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 18, delay: 500 }}
          style={styles.form}
        >
          <TextInput style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]} placeholder="Email" placeholderTextColor={c.textDisabled} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <TextInput style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]} placeholder="Mot de passe" placeholderTextColor={c.textDisabled} value={password} onChangeText={setPassword} secureTextEntry />

          {error && (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={[styles.errorBox, { backgroundColor: c.dangerSoft, borderColor: c.dangerBorderSoft }]}>
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </MotiView>
          )}
          {success && (
            <MotiView from={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={[styles.successBox, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
              <Text style={[styles.successText, { color: c.success }]}>{success}</Text>
            </MotiView>
          )}

          <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            <LinearGradient
              colors={[c.accent, "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isSignUp ? "Créer mon compte" : "Se connecter"}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }} style={styles.switchBtn}>
            <Text style={[styles.switchText, { color: c.accentLight }]}>
              {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? Créer un compte"}
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* Feature chips */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 700 }}
          style={styles.chipRow}
        >
          {["🎙️ Vocal", "🤖 IA PM", "📋 Plan"].map((chip, i) => (
            <MotiView
              key={chip}
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 800 + i * 100 }}
              style={styles.chip}
            >
              <Text style={[styles.chipText, { color: c.textSecondary }]}>{chip}</Text>
            </MotiView>
          ))}
        </MotiView>

        <Text style={[styles.footer, { color: c.textDisabled }]}>🔒 Zero-Retention · Vos données restent les vôtres</Text>
      </MotiView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", padding: spacing.xxl },
  logoSection: { alignItems: "center", marginBottom: 48 },
  logo: { width: 180, height: 180, marginBottom: 24 },
  appName: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  tagline: { fontSize: 14, marginTop: 6, textAlign: "center" },
  slogan: { fontSize: 14, fontStyle: "italic", marginTop: 4, textAlign: "center" },
  form: { gap: 12 },
  input: { borderWidth: 1, borderRadius: radius.input, paddingHorizontal: 18, paddingVertical: 16, fontSize: 15 },
  errorBox: { borderWidth: 1, borderRadius: radius.sm, padding: 12 },
  errorText: { fontSize: 13 },
  successBox: { borderWidth: 1, borderRadius: radius.sm, padding: 12 },
  successText: { fontSize: 13 },
  submitBtn: { borderRadius: radius.input, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switchBtn: { alignItems: "center", paddingVertical: 14 },
  switchText: { fontSize: 14, fontWeight: "500" },
  chipRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 28 },
  chip: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 11 },
  footer: { textAlign: "center", fontSize: 11, marginTop: 20 },
});
