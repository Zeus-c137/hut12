import React, { useState, useEffect } from "react";
import { UserProfile, ReferralStat } from "../types";
import { X, Crown, Award, CheckCircle2, Trophy, Flame, Coins, Sparkles, RefreshCw, Lock, Star, Rocket, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCurrency } from "../currency";

interface VipTasksSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onClaimSuccess: (updatedProfile: UserProfile) => void;
}

interface VipTaskTier {
  id: string;
  level: number;
  required: number;
  reward: number;
  badgeColor: string;
  glowColor: string;
}

const VIP_TASKS_CONFIG: VipTaskTier[] = [
  { id: "vip-0", level: 0, required: 0, reward: 0, badgeColor: "text-slate-400 bg-slate-500/15 border-slate-500/25", glowColor: "from-slate-400/20 to-transparent" },
  { id: "vip-1", level: 1, required: 2, reward: 20000, badgeColor: "text-amber-500 bg-amber-500/15 border-amber-500/25", glowColor: "from-amber-500/20 to-transparent" },
  { id: "vip-2", level: 2, required: 6, reward: 50000, badgeColor: "text-slate-400 bg-slate-500/15 border-slate-500/25", glowColor: "from-slate-400/20 to-transparent" },
  { id: "vip-3", level: 3, required: 15, reward: 100000, badgeColor: "text-yellow-500 bg-yellow-500/15 border-yellow-500/25", glowColor: "from-yellow-500/20 to-transparent" },
  { id: "vip-4", level: 4, required: 30, reward: 200000, badgeColor: "text-sky-500 bg-sky-500/15 border-sky-500/25", glowColor: "from-sky-500/20 to-transparent" },
  { id: "vip-5", level: 5, required: 60, reward: 400000, badgeColor: "text-teal-500 bg-teal-500/15 border-teal-500/25", glowColor: "from-teal-500/20 to-transparent" },
  { id: "vip-6", level: 6, required: 100, reward: 800000, badgeColor: "text-blue-500 bg-blue-500/15 border-blue-500/25", glowColor: "from-blue-500/20 to-transparent" },
  { id: "vip-7", level: 7, required: 150, reward: 1600000, badgeColor: "text-pink-500 bg-pink-500/15 border-pink-500/25", glowColor: "from-pink-500/20 to-transparent" },
  { id: "vip-8", level: 8, required: 300, reward: 4000000, badgeColor: "text-rose-500 bg-rose-500/15 border-rose-500/25", glowColor: "from-rose-500/20 to-transparent" },
  { id: "vip-9", level: 9, required: 600, reward: 10000000, badgeColor: "text-fuchsia-500 bg-fuchsia-500/15 border-fuchsia-500/25", glowColor: "from-fuchsia-500/20 to-transparent" },
  { id: "vip-10", level: 10, required: 1000, reward: 50000000, badgeColor: "text-red-500 bg-red-500/15 border-red-500/25", glowColor: "from-red-500/20 to-transparent" }
];

