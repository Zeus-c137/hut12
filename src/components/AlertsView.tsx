import React, { useState, useEffect } from "react";
import { NotificationItem, UserProfile } from "../types";
import { X, Bell, RefreshCw, Smartphone, Cpu, ShieldCheck, Gift, ExternalLink, Coins, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AlertsViewProps {
  profile: UserProfile;
  onBack: () => void;
  initialNotifications?: NotificationItem[];
  onNotificationsChange?: (notifications: NotificationItem[]) => void;
}

export default function AlertsView({ profile, onBack, initialNotifications = [], onNotificationsChange }: AlertsViewProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [loading, setLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<NotificationItem | null>(null);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("read_notification_ids") || "[]");
    } catch {
      return [];
    }
  });

  const handleOpenAlert = (item: NotificationItem) => {
    setSelectedAlert(item);
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem("read_notification_ids", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // The app keeps this list warm in the background, so opening the sheet can
  // render immediately while the network refresh runs in the background.
  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/profile/notifications/${profile.phone}`, {
          signal: controller.signal
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Unable to load alerts (${res.status}).`);
        }
        const data = await res.json() as NotificationItem[];
        if (controller.signal.aborted) return;
        setNotifications(data);
        onNotificationsChange?.(data);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error fetching alerts history:", err);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void fetchAlerts();
    };

    refreshIfVisible();
    const intervalId = window.setInterval(refreshIfVisible, 120_000);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [profile.phone, onNotificationsChange]);

  function renderMessageWithLinks(text: string) {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            referrerPolicy="no-referrer"
            rel="noopener noreferrer"
            className="text-blue-450 hover:text-blue-300 font-bold hover:underline break-all inline-block select-text"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

  const alertNotifications = notifications.filter(
    (n) => n.category !== "news" || n.metadata?.alertUsers === true
  );

  const lastViewedTime = Number(localStorage.getItem("lastViewedAlertsTime") || 0);
  const unreadCount = alertNotifications.filter(
    (n) => new Date(n.timestamp).getTime() > lastViewedTime
  ).length;

  return (
    <div className="bg-transparent text-[var(--theme-text)] p-4 select-none relative">
      <AnimatePresence>
        {selectedAlert && (() => {
          let CategoryIcon = Bell;
          
          if (selectedAlert.category === "deposit") {
            CategoryIcon = Coins;
          } else if (selectedAlert.category === "withdraw") {
            CategoryIcon = Smartphone;
          } else if (selectedAlert.category === "rewards" || selectedAlert.category === "daily accumulation") {
            CategoryIcon = Gift;
          } else if (selectedAlert.category === "system" || selectedAlert.category === "announcement") {
            CategoryIcon = Bell;
          }

          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAlert(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative w-full max-w-md theme-card card-playful-3d border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
              >
                {/* Header mimicking the Alert Card */}
                <div className="flex justify-between items-center p-5 bg-[var(--theme-card-bg)]/90 backdrop-blur-md shrink-0 border-b border-[var(--theme-card-border)]/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--theme-radius)] btn-3d-secondary text-[var(--theme-text)] flex items-center justify-center shrink-0">
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider font-sans font-extrabold px-2 py-0.5 rounded-full btn-3d-secondary text-[var(--theme-text)]">
                          {(selectedAlert.category === "daily accumulation" || selectedAlert.category === "rewards") ? "rewards" : selectedAlert.category}
                        </span>
                        <span className="text-[12px] font-sans text-[var(--theme-text)] opacity-60 font-semibold">
                          {new Date(selectedAlert.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-[var(--theme-text)] mt-1 tracking-tight leading-snug">{selectedAlert.title}</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="p-1.5 rounded-full bg-[var(--theme-bg)] text-[var(--theme-text)] hover:opacity-100 cursor-pointer transition-colors border border-[var(--theme-card-border)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body mimicking the Card layout */}
                <div className="p-6 overflow-y-auto space-y-5 bg-[var(--theme-card-bg)]">
                  <div className="text-[13.5px] text-[var(--theme-text)] opacity-90 leading-relaxed space-y-4 font-sans whitespace-pre-line select-text">
                    {renderMessageWithLinks(selectedAlert.message)}
                  </div>

                  {selectedAlert.metadata?.link && (
                    <div className="pt-3">
                      <a
                        href={selectedAlert.metadata.link}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3.5 btn-3d-primary text-white font-sans text-xs font-black uppercase tracking-wider transition-all cursor-pointer w-full justify-center shadow-lg active:scale-[0.98]"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      <div>
        {/* Sticky Header Ribbon - Sticky top */}
        <div className="sticky top-0 z-20 bg-[var(--theme-card-bg)]/95 backdrop-blur-md py-3.5 px-3 border-b border-[var(--theme-card-border)] mb-4 flex items-center justify-between shadow-xs rounded-b-[var(--theme-radius)]">
          <h2 className="font-display font-black text-sm uppercase tracking-wider text-[var(--theme-primary)]">
            Notifications ({unreadCount})
          </h2>
        </div>

        <div className="space-y-4">

          {loading ? (
            <div className="space-y-3 pb-24">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-900/25 border border-slate-900/60 p-4 rounded-2xl flex gap-3.5 animate-pulse text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-800/60 flex items-center justify-center shrink-0 animate-pulse" />
                  
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-3 w-12 bg-slate-800 rounded animate-pulse" />
                      <div className="h-2.5 w-20 bg-slate-800/60 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-1/3 bg-slate-800 rounded animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-2 w-full bg-slate-850 rounded animate-pulse" />
                      <div className="h-2 w-3/4 bg-slate-850 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : alertNotifications.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center justify-center gap-4">
              <Bell className="w-8 h-8 text-slate-700 animate-pulse" />
              <div className="space-y-1">
                <span className="text-[11px] font-bold font-mono text-slate-400 block uppercase">No Alert Records Registered</span>
                <p className="text-[12px] text-slate-500 max-w-[240px] mx-auto leading-normal font-mono">
                  Your rented products, commission payouts, and security updates are performing optimally with no alerts raised yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {alertNotifications.map((logs) => {
                let CategoryIcon = ShieldCheck;
                let iconContainerClass = "btn-3d-primary text-white";
                let badgeClass = "bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)]";

                if (logs.category === "deposit") {
                  CategoryIcon = ArrowDownCircle;
                  iconContainerClass = "btn-3d-primary text-white shadow-xs";
                  badgeClass = "btn-3d-primary text-white";
                } else if (logs.category === "withdraw") {
                  CategoryIcon = ArrowUpCircle;
                  iconContainerClass = "btn-3d-secondary text-[var(--theme-text)] shadow-xs";
                  badgeClass = "btn-3d-secondary text-[var(--theme-text)]";
                } else if (logs.category === "rewards" || logs.category === "daily accumulation") {
                  CategoryIcon = Gift;
                  iconContainerClass = "btn-3d-secondary text-[var(--theme-text)] shadow-xs";
                  badgeClass = "btn-3d-secondary text-[var(--theme-text)]";
                } else if (logs.category === "system" || logs.category === "announcement") {
                  CategoryIcon = ShieldCheck;
                  iconContainerClass = "btn-3d-primary text-white shadow-xs";
                  badgeClass = "bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)]";
                }

                const isUnread = !readIds.includes(logs.id);

                return (
                  <div
                    key={logs.id}
                    onClick={() => handleOpenAlert(logs)}
                    className="theme-card card-playful-3d border border-[var(--theme-card-border)] p-4 rounded-[var(--theme-radius)] flex gap-3.5 transition-all text-left cursor-pointer active:scale-[0.98]"
                  >
                    <div className={`w-10 h-10 rounded-[var(--theme-radius)] flex items-center justify-center shrink-0 ${iconContainerClass}`}>
                      <CategoryIcon className="w-5 h-5 fill-current shrink-0" />
                    </div>
                    
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] uppercase tracking-wider font-mono font-black px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {(logs.category === "daily accumulation" || logs.category === "rewards") ? "rewards" : logs.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0 inline-block shadow-xs" title="Unread" />
                          )}
                          <span className="text-[12px] font-sans text-[var(--theme-text)] opacity-60 font-semibold">
                            {new Date(logs.timestamp).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-extrabold text-[var(--theme-text)] text-xs tracking-tight leading-tight font-sans">
                        {logs.title}
                      </h4>
                      <p className="text-[var(--theme-text)] opacity-80 text-[11.5px] font-sans leading-relaxed select-text break-normal whitespace-normal">
                        {renderMessageWithLinks(logs.message)}
                      </p>
                      {logs.metadata?.link && (
                        <div className="pt-2">
                          <a
                             href={logs.metadata.link}
                             target="_blank"
                             referrerPolicy="no-referrer"
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-3d-primary text-white font-mono text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <span>Open Link</span>
                            <ExternalLink className="w-3 h-3 text-white" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
