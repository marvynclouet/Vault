import { useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { radius, spacing } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

export default function LiveTranscript({ lines, isRecording }) {
  const { colors: c } = useTheme();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && lines.length > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [lines]);

  if (lines.length === 0 && !isRecording) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={[styles.heading, { color: c.accentLight }]}>TRANSCRIPTION EN DIRECT</Text>
        <AnimatePresence>
          {isRecording && (
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={[styles.liveBadge, { backgroundColor: c.dangerBg, borderColor: c.dangerBorder }]}
            >
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ type: "timing", duration: 600, loop: true, repeatReverse: true }}
                style={[styles.liveDot, { backgroundColor: c.danger }]}
              />
              <Text style={[styles.liveText, { color: c.danger }]}>LIVE</Text>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      <ScrollView ref={scrollRef} style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
        {lines.length === 0 && isRecording ? (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ type: "timing", duration: 800, loop: true, repeatReverse: true }}
          >
            <Text style={[styles.waitingText, { color: c.textDisabled }]}>Tes mots apparaîtront ici...</Text>
          </MotiView>
        ) : (
          <Text style={[styles.transcriptText, { color: c.textPrimary }]}>{lines.join(" ")}</Text>
        )}
      </ScrollView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  heading: { fontSize: 11, fontWeight: "600", letterSpacing: 0.9 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: "700" },
  waitingText: { fontSize: 14, fontStyle: "italic" },
  transcriptText: { fontSize: 15, lineHeight: 24 },
});
