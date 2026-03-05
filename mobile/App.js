import { useRef, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Animated, StyleSheet, Platform } from "react-native";
import { TamaguiProvider, Theme } from "tamagui";

import tamaguiConfig from "./src/lib/tamagui.config";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import DictateScreen from "./src/screens/DictateScreen";
import ProjectsScreen from "./src/screens/ProjectsScreen";
import ProjectDetailScreen from "./src/screens/ProjectDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();
const ProjectStack = createNativeStackNavigator();

const TAB_LABELS = { Projets: "Projets", Dicter: "Dicter", "Réglages": "Config" };

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

function FloatingTabIcon({ label, focused }) {
  const icons = { Dicter: "🎙️", Projets: "📁", "Réglages": "⚙️" };
  const shortLabel = TAB_LABELS[label] || label;
  const widthAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      speed: 14,
      bounciness: 4,
    }).start();
  }, [focused]);

  const isDictate = label === "Dicter";

  const bgColor = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      "rgba(124,58,237,0)",
      isDictate ? colors.accent : "rgba(124,58,237,0.18)",
    ],
  });

  const labelOpacity = widthAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <Animated.View style={[tabStyles.iconWrap, { backgroundColor: bgColor }]}>
      <Text style={{ fontSize: isDictate ? 22 : 18 }}>{icons[label]}</Text>
      {focused && (
        <Animated.Text
          numberOfLines={1}
          style={[
            tabStyles.activeLabel,
            { opacity: labelOpacity, color: isDictate ? "#fff" : colors.accentLight },
          ]}
        >
          {shortLabel}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
    maxWidth: 120,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
});

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 28 : 16,
          left: 32,
          right: 32,
          height: 62,
          backgroundColor: "rgba(18,18,32,0.96)",
          borderRadius: 31,
          borderTopWidth: 0,
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          paddingHorizontal: 4,
          paddingBottom: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 24,
        },
        tabBarIcon: ({ focused }) => (
          <FloatingTabIcon label={route.name} focused={focused} />
        ),
      })}
      initialRouteName="Dicter"
    >
      <Tab.Screen name="Projets" component={ProjectsNav} />
      <Tab.Screen name="Dicter" component={DictateScreen} />
      <Tab.Screen name="Réglages" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bgPrimary }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return user ? <MainApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Theme name="dark_vault">
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </Theme>
    </TamaguiProvider>
  );
}
