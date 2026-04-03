import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, RefreshCw, Trophy } from 'lucide-react';

// ─── Types & Constants ────────────────────────────────────────────────────────

type ServerState = 'waiting' | 'ready' | 'down';

const QUOTES = [
  "The beautiful thing about learning is that no one can take it away from you.",
  "Education is the most powerful weapon you can use to change the world.",
  "Live as if you were to die tomorrow; learn as if you were to live forever.",
  "The more that you read, the more things you will know.",
  "Study without reflection is a waste of time; reflection without study is dangerous.",
  "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.",
];

const STUDY_TIPS = [
  "Spaced repetition beats cramming - your brain retains 80% more over multiple sessions.",
  "The Pomodoro Technique: 25-min focus + 5-min break maximizes deep work cycles.",
  "Active recall - testing yourself - outperforms re-reading by 3× for long-term memory.",
  "Teaching concepts to others, the Feynman Technique, is the fastest path to true mastery.",
  "Sleep consolidates memory - studying before bed improves retention by 40%.",
  "Background music at ~60 BPM - lo-fi or classical - enhances focus and creativity.",
  "The Generation Effect: struggling to recall information makes memory traces stronger.",
  "Interleaving multiple subjects in one session improves transfer and long-term retention.",
];

const STATUS_MSGS = [
  { threshold: 0, text: "Waking up the study rooms", emoji: "📚" },
  { threshold: 10, text: "Loading your companions", emoji: "🧑‍🤝‍🧑" },
  { threshold: 20, text: "Almost ready", emoji: "✏️" },
  { threshold: 40, text: "Setting up the whiteboards", emoji: "🖊️" },
  { threshold: 60, text: "Warming up the AI tutor", emoji: "🤖" },
  { threshold: 120, text: "Server seems to be napping. Please try again later", emoji: "😴" },
] as const;

const FEATURES = [
  { icon: "📚", label: "Study Rooms" },
  { icon: "🤖", label: "AI Tutor" },
  { icon: "🎙️", label: "Live Calls" },
  { icon: "🖊️", label: "Whiteboard" },
  { icon: "🎵", label: "Radio" },
  { icon: "📊", label: "Sessions" },
];

const PARTICLE_COLORS = ['#6366f1', '#8b5cf6', '#22d3ee'];
const STUDY_ICONS = ['📚', '✏️', '🧠', '💡', '🔬', '📝', '🎯', '⚗️'];

// ─── NeuralCanvas ─────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  emoji?: string;
  phase: number;
}

