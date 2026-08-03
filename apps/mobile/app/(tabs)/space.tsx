import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from "react-native";
import { router } from "expo-router";
import {
  listSessions, listNotebooks, listPersonas, listSkills,
  fetchAllPlans, listNotebookEntries,
} from "@eduorbit/api-client";

interface DashTile {
  key: string;
  label: string;
  emoji: string;
  count: number | null;
  unit: string;
  desc: string;
  route: string;
  color: string;
}

const TILES: Omit<DashTile, "count">[] = [
  { key: "sessions",  label: "Chat History",    emoji: "💬", unit: "chats",     desc: "Your AI conversations", route: "/(auth)/login", color: "bg-blue-500/10 border-blue-500/20" },
  { key: "notebooks", label: "Notebooks",       emoji: "📓", unit: "notebooks", desc: "Saved notes and records", route: "/(tabs)/notebook", color: "bg-green-500/10 border-green-500/20" },
  { key: "questions", label: "Question Bank",   emoji: "❓", unit: "questions", desc: "Saved quiz questions", route: "/(auth)/login", color: "bg-yellow-500/10 border-yellow-500/20" },
  { key: "plans",     label: "Timetable",       emoji: "📅", unit: "plans",     desc: "Study schedule plans", route: "/(auth)/login", color: "bg-purple-500/10 border-purple-500/20" },
  { key: "personas",  label: "Personas",        emoji: "🎭", unit: "personas",  desc: "Custom AI personalities", route: "/(auth)/login", color: "bg-pink-500/10 border-pink-500/20" },
  { key: "skills",    label: "Skills",          emoji: "⚡", unit: "skills",    desc: "Reusable AI workflows", route: "/(auth)/login", color: "bg-orange-500/10 border-orange-500/20" },
];

export default function SpaceTab() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      listSessions(200, 0).then(s => ["sessions", s.length]),
      listNotebooks().then(n => ["notebooks", n.length]),
      listNotebookEntries({ limit: 1 }).then(r => ["questions", r.total]),
      fetchAllPlans().then(p => ["plans", p.length]),
      listPersonas().then(p => ["personas", p.length]),
      listSkills().then(s => ["skills", s.length]),
    ]).then(results => {
      const c: Record<string, number | null> = {};
      for (const r of results) {
        if (r.status === "fulfilled") {
          const [key, val] = r.value as [string, number];
          c[key] = val;
        }
      }
      setCounts(c);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-foreground text-2xl font-bold mb-1">Learning Space</Text>
        <Text className="text-muted-foreground mb-6">Your personal knowledge hub</Text>

        <View className="flex-row flex-wrap gap-3">
          {TILES.map(tile => {
            const count = counts[tile.key] ?? null;
            return (
              <TouchableOpacity
                key={tile.key}
                onPress={() => router.push(tile.route as any)}
                className={`flex-1 min-w-[45%] border rounded-2xl p-4 ${tile.color}`}
                style={{ minWidth: "44%" }}
              >
                <Text className="text-3xl mb-2">{tile.emoji}</Text>
                <Text className="text-foreground font-semibold text-base">{tile.label}</Text>
                <View className="flex-row items-baseline gap-1 my-1">
                  {loading && count === null
                    ? <ActivityIndicator size="small" />
                    : <Text className="text-foreground text-2xl font-bold">{count ?? "—"}</Text>
                  }
                  <Text className="text-muted-foreground text-xs">{tile.unit}</Text>
                </View>
                <Text className="text-muted-foreground text-xs">{tile.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
