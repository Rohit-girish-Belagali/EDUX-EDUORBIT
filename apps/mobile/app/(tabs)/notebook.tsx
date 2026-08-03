import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, SafeAreaView, TextInput,
} from "react-native";
import { listNotebooks, createNotebook, deleteNotebook, type NotebookSummary } from "@eduorbit/api-client";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function NotebookTab() {
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const refresh = useCallback(() => {
    setLoading(true);
    listNotebooks().then(setNotebooks).catch(() => setNotebooks([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createNotebook({ name: newName.trim(), color: selectedColor });
      setNewName("");
      setShowCreate(false);
      refresh();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create notebook");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(nb: NotebookSummary) {
    Alert.alert("Delete", `Delete "${nb.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await deleteNotebook(nb.id).catch(() => {}); refresh(); },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-foreground text-xl font-bold">Notebooks</Text>
        <TouchableOpacity onPress={() => setShowCreate(v => !v)} className="bg-primary px-3 py-1.5 rounded-xl">
          <Text className="text-primary-foreground font-medium text-sm">+ New</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View className="px-4 py-3 border-b border-border bg-card">
          <TextInput
            className="bg-background border border-border rounded-xl px-3 py-2 text-foreground mb-2"
            placeholder="Notebook name"
            placeholderTextColor="#9ca3af"
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <View className="flex-row gap-2 mb-2">
            {COLORS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setSelectedColor(c)}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: "#fff" }}
              />
            ))}
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleCreate} disabled={!newName.trim() || creating} className="flex-1 bg-primary py-2 rounded-xl items-center">
              {creating ? <ActivityIndicator color="#fff" /> : <Text className="text-primary-foreground font-medium">Create</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewName(""); }} className="flex-1 bg-muted py-2 rounded-xl items-center">
              <Text className="text-foreground font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading
        ? <ActivityIndicator className="flex-1 mt-12" />
        : notebooks.length === 0
          ? <View className="flex-1 items-center justify-center gap-3">
              <Text className="text-4xl">📓</Text>
              <Text className="text-muted-foreground text-center px-8">No notebooks yet. Create one to save your AI interactions.</Text>
            </View>
          : <FlatList
              data={notebooks}
              keyExtractor={nb => nb.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item: nb }) => (
                <View className="bg-card border border-border rounded-2xl p-4 mb-3 flex-row items-center gap-3">
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: nb.color ?? COLORS[0], alignItems: "center", justifyContent: "center" }}>
                    <Text className="text-white text-xl">{nb.icon ?? "📓"}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold">{nb.name}</Text>
                    {nb.description ? <Text className="text-muted-foreground text-sm">{nb.description}</Text> : null}
                    <Text className="text-muted-foreground text-xs mt-0.5">
                      {nb.record_count ?? 0} records
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(nb)} className="p-2">
                    <Text className="text-destructive">🗑</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
      }
    </SafeAreaView>
  );
}
