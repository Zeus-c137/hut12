/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, SubscribedNode, SystemStats, NotificationItem } from "../types";
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
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import ParticleBg from "./ParticleBg";
import NewsCarousel from "./NewsCarousel";
import MetricCard from "./MetricCard";
import { useCurrency } from "../currency";

interface DashboardViewProps {
  profile: UserProfile;
  activeNodes: SubscribedNode[];
  onNavigateToCatalog: () => void;
  onNavigateToDeposit: () => void;
  onNavigateToWithdraw?: () => void;
  onNavigateToProfile: () => void;
  onNavigateToAlerts: () => void;
  systemStats?: SystemStats;
  siteConfig?: any;
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
  systemStats,
  siteConfig,
  onRefreshDashboard
}: DashboardViewProps) {
  const { formatCurrency } = useCurrency();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [teamCount, setTeamCount] = useState(0);
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
      // Fetch dynamic non-simulated persistent notifications
      const notifRes = await fetch(`/api/profile/notifications/${profile.phone}`);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData);
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

  useEffect(() => {
    fetchDashboardData();
  }, [profile.phone, activeNodes]);

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
      
      {/* Dynamic Grid for Miner Stats - slim rectangular cards with high negative space */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {isRefreshing ? (
          <>
            {[...Array(6)].map((_, i) => (
              <MetricCard key={i} title="Loading..." value="" isLoading={true} />
            ))}
          </>
        ) : (
          <>
            {/* Card 1: Total Deposits */}
            <MetricCard
              title="Total Deposits"
              value={formatCurrency(profile.totalDeposits || 0)}
              titleColor="primary"
            />

            {/* Card 2: Total Cash Out */}
            <MetricCard
              title="Total Cash Out"
              value={formatCurrency(profile.withdrawnCash || 0)}
              titleColor="secondary"
            />

            {/* Card 3: AI Income */}
            <MetricCard
              title="AI Income"
              value={formatCurrency(totalEarnedAllTime)}
              titleColor="accent"
            />

            {/* Card 4: Today's Earnings */}
            <MetricCard
              title="Today's Earnings"
              value={formatCurrency(todayEarnings)}
            />

            {/* Card 5: Invite Count */}
            <MetricCard
              title="Invite Count"
              value={(teamCount || profile.invitesCount || 0).toLocaleString()}
            />

            {/* Card 6: Invite Income */}
            <MetricCard
              title="Invite Income"
              value={formatCurrency(profile.referralRewardsEarned || 0)}
            />
          </>
        )}
      </div>

      {/* Social Support & Official Community Channels */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <a
          href={siteConfig?.whatsappUrl || siteConfig?.contactWhatsapp || "https://wa.me/"}
          target="_blank"
          rel="noreferrer"
          className="theme-card card-playful-3d rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-3.5 shadow-sm flex items-center gap-3 active:scale-95 transition-all cursor-pointer group hover:border-emerald-500/40"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <svg className="w-5 h-5 text-emerald-500 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
          </div>
          <div>
            <span className="block font-display font-black text-xs uppercase tracking-wide text-[var(--theme-text)] leading-snug">WhatsApp</span>
            <span className="block text-[10px] text-[var(--theme-text)] opacity-60 font-sans">Official Support</span>
          </div>
        </a>

        <a
          href={siteConfig?.telegramUrl || siteConfig?.telegramGroupUrl || "https://t.me/"}
          target="_blank"
          rel="noreferrer"
          className="theme-card card-playful-3d rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-3.5 shadow-sm flex items-center gap-3 active:scale-95 transition-all cursor-pointer group hover:border-sky-500/40"
        >
          <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0 border border-sky-500/30">
            <svg className="w-5 h-5 text-sky-500 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.762-.17.712-.433.951-.687.974-.558.052-.982-.367-1.522-.721-.845-.555-1.323-.9-2.143-1.44-.948-.625-.334-.969.207-1.532.142-.147 2.607-2.39 2.654-2.593.006-.026.011-.122-.047-.173s-.144-.034-.206-.02c-.088.02-1.491.95-4.208 2.787-.398.273-.758.407-1.08.399-.356-.008-1.04-.202-1.549-.368-.625-.203-1.121-.311-1.078-.656.022-.18.271-.364.747-.552 2.924-1.274 4.874-2.114 5.852-2.52 2.793-1.157 3.374-1.358 3.753-1.365.083-.001.268.02.388.118.101.083.13.195.143.275.014.088.03.284.016.444z"/>
            </svg>
          </div>
          <div>
            <span className="block font-display font-black text-xs uppercase tracking-wide text-[var(--theme-text)] leading-snug">Telegram</span>
            <span className="block text-[10px] text-[var(--theme-text)] opacity-60 font-sans">Community Group</span>
          </div>
        </a>
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-2.5 pt-1">
        <h3 className="font-display font-black text-xs uppercase tracking-wider text-[var(--theme-text)] opacity-70 px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onNavigateToDeposit}
            className="btn-3d-primary text-white font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-[var(--theme-radius)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <ArrowDownLeft className="w-4 h-4 inline" />
            <span>Recharge</span>
          </button>

          <button
            onClick={onNavigateToWithdraw || onNavigateToDeposit}
            className="btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)] font-display font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-[var(--theme-radius)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <ArrowUpRight className="w-4 h-4 inline text-[var(--theme-primary)]" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

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
