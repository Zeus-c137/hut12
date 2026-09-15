import React from "react";
import { useTheme } from "../context/ThemeContext";
import { BrandLogo } from "./BrandLogo";

interface VisaMetricCardProps {
  leftValue: string;
  leftLabel: string;
  leftSub?: string;
  rightValue: string;
  rightLabel: string;
  brandLabel?: string;
  variant?: "bank-dark" | "bank-light";
}

export default function VisaMetricCard({
  leftValue,
  leftLabel,
  leftSub,
  rightValue,
  rightLabel,
  brandLabel,
  variant = "bank-dark",
}: VisaMetricCardProps) {
  const { siteConfig } = useTheme();
  const displayBrand = brandLabel || siteConfig?.brandName || "Hut12";
  const isDark = variant === "bank-dark";

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] p-4 sm:p-5 select-none ${
        isDark
          ? "bg-[#0f0f0f] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          : "bg-white border border-black/[0.06] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
      }`}
    >
      {/* gold sheen */}
      <div
        className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[50px] pointer-events-none ${
          isDark ? "bg-[#CF7500]/12" : "bg-[#CF7500]/10"
        }`}
      />
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? "white" : "black"} 1px, transparent 0)`,
          backgroundSize: `14px 14px`,
        }}
      />

      <div className="relative flex items-start justify-between">
        <div
          className={`w-[42px] h-[32px] rounded-[6px] overflow-hidden relative shadow-sm shrink-0 ${
            isDark ? "border border-white/20" : "border border-black/10"
          }`}
          style={{
            background: isDark
              ? `linear-gradient(180deg, #d4b36a 0%, #c9a86a 45%, #8a6a2a 100%)`
              : `linear-gradient(180deg, #f6d48a 0%, #e6c278 45%, #b88a2a 100%)`,
          }}
        >
          <div className="absolute inset-[3px] rounded-[4px] border border-[#b8935a]/40 grid grid-cols-2 gap-0">
            <div className="border-r border-[#b8935a]/30 border-b border-[#b8935a]/30" />
            <div className="border-b border-[#b8935a]/30" />
            <div className="border-r border-[#b8935a]/30" />
            <div />
          </div>
          <div className="absolute left-1/2 top-1/2 w-[1px] h-[calc(100%-6px)] bg-[#b8935a]/40 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-[calc(100%-6px)] h-[1px] bg-[#b8935a]/40 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <BrandLogo siteConfig={siteConfig} className="w-9 h-9 flex items-center justify-center shrink-0" />
      </div>

      <div className="relative grid grid-cols-2 gap-6 mt-4">
        <div className="text-left min-w-0">
          <p
            className={`text-[10px] font-sans font-black uppercase tracking-[0.14em] leading-none ${
              isDark ? "text-white/40" : "text-black/40"
            }`}
          >
            {leftLabel}
          </p>
          <p
            className={`text-[20px] sm:text-[22px] font-display font-black tracking-tight leading-none mt-1.5 truncate ${
              isDark ? "text-white" : "text-[#1a1a1a]"
            }`}
          >
            {leftValue}
          </p>
          {leftSub && (
            <p className={`text-[10px] font-bold leading-none mt-1 ${isDark ? "text-white/40" : "text-black/40"}`}>{leftSub}</p>
          )}
        </div>
        <div className="text-left min-w-0">
          <p
            className={`text-[10px] font-sans font-black uppercase tracking-[0.14em] leading-none ${
              isDark ? "text-white/40" : "text-black/40"
            }`}
          >
            {rightLabel}
          </p>
          <p
            className={`text-[20px] sm:text-[22px] font-display font-black tracking-tight leading-none mt-1.5 truncate ${
              isDark ? "text-white" : "text-[#1a1a1a]"
            }`}
          >
            {rightValue}
          </p>
        </div>
      </div>

      <div className="relative flex items-end justify-between mt-4">
        <p
          className={`font-mono text-[11px] sm:text-xs tracking-[0.2em] select-none ${
            isDark ? "text-white/50" : "text-black/40"
          }`}
        >
          •••• •••• •••• 4821
        </p>
        <span
          className={`text-[10px] font-black tracking-[0.14em] uppercase leading-none ${
            isDark ? "text-white/25" : "text-black/25"
          }`}
        >
          {displayBrand}
        </span>
      </div>
    </div>
  );
}
