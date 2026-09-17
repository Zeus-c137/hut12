import React, { useEffect, useState, lazy, Suspense } from "react";

const GrainGradient = lazy(() =>
  import("@paper-design/shaders-react").then((m) => ({ default: m.GrainGradient }))
);

interface ParticleBgProps {
  className?: string;
}

export default function ParticleBg({ className }: ParticleBgProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (document.visibilityState !== "visible") {
      const onVisible = () => {
        if (document.visibilityState === "visible") setMounted(true);
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => document.removeEventListener("visibilitychange", onVisible);
    }
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        backgroundColor: "#00080a",
        pointerEvents: "none",
      }}
    >
      <Suspense fallback={null}>
        <GrainGradient
          colors={["#0cc6b9", "#0c2b73", "#050222"]}
          colorBack="#00080a"
          softness={1}
          intensity={0.88}
          noise={0.42}
          shape="wave"
          speed={1.12}
          scale={1}
          rotation={0}
          offsetX={-0.04}
          offsetY={0.12}
          style={{ width: "100%", height: "100%" }}
        />
      </Suspense>
    </div>
  );
}
