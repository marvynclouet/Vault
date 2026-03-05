import { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  StyleSheet,
} from "react-native";
import { colors, radius, spacing } from "../theme";

export default function LiveTranscript({ lines, isRecording }) {
  const scrollRef = useRef(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(1);
    }
  }, [isRecording, cursorOpacity]);

  useEffect(() => {
    if (scrollRef.current && lines.length > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [lines]);

  if (lines.length === 0 && !isRecording) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>TRANSCRIPTION EN DIRECT</Text>
        {isRecording && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {lines.length === 0 && isRecording ? (
          <View style={styles.waitingRow}>
            <Text style={styles.waitingText}>Tes mots apparaîtront ici...</Text>
            <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
          </View>
        ) : (
          <View style={styles.textContainer}>
            <Text style={styles.transcriptText}>{lines.join(" ")}</Text>
            {isRecording && (
              <Animated.View style={[styles.cursorInline, { opacity: cursorOpacity }]} />
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  heading: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accentLight,
    letterSpacing: 0.9,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.badge,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.danger,
  },
  scrollArea: { maxHeight: 160 },
  waitingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  waitingText: {
    color: colors.textDisabled,
    fontSize: 14,
    fontStyle: "italic",
  },
  textContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  transcriptText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
  },
  cursor: {
    width: 2,
    height: 18,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  cursorInline: {
    width: 2,
    height: 18,
    backgroundColor: colors.accent,
    borderRadius: 1,
    marginLeft: 2,
  },
});
