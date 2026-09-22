import { Link } from "expo-router";
import { Leaf, ShieldCheck } from "lucide-react-native";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@repo/ui-tokens";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  return (
    <View className="flex-1 bg-primary">
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-white/15">
            <Leaf size={40} color="white" />
          </View>
          <View className="items-center gap-2">
            <Text className="font-heading-bold text-3xl text-white">DietHaven</Text>
            <Text className="font-body text-base text-white/85">Your Food, Your Medicine.</Text>
          </View>
        </View>

        <View className="gap-4 rounded-t-[28px] bg-surface px-6 pb-6 pt-8">
          <Text className="text-center font-heading-bold text-xl text-heading">
            Track your care plan, one meal at a time
          </Text>
          <Text className="text-center font-body text-sm leading-5 text-muted">
            Log meals, see your progress, and stay connected to the dietitian managing your care.
          </Text>

          <Link href="/(auth)/register" asChild>
            <Button variant="primary">Create an account</Button>
          </Link>
          <Link href="/(auth)/otp-login" asChild>
            <Button variant="outline">I already have an account</Button>
          </Link>

          <View className="flex-row items-start gap-1.5 px-1">
            <ShieldCheck size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
            <Text className="flex-1 font-body text-[11px] leading-4 text-muted">
              By continuing you agree to data handling under NDPA 2023
            </Text>
          </View>

          <View className="flex-row justify-center gap-4">
            <Link href="/(auth)/login" className="font-body-medium text-xs text-primary">
              Log in with password
            </Link>
            <Link href="/(auth)/accept-invite" className="font-body-medium text-xs text-primary">
              I have an invite
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
