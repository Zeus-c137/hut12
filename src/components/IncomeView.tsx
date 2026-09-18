import React, { useState } from "react";
import { SubscribedNode, SubscriptionItem, UserProfile } from "../types";
import {
  Lock,
  Clock,
  Plus,
  Cpu,
  Loader,
  ShoppingCartIcon,
  Zap,
  Coins
} from "lucide-react";
import MetricCard from "./MetricCard";
import VisaMetricCard from "./VisaMetricCard";
import { Button } from "./ui/button";
import { useCurrency } from "../currency";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface IncomeViewProps {
  profile: UserProfile;
  activeNodes: SubscribedNode[];
  items: SubscriptionItem[];
  onNavigateToCatalog: () => void;
  onRenew?: (item: SubscriptionItem) => void;
  onClaimSuccess?: (pointsEarned: number, newBalance: number, subId: string) => void;
}

export default function IncomeView({
  profile,
  activeNodes,
  items,
  onNavigateToCatalog,
  onRenew,
  onClaimSuccess
}: IncomeViewProps) {
  const { formatCurrency } = useCurrency();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Calculate Cumulative total earnings — resolve daily rate from catalog so every product counts
  const rateOf = (node: SubscribedNode) => {
    const mapped = items.find((item) => item.id === node.itemId || item.name === node.itemName);
    return mapped?.dailyYield !== undefined ? mapped.dailyYield : (node.dailyYield || 0);
  };
  const sumCollected = activeNodes.reduce((acc, node) => acc + (node.totalEarned || 0), 0);
  const totalDailyYield = activeNodes.filter(n => n.status === "active").reduce((acc, node) => acc + rateOf(node), 0);

  const getElapsedDays = (node: any, totalDays: number, dailyYield: number): number => {
    try {
      if (node.totalEarned > 0 && dailyYield > 0) {
        const days = Math.floor(node.totalEarned / dailyYield);
        return Math.min(totalDays, Math.max(1, days));
      }
      return 1;
    } catch (err) {
      return 1;
    }
  };

  const handleClaim = async (subId: string) => {
    setClaimingId(subId);
    try {
      const res = await fetch("/api/subscriptions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subId, phone: profile.phone })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to claim node earnings.");
      }

      // Trigger Confetti!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(`Claimed UGX ${data.pointsClaimed.toLocaleString()} Shs income from ${data.itemName}!`);

      if (onClaimSuccess) {
        onClaimSuccess(data.pointsClaimed, data.updatedPoints, subId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to claim earnings.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-5 select-none bg-transparent text-[var(--theme-text)] p-1 rounded-[var(--theme-radius)] relative">
      
      {/* Aggregate Stats — sticky so product list scrolls below */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-2">
        <VisaMetricCard
          leftValue={formatCurrency(totalDailyYield)}
          leftLabel="Total Daily"
          leftSub="/ day"
          rightValue={formatCurrency(sumCollected)}
          rightLabel="Income Collected"
        />
      </div>

      {/* Active Subscriptions Miner Nodes list section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--theme-card-border)] pb-2">
          <h3 className="font-display font-black text-xs text-[var(--theme-text)] flex items-center gap-2 uppercase tracking-wider">
            <ShoppingCartIcon className="w-4 h-4 text-[var(--theme-primary)] fill-current" />
            My products  ({activeNodes.length})
          </h3>
        </div>

        {activeNodes.length === 0 ? (
          <div className="text-center py-12 px-4 max-w-xl mx-auto space-y-4">
            <Clock className="w-10 h-10 text-[var(--theme-text)] opacity-40 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h4 className="font-bold text-[var(--theme-text)] opacity-60 text-xs uppercase font-sans">No Active Products </h4>
            </div>
            <Button
              variant="gold-glossy"
              size="sm"
              onClick={onNavigateToCatalog}
              glow={false}
              className="mx-auto"
            >
              <Plus className="w-4 h-4" />
              Rent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {activeNodes.map((node) => {
              // Find the mapped item from catalog
              const mappedItem = items.find(
                (item) => item.id === node.itemId || item.name === node.itemName
              );
              const imageUrl = mappedItem?.imageUrl;
              const itemName = mappedItem?.name || node.itemName;
              const totalDays = mappedItem?.duration || node.duration || 15;
              const dailyYield = mappedItem?.dailyYield !== undefined ? mappedItem.dailyYield : (node.dailyYield || 0);

              const elapsedDays = getElapsedDays(node, totalDays, dailyYield);
              const isExpired = node.status === "expired";
              const isReadyToClaim = node.status === "active" && elapsedDays >= totalDays;
              const totalIncome = dailyYield * totalDays;
              const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

              return (
                <div
                  key={node.id}
                  className="group flex flex-row bg-[var(--theme-card-bg)]/40 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/10 rounded-[24px] p-3 overflow-hidden relative shadow-sm hover:border-[var(--theme-primary)]/30"
                >
                  {/* Left portion: Hardware Image full height — transparent bg like income, contain */}
                  <div onClick={() => imageUrl && setPreviewImage(imageUrl)} className="w-28 h-28 sm:w-32 sm:h-32 md:w-44 md:h-44 relative overflow-hidden rounded-[var(--theme-radius)] bg-transparent border-0 shrink-0 cursor-zoom-in group-hover:border-[var(--theme-primary)]/30 transition-colors p-2 flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-transparent text-[var(--theme-text)] opacity-40">
                        <Cpu className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Right portion details */}
                  <div className="flex-1 pl-3 flex flex-col justify-between min-w-0 font-sans">
                    <div>
                      {/* Name in theme primary color */}
                      <h4 className="font-display font-black text-[var(--theme-primary)] text-sm uppercase leading-tight pb-1">
                        {itemName}
                      </h4>

                      <div className="space-y-2 text-[var(--theme-text)] min-w-0">
                        <p className="flex items-center justify-between gap-3 min-w-0 leading-relaxed">
                          <span className="text-[10.5px] font-display font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 shrink-0">Cycle</span>
                          <span className="font-display font-black text-[13px] tracking-tight text-[var(--theme-text)] truncate text-right min-w-0">{elapsedDays}/{totalDays} Days</span>
                        </p>
                        <p className="flex items-center justify-between gap-3 min-w-0 leading-relaxed">
                          <span className="text-[10.5px] font-display font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 shrink-0">Daily income</span>
                          <span className="font-display font-black text-[13px] tracking-tight text-[var(--theme-text)] truncate text-right min-w-0">{formatCurrency(dailyYield)}</span>
                        </p>
                        <p className="flex items-center justify-between gap-3 min-w-0 leading-relaxed">
                          <span className="text-[10.5px] font-display font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 shrink-0">Collected</span>
                          <span className="font-display font-black text-[13px] tracking-tight text-[var(--theme-text)] truncate text-right min-w-0">{formatCurrency(node.totalEarned || (dailyYield * elapsedDays))}</span>
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar & Status Indicator */}
                    <div className="pt-1.5 space-y-1">
                      {/* Progress Bar */}
                      <div className="w-full bg-[var(--theme-card-bg)] h-3 rounded-full overflow-hidden border border-[var(--theme-card-border)] p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExpired ? 'bg-[var(--theme-text)] opacity-30' : 'bg-[var(--theme-primary)]'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] font-sans font-semibold text-[var(--theme-text)] opacity-70 px-0.5">
                        <span>{isExpired ? "Completed" : "Auto-Credited Daily"}</span>
                        <span>{elapsedDays}/{totalDays} Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Expired banner overlay for completed/expired nodes */}
                  {isExpired && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                      <span className="text-2xl md:text-3xl font-sans font-black tracking-wide text-white drop-shadow-md select-none">
                        EXPIRED
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {previewImage && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-[var(--theme-radius)] shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