function NeuralCanvas({ serverReady }: { serverReady: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const particlesRef = useRef<Particle[]>([]);
  const burstRef = useRef(false);
  const rafRef = useRef(0);
  const flowRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    init();
    window.addEventListener('resize', init);

    const ps: Particle[] = [];
    for (let i = 0; i < 90; i++) {
      ps.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: i < 8 ? 12 : Math.random() * 2 + 1,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        emoji: i < 8 ? STUDY_ICONS[i] : undefined,
        phase: Math.random(),
      });
    }
    particlesRef.current = ps;

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      flowRef.current = (flowRef.current + 0.003) % 1;

      for (const p of ps) {
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200 && d > 0) {
          const f = (200 - d) / 200 * 0.03;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.98;
        p.vy *= 0.98;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 2) { p.vx = p.vx / spd * 2; p.vy = p.vy / spd * 2; }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        p.x = Math.max(0, Math.min(W, p.x));
        p.y = Math.max(0, Math.min(H, p.y));
      }

      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[j].x - ps[i].x, dy = ps[j].y - ps[i].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const a = (1 - d / 130) * 0.35;
            ctx.beginPath();
            ctx.moveTo(ps[i].x, ps[i].y);
            ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${a})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            const t = (flowRef.current + (ps[i].phase + ps[j].phase) * 0.5) % 1;
            ctx.beginPath();
            ctx.arc(ps[i].x + dx * t, ps[i].y + dy * t, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(34,211,238,${a * 2.5})`;
            ctx.fill();
          }
        }
      }

      for (const p of ps) {
        if (p.emoji) {
          ctx.font = '15px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = 0.65;
          ctx.fillText(p.emoji, p.x, p.y);
          ctx.globalAlpha = 1;
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', onMouse);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  useEffect(() => {
    if (serverReady && !burstRef.current) {
      burstRef.current = true;
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      for (const p of particlesRef.current) {
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / d) * 10;
        p.vy = (dy / d) * 10;
      }
    }
  }, [serverReady]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: serverReady ? 0 : 1, transition: 'opacity 1.2s ease' }}
    />
  );
}

// ─── EKG Monitor ─────────────────────────────────────────────────────────────

function getQRS(phase: number): number {
  if (phase < 0.12) return 0.5;
  if (phase < 0.145) return 0.5 + Math.sin(((phase - 0.12) / 0.025) * Math.PI) * 0.05;
  if (phase < 0.22) return 0.5;
  if (phase < 0.24) return 0.5 - ((phase - 0.22) / 0.02) * 0.2;
  if (phase < 0.255) return 0.3 + ((phase - 0.24) / 0.015) * 0.65;
  if (phase < 0.27) return 0.95 - ((phase - 0.255) / 0.015) * 0.65;
  if (phase < 0.285) return 0.3 - ((phase - 0.27) / 0.015) * 0.1;
  if (phase < 0.31) return 0.2 + ((phase - 0.285) / 0.025) * 0.3;
  if (phase < 0.38) return 0.5;
  if (phase < 0.53) return 0.5 + Math.sin(((phase - 0.38) / 0.15) * Math.PI) * 0.13;
  return 0.5;
}

function EKGMonitor({ serverState }: { serverState: ServerState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(serverState);
  const bufRef = useRef(new Float32Array(280).fill(0.5));
  const headRef = useRef(0);
  const phaseRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => { stateRef.current = serverState; }, [serverState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 280, H = 70;

    const draw = () => {
      const st = stateRef.current;
      phaseRef.current += 1 / 108;
      if (phaseRef.current >= 1) phaseRef.current -= 1;

      let y: number;
      if (st === 'down') {
        y = 0.5;
      } else if (st === 'ready') {
        const p = (phaseRef.current * 3) % 1;
        y = p < 0.05 ? 0.5 + (p / 0.05) * 0.4
          : p < 0.10 ? 0.9 - ((p - 0.05) / 0.05) * 0.4
          : 0.5;
      } else {
        y = getQRS(phaseRef.current);
      }

      bufRef.current[headRef.current] = y;
      headRef.current = (headRef.current + 1) % W;

      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.5;
      for (let gy = 0; gy <= H; gy += 10) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
      for (let gx = 0; gx <= W; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }

      const color = st === 'down' ? '#ef4444' : st === 'ready' ? '#10b981' : '#f59e0b';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = st === 'ready' ? 14 : 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < W; i++) {
        const bx = (headRef.current + i) % W;
        const yp = H - bufRef.current[bx] * H;
        i === 0 ? ctx.moveTo(i, yp) : ctx.lineTo(i, yp);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      const sx = headRef.current % W;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={280}
        height={70}
        className="rounded-lg"
        style={{ maxWidth: '100%' }}
      />
      <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-slate-600 tracking-widest select-none">
        SERVER PULSE
      </span>
    </div>
  );
}

// ─── Typing Racer ─────────────────────────────────────────────────────────────

function TypingRacer({ serverState }: { serverState: ServerState }) {
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState('');
  const [wpm, setWpm] = useState(0);
  const [acc, setAcc] = useState(100);
  const [pb, setPb] = useState(() => parseInt(localStorage.getItem('sg_typing_pb') ?? '0', 10));
  const [newRecord, setNewRecord] = useState(false);
  const startMsRef = useRef<number | null>(null);
  const pbRef = useRef(pb);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quote = QUOTES[qIdx];

  useEffect(() => { pbRef.current = pb; }, [pb]);

  useEffect(() => {
    if (serverState === 'waiting') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [serverState]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (serverState !== 'waiting') return;
    const val = e.target.value;
    const now = Date.now();

    if (!startMsRef.current && val.length > 0) startMsRef.current = now;
    setInput(val);

    let correct = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] === quote[i]) correct++;
    }

    if (startMsRef.current && val.length > 1) {
      const elapsed = Math.max((now - startMsRef.current) / 60000, 1 / 600);
      setWpm(Math.round(correct / 5 / elapsed));
      setAcc(Math.round((correct / val.length) * 100));
    }

    if (val === quote && startMsRef.current) {
      const elapsed = Math.max((now - startMsRef.current) / 60000, 1 / 600);
      const finalWpm = Math.round(quote.length / 5 / elapsed);
      if (finalWpm > pbRef.current) {
        setPb(finalWpm);
        localStorage.setItem('sg_typing_pb', String(finalWpm));
        setNewRecord(true);
        setTimeout(() => setNewRecord(false), 2500);
      }
      setTimeout(() => {
        setQIdx(i => (i + 1) % QUOTES.length);
        setInput('');
        startMsRef.current = null;
        setWpm(0);
        setAcc(100);
      }, 500);
    }
  };

  return (
    <div className="relative flex flex-col gap-3">
      {serverState === 'ready' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-xl z-10 flex items-center justify-center"
          style={{ background: 'rgba(5,46,22,0.92)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-center">
            <p className="text-3xl mb-2">🚀</p>
            <p className="text-emerald-400 poppins-semibold text-sm">Great warm-up!</p>
            <p className="text-slate-400 text-xs poppins-regular mt-1">Entering your study room...</p>
          </div>
        </motion.div>
      )}

      <div
        className="font-mono text-sm leading-relaxed p-4 rounded-xl select-none min-h-[84px]"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {quote.split('').map((ch, i) => {
          const typed = i < input.length;
          const correct = typed && input[i] === ch;
          const wrong = typed && input[i] !== ch;
          const isCursor = i === input.length;
          return (
            <span
              key={i}
              className={
                correct ? 'text-emerald-400'
                : wrong ? 'text-red-400'
                : isCursor ? 'text-white underline decoration-violet-400 decoration-2 underline-offset-2'
                : 'text-slate-500'
              }
              style={wrong ? { background: 'rgba(248,113,113,0.12)', borderRadius: 2 } : undefined}
            >
              {ch}
            </span>
          );
        })}
      </div>

      <textarea
        ref={inputRef}
        value={input}
        onChange={handleChange}
        disabled={serverState !== 'waiting'}
        placeholder="Start typing the quote above..."
        maxLength={quote.length}
        className="w-full p-3 rounded-xl text-white font-mono text-sm resize-none h-20 focus:outline-none placeholder-slate-600 transition-colors disabled:opacity-50"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">WPM</span>
          <span className="text-violet-400 poppins-bold font-bold text-sm">{wpm}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs">Accuracy</span>
          <span className={`poppins-bold font-bold text-sm ${acc >= 90 ? 'text-emerald-400' : acc >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
            {acc}%
          </span>
        </div>
        {pb > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <Trophy className={`w-3 h-3 flex-shrink-0 ${newRecord ? 'text-amber-400' : 'text-slate-600'}`} />
            <span className="text-slate-500 text-xs">Best</span>
            <span className={`text-xs poppins-semibold font-semibold ${newRecord ? 'text-amber-400' : 'text-slate-400'}`}>
              {pb} WPM
            </span>
            {newRecord && <span className="text-amber-400 text-xs animate-pulse">✨ New!</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Study Fact Carousel ──────────────────────────────────────────────────────

function StudyFactCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % STUDY_TIPS.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-[60px]">
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4 }}
          className="text-slate-300 text-sm poppins-regular leading-relaxed"
        >
          {STUDY_TIPS[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

// ─── ColdStartScreen ─────────────────────────────────────────────────────────

export default function ColdStartScreen() {
  const [serverState, setServerState] = useState<ServerState>('waiting');
  const [elapsed, setElapsed] = useState(0);
  const [fading, setFading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showRetry = elapsed >= 120 && serverState !== 'ready';

  const statusMsg = (() => {
    if (serverState === 'ready') return { text: 'Study room is ready!', emoji: '🎉' };
    return [...STATUS_MSGS].reverse().find(m => elapsed >= m.threshold) ?? STATUS_MSGS[0];
  })();

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  useEffect(() => {
    let done = false;

    const poll = async () => {
      if (done) return;
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(`${import.meta.env.VITE_API_URL}/ping`, { signal: ctrl.signal });
        clearTimeout(tid);
        if (r.ok && !done) {
          done = true;
          setServerState('ready');
          setTimeout(() => setFading(true), 800);
          setTimeout(() => setShowOverlay(true), 1500);
          setTimeout(() => window.location.reload(), 2200);
        }
      } catch { /* still waiting */ }
    };

    poll();
    const pollId = setInterval(poll, 3000);
    const tickId = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      done = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, []);

  const onMouseMove = (e: React.MouseEvent) => {
    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
    const my = (e.clientY / window.innerHeight - 0.5) * 2;
    if (containerRef.current) {
      containerRef.current.style.setProperty('--mx', String(mx));
      containerRef.current.style.setProperty('--my', String(my));
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50"
      style={{
        '--mx': '0',
        '--my': '0',
        background:
          'radial-gradient(ellipse at 20% 50%, #1e1040 0%, transparent 60%), ' +
          'radial-gradient(ellipse at 80% 20%, #0f1f4d 0%, transparent 60%), ' +
          'linear-gradient(135deg, #0a0718 0%, #0f1628 50%, #0a0f28 100%)',
      } as React.CSSProperties}
      onMouseMove={onMouseMove}
    >
      <NeuralCanvas serverReady={serverState === 'ready'} />

      {/* Ambient parallax glow */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 700,
          height: 450,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 70%)',
          left: '50%',
          top: '50%',
          transform: 'translate(calc(-50% + calc(var(--mx) * 28px)), calc(-50% + calc(var(--my) * 28px)))',
          filter: 'blur(50px)',
        }}
      />

      {/* Exit overlay */}
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: '#0a0718' }}
        >
          <div className="text-center">
            <p className="text-5xl mb-4">🚀</p>
            <p className="text-white text-2xl poppins-semibold">Entering your study room...</p>
            <div className="mt-5 flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-violet-400 rounded-full"
                  style={{ animation: `dot-pulse 1.2s ease-in-out ${i * 0.3}s infinite` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{
            opacity: fading ? 0 : 1,
            y: fading ? -20 : 0,
            scale: fading ? 0.96 : 1,
          }}
          transition={{ duration: fading ? 0.6 : 0.9, ease: 'easeOut' }}
          className="w-full max-w-5xl rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(28px)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 0 120px rgba(99,102,241,0.09), 0 0 0 1px rgba(255,255,255,0.03)',
            transform: 'translate(calc(var(--mx) * 8px), calc(var(--my) * 8px))',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* ── Left Panel ─────────────────────────── */}
            <div
              className="p-8 lg:p-10 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r"
              style={{ borderColor: 'rgba(255,255,255,0.06)' }}
            >
              {/* Logo + title */}
              <div className="flex items-center gap-4">
                <div
                  className="relative flex-shrink-0"
                  style={{ transform: 'translate(calc(var(--mx) * -14px), calc(var(--my) * -14px))' }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      boxShadow: '0 0 32px rgba(99,102,241,0.45)',
                    }}
                  >
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div
                    className="absolute inset-[-5px] rounded-2xl border border-dashed border-violet-500/30 animate-spin"
                    style={{ animationDuration: '5s' }}
                  />
                  <div
                    className="absolute inset-[-11px] rounded-2xl border border-cyan-500/15 animate-spin"
                    style={{ animationDuration: '9s', animationDirection: 'reverse' }}
                  />
                </div>
                <div>
                  <h1
                    className="text-xl poppins-bold leading-tight"
                    style={{
                      background: 'linear-gradient(135deg, #a5b4fc, #ffffff 55%, #67e8f9)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Virtual Study Group
                  </h1>
                  <p className="text-slate-500 text-xs poppins-regular mt-0.5">Your study room is always ready.</p>
                </div>
              </div>

              {/* Status message */}
              <div className="min-h-[28px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={statusMsg.text}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-base">{statusMsg.emoji}</span>
                    <span className={`text-sm poppins-medium ${serverState === 'ready' ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {statusMsg.text}
                    </span>
                    {serverState !== 'ready' && (
                      <span className="flex gap-0.5 ml-0.5">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="inline-block w-1 h-1 bg-violet-400 rounded-full"
                            style={{ animation: `dot-pulse 1.4s ease-in-out ${i * 0.35}s infinite` }}
                          />
                        ))}
                      </span>
                    )}
                    {serverState === 'ready' && (
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* EKG */}
              <EKGMonitor serverState={serverState} />

              {/* Timer with pulse rings */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-16 h-16 flex-shrink-0">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="absolute inset-0 rounded-full border"
                      style={{
                        borderColor: serverState === 'ready'
                          ? 'rgba(16,185,129,0.35)'
                          : 'rgba(99,102,241,0.28)',
                        animation: `pulse-ring 2.4s ease-out ${i * 0.8}s infinite`,
                      }}
                    />
                  ))}
                  <span className="font-mono text-sm text-white z-10 select-none">
                    {formatTime(elapsed)}
                  </span>
                </div>
                <div>
                  <p className="text-slate-300 text-sm poppins-medium">{formatTime(elapsed)} elapsed</p>
                  <p className="text-slate-600 text-xs poppins-regular mt-0.5">Polling every 3 seconds</p>
                </div>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-300 text-xs poppins-medium"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      animation: `pill-in 0.5s ease-out ${0.1 + i * 0.08}s both`,
                    }}
                  >
                    <span>{f.icon}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-2 flex items-center justify-between">
                {!showRetry && serverState !== 'ready' && (
                  <a
                    href="https://ankanpal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group text-sm poppins-semibold transition-all duration-300"
                    style={{
                      background: 'linear-gradient(135deg, #a78bfa, #e0e7ff, #67e8f9)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 8px rgba(167,139,250,0.6))',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.filter =
                        'drop-shadow(0 0 14px rgba(167,139,250,0.95)) drop-shadow(0 0 28px rgba(103,232,249,0.5))';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.filter =
                        'drop-shadow(0 0 8px rgba(167,139,250,0.6))';
                    }}
                  >
                    Visit ankanpal.com ✦
                  </a>
                )}
                {showRetry && (
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-300 text-sm poppins-medium hover:text-white transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.10)',
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* ── Right Panel ────────────────────────── */}
            <div className="p-8 lg:p-10 flex flex-col gap-5">
              <div>
                <h2
                  className="text-base poppins-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #c4b5fd, #67e8f9)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Warm up while you wait ⚡
                </h2>
                <p className="text-slate-600 text-xs poppins-regular mt-1">
                  Test your typing speed with famous study quotes
                </p>
              </div>

              <TypingRacer serverState={serverState} />

              <div
                className="pt-4 mt-auto"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-slate-600 text-[11px] poppins-medium uppercase tracking-wider mb-3">
                  📖 Study Tip
                </p>
                <StudyFactCarousel />
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
