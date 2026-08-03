import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import Markdown from "react-native-markdown-display";
import { useColorScheme } from "react-native";
import { lightColors, darkColors } from "@eduorbit/ui-tokens";
import { useSmoothStreamText } from "../../hooks/useSmoothStreamText";
import type { ChatMsg } from "../../context/ChatContext";

interface Props {
  msg: ChatMsg;
  onLongPress?: () => void;
}

export function MessageBubble({ msg, onLongPress }: Props) {
  const scheme = useColorScheme() ?? "light";
  const palette = scheme === "dark" ? darkColors : lightColors;
  const displayContent = useSmoothStreamText(msg.content, msg.isStreaming ?? false);
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.85}>
        <View className="self-end max-w-[85%] bg-primary rounded-2xl rounded-tr-sm px-4 py-3 mb-2 mx-4">
          <Text className="text-primary-foreground text-base leading-relaxed">{msg.content}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (msg.error) {
    return (
      <View className="self-start max-w-[90%] bg-destructive/10 border border-destructive/30 rounded-2xl rounded-tl-sm px-4 py-3 mb-2 mx-4">
        <Text className="text-destructive text-sm">{msg.error}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.85} className="self-start max-w-[90%] mb-2 mx-4">
      <View className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        {displayContent
          ? <Markdown style={{
              body: { color: palette.foreground, fontSize: 15, lineHeight: 22 },
              code_inline: { backgroundColor: palette.muted, color: palette.foreground, borderRadius: 4, paddingHorizontal: 4 },
              fence: { backgroundColor: palette.muted, borderRadius: 8, padding: 12 },
              code_block: { backgroundColor: palette.muted, borderRadius: 8, padding: 12, color: palette.foreground },
              strong: { fontWeight: "700" },
              link: { color: palette.primary },
              blockquote: { borderLeftColor: palette.border, borderLeftWidth: 3, paddingLeft: 12, opacity: 0.8 },
              bullet_list_icon: { color: palette.primary },
              ordered_list_icon: { color: palette.primary },
            }}>
              {displayContent}
            </Markdown>
          : msg.isStreaming
            ? <ActivityIndicator size="small" color={palette.primary} />
            : null
        }
      </View>
    </TouchableOpacity>
  );
}
