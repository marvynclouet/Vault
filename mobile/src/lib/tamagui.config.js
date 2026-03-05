import { createTamagui } from "tamagui";
import { createInterFont } from "@tamagui/font-inter";
import { config as defaultConfig } from "@tamagui/config/v4";

const interFont = createInterFont();

const vaultTheme = {
  background: "#0F0F1A",
  backgroundHover: "rgba(255,255,255,0.055)",
  backgroundPress: "rgba(255,255,255,0.035)",
  backgroundFocus: "rgba(255,255,255,0.04)",
  color: "#EDEDF0",
  colorHover: "#FFFFFF",
  colorPress: "#C8C8D0",
  colorFocus: "#EDEDF0",
  borderColor: "rgba(255,255,255,0.06)",
  borderColorHover: "rgba(255,255,255,0.12)",
  borderColorFocus: "rgba(124,58,237,0.5)",
  placeholderColor: "#5A5A6E",
  shadowColor: "rgba(0,0,0,0.4)",
  accentBackground: "#7C3AED",
  accentColor: "#A78BFA",
  green: "#22C55E",
  yellow: "#F59E0B",
  red: "#EF4444",
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts: {
    ...defaultConfig.fonts,
    heading: interFont,
    body: interFont,
  },
  themes: {
    ...defaultConfig.themes,
    dark_vault: {
      ...defaultConfig.themes.dark,
      ...vaultTheme,
    },
  },
});

export default tamaguiConfig;
