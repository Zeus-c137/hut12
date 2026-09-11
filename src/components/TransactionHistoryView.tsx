import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Coins, Cpu, Flame, Users, Gift, CheckCircle2, Trophy, Loader2, AlertTriangle, Search } from "lucide-react";
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

  const getMeta = (t: string) => {
    const lower = t.toLowerCase();
    if (lower === "deposit" || lower === "balance" || lower === "manual") return { label: "Recharge", icon: ArrowDownLeft, style: "bg-emerald-500 text-white shadow-emerald-500/30", card: "border-emerald-500/20 bg-emerald-500/[0.06]" };
    if (lower === "withdrawal" || lower === "withdraw") return { label: "Withdrawal", icon: ArrowUpRight, style: "bg-rose-500 text-white shadow-rose-500/30", card: "border-rose-500/20 bg-rose-500/[0.06]" };
    if (lower === "gpu" || lower === "subscription") return { label: "Product", icon: Cpu, style: "bg-sky-500 text-white shadow-sky-500/30", card: "border-sky-500/20 bg-sky-500/[0.06]" };
    if (lower === "checkin" || lower === "daily accumulation") return { label: "Check-in", icon: Flame, style: "bg-amber-500 text-white shadow-amber-500/30", card: "border-amber-500/20 bg-amber-500/[0.06]" };
    if (lower === "referral") return { label: "Referral", icon: Users, style: "bg-violet-500 text-white shadow-violet-500/30", card: "border-violet-500/20 bg-violet-500/[0.06]" };
    if (lower === "voucher") return { label: "Voucher", icon: Gift, style: "bg-indigo-500 text-white shadow-indigo-500/30", card: "border-indigo-500/20 bg-indigo-500/[0.06]" };
    if (lower === "checkin_bonus" || lower === "register") return { label: "Bonus", icon: CheckCircle2, style: "bg-teal-500 text-white shadow-teal-500/30", card: "border-teal-500/20 bg-teal-500/[0.06]" };
    if (lower === "vip_task") return { label: "VIP Task", icon: Trophy, style: "bg-yellow-500 text-white shadow-yellow-500/30", card: "border-yellow-500/20 bg-yellow-500/[0.06]" };
    return { label: "Transaction", icon: Coins, style: "bg-slate-500 text-white shadow-slate-500/30", card: "border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]" };
  };

  return (
    <div className="space-y-4 select-none pb-8">
      {/* Header like deposit/withdraw but no back */}
      <div className="flex items-center justify-center py-2">
        <h1 className="text-sm font-display font-black uppercase tracking-wider text-[var(--theme-text)]">Transaction History</h1>
      </div>

      {/* Search + Filter — no card */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text)] opacity-40" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search type, status or amount..." className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-card-border)] text-xs font-sans font-bold text-[var(--theme-text)] placeholder:text-[var(--theme-text)]/40 outline-none focus:border-[var(--theme-primary)]" />
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
      <div className="flex justify-center">
        <span className="text-[11px] font-bold opacity-50">{filtered.length} {filtered.length===1 ? "transaction" : "transactions"}</span>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {txLoading ? (
          <div className="theme-card border-2 border-[var(--theme-card-border)] rounded-[var(--theme-radius)] p-10 flex flex-col items-center gap-2 bg-[var(--theme-card-bg)]">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-primary)]" />
            <span className="text-xs font-bold text-[var(--theme-text)] opacity-60">Syncing ledger…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <AlertTriangle className="w-8 h-8 text-[var(--theme-text)] opacity-20 mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-widest text-[var(--theme-text)]">No transactions</p>
            <p className="text-[11px] font-sans font-medium text-[var(--theme-text)] opacity-60 mt-1">Try a different filter or check back later.</p>
          </div>
        ) : (
          filtered.map(tx => {
            const t = (tx.type || "").toLowerCase();
            const meta = getMeta(t);
            const Icon = meta.icon;
            const status = String(tx.status || "completed").toUpperCase();
            const isPositive = ["deposit","balance","manual","checkin","checkin_bonus","referral","voucher","vip_task","reward","register"].includes(t);
            const metadata = tx.metadata || {};
            const fee = Number(metadata.feeAmount ?? 0);
            const payout = Number(metadata.payoutAmount ?? tx.amount ?? 0);
            const amount = (t==="withdrawal"||t==="withdraw") ? payout : (tx.amount||0);
            return (
              <div key={tx.id} className={`theme-card card-playful-3d rounded-2xl border-2 p-3.5 flex items-center gap-3 shadow-sm bg-[var(--theme-card-bg)] ${meta.card}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md border border-white/20 ${meta.style}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-display font-black uppercase tracking-wide text-[var(--theme-text)]">{meta.label}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${status==="SUCCESSFUL"||status==="COMPLETED" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : status==="PENDING"?"bg-amber-500/15 text-amber-600 border-amber-500/20 animate-pulse":"bg-rose-500/15 text-rose-600 border-rose-500/20"}`}>{status}</span>
                  </div>
                  <p className="text-[11px] font-sans font-bold text-[var(--theme-text)] opacity-60 truncate mt-0.5">{new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleDateString()} • {new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {tx.operator ? `• ${tx.operator}` : ""}</p>
                  {(t==="withdrawal"||t==="withdraw") && fee>0 && <p className="text-[10px] font-bold text-[var(--theme-text)] opacity-50">Fee {formatCurrency(fee)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-display font-black tracking-tight ${isPositive?"text-emerald-600":"text-[var(--theme-text)]"}`}>{isPositive?"+":"-"} {formatCurrency(amount)}</p>
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
