import React, { useState, useRef, useEffect } from "react";
import { ArrowUpRight, Cpu, Flame } from "lucide-react";
import { SubscriptionItem } from "../types";
import { useCurrency } from "../currency";

interface FeaturedProductsProps {
  items: SubscriptionItem[];
  onBrowseProducts: () => void;
}

const POPULARITY = ["2.1k+", "1.4k+", "980+", "560+", "310+", "180+"];

export default function FeaturedProducts({ items, onBrowseProducts }: FeaturedProductsProps) {
  const { formatCurrency } = useCurrency();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const featuredItems = items.filter((item) => !item.disabled && !item.outOfStock).slice(0, 6);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || featuredItems.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const speed = 0.35;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current && document.visibilityState === "visible") {
        el.scrollLeft += (speed * dt) / 16;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onEnter = () => { pausedRef.current = true; };
    const onLeave = () => { pausedRef.current = false; };
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("touchstart", onEnter, { passive: true });
    el.addEventListener("touchend", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("touchstart", onEnter);
      el.removeEventListener("touchend", onLeave);
    };
  }, [featuredItems.length]);

  if (featuredItems.length === 0) return null;

  return (
    <section className="bg-[var(--theme-card-bg)]/40 backdrop-blur-[20px] backdrop-saturate-[180%] border border-white/10 rounded-[24px] p-3 sm:p-4 space-y-3" aria-labelledby="trending-products-title">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-1.5 text-amber-500">
            <Flame className="w-3.5 h-3.5 fill-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]">Trending products</span>
          </div>
          <h2 id="trending-products-title" className="text-[15px] font-black text-[var(--theme-text)] mt-0.5 leading-tight">
            Most chosen this week
          </h2>
        </div>
        <button
          type="button"
          onClick={onBrowseProducts}
          className="inline-flex items-center gap-1 text-[11px] font-black text-[var(--theme-primary)] hover:opacity-75 transition-opacity cursor-pointer shrink-0"
        >
          Browse all <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-1 px-1 pb-1">
        {featuredItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={onBrowseProducts}
            className="shrink-0 w-[200px] sm:w-[220px] snap-start rounded-[var(--theme-radius)] border border-white/10 bg-[var(--theme-card-bg)] overflow-hidden text-left cursor-pointer group hover:border-[var(--theme-primary)]/30 transition-colors flex flex-col shadow-sm"
            aria-label={`View ${item.name}`}
          >
            <div
              onClick={(e) => {
                if (!item.imageUrl) return;
                e.stopPropagation();
                setPreviewImage(item.imageUrl);
              }}
              className={`relative h-32 sm:h-40 bg-white overflow-hidden shrink-0 p-3 ${item.imageUrl ? "cursor-zoom-in" : ""}`}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--theme-primary)] opacity-40">
                  <Cpu className="w-8 h-8" />
                </div>
              )}
              <span className="absolute top-2 left-2 rounded-full bg-[var(--theme-card-bg)]/95 border border-[var(--theme-card-border)] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[var(--theme-primary)] backdrop-blur-sm">
                {item.category}
              </span>
              <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-black flex items-center gap-1 shadow-sm">
                <Flame className="w-3 h-3 fill-white shrink-0" /> {POPULARITY[index] ?? "100+"}
              </span>
            </div>
            <div className="p-2.5 flex flex-col gap-1.5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-black text-[var(--theme-text)] leading-tight line-clamp-1 flex-1 min-w-0">{item.name}</h3>
                <span className="shrink-0 rounded-full bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] px-2 py-0.5 text-[10px] font-black text-[var(--theme-text)] opacity-60">
                  {item.duration} days
                </span>
              </div>
              <div className="rounded-[calc(var(--theme-radius)-4px)] bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)]/60 px-2.5 py-2">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-50 leading-none">You earn</p>
                <p className="text-[12px] font-black text-[var(--theme-primary)] leading-none mt-1 truncate">{formatCurrency(item.dailyYield)}<span className="font-bold opacity-70"> / day</span></p>
              </div>
            </div>
          </button>
        ))}
      </div>
      {previewImage && (
        <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-[var(--theme-radius)] shadow-2xl object-contain" />
        </div>
      )}
    </section>
  );
}
