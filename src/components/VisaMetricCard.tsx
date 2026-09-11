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
}

export default function VisaMetricCard({ leftValue, leftLabel, leftSub, rightValue, rightLabel, brandLabel }: VisaMetricCardProps) {
  const { cardStyle, siteConfig } = useTheme();
  const isPlayful = cardStyle === "playful-3d";
  const displayBrand = brandLabel || siteConfig?.brandName || "PJ NATAL";

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border-2 p-4 sm:p-5 select-none ${isPlayful ? "shadow-[0_6px_0_0_var(--theme-card-shadow)] border-[var(--theme-card-border)]" : "shadow-lg border-[var(--theme-card-border)]"}`}
      style={{
        background: `linear-gradient(135deg, var(--theme-card-bg) 0%, var(--theme-bg) 100%)`,
      }}
    >
      {/* Subtle circuit pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, var(--theme-primary) 1px, transparent 0)`, backgroundSize: `18px 18px` }} />
      {/* Top gradient sheen like card hologram */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10 blur-2xl" style={{ background: `radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)` }} />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full opacity-10 blur-2xl" style={{ background: `radial-gradient(circle, var(--theme-accent) 0%, transparent 70%)` }} />

      {/* Header: Chip + logo */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Chip */}
          <div className="w-[42px] h-[32px] rounded-[6px] border border-[#c9a86a] overflow-hidden relative shadow-sm" style={{ background: `linear-gradient(180deg, #f9e79f 0%, #e6c278 45%, #c9a86a 100%)` }}>
            <div className="absolute inset-[3px] rounded-[4px] border border-[#b8935a]/40 grid grid-cols-2 gap-0">
              <div className="border-r border-[#b8935a]/30 border-b border-[#b8935a]/30" />
              <div className="border-b border-[#b8935a]/30" />
              <div className="border-r border-[#b8935a]/30" />
              <div />
            </div>
            <div className="absolute left-1/2 top-1/2 w-[1px] h-[calc(100%-6px)] bg-[#b8935a]/40 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-[calc(100%-6px)] h-[1px] bg-[#b8935a]/40 -translate-x-1/2 -translate-y-1/2" />
          </div>
          {/* Contactless */}
          <div className="flex items-center gap-1 opacity-60">
            <div className="w-[3px] h-5 rounded-full border-2 border-[var(--theme-text)] opacity-30" />
            <div className="w-[5px] h-6 rounded-full border-2 border-[var(--theme-text)] opacity-40 -ml-1" />
            <div className="w-[7px] h-7 rounded-full border-2 border-[var(--theme-text)] opacity-50 -ml-1" />
          </div>
        </div>
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden shrink-0">
          <BrandLogo siteConfig={siteConfig} className="w-8 h-8" />
        </div>
      </div>

      {/* Split metrics — the core */}
      <div className="relative grid grid-cols-2 divide-x divide-[var(--theme-card-border)] mt-4">
        <div className="pr-3 sm:pr-4 text-left">
          <p className="text-[10px] font-sans font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-50 leading-none">{leftLabel}</p>
          <p className="text-[20px] sm:text-[22px] font-display font-black tracking-tight leading-none mt-1.5 text-[var(--theme-text)]">{leftValue}</p>
          {leftSub && <p className="text-[10px] font-bold text-[var(--theme-text)] opacity-40 leading-none mt-1">{leftSub}</p>}
        </div>
        <div className="pl-3 sm:pl-4 text-left">
          <p className="text-[10px] font-sans font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-50 leading-none">{rightLabel}</p>
          <p className="text-[20px] sm:text-[22px] font-display font-black tracking-tight leading-none mt-1.5" style={{ color: "var(--theme-primary)" }}>{rightValue}</p>
        </div>
      </div>

      {/* Bottom: card number (all dots) + brand */}
      <div className="relative flex items-end justify-between mt-4">
        <p className="font-mono text-[11px] sm:text-xs tracking-[0.2em] text-[var(--theme-text)] opacity-35 select-none">••••  ••••  ••••  ••••</p>
        <span className="text-[12px] sm:text-[13px] font-display font-black tracking-widest text-[var(--theme-text)] leading-none">{displayBrand}</span>
      </div>
    </div>
  );
}
