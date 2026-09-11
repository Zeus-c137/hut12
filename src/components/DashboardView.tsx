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

import ParticleBg from "./ParticleBg";
import NewsCarousel from "./NewsCarousel";
import MetricCard from "./MetricCard";
import FeaturedProducts from "./FeaturedProducts";
import { useCurrency } from "../currency";

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

  const todayStr = getKampalaDateStr();
  const todayEarnings = activeNodes
    .filter((n) => n.status === "active" && n.lastClaimedDate === todayStr)
    .reduce((sum, n) => sum + n.dailyYield, 0);

  // Total incoming from all nodes all time
  const totalEarnedAllTime = activeNodes
    .reduce((sum, n) => sum + (n.totalEarned || 0), 0);

  const dynamicNews = notifications.filter(n => n.category === "news").map(n => ({
    id: n.id,
    title: n.title,
    description: n.message,
    date: new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    tag: n.metadata?.tag || "NEWS",
    imageUrl: n.metadata?.imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f4ec651?auto=format&fit=crop&q=80&w=600",
    link: n.metadata?.link || ""
  }));

  const DEFAULT_NEWS_FEED = [
    {
      id: "news-1",
      title: "Pilots Multi-MW Energy Infrastructure",
      description: "Securing scalable thermal-neutral grid expansions across state targets to operate massive containerized miner operations yielding record uptime.",
      date: "Today",
      tag: "INFRASTRUCTURE",
      imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "news-2",
      title: "Consolidated Machine Hashrate Exceeds Goals",
      description: "Propelled by next-gen processing hardware firmware optimization, active user machines show a substantial increase in daily margin return.",
      date: "This Week",
      tag: "HASHRATE",
      imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "news-3",
      title: "$150 Million Strategy Fuels Machine Procurement",
      description: "Secured credit facilities to expand our GPU cloud systems, bringing high-yield compute options directly to our community ledger systems.",
      date: "June 2026",
      tag: "EXPANSION",
      imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "news-4",
      title: "Deploys Next-Gen Compute Cluster",
      description: "Launching 1,000+ NVIDIA H100 GPUs to feed enterprise artificial intelligence pipelines and scalable deep learning applications.",
      date: "June 2026",
      tag: "AI CLOUD",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "news-5",
      title: "Strategic Alliance for High Performance Computing",
      description: "Signed multi-year co-location hosting services with a leading sovereign-AI enterprise group to deliver massive parallel execution.",
      date: "June 2026",
      tag: "CO-LOCATION",
      imageUrl: "https://images.unsplash.com/photo-1639762681485-074b7f4ec651?auto=format&fit=crop&q=80&w=600"
    },
    {
      id: "news-6",
      title: "Completes Virtual Power Plant Upgrade",
      description: "Implemented automated demand response algorithms allowing intelligent grid power shedding during peak system loads.",
      date: "June 2026",
      tag: "GRID OPTIMIZATION",
      imageUrl: "https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=600&auto=format&fit=crop&q=80"
    }
  ];

  const HUT8_NEWS_FEED = dynamicNews.length > 0 ? dynamicNews : DEFAULT_NEWS_FEED;

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HUT8_NEWS_FEED.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [HUT8_NEWS_FEED.length]);

  return (
    <div className="space-y-6 select-none bg-transparent text-[var(--theme-text)] p-1 rounded-2xl relative">
      
      {/* Dynamic Grid for Miner Stats - hero/muted hierarchy */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {isRefreshing ? (
          <>
            {[...Array(6)].map((_, i) => (
              <MetricCard key={i} title="Loading..." value="" isLoading={true} variant="muted" />
            ))}
          </>
        ) : (
          <>
            {/* Hero: yield */}
            <MetricCard
              title="AI Income"
              value={formatCurrency(totalEarnedAllTime)}
              titleColor="accent"
              icon={<Cpu />}
              variant="hero"
            />

            <MetricCard
              title="Today's Earnings"
              value={formatCurrency(todayEarnings)}
              titleColor="gold"
              icon={<Zap />}
              variant="hero"
            />

            {/* Muted: secondary stats */}
            <MetricCard
              title="Total Deposits"
              value={formatCurrency(profile.totalDeposits || 0)}
              titleColor="primary"
              icon={<ArrowDownLeft />}
              variant="muted"
            />

            <MetricCard
              title="Total Cash Out"
              value={formatCurrency(profile.withdrawnCash || 0)}
              titleColor="secondary"
              icon={<ArrowUpRight />}
              variant="muted"
            />

            <MetricCard
              title="Invite Count"
              value={(teamCount || profile.invitesCount || 0).toLocaleString()}
              icon={<Users />}
              variant="muted"
            />

            <MetricCard
              title="Invite Income"
              value={formatCurrency(profile.referralRewardsEarned || 0)}
              icon={<Gift />}
              variant="muted"
            />
          </>
        )}
      </div>

      {/* Community — single row, collapsed */}
      <a
        href={siteConfig?.telegramLink || siteConfig?.whatsappLink || "https://t.me/"}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 theme-card border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] rounded-[var(--theme-radius)] p-3 active:scale-[0.99] transition-all group"
      >
        <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.762-.17.712-.433.951-.687.974-.558.052-.982-.367-1.522-.721-.845-.555-1.323-.9-2.143-1.44-.948-.625-.334-.969.207-1.532.142-.147 2.607-2.39 2.654-2.593.006-.026.011-.122-.047-.173s-.144-.034-.206-.02c-.088.02-1.491.95-4.208 2.787-.398.273-.758.407-1.08.399-.356-.008-1.04-.202-1.549-.368-.625-.203-1.121-.311-1.078-.656.022-.18.271-.364.747-.552 2.924-1.274 4.874-2.114 5.852-2.52 2.793-1.157 3.374-1.358 3.753-1.365.083-.001.268.02.388.118.101.083.13.195.143.275.014.088.03.284.016.444z"/></svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-black text-[var(--theme-text)] leading-none">Community • Official</p>
          <p className="text-[10.5px] font-sans font-bold text-[var(--theme-text)] opacity-60 leading-none mt-1 truncate">Telegram • {siteConfig?.telegramLink ? "tap to join" : "2.4k online"}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--theme-text)] opacity-30 group-hover:opacity-60 transition-opacity shrink-0" />
      </a>

      {/* Quick Actions — docked bar */}
      <div className="theme-card border-2 border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] rounded-[var(--theme-radius)] p-1.5 grid grid-cols-2 gap-1.5 shadow-sm">
        <button
          onClick={onNavigateToDeposit}
          className="btn-3d-primary text-white font-display font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-[0_3px_0_0_var(--theme-primary-shadow)]"
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Deposit</span>
        </button>

        <button
          onClick={onNavigateToWithdraw || onNavigateToDeposit}
          className="bg-[var(--theme-bg)] border-2 border-[var(--theme-card-border)] text-[var(--theme-text)] font-display font-black text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer hover:border-[var(--theme-primary)]/30"
        >
          <ArrowUpRight className="w-4 h-4 text-[var(--theme-primary)]" />
          <span>Withdraw</span>
          </button>
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
    </div>
  );
}
