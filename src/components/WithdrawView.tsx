import React, { useState, useEffect } from "react";
import { UserProfile, SubscribedNode } from "../types";
import {
  ArrowLeft,
  Phone,
  Copy,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "../currency";
import VisaMetricCard from "./VisaMetricCard";

interface WithdrawViewProps {
  userProfile: UserProfile;
  siteConfig?: any;
  activeNodes?: SubscribedNode[];
  onBack: () => void;
  onProfileUpdate: (p: UserProfile) => void;
}

export default function WithdrawView({
  userProfile,
  siteConfig,
  activeNodes = [],
  onBack,
  onProfileUpdate,
}: WithdrawViewProps) {
  const { formatCurrency, currency } = useCurrency();

  const minimumWithdrawal =
    Number(siteConfig?.minimumWithdrawal) > 0 ? Math.floor(Number(siteConfig.minimumWithdrawal)) : 5000;
  const maximumWithdrawal =
    Number(siteConfig?.maximumWithdrawal) > 0 ? Math.floor(Number(siteConfig.maximumWithdrawal)) : 0;
  const withdrawalMode = (siteConfig?.withdrawMode || siteConfig?.withdrawalMode || "automatic") as string;

  const [pointsToWithdraw, setPointsToWithdraw] = useState<number>(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawOperator, setWithdrawOperator] = useState<"MTN" | "Airtel" | "USDT">(
    (userProfile.operator as any) || "MTN"
  );
  const [withdrawalPhone, setWithdrawalPhone] = useState(userProfile.phone || "");
  const [usdtAddress, setUsdtAddress] = useState(userProfile.usdtAddress || "");
  const [paymentStatus, setPaymentStatus] = useState<"IDLE" | "SUCCESS">("IDLE");
  const [lastPayout, setLastPayout] = useState<number>(0);

  useEffect(() => {
    setWithdrawalPhone(userProfile.phone || "");
    setUsdtAddress(userProfile.usdtAddress || "");
    setWithdrawOperator((userProfile.operator as any) || "MTN");
  }, [userProfile]);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNodes || activeNodes.length === 0) {
      toast.error("You must have rented at least one product to qualify for withdrawals.");
      return;
    }
    if (!Number.isInteger(pointsToWithdraw) || pointsToWithdraw < minimumWithdrawal) {
      toast.error(`Minimum withdrawal is ${formatCurrency(minimumWithdrawal)}.`);
      return;
    }
    if (maximumWithdrawal > 0 && pointsToWithdraw > maximumWithdrawal) {
      toast.error(`Maximum withdrawal is ${formatCurrency(maximumWithdrawal)}.`);
      return;
    }
    if (pointsToWithdraw > (userProfile.points || 0)) {
      toast.error(`Insufficient withdrawable balance. Available: ${formatCurrency(userProfile.points || 0)}.`);
      return;
    }
    if (withdrawOperator === "USDT") {
      if (usdtAddress.length < 10) {
        toast.error("Please enter a valid USDT wallet address.");
        return;
      }
    } else {
      if (!/^\d{9,10}$/.test(withdrawalPhone)) {
        toast.error("Withdrawal phone must be 9 or 10 digits.");
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
          withdrawPhone: withdrawOperator === "USDT" ? usdtAddress : withdrawalPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal rejected.");
      onProfileUpdate(data.profile);
      setLastPayout(pointsToWithdraw);
      setPaymentStatus("SUCCESS");
      toast.success(
        data.mode === "manual"
          ? "Withdrawal submitted — pending approval."
          : "Withdrawal submitted — awaiting confirmation."
      );
      setPointsToWithdraw(0);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const feePct = Number(siteConfig?.withdrawFee || 0);
  const feeAmount = Math.floor(pointsToWithdraw * (feePct / 100));
  const payout = Math.max(0, pointsToWithdraw - feeAmount);

  const PillBtn: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    sub: string;
    icon?: React.ReactNode;
  }> = ({ active, onClick, label, sub, icon }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 relative text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
        active ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-60 hover:opacity-100"
      }`}
    >
      {icon ? <span className="shrink-0 flex items-center justify-center gap-1.5">{icon}</span> : null}
      <span className="flex flex-col items-start leading-none">
        <span className="text-[11px] leading-none">{label}</span>
        {sub ? <span className="text-[9px] font-bold normal-case opacity-60 leading-none mt-1">{sub}</span> : null}
      </span>
      {active && <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[var(--theme-primary)] rounded-full" />}
    </button>
  );

  if (paymentStatus === "SUCCESS") {
    return (
      <div className="bg-transparent text-[var(--theme-text)] p-1 space-y-4 select-none">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setPaymentStatus("IDLE");
              onBack();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-xs font-black uppercase tracking-wider hover:border-[var(--theme-primary)]/30 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--theme-primary)]" /> Back
          </button>
          <h1 className="text-sm font-display font-black uppercase tracking-wider text-[var(--theme-text)]">Withdraw Funds</h1>
          <span className="w-[72px]" />
        </div>
        <div className="rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] p-8 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-wide">Withdrawal submitted</h3>
            <p className="text-xs font-bold opacity-60 max-w-sm mx-auto leading-relaxed">
              {formatCurrency(lastPayout)} requested •{" "}
              {withdrawalMode === "manual" ? "pending approval (5–15 min)" : "awaiting confirmation"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-card-border)] p-4 max-w-xs mx-auto text-left space-y-2 text-xs font-bold">
            <div className="flex justify-between">
              <span className="opacity-60">Requested</span>
              <span>{formatCurrency(lastPayout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Status</span>
              <span className="text-amber-600">Pending</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Destination</span>
              <span className="text-[var(--theme-primary)] truncate ml-2">
                {withdrawOperator === "USDT" ? usdtAddress.slice(0, 12) + "…" : withdrawalPhone}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setPaymentStatus("IDLE");
              onBack();
            }}
            className="w-full py-3.5 rounded-full bg-[var(--theme-primary)] text-white font-black text-xs uppercase tracking-wider shadow-[0_3px_0_0_var(--theme-primary-shadow)] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-transparent text-[var(--theme-text)] p-1 space-y-4 select-none">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-xs font-black uppercase tracking-wider hover:border-[var(--theme-primary)]/30 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--theme-primary)]" /> Back
        </button>
        <h1 className="text-sm font-display font-black uppercase tracking-wider text-[var(--theme-text)]">Withdraw Funds</h1>
        <span className="w-[72px]" />
      </div>

      <VisaMetricCard
        leftLabel="Recharge balance"
        leftValue={`${currency === "USD" ? "$" : "UGX"} ${currency === "USD" ? ((userProfile.rechargeBalance || 0) / 3700).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (userProfile.rechargeBalance || 0).toLocaleString()}`}
        rightLabel="Withdrawable"
        rightValue={formatCurrency(userProfile.points || 0)}
      />

      <div className="rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-sm overflow-hidden">
        <div className="p-3 border-b border-[var(--theme-card-border)] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-[0.14em] opacity-60">Payout method</h2>
            <span className="text-[10px] font-bold opacity-50">Fee {feePct}%</span>
          </div>
          <div className="flex gap-1 border-b border-[var(--theme-card-border)]">
            <PillBtn
              active={withdrawOperator !== "USDT"}
              onClick={() => setWithdrawOperator((userProfile.operator as any) === "Airtel" ? "Airtel" : "MTN")}
              label="Mobile Money"
              sub=""
              icon={
                <span className="flex items-center gap-1.5">
                  {siteConfig?.mtnLogoUrl ? (
                    <img src={siteConfig.mtnLogoUrl} alt="MTN" className="w-10 h-10 rounded-full bg-white object-contain" style={{ padding: 4 }} />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-[#FFCC00] text-black text-[11px] flex items-center justify-center font-black">MTN</span>
                  )}
                  {siteConfig?.airtelLogoUrl ? (
                    <img src={siteConfig.airtelLogoUrl} alt="Airtel" className="w-10 h-10 rounded-full bg-white object-contain" style={{ padding: 3 }} />
                  ) : (
                    <span className="w-10 h-10 rounded-full bg-[#FF0000] text-white text-[10px] flex items-center justify-center font-black">Air</span>
                  )}
                </span>
              }
            />
            <PillBtn
              active={withdrawOperator === "USDT"}
              onClick={() => setWithdrawOperator("USDT")}
              label="USDT"
              sub={siteConfig?.usdtNetwork || "TRC20"}
              icon={
                siteConfig?.usdtLogoUrl ? (
                  <img src={siteConfig.usdtLogoUrl} alt="USDT" className="w-10 h-10 rounded-full bg-white object-contain" style={{ padding: 2 }} />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-[#26A17B] text-white text-[15px] flex items-center justify-center font-black">₮</span>
                )
              }
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold leading-none px-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center text-[10px] font-black">1</span>{" "}
              Destination
            </span>
            <span className="opacity-30">—</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] flex items-center justify-center text-[10px] font-black">2</span>{" "}
              Amount
            </span>
            <span className="opacity-30">—</span>
            <span className="inline-flex items-center gap-1.5 opacity-70">
              <span className="w-5 h-5 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] flex items-center justify-center text-[10px] font-black">3</span>{" "}
              Confirm
            </span>
          </div>
        </div>

        <form onSubmit={handleWithdrawal} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider opacity-60">
              {withdrawOperator === "USDT" ? "USDT wallet address" : "Withdrawal phone number"}
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
                  if (withdrawOperator === "USDT") setUsdtAddress(e.target.value);
                }}
                className={`w-full ${withdrawOperator === "USDT" ? "px-4" : "pl-9 pr-4"} py-3.5 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-sm rounded-full outline-none font-bold focus:border-[var(--theme-primary)] transition-all disabled:opacity-60`}
                placeholder={withdrawOperator === "USDT" ? "T..." : "07XXXXXXXX"}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider opacity-60">Amount (UGX)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                required
                min={minimumWithdrawal}
                max={maximumWithdrawal > 0 ? maximumWithdrawal : undefined}
                placeholder={`Min ${minimumWithdrawal.toLocaleString()}${maximumWithdrawal > 0 ? ` - Max ${maximumWithdrawal.toLocaleString()}` : ""}`}
                value={pointsToWithdraw || ""}
                onChange={(e) => setPointsToWithdraw(parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                className="w-full px-4 py-3.5 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] text-[var(--theme-text)] text-sm rounded-full outline-none font-bold focus:border-[var(--theme-primary)] transition-all pr-20"
              />
              <button
                type="button"
                onClick={() =>
                  setPointsToWithdraw(Math.min(userProfile.points || 0, maximumWithdrawal > 0 ? maximumWithdrawal : userProfile.points || 0))
                }
                className="absolute right-2 top-2 px-3 py-1.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[11px] font-black rounded-full transition-colors cursor-pointer uppercase"
              >
                MAX
              </button>
            </div>
            <p className="text-[11px] font-bold opacity-60 px-1">
              Available: <span className="text-[var(--theme-text)] opacity-100">{formatCurrency(userProfile.points || 0)}</span> · Min{" "}
              <span className="text-[var(--theme-text)] opacity-100">{formatCurrency(minimumWithdrawal)}</span>
              {maximumWithdrawal > 0 ? (
                <>
                  {" "}
                  · Max <span className="text-[var(--theme-text)] opacity-100">{formatCurrency(maximumWithdrawal)}</span>
                </>
              ) : (
                " · No max"
              )}
            </p>
            {pointsToWithdraw > 0 && pointsToWithdraw > (userProfile.points || 0) && (
              <p className="text-[11px] text-rose-500 font-bold">Insufficient withdrawable balance.</p>
            )}
          </div>

          <div className="space-y-2.5 p-3 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)]">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="opacity-60 uppercase tracking-wider text-[11px]">Withdraw fee</span>
              <span className="px-2.5 py-0.5 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full text-xs font-black">
                {feePct}%
              </span>
            </div>
            <div className="border-t border-[var(--theme-card-border)]" />
            <div className="flex justify-between text-sm font-black">
              <span>Estimated payout</span>
              <span>{formatCurrency(payout)}</span>
            </div>
            {withdrawOperator === "USDT" && (
              <>
                <div className="flex justify-between text-sm font-black text-emerald-600 border-t border-[var(--theme-card-border)]/50 pt-2">
                  <span>USDT payout</span>
                  <span>≈ ${(payout / (siteConfig?.usdtRate || 3700)).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-[11px] opacity-60 font-bold">
                  <span>Rate</span>
                  <span>1 USDT = {formatCurrency(siteConfig?.usdtRate || 3700)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-xs opacity-60 font-bold">
              <span>Fee</span>
              <span>{formatCurrency(feeAmount)}</span>
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)]">
            <div className="flex gap-2.5 items-start text-[11px] opacity-80 font-bold">
              <Info className="w-3.5 h-3.5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
              <div>
                <span className="font-black block mb-0.5">Processing time</span>
                {withdrawalMode === "manual"
                  ? "Pending approval — once approved, settled to destination."
                  : "Pending until provider webhook confirms — usually 5–30 min."}
              </div>
            </div>
            <div className="border-t border-[var(--theme-card-border)]" />
            <div className="flex gap-2.5 items-start text-[11px] opacity-80 font-bold">
              {activeNodes && activeNodes.length > 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black block mb-0.5">Security</span>Active product verified.
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black block mb-0.5">Requirement</span>You need an active product to withdraw.
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isWithdrawing ||
              !Number.isInteger(pointsToWithdraw) ||
              pointsToWithdraw < minimumWithdrawal ||
              (maximumWithdrawal > 0 && pointsToWithdraw > maximumWithdrawal) ||
              pointsToWithdraw > (userProfile.points || 0) ||
              !activeNodes ||
              activeNodes.length === 0
            }
            className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              Number.isInteger(pointsToWithdraw) &&
              pointsToWithdraw >= minimumWithdrawal &&
              (maximumWithdrawal === 0 || pointsToWithdraw <= maximumWithdrawal) &&
              pointsToWithdraw <= (userProfile.points || 0) &&
              activeNodes &&
              activeNodes.length > 0
                ? "bg-[var(--theme-primary)] text-white shadow-[0_3px_0_0_var(--theme-primary-shadow)] active:translate-y-[1px] active:shadow-none cursor-pointer"
                : "bg-[var(--theme-card-border)] text-[var(--theme-text)] opacity-50 cursor-not-allowed"
            }`}
          >
            {isWithdrawing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : !activeNodes || activeNodes.length === 0 ? (
              <span>Purchase product first</span>
            ) : (
              <>
                <ArrowUpRight className="w-4 h-4" /> Request withdrawal
              </>
            )}
          </button>
          <p className="text-center text-[11px] font-bold opacity-50">
            {formatCurrency(minimumWithdrawal)} min{maximumWithdrawal > 0 ? ` • ${formatCurrency(maximumWithdrawal)} max` : " • no max"} • Fee {feePct}%
          </p>
        </form>
      </div>
    </div>
  );
}
