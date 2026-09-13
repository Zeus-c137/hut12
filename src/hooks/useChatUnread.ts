import { useCallback, useEffect, useRef, useState } from "react";
import { loadSeen } from "../utils/chat";

const SEEN_KEY = "chat_seen_v1";

export function useChatUnread(phone: string | undefined): number {
  const [count, setCount] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!phone) {
      setCount(0);
      return;
    }
    if (inFlight.current || document.hidden) return;
    inFlight.current = true;
    try {
      const seen = loadSeen(SEEN_KEY);
      let total = 0;
      for (const room of ["shared", `direct_${phone}`]) {
        const res = await fetch(`/api/chat/room/${room}`);
        if (!res.ok) continue;
        const ct = res.headers.get("content-type");
        if (!ct || !ct.includes("application/json")) continue;
        const list = await res.json();
        if (!Array.isArray(list)) continue;
        const sinceIso = seen[room];
        if (!sinceIso) continue;
        const since = new Date(sinceIso).getTime();
        if (isNaN(since)) continue;
        for (const m of list) {
          if (m.sender === phone) continue;
          const t = new Date(m.timestamp).getTime();
          if (!isNaN(t) && t > since) total++;
        }
      }
      setCount(total);
    } catch {
      /* badge is best-effort */
    } finally {
      inFlight.current = false;
    }
  }, [phone]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    const onVis = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("chat-seen", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener("chat-seen", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  return count;
}
