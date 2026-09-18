import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, RotateCcw, Trophy, Timer, Bomb } from "lucide-react";
import { Button } from "./ui/button";
import dollar3d from "@/src/assets/3d/3dicons-dollar-iso-premium.png";
import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import star3d from "@/src/assets/3d/3dicons-star-iso-premium.png";
import gift3d from "@/src/assets/3d/3dicons-gift-box-iso-premium.png";
import fire3d from "@/src/assets/3d/3dicons-fire-iso-premium.png";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import confetti from "canvas-confetti";

const BEST_KEY = "hut12_whack_best";
const ROUND_MS = 30000;
const MOLE_TTL_MS = 1100;
const GOLDEN_CHANCE = 0.08;
const BOMB_CHANCE = 0.12;
const MAX_MOLES = 3;

const NORMAL_ARTS = [dollar3d, money3d, star3d, gift3d, fire3d];

type Kind = "normal" | "golden" | "bomb";

interface Mole {
  cell: number;
  kind: Kind;
  art: string;
  bornAt: number;
}

type Stage = "idle" | "playing" | "done";

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

// Frontend-only whack-a-mole. Best score lives in localStorage — nothing
// here touches balances, so there is no ledger to game.
export default function WhackGame() {
  const [stage, setStage] = useState<Stage>("idle");
  const [moles, setMoles] = useState<Mole[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [best, setBest] = useState(() => readBest());
  const [newBest, setNewBest] = useState(false);
  const [stats, setStats] = useState({ whacked: 0, spawned: 0, bombs: 0 });
  const [reduced] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const endAtRef = useRef(0);
  const spawnAccRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const whackedRef = useRef(0);
  const spawnedRef = useRef(0);
  const bombsRef = useRef(0);
  const hideAtRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    setMoles([]);
    setStage("done");
    const s = scoreRef.current;
    setStats({ whacked: whackedRef.current, spawned: spawnedRef.current, bombs: bombsRef.current });
    if (s > readBest()) {
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
    scoreRef.current = 0;
    comboRef.current = 0;
    whackedRef.current = 0;
    spawnedRef.current = 0;
    bombsRef.current = 0;
    spawnAccRef.current = 500;
    setScore(0);
    setCombo(0);
    setMoles([]);
    setNewBest(false);
    setTimeLeft(ROUND_MS);
    endAtRef.current = Date.now() + ROUND_MS;
    setStage("playing");
  };

  // Game clock: expiry, escalating spawns, countdown.
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
      const elapsed = ROUND_MS - left;
      // Spawn interval ramps 900ms -> ~360ms across the round.
      const interval = Math.max(360, 900 - elapsed * 0.018);
      spawnAccRef.current += 100;
      setMoles((prev) => {
        const alive = prev.filter((m) => now - m.bornAt < MOLE_TTL_MS);
        let next = alive;
        while (spawnAccRef.current >= interval && next.length < MAX_MOLES) {
          spawnAccRef.current -= interval;
          const taken = new Set(next.map((m) => m.cell));
          const free = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => !taken.has(c));
          if (free.length === 0) break;
          const roll = Math.random();
          const kind: Kind = roll < GOLDEN_CHANCE ? "golden" : roll < GOLDEN_CHANCE + BOMB_CHANCE ? "bomb" : "normal";
          next = [
            ...next,
            {
              cell: free[Math.floor(Math.random() * free.length)],
              kind,
              art: kind === "golden" ? trophy3d : NORMAL_ARTS[Math.floor(Math.random() * NORMAL_ARTS.length)],
              bornAt: now,
            },
          ];
          spawnedRef.current += 1;
        }
        return next;
      });
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
        setMoles((prev) => prev.map((m) => ({ ...m, bornAt: m.bornAt + delta })));
        hideAtRef.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stage]);

  const tapCell = (cell: number) => {
    if (stage !== "playing") return;
    const mole = moles.find((m) => m.cell === cell);
    if (!mole) {
      // Swung at nothing — combo breaks, no points lost.
      comboRef.current = 0;
      setCombo(0);
      return;
    }
    setMoles((prev) => prev.filter((m) => m.cell !== cell));
    if (mole.kind === "bomb") {
      bombsRef.current += 1;
      comboRef.current = 0;
      setCombo(0);
      scoreRef.current = Math.max(0, scoreRef.current - 30);
      setScore(scoreRef.current);
      return;
    }
    whackedRef.current += 1;
    const gain = (mole.kind === "golden" ? 50 : 10) * (1 + Math.floor(comboRef.current / 6));
    comboRef.current += 1;
    setCombo(comboRef.current);
    scoreRef.current += gain;
    setScore(scoreRef.current);
  };

  const mult = 1 + Math.floor(combo / 6);
  const timeFrac = Math.max(0, timeLeft / ROUND_MS);
  const accuracy = stats.spawned > 0 ? Math.round((stats.whacked / stats.spawned) * 100) : 0;

  return (
    <div className="space-y-3 select-none">
      {/* Scoreboard */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Score</p>
          <p className="font-display font-black text-3xl text-[var(--theme-text)] tracking-tight leading-none mt-1 tabular-nums">{score}</p>
        </div>
        {combo >= 6 && stage === "playing" && (
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

      {/* Board */}
      <div className="relative rounded-[20px] border border-[var(--theme-card-border)]/60 bg-[var(--theme-bg)]/40 p-3 touch-none">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cell) => {
            const mole = stage === "playing" ? moles.find((m) => m.cell === cell) : undefined;
            return (
              <button
                key={cell}
                type="button"
                onClick={() => tapCell(cell)}
                aria-label={mole ? (mole.kind === "bomb" ? "Avoid bomb" : "Whack mole") : "Empty hole"}
                className="relative aspect-square rounded-2xl bg-[var(--theme-card-bg)]/50 border border-[var(--theme-card-border)]/60 overflow-hidden cursor-pointer active:scale-95 transition-transform"
              >
                {/* Hole */}
                <div className="absolute left-1/2 bottom-2 -translate-x-1/2 w-3/4 h-4 rounded-[50%] bg-black/25 dark:bg-black/60" />
                <AnimatePresence>
                  {mole && (
                    reduced ? (
                      <span key={mole.bornAt} className="absolute inset-0 flex items-center justify-center">
                        {mole.kind === "bomb" ? (
                          <span className="w-11 h-11 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center">
                            <Bomb className="w-6 h-6 text-red-500" />
                          </span>
                        ) : (
                          <img
                            src={mole.art}
                            alt=""
                            draggable={false}
                            className={`w-12 h-12 object-contain drop-shadow pointer-events-none ${mole.kind === "golden" ? "ring-2 ring-amber-400 rounded-full" : ""}`}
                          />
                        )}
                      </span>
                    ) : (
                      <motion.span
                        key={mole.bornAt}
                        initial={{ y: 44, scale: 0.6, opacity: 0 }}
                        animate={{ y: 0, scale: 1, opacity: 1 }}
                        exit={{ y: 44, scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0.35, duration: 0.28 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {mole.kind === "bomb" ? (
                          <span className="w-11 h-11 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center">
                            <Bomb className="w-6 h-6 text-red-500" />
                          </span>
                        ) : (
                          <img
                            src={mole.art}
                            alt=""
                            draggable={false}
                            className={`w-12 h-12 object-contain drop-shadow pointer-events-none ${mole.kind === "golden" ? "ring-2 ring-amber-400 rounded-full" : ""}`}
                          />
                        )}
                      </motion.span>
                    )
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {stage === "idle" && (
          <div className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-3 p-6 text-center bg-[var(--theme-bg)]/70 backdrop-blur-[2px]">
            <div className="flex items-center gap-2">
              <img src={money3d} alt="" className="w-11 h-11 object-contain drop-shadow" />
              <img src={trophy3d} alt="" className="w-14 h-14 object-contain drop-shadow-lg" />
              <img src={dollar3d} alt="" className="w-11 h-11 object-contain drop-shadow" />
            </div>
            <p className="text-xs font-bold text-[var(--theme-text)] opacity-70 leading-relaxed max-w-[250px]">
              Whack moles, dodge bombs, hunt the golden trophy. Speed ramps up!
            </p>
            <Button variant="gold-glossy" size="sm" onClick={start} glow={false}>
              <Play className="w-4 h-4" /> Play · 30s
            </Button>
          </div>
        )}

        {stage === "done" && (
          <div className="absolute inset-0 rounded-[20px] flex flex-col items-center justify-center gap-2 p-6 text-center bg-[var(--theme-bg)]/70 backdrop-blur-[2px]">
            {newBest ? (
              <span className="px-3 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> New best!
              </span>
            ) : (
              <img src={star3d} alt="" className="w-12 h-12 object-contain drop-shadow opacity-80" />
            )}
            <p className="font-display font-black text-4xl text-[var(--theme-text)] tracking-tight tabular-nums">{score}</p>
            <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-60">
              {stats.whacked} whacked • {accuracy}% accuracy • {stats.bombs} bombs
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
