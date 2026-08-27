import { useEffect, useRef } from "react";
import { Target, TrendingUp } from "lucide-react";

interface ClimbingVisualProps {
  reducedMotion?: boolean;
}

export default function ClimbingVisual({ reducedMotion = false }: ClimbingVisualProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !canvasRef.current) return;

    const container = canvasRef.current;
    const particles = Array.from({ length: 22 }, (_, index) => {
      const span = document.createElement("span");
      span.className = "auth-particle";
      span.style.left = `${6 + ((index * 4) % 88)}%`;
      span.style.animationDelay = `${index * 0.32}s`;
      span.style.animationDuration = `${6 + (index % 5)}s`;
      container.appendChild(span);
      return span;
    });

    return () => {
      particles.forEach((particle) => particle.remove());
    };
  }, [reducedMotion]);

  return (
    <div
      ref={canvasRef}
      className="auth-hex-grid relative h-full min-h-screen w-full overflow-hidden"
      aria-hidden="true"
    >
      <div className="auth-ambient-glow absolute inset-0" />
      <div className="relative z-10 flex h-full min-h-screen w-full max-w-3xl flex-col items-start justify-end gap-10 p-8 pb-16 lg:p-14">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-amber-700 dark:text-amber-300/90">
            Altrium
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-900 md:text-5xl dark:text-white">
            PerformX <span className="text-amber-500 dark:text-amber-400">360°</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-stone-700 dark:text-stone-300">
            Performance. Development. Excellence. Together.
          </p>
        </div>

        <div className={`auth-scene ${reducedMotion ? "auth-scene-static" : ""}`}>
          <div className="auth-platform auth-platform-1" />
          <div className="auth-platform auth-platform-2" />
          <div className="auth-platform auth-platform-3" />
          <div className="auth-glass-icon auth-glass-icon-target">
            <Target className="h-5 w-5 text-amber-300" />
          </div>
          <div className="auth-glass-icon auth-glass-icon-chart">
            <TrendingUp className="h-5 w-5 text-amber-300" />
          </div>
          <div className="auth-climber">
            <div className="auth-climber-head" />
            <div className="auth-climber-torso" />
            <div className="auth-climber-arm auth-climber-arm-left" />
            <div className="auth-climber-arm auth-climber-arm-right" />
            <div className="auth-climber-body" />
            <div className="auth-climber-leg auth-climber-leg-left" />
            <div className="auth-climber-leg auth-climber-leg-right" />
          </div>
        </div>
      </div>
    </div>
  );
}
