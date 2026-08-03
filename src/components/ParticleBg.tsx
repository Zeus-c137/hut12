import React, { useEffect, useState } from "react";
import { GrainGradient } from "@paper-design/shaders-react";

interface ParticleBgProps {
  className?: string;
}

export default function ParticleBg({ className }: ParticleBgProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Add a tiny delay to ensure everything is ready before the shader tries to load textures
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
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
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

