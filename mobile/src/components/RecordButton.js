import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from "react-native";
import { colors, radius } from "../theme";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Ripple({ delay }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 2.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.ripple,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

function Waveform() {
  const bars = [useRef(new Animated.Value(8)).current, useRef(new Animated.Value(8)).current, useRef(new Animated.Value(8)).current, useRef(new Animated.Value(8)).current, useRef(new Animated.Value(8)).current];

  useEffect(() => {
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(bar, { toValue: 24, duration: 300, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 8, duration: 300, useNativeDriver: false }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.waveform}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[styles.waveBar, { height: bar }]}
        />
      ))}
    </View>
  );
}

export default function RecordButton({
  isRecording,
  duration,
  onStart,
  onStop,
  disabled,
}) {
  const [micError, setMicError] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  async function handlePress() {
    if (disabled) return;
    setMicError(null);
    if (isRecording) {
      onStop();
    } else {
      try {
        await onStart();
      } catch (e) {
        setMicError(e.message);
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Outer ring */}
      <View style={[styles.outerRing, isRecording && styles.outerRingActive]} />

      {/* Ripples when recording */}
      {isRecording && (
        <View style={styles.rippleContainer}>
          <Ripple delay={0} />
          <Ripple delay={1000} />
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={() =>
            Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start()
          }
          onPressOut={() =>
            Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()
          }
          disabled={disabled}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.button,
              isRecording && styles.buttonRecording,
              { opacity: disabled ? 0.5 : 1, transform: [{ scale: btnScale }] },
            ]}
          >
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.micIcon}>
                <View style={styles.micBody} />
                <View style={styles.micArc} />
                <View style={styles.micBase} />
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.labelArea}>
        {isRecording ? (
          <>
            <Text style={styles.timer}>{formatTime(duration)}</Text>
            <Waveform />
          </>
        ) : (
          <Text style={styles.hint}>Appuie pour dicter ton projet</Text>
        )}
      </View>

      {micError && <Text style={styles.errorText}>{micError}</Text>}
    </View>
  );
}

const BTN_SIZE = 120;
const RING_SIZE = 148;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
  },
  outerRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(124,58,237,0.15)",
    top: (220 - RING_SIZE) / 2 - 20,
  },
  outerRingActive: {
    borderColor: "rgba(239,68,68,0.2)",
  },
  rippleContainer: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    top: (220 - BTN_SIZE) / 2 - 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: "rgba(124,58,237,0.15)",
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 12,
  },
  buttonRecording: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#fff",
  },
  micIcon: {
    alignItems: "center",
  },
  micBody: {
    width: 18,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#fff",
  },
  micArc: {
    width: 30,
    height: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.6)",
    borderTopWidth: 0,
    marginTop: -4,
  },
  micBase: {
    width: 2.5,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 2,
  },
  labelArea: {
    alignItems: "center",
    marginTop: 16,
    minHeight: 44,
  },
  timer: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
    marginBottom: 8,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 28,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.accentLight,
  },
  hint: {
    fontSize: 14,
    color: colors.textDisabled,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 8,
  },
});
