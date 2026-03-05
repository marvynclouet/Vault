import { useState, useRef, useEffect } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { YStack, XStack, Text, Input, Button, Card } from "tamagui";
import { chatWithPM } from "../api";
import { loadMessages, saveMessage, updateProject } from "../storage";
import { colors } from "../theme";

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubbleWrap,
        isUser ? styles.bubbleWrapUser : styles.bubbleWrapAi,
        { opacity: anim, transform: [{ translateY: slide }] },
      ]}
    >
      {!isUser && (
        <YStack width={28} height={28} borderRadius={14} backgroundColor={colors.accentBg} alignItems="center" justifyContent="center" marginTop={2}>
          <Text fontSize={9} fontWeight="700" color={colors.accentLight}>PM</Text>
        </YStack>
      )}
      <YStack
        maxWidth="80%"
        padding={14}
        borderRadius={18}
        backgroundColor={isUser ? colors.accent : colors.bgInput}
        borderColor={isUser ? undefined : colors.border}
        borderWidth={isUser ? 0 : 1}
        borderBottomRightRadius={isUser ? 4 : 18}
        borderBottomLeftRadius={isUser ? 18 : 4}
      >
        <Text fontSize={14} lineHeight={21} color={isUser ? "#fff" : colors.textPrimary}>
          {msg.content}
        </Text>
        {msg.hasUpdates && (
          <Card
            backgroundColor={colors.successBg}
            borderColor={colors.successBorder}
            borderWidth={1}
            borderRadius={10}
            paddingHorizontal={10}
            paddingVertical={5}
            marginTop={8}
            alignSelf="flex-start"
          >
            <Text fontSize={11} fontWeight="600" color={colors.success}>✅ Projet mis à jour</Text>
          </Card>
        )}
      </YStack>
    </Animated.View>
  );
}

export default function ChatView({ project, onProjectUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadMessages(project.id).then((msgs) => {
      if (msgs.length === 0) {
        const welcomeMsg = {
          role: "assistant",
          content: `Salut ! J'ai analysé ton projet "${project.project_name}". ${project.review?.one_liner || project.summary}\n\nJe suis ton PM IA. Tu peux me demander de modifier les tâches, ajouter des features, changer les priorités, ou simplement discuter stratégie. Qu'est-ce qu'on fait ?`,
          timestamp: new Date().toISOString(),
          hasUpdates: false,
        };
        setMessages([welcomeMsg]);
        saveMessage(project.id, welcomeMsg).catch(console.error);
      } else {
        setMessages(msgs);
      }
    });
  }, [project.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString(), hasUpdates: false };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setSending(true);

    try {
      await saveMessage(project.id, userMsg);
      const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));
      const result = await chatWithPM(
        { project_name: project.project_name, summary: project.summary, tasks: project.tasks },
        apiMessages.slice(0, -1),
        text
      );

      const aiMsg = {
        role: "assistant",
        content: result.message,
        timestamp: new Date().toISOString(),
        hasUpdates: !!result.project_updates,
      };
      setMessages((prev) => [...prev, aiMsg]);
      await saveMessage(project.id, aiMsg);

      if (result.project_updates) {
        const updates = {};
        if (result.project_updates.summary) updates.summary = result.project_updates.summary;
        if (result.project_updates.tasks) updates.tasks = result.project_updates.tasks;
        if (Object.keys(updates).length > 0) {
          await updateProject(project.id, updates);
          if (onProjectUpdate) onProjectUpdate(updates);
        }
      }
    } catch (err) {
      const errMsg = {
        role: "assistant",
        content: `Désolé, une erreur est survenue : ${err.message}`,
        timestamp: new Date().toISOString(),
        hasUpdates: false,
      };
      setMessages((prev) => [...prev, errMsg]);
      await saveMessage(project.id, errMsg).catch(console.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={140}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <XStack
        padding="$2.5"
        paddingBottom="$4"
        borderTopWidth={1}
        borderTopColor={colors.border}
        backgroundColor={colors.bgPrimary}
        gap={8}
        alignItems="flex-end"
      >
        <Input
          flex={1}
          size="$4"
          placeholder="Parle à ton PM..."
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!sending}
          backgroundColor={colors.bgInput}
          borderColor={colors.borderInput}
          color={colors.textPrimary}
          placeholderTextColor={colors.textDisabled}
          borderRadius={24}
          maxHeight={100}
          focusStyle={{ borderColor: colors.accentBorder }}
        />
        <Button
          size="$3"
          circular
          backgroundColor={colors.accent}
          opacity={!input.trim() || sending ? 0.35 : 1}
          disabled={!input.trim() || sending}
          onPress={handleSend}
          pressStyle={{ scale: 0.9 }}
        >
          <Text color="#fff" fontSize={16} fontWeight="700">↑</Text>
        </Button>
      </XStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageList: { padding: 16, paddingBottom: 8 },
  bubbleWrap: { flexDirection: "row", marginBottom: 12, gap: 8 },
  bubbleWrapUser: { justifyContent: "flex-end" },
  bubbleWrapAi: { justifyContent: "flex-start" },
});
