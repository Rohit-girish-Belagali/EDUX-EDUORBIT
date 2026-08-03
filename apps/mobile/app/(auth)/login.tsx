import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { login } from "@eduorbit/api-client";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.ok) {
        router.replace("/(tabs)");
      } else {
        setError(result.error ?? "Login failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-6 gap-4">
        <Text className="text-3xl font-bold text-foreground text-center mb-2">
          EduOrbit
        </Text>
        <Text className="text-muted-foreground text-center mb-6">
          Sign in to your account
        </Text>

        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-foreground"
          placeholder="Username"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          className="bg-card border border-border rounded-xl px-4 py-3 text-foreground"
          placeholder="Password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
        />

        {error && (
          <Text className="text-destructive text-sm text-center">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center mt-2"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-primary-foreground font-semibold text-base">Sign In</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/register" className="text-center text-primary mt-2">
          Don't have an account? Sign up
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
