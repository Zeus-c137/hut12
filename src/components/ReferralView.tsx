/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { UserProfile, ReferralStat } from "../types";
import { 
  Copy, 
  Users, 
  ArrowLeft, 
  Check, 
  Coins, 
  Loader2,
  Sparkles,
  Share2
} from "lucide-react";
import { useCurrency } from "../currency";
import MetricCard from "./MetricCard";
import { readApiJson } from "../utils/api";

interface ReferralViewProps {
  userProfile: UserProfile;
  siteConfig?: any;
  onBack?: () => void;
}

export default function ReferralView({ userProfile, siteConfig, onBack }: ReferralViewProps) {
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<ReferralStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [liveSiteConfig, setLiveSiteConfig] = useState<any>(siteConfig || null);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await fetch(`/api/profile/referrals/${userProfile.phone}`);
        const data = await readApiJson<ReferralStat[]>(res);
        setStats(Array.isArray(data) ? data : []);
        setLoadError("");
      } catch (e: any) {
        console.error("Failed to load referrals list stats:", e);
        setLoadError(e.message || "Referral data is temporarily unavailable.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReferrals();
  }, [userProfile.phone]);

  useEffect(() => {
    let isCurrent = true;
    const fetchReferralConfig = async () => {
      try {
        const res = await fetch("/api/config/site");
        const data = await readApiJson<any>(res);
        if (isCurrent && data && !data.error) setLiveSiteConfig(data);
      } catch (error) {
        console.warn("Failed to refresh referral site config:", error);
      }
    };
    void fetchReferralConfig();
    return () => {
      isCurrent = false;
    };
  }, []);

  const baseUrl = window.location.origin.replace(/\/$/, "");
  const inviteLink = userProfile.inviteCode 
    ? `${baseUrl}?ref=${userProfile.inviteCode}`
    : "";

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compute metrics from stats
  const referralConfig = liveSiteConfig || siteConfig || {};
  const levelMetrics = [1, 2, 3, 4].map((level) => {
    const levelStats = stats.filter((s) => Number(s.level) === level);
    const fallbackPct = level === 1 ? 15 : level === 2 ? 5 : 0;
    const configuredPct = Number(referralConfig[`level${level}InviteIncomePct`]);
    return {
      level,
      count: levelStats.length,
      earned: levelStats.reduce((sum, s) => sum + Number(s.rewardAmount || 0), 0),
      pct: Number.isFinite(configuredPct) ? configuredPct : fallbackPct
    };
  });

  return (
    <div className="space-y-5 select-none text-[var(--theme-text)] p-1 rounded-2xl pb-16">
      {/* Navigation Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-sans font-extrabold text-[var(--theme-text)] opacity-70 hover:opacity-100 transition-all cursor-pointer outline-none active:scale-95 py-1.5 px-3 rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
          <span>Profile</span>
        </button>
      )}

      {/* Shareable Link Box with four-level metrics */}
      <div className="theme-card card-playful-3d p-4 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[var(--theme-text)] opacity-90 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Your Personal Invite Link</span>
          </span>
          <span className="font-mono font-black text-[var(--theme-primary)] text-xs tracking-wider">
            CODE: {userProfile.inviteCode || "N/A"}
          </span>
        </div>

        {/* Input and Copy Button FIRST */}
        <div className="flex gap-2 items-center bg-[var(--theme-bg)] p-1.5 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)]">
          <span className="text-xs font-mono font-bold text-[var(--theme-text)] opacity-80 select-all py-1.5 px-2 flex-1 overflow-x-auto whitespace-nowrap scrollbar-none">
            {inviteLink || "No referral link generated"}
          </span>
          <button
            onClick={handleCopy}
            className={`btn-3d-primary px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all active:scale-95 ${
              copied ? "bg-emerald-600 border-emerald-500" : ""
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>COPY LINK</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {levelMetrics.map((metric) => (
            <MetricCard
              key={metric.level}
              title={`Level ${metric.level} (${metric.pct}%)`}
              value={formatCurrency(metric.earned)}
              subtitle={`${metric.count} ${metric.level === 1 ? "Direct" : "Indirect"}`}
              titleColor={metric.level % 2 === 0 ? "secondary" : "primary"}
              isLoading={isLoading}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--theme-card-border)] pt-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Collected invite income</p>
            <p className="text-[11px] opacity-60 mt-0.5">Actual referral bonuses credited to your balance</p>
          </div>
          <strong className="text-lg font-black font-display text-[var(--theme-primary)] whitespace-nowrap">
            {formatCurrency(Number(userProfile.referralRewardsEarned || 0))}
          </strong>
        </div>
      </div>

      {loadError && (
        <div className="rounded-[var(--theme-radius)] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-600">
          {loadError}
        </div>
      )}

      {/* Friendly Commission Structure Card */}
      <div className="theme-card card-playful-3d p-5 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--theme-card-border)] pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider font-display text-[var(--theme-text)]">
            How Team Commissions Work
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {levelMetrics.map((metric) => (
            <div key={metric.level} className="p-3.5 rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[var(--theme-text)]">Level {metric.level} {metric.level === 1 ? "Direct" : "Network"}</span>
                <span className="text-xs font-mono font-black text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--theme-primary)]/20">{metric.pct}% Bonus</span>
              </div>
              <p className="text-xs text-[var(--theme-text)] opacity-75 leading-relaxed font-sans">
                Earn {metric.pct}% whenever a Level {metric.level} referral activates a server machine.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Team Roster / Referral Crew */}
      <div className="theme-card card-playful-3d p-5 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider font-display text-[var(--theme-text)]">
            My Referral Crew ({stats.length})
          </h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[var(--theme-primary)]" />}
        </div>

        {stats.length === 0 ? (
          <div className="text-center py-8 space-y-2 bg-[var(--theme-bg)] p-4 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)]">
            <Users className="w-8 h-8 mx-auto text-[var(--theme-text)] opacity-30" />
            <p className="text-xs font-extrabold text-[var(--theme-text)] opacity-80">No friends invited yet!</p>
            <p className="text-[11px] text-[var(--theme-text)] opacity-60">Share your invite link above to start building your crew and earn rewards together.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((s, idx) => (
              <div
                key={idx}
                className="p-3 rounded-[var(--theme-radius)] bg-[var(--theme-card-bg)]/90 backdrop-blur-xl border border-[var(--theme-card-border)] flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white shrink-0 ${
                    s.level === 1 ? "bg-[var(--theme-primary)]" : "bg-[var(--theme-secondary)]"
                  }`}>
                    {s.phone ? s.phone.slice(-2) : "??"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[var(--theme-text)]">
                        {s.phone && s.phone.length > 6 ? s.phone.slice(0, 3) + "****" + s.phone.slice(-3) : s.phone}
                      </span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        s.level === 1 ? "bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]" : "bg-[var(--theme-secondary)]/15 text-[var(--theme-secondary)]"
                      }`}>
                        L{s.level}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--theme-text)] opacity-50 block font-sans">
                      Joined {(() => {
                        if (!s.joinedDate) return "Recently";
                        try {
                          const d = new Date(s.joinedDate);
                          if (isNaN(d.getTime())) return s.joinedDate;
                          return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        } catch (e) {
                          return s.joinedDate;
                        }
                      })()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono text-emerald-500 block">
                    {formatCurrency(s.rewardAmount || 0)}
                  </span>
                  <span className="text-[10px] text-[var(--theme-text)] opacity-60">
                    {(s as any).activeProductsCount || 0} active product(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
