import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { ThemeProviderCustom, useThemeCustom } from "@/theme/provider";
import { TabRoomProvider } from "@/contexts/TabRoomContext";
import "react-native-reanimated";
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '@/components/SplashScreen';

function RootLayoutNav() {
const { isDark } = useThemeCustom();
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [showSplash, setShowSplash] = useState(true);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
    const initializeApp = async () => {
      // Auto-login disabled - always start at login screen
      // Clear any saved tokens to ensure fresh login
      await AsyncStorage.multiRemove(['authToken', 'user_data', 'auth_token', 'device_id']);
      setIsLoggedIn(false);
      setIsLoading(false);

setTimeout(() => {  
    setShowSplash(false);  
  }, 2500);  
};  
initializeApp();

}, []);

if (showSplash || isLoading) {
return <SplashScreen />;
}

return (
<ThemeProvider value={isDark ? NavigationDarkTheme : NavigationDefaultTheme}>
<Stack
screenOptions={{
headerShown: false,
animation: "none",
}}
>
<Stack.Screen name="index" />
<Stack.Screen name="login" />
<Stack.Screen name="signup" />
<Stack.Screen name="privacy-policy" />
<Stack.Screen name="(tabs)" />
<Stack.Screen name="chatroom/[id]" />
<Stack.Screen name="transfer-credit" />
<Stack.Screen name="transfer-history" />
<Stack.Screen name="official-comment" />
<Stack.Screen name="edit-profile" />
<Stack.Screen name="settings" />
<Stack.Screen name="gift-store" />
<Stack.Screen name="leaderboard" />
<Stack.Screen name="people" />
<Stack.Screen name="+not-found" />
</Stack>
<StatusBar style={isDark ? "light" : "dark"} />
</ThemeProvider>
);
}

export default function RootLayout() {
const [loaded] = useFonts({
SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
});

if (!loaded) return null;

return (
<GestureHandlerRootView style={{ flex: 1 }}>
<SafeAreaProvider>
<ThemeProviderCustom>
<TabRoomProvider>
<RootLayoutNav />
</TabRoomProvider>
</ThemeProviderCustom>
</SafeAreaProvider>
</GestureHandlerRootView>
);
}