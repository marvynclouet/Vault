import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { useTheme } from "../contexts/ThemeContext";
import { spacing } from "../theme";

const ONBOARDING_KEY = "onboarding_done";
const { width } = Dimensions.get("window");

const SLIDES = [
  {
    emoji: "👋",
    title: "Bienvenue",
    text: "Vault PM transforme tes idées en plans d'action",
  },
  {
    emoji: "🎙️",
    title: "Dicte ton idée",
    text: "Librement, l'IA fait le reste",
  },
  {
    emoji: "🚀",
    title: "Prêt ?",
    text: "Lance ta première dictée",
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef(null);

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      AsyncStorage.setItem(ONBOARDING_KEY, "true").then(() => onComplete?.());
    }
  };

  const renderItem = ({ item, idx }) => (
    <View style={[styles.slide, { width }]}>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "spring", damping: 15 }}
        style={styles.slideContent}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.title, { color: c.textPrimary }]}>{item.title}</Text>
        <Text style={[styles.text, { color: c.textSecondary }]}>{item.text}</Text>
      </MotiView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary, paddingTop: insets.top }]}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? c.accent : c.border },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={[styles.btn, { backgroundColor: c.accent }]}
        >
          <Text style={styles.btnText}>
            {index < SLIDES.length - 1 ? "Suivant" : "Commencer"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { flex: 1, justifyContent: "center", alignItems: "center" },
  slideContent: { alignItems: "center", paddingHorizontal: spacing.xl * 2 },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: "700", marginBottom: spacing.md },
  text: { fontSize: 16, textAlign: "center", lineHeight: 24 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 12px rgba(124,58,237,0.4)" }
      : { elevation: 8 }),
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
