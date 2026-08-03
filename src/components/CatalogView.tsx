/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SubscriptionItem, UserProfile } from "../types";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Info,
  ShieldAlert,
  Coins,
  Lock,
  DollarSign,
  ShoppingCart,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ParticleBg from "./ParticleBg";
import { useCurrency } from "../currency";
import { toast } from "sonner";

interface CatalogViewProps {
  items: SubscriptionItem[];
  userProfile: UserProfile;
  siteConfig?: any;
  activeSubscriptions?: any[];
  onSubscribeSuccess: (newSub: any, CostAmount: number) => void;
  onRentWithMmoney: (item: SubscriptionItem) => void;
}

type CategoryType = "All" | "DS" | "D" | "G" | "E" | "F";

export default function CatalogView({
  items,
  userProfile,
  siteConfig,
  activeSubscriptions = [],
  onSubscribeSuccess,
  onRentWithMmoney
}: CatalogViewProps) {
  const { formatCurrency } = useCurrency();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<SubscriptionItem | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubscribe = async (item: SubscriptionItem) => {
    if (item.outOfStock || item.disabled) {
      toast.error("This product is currently out of stock.");
      return;
    }

    // Check if ALREADY SUBSCRIBED to avoid duplicate locks
    const isAlreadySubscribed = activeSubscriptions.some(
      (sub) => sub.itemId === item.id && sub.status === "active"
    );

    if (isAlreadySubscribed) {
      toast.error(`You already have an active subscription for "${item.name}".`);
      return;
    }

    const rechargeBal = userProfile.rechargeBalance || 0;
    if (rechargeBal < item.amount) {
      toast.error(
        `Insufficient recharge balance. Buying ${item.name} requires ${formatCurrency(item.amount)}. Your account recharge balance is ${formatCurrency(rechargeBal)}. Please deposit funds first.`
      );
      return;
    }

    setSubmittingItemId(item.id);

    try {
      const res = await fetch("/api/items/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userProfile.phone, itemId: item.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to activate this product subscription.");
      }

      toast.success(`🎉 Successfully rented ${item.name}! Your product is now generating daily passive yields.`);
      onSubscribeSuccess(data.subscription, item.amount);
      
      // Close details drawer/page on success
      setTimeout(() => {
        setSelectedItem(null);
      }, 1500);

    } catch (err: any) {
      toast.error(err.message || "Failed to lock asset. Please try again.");
    } finally {
      setSubmittingItemId(null);
    }
  };

  // Build dynamic categories list
  const categoryList = React.useMemo(() => {
    const customConfigCats = siteConfig?.categories || [];
    const itemCats = items.map(i => i.category).filter(Boolean);
    const combined = Array.from(new Set([...customConfigCats, ...itemCats]));
    return ["All", ...combined];
  }, [siteConfig?.categories, items]);

  const filteredItems = items.filter((item) => {
    if (activeCategory === "All") return true;
    return item.category === activeCategory;
  });

  const getCategoryLabel = (cat: string) => {
    if (cat === "All") return "All";
    if (cat.toLowerCase().endsWith("series") || cat.toLowerCase().endsWith("series")) return cat;
    if (cat.length <= 3) return `${cat} series`;
    return cat;
  };

  return (
    <div className="w-full bg-transparent text-[var(--theme-text)] select-none pb-16 relative">
      <AnimatePresence mode="wait">
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-4 px-1"
        >
            {/* Top Metrics Card (My products & Recharge balance split in middle) */}
            <div className="theme-card card-playful-3d border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] p-4 shadow-sm">
              <div className="grid grid-cols-2 divide-x divide-[var(--theme-card-border)] text-center">
                <div className="px-2">
                  <p className="text-xl md:text-2xl font-display font-black text-[var(--theme-text)]">
                    {activeSubscriptions.filter((s) => s.status === "active").length}
                  </p>
                  <p className="text-[11px] font-sans font-extrabold uppercase tracking-wider text-[var(--theme-text)] opacity-60 mt-0.5">
                    My products
                  </p>
                </div>
                <div className="px-2">
                  <p className="text-xl md:text-2xl font-display font-black text-[var(--theme-primary)]">
                    {formatCurrency(userProfile.rechargeBalance || 0)}
                  </p>
                  <p className="text-[11px] font-sans font-extrabold uppercase tracking-wider text-[var(--theme-text)] opacity-60 mt-0.5">
                    Recharge balance
                  </p>
                </div>
              </div>
            </div>

            {/* Category selection Tabs bar with theme background container */}
            <div className="relative theme-card card-playful-3d border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] p-1.5 mb-4 shadow-sm">
              <div className="overflow-x-auto scrollbar-none">
                <div className="flex gap-2 min-w-max">
                  {categoryList.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          setErrorMsg("");
                        }}
                        className={`py-3 px-6 text-xs font-display font-black tracking-wider uppercase transition-all cursor-pointer outline-none select-none rounded-full ${
                          isSelected
                            ? "btn-3d-primary text-white shadow-md scale-105"
                            : "btn-3d-secondary text-[var(--theme-text)] border border-[var(--theme-card-border)]/50 opacity-80 hover:opacity-100"
                        }`}
                      >
                        <span>{getCategoryLabel(cat)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Horizontal elegant cards column container */}
            <div className="space-y-3 pt-1">
              {filteredItems.map((item, idx) => {
                const isLocking = activeSubscriptions.some(
                  (sub) => (sub.itemId === item.id || sub.itemName === item.name) && sub.status === "active"
                );

                const isExpired = activeSubscriptions.some(
                  (sub) => (sub.itemId === item.id || sub.itemName === item.name) && sub.status === "expired"
                ) && !isLocking;

                const isOutOfStock = item.outOfStock || item.disabled;

                // Cumulative calculated total income
                const totalIncome = item.dailyYield * item.duration;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                    className="relative flex flex-row theme-card card-playful-3d border border-[var(--theme-card-border)] rounded-[var(--theme-radius)] p-3 overflow-hidden transition-all duration-150 group select-none shadow-sm hover:border-[var(--theme-primary)]/70"
                  >
                    {/* Left portion: Hardware Image square with rounded sub-borders */}
                    <div className="w-28 h-28 md:w-36 md:h-36 relative overflow-hidden rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--theme-bg)] flex items-center justify-center text-[var(--theme-text)] opacity-40 text-xs font-mono">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Right portion: Custom specifications text parameters */}
                    <div className="flex-1 p-2 flex flex-col justify-between space-y-1.5 font-sans text-xs">
                      <div>
                        {/* Title Row with Rent Buy Pill Button */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--theme-card-border)]/40 mb-1.5">
                          <h3 className="font-display font-extrabold text-sm text-[var(--theme-primary)] uppercase tracking-tight leading-none truncate">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => handleSubscribe(item)}
                            disabled={submittingItemId === item.id || isOutOfStock || isExpired || isLocking}
                            className="btn-3d-primary text-white text-[11px] font-sans font-black py-1 px-3 rounded-full flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingItemId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isLocking ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                <span>RENTED</span>
                              </>
                            ) : isOutOfStock ? (
                              <span>SOLD OUT</span>
                            ) : isExpired ? (
                              <span>EXPIRED</span>
                            ) : (
                              <>
                                <ShoppingCart className="w-3 h-3" />
                                <span>RENT BUY</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Specs fields */}
                        <div className="space-y-1 text-[var(--theme-text)]">
                          <p className="flex items-baseline gap-1.5">
                            <span className="text-[11px] text-[var(--theme-text)] opacity-60 uppercase tracking-wider font-bold shrink-0">Duration:</span>
                            <span className="font-bold text-[var(--theme-text)]">{item.duration} Days</span>
                          </p>
                          <p className="flex items-baseline gap-1.5">
                            <span className="text-[11px] text-[var(--theme-text)] opacity-60 uppercase tracking-wider font-bold shrink-0">Price:</span>
                            <span className="font-bold text-[var(--theme-text)]">{formatCurrency(item.amount)}</span>
                          </p>
                          <p className="flex items-baseline gap-1.5">
                            <span className="text-[11px] text-[var(--theme-text)] opacity-60 uppercase tracking-wider font-bold shrink-0">Daily income:</span>
                            <span className="font-bold text-[var(--theme-text)]">{formatCurrency(item.dailyYield)}</span>
                          </p>
                          <p className="flex items-baseline gap-1.5">
                            <span className="text-[11px] text-[var(--theme-text)] opacity-60 uppercase tracking-wider font-bold shrink-0">Total income:</span>
                            <span className="font-bold text-[var(--theme-text)]">{formatCurrency(totalIncome)}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Full card status banner overlay */}
                    {isExpired ? (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-2xl md:text-3xl font-sans font-black tracking-wide text-white drop-shadow-md select-none">
                          EXPIRED
                        </span>
                      </div>
                    ) : isOutOfStock ? (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                        <span className="text-2xl md:text-3xl font-sans font-black tracking-wide text-white drop-shadow-md select-none">
                          SOLD OUT
                        </span>
                      </div>
                    ) : null}
                  </motion.div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-xs font-sans text-[var(--theme-text)] opacity-60 theme-card border border-dashed border-[var(--theme-card-border)] rounded-[var(--theme-radius)]">
                  No computational node hardware available under this filter.
                </div>
              )}
            </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
