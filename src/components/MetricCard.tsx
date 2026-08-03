import React from "react";

interface MetricCardProps {
  key?: React.Key;
  title: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
  titleColor?: "primary" | "secondary" | "accent" | string;
}

export default function MetricCard({ title, value, subtitle, isLoading, titleColor }: MetricCardProps) {
  let titleColorStyle: React.CSSProperties = {};
  let titleClass = "text-[var(--theme-text)] opacity-70 group-hover:opacity-90 font-extrabold";

  if (titleColor === "primary") {
    titleColorStyle = { color: "var(--theme-primary)" };
    titleClass = "font-black opacity-100";
  } else if (titleColor === "secondary") {
    titleColorStyle = { color: "var(--theme-secondary)" };
    titleClass = "font-black opacity-100";
  } else if (titleColor === "accent") {
    titleColorStyle = { color: "var(--theme-accent)" };
    titleClass = "font-black opacity-100";
  } else if (titleColor) {
    titleClass = `font-black opacity-100 ${titleColor}`;
  }

  return (
    <div className="relative overflow-hidden theme-card rounded-[var(--theme-radius)] p-4 h-[84px] flex flex-col justify-between transition-all group">
      {/* Subtle border shine */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--theme-card-border)] to-transparent opacity-40" />
      
      <div className="space-y-1">
        <span
          style={titleColorStyle}
          className={`text-[10px] font-sans uppercase tracking-widest block transition-colors ${titleClass}`}
        >
          {title}
        </span>
        <div className="flex items-baseline gap-1">
          {isLoading ? (
            <div className="h-5 w-24 bg-[var(--theme-card-border)]/50 rounded animate-pulse mt-1" />
          ) : (
            <span className="font-sans font-black text-[15.5px] text-[var(--theme-text)] leading-tight tracking-tight select-text">
              {value}
            </span>
          )}
          {subtitle && !isLoading && (
            <span className="text-[11.5px] text-[var(--theme-text)] opacity-60 font-medium lowercase">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      
      {/* Tiny clean tech element at bottom */}
      <div className="w-5 h-[1.5px] bg-[var(--theme-primary)] rounded-full transition-all group-hover:w-8" />
    </div>
  );
}
