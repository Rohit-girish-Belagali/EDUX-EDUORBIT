import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { lightColors, darkColors } from '@eduorbit/ui-tokens';

interface ChatComposerProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatComposer({ onSend, isStreaming, onStop }: ChatComposerProps) {
  const [text, setText] = useState('');
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? darkColors : lightColors;

  const handleSend = () => {
    if (text.trim().length > 0) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      style={{ backgroundColor: palette.background }}
    >
      <View style={[styles.container, { borderTopColor: palette.border, backgroundColor: palette.card }]}>
        <TextInput
          style={[styles.input, { color: palette.foreground, borderColor: palette.border }]}
          placeholder="Ask a question..."
          placeholderTextColor={palette.mutedForeground}
          multiline
          value={text}
          onChangeText={setText}
          maxLength={2000}
        />
        
        {isStreaming ? (
          <TouchableOpacity onPress={onStop} style={[styles.button, { backgroundColor: palette.destructive }]}>
            {Platform.OS === "ios"
              ? <SymbolView name="stop.fill" tintColor={palette.destructiveForeground} size={20} />
              : <Ionicons name="stop" color={palette.destructiveForeground} size={20} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={text.trim().length === 0}
            style={[styles.button, { backgroundColor: text.trim().length > 0 ? palette.primary : palette.muted }]}
          >
            {Platform.OS === "ios"
              ? <SymbolView name="arrow.up" tintColor={text.trim().length > 0 ? palette.primaryForeground : palette.mutedForeground} size={20} />
              : <Ionicons name="arrow-up" color={text.trim().length > 0 ? palette.primaryForeground : palette.mutedForeground} size={20} />}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    marginRight: 12,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2, // align with single-line input
  }
});
