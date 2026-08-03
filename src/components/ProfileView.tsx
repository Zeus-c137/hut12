/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, SubscribedNode } from "../types";
import { usePwaInstall } from "../hooks/usePwaInstall";
import {
  Phone,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  History,
  UserPlus,
  Users,
  MessageSquare,
  Gift,
  CalendarCheck,
  Calendar,
  Lock,
  Download,
  Settings,
  LogOut,
  X,
  Loader2,
  CheckCircle2,
  Crown,
  Flame,
  Check,
  Plus,
  Share2,
  Smartphone,
  Laptop,
  Sparkles,
  Info,
  ChevronRight,
  Coins,
  Cpu,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useCurrency } from "../currency";
import confetti from "canvas-confetti";
import ParticleBg from "./ParticleBg";
import NewsCarousel from "./NewsCarousel";
import VipTasksSheet from "./VipTasksSheet";

interface ProfileViewProps {
  userProfile: UserProfile;
  siteConfig?: any;
  activeNodes?: SubscribedNode[];
  onProfileUpdate: (newProfile: UserProfile) => void;
  onNavigateToDeposit: () => void;
  onNavigate: (tab: "dashboard" | "catalog" | "income" | "referral" | "chat" | "profile" | "deposit" | "alerts", chatRoom?: "shared" | "admin") => void;
  onLogout: () => void;
  autoOpenWithdraw?: boolean;
  onCloseAutoWithdraw?: () => void;
}

