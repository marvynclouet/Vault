import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { chatWithPM } from "../api";
import { loadMessages, saveMessage, updateProject } from "../storage";
import { radius, spacing } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

function MessageBubble({ msg, index }) {
  const { colors: c } = useTheme();
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
        <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
          <Text style={[styles.avatarText, { color: c.accentLight }]}>PM</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: c.accent }]
            : [styles.bubbleAi, { backgroundColor: c.bgInput, borderColor: c.border }],
        ]}
      >
        <Text style={[styles.bubbleText, { color: c.textPrimary }, isUser && styles.bubbleTextUser]}>
          {msg.content}
        </Text>
        {msg.hasUpdates && (
          <View style={[styles.updateBadge, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
            <Text style={[styles.updateText, { color: c.success }]}>✅ Projet mis à jour</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function ChatView({ project, onProjectUpdate }) {
  const { colors: c } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const sendScale = useRef(new Animated.Value(1)).current;

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
        renderItem={({ item, index }) => <MessageBubble msg={item} index={index} />}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bgPrimary }]}>
        <TextInput
          style={[styles.input, { backgroundColor: c.bgInput, borderColor: c.borderInput, color: c.textPrimary }]}
          placeholder="Parle à ton PM..."
          placeholderTextColor={c.textDisabled}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <TouchableOpacity
            onPress={handleSend}
            onPressIn={() => Animated.spring(sendScale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start()}
            onPressOut={() => Animated.spring(sendScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
            disabled={!input.trim() || sending}
            activeOpacity={1}
            style={[styles.sendBtn, { backgroundColor: c.accent }, (!input.trim() || sending) && styles.sendBtnDisabled]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageList: { padding: spacing.lg, paddingBottom: 8 },
  bubbleWrap: { flexDirection: "row", marginBottom: 12, gap: 8 },
  bubbleWrapUser: { justifyContent: "flex-end" },
  bubbleWrapAi: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  avatarText: { fontSize: 9, fontWeight: "700" },
  bubble: { maxWidth: "80%", padding: 14, borderRadius: radius.xl },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: "#fff" },
  updateBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.tab,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  updateText: { fontSize: 11, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.xxl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
