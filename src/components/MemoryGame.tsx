import React, { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw, Trophy, Timer, MousePointerClick } from "lucide-react";
import { Button } from "./ui/button";
import { useGatedInterval } from "../hooks/useGatedInterval";
import dollar3d from "@/src/assets/3d/3dicons-dollar-iso-premium.png";
import money3d from "@/src/assets/3d/3dicons-money-iso-premium.png";
import star3d from "@/src/assets/3d/3dicons-star-iso-premium.png";
import gift3d from "@/src/assets/3d/3dicons-gift-box-iso-premium.png";
import trophy3d from "@/src/assets/3d/3dicons-trophy-iso-premium.png";
import fire3d from "@/src/assets/3d/3dicons-fire-iso-premium.png";
import confetti from "canvas-confetti";

const BEST_KEY = "hut12_memory_best";
const ARTS = [dollar3d, money3d, star3d, gift3d, trophy3d, fire3d];
const FLIP_BACK_MS = 750;

interface Card {
  uid: number;
  art: string;
}

interface Best {
  moves: number;
  time: number;
}

function readBest(): Best | null {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.moves === "number" && typeof parsed?.time === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}

function shuffledDeck(): Card[] {
  const doubled = [...ARTS, ...ARTS];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((art, i) => ({ uid: i, art }));
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Frontend-only memory match. Best score lives in localStorage — nothing
// here touches balances, so there is no ledger to game.
export default function MemoryGame() {
  const [deck, setDeck] = useState<Card[]>(() => shuffledDeck());
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState<Best | null>(() => readBest());
  const [newBest, setNewBest] = useState(false);
  const [reduced] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const won = matched.length === ARTS.length;
  const locked = open.length === 2;

  useGatedInterval(
    () => { setSeconds((s) => s + 1); },
    1000,
    { enabled: started && !won, visibilityGate: true }
  );

  const finishGame = useCallback((finalMoves: number, finalSeconds: number) => {
    const prev = readBest();
    if (!prev || finalMoves < prev.moves || (finalMoves === prev.moves && finalSeconds < prev.time)) {
      const next = { moves: finalMoves, time: finalSeconds };
      setBest(next);
      setNewBest(true);
      try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch {}
      if (!reduced) {
        try {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } catch {}
      }
    } else {
      setNewBest(false);
    }
  }, [reduced]);

  const flip = (card: Card) => {
    if (!started) setStarted(true);
    if (locked || open.includes(card.uid) || matched.includes(card.art)) return;
    const nextOpen = [...open, card.uid];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [a, b] = nextOpen.map((uid) => deck.find((c) => c.uid === uid)?.art);
      if (a && a === b) {
        const nextMatched = [...matched, a];
        setMatched(nextMatched);
        setOpen([]);
        if (nextMatched.length === ARTS.length) finishGame(nextMoves, seconds);
      } else if (!reduced) {
        window.setTimeout(() => setOpen([]), FLIP_BACK_MS);
      } else {
        setOpen([]);
      }
    }
  };

  const restart = () => {
    setDeck(shuffledDeck());
    setOpen([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setStarted(false);
    setNewBest(false);
  };

  return (
    <div className="space-y-3 select-none">
      {/* Scoreboard */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Moves</p>
          <p className="font-display font-black text-3xl text-[var(--theme-text)] tracking-tight leading-none mt-1 tabular-nums">{moves}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[var(--theme-primary)]">
          <Timer className="w-3.5 h-3.5" />
          <span className="font-display font-black text-lg tracking-tight tabular-nums">{formatTime(seconds)}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Best</p>
          <p className="font-display font-black text-lg text-[var(--theme-primary)] tracking-tight leading-none mt-1 tabular-nums">
            {best ? `${best.moves} · ${formatTime(best.time)}` : "—"}
          </p>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-2">
        {deck.map((card) => {
          const isOpen = open.includes(card.uid) || matched.includes(card.art);
          const isMatched = matched.includes(card.art);
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => flip(card)}
              aria-label={isOpen ? "Matched card" : "Hidden card"}
              className="[perspective:600px] aspect-square cursor-pointer focus:outline-none"
            >
              <motion.div
                initial={false}
                animate={{ rotateY: isOpen ? 180 : 0 }}
                transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.45 }}
                className="relative w-full h-full [transform-style:preserve-3d]"
              >
                {/* Back (face-down) */}
                <div
                  className={`absolute inset-0 rounded-2xl flex items-center justify-center [backface-visibility:hidden] border transition-colors ${
                    isMatched
                      ? "bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]/50"
                      : "bg-[var(--theme-card-bg)]/70 backdrop-blur-xl border-[var(--theme-card-border)] active:scale-95"
                  }`}
                >
                  <img src={star3d} alt="" draggable={false} className="w-8 h-8 object-contain opacity-70 drop-shadow pointer-events-none" />
                </div>
                {/* Front (face-up) */}
                <div
                  className={`absolute inset-0 rounded-2xl flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)] border ${
                    isMatched
                      ? "bg-[var(--theme-primary)]/15 border-[var(--theme-primary)]/60 shadow-[0_0_18px_rgba(207,117,0,0.25)]"
                      : "bg-[var(--theme-bg)]/70 border-[var(--theme-card-border)]"
                  }`}
                >
                  <img src={card.art} alt="" draggable={false} className="w-10 h-10 object-contain drop-shadow pointer-events-none" />
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {won ? (
          <div className="flex flex-col items-center gap-2 text-center">
            {newBest ? (
              <span className="px-3 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> New best!
              </span>
            ) : (
              <span className="text-[11px] font-bold text-[var(--theme-text)] opacity-60">
                Cleared in {moves} moves · {formatTime(seconds)}
              </span>
            )}
            <Button variant="gold-glossy" size="sm" onClick={restart} glow={false}>
              <RotateCcw className="w-4 h-4" /> Play again
            </Button>
          </div>
        ) : started ? (
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[var(--theme-text)] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restart
          </button>
        ) : (
          <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-50 flex items-center gap-1.5">
            <MousePointerClick className="w-3.5 h-3.5" /> Flip two cards to start the clock
          </p>
        )}
      </div>

      <p className="text-center text-[10px] font-bold text-[var(--theme-text)] opacity-40 px-2">
        Practice mode — scores stay on this device and never touch balances.
      </p>
    </div>
  );
}
