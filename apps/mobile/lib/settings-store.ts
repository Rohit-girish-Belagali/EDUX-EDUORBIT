import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL_KEY = "api_base_url";

export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1716";

export async function getStoredApiUrl(): Promise<string> {
  if (Platform.OS === "web") {
    return localStorage.getItem(API_URL_KEY) ?? DEFAULT_API_URL;
  }
  const stored = await SecureStore.getItemAsync(API_URL_KEY);
  return stored ?? DEFAULT_API_URL;
}

export async function setStoredApiUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, "");
  if (Platform.OS === "web") {
    localStorage.setItem(API_URL_KEY, clean);
    return;
  }
  await SecureStore.setItemAsync(API_URL_KEY, clean);
}