export default function ProfileView({
  userProfile,
  siteConfig,
  activeNodes = [],
  onProfileUpdate,
  onNavigateToDeposit,
  onNavigate,
  onLogout,
  autoOpenWithdraw,
  onCloseAutoWithdraw
}: ProfileViewProps) {

  const { formatCurrency, currency } = useCurrency();

  const [showGiftCodeSheet, setShowGiftCodeSheet] = useState(false);
  const [giftCodeValue, setGiftCodeValue] = useState("");
  const [isRedeemingGiftCode, setIsRedeemingGiftCode] = useState(false);

  const [showCheckinSheet, setShowCheckinSheet] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [spinningIndex, setSpinningIndex] = useState<number | null>(null);

  useEffect(() => {
    if (autoOpenWithdraw) {
      setShowWithdrawSheet(true);
      onCloseAutoWithdraw?.();
    }
  }, [autoOpenWithdraw]);

  const {
    isInstalled,
    canInstall,
    isInstallSupported,
    platform,
    install,
  } = usePwaInstall();

  useEffect(() => {
    // Just handle simple initialization if needed
  }, [platform]);

  const getDayIndex = () => {
    const day = new Date().getDay(); // 0 is Sun, 1 is Mon, ... 6 is Sat
    return day === 0 ? 6 : day - 1; // Map 0 (Sun) to 6, 1 to 0, 2 to 1, etc.
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const checkedInToday = userProfile.lastCheckinDate === todayStr;
  const currentStreak = userProfile.checkinStreak || 0;

  useEffect(() => {
    if (!checkedInToday) {
      const timer = setTimeout(() => {
        setShowCheckinSheet(true);
      }, 5 * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [checkedInToday]);

  const baseBonus = (siteConfig?.checkinBaseBonus !== undefined && siteConfig?.checkinBaseBonus !== null) ? siteConfig.checkinBaseBonus : 100;
  const increment = (siteConfig?.checkinIncrement !== undefined && siteConfig?.checkinIncrement !== null) ? siteConfig.checkinIncrement : 50;

  const cycleStartStreak = checkedInToday
    ? currentStreak - ((currentStreak - 1) % 7)
    : currentStreak - (currentStreak % 7) + 1;

  const isDayChecked = (idx: number) => {
    if (checkedInToday) {
      const cyclePosition = (currentStreak - 1) % 7;
      return idx <= cyclePosition;
    } else {
      const nextActiveIdx = currentStreak % 7;
      return idx < nextActiveIdx;
    }
  };

  const isDayActive = (idx: number) => {
    if (checkedInToday) {
      return false;
    } else {
      const nextActiveIdx = currentStreak % 7;
      return idx === nextActiveIdx;
    }
  };

  const totalEarnedThisWeek = [...Array(7)].map((_, idx) => {
    if (isDayChecked(idx)) {
      const dayStreakVal = cycleStartStreak + idx;
      return baseBonus + (dayStreakVal - 1) * increment;
    }
    return 0;
  }).reduce((sum, val) => sum + val, 0);

  const handleRedeemGiftCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftCodeValue) return;
    setIsRedeemingGiftCode(true);
    try {
      const res = await fetch("/api/user/redeem_gift_code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userProfile.phone, code: giftCodeValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to redeem gift code.");
      
      const formattedAmount = formatCurrency(data.amount);
      const formattedNewBalance = formatCurrency(userProfile.points + data.amount);
      
      toast.success(`Redeemed gift code of ${formattedAmount}! New balance: ${formattedNewBalance}`);
      
      // Trigger Confetti!
      try {
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 }
        });
      } catch (confettiErr) {
        console.error("Confetti failed", confettiErr);
      }

      setGiftCodeValue("");
      setTimeout(() => setShowGiftCodeSheet(false), 1500);
      
      // Update profile locally
      onProfileUpdate({
        ...userProfile,
        points: userProfile.points + data.amount
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsRedeemingGiftCode(false);
    }
  };

  const handleCheckin = async () => {
    if (isCheckingIn) return;
    setIsCheckingIn(true);
    const activeIdx = currentStreak % 7;
    setSpinningIndex(activeIdx);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/user/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userProfile.phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to check in.");

      // Ensure spinner runs for at least 1500ms for a premium feel
      const elapsedTime = Date.now() - startTime;
      const minSpinTime = 1500;
      if (elapsedTime < minSpinTime) {
        await new Promise((resolve) => setTimeout(resolve, minSpinTime - elapsedTime));
      }

      const formattedAmount = formatCurrency(data.amount);
      const formattedNewBalance = formatCurrency(userProfile.points + data.amount);
      
      toast.success(`Checked in! You've claimed ${formattedAmount} for Day ${data.streak}! New balance: ${formattedNewBalance}`);
      
      // Trigger Confetti!
      try {
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 }
        });
      } catch (confettiErr) {
        console.error("Confetti failed", confettiErr);
      }

      // Update profile locally
      onProfileUpdate({
        ...userProfile,
        points: userProfile.points + data.amount,
        lastCheckinDate: new Date().toISOString().split("T")[0],
        checkinStreak: data.streak
      });
      setTimeout(() => setShowCheckinSheet(false), 3500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCheckingIn(false);
      setSpinningIndex(null);
    }
  };

  // States to trigger minimal sheets
  const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showVipTasksSheet, setShowVipTasksSheet] = useState(false);

  // Edit Profile form fields
  const [username, setUsername] = useState(userProfile.username || "");
  const [operator, setOperator] = useState<"MTN" | "Airtel">(userProfile.operator || "MTN");
  const [usdtAddress, setUsdtAddress] = useState(userProfile.usdtAddress || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [withdrawalPhone, setWithdrawalPhone] = useState(userProfile.phone || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [successUpdate, setSuccessUpdate] = useState(false);

  // Cashout request form fields
  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawOperator, setWithdrawOperator] = useState<"MTN" | "Airtel" | "USDT">(userProfile.operator || "MTN");

  // Transactions list
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");

  // Sync profile details when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || "");
      setOperator(userProfile.operator || "MTN");
      setUsdtAddress(userProfile.usdtAddress || "");
      setWithdrawalPhone(userProfile.phone || "");
      setWithdrawOperator(userProfile.operator || "MTN");
    }
  }, [userProfile, showSettingsSheet, showWithdrawSheet]);

  // Fetch non-simulated user transaction logs
  const fetchTxHistory = async () => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/profile/transactions/${userProfile.phone}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transaction histories:", err);
    } finally {
      setTxLoading(false);
    }
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessUpdate(false);
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!/^\d{9,10}$/.test(withdrawalPhone)) {
      toast.error("Withdrawal phone number must be 9 or 10 digits.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: userProfile.phone,
          username,
          operator,
          customPhone: withdrawalPhone,
          usdtAddress,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profile ledger update failed.");
      }

      onProfileUpdate(data.profile);
      setSuccessUpdate(true);
      toast.success("Account preferences updated successfully.");
      if (newPassword) {
        setNewPassword("");
        setConfirmPassword("");
        toast.info("Password saved.");
      }
      setTimeout(() => {
        setSuccessUpdate(false);
        setShowSettingsSheet(false);
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to edit user settings.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cash Out
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeNodes || activeNodes.length === 0) {
      toast.error("You must have rented at least one product to qualify for withdrawals.");
      return;
    }

    if (pointsToWithdraw < 10000 || pointsToWithdraw > 5000000) {
      toast.error("Withdrawal amount must be between 10,000 and 5,000,000 Shs.");
      return;
    }

    if (pointsToWithdraw > userProfile.points) {
      toast.error("Insufficient wallet reserves.");
      return;
    }

    if (withdrawOperator === "USDT") {
      if (usdtAddress.length < 10) {
        toast.error("Please enter a valid USDT Wallet address.");
        return;
      }
    } else {
      if (!/^\d{9,10}$/.test(withdrawalPhone)) {
        toast.error("Withdrawal phone number must be 9 or 10 digits.");
        return;
      }
    }

    setIsWithdrawing(true);

    try {
      const res = await fetch("/api/payment/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: userProfile.phone,
          amount: pointsToWithdraw,
          operator: withdrawOperator,
          withdrawPhone: withdrawOperator === "USDT" ? usdtAddress : withdrawalPhone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Cashout disbursement rejected.");
      }

      onProfileUpdate(data.profile);
      toast.success("Withdrawal requested successfully!");
      setPointsToWithdraw(0);
      setTimeout(() => {
        setShowWithdrawSheet(false);
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong during payment processing.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6 select-none bg-transparent text-slate-100 p-1 rounded-2xl relative">
      
      
      
      {/* News Grid */}
      <NewsCarousel phone={userProfile.phone} fullWidth />

      {/* 1. Expanded Account Balance Card with Two Balances: Withdrawable & Account Recharge */}
      <div id="account-balance-card" className="theme-card card-playful-3d rounded-[var(--theme-radius)] p-5 md:p-6 space-y-4 shadow-md border border-[var(--theme-card-border)]">
        
        {/* Dual Balance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Withdrawable Balance */}
          <div className="p-4 rounded-[var(--theme-radius)] bg-[var(--theme-bg)]/60 border border-[var(--theme-card-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0" />
                Withdrawable Balance
              </span>
              <button
                onClick={() => setShowWithdrawSheet(true)}
                className="px-3 py-1 text-[11px] font-display font-black uppercase tracking-wider rounded-full btn-3d-primary text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Withdraw</span>
                <ArrowUpRight className="w-3 h-3 inline" />
              </button>
            </div>
            <p className="text-2xl md:text-3xl font-display font-black text-[var(--theme-text)] tracking-tight">
              <span className="text-xs font-sans text-[var(--theme-text)] opacity-60 font-bold mr-1">{currency === 'USD' ? '$' : 'UGX'}</span>
              <span>{currency === 'USD' ? ((userProfile.points || 0) / 3700).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (userProfile.points || 0).toLocaleString()}</span>
            </p>
            <p className="text-[10px] font-sans text-[var(--theme-text)] opacity-60">
              Daily income, bonuses & rewards
            </p>
          </div>

          {/* Account Recharge Balance */}
          <div className="p-4 rounded-[var(--theme-radius)] bg-[var(--theme-bg)]/60 border border-[var(--theme-card-border)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0" />
                Account Recharge
              </span>
              <button
                onClick={onNavigateToDeposit}
                className="px-3 py-1 text-[11px] font-display font-black uppercase tracking-wider rounded-full btn-3d-primary text-white hover:scale-105 active:scale-95 transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Recharge</span>
                <ArrowDownLeft className="w-3 h-3 inline" />
              </button>
            </div>
            <p className="text-2xl md:text-3xl font-display font-black text-[var(--theme-text)] tracking-tight">
              <span className="text-xs font-sans text-[var(--theme-text)] opacity-60 font-bold mr-1">{currency === 'USD' ? '$' : 'UGX'}</span>
              <span>{currency === 'USD' ? (((userProfile.rechargeBalance || 0)) / 3700).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ((userProfile.rechargeBalance || 0)).toLocaleString()}</span>
            </p>
            <p className="text-[10px] font-sans text-[var(--theme-text)] opacity-60">
              Deposited balance used for renting products
            </p>
          </div>
        </div>

        {/* More Actions Section Header */}
        <h4 className="font-display font-black text-xs uppercase tracking-wider text-[var(--theme-text)] opacity-70 font-extrabold pt-2">
          More Actions
        </h4>

        {/* Integrated Squircle Icon Menu Grid */}
        <div id="quick-action-menu-grid" className="grid grid-cols-4 gap-x-2 gap-y-5 pt-1">
          {/* History */}
          <button
            onClick={() => {
              setShowHistorySheet(true);
              fetchTxHistory();
            }}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-primary rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer">
              <History className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">History</span>
          </button>

          {/* Invite */}
          <button
            onClick={() => onNavigate("referral")}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-primary rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">Invite</span>
          </button>

          {/* VIP Tasks */}
          <button
            onClick={() => setShowVipTasksSheet(true)}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-primary rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">VIP Tasks</span>
          </button>

          {/* Gift Code */}
          <button
            onClick={() => setShowGiftCodeSheet(true)}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-primary rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">Gift Code</span>
          </button>

          {/* Check-in */}
          <button
            onClick={() => setShowCheckinSheet(true)}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-primary rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer">
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">Check-in</span>
          </button>

          {/* Download App */}
          <button
            onClick={async () => {
              if (isInstalled) {
                toast.success("App is already installed and running!");
              } else if (canInstall) {
                const accepted = await install();
                if (!accepted) {
                  toast.info("Installation was cancelled. You can retry from your browser's install menu.");
                }
              } else {
                const instructions = platform === "Safari iOS"
                  ? "Tap Share, then choose Add to Home Screen."
                  : platform === "Safari macOS"
                    ? "Choose Add to Dock from Safari's File menu."
                    : platform === "Firefox"
                      ? "Firefox does not expose an automatic install prompt here. Use Chrome or Edge, or add this page to your bookmarks."
                      : "Open this page in a normal browser tab over HTTPS, then use the install icon in the address bar or browser menu.";
                toast.info(`Automatic install is unavailable in this browser context. ${instructions}`);
              }
            }}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-[var(--theme-radius)] aspect-square text-white shadow-md active:scale-95 transition-all cursor-pointer ${
              isInstalled 
                ? "bg-emerald-600 shadow-emerald-600/10" 
                : "btn-3d-primary"
            }`}>
              {isInstalled ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <Download className="w-5 h-5 text-white animate-bounce" />
              )}
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">
              {isInstalled ? "Installed" : "Install App"}
            </span>
          </button>

          {/* Settings / Account Settings */}
          <button
            onClick={() => {
              setSuccessUpdate(false);
              setShowSettingsSheet(true);
            }}
            className="flex flex-col items-center gap-1.5 focus:outline-none group"
          >
            <div className="w-12 h-12 flex items-center justify-center btn-3d-secondary rounded-[var(--theme-radius)] aspect-square text-[var(--theme-text)] shadow-md active:scale-95 transition-all cursor-pointer border border-[var(--theme-card-border)]">
              <Wallet className="w-5 h-5 text-[var(--theme-text)]" />
            </div>
            <span className="text-[11px] font-sans text-[var(--theme-text)] font-extrabold tracking-wide">Bank Account</span>
          </button>
        </div>

        {/* Defined Logout Button */}
        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={onLogout}
            className="w-full py-3 px-4 rounded-[var(--theme-radius)] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center gap-2 text-xs font-sans font-extrabold transition-all cursor-pointer active:scale-98 shadow-xs"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      
            
            
            {/* Gift Code Modal */}
            <AnimatePresence>
              {showGiftCodeSheet && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowGiftCodeSheet(false)} />
                  <motion.div initial={{ scale: 0.94, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, y: 15, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 350 }} className="relative w-full max-w-[345px] theme-card card-playful-3d bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-[var(--theme-radius)] p-6 shadow-2xl">
                    <button onClick={() => setShowGiftCodeSheet(false)} className="absolute right-4 top-4 text-[var(--theme-text)] opacity-60 hover:opacity-100 p-1.5 rounded-full btn-3d-secondary border border-[var(--theme-card-border)] transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center justify-center mb-5 mt-1">
                      <div className="w-14 h-14 btn-3d-primary text-white rounded-2xl flex items-center justify-center mb-3 shadow-md">
                        <Gift className="w-7 h-7" />
                      </div>
                      <h3 className="text-lg font-display font-black text-[var(--theme-text)] tracking-tight">Gift code</h3>
                      <p className="text-[12px] text-[var(--theme-text)] opacity-70 mt-1 text-center font-sans">Enter your code below</p>
                    </div>
                    <form onSubmit={handleRedeemGiftCode} className="space-y-4">
                      <div>
                        <input
                          type="text"
                          required
                          value={giftCodeValue}
                          onChange={e => setGiftCodeValue(e.target.value.toUpperCase())}
                          placeholder="ENTER CODE"
                          className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] text-sm font-display font-black text-center tracking-[0.2em] text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] uppercase transition-all shadow-inner placeholder-[var(--theme-text)]/40"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isRedeemingGiftCode || !giftCodeValue}
                        className="w-full py-3.5 btn-3d-primary text-white text-xs font-display font-black uppercase tracking-wider rounded-[var(--theme-radius)] transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {isRedeemingGiftCode ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "get gift"}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>



            {/* Daily Check-in Modal (30-Day Calendar matching inspiration screenshot) */}
            <AnimatePresence>
              {showCheckinSheet && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-black/75 backdrop-blur-xs" 
                    onClick={() => setShowCheckinSheet(false)} 
                  />
                  <motion.div 
                    initial={{ scale: 0.94, y: 15, opacity: 0 }} 
                    animate={{ scale: 1, y: 0, opacity: 1 }} 
                    exit={{ scale: 0.94, y: 15, opacity: 0 }} 
                    transition={{ type: "spring", damping: 26, stiffness: 360 }} 
                    className="relative w-full max-w-[440px] max-h-[90vh] bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-[24px] shadow-2xl text-[var(--theme-text)] text-left flex flex-col overflow-hidden backdrop-blur-xl"
                  >
                    {/* Top Banner - Theme Aware */}
                    <div className="theme-card border-b border-[var(--theme-card-border)] px-5 py-3.5 text-[var(--theme-text)] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />
                        </div>
                        <div>
                          <h3 className="font-display font-black text-base leading-tight text-[var(--theme-text)]">Daily Check-In</h3>
                          <p className="text-[11px] text-[var(--theme-text)] font-sans opacity-70">Earn rewards daily</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowCheckinSheet(false)} 
                        className="text-[var(--theme-text)] opacity-60 hover:opacity-100 p-1 rounded-full hover:bg-[var(--theme-bg)] transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 scrollbar-none">
                      {/* Hero Reward Badge */}
                      <div className="flex flex-col items-center justify-center text-center space-y-1.5 pt-1">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Gift className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h4 className="font-display font-extrabold text-xs text-[var(--theme-text)] opacity-90">Today's Reward</h4>
                        <div className="bg-amber-400 text-slate-950 font-display font-black text-xs px-4 py-1 rounded-full shadow-xs">
                          {formatCurrency(baseBonus + (currentStreak > 0 ? (currentStreak - 1) * increment : 0))}
                        </div>
                        <p className="text-[10px] text-[var(--theme-text)] opacity-60 font-sans">
                          Check in every 24 hours
                        </p>
                      </div>

                      {/* Month & Count Header */}
                      {(() => {
                        const now = new Date();
                        const monthName = now.toLocaleString("default", { month: "long" });
                        const year = now.getFullYear();
                        const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate(); // 30 or 31
                        const todayDay = now.getDate(); // 1 to 31
                        const firstDayWeekday = new Date(year, now.getMonth(), 1).getDay(); // 0 (Sun) to 6 (Sat)
                        
                        // Count claimed days this month
                        const claimedCount = Math.min(daysInMonth, userProfile.checkinStreak || (checkedInToday ? 1 : 0));

                        return (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <span className="font-display font-black text-xs text-[var(--theme-text)]">
                                {monthName} {year}
                              </span>
                              <span className="bg-emerald-600 text-white font-sans text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                {claimedCount} / {daysInMonth}
                              </span>
                            </div>

                            {/* Calendar Grid Container */}
                            <div className="bg-[var(--theme-bg)]/50 border border-[var(--theme-card-border)] rounded-2xl p-2.5 space-y-1.5">
                              {/* Weekdays Row */}
                              <div className="grid grid-cols-7 gap-1 text-center font-sans font-bold text-[10px] text-[var(--theme-text)] opacity-60 pb-1">
                                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
                              </div>

                              {/* Days Grid */}
                              <div className="grid grid-cols-7 gap-1">
                                {/* Empty offset slots */}
                                {Array.from({ length: firstDayWeekday }).map((_, i) => (
                                  <div key={`empty-${i}`} className="w-full aspect-square" />
                                ))}

                                {/* Day cards 1 to daysInMonth */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const dayNum = i + 1;
                                  const isPast = dayNum < todayDay;
                                  const isToday = dayNum === todayDay;

                                  // Determine status: claimed, today, missed, future
                                  let isClaimed = false;
                                  let isMissed = false;

                                  if (isPast) {
                                    if (dayNum <= (userProfile.checkinStreak || 0)) {
                                      isClaimed = true;
                                    } else {
                                      isMissed = true;
                                    }
                                  } else if (isToday) {
                                    if (checkedInToday) {
                                      isClaimed = true;
                                    }
                                  }

                                  return (
                                    <div
                                      key={`day-${dayNum}`}
                                      onClick={() => {
                                        if (isToday && !checkedInToday && spinningIndex === null) {
                                          handleCheckin();
                                        }
                                      }}
                                      className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-0.5 relative transition-all select-none text-center ${
                                        isClaimed
                                          ? "bg-emerald-500 border-emerald-600 text-white font-bold shadow-xs"
                                          : isToday && !checkedInToday
                                          ? "bg-amber-400 border-amber-500 text-slate-950 font-black ring-2 ring-amber-400/50 shadow-md animate-pulse cursor-pointer"
                                          : isMissed
                                          ? "bg-rose-500/15 border-rose-500/30 text-rose-500 font-bold opacity-80"
                                          : "bg-[var(--theme-bg)]/60 border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70"
                                      }`}
                                    >
                                      <span className="text-[10px] leading-none mb-0.5">{dayNum}</span>
                                      
                                      {spinningIndex !== null && isToday ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-current" />
                                      ) : isClaimed ? (
                                        <Check className="w-3 h-3 text-white stroke-[3]" />
                                      ) : isToday && !checkedInToday ? (
                                        <Gift className="w-3 h-3 text-slate-950" />
                                      ) : isMissed ? (
                                        <X className="w-2.5 h-2.5 text-rose-500 stroke-[3]" />
                                      ) : (
                                        <Lock className="w-2.5 h-2.5 text-[var(--theme-text)] opacity-40" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Legend Row */}
                      <div className="flex items-center justify-around text-[9.5px] font-sans font-bold pt-0.5">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                          <Check className="w-2.5 h-2.5" /> Claimed
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          <Gift className="w-2.5 h-2.5" /> Today
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500 text-white">
                          <X className="w-2.5 h-2.5" /> Missed
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-500 text-white opacity-80">
                          <Lock className="w-2.5 h-2.5" /> Future
                        </span>
                      </div>

                      {/* Bottom CTA Button */}
                      <div className="pt-1">
                        {checkedInToday ? (
                          <div className="w-full py-3 rounded-full bg-emerald-500/40 text-white text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed select-none">
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Already Claimed</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleCheckin}
                            disabled={spinningIndex !== null}
                            className="btn-3d-primary w-full py-3 rounded-full text-xs font-display font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
                          >
                            {spinningIndex !== null ? (
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <>
                                <Gift className="w-4 h-4 text-white" />
                                <span>Claim Reward Now</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>





{/* ================= SHEETS & DRAWERS OVERLAYS ================= */}

      
      {/* 1. Nice Minimal Withdraw Sheet */}
      <AnimatePresence>
        {showWithdrawSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop - Note: closable only by the X btn, so no onClick close handler here */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Sheet - 92vh height */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-[92vh] max-h-[92vh] bg-[var(--theme-card-bg)] border-t border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-t-[32px] p-6 pb-8 flex flex-col z-10 overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[var(--theme-card-border)] shrink-0">
                <h4 className="font-display font-black text-xl text-[var(--theme-text)] tracking-tight">Withdrawal</h4>
                <button
                  onClick={() => setShowWithdrawSheet(false)}
                  className="btn-3d-secondary p-2 rounded-full border border-[var(--theme-card-border)] text-[var(--theme-text)] cursor-pointer focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Minimalist withdraw form body */}
              <form onSubmit={handleWithdrawal} className="flex-1 flex flex-col justify-between pt-4 pb-2 space-y-6 overflow-y-auto scrollbar-none">
                <div className="space-y-6">
                  {/* Operator 3D Tabs */}
                  <div className="flex gap-2.5 p-1 bg-[var(--theme-bg)]/60 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] mb-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawOperator(userProfile.operator === "Airtel" ? "Airtel" : "MTN")}
                      className={`flex-1 py-3 px-3 rounded-[var(--theme-radius)] font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        withdrawOperator !== "USDT"
                          ? "btn-3d-primary text-white shadow-md"
                          : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                      }`}
                    >
                      <div className="flex -space-x-1 items-center shrink-0">
                        {siteConfig?.mtnLogoUrl && (
                          <img src={siteConfig.mtnLogoUrl} alt="MTN" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                        )}
                        {siteConfig?.airtelLogoUrl && (
                          <img src={siteConfig.airtelLogoUrl} alt="Airtel" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                        )}
                      </div>
                      <span>Mobile Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawOperator("USDT")}
                      className={`flex-1 py-3 px-3 rounded-[var(--theme-radius)] font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        withdrawOperator === "USDT"
                          ? "btn-3d-primary text-white shadow-md"
                          : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                      }`}
                    >
                      {siteConfig?.usdtLogoUrl && (
                        <img src={siteConfig.usdtLogoUrl} alt="USDT" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                      )}
                      <span>USDT (TRC20)</span>
                    </button>
                  </div>

                  {/* Phone / Address input */}
                  <div className="space-y-2">
                    <label className="text-xs font-sans uppercase tracking-wider text-[var(--theme-text)] opacity-70 font-extrabold block">
                      {withdrawOperator === "USDT" ? "USDT Wallet Address" : "Withdrawal Phone Number"}
                    </label>
                    <div className="relative">
                      {withdrawOperator !== "USDT" && <Phone className="w-4 h-4 text-[var(--theme-primary)] absolute left-3 top-3.5" />}
                      <input
                        type={withdrawOperator === "USDT" ? "text" : "tel"}
                        required
                        value={withdrawOperator === "USDT" ? usdtAddress : withdrawalPhone}
                        disabled={withdrawOperator !== "USDT"}
                        readOnly={withdrawOperator !== "USDT"}
                        onChange={(e) => {
                          if (withdrawOperator === "USDT") {
                            setUsdtAddress(e.target.value);
                          }
                        }}
                        className={`w-full ${withdrawOperator === "USDT" ? "px-4" : "pl-9 pr-4"} py-3.5 bg-[var(--theme-bg)]/60 border border-[var(--theme-card-border)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none font-sans font-medium focus:border-[var(--theme-primary)] transition-all`}
                        placeholder={withdrawOperator === "USDT" ? "T..." : "e.g. 0771234567"}
                      />
                    </div>
                  </div>

                  {/* Amount input */}
                  <div className="space-y-2">
                    <label className="text-xs font-sans uppercase tracking-wider text-[var(--theme-text)] opacity-70 font-extrabold block">Amount (UGX)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min={10000}
                        max={5000000}
                        placeholder="Min 10,000 - Max 5,000,000"
                        value={pointsToWithdraw || ""}
                        onChange={(e) => setPointsToWithdraw(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3.5 bg-[var(--theme-bg)]/60 border border-[var(--theme-card-border)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none font-sans font-bold focus:border-[var(--theme-primary)] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setPointsToWithdraw(Math.min(userProfile.points, 5000000))}
                        className="absolute right-2.5 top-2.5 px-3 py-1 btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)] text-[11px] font-display font-black rounded-[var(--theme-radius)] transition-colors cursor-pointer uppercase"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Fee badge & details */}
                  <div className="space-y-2.5 p-4 rounded-[var(--theme-radius)] bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] text-[var(--theme-text)]">
                    <div className="flex justify-between items-center text-xs font-sans">
                      <span className="text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold">Withdraw Fee</span>
                      <span className="px-2.5 py-0.5 bg-[var(--theme-card-bg)] text-[var(--theme-text)] text-[12px] font-display font-black rounded-full border border-[var(--theme-card-border)]">
                        {siteConfig?.withdrawFee || 0}%
                      </span>
                    </div>

                    <div className="border-t border-[var(--theme-card-border)] my-2" />

                    <div className="flex justify-between text-sm font-sans">
                      <span className="text-[var(--theme-text)] font-extrabold">Estimated Payout:</span>
                      <span className="text-[var(--theme-text)] font-black">
                        {formatCurrency(Math.max(0, pointsToWithdraw - Math.floor(pointsToWithdraw * ((siteConfig?.withdrawFee || 0) / 100))))}
                      </span>
                    </div>

                    {withdrawOperator === "USDT" && (
                      <>
                        <div className="flex justify-between text-sm font-sans text-[var(--theme-primary)] font-black border-t border-[var(--theme-card-border)]/50 pt-2 mt-1">
                          <span>USDT Payout:</span>
                          <span>
                            ≈ ${(Math.max(0, pointsToWithdraw - Math.floor(pointsToWithdraw * ((siteConfig?.withdrawFee || 0) / 100))) / (siteConfig?.usdtRate || 3700)).toFixed(2)} USDT
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] font-sans text-[var(--theme-text)] opacity-60">
                          <span>USDT Rate:</span>
                          <span>1 USDT = {formatCurrency((siteConfig?.usdtRate || 3700))}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-xs font-sans text-[var(--theme-text)] opacity-60">
                      <span>Deducted Fee:</span>
                      <span>{formatCurrency(Math.floor(pointsToWithdraw * ((siteConfig?.withdrawFee || 0) / 100)))}</span>
                    </div>
                  </div>

                  {/* Guidelines / ToS block */}
                  <div className="space-y-3 p-4 rounded-[var(--theme-radius)] bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] text-[var(--theme-text)]">
                    <div className="flex gap-2.5 items-start text-[11px] text-[var(--theme-text)] opacity-80 font-sans text-left">
                      <Info className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-[var(--theme-text)] block mb-0.5">1. Processing Time</span>
                        Settlements process automatically in 5 to 30 minutes via Mobile Money or USDT TRC20, active 24/7.
                      </div>
                    </div>
                    <div className="border-t border-[var(--theme-card-border)] my-1" />
                    <div className="flex gap-2.5 items-start text-[11px] text-[var(--theme-text)] opacity-80 font-sans text-left">
                      {activeNodes && activeNodes.length > 0 ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-[var(--theme-text)] block mb-0.5">2. Security Compliance</span>
                            Active product verified. Your withdrawal privilege is fully active.
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-[var(--theme-text)] block mb-0.5">2. Security Regulation</span>
                            You must own at least one active product subscription to execute withdrawals.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  type="submit"
                  disabled={isWithdrawing || pointsToWithdraw < 10000 || pointsToWithdraw > 5000000 || !activeNodes || activeNodes.length === 0}
                  className={`w-full py-3.5 rounded-[var(--theme-radius)] font-display font-black text-xs uppercase tracking-wider transition-all outline-none cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                    pointsToWithdraw >= 10000 && pointsToWithdraw <= Math.min(userProfile.points, 5000000) && activeNodes && activeNodes.length > 0
                      ? "btn-3d-primary text-white shadow-md active:scale-95"
                      : "btn-3d-secondary text-[var(--theme-text)] opacity-50 border border-[var(--theme-card-border)] cursor-not-allowed"
                  }`}
                >
                  {isWithdrawing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : !activeNodes || activeNodes.length === 0 ? (
                    <span>Purchase Product First</span>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 text-white font-bold" />
                      <span>Request Withdrawal</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Nice Minimal Settings Sheet */}
      <AnimatePresence>
        {showSettingsSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsSheet(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Sheet - 85vh max height */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-[85vh] max-h-[85vh] theme-card bg-[var(--theme-card-bg)] border-t border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-t-[var(--theme-radius)] p-6 pb-8 flex flex-col z-10 overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-[var(--theme-card-border)] shrink-0 mb-4">
                <div className="space-y-0.5">
                  <h4 className="font-display font-black text-base text-[var(--theme-text)] uppercase tracking-tight">Bind Account</h4>
                  <p className="text-[12px] font-sans text-[var(--theme-text)] opacity-60">Configure your billing & security</p>
                </div>
                <button
                  onClick={() => setShowSettingsSheet(false)}
                  className="p-1.5 rounded-full btn-3d-secondary border border-[var(--theme-card-border)] text-[var(--theme-text)] cursor-pointer focus:outline-none"
                  id="close-settings-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 flex-1 overflow-y-auto pr-1 pb-16">
                <div className="space-y-1">
                  <label className="text-[12px] font-sans uppercase text-[var(--theme-text)] opacity-70 font-bold block">Display Name</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none font-sans font-medium transition-colors"
                    placeholder="Username display"
                    id="settings-username-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-sans uppercase text-[var(--theme-text)] opacity-70 font-bold block">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[var(--theme-text)] opacity-50 absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={withdrawalPhone}
                      disabled={true} readOnly
                      className="w-full pl-9 pr-4 py-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none font-sans opacity-70"
                      placeholder="+25677..."
                      id="settings-phone-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-sans uppercase text-[var(--theme-text)] opacity-70 font-bold block">USDT Wallet Address (Optional)</label>
                  <div className="relative">
                    <Wallet className="w-3.5 h-3.5 text-[var(--theme-text)] opacity-50 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={usdtAddress}
                      onChange={(e) => setUsdtAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none font-sans transition-colors"
                      placeholder="T..."
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-[var(--theme-card-border)]">
                  <label className="text-[12px] font-sans uppercase text-[var(--theme-text)] opacity-70 font-bold block">Update Password (Optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none font-sans transition-colors"
                    placeholder="New password"
                  />
                </div>
                
                {newPassword && (
                  <div className="space-y-1">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-xs rounded-[var(--theme-radius)] outline-none font-sans transition-colors"
                      placeholder="Confirm new password"
                    />
                  </div>
                )}

                {successUpdate && (
                  <div className="text-center text-[11px] text-emerald-400 font-sans py-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>✓ System settings saved offline!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="w-full py-3 rounded-[var(--theme-radius)] bg-[var(--theme-primary)] hover:brightness-110 text-white font-sans font-bold text-xs shadow-md transition-all cursor-pointer outline-none active:scale-[0.99] flex items-center justify-center"
                >
                  {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Save Account Data"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Transaction History Sheet */}
      <AnimatePresence>
        {showHistorySheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Sheet - 92vh height */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-full max-w-md h-[92vh] max-h-[92vh] bg-[var(--theme-card-bg)] border-t border-[var(--theme-card-border)] text-[var(--theme-text)] rounded-t-[32px] p-6 pb-8 flex flex-col z-10 overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-[var(--theme-card-border)] shrink-0 mb-3">
                <h4 className="font-display font-black text-xl text-[var(--theme-text)] tracking-tight">Transaction History</h4>
                <button
                  onClick={() => setShowHistorySheet(false)}
                  className="btn-3d-secondary p-2 rounded-full border border-[var(--theme-card-border)] text-[var(--theme-text)] cursor-pointer focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none shrink-0">
                {[
                  { id: "all", label: "All" },
                  { id: "deposit", label: "Recharge" },
                  { id: "withdraw", label: "Withdrawal" },
                  { id: "checkin", label: "Check-in" },
                  { id: "referral", label: "Referral" },
                  { id: "voucher", label: "Voucher" },
                  { id: "vip_task", label: "VIP Tasks" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setHistoryFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-display font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                      historyFilter === tab.id
                        ? "btn-3d-primary text-white shadow-md"
                        : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* History listing body */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none pb-4">
                {txLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-primary)]" />
                    <span className="text-xs text-[var(--theme-text)] opacity-70 font-sans font-medium">Syncing transactions...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-20 space-y-2">
                    <AlertTriangle className="w-8 h-8 mx-auto text-[var(--theme-text)] opacity-40" />
                    <span className="text-xs font-sans text-[var(--theme-text)] block font-extrabold uppercase">NO TRANSACTIONS SECURED</span>
                    <p className="text-[12px] text-[var(--theme-text)] opacity-60 max-w-[220px] mx-auto font-sans">No activity found for this category yet.</p>
                  </div>
                ) : (
                  transactions
                    .filter((tx) => {
                      if (historyFilter === "all") return true;
                      const t = (tx.type || "").toLowerCase();
                      if (historyFilter === "deposit") return t === "deposit" || t === "balance" || t === "manual";
                      if (historyFilter === "withdraw") return t === "withdrawal" || t === "withdraw";
                      if (historyFilter === "checkin") return t === "checkin" || t === "checkin_bonus";
                      if (historyFilter === "referral") return t === "referral";
                      if (historyFilter === "voucher") return t === "voucher";
                      if (historyFilter === "vip_task") return t === "vip_task";
                      return true;
                    })
                    .map((tx) => {
                      const t = (tx.type || "").toLowerCase();
                      const isPositive = t === "deposit" || t === "balance" || t === "manual" || t === "checkin" || t === "checkin_bonus" || t === "referral" || t === "voucher" || t === "vip_task" || t === "reward";

                      let badgeLabel = "Transaction";
                      let badgeStyle = "bg-blue-500/15 text-blue-500 border-blue-500/30";
                      let IconComponent = Coins;

                      if (t === "deposit" || t === "balance" || t === "manual") {
                        badgeLabel = "Recharge";
                        badgeStyle = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
                        IconComponent = ArrowDownLeft;
                      } else if (t === "withdrawal" || t === "withdraw") {
                        badgeLabel = "Withdrawal";
                        badgeStyle = "bg-rose-500/15 text-rose-500 border-rose-500/30";
                        IconComponent = ArrowUpRight;
                      } else if (t === "gpu" || t === "subscription") {
                        badgeLabel = "Node Rental";
                        badgeStyle = "bg-blue-500/15 text-blue-500 border-blue-500/30";
                        IconComponent = Cpu;
                      } else if (t === "checkin" || t === "daily accumulation") {
                        badgeLabel = "Daily Check-in";
                        badgeStyle = "bg-amber-500/15 text-amber-500 border-amber-500/30";
                        IconComponent = Flame;
                      } else if (t === "referral") {
                        badgeLabel = "Referral Bonus";
                        badgeStyle = "bg-purple-500/15 text-purple-500 border-purple-500/30";
                        IconComponent = Users;
                      } else if (t === "voucher") {
                        badgeLabel = "Voucher Cut";
                        badgeStyle = "bg-indigo-500/15 text-indigo-500 border-indigo-500/30";
                        IconComponent = Gift;
                      } else if (t === "checkin_bonus" || t === "register") {
                        badgeLabel = "Check-in Bonus";
                        badgeStyle = "bg-teal-500/15 text-teal-500 border-teal-500/30";
                        IconComponent = CheckCircle2;
                      } else if (t === "vip_task") {
                        badgeLabel = "VIP Task";
                        badgeStyle = "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
                        IconComponent = Trophy;
                      }

                      return (
                        <div key={tx.id || Math.random()} className="bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] p-3.5 rounded-[var(--theme-radius)] flex justify-between items-center transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-sans font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeStyle}`}>
                                <IconComponent className="w-3 h-3 inline" />
                                <span>{badgeLabel}</span>
                              </span>
                            </div>

                            {(tx.title || tx.senderPhone || tx.withdrawPhone) && (
                              <p className="text-[12px] text-[var(--theme-text)] font-sans font-bold truncate max-w-[170px] mt-1">
                                {tx.title || tx.withdrawPhone || tx.senderPhone}
                              </p>
                            )}

                            <p className="text-[11px] text-[var(--theme-text)] opacity-60 font-sans font-medium">
                              {new Date(tx.createdAt || tx.timestamp || 0).toLocaleDateString()} at {new Date(tx.createdAt || tx.timestamp || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          <div className="text-right space-y-0.5">
                            <span className={`text-xs font-sans font-black ${isPositive ? "text-emerald-500" : "text-[var(--theme-text)]"}`}>
                              {isPositive ? "+" : "-"} {formatCurrency(tx.amount || 0)}
                            </span>

                            {(tx.operator === "USDT" || tx.withdrawOperator === "USDT" || (tx.senderPhone || "").startsWith("T")) && siteConfig?.usdtRate && (
                              <p className="text-[11px] font-sans text-[var(--theme-primary)] font-bold">
                                ≈ ${((tx.amount || 0) / siteConfig.usdtRate).toFixed(2)} USDT
                              </p>
                            )}

                            <p className={`text-[11px] font-sans font-extrabold ${
                              tx.status === "SUCCESSFUL" ? "text-emerald-500" : tx.status === "PENDING" ? "text-amber-500 animate-pulse" : "text-rose-500"
                            }`}>
                              {tx.status || "COMPLETED"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. VIP Tasks Sheet Overlay */}
      <AnimatePresence>
        {showVipTasksSheet && (
          <VipTasksSheet
            isOpen={showVipTasksSheet}
            onClose={() => setShowVipTasksSheet(false)}
            userProfile={userProfile}
            onClaimSuccess={onProfileUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
