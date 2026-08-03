import { useEffect, useState } from "react";
import {
  Modal, View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Pressable,
} from "react-native";
import { listSessions, type SessionSummary } from "@eduorbit/api-client";

interface Props {
  visible: boolean;
  activeSessionId: string | null;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export function SessionDrawer({ visible, activeSessionId, onClose, onSelect, onNew }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    listSessions(50, 0)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="bg-background border-t border-border" style={{ maxHeight: "75%" }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Text className="text-foreground text-lg font-semibold">Conversations</Text>
          <TouchableOpacity
            onPress={() => { onNew(); onClose(); }}
            className="bg-primary px-4 py-2 rounded-xl"
          >
            <Text className="text-primary-foreground font-medium text-sm">+ New</Text>
          </TouchableOpacity>
        </View>

        {loading
          ? <ActivityIndicator className="my-8" />
          : sessions.length === 0
            ? <Text className="text-muted-foreground text-center py-8">No conversations yet</Text>
            : <FlatList
                data={sessions}
                keyExtractor={(s) => s.session_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { onSelect(item.session_id); onClose(); }}
                    className={`px-4 py-3 border-b border-border ${item.session_id === activeSessionId ? "bg-primary/10" : ""}`}
                  >
                    <Text className="text-foreground font-medium" numberOfLines={1}>
                      {item.title || "New chat"}
                    </Text>
                    {item.updated_at && (
                      <Text className="text-muted-foreground text-xs mt-0.5">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
        }
      </View>
    </Modal>
  );
}
