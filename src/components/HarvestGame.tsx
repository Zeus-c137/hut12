import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, RotateCcw, Trophy, Timer } from "lucide-react";
import { Button } from "./ui/button";
import dollar3d from "@/src/assets/3d/3dicons-dollar-iso-premium.png";
import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import star3d from "@/src/assets/3d/3dicons-star-iso-premium.png";
import confetti from "canvas-confetti";

const BEST_KEY = "hut12_harvest_best";
const GAMES_KEY = "hut12_harvest_games";
const ROUND_MS = 30000;
const COIN_TTL_MS = 1300;
const SPAWN_MS = 620;
const MAX_COINS = 6;
const ARTS = [dollar3d, money3d, star3d];

interface Coin {
  id: number;
  x: number;
  y: number;
  bornAt: number;
  art: string;
}

type Stage = "idle" | "playing" | "done";

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0) || 0;
  } catch {
    return 0;
  }
}

// Frontend-only tap-frenzy harvest game. Scores live in localStorage —
// nothing here touches balances, so there is no ledger to game.
export default function HarvestGame() {
  const [stage, setStage] = useState<Stage>("idle");
  const [coins, setCoins] = useState<Coin[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [best, setBest] = useState(() => readNumber(BEST_KEY));
  const [games, setGames] = useState(() => readNumber(GAMES_KEY));
  const [newBest, setNewBest] = useState(false);
  const [stats, setStats] = useState({ tapped: 0, spawned: 0 });
  const [reduced] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const idRef = useRef(0);
  const endAtRef = useRef(0);
  const spawnAccRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const tappedRef = useRef(0);
  const spawnedRef = useRef(0);
  const expiredFlagRef = useRef(false);
  const hideAtRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    setCoins([]);
    setStage("done");
    const s = scoreRef.current;
    setStats({ tapped: tappedRef.current, spawned: spawnedRef.current });
    setGames((prev) => {
      const g = prev + 1;
      try { localStorage.setItem(GAMES_KEY, String(g)); } catch {}
      return g;
    });
    if (s > readNumber(BEST_KEY)) {
      setNewBest(true);
      setBest(s);
      try { localStorage.setItem(BEST_KEY, String(s)); } catch {}
      if (!reduced) {
        try {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } catch {}
      }
    } else {
      setNewBest(false);
    }
  }, [reduced]);

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; }, [finish]);

  const start = () => {
    idRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    tappedRef.current = 0;
    spawnedRef.current = 0;
    spawnAccRef.current = SPAWN_MS;
    setScore(0);
    setCombo(0);
    setCoins([]);
    setNewBest(false);
    setTimeLeft(ROUND_MS);
    endAtRef.current = Date.now() + ROUND_MS;
    setStage("playing");
  };

  // Game clock: expiry, spawning, countdown.
  useEffect(() => {
    if (stage !== "playing") return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endAtRef.current - now);
      setTimeLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        finishRef.current();
        return;
      }
      spawnAccRef.current += 100;
      setCoins((prev) => {
        const alive = prev.filter((c) => now - c.bornAt < COIN_TTL_MS);
        expiredFlagRef.current = alive.length < prev.length;
        let next = alive;
        while (spawnAccRef.current >= SPAWN_MS && next.length < MAX_COINS) {
          spawnAccRef.current -= SPAWN_MS;
          idRef.current += 1;
          next = [
            ...next,
            {
              id: idRef.current,
              x: 6 + Math.random() * 80,
              y: 8 + Math.random() * 72,
              bornAt: now,
              art: ARTS[Math.floor(Math.random() * ARTS.length)],
            },
          ];
          spawnedRef.current += 1;
        }
        return next;
      });
      if (expiredFlagRef.current) {
        expiredFlagRef.current = false;
        comboRef.current = 0;
        setCombo(0);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [stage]);

  // Freeze the clock while the browser tab is hidden.
  useEffect(() => {
    if (stage !== "playing") return;
    const onVis = () => {
      const now = Date.now();
      if (document.hidden) {
        hideAtRef.current = now;
      } else if (hideAtRef.current !== null) {
        const delta = now - hideAtRef.current;
        endAtRef.current += delta;
        setCoins((prev) => prev.map((c) => ({ ...c, bornAt: c.bornAt + delta })));
        hideAtRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stage]);

  const tapCoin = (id: number) => {
    let tapped = false;
    setCoins((prev) => {
      if (!prev.some((c) => c.id === id)) return prev;
      tapped = true;
      return prev.filter((c) => c.id !== id);
    });
    if (!tapped) return;
    tappedRef.current += 1;
    const gain = 10 * (1 + Math.floor(comboRef.current / 5));
    comboRef.current += 1;
    setCombo(comboRef.current);
    scoreRef.current += gain;
    setScore(scoreRef.current);
  };

  const mult = 1 + Math.floor(combo / 5);
  const timeFrac = Math.max(0, timeLeft / ROUND_MS);
  const accuracy = stats.spawned > 0 ? Math.round((stats.tapped / stats.spawned) * 100) : 0;

  return (
    <div className="space-y-3 select-none">
      {/* Scoreboard */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Score</p>
          <p className="font-display font-black text-3xl text-[var(--theme-text)] tracking-tight leading-none mt-1 tabular-nums">{score}</p>
        </div>
        {combo >= 5 && stage === "playing" && (
          <span className="px-2.5 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black animate-pulse">×{mult} COMBO</span>
        )}
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Best</p>
          <p className="font-display font-black text-lg text-[var(--theme-primary)] tracking-tight leading-none mt-1 tabular-nums">{best}</p>
        </div>
      </div>

      {/* Timer bar */}
      <div className="flex items-center gap-2 px-1">
        <Timer className={`w-3.5 h-3.5 shrink-0 ${timeLeft <= 5000 && stage === "playing" ? "text-red-500" : "text-[var(--theme-primary)]"}`} />
        <div className="h-1.5 flex-1 rounded-full bg-[var(--theme-card-border)]/40 overflow-hidden">
          <div
            className={`h-full w-full rounded-full origin-left ${timeLeft <= 5000 && stage === "playing" ? "bg-red-500" : "bg-[var(--theme-primary)]"}`}
            style={{ transform: `scaleX(${stage === "playing" ? timeFrac : stage === "done" ? 0 : 1})` }}
          />
        </div>
        <span className="text-[11px] font-black tabular-nums text-[var(--theme-text)] opacity-70 w-7 text-right">
          {stage === "playing" ? Math.ceil(timeLeft / 1000) : "30"}
        </span>
      </div>

      {/* Arena */}
      <div className="relative h-[300px] rounded-[20px] border border-[var(--theme-card-border)]/60 bg-[var(--theme-bg)]/40 overflow-hidden touch-none">
        <AnimatePresence>
          {stage === "playing" &&
            coins.map((c) => (
              reduced ? (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => tapCoin(c.id)}
                  aria-label="Collect coin"
                  className="absolute w-12 h-12 -ml-6 -mt-6 cursor-pointer"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <img src={c.art} alt="" draggable={false} className="w-full h-full object-contain drop-shadow" />
                </button>
              ) : (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => tapCoin(c.id)}
                  aria-label="Collect coin"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileTap={{ scale: 0.8 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.3 }}
                  className="absolute w-12 h-12 -ml-6 -mt-6 cursor-pointer"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <img src={c.art} alt="" draggable={false} className="w-full h-full object-contain drop-shadow pointer-events-none" />
                </motion.button>
              )
            ))}
        </AnimatePresence>

        {stage === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex items-end gap-2">
              <img src={money3d} alt="" className="w-12 h-12 object-contain drop-shadow" />
              <img src={dollar3d} alt="" className="w-16 h-16 object-contain drop-shadow-lg -mb-1" />
              <img src={star3d} alt="" className="w-12 h-12 object-contain drop-shadow" />
            </div>
            <p className="text-xs font-bold text-[var(--theme-text)] opacity-70 leading-relaxed max-w-[240px]">
              Tap the coins before they vanish. Streaks build your combo multiplier!
            </p>
            <Button variant="gold-glossy" size="sm" onClick={start} glow={false}>
              <Play className="w-4 h-4" /> Play · 30s
            </Button>
          </div>
        )}

        {stage === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-[var(--theme-bg)]/60 backdrop-blur-[2px]">
            {newBest ? (
              <span className="px-3 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> New best!
              </span>
            ) : (
              <img src={star3d} alt="" className="w-12 h-12 object-contain drop-shadow opacity-80" />
            )}
            <p className="font-display font-black text-4xl text-[var(--theme-text)] tracking-tight tabular-nums">{score}</p>
            <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-60">
              {stats.tapped} tapped • {accuracy}% accuracy • {games} played
            </p>
            <Button variant="gold-glossy" size="sm" onClick={start} glow={false} className="mt-1">
              <RotateCcw className="w-4 h-4" /> Play again
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] font-bold text-[var(--theme-text)] opacity-40 px-2">
        Practice mode — scores stay on this device and never touch balances.
      </p>
    </div>
  );
}
