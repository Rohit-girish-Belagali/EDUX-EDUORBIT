import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  ScrollView, Alert, SafeAreaView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "react-native";
import { logout, fetchAuthStatus } from "@eduorbit/api-client";
import { clearToken } from "../../lib/secure-store";
import { getStoredApiUrl, setStoredApiUrl, DEFAULT_API_URL } from "../../lib/settings-store";
import { setApiBase } from "@eduorbit/api-client";

export default function SettingsTab() {
  const scheme = useColorScheme();
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiUrlDraft, setApiUrlDraft] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);
  const [userInfo, setUserInfo] = useState<{ username?: string; role?: string } | null>(null);

  const loadSettings = useCallback(async () => {
    const [url, status] = await Promise.all([
      getStoredApiUrl(),
      fetchAuthStatus().catch(() => null),
    ]);
    setApiUrl(url);
    setApiUrlDraft(url);
    if (status?.authenticated) {
      setUserInfo({ username: status.username, role: status.role });
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  async function handleSaveUrl() {
    const trimmed = apiUrlDraft.trim().replace(/\/+$/, "");
    if (!trimmed) return;
    setSavingUrl(true);
    try {
      await setStoredApiUrl(trimmed);
      setApiBase(trimmed);
      setApiUrl(trimmed);
      Alert.alert("Saved", "API URL updated. Restart the app for full effect.");
    } catch {
      Alert.alert("Error", "Failed to save API URL");
    } finally {
      setSavingUrl(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try { await logout(); } catch { /* ignore */ }
          await clearToken();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View className="flex-row items-center justify-between py-3 border-b border-border">
        <Text className="text-foreground font-medium">{label}</Text>
        {children}
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View className="mb-6">
        <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-2 px-1">{title}</Text>
        <View className="bg-card border border-border rounded-2xl px-4">{children}</View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 border-b border-border">
        <Text className="text-foreground text-xl font-bold">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Account */}
        <Section title="Account">
          {userInfo
            ? <>
                <SettingRow label="Username">
                  <Text className="text-muted-foreground">{userInfo.username}</Text>
                </SettingRow>
                <SettingRow label="Role">
                  <Text className="text-muted-foreground capitalize">{userInfo.role ?? "user"}</Text>
                </SettingRow>
              </>
            : <SettingRow label="Status">
                <Text className="text-muted-foreground">Not signed in</Text>
              </SettingRow>
          }
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow label="Color scheme">
            <Text className="text-muted-foreground capitalize">{scheme ?? "system"}</Text>
          </SettingRow>
        </Section>

        {/* Connection */}
        <Section title="Connection">
          <View className="py-3">
            <Text className="text-foreground font-medium mb-2">API Server URL</Text>
            <TextInput
              className="bg-background border border-border rounded-xl px-3 py-2 text-foreground text-sm mb-2"
              placeholder="http://192.168.x.x:1716"
              placeholderTextColor="#9ca3af"
              value={apiUrlDraft}
              onChangeText={setApiUrlDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Text className="text-muted-foreground text-xs mb-2">
              Current: {apiUrl}
            </Text>
            <TouchableOpacity
              onPress={handleSaveUrl}
              disabled={savingUrl || apiUrlDraft.trim() === apiUrl}
              className={`py-2 rounded-xl items-center ${apiUrlDraft.trim() !== apiUrl ? "bg-primary" : "bg-muted"}`}
            >
              {savingUrl ? <ActivityIndicator color="#fff" /> : <Text className={apiUrlDraft.trim() !== apiUrl ? "text-primary-foreground font-medium" : "text-muted-foreground"}>Save URL</Text>}
            </TouchableOpacity>
          </View>
        </Section>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-destructive/10 border border-destructive/30 rounded-2xl py-3 items-center"
        >
          <Text className="text-destructive font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
