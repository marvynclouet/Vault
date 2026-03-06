import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CurvedBottomBarExpo } from "react-native-curved-bottom-bar";
import { StatusBar } from "expo-status-bar";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { Mic } from "lucide-react-native";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { loadProfile } from "./src/storage";
import AuthScreen from "./src/screens/AuthScreen";
import DictateScreen from "./src/screens/DictateScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import ProjectDetailScreen from "./src/screens/ProjectDetailScreen";
import UpdateProjectScreen from "./src/screens/UpdateProjectScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ExploreScreen from "./src/screens/ExploreScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import { QuickDictateProvider, useQuickDictate } from "./src/contexts/QuickDictateContext";
import QuickDictateSheet from "./src/components/QuickDictateSheet";

const navigationRef = createNavigationContainerRef();

const ProjectStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const stackHeader = (c) => ({
  headerShown: true,
  headerTitle: "",
  headerBackTitle: "Retour",
  headerBackVisible: true,
  headerLeft: undefined, // utilise le bouton Retour natif (flèche) uniquement
  headerRight: () => null, // pas de croix ni autre icône à droite
  headerStyle: { backgroundColor: c.bgPrimary },
  headerTintColor: c.accentLight,
  headerShadowVisible: false,
});

function ProjectsNav() {
  const { colors: c } = useTheme();
  return (
    <ProjectStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bgPrimary } }}
      initialRouteName="ProjectsList"
    >
      <ProjectStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectStack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={stackHeader(c)} />
      <ProjectStack.Screen name="UpdateProject" component={UpdateProjectScreen} options={stackHeader(c)} />
      <ProjectStack.Screen name="Profile" component={ProfileScreen} options={stackHeader(c)} />
    </ProjectStack.Navigator>
  );
}

function SettingsNav() {
  const { colors: c } = useTheme();
  return (
    <SettingsStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bgPrimary } }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen name="Profile" component={ProfileScreen} options={stackHeader(c)} />
    </SettingsStack.Navigator>
  );
}

function TabIcon({ routeName, focused, profile }) {
  const { colors: c } = useTheme();
  const config = {
    Accueil: { icon: "🏠", label: "Accueil" },
    Projets: { icon: "📁", label: "Projets" },
    Profil: {
      icon: profile?.avatar_url || (profile?.display_name?.[0] || profile?.username?.[0] || "👤"),
      label: "Profil",
      isAvatar: true,
    },
    Réglages: { icon: "⚙️", label: "Config" },
  };
  const cfg = config[routeName] || { icon: "?", label: routeName };

  return (
    <View style={styles.tabItem}>
      <MotiView
        animate={{ scale: focused ? 1.2 : 1, translateY: focused ? -2 : 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
        style={cfg.isAvatar && [styles.avatarIcon, { backgroundColor: c.accentBg }]}
      >
        <Text style={[styles.tabIconText, cfg.isAvatar && styles.avatarIconText]}>
          {cfg.icon || "👤"}
        </Text>
      </MotiView>
      <MotiView
        animate={{ opacity: focused ? 1 : 0.5, translateY: focused ? 0 : 4 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <Text style={[styles.tabLabel, { color: focused ? c.accentLight : c.textDisabled }]}>
          {cfg.label}
        </Text>
      </MotiView>
      <AnimatePresence>
        {focused && (
          <MotiView
            from={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 250 }}
            style={[styles.tabDot, { backgroundColor: c.accentLight }]}
          />
        )}
      </AnimatePresence>
    </View>
  );
}

function MainApp() {
  const { colors: c, isDark } = useTheme();
  const { open: openQuickDictate } = useQuickDictate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile().then(setProfile).catch(() => {});
  }, []);

  const handleNavigateToProject = (projectId) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("Projets", { screen: "ProjectDetail", params: { projectId } });
    }
  };

  return (
    <>
    <CurvedBottomBarExpo.Navigator
      type="DOWN"
      style={[styles.bottomBar, { borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}
      shadowStyle={styles.shadow}
      height={72}
      circleWidth={56}
      bgColor={isDark ? "#0C0C14" : "#F8F7FC"}
      initialRouteName="Accueil"
      borderTopLeftRight
      screenOptions={{ headerShown: false }}
      renderCircle={({ selectedTab, navigate }) => {
        const isActive = selectedTab === "Dicter";
        const tabBg = isDark ? "#0C0C14" : "#F8F7FC";
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openQuickDictate}
            style={styles.circleWrap}
          >
            <MotiView
              animate={{ scale: isActive ? 1.05 : 1, translateY: isActive ? -2 : 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 200 }}
              style={[styles.circleBtn, { borderColor: tabBg }]}
            >
              <Mic color="#FFFFFF" size={24} strokeWidth={2.5} />
            </MotiView>
          </TouchableOpacity>
        );
      }}
      tabBar={({ routeName, selectedTab, navigate }) => (
        <TouchableOpacity
          onPress={() => navigate(routeName)}
          activeOpacity={0.7}
          style={styles.tabTouch}
        >
          <TabIcon routeName={routeName} focused={routeName === selectedTab} profile={profile} />
        </TouchableOpacity>
      )}
    >
      <CurvedBottomBarExpo.Screen name="Accueil" component={HomeScreen} position="LEFT" />
      <CurvedBottomBarExpo.Screen name="Projets" component={ProjectsNav} position="LEFT" />
      <CurvedBottomBarExpo.Screen name="Dicter" component={DictateScreen} position="CIRCLE" />
      <CurvedBottomBarExpo.Screen name="Profil" component={ProfileScreen} position="RIGHT" />
      <CurvedBottomBarExpo.Screen name="Réglages" component={SettingsNav} position="RIGHT" />
    </CurvedBottomBarExpo.Navigator>
    <QuickDictateSheet onNavigateToProject={handleNavigateToProject} />
    </>
  );
}

const ONBOARDING_KEY = "onboarding_done";

function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors: c, isDark } = useTheme();
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => setOnboardingDone(v === "true"));
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const showOnboarding = user && onboardingDone === false;
  const showMainApp = user && onboardingDone === true;

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {!user ? (
        <AuthScreen />
      ) : onboardingDone === null ? (
        <View style={[styles.loadingScreen, { backgroundColor: c.bgPrimary }]}>
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      ) : showOnboarding ? (
        <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
      ) : (
        <QuickDictateProvider>
          <MainApp />
        </QuickDictateProvider>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const TAB_BAR_BG = "#0C0C14";

const styles = StyleSheet.create({
  bottomBar: { borderTopWidth: 1 },
  shadow: Platform.OS === "web"
    ? { boxShadow: "0 -4px 12px rgba(0,0,0,0.3)" }
    : { elevation: 12 },
  circleWrap: { alignItems: "center", justifyContent: "center", bottom: 28 },
  circleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7C3AED",
    borderWidth: 3,
    borderColor: TAB_BAR_BG,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }
      : Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 8,
          }
        : { elevation: 8 }),
  },
  tabTouch: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabItem: { alignItems: "center", gap: 3 },
  tabIconText: { fontSize: 20 },
  tabLabel: { fontSize: 10, fontWeight: "600" },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  avatarIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIconText: { fontSize: 14, fontWeight: "600" },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
});
