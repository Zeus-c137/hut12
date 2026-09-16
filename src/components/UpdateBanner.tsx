import { useEffect, useState, useRef } from "react";
import { useGatedInterval } from "../hooks/useGatedInterval";
import { registerSW } from "virtual:pwa-register";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";

const UPDATE_CHECK_MS = 30 * 60 * 1000;

export default function UpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const doUpdateCheck = () => {
    if (document.hidden) return;
    regRef.current?.update().catch(() => {});
  };
  useGatedInterval(() => { doUpdateCheck(); }, UPDATE_CHECK_MS, { enabled: true, visibilityGate: true });
  useEffect(() => {
    if ((import.meta as any).env?.DEV) return;
    if (!("serviceWorker" in navigator)) return;
    const onVis = () => {
      if (!document.hidden) navigator.serviceWorker.getRegistration().then((r) => r?.update().catch(() => {})).catch(() => {});
    };
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        regRef.current = registration;
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("focus", onVis);
      },
    });
    setApplyUpdate(() => update);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: "-110%" }}
          animate={{ y: 0 }}
          exit={{ y: "-110%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="fixed top-0 inset-x-0 z-[70] px-3 pt-3 pointer-events-none"
        >
          <div className="pointer-events-auto mx-auto max-w-md flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-[var(--theme-primary)] text-white shadow-lg border border-white/20">
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-xs font-bold leading-snug">
              A new version of the app is ready.
            </span>
            <button
              type="button"
              onClick={() => applyUpdate?.(true)}
              className="shrink-0 px-4 py-2 rounded-xl bg-white text-[var(--theme-primary)] text-xs font-black uppercase tracking-wide cursor-pointer active:scale-95 transition-transform"
            >
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
