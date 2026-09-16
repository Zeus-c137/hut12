import React, { useState, useEffect, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import dollar3d from "@/src/assets/3d/3dicons-dollar-iso-premium.png";
import wallet3d from "@/src/assets/3d/3dicons-wallet-iso-premium.png";
import bag3d from "@/src/assets/3d/3dicons-bag-iso-premium.png";
import fire3d from "@/src/assets/3d/3dicons-fire-iso-premium.png";
import giftBox3d from "@/src/assets/3d/3dicons-gift-box-iso-premium.png";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import medal3d from "@/src/assets/3d/3dicons-medal-iso-premium.png";
import bell3d from "@/src/assets/3d/3dicons-bell-iso-premium.png";
import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import { useCurrency } from "../currency";
import { canonicalTypeOf, getTransactionDisplayMeta, isPositiveTransaction, getWithdrawalDisplayAmounts } from "@/src/utils/transactionMeta";
import { fixGitHubImageUrl } from "@/src/utils/imageUtils";

interface Props {
  phone: string;
  siteConfig?: any;
  onBack?: () => void;
}

const ICON_BY_CANON: Record<string, string> = {
  deposit: dollar3d,
  withdrawal: wallet3d,
  product_activation: bag3d,
  daily_yield: fire3d,
  daily_checkin_bonus: fire3d,
  registration_bonus: medal3d,
  gift_code: giftBox3d,
  referral_signup_bonus: money3d,
  referral_level_income: money3d,
  vip_task: trophy3d,
};

export default function TransactionHistoryView({ phone, siteConfig, onBack }: Props) {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState<any[]>([]);

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

  const fetchCatalog = async () => {
    try {
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        setCatalog(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTxHistory();
  }, [phone]);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const catalogById = useMemo(() => {
    const m = new Map<string, any>();
    for (const item of catalog) {
      if (item.id) m.set(String(item.id), item);
    }
    return m;
  }, [catalog]);

  const getProductForTx = (tx: any, canon: string) => {
    if (canon !== "daily_yield" && canon !== "product_activation") return null;
    const meta = tx.metadata || {};
    const id = String(meta.sourceItemId || meta.sourceItemName && catalog.find(c => c.name === meta.sourceItemName)?.id || tx.itemId || meta.subscriptionId || "").trim();
    // For daily_yield, also fallback to tx.itemId directly
    const directId = String(tx.itemId || "").trim();
    const lookupId = id || directId;
    if (!lookupId) return null;
    // try direct id lookup
    let product = catalogById.get(lookupId);
    if (product) return product;
    // for daily_yield via subscriptionId, we only have sub id not item id — try to find by itemId mapping already covered; if not found, try search by name
    const name = String(meta.sourceItemName || "").trim();
    if (name) {
      const byName = catalog.find(c => String(c.name).toLowerCase() === name.toLowerCase());
      if (byName) return byName;
    }
    return null;
  };

  const filtered = transactions.filter((tx) => {
    const canon = canonicalTypeOf(tx.type, tx.metadata) as string;
    const matchesFilter =
      historyFilter === "all" ? true :
      historyFilter === "deposit" ? canon === "deposit" :
      historyFilter === "withdraw" ? canon === "withdrawal" :
      historyFilter === "product" ? canon === "product_activation" :
      historyFilter === "yield" ? canon === "daily_yield" :
      historyFilter === "checkin" ? canon === "daily_checkin_bonus" :
      historyFilter === "voucher" ? canon === "gift_code" :
      historyFilter === "referral" ? (canon === "referral_signup_bonus" || canon === "referral_level_income") :
      historyFilter === "referral_bonus" ? canon === "referral_signup_bonus" :
      historyFilter === "referral_level" ? canon === "referral_level_income" :
      historyFilter === "vip_task" ? canon === "vip_task" :
      historyFilter === "registration_bonus" ? canon === "registration_bonus" :
      true;
    if (!matchesFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const meta = getTransactionDisplayMeta(tx.type, tx.metadata);
      const productName = String(tx.metadata?.sourceItemName || tx.itemId || "").toLowerCase();
      return canon.includes(q) || (tx.status || "").toLowerCase().includes(q) || String(tx.amount).includes(q) || productName.includes(q) || meta.label.toLowerCase().includes(q) || (meta.isReferralLevel && String(meta.level).includes(q));
    }
    return true;
  });

  const getMeta = (type: string, metadata?: any) => {
    const disp = getTransactionDisplayMeta(type, metadata);
    const canon = canonicalTypeOf(type, metadata) as string;
    return {
      label: disp.label,
      icon3d: ICON_BY_CANON[canon] ?? bell3d,
      card: "border-0 bg-transparent",
      canon,
      isProductWithName: disp.isProductWithName,
      productName: disp.productName,
      isReferralLevel: disp.isReferralLevel,
      level: disp.level,
    };
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 bg-[var(--theme-card-bg)]/40 backdrop-blur-[20px] backdrop-saturate-[180%] border-0 rounded-none p-0 select-none">
      <div className="flex items-center justify-center py-3 shrink-0">
        <h1 className="text-sm font-display font-black uppercase tracking-wider text-[var(--theme-text)]">Transaction History</h1>
      </div>

      <div className="shrink-0 space-y-3 px-1 py-2 bg-transparent">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text)] opacity-40" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search type, product, status or amount..." className="w-full pl-9 pr-3 py-2.5 rounded-full bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] text-xs font-sans font-bold text-[var(--theme-text)] placeholder:text-[var(--theme-text)]/40 outline-none focus:border-[var(--theme-primary)]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 border-b border-[var(--theme-card-border)]">
          {[
            { id: "all", label: "All" },
            { id: "deposit", label: "Recharge" },
            { id: "withdraw", label: "Withdraw" },
            { id: "product", label: "Product" },
            { id: "yield", label: "Yield" },
            { id: "referral", label: "Referral" },
            { id: "checkin", label: "Check-in" },
            { id: "voucher", label: "Gift Code" },
            { id: "vip_task", label: "VIP" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setHistoryFilter(tab.id)} className={`px-3.5 py-2.5 relative text-[11px] font-black uppercase tracking-wide shrink-0 transition-colors cursor-pointer ${historyFilter===tab.id ? "text-[var(--theme-primary)]" : "text-[var(--theme-text)] opacity-60 hover:opacity-100"}`}>{tab.label}{historyFilter===tab.id && <span className="absolute bottom-0 left-2 right-2 h-[3px] bg-[var(--theme-primary)] rounded-full" />}</button>
          ))}
        </div>
      </div>

      <div className="flex justify-center py-2 shrink-0">
        <span className="text-[11px] font-bold opacity-50">{filtered.length} {filtered.length===1 ? "transaction" : "transactions"}</span>
      </div>

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
            const meta = getMeta(tx.type, tx.metadata);
            const isPositive = isPositiveTransaction(tx.type, tx.metadata);
            const { fee, payout } = getWithdrawalDisplayAmounts(tx);
            const amount = meta.canon === "withdrawal" ? payout : (tx.amount||0);
            const showFee = meta.canon === "withdrawal" && fee>0;
            const level = meta.isReferralLevel ? meta.level : undefined;

            const product = getProductForTx(tx, meta.canon);
            const productImage = product ? fixGitHubImageUrl(product.imageUrl || product.image) : null;
            const productName = product?.name || String(tx.metadata?.sourceItemName || tx.itemId || "").trim();

            // Product activation: label as product name activated, icon as product image
            const displayLabel = meta.canon === "product_activation" && productName
              ? `${productName} Activated`
              : meta.canon === "daily_yield" && productName
                ? `${productName} Yield`
                : meta.label;

            const iconSrc = (meta.canon === "daily_yield" || meta.canon === "product_activation") && productImage
              ? productImage
              : meta.icon3d;

            const isProductIcon = (meta.canon === "daily_yield" || meta.canon === "product_activation") && !!productImage;

            return (
              <div key={tx.id} className={`rounded-[20px] border-0 p-3.5 flex items-center gap-3 bg-transparent ${meta.card}`}>
                <div className={`w-11 h-11 rounded-xl bg-transparent border-0 flex items-center justify-center shrink-0 overflow-hidden ${isProductIcon ? "bg-white/5" : ""}`}>
                  <img src={iconSrc} alt="" className={`${isProductIcon ? "w-11 h-11 object-cover rounded-xl" : "w-11 h-11 object-contain"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-display font-black uppercase tracking-wide text-[var(--theme-text)]">{displayLabel}</span>
                    {level != null && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20">L{level}</span>}
                  </div>
                  <p className="text-[11px] font-sans font-bold text-[var(--theme-text)] opacity-60 truncate mt-0.5">{new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleDateString()} • {new Date(tx.createdAt||tx.timestamp||Date.now()).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {tx.operator ? `• ${tx.operator}` : ""}</p>
                  {showFee && <p className="text-[10px] font-bold text-[var(--theme-text)] opacity-50">Fee {formatCurrency(fee)} • Payout {formatCurrency(payout)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-display font-black tracking-tight ${isPositive?"text-emerald-800":"text-[var(--theme-text)]"}`}>{isPositive?"+":"-"} {formatCurrency(amount)}</p>
                  {siteConfig?.usdtRate && (tx.operator==="USDT"||String(tx.usdtAddress||"").startsWith("T")||String(tx.phone||"").startsWith("T")) && <p className="text-[11px] font-black text-[var(--theme-primary)]">≈ ${(amount/ siteConfig.usdtRate).toFixed(2)}</p>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
