import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CurvedBottomBarExpo } from "react-native-curved-bottom-bar";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { LinearGradient } from "expo-linear-gradient";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import AuthScreen from "./src/screens/AuthScreen";
import DictateScreen from "./src/screens/DictateScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import ProjectDetailScreen from "./src/screens/ProjectDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const ProjectStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const stackHeader = (c) => ({
  headerShown: true,
  headerTitle: "",
  headerBackTitle: "Retour",
  headerStyle: { backgroundColor: c.bgPrimary },
  headerTintColor: c.accentLight,
  headerShadowVisible: false,
});

function ProjectsNav() {
  const { colors: c } = useTheme();
  return (
    <ProjectStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bgPrimary } }}
    >
      <ProjectStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectStack.Screen name="ProjectDetail" component={ProjectDetailScreen} options={stackHeader(c)} />
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

function TabIcon({ routeName, focused }) {
  const { colors: c } = useTheme();
  const config = {
    Projets: { icon: "📁", label: "Projets" },
    Réglages: { icon: "⚙️", label: "Config" },
  };
  const cfg = config[routeName] || { icon: "?", label: routeName };

  return (
    <View style={styles.tabItem}>
      <MotiView
        animate={{ scale: focused ? 1.2 : 1, translateY: focused ? -2 : 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
      >
        <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
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

  return (
    <CurvedBottomBarExpo.Navigator
      type="DOWN"
      style={[styles.bottomBar, { borderTopColor: c.border }]}
      shadowStyle={styles.shadow}
      height={65}
      circleWidth={56}
      bgColor={isDark ? "rgba(18,18,32,0.97)" : "rgba(255,255,255,0.97)"}
      initialRouteName="Dicter"
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
                colors={isActive ? [c.accent, "#6D28D9"] : ["rgba(124,58,237,0.3)", "rgba(109,40,217,0.3)"]}
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
          <TabIcon routeName={routeName} focused={routeName === selectedTab} />
        </TouchableOpacity>
      )}
    >
      <CurvedBottomBarExpo.Screen name="Projets" component={ProjectsNav} position="LEFT" />
      <CurvedBottomBarExpo.Screen name="Dicter" component={DictateScreen} position="CIRCLE" />
      <CurvedBottomBarExpo.Screen name="Réglages" component={SettingsNav} position="RIGHT" />
    </CurvedBottomBarExpo.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors: c, isDark } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: c.bgPrimary }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? <MainApp /> : <AuthScreen />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  bottomBar: { borderTopWidth: 1 },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  circleWrap: { alignItems: "center", justifyContent: "center", bottom: 28 },
  circleBtn: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  circleIcon: { fontSize: 26 },
  tabTouch: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabItem: { alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: "600" },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
});
