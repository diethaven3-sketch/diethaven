import { Tabs } from "expo-router";
import { BookOpen, Home, LineChart, User } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondaryDark,
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontFamily: "NotoSans_500Medium", fontSize: 12 },
        tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#E5E7EB" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="diary"
        options={{ title: "Diary", tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: "Progress", tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }}
      />
    </Tabs>
  );
}
