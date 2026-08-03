import React from 'react';
import { FlatList, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { AssistantResponse } from './AssistantResponse';
import { lightColors, darkColors } from '@eduorbit/ui-tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? darkColors : lightColors;

  // We invert the flatlist and reverse the messages array to keep the latest at the bottom naturally
  const reversedMessages = [...messages].reverse();

  return (
    <FlatList
      data={reversedMessages}
      inverted
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      renderItem={({ item }) => {
        const isUser = item.role === 'user';
        return (
          <View
            style={[
              styles.messageBubble,
              isUser
                ? { backgroundColor: palette.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
                : { backgroundColor: palette.secondary, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
            ]}
          >
            {isUser ? (
              <Text style={{ color: palette.primaryForeground, fontSize: 16, lineHeight: 24 }}>
                {item.content}
              </Text>
            ) : (
              <AssistantResponse content={item.content} />
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 16, // gap for reversed flatlist creates space between items
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 20,
    marginVertical: 4,
  },
});
