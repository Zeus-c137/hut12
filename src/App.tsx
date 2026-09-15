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
import WithdrawView from "./components/WithdrawView";
import ReferralView from "./components/ReferralView";
import ProfileView from "./components/ProfileView";
import ChatView from "./components/ChatView";
import TransactionHistoryView from "./components/TransactionHistoryView";
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
  Bell,
  Home,
  History,
  Cpu,
  Wallet,
  Gift,
  ShoppingCartIcon,
  DollarSignIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ThemeProvider } from "./context/ThemeContext";
import { readApiJson } from "./utils/api";
import { useChatUnread } from "./hooks/useChatUnread";

function getVipBadgeConfig(level: number = 0) {
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

  if (level <= 0) return configs[0];
  if (configs[level]) return configs[level];
  return {
    label: `VIP ${level}`,
    badgeColor: "text-[var(--theme-primary)] bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]/25"
  };
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
        // User sessions are HttpOnly cookies and are deliberately not copied
        // into localStorage. AdminView validates its own separate cookie.
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

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // The server owns the signed HttpOnly cookie. Restore the profile from it
  // before rendering the login screen, so a refresh is not treated as logout.
  useEffect(() => {
    if (isAdminRoute) {
      setIsRestoringSession(false);
      return;
    }

    let cancelled = false;
    setIsRestoringSession(true);
    fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store"
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!cancelled && data?.authenticated && data.profile) {
          setUserProfile(data.profile);
        }
      })
      .catch((error) => {
        if (!cancelled) console.warn("Unable to restore the user session:", error);
      })
      .finally(() => {
        if (!cancelled) setIsRestoringSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "catalog" | "income" | "history" | "ai" | "referral" | "chat" | "profile" | "deposit" | "withdraw" | "alerts">("dashboard");
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const chatUnread = useChatUnread(userProfile?.phone);
  const [vipBadgeLevel, setVipBadgeLevel] = useState(0);
  const [userNotifications, setUserNotifications] = useState<NotificationItem[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeBonusAmount, setWelcomeBonusAmount] = useState(0);

  // Only a successful registration creates this handoff. A normal login has
  // no pending key, so returning users never see the welcome modal.
  useEffect(() => {
    if (!userProfile?.phone) {
      setShowWelcomeModal(false);
      setWelcomeBonusAmount(0);
      return;
    }

    const welcomeKey = `pending_welcome_bonus_${userProfile.phone}`;
    let pendingBonus: { amount?: number; issuedAt?: number } | null = null;
    try {
      const rawPendingBonus = sessionStorage.getItem(welcomeKey);
      pendingBonus = rawPendingBonus ? JSON.parse(rawPendingBonus) : null;
    } catch {
      pendingBonus = null;
    }

    const amount = Number(pendingBonus?.amount || 0);
    const issuedAt = Number(pendingBonus?.issuedAt || 0);
    const isFreshHandoff = issuedAt > 0 && Date.now() - issuedAt <= 15 * 60 * 1000;
    if (amount <= 0 || !isFreshHandoff) {
      sessionStorage.removeItem(welcomeKey);
      setShowWelcomeModal(false);
      setWelcomeBonusAmount(0);
      return;
    }

    setWelcomeBonusAmount(amount);
    setShowWelcomeModal(false);
    const timer = window.setTimeout(() => {
      setShowWelcomeModal(true);
    }, 30_000);

    return () => window.clearTimeout(timer);
  }, [userProfile?.phone]);

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
      sessionStorage.removeItem(`pending_welcome_bonus_${userProfile.phone}`);
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

  // Hidden override fix: refetch siteConfig when admin saves (same tab via custom event + other tabs via storage)
  useEffect(() => {
    const refresh = () => {
      fetch("/api/config/site")
        .then(r => r.json())
        .then(data => { if (!data.error) setSiteConfig(data); })
        .catch(() => {});
    };
    const onStorage = (e: StorageEvent) => { if (e.key === "siteConfigUpdatedAt") refresh(); };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("siteConfigUpdated", onCustom as any);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("siteConfigUpdated", onCustom as any);
      window.removeEventListener("focus", refresh);
    };
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

  const [previousTab, setPreviousTab] = useState<"dashboard" | "catalog" | "income" | "history" | "referral" | "chat" | "profile" | "deposit" | "withdraw">("dashboard");

  useEffect(() => {
    if (activeTab !== "alerts") {
      setPreviousTab(activeTab as any);
    }
  }, [activeTab]);
  const [chatRoomDefault, setChatRoomDefault] = useState<"shared" | "admin">("shared");
  const [autoOpenWithdraw, setAutoOpenWithdraw] = useState(false);
  const [preselectedGpuRent, setPreselectedGpuRent] = useState<SubscriptionItem | null>(null);
  
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
  const revokeUserSession = () => {
    void fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store"
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!userProfile || isAdminRoute) return;

    let timeoutId: any;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        revokeUserSession();
        setUserProfile(null);
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
      const [itemsRes, subsRes, statsRes, notifRes, profileRes, siteRes, vipRes] = await Promise.all([
        fetch("/api/items"),
        fetch(`/api/subscriptions/${phone}`),
        fetch("/api/system/stats"),
        fetch(`/api/profile/notifications/${phone}`),
        fetch(`/api/profile/${phone}`),
        fetch("/api/config/site"),
        fetch(`/api/profile/vip-tasks/${encodeURIComponent(phone)}`)
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
        if (upProf) setUserProfile(upProf);
      }

      if (siteRes.ok && siteRes.headers.get("content-type")?.includes("application/json")) {
        const siteData = await siteRes.json();
        if (!siteData.error) setSiteConfig(siteData);
      }

      if (vipRes.ok && vipRes.headers.get("content-type")?.includes("application/json")) {
        const vipData = await vipRes.json();
        setVipBadgeLevel(Number(vipData?.vipLevel || 0));
      } else if (!vipRes.ok) {
        setVipBadgeLevel(0);
      }

      if (notifRes.ok && notifRes.headers.get("content-type")?.includes("application/json")) {
        const notifs = await notifRes.json();
        setUserNotifications(notifs);
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
    if (userProfile?.phone) {
      sessionStorage.removeItem(`pending_welcome_bonus_${userProfile.phone}`);
    }
    setUserProfile(null);
    setVipBadgeLevel(0);
    revokeUserSession();
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
    fetch(`/api/profile/vip-tasks/${encodeURIComponent(newProfile.phone)}`)
      .then((response) => readApiJson<{ vipLevel?: number }>(response))
      .then((board) => setVipBadgeLevel(Number(board.vipLevel || 0)))
      .catch(() => undefined);
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

  const renderContent = () => {
    if (!isAdminRoute && isRestoringSession) {
      return (
        <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] font-[var(--theme-font-family)] flex items-center justify-center">
          <div className="theme-card border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] px-5 py-4 text-sm opacity-75">
            Restoring your session…
          </div>
        </div>
      );
    }

    if (isAdminRoute) {
      return <AdminView />;
    }

    if (!userProfile) {
      return <AuthView onAuthSuccess={handleAuthSuccess} siteConfig={siteConfig} />;
    }

    return null; // main content rendered below
  };

  const isMainApp = !isAdminRoute && !isRestoringSession && !!userProfile;

  return (
    <ThemeProvider siteConfig={siteConfig}>
      {!isMainApp ? renderContent() : (
      <div className="relative h-[100dvh] w-full bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans selection:bg-blue-600/35 selection:text-white overflow-hidden flex items-center justify-center p-0 md:p-4">
      

      {/* Welcome Bonus Modal: the registration bonus is already credited server-side. */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[var(--theme-text)]/45 backdrop-blur-sm"
              onClick={handleCloseWelcomeModal}
            />
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: -15, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 225 }}
              className="relative w-full max-w-sm theme-card border-2 border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-[var(--theme-radius)] p-6 pt-7 text-center space-y-4 shadow-2xl z-[210] overflow-hidden font-[var(--theme-font-family)]"
            >
              <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-[var(--theme-primary)]/20 to-transparent pointer-events-none" />

              <button
                type="button"
                onClick={handleCloseWelcomeModal}
                aria-label="Close welcome message"
                className="absolute right-3 top-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--theme-bg)]/80 border border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100 active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 mx-auto flex items-center justify-center text-[var(--theme-primary)] relative z-10 shadow-lg">
                <Gift className="w-8 h-8 text-[var(--theme-primary)]" />
              </div>

              <div className="space-y-2 relative z-10">
                {/* <span className="text-[11px] font-[var(--theme-font-family)] text-[var(--theme-primary)] font-extrabold uppercase tracking-widest block">WELCOME BONUS CREDITED</span> */}
                <h3 className="font-display font-black text-lg text-[var(--theme-text)] uppercase tracking-tight">Welcome!</h3>
                <p className="text-xs text-[var(--theme-text)] opacity-80 leading-relaxed font-[var(--theme-font-family)] px-1">
                  Your registration is complete! You have received a welcome bonus of <span className="font-black text-[var(--theme-primary)]">UGX {welcomeBonusAmount.toLocaleString()}</span> credited directly to your account.
                </p>
              </div>

              <div className="relative z-10 flex items-center justify-center gap-2 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-bg)] px-3 py-2.5 text-[11px] font-[var(--theme-font-family)] font-bold text-[var(--theme-text)] opacity-80">
                <DollarSignIcon className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>Automatically added to your withdrawable balance</span>
              </div>
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
                const vipBadge = getVipBadgeConfig(vipBadgeLevel);
                return (
                  <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${vipBadge.badgeColor}`}>
                    {vipBadge.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Action controllers */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Copilot — header, next to bell */}
            <button
              onClick={() => {
                if (activeTab !== "ai") setPreviousTab(activeTab as any);
                setActiveTab("ai");
              }}
              className={`relative p-2 rounded-xl text-xs font-sans font-bold flex items-center justify-center border-2 transition-all cursor-pointer outline-none h-9 w-9 shrink-0 shadow-sm active:scale-95 ${activeTab==="ai" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)]" : "bg-[var(--theme-card-bg)] border-[var(--theme-card-border)] text-[var(--theme-primary)] hover:brightness-105"}`}
              title="AI Assistant"
            >
              <Bot className={`w-4.5 h-4.5 ${activeTab==="ai" ? "text-white" : "text-[var(--theme-primary)]"}`} />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-[var(--theme-card-bg)]"></span>
              </span>
            </button>

            {/* Notification Bell trigger button */}
            <button
              onClick={() => {
                localStorage.setItem("lastViewedAlertsTime", Date.now().toString());
                setPreviousTab(activeTab as any);
                setActiveTab("alerts");
              }}
              className="relative p-2 rounded-xl text-xs font-sans font-bold flex items-center justify-center border-2 transition-all cursor-pointer outline-none h-9 w-9 shrink-0 bg-[var(--theme-card-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] hover:brightness-105 active:scale-95 shadow-sm"
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
        <main className={`flex-1 relative min-h-0 flex flex-col ${activeTab === "chat" ? "p-0 overflow-hidden h-full" : "px-1.5 sm:px-2 py-3 overflow-y-auto overscroll-contain"}`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                  onNavigateToWithdraw={() => setActiveTab("withdraw")}
                  onNavigateToProfile={() => setActiveTab("profile")}
                  onNavigateToAlerts={() => setActiveTab("alerts")}
                  items={items}
                  systemStats={systemStats}
                  siteConfig={siteConfig}
                  notifications={userNotifications}
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

            {(activeTab === "history" || (activeTab === "alerts" && previousTab === "history")) && (
              <motion.div
                key="hist"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <TransactionHistoryView phone={userProfile.phone} siteConfig={siteConfig} onBack={() => setActiveTab("profile")} />
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

            {(activeTab === "withdraw" || (activeTab === "alerts" && previousTab === "withdraw")) && (
              <motion.div
                key="wit"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <WithdrawView
                  userProfile={userProfile}
                  siteConfig={siteConfig}
                  activeNodes={activeNodes}
                  onBack={() => setActiveTab("profile")}
                  onProfileUpdate={handleProfileChange}
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
                <ChatView userProfile={userProfile} initialRoom={chatRoomDefault} canUpload={userProfile.phone === siteConfig?.adminPhone} />
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
                  notifications={userNotifications}
                  onProfileUpdate={handleProfileChange}
                  onNavigateToDeposit={() => setActiveTab("deposit")}
                  onNavigateToWithdraw={() => setActiveTab("withdraw")}
                  autoOpenWithdraw={autoOpenWithdraw}
                  onCloseAutoWithdraw={() => setAutoOpenWithdraw(false)}
                  onNavigate={(tab, room) => {
                    if (room) {
                      setChatRoomDefault(room);
                    } else {
                      setChatRoomDefault("shared");
                    }
                    setActiveTab(tab as any);
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
                    initialNotifications={userNotifications}
                    onBack={() => setActiveTab(previousTab)}
                    onNotificationsChange={setUserNotifications}
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

        {/* Bottom Tab Bar — First stab: angular, chunky, Duolingo-playful, not a pill */}
        <div className="w-full px-0 pb-0 pt-0 bg-transparent shrink-0 z-40 select-none">
          <nav className="w-full max-w-xl mx-auto bg-[var(--theme-card-bg)] border-t-[3px] border-[var(--theme-card-border)] rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] px-1.5 sm:px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-1">
            {/* Home */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "dashboard" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <Home className="w-5 h-5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">Home</span>
            </button>

            {/* Products */}
            <button
              onClick={() => setActiveTab("catalog")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "catalog" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <ShoppingCartIcon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">Products</span>
            </button>

            {/* Income */}
            <button
              onClick={() => setActiveTab("income")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "income" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">Income</span>
            </button>

            {/* History — NEW */}
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "history" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <History className="w-5 h-5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">History</span>
            </button>

            {/* Chat */}
            <button
              onClick={() => setActiveTab("chat")}
              className={`relative flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "chat" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <MessageCircleMore className="w-5 h-5 shrink-0" />
              {chatUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[var(--theme-bg)]">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">Chat</span>
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border-2 transition-all active:scale-95 ${activeTab === "profile" ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-[0_4px_0_0_var(--theme-primary-shadow)] -translate-y-1" : "bg-[var(--theme-bg)] border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100"}`}
            >
              <User className="w-5 h-5 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-display font-black uppercase tracking-wide leading-none">Profile</span>
            </button>
          </nav>
        </div>



      </div>
    </div>
      )}
    </ThemeProvider>
  );
}
