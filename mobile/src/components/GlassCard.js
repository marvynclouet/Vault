import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Carte glassmorphism Apple-like
 */
export default function GlassCard({ children, style, intensity = 20, tint = "dark" }) {
  const { isDark } = useTheme();

  const blurTint = isDark ? "dark" : "light";

  if (Platform.OS === "web") {
    return (
      <View style={[styles.glass, styles.glassFallback, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.glass, style]}>
      <BlurView intensity={intensity} tint={blurTint} style={StyleSheet.absoluteFill} />
      <View style={styles.glassContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  glassFallback: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  glassContent: {
    padding: 16,
    overflow: "hidden",
  },
});
