import "@/global.css";
import { useCallback, useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import { NotoSans_400Regular, NotoSans_500Medium } from "@expo-google-fonts/noto-sans";
import { AuthProvider } from "@/lib/auth-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    NotoSans_400Regular,
    NotoSans_500Medium,
  });

  const hideSplash = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    void hideSplash();
  }, [hideSplash]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
