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

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await fetch(`/api/profile/referrals/${userProfile.phone}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Failed to load referrals list stats:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReferrals();
  }, [userProfile.phone]);

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
  const lv1Stats = stats.filter((s) => s.level === 1);
  const lv2Stats = stats.filter((s) => s.level === 2);
  const lv1Count = lv1Stats.length;
  const lv2Count = lv2Stats.length;
  const lv1Earned = lv1Stats.reduce((sum, s) => sum + (s.rewardAmount || 0), 0);
  const lv2Earned = lv2Stats.reduce((sum, s) => sum + (s.rewardAmount || 0), 0);

  const lvl1Pct = siteConfig?.level1InviteIncomePct !== undefined ? siteConfig.level1InviteIncomePct : 15;
  const lvl2Pct = siteConfig?.level2InviteIncomePct !== undefined ? siteConfig.level2InviteIncomePct : 5;

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

      {/* Shareable Link Box with Integrated Level 1 & Level 2 Metric Cards */}
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

        {/* Level 1 & Level 2 Metric Cards Grid BELOW input */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <MetricCard
            title={`Level 1 (${lvl1Pct}%)`}
            value={formatCurrency(lv1Earned)}
            subtitle={`${lv1Count} Direct ${lv1Count === 1 ? 'Friend' : 'Friends'}`}
            titleColor="primary"
            isLoading={isLoading}
          />

          <MetricCard
            title={`Level 2 (${lvl2Pct}%)`}
            value={formatCurrency(lv2Earned)}
            subtitle={`${lv2Count} Indirect ${lv2Count === 1 ? 'Friend' : 'Friends'}`}
            titleColor="secondary"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Friendly Commission Structure Card */}
      <div className="theme-card card-playful-3d p-5 rounded-[var(--theme-radius)] border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--theme-card-border)] pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider font-display text-[var(--theme-text)]">
            How Team Commissions Work
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Level 1 Card */}
          <div className="p-3.5 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[var(--theme-text)]">Level 1 Direct Friends</span>
              <span className="text-xs font-mono font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {lvl1Pct}% Bonus
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text)] opacity-75 leading-relaxed font-sans">
              Earn {lvl1Pct}% daily bonus yield every time your direct friends activate server machines.
            </p>
          </div>

          {/* Level 2 Card */}
          <div className="p-3.5 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[var(--theme-text)]">Level 2 Friends' Crew</span>
              <span className="text-xs font-mono font-black text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded-full border border-[var(--theme-primary)]/20">
                {lvl2Pct}% Bonus
              </span>
            </div>
            <p className="text-xs text-[var(--theme-text)] opacity-75 leading-relaxed font-sans">
              Earn {lvl2Pct}% extra bonus whenever friends brought in by your crew start mining.
            </p>
          </div>
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
                className="p-3 rounded-[var(--theme-radius)] bg-[var(--theme-bg)] border border-[var(--theme-card-border)] flex items-center justify-between gap-3 text-xs"
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
