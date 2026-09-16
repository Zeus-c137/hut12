import React, { useEffect, useState, useCallback } from "react";
import { X, CheckCircle2, Lock, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../currency";
import { calcVipProgress, getNextVipRequirement, normalizeVipTaskboard } from "@/src/utils/vip";
import { fetchJsonWithSignal } from "@/src/utils/abortableFetch";
import { useAbortSignal } from "@/src/hooks/useGatedInterval";
import type { VipTask, VipTaskboard } from "@/src/types";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import medal3d from "@/src/assets/3d/3dicons-medal-iso-premium.png";
import { Button } from "@/src/components/ui/button";

let vipCache: { phone: string; board: VipTaskboard; at: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface Props {
  phone: string;
  siteConfig?: any;
  userProfile?: any;
  onClaimSuccess?: (p: any) => void;
  onBack?: () => void;
}

export default function VipTasksPage({ phone, userProfile, onClaimSuccess, onBack }: Props) {
  const { formatCurrency } = useCurrency();
  const [board, setBoard] = useState<VipTaskboard>({
    tasks: [],
    vipLevel: 0,
    referralRates: { level1: 15, level2: 5, level3: 0, level4: 0 },
    progress: { level1Bonus: 0, level2Bonus: 0, level3Bonus: 0, level4Bonus: 0, accumulatedBonus: 0, totalReferralBonus: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { renew, abort } = useAbortSignal();

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
      toast.error(e.message || "VIP unavailable");
    } finally { setLoading(false); }
  }, [phone]);

  useEffect(() => {
    void load();
    const onVis = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); abort(); };
  }, [load]);

  const { accumulatedBonus } = board.progress;
  const nextReq = getNextVipRequirement(board.tasks, accumulatedBonus);
  const overall = calcVipProgress(accumulatedBonus, nextReq);

  const handleClaim = async (task: VipTask) => {
    setClaimingId(task.id);
    const s = renew();
    try {
      const data = await fetchJsonWithSignal<{ bonus: number; claimedVipTasks?: string[] }>(`/api/profile/vip-tasks/claim`, s, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, taskId: task.id }),
      });
      const bonus = Number(data.bonus || 0);
      toast.success(`+${formatCurrency(bonus)}`);
      if (userProfile && onClaimSuccess) {
        onClaimSuccess({ ...userProfile, points: Number(userProfile.points || 0) + bonus, claimedVipTasks: data.claimedVipTasks || [...(userProfile.claimedVipTasks || []), task.id] });
      }
      vipCache = null;
      await load(true);
    } catch (e: any) { if (e?.name !== "AbortError") toast.error(e.message || "Claim failed"); }
    finally { setClaimingId(null); }
  };

  const isInitial = loading && board.tasks.length === 0;

  // trophy presets for tasks — bg tint varies, last/max has no bg
  const trophyBg = (i: number, total: number) => {
    if (i === total - 1) return "bg-transparent border-white/10";
    const presets = ["bg-[var(--theme-primary)]/12 border-[var(--theme-primary)]/15", "bg-amber-500/10 border-amber-500/15", "bg-emerald-500/10 border-emerald-500/15", "bg-sky-500/10 border-sky-500/15"];
    return presets[i % presets.length];
  };

  // hero trophy matches vip level
  const heroTrophy = board.vipLevel >= 3 ? trophy3d : board.vipLevel >= 1 ? medal3d : trophy3d;

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[var(--theme-card-bg)]/40 backdrop-blur-[20px] backdrop-saturate-[180%] border-0 rounded-none p-0">
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-8 scrollbar-none min-h-0 space-y-3">
        {isInitial ? (
          <div className="space-y-3 animate-pulse">
            <div className="rounded-[24px] bg-white/10 border border-white/10 h-[132px]" />
            <div className="rounded-2xl bg-white/10 border border-white/10 h-[108px]" />
            <div className="rounded-2xl bg-white/10 border border-white/10 h-[108px]" />
            <div className="rounded-2xl bg-white/10 border border-white/10 h-[108px]" />
          </div>
        ) : (
          <>
            {/* Progress hero — renamed from Estate, no header above, close only */}
            <div className="rounded-[24px] bg-[var(--theme-card-bg)]/70 backdrop-blur-xl border border-white/10 p-4 flex gap-4 items-center relative overflow-hidden">
              {onBack && <button onClick={onBack} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>}
              <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ background: "radial-gradient(600px 200px at 20% 0%, var(--theme-primary), transparent)" }} />
              <img src={heroTrophy} alt="" className="w-20 h-20 object-contain shrink-0 drop-shadow-sm relative" />
              <div className="flex-1 min-w-0 relative pr-6">
                <p className="text-[10px] font-black tracking-widest uppercase opacity-40">Progress</p>
                <p className="text-[22px] font-display font-bold leading-none tracking-tight mt-1">Lv.{board.vipLevel || 0}</p>
                <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden mt-3 border border-white/10">
                  <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all" style={{ width: `${overall}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] font-sans font-medium opacity-50">{formatCurrency(accumulatedBonus)}</span>
                  <span className="text-[11px] font-sans font-bold opacity-60">{formatCurrency(nextReq)}</span>
                </div>
              </div>
            </div>

            {board.tasks.length === 0 ? (
              <div className="py-10 text-center rounded-[24px] bg-white/[0.03] border border-white/10">
                <img src={medal3d} alt="" className="w-14 h-14 mx-auto opacity-50" />
                <p className="text-sm font-sans font-semibold mt-3 opacity-70">No tasks yet</p>
                <p className="text-[11px] font-sans opacity-40 mt-1">Check back soon</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {board.tasks.map((task, i) => {
                  const p = calcVipProgress(task.progress, task.requiredBonus);
                  const state: "claimed" | "unlocked" | "locked" = task.claimed ? "claimed" : task.unlocked ? "unlocked" : "locked";
                  const isLast = i === board.tasks.length - 1;
                  return (
                    <div key={task.id} className={`rounded-[24px] border p-3.5 flex gap-3 relative overflow-hidden backdrop-blur-xl ${state === "claimed" ? "bg-[var(--theme-bg)]/30 border-white/5 opacity-60" : state === "unlocked" ? "bg-white/5 border-[var(--theme-primary)]/20 shadow-sm" : "bg-white/[0.03] border-white/5"}`}>
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 self-start ${trophyBg(i, board.tasks.length)} ${isLast ? "bg-transparent" : ""}`}>
                        <img src={trophy3d} alt="" className="w-9 h-9 object-contain drop-shadow-sm" loading="lazy" decoding="async" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-sans font-black px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/15 uppercase tracking-wide leading-none">{task.category}</span>
                          <span className="text-[13px] font-sans font-bold text-[var(--theme-primary)] shrink-0">+{formatCurrency(task.reward)}</span>
                        </div>
                        <h4 className="text-[13px] font-sans font-bold leading-tight">{task.title}</h4>
                        {task.description && <p className="text-[11px] font-sans font-medium opacity-50 leading-snug">{task.description}</p>}
                        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden border border-white/5 mt-1">
                          <div className={`h-full rounded-full transition-all ${state === "unlocked" ? "bg-[var(--theme-primary)]" : state === "claimed" ? "bg-emerald-500" : "bg-white/20"}`} style={{ width: `${p}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-sans font-medium opacity-50 leading-none">
                          <span>{formatCurrency(task.progress)}</span><span>{formatCurrency(task.requiredBonus)}</span>
                        </div>
                        {state === "unlocked" ? (
                          <Button size="xs" variant="gold-glossy" onClick={() => void handleClaim(task)} disabled={claimingId === task.id} className="w-full mt-1">
                            {claimingId === task.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{claimingId === task.id ? "..." : "Claim"}
                          </Button>
                        ) : state === "claimed" ? (
                          <span className="w-full py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-600 text-xs font-sans font-bold text-center flex items-center justify-center gap-1 mt-1"><CheckCircle2 className="w-3.5 h-3.5" /> Claimed</span>
                        ) : (
                          <span className="w-full py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-sans font-bold text-center opacity-40 mt-1 flex items-center justify-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                        )}
                      </div>
                      {state === "locked" && <div className="absolute top-3 right-3 opacity-0"><Lock className="w-3.5 h-3.5" /></div>}
                      {state === "claimed" && <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white hidden items-center justify-center"><CheckCircle2 className="w-4 h-4" /></span>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
