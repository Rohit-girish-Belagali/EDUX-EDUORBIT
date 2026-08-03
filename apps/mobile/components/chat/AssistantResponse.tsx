import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { WebView } from 'react-native-webview';
import { lightColors, darkColors } from '@eduorbit/ui-tokens';

interface AssistantResponseProps {
  content: string;
}

export function AssistantResponse({ content }: AssistantResponseProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? darkColors : lightColors;

  return (
    <View style={styles.container}>
      <Markdown
        style={{
          body: { color: palette.foreground, fontSize: 16, lineHeight: 24 },
          code_inline: { backgroundColor: palette.secondary, color: palette.primary, padding: 4, borderRadius: 4 },
          code_block: { backgroundColor: palette.secondary, padding: 12, borderRadius: 8, color: palette.primary },
          link: { color: '#007AFF' }
        }}
      >
        {content}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  }
});
