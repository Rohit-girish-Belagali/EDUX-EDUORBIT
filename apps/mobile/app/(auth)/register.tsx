import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { register } from "@eduorbit/api-client";

export default function RegisterScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const result = await register(username.trim(), password);
      if (result.ok) {
        router.replace("/(tabs)");
      } else {
        setError(result.error ?? "Registration failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
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
          Create your account
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
          onSubmitEditing={handleRegister}
        />

        {error && (
          <Text className="text-destructive text-sm text-center">{error}</Text>
        )}

        <TouchableOpacity
          className="bg-primary rounded-xl py-3 items-center mt-2"
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-primary-foreground font-semibold text-base">Create Account</Text>
          }
        </TouchableOpacity>

        <Link href="/(auth)/login" className="text-center text-primary mt-2">
          Already have an account? Sign in
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
