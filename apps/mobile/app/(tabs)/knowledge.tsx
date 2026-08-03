import { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, SafeAreaView, TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import {
  listKnowledgeBases, createKnowledgeBase, uploadKnowledgeBaseFiles,
  deleteKnowledgeBase, setDefaultKnowledgeBase, type KnowledgeBaseSummary,
} from "@eduorbit/api-client";

export default function KnowledgeTab() {
  const [kbs, setKbs] = useState<KnowledgeBaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listKnowledgeBases()
      .then(setKbs)
      .catch(() => setKbs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const picked = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.length) return;
    setCreating(true);
    try {
      const files: File[] = await Promise.all(
        picked.assets.map(async (asset) => {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
          const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          return new File([binary], asset.name, { type: asset.mimeType ?? "application/octet-stream" });
        }),
      );
      await createKnowledgeBase({ name: newName.trim(), provider: "llamaindex", files });
      setNewName("");
      setShowCreate(false);
      refresh();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to create knowledge base");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(kb: KnowledgeBaseSummary) {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    setUploading(kb.name);
    try {
      const files: File[] = await Promise.all(
        result.assets.map(async (asset) => {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" });
          const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          return new File([binary], asset.name, { type: asset.mimeType ?? "application/octet-stream" });
        }),
      );
      await uploadKnowledgeBaseFiles(kb.name, files);
      refresh();
      Alert.alert("Uploaded", `${files.length} file(s) uploaded to "${kb.name}"`);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(null);
    }
  }

  async function handleDelete(kb: KnowledgeBaseSummary) {
    Alert.alert("Delete", `Delete "${kb.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteKnowledgeBase(kb.name).catch(() => {});
          refresh();
        },
      },
    ]);
  }

  function kbStatusColor(kb: KnowledgeBaseSummary): string {
    const s = kb.status;
    if (s === "ready") return "text-green-500";
    if (s === "indexing") return "text-yellow-500";
    if (s === "error") return "text-destructive";
    return "text-muted-foreground";
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-foreground text-xl font-bold">Knowledge Bases</Text>
        <TouchableOpacity onPress={() => setShowCreate(v => !v)} className="bg-primary px-3 py-1.5 rounded-xl">
          <Text className="text-primary-foreground font-medium text-sm">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Create form */}
      {showCreate && (
        <View className="px-4 py-3 border-b border-border bg-card">
          <TextInput
            className="bg-background border border-border rounded-xl px-3 py-2 text-foreground mb-2"
            placeholder="Knowledge base name"
            placeholderTextColor="#9ca3af"
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newName.trim() || creating}
              className="flex-1 bg-primary py-2 rounded-xl items-center"
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text className="text-primary-foreground font-medium">Pick Files & Create</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowCreate(false); setNewName(""); }}
              className="flex-1 bg-muted py-2 rounded-xl items-center"
            >
              <Text className="text-foreground font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading
        ? <ActivityIndicator className="flex-1 mt-12" />
        : kbs.length === 0
          ? <View className="flex-1 items-center justify-center gap-3">
              <Text className="text-4xl">🗄️</Text>
              <Text className="text-muted-foreground text-center px-8">
                No knowledge bases yet. Create one to upload documents.
              </Text>
            </View>
          : <FlatList
              data={kbs}
              keyExtractor={kb => kb.name}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item: kb }) => (
                <View className="bg-card border border-border rounded-2xl p-4 mb-3">
                  <View className="flex-row items-start justify-between mb-1">
                    <View className="flex-1">
                      <Text className="text-foreground font-semibold text-base">{kb.name}</Text>
                      {kb.provenance_label
                        ? <Text className="text-muted-foreground text-sm mt-0.5">{kb.provenance_label}</Text>
                        : null}
                    </View>
                    {kb.is_default
                      ? <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                          <Text className="text-primary text-xs font-medium">Default</Text>
                        </View>
                      : null}
                  </View>

                  <Text className={`text-xs mb-3 ${kbStatusColor(kb)}`}>
                    {kb.status ?? "unknown"}
                    {(kb.statistics as Record<string,unknown>)?.file_count != null
                      ? ` · ${(kb.statistics as Record<string,unknown>).file_count} files`
                      : ""}
                  </Text>

                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleUpload(kb)}
                      disabled={uploading === kb.name}
                      className="flex-1 bg-primary/10 border border-primary/20 py-2 rounded-xl items-center"
                    >
                      {uploading === kb.name
                        ? <ActivityIndicator size="small" color="#b0501e" />
                        : <Text className="text-primary text-sm font-medium">↑ Upload</Text>}
                    </TouchableOpacity>
                    {!kb.is_default && (
                      <TouchableOpacity
                        onPress={() => setDefaultKnowledgeBase(kb.name).then(refresh)}
                        className="flex-1 bg-muted py-2 rounded-xl items-center"
                      >
                        <Text className="text-foreground text-sm">Set Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(kb)}
                      className="bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-xl"
                    >
                      <Text className="text-destructive text-sm">🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
      }
    </SafeAreaView>
  );
}