export default function VipTasksSheet({ isOpen, onClose, userProfile, onClaimSuccess }: VipTasksSheetProps) {
  const { formatCurrency } = useCurrency();
  const [referrals, setReferrals] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchReferralsList = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/profile/referrals/${userProfile.phone}`);
      if (res.ok) {
        const data = await res.json();
        setReferrals(data);
      }
    } catch (err) {
      console.error("Error loading referral stats list for VIP logic:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReferralsList();
    }
  }, [isOpen, userProfile.phone]);

  if (!isOpen) return null;

  // Compute verified referral active products count (sum of all active product nodes activated by referrals)
  const verifiedCount = referrals.reduce((sum, r) => {
    const activeCount = (r as any).activeProductsCount !== undefined 
      ? (r as any).activeProductsCount 
      : (r.itemCategory && r.itemCategory !== "None" && r.itemCategory !== "No Active Node" && r.itemCategory !== "No Active Product" && r.itemCategory !== "Free tier" ? 1 : 0);
    return sum + activeCount;
  }, 0);
  const totalReferralsJoin = referrals.length;

  const handleClaimReward = async (taskId: string, rewardAmount: number) => {
    try {
      setClaimingId(taskId);
      const res = await fetch("/api/profile/vip-tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userProfile.phone, taskId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim exclusive VIP reward.");
      }

      toast.success(`Success! VIP reward of ${formatCurrency(rewardAmount)} added to ledger.`);
      
      const updatedProfile: UserProfile = {
        ...userProfile,
        points: userProfile.points + rewardAmount,
        claimedVipTasks: data.claimedVipTasks || [...(userProfile.claimedVipTasks || []), taskId]
      };
      onClaimSuccess(updatedProfile);

    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setClaimingId(null);
    }
  };

  const claimedTasks = userProfile.claimedVipTasks || [];

  // Determine active VIP milestone level based on verifiedCount
  const nextMilestoneTier = VIP_TASKS_CONFIG.find(t => verifiedCount < t.required) || VIP_TASKS_CONFIG[VIP_TASKS_CONFIG.length - 1];
  const activeLevelNumber = VIP_TASKS_CONFIG.filter(t => verifiedCount >= t.required).length;
  const xpProgressPct = Math.min((verifiedCount / nextMilestoneTier.required) * 100, 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xs"
      />
      
      {/* Drawer Body - Theme-Aware 85vh sheet */}
      <motion.div
        initial={{ y: "100%", x: "-50%" }}
        animate={{ y: 0, x: "-50%" }}
        exit={{ y: "100%", x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="absolute bottom-0 left-1/2 w-full max-w-md h-[85vh] bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-t border-[var(--theme-card-border)] rounded-t-[32px] flex flex-col z-10 overflow-hidden select-none text-left shadow-2xl"
      >
        {/* Header ribbon block */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--theme-card-border)] flex items-center justify-between shrink-0 bg-[var(--theme-card-bg)] relative z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-500">
              <Trophy className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h4 className="font-display font-extrabold text-base text-[var(--theme-text)] uppercase tracking-tight">VIP Taskboard</h4>
              <p className="text-[11px] text-[var(--theme-text)] opacity-60">Unlock cash prizes for verified machine invites</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-70 hover:opacity-100 cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-none pb-20 relative z-10">
          
          {/* Level XP Progress Box */}
          <div className="p-3.5 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black text-[var(--theme-text)]">
                  Level {activeLevelNumber}: VIP Tier
                </span>
              </div>
              <span className="text-xs font-sans font-black text-[var(--theme-primary)]">
                {verifiedCount} / {nextMilestoneTier.required} Verified Machines
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-full h-3 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-secondary)] to-amber-500 rounded-full shadow-xs"
              />
            </div>

            {/* Badges Grid (VIP Tiers 0-10) */}
            <div className="pt-1 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
              {VIP_TASKS_CONFIG.map((tier) => {
                const isAchieved = verifiedCount >= tier.required;
                return (
                  <div key={tier.id} className="flex flex-col items-center gap-1 shrink-0">
                    <div className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center text-[11px] font-black transition-all ${
                      isAchieved
                        ? "bg-[var(--theme-primary)] text-white shadow-md scale-105"
                        : "bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] opacity-40"
                    }`}>
                      {tier.level}
                    </div>
                    <span className={`text-[9px] font-bold ${isAchieved ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-40"}`}>
                      VIP {tier.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-0.5">
              <span className="text-[10.5px] font-extrabold uppercase text-[var(--theme-text)] opacity-65 block">Active Machines</span>
              <span className="text-xl font-black font-display text-[var(--theme-primary)]">{verifiedCount}</span>
            </div>
            <div className="p-3 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-0.5">
              <span className="text-[10.5px] font-extrabold uppercase text-[var(--theme-text)] opacity-65 block">Invites Joined</span>
              <span className="text-xl font-black font-display text-[var(--theme-text)]">{totalReferralsJoin}</span>
            </div>
          </div>

          {/* Rules Banner */}
          <div className="p-3 rounded-[var(--theme-radius)] bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 space-y-1">
            <h5 className="text-xs font-black text-[var(--theme-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Referral Qualification</span>
            </h5>
            <p className="text-xs leading-relaxed text-[var(--theme-text)] opacity-80 font-sans">
              Referred members must purchase at least one machine to qualify. Rewards are credited directly to your balance.
            </p>
          </div>

          {/* List of VIP task tiers */}
          <div className="space-y-2.5">
            {VIP_TASKS_CONFIG.map((tier) => {
              if (tier.level === 0) return null; // Skip claiming tier 0 reward since required is 0
              const isClaimed = claimedTasks.includes(tier.id);
              const isAchieved = verifiedCount >= tier.required;
              const hasButton = isAchieved && !isClaimed;
              const percent = Math.min((verifiedCount / tier.required) * 100, 100);

              return (
                <div
                  key={tier.id}
                  className={`theme-card p-3.5 rounded-[var(--theme-radius)] border transition-all relative overflow-hidden flex flex-col gap-2.5 ${
                    isClaimed
                      ? "border-[var(--theme-card-border)] bg-[var(--theme-bg)] opacity-60"
                      : isAchieved
                      ? "border-[var(--theme-primary)]/40 bg-[var(--theme-card-bg)] shadow-md"
                      : "border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tier.badgeColor}`}>
                        VIP {tier.level}
                      </span>
                      {isClaimed && (
                        <span className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--theme-primary)]/20">
                          CLAIMED
                        </span>
                      )}
                    </div>

                    <span className="text-sm font-black font-display text-[var(--theme-primary)]">
                      +{formatCurrency(tier.reward)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[var(--theme-text)]">
                      <span>Requirement: {tier.required} Active Machines</span>
                      <span className="opacity-60">{verifiedCount} / {tier.required}</span>
                    </div>

                    <div className="w-full h-2 bg-[var(--theme-bg)] rounded-full overflow-hidden border border-[var(--theme-card-border)]">
                      <div
                        className={`h-full transition-all duration-500 ${isAchieved ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-primary)]/50"}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Claim Button */}
                  {hasButton && (
                    <button
                      onClick={() => handleClaimReward(tier.id, tier.reward)}
                      disabled={claimingId === tier.id}
                      className="btn-3d-primary w-full py-2.5 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                    >
                      {claimingId === tier.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>CLAIM {formatCurrency(tier.reward)}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
