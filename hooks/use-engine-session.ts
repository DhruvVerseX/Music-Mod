"use client";

import { useEffect } from "react";
import { ENGINE_HTTP_URL, ENGINE_WS_URL } from "@/lib/constants";
import { EngineState } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

export function useEngineSession() {
  const { setEngine, mergeEngine } = useAppStore();

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;

    mergeEngine({ status: "connecting" });

    const bootstrap = async () => {
      try {
        const response = await fetch(`${ENGINE_HTTP_URL}/state`);
        if (response.ok) {
          const state = (await response.json()) as EngineState;
          if (!cancelled) {
            setEngine(state);
          }
        }
      } catch {
        if (!cancelled) {
          mergeEngine({
            status: "offline",
            errors: ["Python engine unreachable. Start the backend service and refresh."]
          });
        }
      }

      if (cancelled) {
        return;
      }

      socket = new WebSocket(ENGINE_WS_URL);
      socket.onopen = () => {
        if (!cancelled) {
          mergeEngine({ status: "idle" });
        }
      };
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as EngineState;
        if (!cancelled) {
          setEngine(next);
        }
      };
      socket.onerror = () => {
        if (!cancelled) {
          mergeEngine({
            status: "error",
            errors: ["WebSocket connection to Python engine failed."]
          });
        }
      };
      socket.onclose = () => {
        if (!cancelled) {
          mergeEngine({
            status: "offline",
            errors: ["Python engine disconnected."]
          });
        }
      };
    };

    void bootstrap();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [mergeEngine, setEngine]);
}

export async function postEngineAction(path: string) {
  const response = await fetch(`${ENGINE_HTTP_URL}${path}`, {
    method: "POST"
  }).catch(() => {
    throw new Error("Python engine is not reachable at the configured URL.");
  });

  if (!response.ok) {
    throw new Error(`Python engine returned ${response.status}.`);
  }
}
