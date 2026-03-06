import { createContext, useContext, useState, useCallback } from "react";

const QuickDictateContext = createContext(null);

export function QuickDictateProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  return (
    <QuickDictateContext.Provider value={{ visible, open, close }}>
      {children}
    </QuickDictateContext.Provider>
  );
}

export function useQuickDictate() {
  const ctx = useContext(QuickDictateContext);
  if (!ctx) throw new Error("useQuickDictate must be used within QuickDictateProvider");
  return ctx;
}
