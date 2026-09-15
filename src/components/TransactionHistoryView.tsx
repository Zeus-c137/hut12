import React, { useState, useEffect } from "react";
import { Search, Loader2, AlertTriangle } from "lucide-react";
import dollar3d from "@/src/assets/3d/3dicons-dollar-iso-premium.png";
import wallet3d from "@/src/assets/3d/3dicons-wallet-iso-premium.png";
import bag3d from "@/src/assets/3d/3dicons-bag-iso-premium.png";
import fire3d from "@/src/assets/3d/3dicons-fire-iso-premium.png";
import giftBox3d from "@/src/assets/3d/3dicons-gift-box-iso-premium.png";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import medal3d from "@/src/assets/3d/3dicons-medal-iso-premium.png";
import bell3d from "@/src/assets/3d/3dicons-bell-iso-premium.png";
import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import shield3d from "@/src/assets/3d/3dicons-shield-iso-premium.png";
import { useCurrency } from "../currency";

interface Props {
  phone: string;
  siteConfig?: any;
  onBack?: () => void;
}

export default function TransactionHistoryView({ phone, siteConfig, onBack }: Props) {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchTxHistory = async () => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/profile/transactions/${phone}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchTxHistory();
  }, [phone]);

  const filtered = transactions.filter((tx) => {
    const t = (tx.type || "").toLowerCase();
    const matchesFilter =
      historyFilter === "all" ? true :
      historyFilter === "deposit" ? (t === "deposit" || t === "balance" || t === "manual") :
      historyFilter === "withdraw" ? (t === "withdrawal" || t === "withdraw") :
      historyFilter === "checkin" ? (t === "checkin" || t === "checkin_bonus") :
      historyFilter === "referral" ? t === "referral" :
      historyFilter === "voucher" ? t === "voucher" :
      historyFilter === "vip_task" ? t === "vip_task" : true;
    if (!matchesFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (tx.type || "").toLowerCase().includes(q) || (tx.status || "").toLowerCase().includes(q) || String(tx.amount).includes(q);
    }
    return true;
  });

  // Double-checked against src/db/schema.ts: 'deposit'|'withdrawal'|'yield'|'referral'|'vip_task'|'gpu_activation'|'checkin'|'gift' plus legacy variants balance/manual/subscription/gpu/checkin_bonus/register/daily accumulation/voucher/reward
  const getMeta = (t: string) => {
    const lower = (t||"").toLowerCase();
    if (["deposit","balance","manual"].includes(lower)) return { label: "Recharge", icon3d: dollar3d, card: "border-white/10 bg-transparent" };
    if (["withdrawal","withdraw"].includes(lower)) return { label: "Withdrawal", icon3d: wallet3d, card: "border-white/10 bg-transparent" };
    if (["gpu","subscription","gpu_activation"].includes(lower)) return { label: "Product", icon3d: bag3d, card: "border-white/10 bg-transparent" };
    if (["checkin","daily accumulation","yield","daily"].includes(lower)) return { label: "Check-in", icon3d: fire3d, card: "border-white/10 bg-transparent" };
    if (lower === "referral") return { label: "Referral", icon3d: money3d, card: "border-white/10 bg-transparent" };
    if (lower === "voucher") return { label: "Voucher", icon3d: giftBox3d, card: "border-white/10 bg-transparent" };
    if (["checkin_bonus","register","bonus","gift","reward"].includes(lower)) return { label: "Bonus", icon3d: medal3d, card: "border-white/10 bg-transparent" };
    if (lower === "vip_task") return { label: "VIP Task", icon3d: trophy3d, card: "border-white/10 bg-transparent" };
    return { label: "Transaction", icon3d: bell3d, card: "border-white/10 bg-transparent" };
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-transparent p-0 select-none">
      {/* Header like deposit/withdraw but no back */}
      <div className="flex items-center justify-center py-3 shrink-0">
        <h1 className="text-sm font-display font-black uppercase tracking-wider text-[var(--theme-text)]">Transaction History</h1>
      </div>

      {/* Search + Filter — sticky below header */}
      <div className="shrink-0 space-y-3 px-1 py-2 bg-transparent">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text)] opacity-40" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search type, status or amount..." className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] text-xs font-sans font-bold text-[var(--theme-text)] placeholder:text-[var(--theme-text)]/40 outline-none focus:border-[var(--theme-primary)]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 border-b border-[var(--theme-card-border)]">
          {[
            { id: "all", label: "All" },
            { id: "deposit", label: "Recharge" },
            { id: "withdraw", label: "Withdraw" },
            { id: "referral", label: "Referral" },
            { id: "checkin", label: "Check-in" },
            { id: "voucher", label: "Voucher" },
            { id: "vip_task", label: "VIP" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setHistoryFilter(tab.id)} className={`px-3.5 py-2.5 relative text-[11px] font-black uppercase tracking-wide shrink-0 transition-colors cursor-pointer ${historyFilter===tab.id ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-60 hover:opacity-100"}`}>{tab.label}{historyFilter===tab.id && <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[var(--theme-primary)] rounded-full" />}</button>
          ))}
        </div>
      </div>

      {/* Count badge above list — like deposit min/max */}
      <div className="flex justify-center py-2 shrink-0">
        <span className="text-[11px] font-bold opacity-50">{filtered.length} {filtered.length===1 ? "transaction" : "transactions"}</span>
      </div>

      {/* List — scrolls below tabs */}
      <div className="flex-1 overflow-y-auto overscroll-contain space-y-2.5 pb-8 scrollbar-none min-h-0">
        {txLoading ? (
          <div className="bg-transparent border border-white/10 rounded-[20px] p-10 flex flex-col items-center gap-2 backdrop-blur-[0px]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-primary)]" />
            <span className="text-xs font-bold text-[var(--theme-text)] opacity-60">Syncing ledger…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <img src={bell3d} alt="" className="w-12 h-12 object-contain opacity-50 mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-widest text-[var(--theme-text)]">No transactions</p>
            <p className="text-[11px] font-sans font-medium text-[var(--theme-text)] opacity-60 mt-1">Try a different filter or check back later.</p>
          </div>
        ) : (
          filtered.map(tx => {
            const t = (tx.type || "").toLowerCase();
            const meta = getMeta(t);
            
            const status = String(tx.status || "completed").toUpperCase();
            const isPositive = ["deposit","balance","manual","checkin","checkin_bonus","referral","voucher","vip_task","reward","register","yield","gift","gpu","subscription","gpu_activation"].includes(t);
            const metadata = tx.metadata || {};
            const fee = Number(metadata.feeAmount ?? 0);
            const payout = Number(metadata.payoutAmount ?? tx.amount ?? 0);
            const amount = (t==="withdrawal"||t==="withdraw") ? payout : (tx.amount||0);
            return (
              <div key={tx.id} className={`rounded-[20px] border border-white/10 p-3.5 flex items-center gap-3 bg-transparent ${meta.card}`}>
                <div className="w-11 h-11 rounded-xl bg-transparent border-0 flex items-center justify-center shrink-0">
                  <img src={meta.icon3d} alt="" className="w-11 h-11 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-display font-black uppercase tracking-wide text-[var(--theme-text)]">{meta.label}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${status==="SUCCESSFUL"||status==="COMPLETED" ? "bg-emerald-700/15 text-emerald-700 border-emerald-700/20" : status==="PENDING"?"bg-amber-500/15 text-amber-600 border-amber-500/20 animate-pulse":"bg-rose-500/15 text-rose-600 border-rose-500/20"}`}>{status}</span>
                  </div>
                  <p className="text-[11px] font-sans font-bold text-[var(--theme-text)] opacity-60 truncate mt-0.5">{new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleDateString()} • {new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {tx.operator ? `• ${tx.operator}` : ""}</p>
                  {(t==="withdrawal"||t==="withdraw") && fee>0 && <p className="text-[10px] font-bold text-[var(--theme-text)] opacity-50">Fee {formatCurrency(fee)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-display font-black tracking-tight ${isPositive?"text-emerald-700":"text-[var(--theme-text)]"}`}>{isPositive?"+":"-"} {formatCurrency(amount)}</p>
                  {siteConfig?.usdtRate && (tx.operator==="USDT"||String(tx.senderPhone||"").startsWith("T")) && <p className="text-[11px] font-black text-[var(--theme-primary)]">≈ ${(amount/ siteConfig.usdtRate).toFixed(2)}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
