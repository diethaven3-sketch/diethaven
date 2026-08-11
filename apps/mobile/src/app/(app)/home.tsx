import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, logout } = useAuth();

  const onLogout = async () => {
    await logout();
    router.replace("/(auth)/welcome");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-primary px-6 py-4">
        <Text className="font-heading-bold text-lg text-white">DietHaven Consult</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onLogout}
          className="p-1"
        >
          <LogOut size={20} color="white" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="font-heading-bold text-2xl text-heading">Welcome, {user?.email}</Text>
        <Text className="text-center font-body text-sm text-body">
          Your profile, linked dietitian, and progress trend are coming next.
        </Text>
      </View>
    </SafeAreaView>
  );
}
