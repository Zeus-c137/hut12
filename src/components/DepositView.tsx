import React, { useState, useEffect } from "react";
import { SubscriptionItem, UserProfile } from "../types";
import {
  ArrowLeft,
  Smartphone,
  PhoneCall,
  Loader,
  CheckCircle,
  XCircle,
  Cpu,
  Copy
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCurrency } from "../currency";

interface DepositViewProps {
  userProfile: UserProfile;
  items: SubscriptionItem[];
  siteConfig?: any;
  onDepositSuccess: (newProfile: UserProfile) => void;
  onGpuSuccess: (newSub: any, CostAmount: number) => void;
  preselectedItem?: SubscriptionItem | null;
  onBack?: () => void;
}

export default function DepositView({
  // hook

  userProfile,
  items,
  siteConfig,
  onDepositSuccess,
  onGpuSuccess,
  preselectedItem = null,
  onBack
}: DepositViewProps) {
  const [payType, setPayType] = useState<"balance" | "gpu">(preselectedItem ? "gpu" : "balance");
  const [selectedGpu, setSelectedGpu] = useState<SubscriptionItem | null>(preselectedItem);
  const [depositAmount, setDepositAmount] = useState<number>(20000);
  const { formatCurrency, currency } = useCurrency();
  const [mobileNumber, setMobileNumber] = useState<string>(userProfile.phone || "");

  // Fallback config
  const config = {
    allowAutoDeposit: true,
    allowManualDeposit: false,
    mtnReceiverPhone: "",
    mtnReceiverName: "",
    airtelReceiverPhone: "",
    airtelReceiverName: "",
    usdtRate: 3700,
    ...siteConfig
  };

  const autoEnabled = config.allowAutoDeposit !== false;
  const manualEnabled = config.allowManualDeposit === true;
  const minimumDeposit = Number(config.minimumDeposit) > 0 ? Math.floor(Number(config.minimumDeposit)) : 20_000;
  const maximumDeposit = Number(config.maximumDeposit) > 0 ? Math.floor(Number(config.maximumDeposit)) : 0;

  const getDepositLimitError = (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid deposit amount.";
    if (amount < minimumDeposit) {
      return `Minimum deposit is ${formatCurrency(minimumDeposit)}.`;
    }
    if (maximumDeposit > 0 && amount > maximumDeposit) {
      return `Maximum deposit is ${formatCurrency(maximumDeposit)}.`;
    }
    return "";
  };

  useEffect(() => {
    // Keep the initial form values aligned when the public site config arrives
    // after this view has mounted.
    if (depositAmount === 20_000) setDepositAmount(minimumDeposit);
    if (manualAmount === 20_000) setManualAmount(minimumDeposit);
    if (usdtAmountUSD === 5.5 && Number(config.usdtRate) > 0) {
      setUsdtAmountUSD(Number((minimumDeposit / Number(config.usdtRate)).toFixed(2)));
    }
  }, [minimumDeposit, config.usdtRate]);
  
  // Active deposit mode (auto vs manual vs usdt)
  const [depositMode, setDepositMode] = useState<"auto" | "manual" | "usdt">(
    autoEnabled ? "auto" : manualEnabled ? "manual" : "usdt"
  );

  // Manual States
  const [senderPhone, setSenderPhone] = useState(userProfile.phone || "");
  const [manualAmount, setManualAmount] = useState<number>(20000);
  const [usdtAmountUSD, setUsdtAmountUSD] = useState<number>(5.5);
  const [manualOperator, setManualOperator] = useState<"MTN" | "Airtel">("MTN");
  const [manualRef, setManualRef] = useState("");

  // Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTransId, setCurrentTransId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"IDLE" | "PENDING" | "SUCCESSFUL" | "FAILED">("IDLE");

  // Hook to handle preselected change
  useEffect(() => {
    if (preselectedItem) {
      setSelectedGpu(preselectedItem);
      setPayType("gpu");
    } else {
      setPayType("balance");
    }
  }, [preselectedItem]);

  // Handle polling for transaction status
  useEffect(() => {
    let intervalId: any;
    if (paymentStatus === "PENDING" && currentTransId) {
      const checkStatus = async () => {
        try {
          const res = await fetch("/api/payment/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trans_id: currentTransId })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.status === "SUCCESSFUL") {
              setPaymentStatus("SUCCESSFUL");
              toast.success("Payment completed successfully!");
              const finalAmt = depositMode === "usdt"
                ? (payType === "gpu" ? (selectedGpu?.amount || 0) : (usdtAmountUSD * config.usdtRate))
                : (depositMode === "manual"
                  ? (payType === "gpu" ? (selectedGpu?.amount || 0) : manualAmount)
                  : (payType === "gpu" ? (selectedGpu?.amount || 0) : depositAmount));

              if (payType === "balance") {
                if (data.profile) {
                  onDepositSuccess(data.profile);
                } else {
                  const fallbackProfile = {
                    ...userProfile,
                    rechargeBalance: (userProfile.rechargeBalance || 0) + finalAmt,
                    totalDeposits: (userProfile.totalDeposits || 0) + finalAmt
                  };
                  onDepositSuccess(fallbackProfile);
                }
              } else {
                if (data.subscription) {
                  onGpuSuccess(data.subscription, selectedGpu?.amount || 0);
                }
              }
            } else if (data.status === "FAILED") {
              setPaymentStatus("FAILED");
              toast.error("Transaction was declined or failed.");
              setErrorMsg("Transaction was declined or failed.");
            }
          }
        } catch (err) {
          console.error("Error polling payment status:", err);
        }
      };

      intervalId = setInterval(checkStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [paymentStatus, currentTransId, payType, depositAmount, manualAmount, usdtAmountUSD, selectedGpu, userProfile, depositMode]);

  // Automatic ZuluPay deposit handler
  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const phoneTrim = mobileNumber.replace(/\s+/g, "");
    if (!phoneTrim || phoneTrim.length < 10) {
      toast.error("Please provide a valid 10-digit mobile money number.");
      return;
    }

    const finalAmount = payType === "gpu" ? (selectedGpu?.amount || 0) : depositAmount;
    const limitError = getDepositLimitError(finalAmount);
    if (limitError) {
      setErrorMsg(limitError);
      toast.error(limitError);
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus("PENDING");

    // Auto-routing operator detection
    const operator = "MTN";

    try {
      const response = await fetch("/api/payment/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: userProfile.phone,
          depositPhone: phoneTrim,
          amount: finalAmount,
          operator,
          type: payType === "balance" ? "deposit" : payType,
          itemId: payType === "gpu" ? selectedGpu?.id : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Payment dispatch failed.");
      }

      setCurrentTransId(data.trans_id);
      toast.info("Payment dispatched. Please check your phone.");
    } catch (err: any) {
      console.error(err);
      setPaymentStatus("IDLE");
      toast.error(err.message || "Failed to dispatch mobile money charge.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual payment submission handler
  const handleStartManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    let phoneTrim = senderPhone.replace(/\s+/g, "");
    if (depositMode === "manual") {
      if (!phoneTrim || phoneTrim.length < 9) {
        toast.error("Please provide a valid 9 or 10 digit sender phone number.");
        return;
      }
    } else {
      // For USDT, we don't strictly need a sender phone, we can just pass 'USDT' or similar
      phoneTrim = "USDT_TRANSFER";
    }

    const refTrim = manualRef.trim();
    if (!refTrim) {
      toast.error("Please provide the transaction ID / Hash.");
      return;
    }

    const finalAmount = payType === "gpu"
      ? (selectedGpu?.amount || 0)
      : (depositMode === "usdt" ? (usdtAmountUSD * config.usdtRate) : manualAmount);
    const limitError = getDepositLimitError(finalAmount);
    if (limitError) {
      setErrorMsg(limitError);
      toast.error(limitError);
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus("PENDING");

    // Auto-detect MTN or Airtel from prefix for manual, for USDT use 'USDT'
    let detectedOperator = depositMode === "usdt" ? "USDT" : "MTN";
    if (depositMode === "manual") {
      const normalizedPhone = phoneTrim.startsWith("256") ? "0" + phoneTrim.substring(3) : phoneTrim;
      if (normalizedPhone.startsWith("070") || normalizedPhone.startsWith("075") || normalizedPhone.startsWith("074")) {
        detectedOperator = "Airtel";
      }
    }

    try {
      const response = await fetch("/api/manual/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: userProfile.phone,
          senderPhone: phoneTrim,
          amount: finalAmount,
          operator: detectedOperator,
          transId: refTrim,
          itemId: payType === "gpu" ? selectedGpu?.id : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Proof submission failed.");
      }

      setCurrentTransId(data.trans_id);
      toast.success("Manual proof submitted successfully! Pending admin approval.");
    } catch (err: any) {
      console.error(err);
      setPaymentStatus("IDLE");
      toast.error(err.message || "Failed to submit manual proof.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalAmount = depositMode === "usdt"
    ? (payType === "gpu" ? (selectedGpu?.amount || 0) : (usdtAmountUSD * config.usdtRate))
    : (depositMode === "manual"
      ? (payType === "gpu" ? (selectedGpu?.amount || 0) : manualAmount)
      : (payType === "gpu" ? (selectedGpu?.amount || 0) : depositAmount));

  return (
    <div className="bg-transparent text-[var(--theme-text)] p-1 min-h-[60vh] flex flex-col justify-between select-none space-y-4">
      <div>
        {/* Header Ribbon */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-card-border)] mb-5">
          <button
            onClick={onBack}
            className="p-2 px-4 rounded-[var(--theme-radius)] btn-3d-secondary text-[var(--theme-text)] flex items-center gap-2 text-xs font-sans font-bold cursor-pointer transition-all border border-[var(--theme-card-border)]"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--theme-primary)]" />
            <span>Back</span>
          </button>
        </div>

            {paymentStatus === "IDLE" ? (
          <div className="theme-card card-playful-3d rounded-[var(--theme-radius)] p-5 md:p-6 shadow-md border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-5">
            {/* Auto & Manual Selection Tabs */}
            <div className="relative border-b border-[var(--theme-card-border)] pb-1 mb-5">
              <div className="flex gap-2 border-b border-[var(--theme-card-border)]/40 pb-1">
                {autoEnabled && (
                  <button
                    type="button"
                    onClick={() => { setDepositMode("auto"); setErrorMsg(""); }}
                    className={`relative py-3 px-3 flex-1 flex items-center justify-center gap-2 text-xs font-display font-black uppercase transition-all cursor-pointer outline-none select-none rounded-[var(--theme-radius)] ${
                      depositMode === "auto" ? "btn-3d-primary text-white" : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                    }`}
                  >
                    <div className="flex -space-x-1 items-center shrink-0">
                      {config.mtnLogoUrl && (
                        <img src={config.mtnLogoUrl} alt="MTN" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                      )}
                      {config.airtelLogoUrl && (
                        <img src={config.airtelLogoUrl} alt="Airtel" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                      )}
                    </div>
                    <span>Instant</span>
                  </button>
                )}
                {manualEnabled && (
                  <button
                    type="button"
                    onClick={() => { setDepositMode("manual"); setErrorMsg(""); }}
                    className={`relative py-3 px-3 flex-1 flex items-center justify-center gap-2 text-xs font-display font-black uppercase transition-all cursor-pointer outline-none select-none rounded-[var(--theme-radius)] ${
                      depositMode === "manual" ? "btn-3d-primary text-white" : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                    }`}
                  >
                    <div className="flex -space-x-1 items-center shrink-0">
                      {config.mtnLogoUrl && (
                        <img src={config.mtnLogoUrl} alt="MTN" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                      )}
                      {config.airtelLogoUrl && (
                        <img src={config.airtelLogoUrl} alt="Airtel" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                      )}
                    </div>
                    <span>Transfer</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setDepositMode("usdt"); setErrorMsg(""); }}
                  className={`relative py-3 px-3 flex-1 flex items-center justify-center gap-2 text-xs font-display font-black uppercase transition-all cursor-pointer outline-none select-none rounded-[var(--theme-radius)] ${
                    depositMode === "usdt" ? "btn-3d-primary text-white" : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]"
                  }`}
                >
                  {config.usdtLogoUrl && (
                    <img src={config.usdtLogoUrl} alt="USDT" className="w-8 h-8 p-1 bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-full object-contain shadow-xs" />
                  )}
                  <span>USDT</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--theme-bg)]/50 border border-[var(--theme-card-border)] text-[11px] text-[var(--theme-text)] opacity-80 font-sans">
              Deposit limits: minimum <span className="font-bold">{formatCurrency(minimumDeposit)}</span>
              {maximumDeposit > 0 ? <> · maximum <span className="font-bold">{formatCurrency(maximumDeposit)}</span></> : <> · no maximum</>}
            </div>

            {depositMode === "auto" ? (
              /* AUTOMATIC DEPOSIT FORM */
              <form onSubmit={handleStartPayment} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-sans flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Render a minimal card of the GPU Rig if Paying for a Rig */}
                {payType === "gpu" && selectedGpu && (
                  <div className="p-2 flex items-center justify-between gap-3 relative overflow-hidden mb-2">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-700/10 border border-blue-500/20 overflow-hidden shrink-0">
                        {selectedGpu.imageUrl ? (
                          <img src={selectedGpu.imageUrl} alt={selectedGpu.name} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-500"><Cpu className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[13px] text-slate-100 uppercase">{selectedGpu.name}</h4>
                        <p className="font-sans text-[12px] text-slate-500 uppercase tracking-wider font-semibold">Daily yield: +{formatCurrency(selectedGpu.dailyYield)}</p>
                      </div>
                    </div>
                    <div className="text-right font-sans text-xs font-black text-blue-500">
                      {formatCurrency(selectedGpu.amount)}
                    </div>
                  </div>
                )}

                {/* Unified Phone & Amount Card */}
                <div className="p-4 rounded-2xl space-y-4 bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)]/60">
                  <div className="space-y-1.5">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Mobile Money Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-primary)]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0781234567"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-3 pl-10 pr-4 font-sans text-xs text-[var(--theme-text)] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Amount (UGX)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-sans text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold">
                        UGX
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        min={500}
                        required
                        disabled={payType === "gpu"}
                        value={payType === "gpu" ? (selectedGpu?.amount || 0) : depositAmount}
                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                        className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-3 pl-12 pr-4 font-sans font-bold text-xs text-[var(--theme-text)] outline-none transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (payType === "gpu" && !selectedGpu)}
                  className="w-full py-3.5 px-4 btn-3d-primary text-white font-display font-black text-xs uppercase tracking-wider rounded-[var(--theme-radius)] flex items-center justify-center gap-2 transition-all cursor-pointer outline-none active:scale-[0.98] shadow-md"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Pay {formatCurrency(finalAmount)}</span>
                  )}
                </button>
              </form>
            ) : depositMode === "manual" ? (
              /* MANUAL DEPOSIT FORM */
              <form onSubmit={handleStartManualPayment} className="space-y-4">
                {/* Render a minimal card of the GPU Rig if Paying for a Rig */}
                {payType === "gpu" && selectedGpu && (
                  <div className="p-2 flex items-center justify-between gap-3 relative overflow-hidden mb-2">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-700/10 border border-blue-500/20 overflow-hidden shrink-0">
                        {selectedGpu.imageUrl ? (
                          <img src={selectedGpu.imageUrl} alt={selectedGpu.name} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-blue-500"><Cpu className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[13px] text-slate-100 uppercase">{selectedGpu.name}</h4>
                        <p className="font-sans text-[12px] text-slate-500 uppercase tracking-wider font-semibold">Daily yield: +{formatCurrency(selectedGpu.dailyYield)}</p>
                      </div>
                    </div>
                    <div className="text-right font-sans text-xs font-bold text-blue-500">
                      {formatCurrency(selectedGpu.amount)}
                    </div>
                  </div>
                )}

                {/* Receiver Merchant numbers box */}
                <div className="p-4 bg-[var(--theme-bg)]/40 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] space-y-3 relative overflow-hidden">
                  <div>
                    <span className="font-sans text-[12px] text-[var(--theme-primary)] uppercase tracking-wider font-extrabold block">Direct Cash Transfer</span>
                    <p className="text-xs font-sans text-[var(--theme-text)] opacity-80 leading-relaxed mt-1">
                      Send exactly <span className="font-bold text-[var(--theme-text)]">{formatCurrency(finalAmount)}</span> to one of our receiver lines below, then paste the transaction ID as proof.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-2.5 border-t border-[var(--theme-card-border)]">
                    {/* MTN */}
                    {config.mtnReceiverPhone ? (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-sans font-extrabold text-amber-500 flex items-center gap-1 tracking-wider uppercase">
                          {config.mtnLogoUrl && (
                            <img src={config.mtnLogoUrl} alt="MTN" className="w-4 h-4 object-contain rounded bg-slate-950 p-0.5" />
                          )}
                          MTN UGANDA
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <div className="font-sans text-xs font-bold text-[var(--theme-text)] select-all">{config.mtnReceiverPhone}</div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(config.mtnReceiverPhone);
                              toast.success("MTN number copied!");
                            }}
                            className="p-1 text-[var(--theme-text)] opacity-70 hover:opacity-100 transition-colors bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded shrink-0 cursor-pointer"
                            title="Copy MTN Phone Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs font-sans font-bold text-[var(--theme-text)] opacity-80 truncate mt-1">{config.mtnReceiverName || "ECOSYSTEM"}</div>
                      </div>
                    ) : (
                      <div className="font-sans text-[12px] text-slate-500 uppercase tracking-wider font-semibold block">MTN offline</div>
                    )}

                    {/* Airtel */}
                    {config.airtelReceiverPhone ? (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-sans font-extrabold text-rose-500 flex items-center gap-1 tracking-wider uppercase">
                          {config.airtelLogoUrl && (
                            <img src={config.airtelLogoUrl} alt="Airtel" className="w-4 h-4 object-contain rounded bg-slate-950 p-0.5" />
                          )}
                          AIRTEL MONEY
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <div className="font-sans text-xs font-bold text-[var(--theme-text)] select-all">{config.airtelReceiverPhone}</div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(config.airtelReceiverPhone);
                              toast.success("Airtel number copied!");
                            }}
                            className="p-1 text-[var(--theme-text)] opacity-70 hover:opacity-100 transition-colors bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded shrink-0 cursor-pointer"
                            title="Copy Airtel Phone Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs font-sans font-bold text-[var(--theme-text)] opacity-80 truncate mt-1">{config.airtelReceiverName || "ECOSYSTEM"}</div>
                      </div>
                    ) : (
                      <div className="font-sans text-[12px] text-slate-500 uppercase tracking-wider font-semibold block">Airtel offline</div>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-4 bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] space-y-3">
                  {/* Sender Phone */}
                  <div className="space-y-1">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Your Sender Phone Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--theme-primary)]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. 0771234567"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-2.5 pl-10 pr-4 font-sans text-xs text-[var(--theme-text)] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Amount input */}
                  <div className="space-y-1">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Amount Sent (UGX)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-sans text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold">
                        UGX
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        min={500}
                        required
                        disabled={payType === "gpu"}
                        value={payType === "gpu" ? (selectedGpu?.amount || 0) : manualAmount}
                        onChange={(e) => setManualAmount(Number(e.target.value))}
                        className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-2.5 pl-12 pr-4 font-sans font-bold text-xs text-[var(--theme-text)] outline-none transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Reference ID input */}
                  <div className="space-y-1">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Transaction Reference / TxID string
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Paste your mobile money TxID string"
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-2.5 px-4 font-sans text-xs text-[var(--theme-text)] outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (payType === "gpu" && !selectedGpu)}
                  className="w-full py-3.5 px-4 btn-3d-primary text-white font-display font-black text-xs uppercase tracking-wider rounded-[var(--theme-radius)] flex items-center justify-center gap-2 transition-all cursor-pointer outline-none active:scale-[0.98] shadow-md"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Confirm payment</span>
                  )}
                </button>
              </form>
            ) : depositMode === "usdt" ? (
              /* USDT DEPOSIT FORM */
              <form onSubmit={handleStartManualPayment} className="space-y-4">
                {/* Render a minimal card of the GPU Rig if Paying for a Rig */}
                {payType === "gpu" && selectedGpu && (
                  <div className="p-2 flex items-center justify-between gap-3 relative overflow-hidden mb-2">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-teal-700/10 border border-teal-500/20 overflow-hidden shrink-0">
                        {selectedGpu.imageUrl ? (
                          <img src={selectedGpu.imageUrl} alt={selectedGpu.name} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-teal-500"><Cpu className="w-6 h-6" /></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-[13px] text-slate-100 uppercase">{selectedGpu.name}</h4>
                        <p className="font-sans text-[12px] text-slate-500 uppercase tracking-wider font-semibold font-semibold">Daily yield: +{formatCurrency(selectedGpu.dailyYield)}</p>
                      </div>
                    </div>
                    <div className="text-right font-sans text-xs font-bold text-teal-500 relative z-10">
                      {formatCurrency(selectedGpu.amount)}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] space-y-3 relative overflow-hidden">
                  {config.usdtQrUrl && (
                    <div className="flex justify-center py-2 relative z-10">
                      <div className="w-32 h-32 rounded-[var(--theme-radius)] overflow-hidden border-2 border-[var(--theme-primary)]/40">
                        <img src={config.usdtQrUrl} alt="USDT QR Code" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <span className="font-sans text-[12px] text-[var(--theme-primary)] uppercase tracking-wider font-extrabold block">USDT Transfer</span>
                    <p className="text-xs font-sans text-[var(--theme-text)] opacity-80 leading-relaxed mt-1">
                      Send exactly <span className="font-bold text-[var(--theme-text)]">{formatCurrency(finalAmount)}</span> {config.usdtRate ? `(≈ $${(finalAmount / config.usdtRate).toFixed(2)} USDT)` : "(or equivalent)"} to the wallet below, then paste the transaction Hash/TxID.
                    </p>
                  </div>

                  <div className="space-y-0.5 pt-2.5 border-t border-[var(--theme-card-border)] relative z-10 flex items-center justify-between gap-2">
                    <div className="flex-1 overflow-hidden">
                      <span className="text-[11px] font-sans font-extrabold text-[var(--theme-primary)] block tracking-wider uppercase">{config.usdtNetwork || "USDT TRC20"}</span>
                      <div className="font-sans text-xs font-bold text-[var(--theme-text)] select-all truncate">{config.usdtAddress || "Wallet address not configured"}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        if (config.usdtAddress) {
                          navigator.clipboard.writeText(config.usdtAddress);
                          toast.success("Wallet address copied!");
                        }
                      }}
                      className="shrink-0 w-8 h-8 flex items-center justify-center bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] rounded-lg text-[var(--theme-text)] opacity-80 hover:opacity-100 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[var(--theme-bg)]/40 border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] space-y-3">
                  {/* Amount input */}
                  <div className="space-y-1">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Amount Sent (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-sans text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold">
                        USD
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        min={1}
                        required
                        disabled={payType === "gpu"}
                        value={payType === "gpu" ? ((selectedGpu?.amount || 0) / config.usdtRate).toFixed(2) : usdtAmountUSD}
                        onChange={(e) => setUsdtAmountUSD(Number(e.target.value))}
                        className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-2.5 pl-12 pr-4 font-sans font-bold text-xs text-[var(--theme-text)] outline-none transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    {payType !== "gpu" && (
                      <span className="text-[12px] text-[var(--theme-text)] opacity-60 font-mono block mt-1">
                        Equivalent to: ~{(usdtAmountUSD * config.usdtRate).toLocaleString()} UGX
                      </span>
                    )}
                  </div>

                  {/* Reference ID input */}
                  <div className="space-y-1">
                    <label className="font-sans text-[12px] text-[var(--theme-text)] opacity-70 uppercase tracking-wider font-extrabold block">
                      Transaction Hash / TxID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Paste your USDT TxID string"
                      value={manualRef}
                      onChange={(e) => setManualRef(e.target.value)}
                      className="w-full bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] hover:border-[var(--theme-primary)]/50 focus:border-[var(--theme-primary)] rounded-[var(--theme-radius)] py-2.5 px-4 font-sans text-xs text-[var(--theme-text)] outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (payType === "gpu" && !selectedGpu)}
                  className="w-full py-3.5 px-4 btn-3d-primary text-white font-display font-black text-xs uppercase tracking-wider rounded-[var(--theme-radius)] flex items-center justify-center gap-2 transition-all cursor-pointer outline-none active:scale-[0.98] shadow-md"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Confirm USDT Transfer</span>
                  )}
                </button>
              </form>
            ) : null}
          </div>
        ) : paymentStatus === "PENDING" ? (
          /* Polling screen */
          depositMode === "manual" || depositMode === "usdt" ? (
            <div className="py-10 text-center space-y-5">
              <div className="relative w-14 h-14 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-sans font-bold text-sm text-slate-100">
                  Verification Pending
                </h3>
                <p className="text-xs font-sans text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Ref ID: <span className="text-blue-400 font-semibold">{currentTransId}</span> is being reviewed by our desk. Your balance will credit once confirmed.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("IDLE");
                    setErrorMsg("Form reset. Check history tab for updates.");
                  }}
                  className="px-4 py-2 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-sans text-slate-400 hover:text-slate-200 transition-all cursor-pointer outline-none font-medium"
                >
                  Submit another proof
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-5">
              <div className="relative w-14 h-14 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/10 border-t-blue-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-sans font-bold text-sm text-slate-100">
                  Awaiting PIN Confirmation
                </h3>
                <p className="text-xs font-sans text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Sent secure prompt to <span className="text-blue-400 font-semibold">{mobileNumber}</span>. Please enter your PIN on your phone to approve UGX {finalAmount.toLocaleString()} Shs.
                </p>
              </div>


            </div>
          )
        ) : paymentStatus === "SUCCESSFUL" ? (
          /* Victory Completion Card */
          <div className="py-12 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-black text-sm text-slate-100 uppercase tracking-wide">
                {payType === "gpu" ? "Server Node Secured!" : "Account Credited Successfully!"}
              </h3>
              <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto">
                {payType === "gpu" 
                  ? `Your server node lease has been activated. Settled **UGX ${finalAmount.toLocaleString()} Shs** (Ref: ${currentTransId || "Completed"}).`
                  : `Your account has been credited. Settled **UGX ${finalAmount.toLocaleString()} Shs** (Ref: ${currentTransId || "Completed"}).`}
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 max-w-xs mx-auto">
              <div className="space-y-1.5 text-left text-[11px] font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Settled:</span>
                  <span className="text-slate-100 font-semibold">{finalAmount.toLocaleString()} UGX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-semibold">Approved</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-blue-400 font-semibold">
                    {payType === "gpu" && selectedGpu ? `${selectedGpu.name} Node` : "Account Deposit"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onBack}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-sans text-xs font-bold rounded-xl transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          /* Failed screen */
          <div className="py-12 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-extrabold text-xs text-rose-400 uppercase tracking-wide">
                Transaction Terminated
              </h3>
              <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto">
                {errorMsg || "The transaction failed or was declined."}
              </p>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setPaymentStatus("IDLE");
                  setErrorMsg("");
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl font-sans text-xs text-slate-300 outline-none cursor-pointer font-semibold"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-blue-600/10 border border-blue-500/25 text-blue-500 rounded-xl font-sans text-xs outline-none cursor-pointer font-semibold"
              >
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
