import { useRef, useEffect } from "react";
import { ScrollView, Animated } from "react-native";
import { YStack, XStack, Text, Card } from "tamagui";
import { colors } from "../theme";

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
    <Card
      backgroundColor="rgba(255,255,255,0.03)"
      borderColor="rgba(255,255,255,0.05)"
      borderWidth={1}
      borderRadius={16}
      padding="$3.5"
      marginBottom="$3"
    >
      <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
        <Text color={colors.accentLight} fontSize={11} fontWeight="600" letterSpacing={0.9}>
          TRANSCRIPTION EN DIRECT
        </Text>
        {isRecording && (
          <XStack
            alignItems="center"
            gap={5}
            backgroundColor={colors.dangerBg}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={8}
            borderWidth={1}
            borderColor={colors.dangerBorder}
          >
            <YStack width={6} height={6} borderRadius={3} backgroundColor={colors.danger} />
            <Text color={colors.danger} fontSize={10} fontWeight="700">LIVE</Text>
          </XStack>
        )}
      </XStack>

      <ScrollView ref={scrollRef} style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
        {lines.length === 0 && isRecording ? (
          <XStack alignItems="center" gap={4}>
            <Text color={colors.textDisabled} fontSize={14} fontStyle="italic">
              Tes mots apparaîtront ici...
            </Text>
            <Animated.View
              style={{ width: 2, height: 18, backgroundColor: colors.accent, borderRadius: 1, opacity: cursorOpacity }}
            />
          </XStack>
        ) : (
          <XStack flexWrap="wrap" alignItems="center">
            <Text color={colors.textPrimary} fontSize={15} lineHeight={24}>
              {lines.join(" ")}
            </Text>
            {isRecording && (
              <Animated.View
                style={{ width: 2, height: 18, backgroundColor: colors.accent, borderRadius: 1, marginLeft: 2, opacity: cursorOpacity }}
              />
            )}
          </XStack>
        )}
      </ScrollView>
    </Card>
  );
}
