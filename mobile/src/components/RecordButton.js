import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PulseRing({ delay, size }) {
  return (
    <MotiView
      from={{ scale: 0.8, opacity: 0.5 }}
      animate={{ scale: 2.2, opacity: 0 }}
      transition={{ type: "timing", duration: 2000, loop: true, delay, repeatReverse: false }}
      style={[styles.pulseRing, { width: size, height: size, borderRadius: size / 2 }]}
    />
  );
}

function WaveBar({ index }) {
  return (
    <MotiView
      from={{ height: 6 }}
      animate={{ height: 26 }}
      transition={{
        type: "timing",
        duration: 400,
        loop: true,
        repeatReverse: true,
        delay: index * 100,
      }}
      style={styles.waveBar}
    />
  );
}

export default function RecordButton({ isRecording, duration, onStart, onStop, disabled }) {
  const [micError, setMicError] = useState(null);

  async function handlePress() {
    if (disabled) return;
    setMicError(null);
    if (isRecording) {
      onStop();
    } else {
      try { await onStart(); } catch (e) { setMicError(e.message); }
    }
  }

  return (
    <View style={styles.container}>
      {/* Pulse rings when recording */}
      <AnimatePresence>
        {isRecording && (
          <View style={styles.ringsContainer}>
            <PulseRing delay={0} size={BTN_SIZE} />
            <PulseRing delay={700} size={BTN_SIZE} />
            <PulseRing delay={1400} size={BTN_SIZE} />
          </View>
        )}
      </AnimatePresence>

      {/* Outer ring */}
      <MotiView
        animate={{
          scale: isRecording ? 1.05 : 1,
          borderColor: isRecording ? "rgba(239,68,68,0.25)" : "rgba(124,58,237,0.2)",
        }}
        transition={{ type: "spring", damping: 15 }}
        style={styles.outerRing}
      />

      {/* Main button */}
      <MotiView
        animate={{ scale: isRecording ? 1.05 : 1 }}
        transition={{ type: "spring", damping: 12, stiffness: 150 }}
      >
        <TouchableOpacity
          onPress={handlePress}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isRecording ? ["#EF4444", "#DC2626"] : [colors.accent, "#6D28D9"]}
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
                  <View style={styles.micBody} />
                  <View style={styles.micArc} />
                  <View style={styles.micBase} />
                </MotiView>
              )}
            </AnimatePresence>
          </LinearGradient>
        </TouchableOpacity>
      </MotiView>

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
              <Text style={styles.timer}>{formatTime(duration)}</Text>
              <View style={styles.waveform}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <WaveBar key={i} index={i} />
                ))}
              </View>
            </MotiView>
          ) : (
            <MotiView
              key="idle"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Text style={styles.hint}>Appuie pour dicter ton projet</Text>
            </MotiView>
          )}
        </AnimatePresence>
      </View>

      {micError && (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text style={styles.errorText}>{micError}</Text>
        </MotiView>
      )}
    </View>
  );
}

const BTN_SIZE = 120;
const RING_SIZE = 152;

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", height: 230 },
  ringsContainer: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    top: (230 - BTN_SIZE) / 2 - 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  outerRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    top: (230 - RING_SIZE) / 2 - 22,
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  micBody: { width: 18, height: 28, borderRadius: 9, backgroundColor: "#fff" },
  micArc: {
    width: 30, height: 16,
    borderBottomLeftRadius: 15, borderBottomRightRadius: 15,
    borderWidth: 2.5, borderColor: "rgba(255,255,255,0.7)", borderTopWidth: 0, marginTop: -4,
  },
  micBase: { width: 2.5, height: 8, backgroundColor: "rgba(255,255,255,0.7)", borderRadius: 2, alignSelf: "center" },
  labelArea: { alignItems: "center", marginTop: 18, minHeight: 50 },
  timer: {
    fontSize: 20, fontWeight: "700", color: colors.textPrimary,
    fontVariant: ["tabular-nums"], marginBottom: 8,
  },
  waveform: { flexDirection: "row", alignItems: "center", gap: 5, height: 30 },
  waveBar: { width: 3.5, borderRadius: 2, backgroundColor: colors.accentLight },
  hint: { fontSize: 14, color: colors.textDisabled },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 8 },
});
