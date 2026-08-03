import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme, SafeAreaView } from 'react-native';
import { ChatMessageList } from '../../components/chat/ChatMessageList';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { lightColors, darkColors } from '@eduorbit/ui-tokens';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function TabOneScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? darkColors : lightColors;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am EduOrbit. How can I help you today?',
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSend = (text: string) => {
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    
    // Mock streaming response
    setIsStreaming(true);
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '...' }]);

    // Fake stream (we will hook this up to `useSmoothStreamText` in Phase 3.1.2)
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => m.id === assistantId ? { ...m, content: 'This is a mocked response. The full `useSmoothStreamText` hook will be wired up soon!' } : m)
      );
      setIsStreaming(false);
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.chatArea}>
        <ChatMessageList messages={messages} />
      </View>
      <ChatComposer 
        onSend={handleSend} 
        isStreaming={isStreaming} 
        onStop={() => setIsStreaming(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
});
