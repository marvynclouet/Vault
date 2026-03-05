import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Cercle radial pour afficher un score 0-10
 * Arc coloré : rouge 0-3, orange 4-6, vert 7-10
 */
export default function RadialChart({ score = 0, size = 80 }) {
  const { colors: c } = useTheme();
  const max = 10;
  const normalized = Math.min(max, Math.max(0, score));
  const pct = normalized / max;
  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDasharray = circumference * pct;
  const strokeDashoffset = circumference - strokeDasharray;

  const getColor = () => {
    if (normalized <= 3) return c.danger;
    if (normalized <= 6) return c.warning;
    return c.success;
  };

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { pointerEvents: "none" }]}>
        <View style={styles.labelWrap}>
          <Text style={[styles.score, { color: c.textPrimary }]}>{Math.round(normalized)}</Text>
          <Text style={[styles.max, { color: c.textMuted }]}>/10</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  svg: { position: "absolute" },
  labelWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  score: { fontSize: 28, fontWeight: "700" },
  max: { fontSize: 12, marginTop: -2 },
});
