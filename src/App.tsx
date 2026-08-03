/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, SubscriptionItem, SubscribedNode, SystemStats, NotificationItem } from "./types";
import AuthView from "./components/AuthView";
import DashboardView from "./components/DashboardView";
import CatalogView from "./components/CatalogView";
import IncomeView from "./components/IncomeView";
import DepositView from "./components/DepositView";
import ReferralView from "./components/ReferralView";
import ProfileView from "./components/ProfileView";
import ChatView from "./components/ChatView";
import ParticleBg from "./components/ParticleBg";
import AlertsView from "./components/AlertsView";
import AdminView from "./components/AdminView";
import { BrandLogo } from "./components/BrandLogo";
import { toast } from "sonner";
import { useCurrency } from "./currency";

import confetti from "canvas-confetti";
import {
  Sparkles,
  Zap,
  Layers,
  Users,
  MessageCircleMore,
  User,
  LogOut,
  Bot,
  Percent,
  X,
  Coins,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Computer,
  Database,
  BadgeDollarSign,
  Flame,
  Bell,
  Home,
  Cpu,
  Wallet,
  Gift,
  ShoppingCartIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ThemeProvider } from "./context/ThemeContext";

function getVipBadgeConfig(count: number = 0, claimedTasks: string[] = []) {
  const claimedMax = (claimedTasks || []).reduce((max, id) => {
    const num = parseInt(id.replace("vip-", ""), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  let calculatedLevel = 0;
  if (count >= 1000) calculatedLevel = 10;
  else if (count >= 600) calculatedLevel = 9;
  else if (count >= 300) calculatedLevel = 8;
  else if (count >= 150) calculatedLevel = 7;
  else if (count >= 100) calculatedLevel = 6;
  else if (count >= 60) calculatedLevel = 5;
  else if (count >= 30) calculatedLevel = 4;
  else if (count >= 15) calculatedLevel = 3;
  else if (count >= 6) calculatedLevel = 2;
  else if (count >= 2) calculatedLevel = 1;

  const level = Math.max(calculatedLevel, claimedMax);

  const configs: Record<number, { label: string; badgeColor: string }> = {
    0: { label: "VIP 0", badgeColor: "text-slate-400 bg-slate-500/15 border-slate-500/25" },
    1: { label: "VIP 1", badgeColor: "text-amber-500 bg-amber-500/15 border-amber-500/25" },
    2: { label: "VIP 2", badgeColor: "text-slate-400 bg-slate-500/15 border-slate-500/25" },
    3: { label: "VIP 3", badgeColor: "text-yellow-500 bg-yellow-500/15 border-yellow-500/25" },
    4: { label: "VIP 4", badgeColor: "text-sky-500 bg-sky-500/15 border-sky-500/25" },
    5: { label: "VIP 5", badgeColor: "text-teal-500 bg-teal-500/15 border-teal-500/25" },
    6: { label: "VIP 6", badgeColor: "text-blue-500 bg-blue-500/15 border-blue-500/25" },
    7: { label: "VIP 7", badgeColor: "text-pink-500 bg-pink-500/15 border-pink-500/25" },
    8: { label: "VIP 8", badgeColor: "text-rose-500 bg-rose-500/15 border-rose-500/25" },
    9: { label: "VIP 9", badgeColor: "text-fuchsia-500 bg-fuchsia-500/15 border-fuchsia-500/25" },
    10: { label: "VIP 10", badgeColor: "text-red-500 bg-red-500/15 border-red-500/25" },
  };

  return configs[level] || configs[0];
}

export default function App() {
  const { formatCurrency } = useCurrency();
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname.startsWith("/admin/access") || window.location.hash.startsWith("#/admin/access")
  );

  useEffect(() => {
    const handleUrlChange = () => {
      const isAdm = window.location.pathname.startsWith("/admin/access") || window.location.hash.startsWith("#/admin/access");
      setIsAdminRoute(isAdm);
      
      // Enforce session isolation
      if (isAdm) {
        // If entering admin space, clear user session
        localStorage.removeItem("session_phone");
        localStorage.removeItem("referral_miner_session");
        
      } else {
        // If entering user space, clear admin session
        localStorage.removeItem("hut8_admin_active");
      }
    };
    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);
    
    // Initial check
    handleUrlChange();
    
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    let ref = null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      ref = searchParams.get("ref");
      if (!ref) {
        const hashIndex = window.location.hash.indexOf("?");
        if (hashIndex !== -1) {
          const hashParams = new URLSearchParams(window.location.hash.substring(hashIndex));
          ref = hashParams.get("ref");
        }
      }
    } catch (e) {}

    if (ref) {
      localStorage.removeItem("referral_miner_session");
      return null;
    }

    localStorage.removeItem("referral_miner_session");
    return null;
  });
  const [activeTab, setActiveTab] = useState<"dashboard" | "catalog" | "income" | "ai" | "referral" | "chat" | "profile" | "deposit" | "alerts">("dashboard");
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [userNotifications, setUserNotifications] = useState<NotificationItem[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    if (!userProfile?.phone) return false;
    const shown = localStorage.getItem(`welcome_bonus_shown_${userProfile.phone}`);
    return !shown;
  });

  useEffect(() => {
    if (showWelcomeModal) {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [showWelcomeModal]);

  const handleCloseWelcomeModal = () => {
    if (userProfile?.phone) {
      localStorage.setItem(`welcome_bonus_shown_${userProfile.phone}`, "true");
    }
    setShowWelcomeModal(false);
  };

  useEffect(() => {
    if (userProfile?.phone) {
      const todayStr = new Date().toISOString().split("T")[0];
      if (userProfile.lastCheckinDate !== todayStr) {
        const timer = setTimeout(() => {
          setActiveTab("profile");
          toast.info("Reminder: Daily check-in bonus is available now!");
        }, 5 * 60 * 1000); // 5 minutes delay!
        return () => clearTimeout(timer);
      }
    }
  }, [userProfile?.phone]);

  useEffect(() => {
    fetch("/api/config/site")
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setSiteConfig(data);
        }
      })
      .catch(err => console.error("Failed to fetch site config", err));
  }, []);

  useEffect(() => {
    if (siteConfig?.brandName) {
      document.title = siteConfig.brandName;
    }
    if (siteConfig?.logoUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      const url = siteConfig.logoUrl.trim();
      const isSvg = url.toLowerCase().includes("<svg") || url.startsWith("<");
      if (isSvg) {
        link.href = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(url)));
      } else {
        link.href = url;
      }
    }
  }, [siteConfig]);

  const [previousTab, setPreviousTab] = useState<"dashboard" | "catalog" | "income" | "referral" | "chat" | "profile" | "deposit">("dashboard");

  useEffect(() => {
    if (activeTab !== "alerts") {
      setPreviousTab(activeTab as any);
    }
  }, [activeTab]);
  const [chatRoomDefault, setChatRoomDefault] = useState<"shared" | "admin">("shared");
  const [autoOpenWithdraw, setAutoOpenWithdraw] = useState(false);
  const [preselectedGpuRent, setPreselectedGpuRent] = useState<SubscriptionItem | null>(null);
  
  // Pending system award alerts
  const [pendingAwardAlerts, setPendingAwardAlerts] = useState<any[]>([]);
  
  // Data lists
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [activeNodes, setActiveNodes] = useState<SubscribedNode[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | undefined>(undefined);
  
  // State for AI Advisor
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [advisorMessages, setAdvisorMessages] = useState<Array<{ sender: "user" | "advisor"; text: string }>>([]);
  const [advisorInput, setAdvisorInput] = useState("");
  const [isAskingAdvisor, setIsAskingAdvisor] = useState(false);

  useEffect(() => {
    setAdvisorMessages(prev => {
      if (prev.length > 0) return prev;
      return [
        {
          sender: "advisor",
          text: `👋 Hello`
        }
      ];
    });
  }, [siteConfig]);

  // 5-minute inactivity auto sign out for users
  useEffect(() => {
    if (!userProfile || isAdminRoute) return;

    let timeoutId: any;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUserProfile(null);
        localStorage.removeItem("referral_miner_session");
        setActiveTab("dashboard");
        toast.info("You have been signed out due to inactivity.");
      }, 5 * 60 * 1000); // 5 minutes
    };

    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [userProfile, isAdminRoute]);

  // Fetch lists and stats once user is active
  const fetchUserDataAndCatalog = async (phone: string) => {
    try {
      const [itemsRes, subsRes, statsRes, notifRes, profileRes, siteRes] = await Promise.all([
        fetch("/api/items"),
        fetch(`/api/subscriptions/${phone}`),
        fetch("/api/system/stats"),
        fetch(`/api/profile/notifications/${phone}`),
        fetch(`/api/profile/${phone}`),
        fetch("/api/config/site")
      ]);

      if (itemsRes.ok && itemsRes.headers.get("content-type")?.includes("application/json")) {
        setItems(await itemsRes.json());
      }
      if (subsRes.ok && subsRes.headers.get("content-type")?.includes("application/json")) {
        setActiveNodes(await subsRes.json());
      }
      if (statsRes.ok && statsRes.headers.get("content-type")?.includes("application/json")) {
        setSystemStats(await statsRes.json());
      }
      
      if (profileRes.ok && profileRes.headers.get("content-type")?.includes("application/json")) {
        const upProf = await profileRes.json();
        setUserProfile(upProf);
      }

      if (siteRes.ok && siteRes.headers.get("content-type")?.includes("application/json")) {
        const siteData = await siteRes.json();
        if (!siteData.error) setSiteConfig(siteData);
      }

      if (notifRes.ok && notifRes.headers.get("content-type")?.includes("application/json")) {
        const notifs = await notifRes.json();
        setUserNotifications(notifs);
        // Check if any "daily accumulation" notifications are fresh and not yet on-screen alerts dismissed
        const dismissedStr = sessionStorage.getItem("referral_miner_dismissed_alerts") || "[]";
        const dismissedIds = JSON.parse(dismissedStr) as string[];

        const freshAwards = notifs.filter((n: any) =>
          n.type === "daily accumulation" &&
          !dismissedIds.includes(n.id)
        );

        if (freshAwards.length > 0) {
          setPendingAwardAlerts((prev) => {
            // Uniquify
            const existingIds = prev.map((item) => item.id);
            const filteredNew = freshAwards.filter((item: any) => !existingIds.includes(item.id));
            return [...prev, ...filteredNew];
          });
        }
      }
    } catch (e) {
      console.error("Failed to sync backend endpoints:", e);
    }
  };

  useEffect(() => {
    if (userProfile && !isAdminRoute) {
      fetchUserDataAndCatalog(userProfile.phone);
    }
  }, [userProfile?.phone, isAdminRoute]);

  // Periodic automatic sync helper (every 60s)
  useEffect(() => {
    if (!userProfile || isAdminRoute) return;
    const interval = setInterval(() => {
      fetchUserDataAndCatalog(userProfile.phone);
    }, 60000);
    return () => clearInterval(interval);
  }, [userProfile?.phone, isAdminRoute]);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const handleLogout = () => {
    setUserProfile(null);
    localStorage.removeItem("referral_miner_session");
    setActiveTab("dashboard");
    setAdvisorMessages([
      {
        sender: "advisor",
        text: `👋 Hello`
      }
    ]);
  };

  const handleProfileChange = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
  };

  // Callback on successful active subscription activation
  const handleSubscribeSuccess = (newSub: SubscribedNode, costAmt: number) => {
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        rechargeBalance: Math.max(0, (userProfile.rechargeBalance || 0) - costAmt)
      };
      setUserProfile(updatedProfile);
    }
    setActiveNodes((prev) => [newSub, ...prev]);
    // Redirect to Income tab so they can view their machines!
    setActiveTab("income");
    // Refresh system global counts
    fetch("/api/system/stats")
      .then((res) => res.json())
      .then(setSystemStats)
      .catch((e) => console.log(e));
  };

  const handleDepositSuccess = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
  };

  const handleGpuSuccess = (newSub: any, CostAmount: number) => {
    setActiveNodes((prev) => [newSub, ...prev]);
    // Refresh system stats
    handleManualStatsRefresh();
    // Redirect to Income tab
    setActiveTab("income");
  };

  // Callback on manual points claims harvesting succeed
  const handleClaimSuccess = (pointsEarned: number, newBalance: number, subId: string) => {
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        points: newBalance
      };
      setUserProfile(updatedProfile);
    }
    // Update local node yield tracker to reflect earned values & set status to expired without reloading full page
    setActiveNodes((prev) =>
      prev.map((n) =>
        n.id === subId
          ? {
              ...n,
              status: "expired",
              lastClaimedDate: new Date().toISOString().split("T")[0],
              totalEarned: (n.totalEarned || 0) + pointsEarned
            }
          : n
      )
    );
    // Refresh stats from server
    handleManualStatsRefresh();
  };

  // AI Advisor consultation query helper
  const handleAskAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorInput.trim() || isAskingAdvisor) return;

    const userText = advisorInput;
    setAdvisorMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setAdvisorInput("");
    setIsAskingAdvisor(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...advisorMessages, { sender: "user", text: userText }].map((m) => ({
            sender: m.sender,
            text: m.text
          })),
          userProfile,
          activeSubscriptions: activeNodes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Advisor consultation failed.");
      }

      setAdvisorMessages((prev) => [...prev, { sender: "advisor", text: data.text }]);
    } catch (err: any) {
      setAdvisorMessages((prev) => [
        ...prev,
        {
          sender: "advisor",
          text: `⚠️ Undergoing maintenance. (Error: ${err.message})`
        }
      ]);
    } finally {
      setIsAskingAdvisor(false);
    }
  };

  // Refresh whole dashboard
  const handleManualStatsRefresh = async () => {
    if (userProfile) {
      await fetchUserDataAndCatalog(userProfile.phone);
      // Retrieve refreshed profile stats
      try {
        const res = await fetch(`/api/profile/referrals/${userProfile.phone}`);
        if (res.ok) {
          // Trigger silent sync of current balance counts
          const usrSnap = await fetch("/api/system/stats");
          if (usrSnap.ok) {
            const upSt = await usrSnap.json();
            setSystemStats(upSt);
          }
        }
      } catch (err) {
        console.log("Stats reload exception:", err);
      }
    }
  };

  // Render Admin consoles if URL is admin
  if (isAdminRoute) {
    return (
      <ThemeProvider siteConfig={siteConfig}>
        <AdminView />
      </ThemeProvider>
    );
  }

  // Render Auth screens if logged out
  if (!userProfile) {
    return (
      <ThemeProvider siteConfig={siteConfig}>
        <AuthView onAuthSuccess={handleAuthSuccess} siteConfig={siteConfig} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider siteConfig={siteConfig}>
      <div className="relative h-[100dvh] w-full bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans selection:bg-blue-600/35 selection:text-white overflow-hidden flex items-center justify-center p-0 md:p-4">
      

      {/* Welcome Bonus Modal (Theme-preset aware, fires once with confetti) */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs"
              onClick={handleCloseWelcomeModal}
            />
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 225 }}
              className="relative w-full max-w-sm bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-[var(--theme-radius)] p-6 text-center space-y-4 shadow-2xl z-[210] overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[var(--theme-primary)]/15 to-transparent pointer-events-none" />

              <div className="w-16 h-16 rounded-2xl bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/30 mx-auto flex items-center justify-center text-[var(--theme-primary)] relative z-10 shadow-lg animate-bounce">
                <Gift className="w-8 h-8 text-[var(--theme-primary)]" />
              </div>

              <div className="space-y-2 relative z-10">
                <span className="text-[11px] font-sans text-[var(--theme-primary)] font-extrabold uppercase tracking-widest block">WELCOME BONUS UNLOCKED</span>
                <h3 className="font-display font-black text-lg text-[var(--theme-text)] uppercase tracking-tight">Welcome Aboard!</h3>
                <p className="text-xs text-[var(--theme-text)] opacity-80 leading-relaxed font-sans px-1">
                  Your registration is complete! You have received a welcome bonus of <span className="font-black text-[var(--theme-primary)]">UGX {(siteConfig?.welcomeBonus || 10000).toLocaleString()}</span> credited directly to your account.
                </p>
              </div>

              <button
                onClick={handleCloseWelcomeModal}
                className="w-full py-3 bg-[var(--theme-primary)] hover:brightness-110 text-white font-sans font-black text-xs uppercase tracking-wider rounded-[var(--theme-radius)] shadow-lg active:scale-95 transition-all cursor-pointer relative z-10"
              >
                Claim Bonus & Start
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Popups for Fresh Daily Yield Claims (On-Screen Alerts) */}
      <AnimatePresence>
        {pendingAwardAlerts.length > 0 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
            {/* Dark Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => {
                const first = pendingAwardAlerts[0];
                const dismissedStr = sessionStorage.getItem("referral_miner_dismissed_alerts") || "[]";
                const dismissedIds = JSON.parse(dismissedStr) as string[];
                dismissedIds.push(first.id);
                sessionStorage.setItem("referral_miner_dismissed_alerts", JSON.stringify(dismissedIds));
                setPendingAwardAlerts((prev) => prev.slice(1));
              }}
            />
            {/* Card Modal with bouncing reward animation */}
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 225 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center space-y-4 shadow-2xl shadow-blue-500/10 z-[160] overflow-hidden"
            >
              {/* Glowing decorative radial background */}
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />

              {/* Floating Award Trophy Icon styling */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 mx-auto flex items-center justify-center text-slate-950 shadow-md shadow-blue-500/15 relative animate-pulse">
                <Flame className="w-7 h-7 text-white fill-white stroke-[2.5]" />
              </div>

              <div className="space-y-1.5 relative z-10">
                <span className="text-[12px] font-sans text-blue-400 font-extrabold uppercase tracking-wider block">SYSTEM DIVIDEND</span>
                <h3 className="font-display font-black text-md text-slate-100 uppercase tracking-tight">Daily Income Credited!</h3>
                <p className="text-[11.5px] text-slate-300 leading-relaxed font-sans px-2 break-words">
                  {pendingAwardAlerts[0]?.message || pendingAwardAlerts[0]?.payload?.message || "Your daily yield reward has been calculated and transferred to your pocket ledger."}
                </p>
              </div>

              <button
                onClick={() => {
                  const first = pendingAwardAlerts[0];
                  const dismissedStr = sessionStorage.getItem("referral_miner_dismissed_alerts") || "[]";
                  const dismissedIds = JSON.parse(dismissedStr) as string[];
                  dismissedIds.push(first.id);
                  sessionStorage.setItem("referral_miner_dismissed_alerts", JSON.stringify(dismissedIds));
                  setPendingAwardAlerts((prev) => prev.slice(1));
                }}
                className="w-full py-2.5 btn-3d-accent text-white font-sans font-bold text-[11px] select-none cursor-pointer relative z-10"
              >
                Harvest Dividend
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main vertical handset application envelope */}
      <div 
        className="relative w-full max-w-xl md:max-w-3xl h-full md:h-[94vh] md:rounded-[36px] md:border-[8px] md:border-[var(--theme-card-border)] bg-[var(--theme-bg)] flex flex-col overflow-hidden shadow-2xl z-10 font-[var(--theme-font-family)]"
        style={{
          fontFamily: "var(--theme-font-family), 'Plus Jakarta Sans', sans-serif",
          fontSize: "var(--theme-font-base)",
          backgroundImage: siteConfig?.dashboardBgImage ? `url("${siteConfig.dashboardBgImage}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        
        {/* Top Premium navigation Header ribbon */}
        <header className="sticky top-0 z-40 bg-[var(--theme-card-bg)]/85 backdrop-blur-md border-b border-[var(--theme-card-border)] h-16 flex items-center justify-between px-3.5 sm:px-4.5 shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <BrandLogo siteConfig={siteConfig} className="w-8 h-8 mx-auto block" />
            </div>
            <div>
              <span className="font-display font-black text-sm tracking-tight text-[var(--theme-text)] block leading-none mb-1">
                Hi, {userProfile.username || "Miner"}
              </span>
              {(() => {
                const vipBadge = getVipBadgeConfig(userProfile.invitesCount || 0, userProfile.claimedVipTasks || []);
                return (
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${vipBadge.badgeColor}`}>
                    {vipBadge.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Action controllers */}
          <div className="flex items-center gap-2">
            {/* Quick Balance indicator widget */}
            <button
              onClick={() => setActiveTab("profile")}
              className="bg-[var(--theme-bg)]/80 hover:bg-[var(--theme-bg)] border border-[var(--theme-card-border)] px-3 h-8.5 rounded-full flex items-center gap-1.5 text-xs font-sans font-medium transition-all cursor-pointer outline-none text-[var(--theme-text)] shadow-xs"
              title="View account balance and profile settings"
            >
              <Coins className="w-3.5 h-3.5 text-[var(--theme-primary)] fill-[var(--theme-primary)] shrink-0" />
              <span className="text-[var(--theme-primary)] font-sans font-black">{formatCurrency(userProfile.points)}</span>
            </button>

            {/* Notification Bell trigger button */}
            <button
              onClick={() => {
                localStorage.setItem("lastViewedAlertsTime", Date.now().toString());
                setPreviousTab(activeTab);
                setActiveTab("alerts");
              }}
              className="relative p-2 rounded-full text-xs font-sans font-bold flex items-center justify-center border transition-all cursor-pointer outline-none h-8.5 w-8.5 shrink-0 bg-[var(--theme-bg)]/80 border-[var(--theme-card-border)] text-[var(--theme-text)] hover:brightness-110 active:scale-95"
              title="View Alerts & Notifications"
            >
              <Bell className="w-4 h-4 text-[var(--theme-primary)]" />
              {userNotifications.filter(n => new Date(n.timestamp).getTime() > Number(localStorage.getItem("lastViewedAlertsTime") || 0)).length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[var(--theme-card-bg)] shadow-xs animate-bounce">
                    {userNotifications.filter(n => new Date(n.timestamp).getTime() > Number(localStorage.getItem("lastViewedAlertsTime") || 0)).length > 9
                      ? "9+"
                      : userNotifications.filter(n => new Date(n.timestamp).getTime() > Number(localStorage.getItem("lastViewedAlertsTime") || 0)).length}
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping pointer-events-none" />
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main interactive tabs content view block */}
        <main className={`flex-1 scrollbar-none relative min-h-0 flex flex-col ${activeTab === "chat" ? "p-0 overflow-hidden h-full" : "px-1.5 sm:px-2 py-3 overflow-y-auto"}`}>
          <AnimatePresence mode="wait">
            {(activeTab === "dashboard" || (activeTab === "alerts" && previousTab === "dashboard")) && (
              <motion.div
                key="dash"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <DashboardView
                  profile={userProfile}
                  activeNodes={activeNodes}
                  onNavigateToCatalog={() => setActiveTab("catalog")}
                  onNavigateToDeposit={() => {
                    setPreselectedGpuRent(null);
                    setActiveTab("deposit");
                  }}
                  onNavigateToWithdraw={() => {
                    setAutoOpenWithdraw(true);
                    setActiveTab("profile");
                  }}
                  onNavigateToProfile={() => setActiveTab("profile")}
                  onNavigateToAlerts={() => setActiveTab("alerts")}
                  systemStats={systemStats}
                  siteConfig={siteConfig}
                  onRefreshDashboard={handleManualStatsRefresh}
                />
              </motion.div>
            )}

            {(activeTab === "catalog" || (activeTab === "alerts" && previousTab === "catalog")) && (
              <motion.div
                key="cat"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <CatalogView
                  items={items}
                  userProfile={userProfile}
                  siteConfig={siteConfig}
                  activeSubscriptions={activeNodes}
                  onRentWithMmoney={(item) => {
                    setPreselectedGpuRent(item);
                    setActiveTab("deposit");
                  }}
                  onSubscribeSuccess={handleSubscribeSuccess}
                />
              </motion.div>
            )}

            {(activeTab === "income" || (activeTab === "alerts" && previousTab === "income")) && (
              <motion.div
                key="inc"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <IncomeView
                  profile={userProfile}
                  activeNodes={activeNodes}
                  items={items}
                  onNavigateToCatalog={() => setActiveTab("catalog")}
                  onClaimSuccess={handleClaimSuccess}
                  onRenew={(item) => {
                    setPreselectedGpuRent(item);
                    setActiveTab("deposit");
                  }}
                />
              </motion.div>
            )}

            {(activeTab === "deposit" || (activeTab === "alerts" && previousTab === "deposit")) && (
              <motion.div
                key="dep"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <DepositView
                  userProfile={userProfile}
                  items={items}
                  siteConfig={siteConfig}
                  onDepositSuccess={handleDepositSuccess}
                  onGpuSuccess={handleGpuSuccess}
                  preselectedItem={preselectedGpuRent}
                  onBack={() => {
                    setPreselectedGpuRent(null);
                    setActiveTab("profile");
                  }}
                />
              </motion.div>
            )}

            {(activeTab === "referral" || (activeTab === "alerts" && previousTab === "referral")) && (
              <motion.div
                key="ref"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <ReferralView userProfile={userProfile} siteConfig={siteConfig} onBack={() => setActiveTab("profile")} />
              </motion.div>
            )}

            {(activeTab === "chat" || (activeTab === "alerts" && previousTab === "chat")) && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex-1 flex flex-col min-h-0 h-full w-full"
              >
                <ChatView userProfile={userProfile} initialRoom={chatRoomDefault} />
              </motion.div>
            )}

            {(activeTab === "profile" || (activeTab === "alerts" && previousTab === "profile")) && (
              <motion.div
                key="prof"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <ProfileView
                  userProfile={userProfile!}
                  siteConfig={siteConfig}
                  activeNodes={activeNodes}
                  onProfileUpdate={handleProfileChange}
                  onNavigateToDeposit={() => setActiveTab("deposit")}
                  autoOpenWithdraw={autoOpenWithdraw}
                  onCloseAutoWithdraw={() => setAutoOpenWithdraw(false)}
                  onNavigate={(tab, room) => {
                    if (room) {
                      setChatRoomDefault(room);
                    } else {
                      setChatRoomDefault("shared");
                    }
                    setActiveTab(tab);
                  }}
                  onLogout={handleLogout}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Alerts Bottom Sheet Overlay */}
        <AnimatePresence>
          {activeTab === "alerts" && (
            <div className="absolute inset-0 z-50 flex flex-col justify-end overflow-hidden">
              {/* Blur Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.65 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveTab(previousTab)}
                className="absolute inset-0 bg-black/70 backdrop-blur-xs cursor-pointer"
              />
              {/* The Bottom Sheet Body */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="relative w-full h-[85%] bg-[var(--theme-card-bg)] border-t border-[var(--theme-card-border)] rounded-t-[var(--theme-radius)] flex flex-col overflow-hidden z-10 shadow-2xl theme-card"
              >
                {/* Drag Handle shape design */}
                <div className="w-10 h-1.5 bg-[var(--theme-card-border)] rounded-full mx-auto my-3 shrink-0" />
                <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
                  <AlertsView
                    profile={userProfile!}
                    onBack={() => setActiveTab(previousTab)}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* AI Assistant Sheet Overlay - 95% Height Modal Sheet */}
        <AnimatePresence>
          {activeTab === "ai" && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="h-[95vh] max-h-[95vh] w-full max-w-xl mx-auto flex flex-col overflow-hidden bg-[var(--theme-bg)] rounded-t-3xl border-t-2 border-[var(--theme-card-border)] shadow-2xl"
              >
                {/* Drag Handle shape design */}
                <div className="w-12 h-1.5 bg-[var(--theme-card-border)] rounded-full mx-auto my-2.5 shrink-0" />

                {/* Top Header Bar with Close Button */}
                <div className="sticky top-0 z-20 bg-[var(--theme-card-bg)]/95 backdrop-blur-md px-4 py-3 border-b border-[var(--theme-card-border)] flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[var(--theme-radius)] btn-3d-secondary text-[var(--theme-text)] flex items-center justify-center shrink-0 shadow-xs">
                      <Bot className="w-5 h-5 text-[var(--theme-primary)]" />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-sm text-[var(--theme-text)] uppercase tracking-wide">
                        {siteConfig?.brandName || "AI"} Assistant
                      </h3>
                      <p className="text-[11px] text-[var(--theme-text)] opacity-60 font-medium">
                        Automated Mining & Support Consultant
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab(previousTab && previousTab !== "ai" ? previousTab : "dashboard")}
                    className="p-2 rounded-full bg-[var(--theme-card-bg)] text-[var(--theme-text)] hover:opacity-100 cursor-pointer transition-colors border border-[var(--theme-card-border)] shadow-xs active:scale-95"
                    title="Close AI Assistant"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Full Screen Interactive Content */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 max-w-2xl mx-auto w-full">
                  {/* Quick Question Chips */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {["How do daily yields work?", "How to deposit & withdraw?", "What is the referral bonus?"].map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAdvisorInput(q)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] hover:brightness-110 cursor-pointer active:scale-95 transition-all shadow-xs"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {/* Discussion Messages */}
                  <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none pr-1 min-h-0">
                    {advisorMessages.map((m, index) => (
                      <div
                        key={index}
                        className={`flex flex-col space-y-1 max-w-[85%] ${
                          m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="text-[10px] text-[var(--theme-text)] opacity-50 font-bold px-1">
                          {m.sender === "user" ? "You" : `${siteConfig?.brandName || "AI"} Assistant`}
                        </span>
                        <div
                          className={`p-3 text-xs font-sans rounded-2xl leading-relaxed ${
                            m.sender === "user"
                              ? "btn-3d-primary text-white rounded-tr-none"
                              : "btn-3d-secondary text-[var(--theme-text)] rounded-tl-none border border-[var(--theme-card-border)]"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isAskingAdvisor && (
                      <div className="flex items-center gap-2 text-xs text-[var(--theme-primary)] font-bold px-1">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>thinking..</span>
                      </div>
                    )}
                  </div>

                  {/* Consultation Prompt Input Form */}
                  <form onSubmit={handleAskAdvisor} className="flex gap-2 pt-2 shrink-0">
                    <input
                      type="text"
                      required
                      placeholder="Ask how mining claims or payouts work..."
                      value={advisorInput}
                      onChange={(e) => setAdvisorInput(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none focus:border-[var(--theme-primary)] font-sans shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={isAskingAdvisor || !advisorInput.trim()}
                      className="btn-3d-primary px-5 py-3 text-white font-black text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer shrink-0 rounded-[var(--theme-radius)]"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating AI Action Button - Extreme Right Edge Middle Screen */}
        <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={() => {
              if (activeTab !== "ai") {
                setPreviousTab(activeTab);
              }
              setActiveTab("ai");
            }}
            className={`btn-3d-secondary text-[var(--theme-text)] w-11 h-11 rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer group border border-[var(--theme-card-border)] relative ${activeTab === "ai" ? "ring-2 ring-[var(--theme-primary)] scale-105" : ""}`}
            title="AI Assistant"
          >
            <Bot className="w-5 h-5 fill-current text-[var(--theme-primary)] group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </button>
        </div>

        {/* Bottom Tab Bar Navigation - Interactive solid icons with X-axis padding and rounded edges */}
        <div className="w-full px-4 pb-3 pt-1 bg-transparent shrink-0 z-40 select-none">
          <nav className="max-w-md mx-auto theme-card border-2 border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]/95 backdrop-blur-xl rounded-full p-1.5 flex items-center justify-between shadow-xl gap-1">
            {/* Home */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full cursor-pointer transition-all outline-none group ${
                activeTab === "dashboard" ? "scale-105" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === "dashboard" 
                  ? "btn-3d-primary text-white shadow-md" 
                  : "bg-[var(--theme-bg)]/80 text-[var(--theme-text)] opacity-70 group-hover:opacity-100 border border-[var(--theme-card-border)]/50"
              }`}>
                <Home className="w-4.5 h-4.5 shrink-0 fill-current" />
              </div>
              <span className={`text-[10px] font-sans font-extrabold mt-0.5 tracking-tight ${
                activeTab === "dashboard" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-70"
              }`}>
                Home
              </span>
            </button>

            {/* Machines */}
            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full cursor-pointer transition-all outline-none group ${
                activeTab === "catalog" ? "scale-105" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === "catalog" 
                  ? "btn-3d-primary text-white shadow-md" 
                  : "bg-[var(--theme-bg)]/80 text-[var(--theme-text)] opacity-70 group-hover:opacity-100 border border-[var(--theme-card-border)]/50"
              }`}>
                <ShoppingCartIcon className="w-4.5 h-4.5 shrink-0 fill-current" />
              </div>
              <span className={`text-[10px] font-sans font-extrabold mt-0.5 tracking-tight ${
                activeTab === "catalog" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-70"
              }`}>
                Products
              </span>
            </button>

            {/* Income */}
            <button
              onClick={() => setActiveTab("income")}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full cursor-pointer transition-all outline-none group ${
                activeTab === "income" ? "scale-105" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === "income" 
                  ? "btn-3d-primary text-white shadow-md" 
                  : "bg-[var(--theme-bg)]/80 text-[var(--theme-text)] opacity-70 group-hover:opacity-100 border border-[var(--theme-card-border)]/50"
              }`}>
                <Wallet className="w-4.5 h-4.5 shrink-0 fill-current" />
              </div>
              <span className={`text-[10px] font-sans font-extrabold mt-0.5 tracking-tight ${
                activeTab === "income" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-70"
              }`}>
                Income
              </span>
            </button>

            {/* Chat */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full cursor-pointer transition-all outline-none group ${
                activeTab === "chat" ? "scale-105" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === "chat" 
                  ? "btn-3d-primary text-white shadow-md" 
                  : "bg-[var(--theme-bg)]/80 text-[var(--theme-text)] opacity-70 group-hover:opacity-100 border border-[var(--theme-card-border)]/50"
              }`}>
                <MessageCircleMore className="w-4.5 h-4.5 shrink-0 fill-current" />
              </div>
              <span className={`text-[10px] font-sans font-extrabold mt-0.5 tracking-tight ${
                activeTab === "chat" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-70"
              }`}>
                Chat
              </span>
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-full cursor-pointer transition-all outline-none group ${
                activeTab === "profile" ? "scale-105" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                activeTab === "profile" 
                  ? "btn-3d-primary text-white shadow-md" 
                  : "bg-[var(--theme-bg)]/80 text-[var(--theme-text)] opacity-70 group-hover:opacity-100 border border-[var(--theme-card-border)]/50"
              }`}>
                <User className="w-4.5 h-4.5 shrink-0 fill-current" />
              </div>
              <span className={`text-[10px] font-sans font-extrabold mt-0.5 tracking-tight ${
                activeTab === "profile" ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-70"
              }`}>
                Profile
              </span>
            </button>
          </nav>
        </div>



      </div>
    </div>
    </ThemeProvider>
  );
}
