import { Animated, Easing } from "react-native";

// ── Palette ──

export const colors = {
  bgPrimary: "#0F0F1A",
  bgSecondary: "rgba(15,15,26,0.85)",
  bgCard: "rgba(255,255,255,0.035)",
  bgCardHover: "rgba(255,255,255,0.055)",
  bgInput: "rgba(255,255,255,0.05)",

  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  borderInput: "rgba(255,255,255,0.08)",

  accent: "#7C3AED",
  accentEnd: "#4F46E5",
  accentLight: "#A78BFA",
  accentBg: "rgba(124,58,237,0.2)",
  accentBorder: "rgba(124,58,237,0.3)",
  accentGlow: "rgba(124,58,237,0.25)",
  accentSoft: "rgba(124,58,237,0.15)",

  textPrimary: "#EDEDF0",
  textSecondary: "#8B8B9E",
  textMuted: "#6C6C80",
  textDisabled: "#5A5A6E",

  success: "#10B981",
  successBg: "rgba(16,185,129,0.12)",
  successBorder: "rgba(16,185,129,0.2)",

  warning: "#F59E0B",
  warningBg: "rgba(245,158,11,0.12)",
  warningBorder: "rgba(245,158,11,0.2)",

  danger: "#EF4444",
  dangerBg: "rgba(239,68,68,0.12)",
  dangerBorder: "rgba(239,68,68,0.2)",
  dangerSoft: "rgba(239,68,68,0.08)",
  dangerBorderSoft: "rgba(239,68,68,0.15)",
};

// ── Typography ──

export const type = {
  h1: { fontSize: 28, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },
  body: { fontSize: 14, fontWeight: "500", color: "#C8C8D0", lineHeight: 21 },
  sub: { fontSize: 15, fontWeight: "400", color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, color: colors.textMuted, textTransform: "uppercase" },
  caption: { fontSize: 12, fontWeight: "500", color: colors.textMuted },
  small: { fontSize: 11, fontWeight: "500", color: colors.textDisabled },
};

// ── Spacing ──

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  section: 28,
};

// ── Radius ──

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 24,
  full: 999,
  card: 16,
  input: 14,
  tab: 10,
  badge: 8,
};

// ── Card base style ──

export const cardStyle = {
  backgroundColor: colors.bgCard,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radius.card,
  padding: spacing.lg,
};

// ── Animation helpers ──

export function fadeInUp(animValue, delay = 0, duration = 350) {
  return Animated.timing(animValue, {
    toValue: 1,
    duration,
    delay,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
}

export function staggerCards(animValues, baseDelay = 0) {
  return Animated.stagger(
    60,
    animValues.map((av, i) => fadeInUp(av, baseDelay))
  );
}

export function pressScale(scaleValue) {
  return {
    onPressIn: () =>
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start(),
    onPressOut: () =>
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start(),
  };
}
