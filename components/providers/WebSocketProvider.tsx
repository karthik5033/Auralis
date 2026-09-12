"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type {
  WsEventName,
  WsEventPayloadMap,
  WsMessage,
} from "@/types/contract";
import { WS_URL, getApiMode, ApiMode } from "@/lib/api";
import { mockWs } from "@/lib/mockWs";

type EventCallback<T = any> = (payload: T, message?: WsMessage<T>) => void;
type RawCallback = (message: WsMessage) => void;

export interface WebSocketContextValue {
  isConnected: boolean;
  mode: ApiMode;
  lastMessage: WsMessage | null;
  subscribe: <K extends WsEventName>(
    event: K,
    callback: EventCallback<WsEventPayloadMap[K]>
  ) => () => void;
  subscribeAll: (callback: RawCallback) => () => void;
  send: (data: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [mode] = useState<ApiMode>(getApiMode());

  // Listeners registry maps
  const eventListenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const rawListenersRef = useRef<Set<RawCallback>>(new Set());

  // Native WebSocket and reconnection refs for live mode
  const nativeWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Dispatch an incoming message to all matching subscribers
  const dispatchMessage = useCallback((msg: WsMessage) => {
    setLastMessage(msg);

    // 1. Dispatch to typed event listeners
    const handlers = eventListenersRef.current.get(msg.event);
    if (handlers && handlers.size > 0) {
      handlers.forEach((handler) => {
        try {
          handler(msg.payload, msg);
        } catch (err) {
          console.error(`[WebSocketProvider] Error in listener for "${msg.event}":`, err);
        }
      });
    }

    // 2. Dispatch to raw message listeners
    rawListenersRef.current.forEach((rawHandler) => {
      try {
        rawHandler(msg);
      } catch (err) {
        console.error("[WebSocketProvider] Error in raw message listener:", err);
      }
    });
  }, []);

  // Connection management
  useEffect(() => {
    isMountedRef.current = true;

    if (mode === "mock") {
      // Mock mode: subscribe to singleton mockWs
      mockWs.start();
      setIsConnected(true);

      const unsub = mockWs.onMessage((msg: WsMessage) => {
        if (isMountedRef.current) {
          dispatchMessage(msg);
        }
      });

      return () => {
        isMountedRef.current = false;
        unsub();
      };
    }

    // Live mode: connect to real WebSocket endpoint with auto-reconnect backoff
    function connectLiveWs() {
      if (!isMountedRef.current) return;

      try {
        const ws = new WebSocket(WS_URL);
        nativeWsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) return;
          console.info(`[WebSocketProvider] Connected to live backend at ${WS_URL}`);
          setIsConnected(true);
          retryCountRef.current = 0; // reset backoff
        };

        ws.onmessage = (event: MessageEvent) => {
          if (!isMountedRef.current) return;
          try {
            const parsed = JSON.parse(event.data) as WsMessage;
            if (parsed && typeof parsed.event === "string") {
              dispatchMessage(parsed);
            }
          } catch (parseErr) {
            console.warn("[WebSocketProvider] Unparseable message frame:", event.data);
          }
        };

        ws.onclose = () => {
          if (!isMountedRef.current) return;
          setIsConnected(false);
          nativeWsRef.current = null;
          scheduleReconnect();
        };

        ws.onerror = (err) => {
          console.error("[WebSocketProvider] Live WebSocket error:", err);
          ws.close();
        };
      } catch (err) {
        console.error("[WebSocketProvider] Live connection instantiation failed:", err);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (!isMountedRef.current) return;
      // Exponential backoff: 1s -> 1.5s -> 2.25s -> ... capped at 15s
      const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
      retryCountRef.current += 1;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectLiveWs();
      }, delay);
    }

    connectLiveWs();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (nativeWsRef.current) {
        nativeWsRef.current.close();
        nativeWsRef.current = null;
      }
    };
  }, [mode, dispatchMessage]);

  // Subscribe to a specific event name
  const subscribe = useCallback(
    <K extends WsEventName>(
      event: K,
      callback: EventCallback<WsEventPayloadMap[K]>
    ): (() => void) => {
      if (!eventListenersRef.current.has(event)) {
        eventListenersRef.current.set(event, new Set());
      }
      const set = eventListenersRef.current.get(event)!;
      set.add(callback);

      return () => {
        set.delete(callback);
      };
    },
    []
  );

  // Subscribe to all raw messages
  const subscribeAll = useCallback((callback: RawCallback): (() => void) => {
    rawListenersRef.current.add(callback);
    return () => {
      rawListenersRef.current.delete(callback);
    };
  }, []);

  // Send message over WebSocket
  const send = useCallback(
    (data: unknown) => {
      if (mode === "mock") {
        // In mock mode, if ping sent, trigger reply
        if (typeof data === "object" && data !== null && (data as any).action === "ping") {
          dispatchMessage({
            event: "pong",
            timestamp: new Date().toISOString(),
            payload: {},
          });
        }
        return;
      }

      if (nativeWsRef.current && nativeWsRef.current.readyState === WebSocket.OPEN) {
        nativeWsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
      } else {
        console.warn("[WebSocketProvider] Unable to send message; WebSocket not open.");
      }
    },
    [mode, dispatchMessage]
  );

  const contextValue: WebSocketContextValue = {
    isConnected,
    mode,
    lastMessage,
    subscribe,
    subscribeAll,
    send,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access the WebSocket context directly.
 */
export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocketContext must be used within a <WebSocketProvider>");
  }
  return ctx;
}

/**
 * Hook to subscribe to a typed WebSocket event.
 * Automatically keeps the latest handler reference without causing re-subscriptions.
 *
 * @example
 * useWebSocket("conjunction:created", (newConj) => {
 *   console.log("New collision alert:", newConj.id);
 * });
 */
export function useWebSocket<K extends WsEventName>(
  event: K,
  callback: (payload: WsEventPayloadMap[K], message?: WsMessage<WsEventPayloadMap[K]>) => void
): void {
  const ctx = useContext(WebSocketContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!ctx) return;
    const unsub = ctx.subscribe(event, (payload, msg) => {
      callbackRef.current(payload, msg);
    });
    return unsub;
  }, [ctx, event]);
}

/**
 * Hook to subscribe to all raw WebSocket messages uniformly.
 */
export function useWebSocketMessage(callback: (message: WsMessage) => void): void {
  const ctx = useContext(WebSocketContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!ctx) return;
    const unsub = ctx.subscribeAll((msg) => {
      callbackRef.current(msg);
    });
    return unsub;
  }, [ctx]);
}

/**
 * Hook to inspect WebSocket connection health and mode.
 */
export function useWebSocketStatus() {
  const ctx = useContext(WebSocketContext);
  return {
    isConnected: ctx?.isConnected ?? false,
    mode: ctx?.mode ?? "mock",
    lastMessage: ctx?.lastMessage ?? null,
    send: ctx?.send ?? (() => {}),
  };
}
