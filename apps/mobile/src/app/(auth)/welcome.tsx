import { Link } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 justify-between px-6 py-10">
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="font-heading-bold text-3xl text-heading">DietHaven Consult</Text>
          <Text className="font-body text-base text-body">Your Food, Your Medicine</Text>
        </View>

        <View className="gap-3">
          <Link href="/(auth)/login" asChild>
            <Button variant="primary">Log in</Button>
          </Link>
          <Link href="/(auth)/register" asChild>
            <Button variant="outline">Create an account</Button>
          </Link>
          <Link href="/(auth)/accept-invite" asChild>
            <Button variant="ghost">I have an invite from my dietitian</Button>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
