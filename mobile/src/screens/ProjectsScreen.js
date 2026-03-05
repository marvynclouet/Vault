import { useState, useCallback, useRef, useEffect } from "react";
import { FlatList, Animated, StyleSheet } from "react-native";
import { YStack, XStack, Text, Card, Button } from "tamagui";
import { useFocusEffect } from "@react-navigation/native";
import { loadProjects, deleteProject } from "../storage";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";

const VERDICT = {
  go: { label: "GO 🟢", color: colors.success, bg: colors.successBg, border: colors.successBorder, band: colors.success },
  pivot: { label: "PIVOT 🟡", color: colors.warning, bg: colors.warningBg, border: colors.warningBorder, band: colors.warning },
  drop: { label: "DROP 🔴", color: colors.danger, bg: colors.dangerBg, border: colors.dangerBorder, band: colors.danger },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

function getRoles(tasks) {
  return [...new Set((tasks || []).map((t) => t.assignee_role))].slice(0, 3);
}

function StatsBar({ projects }) {
  const goCount = projects.filter((p) => p.review?.verdict === "go").length;
  const pivotCount = projects.filter((p) => p.review?.verdict === "pivot").length;
  const stats = [
    { value: projects.length, label: "Projets", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)" },
    { value: goCount, label: "GO 🟢", bg: colors.successBg, border: colors.successBorder },
    { value: pivotCount, label: "PIVOT 🟡", bg: colors.warningBg, border: colors.warningBorder },
  ];
  return (
    <XStack gap={8} paddingHorizontal={20} marginBottom="$3">
      {stats.map((s, i) => (
        <Card key={i} flex={1} backgroundColor={s.bg} borderColor={s.border} borderWidth={1} borderRadius={14} padding="$2.5" alignItems="center">
          <Text color={colors.textPrimary} fontSize={22} fontWeight="700">{s.value}</Text>
          <Text color={colors.textSecondary} fontSize={11} fontWeight="600" marginTop={2} letterSpacing={0.3}>
            {s.label}
          </Text>
        </Card>
      ))}
    </XStack>
  );
}

function ProjectCard({ item, index, onPress, onDelete }) {
  const v = VERDICT[item.review?.verdict] || VERDICT.go;
  const anim = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 70, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const roles = getRoles(item.tasks);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: slide }] }}>
      <Card
        backgroundColor="rgba(255,255,255,0.04)"
        borderColor={colors.border}
        borderWidth={1}
        borderRadius={20}
        overflow="hidden"
        marginBottom="$2.5"
        pressStyle={{ scale: 0.98, borderColor: colors.borderHover }}
        onPress={onPress}
      >
        <YStack height={4} width="100%" backgroundColor={v.band} />
        <YStack padding="$3.5" position="relative">
          <XStack justifyContent="space-between" alignItems="center" marginBottom={6}>
            <Text color={colors.textPrimary} fontSize={16} fontWeight="700" flex={1} marginRight={8} numberOfLines={1}>
              {item.project_name}
            </Text>
            <Text color={colors.textDisabled} fontSize={22}>›</Text>
          </XStack>

          <XStack alignItems="center" gap={10} marginBottom={8}>
            <YStack backgroundColor={v.bg} borderColor={v.border} borderWidth={1} borderRadius={8} paddingHorizontal={10} paddingVertical={4}>
              <Text color={v.color} fontSize={11} fontWeight="700">{v.label}</Text>
            </YStack>
            <Text color={colors.textDisabled} fontSize={12}>il y a {timeAgo(item.created_at)}</Text>
          </XStack>

          <Text color={colors.textSecondary} fontSize={13} lineHeight={19} marginBottom={12} numberOfLines={2}>
            {item.summary}
          </Text>

          <XStack flexWrap="wrap" gap={6} marginBottom={12}>
            <YStack backgroundColor="rgba(255,255,255,0.05)" borderColor={colors.border} borderWidth={1} borderRadius={8} paddingHorizontal={8} paddingVertical={4}>
              <Text color={colors.textSecondary} fontSize={11}>{item.tasks?.length || 0} tâches</Text>
            </YStack>
            {roles.map((role) => (
              <YStack key={role} backgroundColor="rgba(255,255,255,0.05)" borderColor={colors.border} borderWidth={1} borderRadius={8} paddingHorizontal={8} paddingVertical={4}>
                <Text color={colors.textSecondary} fontSize={11}>{role}</Text>
              </YStack>
            ))}
            {item.synced_to && (
              <YStack backgroundColor={colors.successBg} borderColor={colors.successBorder} borderWidth={1} borderRadius={8} paddingHorizontal={8} paddingVertical={4}>
                <Text color={colors.success} fontSize={11}>→ {item.synced_to}</Text>
              </YStack>
            )}
          </XStack>

          <YStack height={4} borderRadius={2} backgroundColor="rgba(255,255,255,0.06)" overflow="hidden">
            <YStack height="100%" borderRadius={2} backgroundColor={v.band} width={`${Math.min(100, Math.max(10, (item.tasks?.length || 1) * 15))}%`} />
          </YStack>

          <Button
            unstyled
            position="absolute"
            top={4}
            right={4}
            padding="$2"
            onPress={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Text color={colors.textMuted} fontSize={14}>✕</Text>
          </Button>
        </YStack>
      </Card>
    </Animated.View>
  );
}

export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProjects().then(setProjects).catch(console.error);
    }, [])
  );

  const handleDelete = async (id) => {
    await deleteProject(id);
    const updated = await loadProjects();
    setProjects(updated);
  };

  const initial = (user?.email || "?")[0].toUpperCase();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <XStack justifyContent="space-between" alignItems="center" paddingHorizontal={20} paddingTop={56} paddingBottom={12}>
        <Text color={colors.textPrimary} fontSize={28} fontWeight="700" letterSpacing={-0.5}>
          Mes projets
        </Text>
        <YStack width={32} height={32} borderRadius={16} backgroundColor={colors.accent} alignItems="center" justifyContent="center">
          <Text color="#fff" fontSize={14} fontWeight="700">{initial}</Text>
        </YStack>
      </XStack>

      <StatsBar projects={projects} />

      {projects.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal={28} marginTop={-20}>
          <YStack width={140} height={140} borderRadius={70} backgroundColor="rgba(124,58,237,0.1)" alignItems="center" justifyContent="center" marginBottom={24}>
            <Text fontSize={52}>🎙️</Text>
          </YStack>
          <Text color={colors.textPrimary} fontSize={22} fontWeight="700" marginBottom={8}>
            Lance ton premier projet
          </Text>
          <Text color={colors.textSecondary} fontSize={14} textAlign="center" lineHeight={21} marginBottom={28}>
            Décris ton idée à voix haute,{"\n"}l'IA crée ton plan d'action en 30 secondes.
          </Text>
          <Button
            size="$5"
            width="100%"
            height={56}
            backgroundColor={colors.accent}
            color="#fff"
            fontWeight="700"
            fontSize={16}
            borderRadius={18}
            pressStyle={{ scale: 0.97, opacity: 0.9 }}
            onPress={() => navigation.navigate("Dicter")}
            shadowColor={colors.accent}
            shadowOffset={{ width: 0, height: 6 }}
            shadowOpacity={0.35}
            shadowRadius={16}
          >
            🎙️ Dicter mon idée
          </Button>
          <Text color={colors.textMuted} fontSize={12} marginTop={16} textAlign="center">
            30 sec · 100% privé · Aucune carte bancaire
          </Text>
        </YStack>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ProjectCard
              item={item}
              index={index}
              onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  list: { padding: 20, paddingTop: 0, paddingBottom: 120 },
});
