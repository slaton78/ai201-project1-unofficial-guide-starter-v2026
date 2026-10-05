import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { errorReporter } from '@/services/errorReporting';

import type { RawSender } from './bridge/useGameBridge';
import { GAME_HTML } from './generated/gameHtml';

export interface GameContainerProps {
  onRawMessage: (raw: string) => void;
  registerSender: (sender: RawSender | null) => void;
  style?: StyleProp<ViewStyle>;
}

/** Only the inline document may load; any navigation attempt (links, redirects) is blocked. */
function isAllowedUrl(url: string): boolean {
  return url === 'about:blank' || url.startsWith('about:srcdoc') || url.startsWith('data:');
}

/**
 * Hosts the Phaser game in an isolated WebView (see docs/adr-001-phaser-webview.md).
 * Communication happens exclusively through the typed bridge.
 */
export function GameContainer({ onRawMessage, registerSender, style }: GameContainerProps) {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    registerSender((json) => {
      // JSON.stringify(json) produces a safely escaped JS string literal.
      ref.current?.injectJavaScript(
        `window.__campusRallyReceive&&window.__campusRallyReceive(${JSON.stringify(json)});true;`,
      );
    });
    return () => registerSender(null);
  }, [registerSender]);

  const recover = (reason: string) => {
    errorReporter.captureException(new Error(`WebView terminated: ${reason}`), { area: 'webview' });
    ref.current?.reload();
  };

  return (
    <WebView
      ref={ref}
      testID="game-webview"
      style={[styles.webview, style]}
      containerStyle={styles.webview}
      source={{ html: GAME_HTML }}
      originWhitelist={['about:*', 'data:*']}
      onShouldStartLoadWithRequest={(request) => isAllowedUrl(request.url)}
      onMessage={(event: WebViewMessageEvent) => onRawMessage(event.nativeEvent.data)}
      javaScriptEnabled
      domStorageEnabled={false}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false}
      allowsLinkPreview={false}
      textInteractionEnabled={false}
      cacheEnabled={false}
      incognito
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      mediaPlaybackRequiresUserAction
      webviewDebuggingEnabled={__DEV__}
      onContentProcessDidTerminate={() => recover('ios-content-process')}
      onRenderProcessGone={() => recover('android-render-process')}
      accessibilityLabel="Game board"
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: 'transparent' },
});
