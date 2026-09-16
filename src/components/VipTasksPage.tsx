import React, { useEffect, useState, useCallback, useMemo } from "react";
import { X, CheckCircle2, Trophy, Lock, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../currency";
import { calcVipProgress, getNextVipRequirement, normalizeVipTaskboard } from "@/src/utils/vip";
import { fetchJsonWithSignal } from "@/src/utils/abortableFetch";
import { useAbortSignal } from "@/src/hooks/useGatedInterval";
import type { VipTask, VipTaskboard } from "@/src/types";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";

let vipCache: { phone: string; board: VipTaskboard; at: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface Props {
  phone: string;
  siteConfig?: any;
  userProfile?: any;
  onClaimSuccess?: (p: any) => void;
  onBack?: () => void;
}

export default function VipTasksPage({ phone, siteConfig, userProfile, onClaimSuccess, onBack }: Props) {
  const { formatCurrency } = useCurrency();
  const [board, setBoard] = useState<VipTaskboard>({
    tasks: [],
    vipLevel: 0,
    referralRates: { level1: 15, level2: 5, level3: 0, level4: 0 },
    progress: { level1Bonus: 0, level2Bonus: 0, level3Bonus: 0, level4Bonus: 0, accumulatedBonus: 0, totalReferralBonus: 0 }
  });
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { signal, renew, abort } = useAbortSignal();

  const load = useCallback(async (force = false) => {
    if (!force && vipCache && vipCache.phone === phone && Date.now() - vipCache.at < CACHE_TTL) {
      setBoard(vipCache.board);
      return;
    }
    if (typeof document !== "undefined" && document.hidden) return;
    setLoading(true);
    const s = renew();
    try {
      const data = await fetchJsonWithSignal<VipTaskboard>(`/api/profile/vip-tasks/${encodeURIComponent(phone)}`, s);
      const n = normalizeVipTaskboard(data);
      setBoard(n);
      vipCache = { phone, board: n, at: Date.now() };
    } catch (e: any) {
      if (s.aborted || e?.name === "AbortError") return;
      toast.error(e.message || "VIP tasks unavailable");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    void load();
    const onVis = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); abort(); };
  }, [load]);

  const { accumulatedBonus, level1Bonus, level2Bonus, level3Bonus, level4Bonus } = board.progress;
  const rates = board.referralRates || { level1: 15, level2: 5, level3: 0, level4: 0 };
  const nextReq = getNextVipRequirement(board.tasks, accumulatedBonus);
  const overall = calcVipProgress(accumulatedBonus, nextReq);

  const handleClaim = async (task: VipTask) => {
    setClaimingId(task.id);
    const s = renew();
    try {
      const data = await fetchJsonWithSignal<{ bonus: number; claimedVipTasks?: string[] }>(`/api/profile/vip-tasks/claim`, s, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, taskId: task.id })
      });
      const bonus = Number(data.bonus || 0);
      toast.success(`+${formatCurrency(bonus)}`);
      if (userProfile && onClaimSuccess) {
        onClaimSuccess({ ...userProfile, points: Number(userProfile.points || 0) + bonus, claimedVipTasks: data.claimedVipTasks || [...(userProfile.claimedVipTasks || []), task.id] });
      }
      vipCache = null;
      await load(true);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e.message || "Claim failed");
    } finally { setClaimingId(null); }
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[var(--theme-card-bg)]/40 backdrop-blur-[20px] backdrop-saturate-[180%] border-0 rounded-none p-0">
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <img src={trophy3d} alt="" className="w-9 h-9 object-contain" />
          <div>
            <h1 className="text-sm font-display font-bold tracking-tight text-[var(--theme-text)] leading-none">VIP</h1>
            <p className="text-[11px] font-sans font-medium opacity-50 leading-none mt-1">Level {board.vipLevel || 0} • {formatCurrency(accumulatedBonus)} earned</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBack && <button onClick={onBack} className="w-8 h-8 rounded-full bg-[var(--theme-bg)]/60 border border-white/10 flex items-center justify-center opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>}
          <button onClick={() => void load(true)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-60 hover:opacity-100"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain space-y-3 p-3 pb-8 scrollbar-none min-h-0">
        {/* Gamified bento — non explanatory, just numbers */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: 1, v: level1Bonus, r: rates.level1 },
            { l: 2, v: level2Bonus, r: rates.level2 },
            { l: 3, v: level3Bonus, r: rates.level3 },
            { l: 4, v: level4Bonus, r: rates.level4 },
          ].map(c => (
            <div key={c.l} className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center backdrop-blur-xl">
              <p className="text-[10px] font-black opacity-40">L{c.l} {c.r}%</p>
              <p className="text-xs font-display font-bold tracking-tight mt-1">{formatCurrency(c.v)}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[11px] font-sans font-medium opacity-60">
            <span>Next</span><span>{formatCurrency(nextReq)}</span>
          </div>
          <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden mt-2 border border-white/10">
            <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all" style={{ width: `${overall}%` }} />
          </div>
        </div>

        {board.tasks.length === 0 ? (
          <div className="py-14 text-center opacity-60">
            <img src={trophy3d} alt="" className="w-12 h-12 mx-auto opacity-40" />
            <p className="text-xs font-semibold mt-3">No tasks</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {board.tasks.map(task => {
              const p = calcVipProgress(task.progress, task.requiredBonus);
              const state = task.claimed ? "claimed" : task.unlocked ? "unlocked" : "locked";
              return (
                <div key={task.id} className={`rounded-2xl border p-3.5 flex flex-col gap-2 backdrop-blur-xl ${state === "claimed" ? "bg-[var(--theme-bg)]/40 border-white/5 opacity-60" : state === "unlocked" ? "bg-white/5 border-[var(--theme-primary)]/30 shadow-sm" : "bg-white/[0.03] border-white/5"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/15 uppercase tracking-wide">{task.category}</span>
                        {state === "claimed" && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>}
                        {state === "locked" && <Lock className="w-3 h-3 opacity-30" />}
                      </div>
                      <h4 className="text-sm font-sans font-semibold leading-tight mt-1.5 truncate">{task.title}</h4>
                    </div>
                    <span className="text-sm font-display font-bold text-[var(--theme-primary)] shrink-0">+{formatCurrency(task.reward)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full rounded-full ${state === "unlocked" ? "bg-[var(--theme-primary)]" : "bg-white/20"}`} style={{ width: `${p}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono opacity-50">{formatCurrency(task.progress)}/{formatCurrency(task.requiredBonus)}</span>
                    {state === "claimed" ? <span className="text-xs font-semibold opacity-60 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Claimed</span>
                      : state === "unlocked" ? <button onClick={() => void handleClaim(task)} disabled={claimingId === task.id} className="px-3 py-1.5 rounded-full bg-[var(--theme-primary)] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">{claimingId === task.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Claim</button>
                      : <span className="text-[11px] font-medium opacity-40">Locked</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
