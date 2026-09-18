import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { RotateCcw, Trophy, Zap, Hand } from "lucide-react";
import { Button } from "./ui/button";
import flash3d from "@/src/assets/3d/3dicons-flash-iso-premium.png";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import confetti from "canvas-confetti";

const BEST_KEY = "hut12_react_best";
const ROUNDS = 5;
const FOUL_MS = 500;

type Phase = "idle" | "waiting" | "ready" | "reveal" | "done";

function readBest(): number | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function rankFor(avg: number): string {
  if (avg < 220) return "Cyborg reflexes";
  if (avg < 260) return "Pro gamer";
  if (avg < 320) return "Sharp";
  if (avg < 400) return "Warming up";
  return "Sleepy";
}

// Frontend-only reaction rush. No loops, no lists — one timeout per round,
// so there is nothing to desync. Best average lives in localStorage.
export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(1);
  const [times, setTimes] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState(0);
  const [fouled, setFouled] = useState(false);
  const [best, setBest] = useState<number | null>(() => readBest());
  const [newBest, setNewBest] = useState(false);
  const [reduced] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const timerRef = useRef<number | null>(null);
  const greenAtRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => clearTimer, []);

  const beginRound = (roundNum: number) => {
    clearTimer();
    setRound(roundNum);
    setFouled(false);
    setPhase("waiting");
    timerRef.current = window.setTimeout(() => {
      greenAtRef.current = Date.now();
      setPhase("ready");
    }, 1500 + Math.random() * 2500);
  };

  const startGame = () => {
    setTimes([]);
    setNewBest(false);
    beginRound(1);
  };

  const finishGame = (all: number[]) => {
    const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    setPhase("done");
    const prev = readBest();
    if (prev === null || avg < prev) {
      setBest(avg);
      setNewBest(true);
      try { localStorage.setItem(BEST_KEY, String(avg)); } catch {}
      if (!reduced) {
        try {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } catch {}
      }
    } else {
      setNewBest(false);
    }
  };

  const tapPad = () => {
    if (phase === "waiting") {
      // Too soon — foul scores a flat 500ms and the game moves on.
      clearTimer();
      const next = [...times, FOUL_MS];
      setTimes(next);
      setLastMs(FOUL_MS);
      setFouled(true);
      setPhase("reveal");
      timerRef.current = window.setTimeout(() => {
        if (next.length >= ROUNDS) finishGame(next);
        else beginRound(next.length + 1);
      }, 1100);
    } else if (phase === "ready") {
      const ms = Date.now() - greenAtRef.current;
      const next = [...times, ms];
      setTimes(next);
      setLastMs(ms);
      setFouled(false);
      setPhase("reveal");
      timerRef.current = window.setTimeout(() => {
        if (next.length >= ROUNDS) finishGame(next);
        else beginRound(next.length + 1);
      }, 1100);
    }
  };

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  return (
    <div className="space-y-3 select-none">
      {/* Round pips + best */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: ROUNDS }).map((_, i) => {
            const t = times[i];
            return (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  t === undefined
                    ? "bg-[var(--theme-card-border)]/60"
                    : t >= FOUL_MS
                      ? "bg-red-500"
                      : t < 260
                        ? "bg-emerald-500"
                        : "bg-amber-400"
                }`}
              />
            );
          })}
          <span className="ml-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60">
            Round {Math.min(round, ROUNDS)}/{ROUNDS}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Best avg</p>
          <p className="font-display font-black text-lg text-[var(--theme-primary)] tracking-tight leading-none mt-1 tabular-nums">
            {best !== null ? `${best}ms` : "—"}
          </p>
        </div>
      </div>

      {/* The pad */}
      <motion.div
        key={`${phase}-${round}`}
        initial={reduced ? false : { scale: 0.985 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.25 }}
      >
        <button
          type="button"
          onClick={tapPad}
          disabled={phase === "idle" || phase === "done"}
          aria-label={phase === "ready" ? "Tap now" : "Reaction pad"}
          // No full-field red/green floods: large saturated flashes are a
          // photosensitivity hazard. Neutral pad throughout; only the READY
          // state takes the brand-gold fill, and meaning rides on text.
          className={`relative w-full h-[280px] rounded-[24px] overflow-hidden transition-colors duration-150 focus:outline-none ${
            phase === "ready"
              ? "bg-[var(--theme-primary)] cursor-pointer active:scale-[0.99]"
              : "bg-[var(--theme-card-bg)]/60 border border-[var(--theme-card-border)]" + (phase === "waiting" ? " cursor-pointer" : "")
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            {phase === "idle" && (
              <>
                <img src={flash3d} alt="" draggable={false} className="w-14 h-14 object-contain drop-shadow-lg pointer-events-none" />
                <p className="font-display font-black text-lg text-[var(--theme-text)] tracking-tight">Reaction Rush</p>
                <p className="text-xs font-bold text-[var(--theme-text)] opacity-60 leading-relaxed max-w-[230px]">
                  Tap the instant it turns gold. 5 rounds — too soon costs you 500ms.
                </p>
              </>
            )}
            {phase === "waiting" && (
              <>
                <Hand className="w-10 h-10 text-[var(--theme-primary)]" />
                <p className="font-display font-black text-xl text-[var(--theme-text)] tracking-tight">Wait…</p>
                <span className="flex items-center gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </span>
              </>
            )}
            {phase === "ready" && (
              <p className="font-display font-black text-5xl text-white tracking-tight">TAP!</p>
            )}
            {phase === "reveal" && (
              <>
                <p className="font-display font-black text-5xl text-[var(--theme-text)] tracking-tight tabular-nums">
                  {fouled ? "Too soon!" : `${lastMs}ms`}
                </p>
                <p className="text-xs font-bold text-[var(--theme-text)] opacity-60">
                  {fouled ? "+500ms penalty" : lastMs < 260 ? "Lightning!" : lastMs < 350 ? "Nice!" : "Keep pushing"}
                </p>
              </>
            )}
            {phase === "done" && (
              <>
                {newBest ? (
                  <span className="px-3 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> New best!
                  </span>
                ) : (
                  <img src={trophy3d} alt="" draggable={false} className="w-12 h-12 object-contain drop-shadow pointer-events-none" />
                )}
                <p className="font-display font-black text-5xl text-[var(--theme-text)] tracking-tight tabular-nums">{avg}ms</p>
                <p className="text-xs font-bold text-[var(--theme-text)] opacity-60">{rankFor(avg)} • avg of {times.length}</p>
              </>
            )}
          </div>
        </button>
      </motion.div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {(phase === "idle" || phase === "done") && (
          <Button variant="gold-glossy" size="sm" onClick={startGame} glow={false}>
            {phase === "idle" ? (
              <><Zap className="w-4 h-4" /> Start</>
            ) : (
              <><RotateCcw className="w-4 h-4" /> Play again</>
            )}
          </Button>
        )}
        {(phase === "waiting" || phase === "ready" || phase === "reveal") && (
          <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-50">
            Round {Math.min(round, ROUNDS)} of {ROUNDS} • avg {avg}ms
          </p>
        )}
      </div>

      {/* Round history */}
      {times.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap px-2">
          {times.map((t, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums border ${
                t >= FOUL_MS
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-[var(--theme-card-border)] opacity-80"
              }`}
            >
              R{i + 1} · {t >= FOUL_MS && times[i] === FOUL_MS ? "foul" : `${t}ms`}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
