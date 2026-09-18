import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw, Trophy, Flame, ArrowRight, PackageSearch } from "lucide-react";
import { Button } from "./ui/button";
import type { SubscriptionItem } from "../types";
import { fixGitHubImageUrl } from "../utils/imageUtils";
import confetti from "canvas-confetti";

const BEST_KEY = "hut12_guess_best";
const ROUNDS = 8;

interface ProductGuessGameProps {
  items: SubscriptionItem[];
}

interface Option {
  id: string;
  name: string;
  image: string;
}

interface PoolEntry extends Option {
  category: string;
}

type Stage = "idle" | "prompt" | "reveal" | "done";

const isImageUrl = (v: unknown) => {
  const s = String(v || "").trim().toLowerCase();
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:") || s.startsWith("/") || s.startsWith("blob:");
};

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function verdictFor(ms: number): string {
  if (ms < 600) return "Lightning deal!";
  if (ms < 1200) return "Sharp!";
  return "Steady";
}

// Frontend-only product quiz. Shows a product name + 3 catalog images;
// speed of the correct tap scores. Best lives in localStorage — nothing
// here touches balances, so there is no ledger to game.
export default function ProductGuessGame({ items }: ProductGuessGameProps) {
  const pool: PoolEntry[] = React.useMemo(
    () =>
      (items || [])
        .filter((i) => !i.disabled && !i.outOfStock && isImageUrl(i.imageUrl))
        .map((i) => ({ id: String(i.id), name: String(i.name), image: fixGitHubImageUrl(i.imageUrl), category: String(i.category || "") })),
    [items]
  );

  const [stage, setStage] = useState<Stage>("idle");
  const [round, setRound] = useState(1);
  const [target, setTarget] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [choiceMs, setChoiceMs] = useState(0);
  const [choiceCorrect, setChoiceCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastTargetId, setLastTargetId] = useState<string | null>(null);
  const [best, setBest] = useState<number | null>(() => {
    try {
      const n = Number(localStorage.getItem(BEST_KEY));
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  });
  const [newBest, setNewBest] = useState(false);
  const [roundStart, setRoundStart] = useState(0);
  const [reduced] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Precache every catalog image once so rounds render with zero pop-in.
  useEffect(() => {
    pool.forEach((p) => {
      try {
        const im = new Image();
        im.decoding = "async";
        im.src = p.image;
      } catch {}
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  const deal = (roundNum: number, avoidId: string | null) => {
    const candidates = pool.filter((p) => p.id !== avoidId);
    const source = candidates.length > 0 ? candidates : pool;
    const picked = source[Math.floor(Math.random() * source.length)];
    const sameCat = shuffled(pool.filter((p) => p.id !== picked.id && p.category && p.category === picked.category));
    const others = shuffled(pool.filter((p) => p.id !== picked.id && (!p.category || p.category !== picked.category)));
    const distractors = [...sameCat, ...others].slice(0, 2);
    setTarget({ id: picked.id, name: picked.name, image: picked.image });
    setOptions(shuffled([{ id: picked.id, name: picked.name, image: picked.image }, ...distractors.map((d) => ({ id: d.id, name: d.name, image: d.image }))]));
    setLastTargetId(picked.id);
    setChoiceId(null);
    setRound(roundNum);
    setRoundStart(Date.now());
    setStage("prompt");
  };

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setCorrectCount(0);
    setNewBest(false);
    deal(1, null);
  };

  const finishGame = (finalScore: number) => {
    setStage("done");
    let prev = 0;
    try { prev = Number(localStorage.getItem(BEST_KEY)) || 0; } catch {}
    if (finalScore > prev) {
      setBest(finalScore);
      setNewBest(true);
      try { localStorage.setItem(BEST_KEY, String(finalScore)); } catch {}
      if (!reduced) {
        try {
          confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        } catch {}
      }
    } else {
      setNewBest(false);
    }
  };

  const pick = (id: string) => {
    if (stage !== "prompt" || !target) return;
    const ms = Date.now() - roundStart;
    const correct = id === target.id;
    setChoiceId(id);
    setChoiceMs(ms);
    setChoiceCorrect(correct);
    if (correct) {
      const speedBonus = Math.max(0, Math.round((600 - ms) / 4));
      const mult = streak >= 2 ? 1.5 : 1;
      const gained = Math.round((100 + speedBonus) * mult);
      const nextScore = score + gained;
      setScore(nextScore);
      setStreak(streak + 1);
      setCorrectCount((c) => c + 1);
      if (round >= ROUNDS) {
        window.setTimeout(() => finishGame(nextScore), 900);
      }
    } else {
      setStreak(0);
    }
    setStage("reveal");
  };

  const next = () => {
    if (round >= ROUNDS) {
      finishGame(score);
    } else {
      deal(round + 1, lastTargetId);
    }
  };

  if (pool.length < 3) {
    return (
      <div className="space-y-3 select-none">
        <div className="rounded-[20px] border border-[var(--theme-card-border)]/60 bg-[var(--theme-bg)]/40 p-8 text-center space-y-3">
          <PackageSearch className="w-10 h-10 mx-auto text-[var(--theme-text)] opacity-40" />
          <p className="text-sm font-black text-[var(--theme-text)]">Not enough product images yet</p>
          <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-60 leading-relaxed">
            This game needs at least 3 products with images in the catalog.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      {/* Scoreboard */}
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Score</p>
          <p className="font-display font-black text-3xl text-[var(--theme-text)] tracking-tight leading-none mt-1 tabular-nums">{score}</p>
        </div>
        {streak >= 2 && stage !== "done" && (
          <span className="px-2.5 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> ×{streak}
          </span>
        )}
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">Best</p>
          <p className="font-display font-black text-lg text-[var(--theme-primary)] tracking-tight leading-none mt-1 tabular-nums">
            {best !== null ? best : "—"}
          </p>
        </div>
      </div>

      {stage === "idle" && (
        <div className="rounded-[20px] border border-[var(--theme-card-border)]/60 bg-[var(--theme-bg)]/40 p-8 text-center space-y-3">
          <p className="font-display font-black text-lg text-[var(--theme-text)] tracking-tight">Guess the Product</p>
          <p className="text-xs font-bold text-[var(--theme-text)] opacity-60 leading-relaxed max-w-[250px] mx-auto">
            We name a product, you tap its photo. {ROUNDS} rounds — faster taps score more, streaks multiply.
          </p>
          <Button variant="gold-glossy" size="sm" onClick={startGame} glow={false}>
            <Play className="w-4 h-4" /> Play
          </Button>
        </div>
      )}

      {(stage === "prompt" || stage === "reveal") && target && (
        <>
          <div className="text-center px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--theme-text)] opacity-60 leading-none">
              Round {round}/{ROUNDS} · Which product is this?
            </p>
            <p className="font-display font-black text-xl text-[var(--theme-primary)] tracking-tight leading-tight mt-1.5 line-clamp-2">
              {target.name}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {options.map((o) => {
              const isTarget = o.id === target.id;
              const isChosen = o.id === choiceId;
              const revealed = stage === "reveal";
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => pick(o.id)}
                  disabled={revealed}
                  aria-label={`Product photo option`}
                  className="[perspective:600px] aspect-[3/4] cursor-pointer focus:outline-none disabled:cursor-default"
                >
                  <motion.div
                    initial={false}
                    animate={{ rotateY: revealed && isChosen ? 180 : 0 }}
                    transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.45 }}
                    className="relative w-full h-full [transform-style:preserve-3d]"
                  >
                    {/* Photo face */}
                    <div
                      className={`absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center p-2 [backface-visibility:hidden] border transition-colors ${
                        revealed && isTarget
                          ? "bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] shadow-[0_0_18px_rgba(207,117,0,0.35)]"
                          : revealed
                            ? "bg-[var(--theme-bg)]/50 border-[var(--theme-card-border)] opacity-70"
                            : "bg-[var(--theme-card-bg)]/70 backdrop-blur-xl border-[var(--theme-card-border)] active:scale-95"
                      }`}
                    >
                      <img src={o.image} alt="" loading="eager" decoding="async" draggable={false} className="w-full h-full object-contain drop-shadow pointer-events-none" />
                    </div>
                    {/* Time face (chosen card spins to reveal speed) */}
                    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[var(--theme-primary)] border border-[var(--theme-primary)]">
                      <span className="font-display font-black text-lg text-white tabular-nums leading-none">{choiceMs}ms</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/85 leading-none">
                        {choiceCorrect ? verdictFor(choiceMs) : "Wrong one"}
                      </span>
                    </div>
                  </motion.div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center min-h-[36px]">
            {stage === "reveal" && (
              round >= ROUNDS && choiceCorrect ? (
                <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-60">Final round — tallying…</p>
              ) : (
                <Button variant="gold-glossy" size="sm" onClick={next} glow={false}>
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="rounded-[20px] border border-[var(--theme-card-border)]/60 bg-[var(--theme-bg)]/40 p-8 text-center space-y-2">
          {newBest ? (
            <span className="inline-flex px-3 py-1 rounded-full bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> New best!
            </span>
          ) : null}
          <p className="font-display font-black text-4xl text-[var(--theme-text)] tracking-tight tabular-nums">{score}</p>
          <p className="text-[11px] font-bold text-[var(--theme-text)] opacity-60">
            {correctCount}/{ROUNDS} correct
          </p>
          <div className="pt-1">
            <Button variant="gold-glossy" size="sm" onClick={startGame} glow={false}>
              <RotateCcw className="w-4 h-4" /> Play again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
