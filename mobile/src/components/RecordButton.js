import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PulseRing({ delay }) {
  return (
    <MotiView
      from={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ type: "timing", duration: 2000, loop: true, delay, repeatReverse: false }}
      style={styles.pulseRing}
    />
  );
}

function WaveBar({ index }) {
  const { colors: c } = useTheme();
  return (
    <MotiView
      from={{ height: 6 }}
      animate={{ height: 26 }}
      transition={{ type: "timing", duration: 400, loop: true, repeatReverse: true, delay: index * 100 }}
      style={[styles.waveBar, { backgroundColor: c.accentLight }]}
    />
  );
}

export default function RecordButton({ isRecording, duration, onStart, onStop, disabled }) {
  const { colors: c } = useTheme();
  const [micError, setMicError] = useState(null);

  async function handlePress() {
    if (disabled) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMicError(null);
    if (isRecording) {
      onStop();
    } else {
      try { await onStart(); } catch (e) { setMicError(e.message); }
    }
  }

  return (
    <View style={styles.container}>
      {/* Button area — everything centered here */}
      <View style={styles.btnArea}>
        {/* Pulse rings (recording only) */}
        <AnimatePresence>
          {isRecording && (
            <View style={styles.centered}>
              <PulseRing delay={0} />
              <PulseRing delay={700} />
              <PulseRing delay={1400} />
            </View>
          )}
        </AnimatePresence>

        {/* Spinning arc */}
        <MotiView
          from={{ rotate: "0deg" }}
          animate={{ rotate: "360deg" }}
          transition={{ type: "timing", duration: 4000, loop: true, repeatReverse: false }}
          style={styles.centered}
        >
          <View
            style={[
              styles.arcRing,
              {
                borderColor: isRecording ? "rgba(239,68,68,0.2)" : "rgba(124,58,237,0.2)",
                borderTopColor: isRecording ? "#EF4444" : c.accentLight,
                borderRightColor: "transparent",
              },
            ]}
          />
        </MotiView>

        {/* Main button */}
        <MotiView
          animate={{ scale: isRecording ? 1.05 : 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 150 }}
        >
          <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.85}>
            <LinearGradient
              colors={isRecording ? ["#EF4444", "#DC2626"] : [c.accent, "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, { opacity: disabled ? 0.5 : 1 }]}
            >
              <AnimatePresence exitBeforeEnter>
                {isRecording ? (
                  <MotiView
                    key="stop"
                    from={{ scale: 0, rotate: "45deg" }}
                    animate={{ scale: 1, rotate: "0deg" }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                    style={styles.stopIcon}
                  />
                ) : (
                  <MotiView
                    key="mic"
                    from={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 12 }}
                  >
                    <Text style={styles.micEmoji}>🎙️</Text>
                  </MotiView>
                )}
              </AnimatePresence>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
      </View>

      {/* Label + waveform */}
      <View style={styles.labelArea}>
        <AnimatePresence exitBeforeEnter>
          {isRecording ? (
            <MotiView
              key="recording"
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              style={{ alignItems: "center" }}
            >
              <Text style={[styles.timer, { color: c.textPrimary }]}>{formatTime(duration)}</Text>
              <View style={styles.waveform}>
                {[0, 1, 2, 3, 4].map((i) => <WaveBar key={i} index={i} />)}
              </View>
            </MotiView>
          ) : (
            <MotiView key="idle" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Text style={[styles.hint, { color: c.textDisabled }]}>Appuie pour dicter ton projet</Text>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      {micError && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text style={[styles.errorText, { color: c.danger }]}>{micError}</Text>
        </MotiView>
      )}
    </View>
  );
}

const BTN = 120;
const RING = 148;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  btnArea: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  arcRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
  },
  button: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  micEmoji: { fontSize: 42 },
  labelArea: {
    alignItems: "center",
    marginTop: 16,
    minHeight: 50,
  },
  timer: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginBottom: 8,
  },
  waveform: { flexDirection: "row", alignItems: "center", gap: 5, height: 30 },
  waveBar: { width: 3.5, borderRadius: 2 },
  hint: { fontSize: 14 },
  errorText: { fontSize: 12, marginTop: 8 },
});
