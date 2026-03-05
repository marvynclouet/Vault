import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { chatWithPM } from "../api";
import { loadMessages, saveMessage, updateProject } from "../storage";
import { radius, spacing } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

function MessageBubble({ msg, index, onApplyActions, onIgnoreActions }) {
  const { colors: c } = useTheme();
  const isUser = msg.role === "user";
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const hasPending = msg.pendingUpdates && Object.keys(msg.pendingUpdates).length > 0;

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
        {msg.hasUpdates && !hasPending && (
          <View style={[styles.updateBadge, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
            <Text style={[styles.updateText, { color: c.success }]}>✅ Projet mis à jour</Text>
          </View>
        )}
        {hasPending && (
          <View style={[styles.actionsCard, { borderColor: c.accentBorder }]}>
            <Text style={[styles.actionsTitle, { color: c.accentLight }]}>Changements proposés</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => onApplyActions?.(index)}
                style={[styles.actionBtn, { backgroundColor: c.accent }]}
              >
                <Text style={styles.actionBtnText}>Appliquer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onIgnoreActions?.(index)}
                style={[styles.actionBtn, { borderColor: c.border }]}
              >
                <Text style={[styles.actionBtnText, { color: c.textSecondary }]}>Ignorer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// Bar 72px + cercle micro 64px positionné bottom:28 → haut du cercle ~92px du bas
const TAB_BAR_HEIGHT = 110;

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const run = () => {
      Animated.stagger(150, [
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]).start(() => run());
      });
    };
    run();
  }, []);

  return (
    <View style={{ flexDirection: "row" }}>
      <Animated.Text style={[styles.typingDot, { opacity: dot1 }]}>.</Animated.Text>
      <Animated.Text style={[styles.typingDot, { opacity: dot2 }]}>.</Animated.Text>
      <Animated.Text style={[styles.typingDot, { opacity: dot3 }]}>.</Animated.Text>
    </View>
  );
}

export default function ChatView({ project, onProjectUpdate }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
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

  const handleApplyActions = useCallback(
    async (index) => {
      const msg = messages[index];
      if (!msg?.pendingUpdates) return;
      const updates = {};
      if (msg.pendingUpdates.summary) updates.summary = msg.pendingUpdates.summary;
      if (msg.pendingUpdates.tasks) updates.tasks = msg.pendingUpdates.tasks;
      if (Object.keys(updates).length > 0) {
        await updateProject(project.id, updates);
        onProjectUpdate?.(updates);
        setMessages((prev) =>
          prev.map((m, i) => (i === index ? { ...m, pendingUpdates: null, hasUpdates: true } : m))
        );
      }
    },
    [messages, project.id, onProjectUpdate]
  );

  const handleIgnoreActions = useCallback(
    (index) => {
      setMessages((prev) =>
        prev.map((m, i) => (i === index ? { ...m, pendingUpdates: null } : m))
      );
    },
    []
  );

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
        hasUpdates: false,
        pendingUpdates: result.project_updates || null,
      };
      setMessages((prev) => [...prev, aiMsg]);
      await saveMessage(project.id, { ...aiMsg, pendingUpdates: undefined });
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
        renderItem={({ item, index }) => (
          <MessageBubble
            msg={item}
            index={index}
            onApplyActions={() => handleApplyActions(index)}
            onIgnoreActions={() => handleIgnoreActions(index)}
          />
        )}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          <>
            {sending && (
              <View style={[styles.typingWrap, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                <View style={styles.typingRow}>
                  <Text style={[styles.typingText, { color: c.textSecondary }]}>PM écrit</Text>
                  <TypingDots />
                </View>
              </View>
            )}
            {messages.length === 1 && !sending ? (
              <View style={styles.suggestionsWrap}>
                <Text style={[styles.suggestionsLabel, { color: c.textMuted }]}>Suggestions</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
                  {["Ajoute une feature", "Change les priorités", "Génère le Lean Canvas", "Estime le budget"].map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setInput(s)}
                      activeOpacity={0.7}
                      style={[styles.suggestionChip, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: c.border }]}
                    >
                      <Text style={[styles.suggestionText, { color: c.textSecondary }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        }
      />

      <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bgPrimary, paddingBottom: Math.max(insets.bottom, 16) + TAB_BAR_HEIGHT }]}>
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
  actionsCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionsTitle: { fontSize: 12, fontWeight: "600", marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: spacing.md,
    paddingBottom: 24,
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
  typingWrap: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: 12,
  },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  typingText: { fontSize: 14 },
  typingDot: { fontSize: 14, fontWeight: "700" },
  suggestionsWrap: { marginTop: 16, marginBottom: 8 },
  suggestionsLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase" },
  suggestionsRow: { gap: 8, paddingRight: spacing.lg },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: "500" },
});
