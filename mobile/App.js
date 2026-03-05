import { NavigationContainer } from "@react-navigation/native";
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
import { LinearGradient } from "expo-linear-gradient";

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
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile().then(setProfile).catch(() => {});
  }, []);

  return (
    <CurvedBottomBarExpo.Navigator
      type="DOWN"
      style={[styles.bottomBar, { borderTopColor: c.tabBarBorder || c.border }]}
      shadowStyle={styles.shadow}
      height={72}
      circleWidth={64}
      bgColor={isDark ? "#0F0F1A" : "#F8F7FC"}
      initialRouteName="Accueil"
      borderTopLeftRight
      screenOptions={{ headerShown: false }}
      renderCircle={({ selectedTab, navigate }) => {
        const isActive = selectedTab === "Dicter";
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigate("Dicter")}
            style={styles.circleWrap}
          >
            <MotiView
              animate={{ scale: isActive ? 1.1 : 1, translateY: isActive ? -4 : 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 200 }}
            >
              <LinearGradient
                colors={isActive ? [c.accent, "#A855F7"] : ["rgba(124,58,237,0.3)", "rgba(168,85,247,0.3)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.circleBtn}
              >
                <Text style={styles.circleIcon}>🎙️</Text>
              </LinearGradient>
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
        <MainApp />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bottomBar: { borderTopWidth: 2 },
  shadow: Platform.OS === "web"
    ? { boxShadow: "0 -6px 16px rgba(0,0,0,0.5)" }
    : { elevation: 20 },
  circleWrap: { alignItems: "center", justifyContent: "center", bottom: 28 },
  circleBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 20px rgba(124,58,237,0.4)" }
      : { elevation: 12 }),
  },
  circleIcon: { fontSize: 28 },
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
