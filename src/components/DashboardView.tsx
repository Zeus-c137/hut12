/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, SubscribedNode, SystemStats, NotificationItem, SubscriptionItem } from "../types";
import {
  Coins,
  Zap,
  RefreshCw,
  Layers,
  CheckCircle,
  Flame,
  Plus,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Bell,
  AlertCircle,
  X,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Gift,
  Send,
  MessageSquare,
  Activity,
  Users,
  Cpu,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import medal3d from "@/src/assets/3d/3dicons-medal-iso-premium.png";
import gift3d from "@/src/assets/3d/3dicons-gift-iso-premium.png";
import shield3d from "@/src/assets/3d/3dicons-shield-iso-premium.png";
import ParticleBg from "./ParticleBg";
import NewsCarousel from "./NewsCarousel";
import MetricCard from "./MetricCard";
import FeaturedProducts from "./FeaturedProducts";
import { useCurrency } from "../currency";
import { Button } from "./ui/button";

interface DashboardViewProps {
  profile: UserProfile;
  activeNodes: SubscribedNode[];
  onNavigateToCatalog: () => void;
  onNavigateToDeposit: () => void;
  onNavigateToWithdraw?: () => void;
  onNavigateToProfile: () => void;
  onNavigateToAlerts: () => void;
  items: SubscriptionItem[];
  systemStats?: SystemStats;
  siteConfig?: any;
  notifications?: NotificationItem[];
  onRefreshDashboard: () => void;
}

export default function DashboardView({
  profile,
  activeNodes,
  onNavigateToCatalog,
  onNavigateToDeposit,
  onNavigateToWithdraw,
  onNavigateToProfile,
  onNavigateToAlerts,
  items,
  systemStats,
  siteConfig,
  notifications: externalNotifications,
  onRefreshDashboard
}: DashboardViewProps) {
  const { formatCurrency } = useCurrency();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCommunitySheet, setShowCommunitySheet] = useState(false);

  // Notifications — prefer parent-provided list to avoid duplicate /api/profile/notifications fetches
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => externalNotifications ?? []);
  const [notifLoading, setNotifLoading] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
  const lastReferralsFetch = React.useRef<number>(0);
  const [selectedAlert, setSelectedAlert] = useState<NotificationItem | null>(null);

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

  const fetchDashboardData = async () => {
    try {
      setNotifLoading(true);
      // If parent already supplies notifications, reuse them — avoid duplicate /api/profile/notifications
      if (externalNotifications === undefined) {
        const notifRes = await fetch(`/api/profile/notifications/${profile.phone}`);
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData);
        }
      } else {
        setNotifications(externalNotifications);
      }

      // Fetch dynamic active team size calculation
      const refRes = await fetch(`/api/profile/referrals/${profile.phone}`);
      if (refRes.ok) {
        const refData = await refRes.json();
        if (Array.isArray(refData)) {
          setTeamCount(refData.length);
        }
      }
    } catch (e) {
      console.error("Dashboard subsidiary fetch error:", e);
    } finally {
      setNotifLoading(false);
    }
  };

  // Fetch referrals/teamCount only; notifications come from parent when available
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (externalNotifications !== undefined) {
        if (!cancelled) setNotifications(externalNotifications);
      }
      // Throttle referrals fetch to 30s — prevents 115/ navigation spam
      const now = Date.now();
      if (now - lastReferralsFetch.current < 30_000) return;
      lastReferralsFetch.current = now;
      try {
        const refRes = await fetch(`/api/profile/referrals/${profile.phone}`);
        if (!cancelled && refRes.ok) {
          const refData = await refRes.json();
          if (Array.isArray(refData)) setTeamCount(refData.length);
        }
      } catch {}
      if (externalNotifications === undefined) {
        // Only fetch notifications here when parent doesn't provide them
        try {
          const notifRes = await fetch(`/api/profile/notifications/${profile.phone}`);
          if (!cancelled && notifRes.ok) {
            const notifData = await notifRes.json();
            setNotifications(notifData);
          }
        } catch {}
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [profile.phone, externalNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshDashboard();
    await fetchDashboardData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Dynamic Today's Income calculation
  const getKampalaDateStr = () => {
    const d = new Date();
    const kampalaTime = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return kampalaTime.toISOString().split("T")[0];
  };

  const { todayEarnings, totalEarnedAllTime } = (() => {
    const todayStr = getKampalaDateStr();
    let today = 0, total = 0;
    for (const n of activeNodes) {
      total += n.totalEarned || 0;
      if (n.status === "active" && n.lastClaimedDate === todayStr) today += n.dailyYield;
    }
    return { todayEarnings: today, totalEarnedAllTime: total };
  })();

  const dynamicNews = notifications.filter(n => n.category === "news").map(n => ({
    id: n.id,
    title: n.title,
    description: n.message,
    date: new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    tag: n.metadata?.tag || "NEWS",
    imageUrl: n.metadata?.imageUrl || "",
    link: n.metadata?.link || ""
  }));

  const DEFAULT_NEWS_FEED: any[] = [];

  const HUT8_NEWS_FEED = dynamicNews.length > 0 ? dynamicNews : DEFAULT_NEWS_FEED;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HUT8_NEWS_FEED.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [HUT8_NEWS_FEED.length]);

  return (
    <div className="space-y-6 bg-transparent isolate text-[var(--theme-text)] p-1 rounded-2xl relative">
      
      {/* Dynamic Grid for Miner Stats - hut12 bento: 2 hero + 4 compact matching banner bg */}
      <div className="grid grid-cols-2 gap-3">
        {isRefreshing ? (
          <>
            {[...Array(4)].map((_, i) => (
              <MetricCard key={i} title="Loading..." value="" isLoading={true} variant="muted" />
            ))}
          </>
        ) : (
          <>
            {/* Unified earnings: AI Income + Today in one hero translucent bento */}
            <div style={{ transform: "translateZ(0)" }} className="col-span-2 relative overflow-hidden theme-card rounded-[var(--theme-radius)] p-3.5 h-[112px] flex flex-col justify-between bg-[var(--theme-card-bg)]/60 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/10 shadow-sm isolate">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-display uppercase tracking-[0.12em] leading-none block pt-1 font-black text-[var(--theme-primary)]">Product Income</span>
                <div className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden bg-transparent border-0">
                  <img src={money3d} alt="" className="w-11 h-11 object-contain" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0 -mt-1">
                <div className="pr-3">
                  <p className="text-[9px] font-display font-black uppercase tracking-widest opacity-50 leading-none mb-1">Total Overall</p>
                  <p className="font-display font-black text-[15px] sm:text-[16px] text-[var(--theme-text)] leading-none tracking-tight truncate">{formatCurrency(totalEarnedAllTime)}</p>
                </div>
                <div className="pl-3 border-l border-white/10">
                  <p className="text-[9px] font-display font-black uppercase tracking-widest opacity-50 leading-none mb-1">Earnings Today</p>
                  <p className="font-display font-black text-[15px] sm:text-[16px] text-[var(--theme-text)] leading-none tracking-tight truncate">{formatCurrency(todayEarnings)}</p>
                </div>
              </div>
            </div>

            {/* Unified funds: deposits + cashout in one shield card */}
            <div style={{ transform: "translateZ(0)" }} className="col-span-2 relative overflow-hidden theme-card rounded-[var(--theme-radius)] p-3.5 h-[96px] flex flex-col justify-between bg-[var(--theme-card-bg)]/60 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/10 shadow-sm isolate">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-display uppercase tracking-[0.12em] leading-none block pt-1 font-black text-[var(--theme-primary)]">Transactions</span>
                <div className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden bg-transparent border-0">
                  <img src={shield3d} alt="" className="w-11 h-11 object-contain" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0 -mt-1">
                <div className="pr-3">
                  <p className="text-[9px] font-display font-black uppercase tracking-widest opacity-50 leading-none mb-1">Total Deposits</p>
                  <p className="font-display font-black text-[15px] sm:text-[16px] text-[var(--theme-text)] leading-none tracking-tight truncate">{formatCurrency(profile.totalDeposits || 0)}</p>
                </div>
                <div className="pl-3 border-l border-[var(--theme-card-border)]">
                  <p className="text-[9px] font-display font-black uppercase tracking-widest opacity-50 leading-none mb-1">Total Cash Out</p>
                  <p className="font-display font-black text-[15px] sm:text-[16px] text-[var(--theme-text)] leading-none tracking-tight truncate">{formatCurrency(profile.withdrawnCash || 0)}</p>
                </div>
              </div>
            </div>

            <MetricCard
              title="Invite Count"
              value={(teamCount || profile.invitesCount || 0).toLocaleString()}
              icon={<img src={medal3d} alt="" />}
              variant="muted"
            />

            <MetricCard
              title="Invite Income"
              value={formatCurrency(profile.referralRewardsEarned || 0)}
              icon={<img src={gift3d} alt="" />}
              variant="muted"
            />
          </>
        )}
      </div>

      {/* Community — single row, triggers sheet — hut12 theme-aware */}
      <button
        type="button"
        onClick={() => setShowCommunitySheet(true)}
        className="w-full flex items-center gap-3 rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)]/60 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/10 p-3 active:scale-[0.99] transition-colors group text-left cursor-pointer shadow-sm"
      >
        <img src="/telegram.svg" alt="Telegram" className="w-9 h-9 rounded-xl shrink-0 shadow-sm object-contain" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-black text-[var(--theme-text)] leading-none">Community • Official</p>
          <p className="text-[10.5px] font-sans font-bold text-[var(--theme-text)] opacity-60 leading-none mt-1 truncate">Tap to open • {siteConfig?.telegramLink && siteConfig?.whatsappLink ? "Telegram & WhatsApp" : siteConfig?.telegramLink ? "Telegram" : siteConfig?.whatsappLink ? "WhatsApp" : "2.4k online"}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--theme-text)] opacity-40 group-hover:opacity-60 transition-opacity shrink-0" />
      </button>

      {/* Quick Actions — unified presets, container bg removed */}
      <div className="grid grid-cols-2 gap-2 bg-transparent border-0 p-0 shadow-none">
        <Button variant="gold-glossy" size="sm" onClick={onNavigateToDeposit} className="w-full" glow={false}>
          <ArrowDownLeft className="w-4 h-4" />
          <span>Deposit</span>
        </Button>
        <Button variant="gold-matte" size="sm" onClick={onNavigateToWithdraw || onNavigateToDeposit} className="w-full" glow={false}>
          <ArrowUpRight className="w-4 h-4" />
          <span>Withdraw</span>
        </Button>
      </div>

      <FeaturedProducts items={items} onBrowseProducts={onNavigateToCatalog} />

      <AnimatePresence>
        {selectedAlert && (() => {
          let CategoryIcon = Bell;
          let strokeColor = "text-blue-500";
          let badgeBg = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
          
          if (selectedAlert.category === "deposit") {
            CategoryIcon = Coins;
            strokeColor = "text-emerald-400";
            badgeBg = "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
          } else if (selectedAlert.category === "withdraw") {
            CategoryIcon = Smartphone;
            strokeColor = "text-blue-400";
            badgeBg = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
          } else if (selectedAlert.category === "rewards") {
            CategoryIcon = Gift;
            strokeColor = "text-amber-400";
            badgeBg = "bg-amber-500/10 border border-amber-500/20 text-amber-500";
          } else if (selectedAlert.category === "daily accumulation") {
            CategoryIcon = Coins;
            strokeColor = "text-amber-400";
            badgeBg = "bg-amber-500/10 border border-amber-500/20 text-amber-500";
          } else if (selectedAlert.category === "system" || selectedAlert.category === "announcement") {
            CategoryIcon = Bell;
            strokeColor = "text-blue-400";
            badgeBg = "bg-blue-500/10 border border-blue-500/20 text-blue-400";
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
                className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[85vh]"
              >
                {/* Header mimicking the Alert Card */}
                <div className="flex justify-between items-center p-5 bg-slate-900/90 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0 ${strokeColor}`}>
                      <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] uppercase tracking-wider font-mono font-black border px-1.5 py-0.5 rounded ${badgeBg}`}>
                          {(selectedAlert.category === "daily accumulation" || selectedAlert.category === "rewards") ? "rewards" : selectedAlert.category}
                        </span>
                        <span className="text-[12px] font-sans text-slate-500 font-semibold">
                          {new Date(selectedAlert.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-100 mt-1 tracking-tight leading-snug">{selectedAlert.title}</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="p-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors border border-slate-850"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body mimicking the Card layout */}
                <div className="p-6 overflow-y-auto space-y-5">
                  <div className="text-[13.5px] text-slate-300 leading-relaxed space-y-4 font-sans whitespace-pre-line select-text">
                    {renderMessageWithLinks(selectedAlert.message)}
                  </div>

                  {selectedAlert.metadata?.link && (
                    <div className="pt-3">
                      <a
                        href={selectedAlert.metadata.link}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl btn-3d-accent text-white font-sans text-xs font-black uppercase tracking-wider transition-all cursor-pointer w-full justify-center"
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

      {/* Community — liquid glass sheet */}
      <AnimatePresence>
        {showCommunitySheet && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCommunitySheet(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden border border-[var(--theme-card-border)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] bg-[var(--theme-card-bg)]"
            >
              <div className="relative p-5 pb-6">
                <div className="w-10 h-1 rounded-full bg-[var(--theme-card-border)] mx-auto mb-4" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-70">Join our community</h3>
                  <button onClick={() => setShowCommunitySheet(false)} className="w-8 h-8 rounded-full bg-[var(--theme-bg)] hover:opacity-80 flex items-center justify-center text-[var(--theme-text)] opacity-60 transition-colors border border-[var(--theme-card-border)]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {siteConfig?.whatsappLink && (
                    <a href={siteConfig.whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] hover:opacity-80 transition-colors group">
                      <img src="/whatsapp.svg" alt="WhatsApp" className="w-10 h-10 rounded-xl shrink-0 shadow-sm object-contain bg-white p-1" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-black text-[var(--theme-text)] leading-none">WhatsApp Support</span>
                        <span className="block text-[11px] font-bold text-[var(--theme-text)] opacity-60 leading-none mt-1 truncate">{siteConfig.whatsappLink}</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-[var(--theme-text)] opacity-40 group-hover:opacity-60 shrink-0" />
                    </a>
                  )}
                  {siteConfig?.telegramLink && (
                    <a href={siteConfig.telegramLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] hover:opacity-80 transition-colors group">
                      <img src="/telegram.svg" alt="Telegram" className="w-10 h-10 rounded-xl shrink-0 shadow-sm object-contain bg-white p-1" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-black text-[var(--theme-text)] leading-none">Telegram Channel</span>
                        <span className="block text-[11px] font-bold text-[var(--theme-text)] opacity-60 leading-none mt-1 truncate">{siteConfig.telegramLink}</span>
                      </span>
                      <ExternalLink className="w-4 h-4 text-[var(--theme-text)] opacity-40 group-hover:opacity-60 shrink-0" />
                    </a>
                  )}
                  {!siteConfig?.telegramLink && !siteConfig?.whatsappLink && (
                    <p className="text-center text-sm font-bold text-[var(--theme-text)] opacity-60 py-6">No community links configured yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
