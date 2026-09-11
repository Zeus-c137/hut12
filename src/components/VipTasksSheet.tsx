import React, { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { X, CheckCircle2, Trophy, RefreshCw, Sparkles, ShieldCheck, Lock } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCurrency } from "../currency";
import { readApiJson } from "../utils/api";

declare module "react/jsx-runtime" {
  export * from "react";
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface VipTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  requiredBonus: number;
  reward: number;
  progress: number;
  unlocked: boolean;
  claimed: boolean;
}

interface VipTaskboard {
  tasks: VipTask[];
  vipLevel?: number;
  referralRates?: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
  };
  progress: {
    level1Bonus: number;
    level2Bonus: number;
    level3Bonus: number;
    level4Bonus: number;
    accumulatedBonus: number;
    totalReferralBonus: number;
  };
}

interface VipTasksSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onClaimSuccess: (updatedProfile: UserProfile) => void;
}

export default function VipTasksSheet({ isOpen, onClose, userProfile, onClaimSuccess }: VipTasksSheetProps) {
  const { formatCurrency } = useCurrency();
  const [board, setBoard] = useState<VipTaskboard>({
    tasks: [],
    vipLevel: 0,
    referralRates: { level1: 15, level2: 5, level3: 0, level4: 0 },
    progress: { level1Bonus: 0, level2Bonus: 0, level3Bonus: 0, level4Bonus: 0, accumulatedBonus: 0, totalReferralBonus: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const loadTaskboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profile/vip-tasks/${encodeURIComponent(userProfile.phone)}`);
      const data = await readApiJson<any>(res);
      const rawProgress = data?.progress || {};
      const rawRates = data?.referralRates || {};
      setBoard({
        tasks: Array.isArray(data?.tasks) ? data.tasks : [],
        vipLevel: Number(data?.vipLevel || 0),
        referralRates: {
          level1: Number(rawRates.level1 ?? 15),
          level2: Number(rawRates.level2 ?? 5),
          level3: Number(rawRates.level3 ?? 0),
          level4: Number(rawRates.level4 ?? 0)
        },
        progress: {
          level1Bonus: Number(rawProgress.level1Bonus ?? rawProgress.level1 ?? data?.level1Bonus ?? 0),
          level2Bonus: Number(rawProgress.level2Bonus ?? rawProgress.level2 ?? data?.level2Bonus ?? 0),
          level3Bonus: Number(rawProgress.level3Bonus ?? rawProgress.level3 ?? data?.level3Bonus ?? 0),
          level4Bonus: Number(rawProgress.level4Bonus ?? rawProgress.level4 ?? data?.level4Bonus ?? 0),
          accumulatedBonus: Number(rawProgress.accumulatedBonus ?? data?.accumulatedBonus ?? 0),
          totalReferralBonus: Number(rawProgress.totalReferralBonus ?? data?.totalReferralBonus ?? 0)
        }
      });
    } catch (error: any) {
      console.error("[VIP taskboard] load failed:", error);
      toast.error(error.message || "VIP tasks are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void loadTaskboard();
  }, [isOpen, userProfile.phone]);

  if (!isOpen) return null;

  const { accumulatedBonus, level1Bonus, level2Bonus, level3Bonus, level4Bonus, totalReferralBonus } = board.progress;
  const rates = board.referralRates || { level1: 15, level2: 5, level3: 0, level4: 0 };
  const nextTask = board.tasks.find((task) => !task.unlocked && !task.claimed);
  const nextRequirement = nextTask?.requiredBonus || accumulatedBonus || 1;
  const overallProgress = Math.min((accumulatedBonus / nextRequirement) * 100, 100);

  const handleClaim = async (task: VipTask) => {
    try {
      setClaimingId(task.id);
      const res = await fetch("/api/profile/vip-tasks/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userProfile.phone, taskId: task.id })
      });
      const data = await readApiJson<{ bonus: number; claimedVipTasks?: string[] }>(res);

      const creditedBonus = Number(data.bonus || 0);
      toast.success(`VIP reward of ${formatCurrency(creditedBonus)} added to your balance.`);
      onClaimSuccess({
        ...userProfile,
        points: Number(userProfile.points || 0) + creditedBonus,
        claimedVipTasks: data.claimedVipTasks || [...(userProfile.claimedVipTasks || []), task.id]
      });
      await loadTaskboard();
    } catch (error: any) {
      console.error("[VIP taskboard] claim failed:", error);
      toast.error(error.message || "Unable to claim this VIP reward.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/75 backdrop-blur-xs" />
      <motion.div
        initial={{ y: "100%", x: "-50%" }}
        animate={{ y: 0, x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="absolute bottom-0 left-1/2 w-full max-w-md h-[95vh] bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-t border-[var(--theme-card-border)] rounded-t-[32px] flex flex-col z-10 overflow-hidden shadow-2xl"
      >
        <div className="px-5 pt-5 pb-3 border-b border-[var(--theme-card-border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-500"><Trophy className="w-5 h-5" /></div>
            <div>
              <div className="flex items-center gap-2"><h4 className="font-display font-extrabold text-base uppercase tracking-tight">VIP Taskboard</h4><span className="text-[10px] font-black uppercase rounded-full border border-[var(--theme-primary)]/25 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-2 py-0.5">VIP {board.vipLevel || 0}</span></div>
              <p className="text-[11px] opacity-60 mt-0.5">Admin-configured referral bonus rewards</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] opacity-70 hover:opacity-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-none pb-20">
          <div className="p-4 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-xs font-black">VIP task progress · Levels 1–4</span></div>
              {loading && <RefreshCw className="w-4 h-4 animate-spin text-[var(--theme-primary)]" />}
            </div>
            <div className="text-2xl font-black font-display text-[var(--theme-primary)]">{formatCurrency(accumulatedBonus)}</div>
            <div className="w-full h-2.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-amber-500 rounded-full" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]"><span className="block opacity-60">Level 1 ({rates.level1}%)</span><strong>{formatCurrency(level1Bonus)}</strong></div>
              <div className="p-2.5 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]"><span className="block opacity-60">Level 2 ({rates.level2}%)</span><strong>{formatCurrency(level2Bonus)}</strong></div>
              <div className="p-2.5 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]"><span className="block opacity-60">Level 3 ({rates.level3}%)</span><strong>{formatCurrency(level3Bonus)}</strong></div>
              <div className="p-2.5 rounded-lg bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)]"><span className="block opacity-60">Level 4 ({rates.level4}%)</span><strong>{formatCurrency(level4Bonus)}</strong></div>
            </div>
          </div>

          {board.tasks.length === 0 ? (
            <div className="p-6 text-center rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-dashed border-[var(--theme-card-border)]">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-black">No VIP tasks available yet</p>
              <p className="text-xs opacity-60 mt-1">New tasks will appear here when the admin publishes them.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {board.tasks.map((task) => {
                const progress = Math.min((task.progress / Math.max(task.requiredBonus, 1)) * 100, 100);
                return (
                  <div key={task.id} className={`p-3.5 rounded-[var(--theme-radius)] border transition-all ${task.claimed ? "opacity-60 bg-[var(--theme-bg)] border-[var(--theme-card-border)]" : task.unlocked ? "bg-[var(--theme-card-bg)] border-[var(--theme-primary)]/40 shadow-md" : "bg-[var(--theme-card-bg)] border-[var(--theme-card-border)]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">{task.category}</span>
                          {task.claimed && <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />CLAIMED</span>}
                        </div>
                        <h5 className="text-sm font-black mt-2">{task.title}</h5>
                        <p className="text-xs opacity-65 mt-1">{task.description}</p>
                      </div>
                      <span className="text-sm font-black font-display text-[var(--theme-primary)] whitespace-nowrap">+{formatCurrency(task.reward)}</span>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold"><span>{formatCurrency(task.progress)} / {formatCurrency(task.requiredBonus)}</span><span className="opacity-60">{task.unlocked ? "Unlocked" : "Locked"}</span></div>
                      <div className="w-full h-2 bg-[var(--theme-bg)] rounded-full overflow-hidden border border-[var(--theme-card-border)]"><div className={`h-full rounded-full ${task.unlocked ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-primary)]/50"}`} style={{ width: `${progress}%` }} /></div>
                    </div>
                    {task.claimed ? <div className="mt-3 text-xs font-bold opacity-70 flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Reward claimed</div> : task.unlocked ? <button onClick={() => void handleClaim(task)} disabled={claimingId === task.id} className="btn-3d-primary w-full mt-3 py-2.5 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">{claimingId === task.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" />Claim {formatCurrency(task.reward)}</>}</button> : <div className="mt-3 text-xs font-bold opacity-55 flex items-center gap-1"><Lock className="w-3.5 h-3.5" />Keep building your referral bonus</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
