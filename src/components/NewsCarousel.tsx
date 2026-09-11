import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface NewsCarouselProps {
  phone?: string;
  dynamicNews?: any[];
  fullWidth?: boolean;
}

export default function NewsCarousel({ phone, dynamicNews, fullWidth = false }: NewsCarouselProps) {
  const normalizedDynamicNews = dynamicNews ?? [];
  const dynamicNewsLen = normalizedDynamicNews.length;
  const [newsList, setNewsList] = useState<any[]>(() => {
    if (dynamicNewsLen > 0) return normalizedDynamicNews;
    return [];
  });
  const [loading, setLoading] = useState<boolean>(newsList.length === 0);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (dynamicNewsLen > 0) {
      setNewsList(normalizedDynamicNews);
      setLoading(false);
      return;
    }

    const userPhone = phone || localStorage.getItem("session_phone");
    if (userPhone) {
      const controller = new AbortController();
      fetch(`/api/profile/notifications/${userPhone}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => {
          if (controller.signal.aborted) return;
          if (Array.isArray(data)) {
            const backendNews = data.filter((n: any) => n.category === "news").map((n: any) => ({
              id: n.id,
              title: n.title,
              description: n.message,
              date: new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
              tag: n.metadata?.tag || "NEWS",
              imageUrl: n.metadata?.imageUrl || "https://images.unsplash.com/photo-1639762681485-074b7f4ec651?auto=format&fit=crop&q=80&w=600",
              link: n.metadata?.link || ""
            }));
            setNewsList(backendNews);
          }
        })
        .catch(err => {
          if ((err as any)?.name !== "AbortError") console.error("Failed to fetch backend news in NewsCarousel:", err);
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
      return () => controller.abort();
    } else {
      setLoading(false);
    }
  }, [phone, dynamicNewsLen]);

  useEffect(() => {
    if (newsList.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % newsList.length);
    }, 30000);
    return () => clearInterval(timer);
  }, [newsList.length]);

  const containerClasses = fullWidth
    ? "-mx-4 -mt-5 mb-5 rounded-b-[var(--theme-radius)] rounded-t-none border-x-0 border-t-0 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] relative overflow-hidden h-[200px] flex flex-col justify-end z-10 shadow-md"
    : "relative overflow-hidden h-[200px] flex flex-col justify-end rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] z-10 mb-6 shadow-md";

  if (loading && newsList.length === 0) {
    return (
      <div className={containerClasses}>
        <div className="absolute inset-0 bg-[var(--theme-bg)]/60 animate-pulse flex flex-col justify-end p-5 space-y-3">
          <div className="w-20 h-4 bg-[var(--theme-card-border)] rounded-full" />
          <div className="w-3/4 h-6 bg-[var(--theme-card-border)] rounded-md" />
          <div className="w-full h-4 bg-[var(--theme-card-border)] rounded-md" />
        </div>
      </div>
    );
  }

  if (!newsList || newsList.length === 0) {
    return null;
  }

  return (
    <div className={containerClasses}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 flex flex-col justify-end"
        >
          <div className="absolute inset-0">
            {newsList[currentSlide].imageUrl ? (
              <img
                src={newsList[currentSlide].imageUrl}
                alt="News Update"
                className="w-full h-full object-cover opacity-80"
                loading="lazy"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t" style={{ background: "linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0) 100%)" }} />
          </div>

          <div className="relative z-20 p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full btn-3d-primary text-[10px] font-black tracking-widest uppercase text-white mb-2 shadow-xs">
              {newsList[currentSlide].tag || "ANNOUNCEMENT"}
            </span>
            <h3 className="text-base font-display font-black text-white leading-snug mb-1 drop-shadow-sm">
              {newsList[currentSlide].title}
            </h3>
            <p className="text-xs text-slate-200 font-sans line-clamp-2 leading-relaxed opacity-90">
              {newsList[currentSlide].description}
            </p>
            {newsList[currentSlide].link && (
              <a href={newsList[currentSlide].link} target="_blank" rel="noreferrer" className="text-[12px] text-blue-300 font-bold mt-2 inline-block hover:underline">Read official announcement &rarr;</a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute top-4 right-5 z-20 flex gap-1.5">
        {newsList.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? "w-5 bg-[var(--theme-primary)]" : "w-2 bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
