import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { spacing } from "../theme";

/**
 * Vue placeholder — personnalise selon tes besoins
 * Exemples : favoris, roadmap, statistiques, etc.
 */
export default function ExploreScreen() {
  const { colors: c } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <Text style={[styles.title, { color: c.textPrimary }]}>Explorer</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        Nouvelle vue — à personnaliser
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 15 },
});
