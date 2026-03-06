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
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { Mic, X, Check } from "lucide-react-native";
import { chatWithPM, transcribeAudioFull } from "../api";
import { loadMessages, saveMessage, updateProject } from "../storage";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { radius, spacing } from "../theme";
import { useTheme } from "../contexts/ThemeContext";

const CHAT_AUTO_SEND_KEY = "chat_auto_send_dispatch";
const CHAT_CONVERSATION_MODE_KEY = "chat_conversation_mode";

function MessageBubble({ msg, index, onApplyActions, onIgnoreActions, onSpeak }) {
  const { colors: c } = useTheme();
  const isUser = msg.role === "user";
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  const hasPending = msg.pendingUpdates && Object.keys(msg.pendingUpdates).length > 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: Platform.OS !== "web" }),
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
        <View style={styles.bubbleContentRow}>
          <Text style={[styles.bubbleText, { color: c.textPrimary }, isUser && styles.bubbleTextUser]}>
            {msg.content}
          </Text>
          {isUser && msg.isDictated && (
            <Text style={styles.dictatedIcon}>🎙️</Text>
          )}
          {!isUser && msg.content && Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={() => onSpeak?.(msg.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.speakBtn}
            >
              <Text style={[styles.speakIcon, { color: c.accentLight }]}>🔊</Text>
            </TouchableOpacity>
          )}
        </View>
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

function WaveformBars() {
  const bars = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    const animate = () => {
      const anims = bars.map((v) =>
        Animated.sequence([
          Animated.timing(v, {
            toValue: 0.4 + Math.random() * 0.6,
            duration: 120 + Math.random() * 80,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(v, {
            toValue: 0.4,
            duration: 120 + Math.random() * 80,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      Animated.parallel(anims).start(() => animate());
    };
    animate();
  }, []);

  return (
    <View style={styles.waveformRow}>
      {bars.map((v, i) => (
        <Animated.View key={i} style={[styles.waveformBar, { opacity: v }]} />
      ))}
    </View>
  );
}

function RecordingPulse() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start(() => loop());
    };
    loop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.recordingDot,
        {
          transform: [{ scale: pulse }],
        },
      ]}
    />
  );
}

