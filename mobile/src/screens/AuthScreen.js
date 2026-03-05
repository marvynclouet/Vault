import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  Card,
  Separator,
} from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <YStack flex={1} justifyContent="center" padding="$5" gap="$3">
        {/* Logo */}
        <YStack alignItems="center" marginBottom="$8">
          <YStack
            width={64}
            height={64}
            borderRadius={18}
            backgroundColor={colors.accent}
            alignItems="center"
            justifyContent="center"
            marginBottom="$4"
            shadowColor={colors.accent}
            shadowOffset={{ width: 0, height: 0 }}
            shadowOpacity={0.4}
            shadowRadius={30}
            elevation={12}
          >
            <Text color="#fff" fontSize={30} fontWeight="700">V</Text>
          </YStack>
          <Text color={colors.textPrimary} fontSize={26} fontWeight="700">
            Vault-PM
          </Text>
          <Text color={colors.textSecondary} fontSize={14} marginTop="$1">
            Ton Chef de Projet IA
          </Text>
          <Text color={colors.accentLight} fontSize={14} fontStyle="italic" marginTop="$1">
            Parle. L'IA structure.
          </Text>
        </YStack>

        {/* Form */}
        <Input
          size="$5"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          backgroundColor="rgba(255,255,255,0.05)"
          borderColor="rgba(255,255,255,0.08)"
          color={colors.textPrimary}
          placeholderTextColor={colors.textDisabled}
          borderRadius={14}
          focusStyle={{ borderColor: "rgba(124,58,237,0.5)" }}
        />

        <Input
          size="$5"
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          backgroundColor="rgba(255,255,255,0.05)"
          borderColor="rgba(255,255,255,0.08)"
          color={colors.textPrimary}
          placeholderTextColor={colors.textDisabled}
          borderRadius={14}
          focusStyle={{ borderColor: "rgba(124,58,237,0.5)" }}
        />

        {error && (
          <Card
            backgroundColor={colors.dangerSoft}
            borderColor={colors.dangerBorderSoft}
            borderWidth={1}
            padding="$3"
            borderRadius={10}
          >
            <Text color={colors.danger} fontSize={13}>{error}</Text>
          </Card>
        )}

        {success && (
          <Card
            backgroundColor={colors.successBg}
            borderColor={colors.successBorder}
            borderWidth={1}
            padding="$3"
            borderRadius={10}
          >
            <Text color={colors.success} fontSize={13}>{success}</Text>
          </Card>
        )}

        <Button
          size="$5"
          backgroundColor={colors.accent}
          color="#fff"
          fontWeight="600"
          fontSize={16}
          borderRadius={14}
          marginTop="$2"
          pressStyle={{ scale: 0.97, opacity: 0.9 }}
          disabled={loading}
          onPress={handleSubmit}
          shadowColor={colors.accent}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
          shadowRadius={12}
          elevation={6}
        >
          {loading ? "..." : isSignUp ? "Créer mon compte" : "Se connecter"}
        </Button>

        <Button
          size="$4"
          chromeless
          color={colors.accentLight}
          fontSize={14}
          fontWeight="500"
          onPress={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }}
        >
          {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? Créer un compte"}
        </Button>

        {/* Feature chips */}
        <XStack justifyContent="center" gap="$2" marginTop="$6">
          {["🎙️ Vocal", "🤖 IA PM", "📋 Plan"].map((chip) => (
            <Card
              key={chip}
              backgroundColor="rgba(255,255,255,0.04)"
              paddingHorizontal="$3"
              paddingVertical="$1.5"
              borderRadius={20}
            >
              <Text color={colors.textSecondary} fontSize={11}>{chip}</Text>
            </Card>
          ))}
        </XStack>

        <Text
          color={colors.textDisabled}
          fontSize={11}
          textAlign="center"
          marginTop="$4"
        >
          🔒 Zero-Retention · Vos données restent les vôtres
        </Text>
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
});
