import { createContext, useContext, useState, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, getType, getCardStyle } from "../theme";

const STORAGE_KEY = "vault_pm_theme";

const ThemeContext = createContext({});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark") setMode(saved);
    });
  }, []);

  const toggleTheme = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => {
    const c = themes[mode];
    return {
      mode,
      isDark: mode === "dark",
      colors: c,
      type: getType(c),
      cardStyle: getCardStyle(c),
      toggleTheme,
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