export default function ChatView({ project, onProjectUpdate }) {
  const { colors: c } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [autoSendDispatch, setAutoSendDispatch] = useState(false);
  const [pendingTranscribe, setPendingTranscribe] = useState(false);
  const flatListRef = useRef(null);
  const sendScale = useRef(new Animated.Value(1)).current;
  const micPressed = useRef(false);

  const { isRecording, duration, audioUri, audioBlob, startRecording, stopRecording, resetRecording } =
    useAudioRecorder(() => {});

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(CHAT_AUTO_SEND_KEY).then((v) => setAutoSendDispatch(v === "true"));
      AsyncStorage.getItem(CHAT_CONVERSATION_MODE_KEY).then((v) => setConversationMode(v === "true"));
    }, [])
  );

  useEffect(() => {
    if (isRecording) setRecording(true);
    else if (!transcribing) setRecording(false);
  }, [isRecording, transcribing]);

  const doSend = useCallback(
    async (text, isDictated = false) => {
      if (!text?.trim() || sending) return;

      const userMsg = {
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
        hasUpdates: false,
        isDictated: !!isDictated,
      };
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
          text.trim()
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

        if (conversationMode) {
          setTimeout(async () => {
            setRecording(true);
            try {
              await startRecording();
            } catch (e) {
              setRecording(false);
            }
          }, 800);
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
    },
    [messages, project, sending, conversationMode, startRecording]
  );

  useEffect(() => {
    if (!pendingTranscribe || (!audioUri && !audioBlob) || isRecording) return;
    setPendingTranscribe(false);
    let cancelled = false;
    setTranscribing(true);
    (async () => {
      try {
        const transcript = await transcribeAudioFull(audioUri, audioBlob);
        if (cancelled) return;
        resetRecording();
        setRecording(false);
        micPressed.current = false;
        if (transcript?.trim()) {
          setInput(transcript.trim());
          if (autoSendDispatch) {
            doSend(transcript.trim(), true);
          }
        }
      } catch (err) {
        if (!cancelled) setInput(`[Erreur transcription: ${err.message}]`);
      } finally {
        if (!cancelled) setTranscribing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pendingTranscribe, audioUri, audioBlob, isRecording, autoSendDispatch, resetRecording, doSend]);

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

  const handleSpeak = useCallback((text) => {
    if (Platform.OS === "web") return;
    Speech.speak(text, { language: "fr-FR", rate: 0.9 });
  }, []);

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

  const handleSend = useCallback(() => {
    doSend(input, false);
  }, [input, doSend]);

  const handleMicPress = useCallback(async () => {
    if (sending || transcribing) return;
    if (isRecording) {
      await stopRecording();
    } else {
      micPressed.current = true;
      setRecording(true);
      await startRecording();
    }
  }, [sending, transcribing, isRecording, startRecording, stopRecording]);

  const handleCancelRecording = useCallback(async () => {
    if (isRecording) await stopRecording();
    resetRecording();
    setRecording(false);
    micPressed.current = false;
  }, [isRecording, stopRecording, resetRecording]);

  const handleValidateRecording = useCallback(async () => {
    if (isRecording) {
      setPendingTranscribe(true);
      await stopRecording();
      return;
    }
    if (!audioUri && !audioBlob) return;
    setTranscribing(true);
    try {
      const transcript = await transcribeAudioFull(audioUri, audioBlob);
      resetRecording();
      setRecording(false);
      micPressed.current = false;

      if (transcript?.trim()) {
        setInput(transcript.trim());
        if (autoSendDispatch) {
          doSend(transcript.trim(), true);
        }
      }
    } catch (err) {
      setInput(`[Erreur transcription: ${err.message}]`);
    } finally {
      setTranscribing(false);
    }
  }, [isRecording, audioUri, audioBlob, autoSendDispatch, resetRecording, stopRecording, doSend]);

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const toggleConversationMode = useCallback(() => {
    const next = !conversationMode;
    setConversationMode(next);
    AsyncStorage.setItem(CHAT_CONVERSATION_MODE_KEY, next ? "true" : "false");
  }, [conversationMode]);

  const showRecordingBar = recording && (isRecording || transcribing);

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
            onSpeak={handleSpeak}
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
                  {["Ajoute une feature", "Change les priorités", "Lean Canvas", "Estime le budget", "Quel est le prochain step ?"].map((s, i) => (
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
        {showRecordingBar ? (
          <View style={styles.recordingBarWrap}>
            <View style={[styles.recordingBar, { backgroundColor: "rgba(124,58,237,0.15)" }]}>
              <TouchableOpacity onPress={handleCancelRecording} style={styles.recordingCancelBtn}>
              <X color="#EF4444" size={20} />
            </TouchableOpacity>
            <View style={styles.recordingCenter}>
              <View style={styles.recordingIndicatorRow}>
                <RecordingPulse />
                <Text style={styles.recordingText}>Écoute...</Text>
              </View>
              <WaveformBars />
              <Text style={[styles.recordingTimer, { color: c.textPrimary }]}>
                {transcribing ? "Transcription..." : formatDuration(duration)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleValidateRecording}
              disabled={transcribing}
              style={[styles.recordingValidateBtn, transcribing && { opacity: 0.5 }]}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Check color="#fff" size={22} />
              )}
            </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={toggleConversationMode}
              style={[styles.conversationToggle, conversationMode && { backgroundColor: "rgba(124,58,237,0.3)" }]}
            >
              <Text style={[styles.conversationToggleText, { color: c.textPrimary }]}>🔄 Mode conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleMicPress}
              activeOpacity={0.7}
              style={[
                styles.micBtn,
                { borderColor: "rgba(124,58,237,0.3)" },
              ]}
            >
              <Mic color="#7C3AED" size={18} />
            </TouchableOpacity>
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
          </>
        )}
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
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAi: { borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleContentRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bubbleText: { fontSize: 14, lineHeight: 21, flex: 1 },
  bubbleTextUser: { color: "#fff" },
  dictatedIcon: { fontSize: 14 },
  speakBtn: { marginTop: 6 },
  speakIcon: { fontSize: 16 },
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
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
  recordingBarWrap: { flex: 1, gap: 8 },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.xxl,
    gap: 12,
  },
  recordingCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  recordingCenter: { flex: 1, alignItems: "center" },
  recordingIndicatorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recordingText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  waveformRow: { flexDirection: "row", alignItems: "center", gap: 4, height: 24 },
  waveformBar: {
    width: 4,
    height: 16,
    backgroundColor: "rgba(124,58,237,0.6)",
    borderRadius: 2,
  },
  recordingTimer: { fontSize: 12, marginTop: 4, fontVariant: ["tabular-nums"] },
  recordingValidateBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  conversationToggle: {
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  conversationToggleText: { fontSize: 12, fontWeight: "500" },
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
  suggestionsRow: { gap: 8, paddingRight: 20 },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: "500" },
});
