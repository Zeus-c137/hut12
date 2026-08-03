/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { Phone, Lock, UserPlus, LogIn, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff, MessageSquare, Send, ShieldAlert, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import ParticleBg from "./ParticleBg";
import { BrandLogo } from "./BrandLogo";
import { fixGitHubImageUrl } from "../utils/imageUtils";

interface AuthViewProps {
  onAuthSuccess: (profile: UserProfile) => void;
  siteConfig?: any;
}

export default function AuthView({ onAuthSuccess, siteConfig }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register" | "support">("landing");
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [localSiteConfig, setLocalSiteConfig] = useState<any>(null);

  // 7-Day Countdown Timer state for Limited-Time Offer
  const [timerSeconds, setTimerSeconds] = useState(6 * 86400 + 23 * 3600 + 59 * 60 + 45);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 7 * 86400));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSecs: number) => {
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${d.toString().padStart(2, '0')}d : ${h.toString().padStart(2, '0')}h : ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`;
  };

  useEffect(() => {
    fetch("/api/config/site")
      .then(r => r.json())
      .then(data => {
        if (!data.error) setLocalSiteConfig(data);
      })
      .catch(() => {});
  }, []);

  const activeConfig = localSiteConfig || siteConfig;

  useEffect(() => {
    let ref = null;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      ref = searchParams.get("ref");
      if (!ref) {
        const hashIndex = window.location.hash.indexOf("?");
        if (hashIndex !== -1) {
          const hashParams = new URLSearchParams(window.location.hash.substring(hashIndex));
          ref = hashParams.get("ref");
        }
      }
    } catch (e) {}

    if (ref) {
      setAuthMode("register");
      setInviteCode(ref.toUpperCase());
      setTimeout(() => {
        toast.success(`Referral code applied: ${ref.toUpperCase()}`);
      }, 500);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const isRegister = authMode === "register";

    if (!phone || !password) {
      setErrorMsg("Please enter both phone and password.");
      return;
    }
    
    if (!/^\d{9,10}$/.test(phone)) {
      setErrorMsg("Phone number must be 9 or 10 digits.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setErrorMsg("Password must be between 8 and 128 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister 
        ? { phone, password, confirmPassword, inviteCode }
        : { phone, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Try again.");
      }

      if (isRegister) {
        toast.success("Registration successful!");
        setSuccessMsg("Registration successful! Initiating welcome bonus...");
        setTimeout(() => {
          setAuthMode("login");
          setPassword("");
          setConfirmPassword("");
          setSuccessMsg("");
        }, 1200);
      } else {
        toast.success("Logged in successfully!");
        onAuthSuccess(data.profile);
      }
    } catch (err: any) {
      toast.error(err.message);
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const authBg = fixGitHubImageUrl(activeConfig?.authBgImage);
  const regBonus = activeConfig?.registrationBonus || 4000;
  const checkinBonus = activeConfig?.checkinBaseBonus || 200;
  const refPct = activeConfig?.level1InviteIncomePct || 20;

  return (
    <div 
      className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] font-[var(--theme-font-family)] flex flex-col items-center justify-center p-4 relative overflow-y-auto select-none transition-colors"
      style={{
        backgroundImage: authBg ? `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.75)), url('${authBg}')` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {!authBg && <ParticleBg />}

      {/* Main Container Envelope */}
      <div className="w-full max-w-xl my-auto z-10 py-6">
        
        <AnimatePresence mode="wait">
          {/* LANDING VIEW */}
          {authMode === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl mx-auto theme-card card-playful-3d p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-6"
            >
              {/* Top Nav Header Inside Main Card */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--theme-card-border)]/50">
                <div className="flex items-center gap-3">
                  <BrandLogo siteConfig={activeConfig} className="w-9 h-9 rounded-lg shrink-0" />
                  <div>
                    <h1 className="font-display font-black text-xl tracking-tight text-[var(--theme-primary)] drop-shadow-sm leading-tight">
                      {activeConfig?.brandName || "Vortex"}
                    </h1>
                    <span className="text-[10px] text-[var(--theme-text)] opacity-75 font-bold block">
                      {activeConfig?.description || activeConfig?.siteDescription || "Automated Yield Platform"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inner Content Grid (Text layout directly on container background) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Panel 1: Member Benefits */}
                <div className="space-y-3 p-1">
                  <div className="flex items-center gap-2 pb-2 border-b border-[var(--theme-card-border)]/40">
                    <span className="text-lg">🎁</span>
                    <h3 className="font-display font-black text-sm text-[var(--theme-text)]">
                      Member Benefits
                    </h3>
                  </div>

                  <ul className="space-y-2 text-xs text-[var(--theme-text)] opacity-90">
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--theme-primary)] font-bold shrink-0">✅</span>
                      <span>
                        <strong className="font-extrabold text-[var(--theme-text)]">UGX {regBonus.toLocaleString()}</strong> Welcome Bonus
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--theme-accent)] font-bold shrink-0">🎯</span>
                      <span>
                        <strong className="font-extrabold text-[var(--theme-text)]">UGX {checkinBonus.toLocaleString()}</strong> Daily Reward
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--theme-secondary)] font-bold shrink-0">👥</span>
                      <span>
                        Up to <strong className="font-extrabold text-[var(--theme-text)]">{refPct}%</strong> Referral Cashback
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-amber-500 font-bold shrink-0">🎁</span>
                      <span>
                        Gift Codes worth <strong className="font-extrabold text-[var(--theme-text)]">UGX 5,000</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[var(--theme-primary)] font-bold shrink-0">💸</span>
                      <span>
                        Withdrawals from <strong className="font-extrabold text-[var(--theme-text)]">UGX 4,000</strong>
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Panel 2: Start Earning */}
                <div className="space-y-3 p-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-[var(--theme-card-border)]/40">
                      <span className="text-lg">📈</span>
                      <h3 className="font-display font-black text-sm text-[var(--theme-text)]">
                        Start Earning
                      </h3>
                    </div>

                    <p className="text-xs text-[var(--theme-text)] opacity-85 leading-relaxed">
                      Rent a machine and receive automatic daily profits directly to your account.
                    </p>
                  </div>

                  {/* High-Energy Gamified 4-Block Countdown Timer */}
                  <div className="pt-2 text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-[var(--theme-accent)] flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[var(--theme-accent)] animate-ping" />
                        Limited-Time Launch Offer
                      </h4>
                      <span className="text-[10px] font-extrabold text-[var(--theme-secondary)] uppercase tracking-wider">Ends Soon</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "DAYS", val: String(Math.floor(timerSeconds / 86400)).padStart(2, '0') },
                        { label: "HRS", val: String(Math.floor((timerSeconds % 86400) / 3600)).padStart(2, '0') },
                        { label: "MINS", val: String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0') },
                        { label: "SECS", val: String(timerSeconds % 60).padStart(2, '0') }
                      ].map((unit) => (
                        <div 
                          key={unit.label}
                          className="bg-[var(--theme-bg)]/80 border border-[var(--theme-input-border)] rounded-xl p-1.5 text-center shadow-inner relative overflow-hidden"
                        >
                          <div className="text-sm sm:text-base font-mono font-black tracking-wider text-[var(--theme-secondary)]">
                            {unit.val}
                          </div>
                          <div className="text-[8px] font-black text-[var(--theme-accent)] tracking-widest opacity-80 mt-0.5 uppercase">
                            {unit.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Action CTA Buttons Inside Main Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className="btn-3d-primary py-3.5 px-6 text-white text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>REGISTER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="btn-3d-secondary py-3.5 px-6 text-[var(--theme-text)] text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span>LOGIN</span>
                </button>
              </div>

              {/* Support Desk Link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("support")}
                  className="text-xs text-[var(--theme-text)] opacity-60 hover:opacity-100 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                  <span>Need Help? Contact Support Desk</span>
                </button>
              </div>

            </motion.div>
          )}

          {/* LOGIN & REGISTER FORM VIEW */}
          {(authMode === "login" || authMode === "register") && (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto theme-card card-playful-3d p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-5"
            >
              {/* Logo and Name WITHIN the form card with NO description */}
              <div className="text-center space-y-1.5 pb-1">
                <BrandLogo siteConfig={activeConfig} className="w-14 h-14 mx-auto block bg-transparent shadow-none" />
                <h2 className="font-display font-extrabold text-2xl text-[var(--theme-text)]">
                  {activeConfig?.brandName || "Vortex"}
                </h2>
              </div>

              {/* Error & Success notifications */}
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex gap-2.5 items-center text-xs text-rose-500 font-bold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex gap-2.5 items-center text-xs text-emerald-500 font-bold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-80">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[var(--theme-text)] opacity-50 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0770000000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-80">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--theme-text)] opacity-50 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-[var(--theme-text)] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === "register" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-80">Confirm Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[var(--theme-text)] opacity-50 absolute left-3.5 top-3.5" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3.5 text-[var(--theme-text)] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] opacity-80">Invite Code (Optional)</label>
                        <span className="text-[11px] font-bold text-emerald-500">Yield cashback enabled</span>
                      </div>
                      <div className="relative">
                        <UserPlus className="w-4 h-4 text-[var(--theme-text)] opacity-50 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          placeholder="REFERRAL CODE"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-card-border)] focus:border-[var(--theme-primary)] text-[var(--theme-text)] text-sm rounded-[var(--theme-radius)] outline-none transition-colors uppercase font-mono"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-3d-primary w-full py-3.5 mt-2 text-white font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : authMode === "register" ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>REGISTER</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>LOGIN</span>
                    </>
                  )}
                </button>
              </form>

              {/* Mode Toggles */}
              <div className="text-center pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "register" ? "login" : "register");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-[var(--theme-primary)] hover:underline cursor-pointer block w-full"
                >
                  {authMode === "register" ? "Already a member? Login instead" : "New member? Create free account"}
                </button>
                
                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setAuthMode("support"); setErrorMsg(""); setSuccessMsg(""); }}
                    className="text-xs text-[var(--theme-text)] opacity-60 hover:opacity-100 transition-opacity cursor-pointer block w-full"
                  >
                    Forgot Password?
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => { setAuthMode("landing"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="text-xs text-[var(--theme-text)] opacity-50 hover:opacity-100 transition-opacity cursor-pointer block w-full pt-1"
                >
                  ← Home
                </button>
              </div>
            </motion.div>
          )}

          {/* SUPPORT DESK VIEW - ONLY logo in support desk form, WhatsApp & Telegram placements configured via siteConfig */}
          {authMode === "support" && (
            <motion.div
              key="support"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-md mx-auto theme-card card-playful-3d p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-6"
            >
              {/* Only leave the logo in the support desk form with title (no description) */}
              <div className="text-center space-y-2">
                <BrandLogo siteConfig={activeConfig} className="w-14 h-14 mx-auto block bg-transparent shadow-none" />
                <h2 className="text-2xl font-extrabold text-[var(--theme-text)]">Support Desk</h2>
              </div>

              {/* WhatsApp and Telegram Placements configured via siteConfig */}
              <div className="space-y-3 pt-2">
                {/* WhatsApp Support Placement */}
                <a 
                  href={activeConfig?.whatsappLink || "https://wa.me/#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-3d-secondary w-full py-3.5 px-4 flex items-center gap-3 text-[var(--theme-text)] cursor-pointer hover:border-emerald-500/50 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 shrink-0 fill-emerald-500"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  <div className="text-left font-sans flex-1">
                    <div className="font-bold text-sm">WhatsApp Support</div>
                    <div className="text-xs opacity-70">Live agent chat</div>
                  </div>
                </a>
                
                {/* Telegram Channel Placement */}
                <a 
                  href={activeConfig?.telegramLink || "https://t.me/#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-3d-secondary w-full py-3.5 px-4 flex items-center gap-3 text-[var(--theme-text)] cursor-pointer hover:border-sky-500/50 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 shrink-0 fill-sky-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.94z"/></svg>
                  <div className="text-left font-sans flex-1">
                    <div className="font-bold text-sm">Telegram Channel</div>
                    <div className="text-xs opacity-70">Official community announcements</div>
                  </div>
                </a>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
