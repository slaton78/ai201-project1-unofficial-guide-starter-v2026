import { useCallback, useEffect, useMemo, useRef } from 'react';

import { errorReporter } from '@/services/errorReporting';

import { parseGameToNative, serialize } from './protocol';
import type { GameToNativeMessage, NativeToGameMessage } from './protocol';

export type RawSender = (json: string) => void;

export interface GameBridge {
  /** Sends a typed message; queued until the game reports GAME_READY. */
  send(message: NativeToGameMessage): void;
  /** Feed raw strings from the WebView/iframe here. Invalid payloads are dropped and reported. */
  receive(raw: unknown): void;
  /** Called by the container with its low-level sender (or null when unmounted/reloading). */
  registerSender(sender: RawSender | null): void;
}

/**
 * React Native side of the typed bridge. It never exposes app state to the game: the game only
 * sees what is explicitly sent, and the app only acts on messages that pass schema validation.
 */
export function useGameBridge(onMessage: (message: GameToNativeMessage) => void): GameBridge {
  const handlerRef = useRef(onMessage);
  const senderRef = useRef<RawSender | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  const flush = useCallback(() => {
    const sender = senderRef.current;
    if (!sender || !readyRef.current) return;
    const queued = queueRef.current;
    queueRef.current = [];
    queued.forEach((json) => sender(json));
  }, []);

  const send = useCallback(
    (message: NativeToGameMessage) => {
      queueRef.current.push(serialize(message));
      flush();
    },
    [flush],
  );

  const receive = useCallback(
    (raw: unknown) => {
      const parsed = parseGameToNative(raw);
      if (!parsed.ok) {
        errorReporter.captureException(new Error(parsed.error), { area: 'bridge' });
        return;
      }
      if (parsed.message.type === 'GAME_READY') {
        // A (re)loaded WebView starts with empty state; anything queued for the old one is stale.
        readyRef.current = true;
        queueRef.current = [];
      }
      handlerRef.current(parsed.message);
      flush();
    },
    [flush],
  );

  const registerSender = useCallback((sender: RawSender | null) => {
    senderRef.current = sender;
    if (!sender) readyRef.current = false;
  }, []);

  return useMemo(() => ({ send, receive, registerSender }), [send, receive, registerSender]);
}
