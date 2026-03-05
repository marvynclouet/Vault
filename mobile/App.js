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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import DictateScreen from "./src/screens/DictateScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import ProjectDetailScreen from "./src/screens/ProjectDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";

const ProjectStack = createNativeStackNavigator();

function ProjectsNav() {
  return (
    <ProjectStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
      }}
    >
      <ProjectStack.Screen name="ProjectsList" component={ProjectsScreen} />
      <ProjectStack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Retour",
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTintColor: colors.accentLight,
          headerShadowVisible: false,
        }}
      />
    </ProjectStack.Navigator>
  );
}

function TabIcon({ routeName, focused }) {
  const config = {
    Projets: { icon: "📁", label: "Projets" },
    Réglages: { icon: "⚙️", label: "Config" },
  };
  const c = config[routeName] || { icon: "?", label: routeName };

  return (
    <View style={styles.tabItem}>
      <Text style={{ fontSize: 20 }}>{c.icon}</Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.accentLight : colors.textDisabled },
        ]}
      >
        {c.label}
      </Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

function MainApp() {
  return (
    <CurvedBottomBarExpo.Navigator
      type="DOWN"
      style={styles.bottomBar}
      shadowStyle={styles.shadow}
      height={65}
      circleWidth={56}
      bgColor="rgba(18,18,32,0.97)"
      initialRouteName="Dicter"
      borderTopLeftRight
      screenOptions={{ headerShown: false }}
      renderCircle={({ selectedTab, navigate }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigate("Dicter")}
          style={styles.circleWrap}
        >
          <LinearGradient
            colors={
              selectedTab === "Dicter"
                ? [colors.accent, "#6D28D9"]
                : ["rgba(124,58,237,0.3)", "rgba(109,40,217,0.3)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.circleBtn}
          >
            <Text style={styles.circleIcon}>🎙️</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
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
      <CurvedBottomBarExpo.Screen name="Réglages" component={SettingsScreen} position="RIGHT" />
    </CurvedBottomBarExpo.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return user ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    borderTopColor: "rgba(255,255,255,0.06)",
    borderTopWidth: 1,
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
    bottom: 28,
  },
  circleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  circleIcon: {
    fontSize: 26,
  },
  tabTouch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    alignItems: "center",
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentLight,
    marginTop: 2,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bgPrimary,
  },
});
