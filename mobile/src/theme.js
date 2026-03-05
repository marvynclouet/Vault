import { Animated, Easing } from "react-native";

// ── Dark palette ──

const dark = {
  bgPrimary: "#0F0F1A",
  bgSecondary: "rgba(15,15,26,0.97)",
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

// ── Light palette ──

const light = {
  bgPrimary: "#F8F7FC",
  bgSecondary: "rgba(255,255,255,0.97)",
  bgCard: "#FFFFFF",
  bgCardHover: "#F3F2F8",
  bgInput: "#F0EFF5",

  border: "rgba(0,0,0,0.06)",
  borderHover: "rgba(0,0,0,0.12)",
  borderInput: "rgba(0,0,0,0.08)",

  accent: "#7C3AED",
  accentEnd: "#4F46E5",
  accentLight: "#7C3AED",
  accentBg: "rgba(124,58,237,0.1)",
  accentBorder: "rgba(124,58,237,0.2)",
  accentGlow: "rgba(124,58,237,0.15)",
  accentSoft: "rgba(124,58,237,0.08)",

  textPrimary: "#1A1A2E",
  textSecondary: "#5A5A72",
  textMuted: "#8888A0",
  textDisabled: "#ACACBE",

  success: "#059669",
  successBg: "rgba(5,150,105,0.08)",
  successBorder: "rgba(5,150,105,0.15)",

  warning: "#D97706",
  warningBg: "rgba(217,119,6,0.08)",
  warningBorder: "rgba(217,119,6,0.15)",

  danger: "#DC2626",
  dangerBg: "rgba(220,38,38,0.06)",
  dangerBorder: "rgba(220,38,38,0.12)",
  dangerSoft: "rgba(220,38,38,0.04)",
  dangerBorderSoft: "rgba(220,38,38,0.1)",
};

export const themes = { dark, light };

// Default export for backward compat (used by components that import { colors })
export const colors = dark;

// ── Spacing ──

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 28, section: 28,
};

// ── Radius ──

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 18, xxl: 24, full: 999, card: 16, input: 14, tab: 10, badge: 8,
};

// ── Helpers ──

export function getCardStyle(c) {
  return {
    backgroundColor: c.bgCard,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  };
}

export const cardStyle = getCardStyle(dark);

export function getType(c) {
  return {
    h1: { fontSize: 28, fontWeight: "700", color: c.textPrimary, letterSpacing: -0.5 },
    h2: { fontSize: 20, fontWeight: "700", color: c.textPrimary, letterSpacing: -0.3 },
    body: { fontSize: 14, fontWeight: "500", color: c.textSecondary, lineHeight: 21 },
    sub: { fontSize: 15, fontWeight: "400", color: c.textSecondary },
    label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9, color: c.textMuted, textTransform: "uppercase" },
    caption: { fontSize: 12, fontWeight: "500", color: c.textMuted },
    small: { fontSize: 11, fontWeight: "500", color: c.textDisabled },
  };
}

export const type = getType(dark);

// ── Animation helpers ──

export function fadeInUp(animValue, delay = 0, duration = 350) {
  return Animated.timing(animValue, {
    toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
  });
}

export function staggerCards(animValues, baseDelay = 0) {
  return Animated.stagger(60, animValues.map((av) => fadeInUp(av, baseDelay)));
}
