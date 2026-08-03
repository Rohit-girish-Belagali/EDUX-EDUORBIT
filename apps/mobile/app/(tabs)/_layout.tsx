import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Platform, useColorScheme } from "react-native";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, darkColors } from "@eduorbit/ui-tokens";
import { configureApiClient, setApiBase } from "@eduorbit/api-client";
import { getToken, clearToken } from "../../lib/secure-store";
import { getStoredApiUrl } from "../../lib/settings-store";

const TAB_ICON: Record<string, { ios: any; android: keyof typeof Ionicons.glyphMap }> = {
  index:     { ios: "bubble.left.and.bubble.right", android: "chatbubble-outline" },
  space:     { ios: "square.grid.2x2",              android: "grid-outline" },
  knowledge: { ios: "books.vertical",               android: "library-outline" },
  notebook:  { ios: "note.text",                    android: "create-outline" },
  settings:  { ios: "gearshape",                    android: "settings-outline" },
};

function TabIcon({ tab, color, size }: { tab: string; color: string; size: number }) {
  if (Platform.OS === "ios") {
    return <SymbolView name={TAB_ICON[tab].ios} tintColor={color} size={size} />;
  }
  return <Ionicons name={TAB_ICON[tab].android} color={color} size={size} />;
}

export default function TabLayout() {
  const scheme = useColorScheme() ?? "light";
  const palette = scheme === "dark" ? darkColors : lightColors;

  useEffect(() => {
    getStoredApiUrl().then((url) => {
      setApiBase(url);
      configureApiClient({
        getToken,
        onUnauthorized: async () => { await clearToken(); },
      });
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.mutedForeground,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Chat", tabBarIcon: ({ color, size }) => <TabIcon tab="index" color={color} size={size} /> }} />
      <Tabs.Screen name="space" options={{ title: "Space", tabBarIcon: ({ color, size }) => <TabIcon tab="space" color={color} size={size} /> }} />
      <Tabs.Screen name="knowledge" options={{ title: "Knowledge", tabBarIcon: ({ color, size }) => <TabIcon tab="knowledge" color={color} size={size} /> }} />
      <Tabs.Screen name="notebook" options={{ title: "Notebook", tabBarIcon: ({ color, size }) => <TabIcon tab="notebook" color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color, size }) => <TabIcon tab="settings" color={color} size={size} /> }} />
    </Tabs>
  );
}
