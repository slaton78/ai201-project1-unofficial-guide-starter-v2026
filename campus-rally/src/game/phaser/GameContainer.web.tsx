import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { GameContainerProps } from './GameContainer';
import { GAME_HTML } from './generated/gameHtml';

/**
 * Web preview host (react-native-webview does not support web). Uses a sandboxed iframe
 * without `allow-same-origin`, so the game runs in an opaque origin with no access to the app.
 */
export function GameContainer({ onRawMessage, registerSender, style }: GameContainerProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (typeof event.data === 'string') onRawMessage(event.data);
    };
    window.addEventListener('message', onMessage);
    registerSender((json) => frameRef.current?.contentWindow?.postMessage(json, '*'));
    return () => {
      window.removeEventListener('message', onMessage);
      registerSender(null);
    };
  }, [onRawMessage, registerSender]);

  return (
    <View style={[{ flex: 1 }, style]}>
      <iframe
        ref={frameRef}
        title="Campus Rally game board"
        srcDoc={GAME_HTML}
        sandbox="allow-scripts"
        style={{ border: 0, width: '100%', height: '100%', background: 'transparent' }}
      />
    </View>
  );
}
