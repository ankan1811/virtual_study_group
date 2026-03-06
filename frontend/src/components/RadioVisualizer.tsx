import { useRef, useEffect, useState } from "react";

interface RadioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  variant?: "full" | "mini";
  className?: string;
}

export default function RadioVisualizer({
  analyser,
  isPlaying,
  variant = "full",
  className = "",
}: RadioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [useFallback, setUseFallback] = useState(false);
  const zeroCountRef = useRef(0);

  const barCount = variant === "full" ? 64 : 32;
  const height = variant === "full" ? 140 : 40;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      // Clear canvas when stopped
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    if (!analyser) {
      setUseFallback(true);
      return;
    }

    setUseFallback(false);
    zeroCountRef.current = 0;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      if (!canvas || !ctx || !analyser) return;

      // Resize canvas to match display size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      analyser.getByteFrequencyData(dataArray);

      // Check for all zeros (CORS issue)
      const sum = dataArray.reduce((a, b) => a + b, 0);
      if (sum === 0) {
        zeroCountRef.current++;
        if (zeroCountRef.current > 60) {
          setUseFallback(true);
          return;
        }
      } else {
        zeroCountRef.current = 0;
      }

      const gap = variant === "full" ? 2 : 1.5;
      const barWidth = (w - gap * (barCount - 1)) / barCount;
      const reflectionH = variant === "full" ? h * 0.2 : 0;
      const mainH = h - reflectionH;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex] / 255;
        const barH = Math.max(2, value * mainH * 0.95);

        const x = i * (barWidth + gap);
        const y = mainH - barH;

        // Gradient fill
        const gradient = ctx.createLinearGradient(x, mainH, x, y);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.9)");   // indigo-500
        gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.9)"); // violet-500
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.9)");   // purple-500

        // Glow
        ctx.shadowColor = "rgba(139, 92, 246, 0.4)";
        ctx.shadowBlur = variant === "full" ? 8 : 4;

        // Draw bar with rounded top
        ctx.beginPath();
        const radius = Math.min(barWidth / 2, 3);
        ctx.moveTo(x, mainH);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, mainH);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Reflection (full variant only)
        if (variant === "full" && reflectionH > 0) {
          const refGradient = ctx.createLinearGradient(x, mainH, x, mainH + reflectionH);
          refGradient.addColorStop(0, "rgba(139, 92, 246, 0.15)");
          refGradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          ctx.shadowBlur = 0;
          ctx.fillStyle = refGradient;
          const refH = Math.min(barH * 0.4, reflectionH);
          ctx.fillRect(x, mainH + 1, barWidth, refH);
        }

        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [analyser, isPlaying, barCount, variant]);

  // CSS fallback animated bars
  if (useFallback && isPlaying) {
    return (
      <div className={`flex items-end gap-[2px] ${className}`} style={{ height }}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500 via-violet-500 to-purple-500"
            style={{
              height: "100%",
              animation: `radioBar ${0.6 + Math.random() * 0.8}s ease-in-out ${Math.random() * 0.5}s infinite alternate`,
              transformOrigin: "bottom",
            }}
          />
        ))}
        <style>{`
          @keyframes radioBar {
            0% { transform: scaleY(0.1); }
            100% { transform: scaleY(${0.3 + Math.random() * 0.7}); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
