"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronRight,
  Workflow,
  Github,
  Webhook,
  Code,
  GitBranch,
  Globe,
  Filter,
  Timer,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const githubUrl = "https://github.com/HenryBuilds/typeflow";

/* ─── Intersection Observer ─── */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Parallax hook ─── */
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrollY;
}

/* ─── Typing effect for code (resets when code changes) ─── */
function useTyping(code: string, speed = 20) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const { ref, inView } = useInView(0.25);

  // Reset when code changes
  useEffect(() => {
    setText("");
    setDone(false);
  }, [code]);

  useEffect(() => {
    if (!inView || done) return;
    let i = text.length;
    const iv = setInterval(() => {
      i++;
      setText(code.slice(0, i));
      if (i >= code.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [inView, code, speed, done, text.length]);
  return { ref, text, done };
}

/* ─── Particle canvas ─── */
function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const count = Math.min(60, Math.floor(window.innerWidth / 25));
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * c.width, y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.2 + 0.05,
      });
    }

    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      const dark = document.documentElement.classList.contains("dark");
      const rgb = dark ? "255,255,255" : "0,0,0";
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${rgb},${0.04 * (1 - d / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none z-0" />;
}

/* ─── Mouse glow ─── */
function MouseGlow() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h, { passive: true });
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        className="absolute w-[600px] h-[600px] rounded-full transition-[left,top] duration-300 ease-out opacity-60"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.12 255 / 0.07) 0%, transparent 70%)",
          left: pos.x - 300, top: pos.y - 300,
        }}
      />
    </div>
  );
}

/* ─── Mock workflow node (larger, more detail) ─── */
function MockNode({
  icon,
  title,
  desc,
  output,
  status = "default",
  handleLeft,
  handleRight,
  handleTop,
  handleBottom,
  multiBottom,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  output?: string;
  status?: "completed" | "running" | "default";
  handleLeft?: boolean;
  handleRight?: boolean;
  handleTop?: boolean;
  handleBottom?: boolean;
  multiBottom?: boolean;
}) {
  const border =
    status === "completed"
      ? "border-green-500/50 bg-green-500/[0.06] dark:bg-green-500/[0.12] shadow-sm shadow-green-500/10"
      : status === "running"
        ? "border-blue-500/50 bg-blue-500/[0.06] dark:bg-blue-500/[0.12] animate-[mock-pulse_2s_ease-in-out_infinite] shadow-md shadow-blue-500/10"
        : "border-border/50 bg-card/80 dark:bg-card/40 shadow-sm";

  return (
    <div className={`relative rounded-lg border-2 backdrop-blur-sm transition-all duration-500 ${border}`} style={{ width: "100%", height: "100%", padding: "6px 10px" }}>
      {/* Handles */}
      {handleLeft && <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-muted-foreground/40 border-2 border-background" />}
      {handleRight && <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-green-500/70 border-2 border-background" />}
      {handleTop && <div className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[8px] h-[8px] rounded-full bg-muted-foreground/40 border-2 border-background" />}
      {handleBottom && !multiBottom && <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[8px] h-[8px] rounded-full bg-green-500/70 border-2 border-background" />}
      {multiBottom && (
        <>
          <div className="absolute -bottom-[5px] left-[30%] -translate-x-1/2 w-[8px] h-[8px] rounded-full bg-green-500/70 border-2 border-background" />
          <div className="absolute -bottom-[5px] left-[70%] -translate-x-1/2 w-[8px] h-[8px] rounded-full bg-red-500/70 border-2 border-background" />
        </>
      )}

      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="shrink-0 text-muted-foreground/60">{icon}</span>
        <span className="text-[12px] font-semibold text-foreground truncate leading-none">{title}</span>
        {status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 ml-auto" />}
        {status === "running" && <Loader2 className="h-3.5 w-3.5 text-blue-500 shrink-0 ml-auto animate-spin" />}
      </div>
      {desc && <div className="text-[10px] text-muted-foreground/50 truncate leading-tight">{desc}</div>}
      {/* Mini output preview */}
      {output && (
        <div className="mt-1.5 rounded bg-background/60 dark:bg-background/30 border border-border/30 px-1.5 py-0.5">
          <div className="text-[9px] font-mono text-muted-foreground/40 truncate leading-tight">{output}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Mock edge (horizontal) ─── */
function MockEdge({ d, status = "default" }: { d: string; status?: "completed" | "running" | "default" }) {
  const styles: React.CSSProperties =
    status === "completed"
      ? { stroke: "#22c55e", strokeWidth: 2, strokeDasharray: "8 4", animation: "edge-flow 1.2s linear infinite" }
      : status === "running"
        ? { stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "6 4", animation: "edge-flow 0.7s linear infinite" }
        : { stroke: "currentColor", strokeWidth: 1.5, opacity: 0.12 };

  return <path d={d} fill="none" strokeLinecap="round" style={styles} />;
}

/* ─── Scroll-locked flow section — IntersectionObserver + scroll hijack ─── */
function StickyFlowSection({ heroReady }: { heroReady: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null); // invisible trigger element
  const [progress, setProgress] = useState(0);
  const lockedRef = useRef(false);
  const readyRef = useRef(false);       // IO detected editor in zone
  const doneRef = useRef(false);        // flow completed
  const progressRef = useRef(0);

  // Track touch position for mobile
  const touchYRef = useRef<number | null>(null);

  // ── IntersectionObserver: reliably detects when editor reaches center ──
  useEffect(() => {
    if (!sentinelRef.current) return;
    // rootMargin shrinks the detection box to just the middle ~30% of viewport
    // top: -35% crops top 35%, bottom: -35% crops bottom 35% → only middle 30% triggers
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !doneRef.current) {
          readyRef.current = true;
        } else if (!lockedRef.current) {
          readyRef.current = false;
        }
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Wheel + Touch handlers ──
  useEffect(() => {
    const WHEEL_SENSITIVITY = 0.0004;
    const TOUCH_SENSITIVITY = 0.0015;

    const handleDelta = (deltaY: number, preventDefault: () => void) => {
      if (doneRef.current) { lockedRef.current = false; return; }

      // Already locked — drive progress
      if (lockedRef.current) {
        preventDefault();
        const next = Math.max(0, Math.min(1, progressRef.current + deltaY * WHEEL_SENSITIVITY));
        progressRef.current = next;
        setProgress(next);
        if (next >= 1) { doneRef.current = true; lockedRef.current = false; }
        if (next <= 0 && deltaY < 0) { lockedRef.current = false; }
        return;
      }

      // Not locked — engage if IO says we're ready and scrolling down
      if (deltaY > 0 && readyRef.current) {
        lockedRef.current = true;
        preventDefault();
      }
    };

    const onWheel = (e: WheelEvent) => {
      handleDelta(e.deltaY, () => e.preventDefault());
    };

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchYRef.current === null) return;
      const currentY = e.touches[0].clientY;
      const deltaY = touchYRef.current - currentY;
      handleDelta(deltaY * (TOUCH_SENSITIVITY / WHEEL_SENSITIVITY), () => e.preventDefault());
      touchYRef.current = currentY;
    };

    const onTouchEnd = () => { touchYRef.current = null; };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div ref={editorRef} className="relative z-10 px-5 sm:px-8 py-8 sm:py-12">
      {/* Invisible sentinel — IO watches this to know when the editor is centered */}
      <div ref={sentinelRef} className="absolute top-1/2 left-1/2 w-0 h-0" />
      <div
        className={`w-full max-w-6xl mx-auto transition-all duration-1000 delay-600 ${
          heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
        }`}
      >
        <div className="relative">
          {/* Glow */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-chart-5/10 pointer-events-none" />
          <div className="absolute -inset-4 bg-primary/[0.03] rounded-3xl blur-3xl" />

          <div className="relative bg-card/60 dark:bg-card/40 backdrop-blur-2xl border border-border/40 rounded-2xl overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)]">
            {/* Title bar */}
            <div className="flex items-center px-4 py-2 bg-muted/40 backdrop-blur border-b border-border/30">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-foreground/10" />
              </div>
              <span className="flex-1 text-center text-[11px] text-muted-foreground/60 font-medium select-none">
                Typeflow — Workflow Editor
              </span>
              <div className="w-12" />
            </div>

            {/* Workflow canvas */}
            <WorkflowMock progress={progress} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Full workflow mock — scroll-driven flow progression ─── */
function WorkflowMock({ progress }: { progress: number }) {
  const W = 140; // node width
  const H = 58;  // node height (with output preview)
  const Hs = 48; // shorter node without output

  // Generous row spacing for clear branching
  const row1 = 170; // main pipeline Y (centered)
  const row0 = 45;  // branch up
  const row2 = 290; // branch down

  // Column positions — 6 columns, merge gets its own column at the end
  const col = [20, 190, 360, 530, 700, 870];

  type N = { x: number; y: number; w: number; h: number };
  const nodes: Record<string, N> = {
    webhook:   { x: col[0], y: row1,  w: W,  h: Hs },
    transform: { x: col[1], y: row1,  w: W,  h: H  },
    ifNode:    { x: col[2], y: row1,  w: W,  h: Hs },
    httpOk:    { x: col[3], y: row0,  w: W,  h: H  },
    notify:    { x: col[4], y: row0,  w: W,  h: Hs },
    logError:  { x: col[3], y: row2,  w: W,  h: H  },
    retry:     { x: col[4], y: row2,  w: W,  h: Hs },
    merge:     { x: col[5], y: row1,  w: W,  h: Hs },
  };

  // ── Progress-driven flow (0 → 8 steps from progress 0–1) ──
  const step = Math.min(8, Math.floor(progress * 9));

  // Node statuses based on current step
  type S = "completed" | "running" | "default";
  const s = (completedAt: number, runningAt: number): S =>
    step >= completedAt ? "completed" : step >= runningAt ? "running" : "default";

  const nodeStatus: Record<string, S> = {
    webhook:   s(1, 0),   // running immediately, completed at step 1
    transform: s(2, 1),   // running at 1, completed at 2
    ifNode:    s(3, 2),   // running at 2, completed at 3
    httpOk:    s(5, 3),   // running at 3, completed at 5
    logError:  s(5, 3),   // running at 3, completed at 5
    notify:    s(6, 5),   // running at 5, completed at 6
    retry:     s(6, 5),   // running at 5, completed at 6
    merge:     s(8, 7),   // running at 7, completed at 8
  };

  // Edge statuses — edge lights up when source is completed
  const edgeStatus: S[] = [
    nodeStatus.webhook   === "completed" ? (nodeStatus.transform === "completed" ? "completed" : "running") : "default", // webhook → transform
    nodeStatus.transform === "completed" ? (nodeStatus.ifNode    === "completed" ? "completed" : "running") : "default", // transform → IF
    nodeStatus.ifNode    === "completed" ? (nodeStatus.httpOk    === "completed" ? "completed" : "running") : "default", // IF → HTTP
    nodeStatus.ifNode    === "completed" ? (nodeStatus.logError  === "completed" ? "completed" : "running") : "default", // IF → logError
    nodeStatus.httpOk    === "completed" ? (nodeStatus.notify    === "completed" ? "completed" : "running") : "default", // HTTP → notify
    nodeStatus.logError  === "completed" ? (nodeStatus.retry     === "completed" ? "completed" : "running") : "default", // logError → retry
    nodeStatus.notify    === "completed" ? (nodeStatus.merge     === "completed" ? "completed" : "running") : "default", // notify → merge
    nodeStatus.retry     === "completed" ? (nodeStatus.merge     === "completed" ? "completed" : "running") : "default", // retry → merge
  ];

  // Helpers
  const right = (n: N) => n.x + n.w;
  const left = (n: N) => n.x;
  const midY = (n: N) => n.y + n.h / 2;

  // Horizontal bezier
  const hEdge = (sx: number, sy: number, tx: number, ty: number) => {
    const dx = Math.abs(tx - sx) * 0.4;
    return `M ${sx},${sy} C ${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`;
  };

  // Branch bezier — exits right then curves to target
  const branchEdge = (from: N, to: N) => {
    const sx = right(from), sy = midY(from), tx = left(to), ty = midY(to);
    const midXPos = sx + (tx - sx) * 0.5;
    return `M ${sx},${sy} C ${midXPos},${sy} ${midXPos},${ty} ${tx},${ty}`;
  };

  const edgePaths = [
    hEdge(right(nodes.webhook), midY(nodes.webhook), left(nodes.transform), midY(nodes.transform)),
    hEdge(right(nodes.transform), midY(nodes.transform), left(nodes.ifNode), midY(nodes.ifNode)),
    branchEdge(nodes.ifNode, nodes.httpOk),
    branchEdge(nodes.ifNode, nodes.logError),
    hEdge(right(nodes.httpOk), midY(nodes.httpOk), left(nodes.notify), midY(nodes.notify)),
    hEdge(right(nodes.logError), midY(nodes.logError), left(nodes.retry), midY(nodes.retry)),
    branchEdge(nodes.notify, nodes.merge),
    branchEdge(nodes.retry, nodes.merge),
  ];

  const nodeList: { key: string; n: N; el: ReactNode }[] = [
    { key: "webhook", n: nodes.webhook, el: (
      <MockNode icon={<Webhook style={{ width: 15, height: 15 }} />} title="Webhook" desc="POST /api/incoming" status={nodeStatus.webhook} handleRight />
    )},
    { key: "transform", n: nodes.transform, el: (
      <MockNode icon={<Code style={{ width: 15, height: 15 }} />} title="Transform" desc="Parse & validate" output='{ user: "john", valid: true }' status={nodeStatus.transform} handleLeft handleRight />
    )},
    { key: "if", n: nodes.ifNode, el: (
      <MockNode icon={<GitBranch style={{ width: 15, height: 15 }} />} title="IF" desc='$json.valid === true' status={nodeStatus.ifNode} handleLeft handleRight />
    )},
    { key: "httpOk", n: nodes.httpOk, el: (
      <MockNode icon={<Globe style={{ width: 15, height: 15 }} />} title="HTTP Request" desc="POST api.example.com" output="200 OK — 42ms" status={nodeStatus.httpOk} handleLeft handleRight />
    )},
    { key: "notify", n: nodes.notify, el: (
      <MockNode icon={<Webhook style={{ width: 15, height: 15 }} />} title="Slack Notify" desc="#deployments" status={nodeStatus.notify} handleLeft handleRight />
    )},
    { key: "logError", n: nodes.logError, el: (
      <MockNode icon={<Filter style={{ width: 15, height: 15 }} />} title="Log Error" desc="Write to error_log" output='{ level: "error", ts: ... }' status={nodeStatus.logError} handleLeft handleRight />
    )},
    { key: "retry", n: nodes.retry, el: (
      <MockNode icon={<Timer style={{ width: 15, height: 15 }} />} title="Wait & Retry" desc="Delay 30s, max 3" status={nodeStatus.retry} handleLeft handleRight />
    )},
    { key: "merge", n: nodes.merge, el: (
      <MockNode icon={<Workflow style={{ width: 15, height: 15 }} />} title="Merge" desc="Combine results" status={nodeStatus.merge} handleLeft handleRight />
    )},
  ];

  // Branch label visibility
  const branchVisible = nodeStatus.ifNode === "completed";

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1050 / 400" }}>
      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          animation: "dot-drift 30s ease-in-out infinite",
        }}
      />

      {/* Zoom controls hint (bottom-left) */}
      <div className="absolute bottom-3 left-3.5 flex flex-col gap-0.5 opacity-25">
        <div className="w-5 h-5 rounded border border-border/50 bg-card/40 backdrop-blur-sm flex items-center justify-center text-[10px] text-muted-foreground/60 font-medium">+</div>
        <div className="w-5 h-5 rounded border border-border/50 bg-card/40 backdrop-blur-sm flex items-center justify-center text-[10px] text-muted-foreground/60 font-medium">−</div>
      </div>

      {/* Mini-map hint (bottom-right) */}
      <div className="absolute bottom-3 right-3.5 w-[72px] h-[44px] rounded border border-border/30 bg-card/30 backdrop-blur-sm opacity-25">
        <div className="absolute inset-1 border border-primary/20 rounded-[2px]" />
        <div className="absolute top-2 left-2.5 w-[38%] h-[2px] bg-green-500/30 rounded-full" />
        <div className="absolute top-4 left-2.5 w-[38%] h-[2px] bg-green-500/30 rounded-full" />
        <div className="absolute top-3 left-[48%] w-[22%] h-[2px] bg-blue-500/30 rounded-full" />
        <div className="absolute top-5 left-[48%] w-[22%] h-[2px] bg-muted-foreground/15 rounded-full" />
      </div>

      <svg
        viewBox="0 0 1050 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Horizontal workflow editor showing a webhook pipeline with branching, error handling, and merge"
      >
        {/* Edges */}
        {edgePaths.map((d, i) => (
          <MockEdge key={i} d={d} status={edgeStatus[i]} />
        ))}

        {/* Branch labels — fade in when IF node completes */}
        <text
          x={right(nodes.ifNode) + 22} y={midY(nodes.ifNode) - 28}
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.03em", transition: "opacity 0.5s", opacity: branchVisible ? 1 : 0 }}
          className="fill-green-500/50"
        >true</text>
        <text
          x={right(nodes.ifNode) + 22} y={midY(nodes.ifNode) + 34}
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.03em", transition: "opacity 0.5s", opacity: branchVisible ? 1 : 0 }}
          className="fill-red-500/40"
        >false</text>

        {/* Nodes */}
        {nodeList.map((item) => (
          <foreignObject key={item.key} x={item.n.x} y={item.n.y} width={item.n.w} height={item.n.h} style={{ overflow: "visible" }}>
            {item.el}
          </foreignObject>
        ))}
      </svg>
    </div>
  );
}

/* ─── Syntax highlight (minimal, non-generic) ─── */
function Highlight({ code }: { code: string }) {
  const tokens: { t: string; c: string }[] = [];
  let r = code;
  while (r.length > 0) {
    let m;
    if ((m = r.match(/^'[^']*'/))) {
      tokens.push({ t: m[0], c: "text-emerald-400" }); r = r.slice(m[0].length); continue;
    }
    if ((m = r.match(/^\/\/[^\n]*/))) {
      tokens.push({ t: m[0], c: "text-foreground/25 italic" }); r = r.slice(m[0].length); continue;
    }
    if ((m = r.match(/^(const|await|return|require)\b/))) {
      tokens.push({ t: m[0], c: "text-violet-400 font-medium" }); r = r.slice(m[0].length); continue;
    }
    if ((m = r.match(/^[=().{},;=>:]+/))) {
      tokens.push({ t: m[0], c: "text-foreground/30" }); r = r.slice(m[0].length); continue;
    }
    if ((m = r.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/))) {
      const isCall = r[m[0].length] === "(";
      tokens.push({ t: m[0], c: isCall ? "text-sky-400" : "text-foreground/70" });
      r = r.slice(m[0].length); continue;
    }
    tokens.push({ t: r[0], c: "" }); r = r.slice(1);
  }
  return <>{tokens.map((t, i) => <span key={i} className={t.c}>{t.t}</span>)}</>;
}

/* ════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [heroReady, setHeroReady] = useState(false);
  const [codeTab, setCodeTab] = useState<0 | 1>(0);
  const scrollY = useParallax();

  const secFeatures = useInView(0.08);
  const secCode = useInView(0.1);
  const secSteps = useInView(0.1);
  const secCta = useInView(0.15);

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const codeTabs = [
    {
      file: "transform.ts",
      code: `const data = $json;

// Validate and transform input
const user: User = {
  id: data.id,
  name: data.name.trim(),
  email: data.email.toLowerCase(),
};

// Check required fields
if (!user.email.includes('@')) {
  throw new Error('Invalid email');
}

return { ...user, valid: true };`,
    },
    {
      file: "http-request.ts",
      code: `const axios = require('axios');

// POST validated user to API
const response = await axios.post(
  'https://api.example.com/users',
  { user: $json },
  { headers: { Authorization: $credentials.apiKey } }
);

// Return API response
return {
  status: response.status,
  userId: response.data.id,
  synced: true,
};`,
    },
  ];

  const typing = useTyping(codeTabs[codeTab].code, 15);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <ParticleField />
      <MouseGlow />

      {/* Ambient blobs — parallax layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute w-[min(700px,90vw)] h-[min(700px,90vw)] rounded-full bg-primary/[0.06] blur-[100px]"
          style={{ top: "-15%", left: "-10%", transform: `translateY(${scrollY * 0.15}px)` }}
        />
        <div
          className="absolute w-[min(500px,80vw)] h-[min(500px,80vw)] rounded-full bg-chart-5/[0.05] blur-[90px]"
          style={{ bottom: "-10%", right: "-8%", transform: `translateY(${scrollY * -0.1}px)` }}
        />
        <div
          className="absolute w-[min(350px,60vw)] h-[min(350px,60vw)] rounded-full bg-chart-2/[0.04] blur-[80px]"
          style={{ top: "50%", left: "55%", transform: `translate(-50%, calc(-50% + ${scrollY * 0.08}px))` }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.045]"
          style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
      </div>

      {/* ══════════ HERO ══════════ */}
      <section className="relative z-10 px-5 sm:px-8 pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto text-center">

          {/* Tagline — no badge, just minimal text */}
          <p
            className={`text-sm sm:text-base text-muted-foreground/70 font-medium tracking-wide mb-6 transition-all duration-700 ${
              heroReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"
            }`}
          >
            Open-source workflow automation for developers
          </p>

          {/* Headline */}
          <h1
            className={`text-[clamp(2.5rem,7vw,5.5rem)] font-extrabold leading-[1.05] tracking-tight mb-6 transition-all duration-1000 delay-100 ${
              heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Build Workflows{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-chart-5 to-chart-2 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-shift_8s_ease-in-out_infinite]">
              Like a Developer
            </span>
          </h1>

          {/* Sub */}
          <p
            className={`text-base sm:text-lg lg:text-xl text-muted-foreground max-w-xl sm:max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-1000 delay-250 ${
              heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Visual editor meets real TypeScript. Drag nodes, write code, debug with breakpoints
            — and ship with the full power of Node.js.
          </p>

          {/* Buttons */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 transition-all duration-1000 delay-400 ${
              heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {isDemoMode ? (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="group relative rounded-full">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm font-semibold m-[2px] transition-colors">
                  <Github className="h-4 w-4" />
                  View on GitHub
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </a>
            ) : (
              <Link href="/organizations" className="group relative rounded-full">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-7 py-2.5 sm:py-3 rounded-full text-sm font-semibold m-[2px] transition-colors">
                  Start Building
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}
            <a
              href={githubUrl} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>

      </section>

      {/* ══════════ STICKY FLOW SECTION ══════════ */}
      {/* Tall container — scroll distance within this drives the flow animation */}
      <StickyFlowSection heroReady={heroReady} />

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="relative z-10 px-5 sm:px-8 py-24 sm:py-32 lg:py-40">
        <div
          ref={secFeatures.ref}
          className="max-w-6xl mx-auto"
        >
          <div
            className={`max-w-2xl mb-12 sm:mb-16 transition-all duration-700 ${
              secFeatures.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Built for people
              <br />
              who write code.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Not another no-code drag-and-drop toy. Typeflow gives you a visual canvas
              backed by real TypeScript — with everything you&apos;d expect from a proper dev tool.
            </p>
          </div>

          {/* Feature grid — asymmetric, no icons, text-driven */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/40 rounded-2xl overflow-hidden">
            {[
              {
                title: "TypeScript native",
                body: "Every node runs real TypeScript. Full IntelliSense, type checking, and autocompletion — no proprietary expression language.",
              },
              {
                title: "Visual debugging",
                body: "Set breakpoints on any node, step through execution, inspect input/output data at every stage. Like VS Code, but for workflows.",
              },
              {
                title: "npm ecosystem",
                body: "Import axios, zod, lodash, or any of 2M+ packages directly inside your nodes. No wrappers, no restrictions.",
              },
              {
                title: "Version control",
                body: "Workflows are JSON. Export them, commit to git, diff changes, roll back. Treat automation like code because it is.",
              },
              {
                title: "Encrypted credentials",
                body: "API keys and secrets stored with AES-256 encryption at rest. Reference them in nodes without ever exposing raw values.",
              },
              {
                title: "Live execution",
                body: "Run workflows and watch data flow through nodes in real time. Full logging, output preview, and error traces on every run.",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`bg-card/60 dark:bg-card/30 backdrop-blur-sm p-6 sm:p-8 transition-all duration-600 hover:bg-card/90 dark:hover:bg-card/50 ${
                  secFeatures.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: secFeatures.inView ? `${150 + i * 80}ms` : "0ms",
                  transform: secFeatures.inView
                    ? `translateY(${scrollY * (i % 2 === 0 ? -0.02 : -0.015)}px)`
                    : undefined,
                }}
              >
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CODE / PACKAGES / TYPES SECTION ══════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-24 sm:py-32 lg:py-40">
        <div ref={secCode.ref} className="max-w-6xl mx-auto">
          {/* Heading */}
          <div
            className={`max-w-2xl mb-12 sm:mb-16 transition-all duration-700 ${
              secCode.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Write real TypeScript.
              <br />
              <span className="text-muted-foreground/60">Not YAML.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Each node is a TypeScript function. Import npm packages, define your own types,
              and access previous node outputs with <code className="text-primary font-mono text-sm bg-primary/5 px-1.5 py-0.5 rounded">$json</code>.
            </p>
          </div>

          {/* Three mock panels side by side */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 transition-all duration-700 delay-200 ${
              secCode.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            {/* ─── Code Editor Panel ─── */}
            <div ref={typing.ref} className="relative lg:col-span-2">
              <div className="absolute -inset-3 bg-primary/[0.02] rounded-2xl blur-xl" />
              <div className="relative bg-[#0d1117] dark:bg-[#0a0e14] rounded-xl overflow-hidden border border-white/[0.06] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.35)] h-full">
                {/* Tab bar with multiple file tabs */}
                <div className="flex items-center px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
                  <div className="flex gap-1.5 mr-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                  </div>
                  {/* File tabs */}
                  <div className="flex">
                    {codeTabs.map((tab, i) => (
                      <button
                        key={tab.file}
                        onClick={() => setCodeTab(i as 0 | 1)}
                        className={`px-3 py-1.5 text-[11px] font-mono transition-colors ${
                          codeTab === i
                            ? "text-white/50 bg-white/[0.04] border-b-2 border-primary/60 rounded-t"
                            : "text-white/20 hover:text-white/35"
                        }`}
                      >
                        {tab.file}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variables sidebar + code */}
                <div className="flex" style={{ minHeight: 320 }}>
                  {/* Mini variables panel */}
                  <div className="w-36 sm:w-44 border-r border-white/[0.04] bg-white/[0.01] shrink-0 hidden sm:block">
                    <div className="px-3 py-2 border-b border-white/[0.04]">
                      <div className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Variables</div>
                    </div>
                    <div className="p-2 space-y-0.5">
                      {["$json", "$input", "$credentials", "$env"].map((v) => (
                        <div key={v} className="px-2 py-1 rounded text-[11px] font-mono text-violet-400/60 hover:bg-white/[0.03] transition-colors cursor-default">
                          {v}
                        </div>
                      ))}
                      <div className="border-t border-white/[0.04] my-2" />
                      <div className="px-2 py-1 text-[10px] font-semibold text-white/20 uppercase tracking-wider">Previous Node</div>
                      <div className="px-2 py-1 rounded text-[11px] font-mono text-sky-400/50 cursor-default">
                        .user <span className="text-white/15">string</span>
                      </div>
                      <div className="px-2 py-1 rounded text-[11px] font-mono text-sky-400/50 cursor-default">
                        .email <span className="text-white/15">string</span>
                      </div>
                      <div className="px-2 py-1 rounded text-[11px] font-mono text-sky-400/50 cursor-default">
                        .valid <span className="text-white/15">boolean</span>
                      </div>
                    </div>
                  </div>

                  {/* Code area */}
                  <div className="flex flex-1 min-w-0">
                    {/* Line numbers */}
                    <div className="py-4 pl-2 pr-2 select-none shrink-0">
                      {codeTabs[codeTab].code.split("\n").map((_, i) => (
                        <div key={i} className="text-[11px] leading-[1.65] text-white/[0.1] font-mono text-right">{i + 1}</div>
                      ))}
                    </div>
                    {/* Code content */}
                    <pre className="py-4 px-3 text-[12px] sm:text-[13px] font-mono leading-[1.65] overflow-x-auto flex-1">
                      <code>
                        <Highlight code={typing.text} />
                        {!typing.done && (
                          <span className="inline-block w-[2px] h-[1.15em] bg-primary animate-[blink_1s_step-end_infinite] align-middle ml-px" />
                        )}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* Bottom bar — autocomplete hint */}
                <div className="px-4 py-1.5 border-t border-white/[0.04] flex items-center justify-between">
                  <span className="text-[10px] text-white/15 font-mono">TypeScript</span>
                  <span className="text-[10px] text-white/15">Ln 7, Col 23</span>
                </div>
              </div>
            </div>

            {/* ─── Right column: Packages + Types stacked ─── */}
            <div className="flex flex-col gap-4 sm:gap-5">

              {/* Package Manager Mock */}
              <div className="relative flex-1">
                <div className="absolute -inset-3 bg-chart-5/[0.02] rounded-2xl blur-xl" />
                <div className="relative bg-card/70 dark:bg-card/40 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden shadow-lg h-full">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-border/30 bg-muted/30">
                    <div className="text-[12px] font-semibold text-foreground">Packages</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">npm dependencies</div>
                  </div>

                  {/* Installed packages */}
                  <div className="p-3 space-y-2">
                    {[
                      { name: "axios", version: "1.7.2", active: true },
                      { name: "zod", version: "3.23.8", active: true },
                      { name: "lodash", version: "4.17.21", active: true },
                      { name: "date-fns", version: "3.6.0", active: false },
                    ].map((pkg) => (
                      <div key={pkg.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/30 bg-background/40 hover:bg-background/60 transition-colors">
                        <span className="text-[11px] font-mono font-semibold text-foreground/80">{pkg.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground/50 font-mono">{pkg.version}</span>
                        {pkg.active && (
                          <CheckCircle2 className="h-3 w-3 text-green-500/60 ml-auto shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Search bar mock */}
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border/30 bg-background/30">
                      <svg className="h-3 w-3 text-muted-foreground/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                      </svg>
                      <span className="text-[10px] text-muted-foreground/25">Search npm packages...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Type Definitions Mock */}
              <div className="relative flex-1">
                <div className="absolute -inset-3 bg-chart-2/[0.02] rounded-2xl blur-xl" />
                <div className="relative bg-[#0d1117] dark:bg-[#0a0e14] rounded-xl overflow-hidden border border-white/[0.06] shadow-lg h-full">
                  {/* Header */}
                  <div className="px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="text-[12px] font-semibold text-white/60">Type Definitions</div>
                    <div className="text-[10px] text-white/20 mt-0.5">Global types for all nodes</div>
                  </div>

                  {/* Type code */}
                  <div className="flex">
                    <div className="py-3 pl-2 pr-2 select-none shrink-0">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="text-[10px] leading-[1.6] text-white/[0.08] font-mono text-right">{i + 1}</div>
                      ))}
                    </div>
                    <pre className="py-3 pr-3 text-[10px] sm:text-[11px] font-mono leading-[1.6] overflow-x-auto flex-1">
                      <code>
                        <span className="text-violet-400/70">interface</span>{" "}
                        <span className="text-sky-400/70">User</span>{" "}
                        <span className="text-white/20">{"{"}</span>{"\n"}
                        {"  "}<span className="text-white/40">id</span><span className="text-white/15">:</span>{" "}<span className="text-emerald-400/50">string</span><span className="text-white/15">;</span>{"\n"}
                        {"  "}<span className="text-white/40">name</span><span className="text-white/15">:</span>{" "}<span className="text-emerald-400/50">string</span><span className="text-white/15">;</span>{"\n"}
                        {"  "}<span className="text-white/40">email</span><span className="text-white/15">:</span>{" "}<span className="text-emerald-400/50">string</span><span className="text-white/15">;</span>{"\n"}
                        <span className="text-white/20">{"}"}</span>{"\n"}
                        {"\n"}
                        <span className="text-violet-400/70">type</span>{" "}
                        <span className="text-sky-400/70">ApiResponse</span>
                        <span className="text-white/15">{"<"}</span>
                        <span className="text-white/30">T</span>
                        <span className="text-white/15">{">"}</span>{" "}
                        <span className="text-white/15">=</span>{" "}
                        <span className="text-white/20">{"{"}</span>{"\n"}
                        {"  "}<span className="text-white/40">data</span><span className="text-white/15">:</span>{" "}<span className="text-white/30">T</span><span className="text-white/15">;</span>{"\n"}
                        {"  "}<span className="text-white/40">status</span><span className="text-white/15">:</span>{" "}<span className="text-emerald-400/50">number</span><span className="text-white/15">;</span>{"\n"}
                        <span className="text-white/20">{"}"}</span>
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-24 sm:py-32 lg:py-40">
        <div ref={secSteps.ref} className="max-w-4xl mx-auto">
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-center mb-16 sm:mb-20 transition-all duration-700 ${
              secSteps.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            Design. Code. Ship.
          </h2>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 sm:left-8 top-0 bottom-0 w-px bg-border/50 hidden md:block" />

            <div className="space-y-16 sm:space-y-20">
              {[
                {
                  n: "01",
                  phase: "Design",
                  title: "Design your workflow visually",
                  body: "Drag nodes onto an infinite canvas and connect them with edges. Define execution order, branching logic, and parallel paths — all without writing config files or YAML.",
                  details: [
                    "Webhook, HTTP, Transform, IF/Switch, Merge, and Loop nodes out of the box",
                    "Zoom, pan, and minimap for navigating complex workflows",
                    "Group nodes into sub-workflows to keep things organized",
                  ],
                },
                {
                  n: "02",
                  phase: "Design",
                  title: "Connect to any API or service",
                  body: "Every HTTP node can talk to external APIs. Configure authentication once, reuse it everywhere. Credentials are encrypted and scoped to your organization.",
                  details: [
                    "OAuth2, API keys, Bearer tokens, and custom auth headers",
                    "Response mapping with JSONPath and dot notation",
                    "Automatic retries with configurable backoff strategies",
                  ],
                },
                {
                  n: "03",
                  phase: "Code",
                  title: "Write TypeScript in every node",
                  body: "Each node is a real function — not a config block. Import npm packages, handle errors, transform data. The browser-based editor gives you IntelliSense, type checking, and syntax highlighting.",
                  details: [
                    "Full access to Node.js built-ins and the npm ecosystem",
                    "Type-safe input/output — downstream nodes know the shape of your data",
                    "Shared utility modules across nodes in the same workflow",
                  ],
                },
                {
                  n: "04",
                  phase: "Code",
                  title: "Branch, loop, and merge",
                  body: "Build real control flow. IF nodes evaluate expressions and split into branches. Switch nodes handle multiple cases. Loop nodes iterate over arrays. Merge nodes recombine parallel paths.",
                  details: [
                    "Expression language with access to all upstream data via $json",
                    "Error branches that catch failures and route to fallback logic",
                    "Parallel execution across branches with automatic synchronization at merge points",
                  ],
                },
                {
                  n: "05",
                  phase: "Ship",
                  title: "Debug with real breakpoints",
                  body: "Set breakpoints on any node. When execution hits one, it pauses — you can inspect the input data, the output, and the full execution context. Step through nodes one by one or resume.",
                  details: [
                    "Inline data inspector showing the exact payload at each stage",
                    "Execution timeline with duration and status per node",
                    "Console output from each node captured and displayed in the editor",
                  ],
                },
                {
                  n: "06",
                  phase: "Ship",
                  title: "Test with live data",
                  body: "Trigger workflows manually with sample payloads, or send a real webhook. Watch execution flow through the canvas in real time — nodes light up as they run, and you see the output immediately.",
                  details: [
                    "Pin test payloads to workflows for repeatable testing",
                    "Partial execution — run from any node forward with mock input",
                    "Diff view comparing output between runs",
                  ],
                },
                {
                  n: "07",
                  phase: "Ship",
                  title: "Deploy and scale",
                  body: "When it works, ship it. Workflows run on a BullMQ-backed job queue — they survive crashes, retry on failure, and scale horizontally. Version history lets you roll back any time.",
                  details: [
                    "Persistent queue with at-least-once delivery guarantees",
                    "Cron triggers for scheduled execution",
                    "Execution logs with full replay capability",
                  ],
                },
              ].map((step, i) => (
                <div
                  key={step.n}
                  className={`flex gap-6 sm:gap-10 items-start transition-all duration-700 ${
                    secSteps.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: secSteps.inView ? `${200 + i * 120}ms` : "0ms" }}
                >
                  {/* Number circle with phase indicator */}
                  <div className="relative shrink-0 hidden md:block">
                    <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full border border-border/60 bg-card/80 backdrop-blur flex items-center justify-center">
                      <span className="text-xs sm:text-sm font-bold text-muted-foreground/60 font-mono">{step.n}</span>
                    </div>
                    <span className="absolute -right-1 -top-1 text-[9px] font-mono font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 border border-primary/15">
                      {step.phase}
                    </span>
                  </div>
                  <div className="pt-0 md:pt-1 lg:pt-2">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-muted-foreground/40 block md:hidden">{step.n}</span>
                      <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-primary/50 block md:hidden">{step.phase}</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mb-3">{step.body}</p>
                    <ul className="space-y-1.5 max-w-lg">
                      {step.details.map((d, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground/60 leading-relaxed">
                          <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-primary/40" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ HIGHLIGHT BANNER ══════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-20 sm:py-28 lg:py-36 overflow-hidden">
        <div className="max-w-5xl mx-auto relative">
          {/* Background glow */}
          <div className="absolute -inset-10 bg-gradient-to-r from-primary/[0.07] via-chart-5/[0.05] to-chart-2/[0.07] rounded-[2rem] blur-3xl" />

          <div className="relative rounded-2xl border border-border/30 bg-card/40 backdrop-blur-2xl overflow-hidden">
            {/* Top gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="px-8 sm:px-12 lg:px-16 py-14 sm:py-20">
              {/* Headline */}
              <div className="text-center mb-14 sm:mb-18">
                <p className="text-sm font-mono text-primary/60 tracking-wider uppercase mb-4">The full picture</p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
                  From idea to production{" "}
                  <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-primary via-chart-5 to-chart-2 bg-clip-text text-transparent">
                    in one tool.
                  </span>
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                  No glue code between services. No context switching between tools.
                  Design, write, debug, and deploy — all in the same editor.
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {[
                  { value: "100%", label: "TypeScript", sub: "Real code, not config" },
                  { value: "0", label: "Vendor lock-in", sub: "Open source, self-hosted" },
                  { value: "<5min", label: "To first workflow", sub: "From install to running" },
                  { value: "\u221E", label: "Scalability", sub: "BullMQ-backed job queue" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center group">
                    <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent mb-1.5">
                      {stat.value}
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-foreground/80 mb-0.5">{stat.label}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground/50">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* Bottom feature pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-12 sm:mt-16">
                {[
                  "Visual Canvas",
                  "IntelliSense",
                  "Breakpoints",
                  "npm Packages",
                  "Webhooks",
                  "Cron Triggers",
                  "Encrypted Credentials",
                  "Execution Logs",
                  "Version History",
                  "Self-Hosted",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-border/40 bg-card/60 text-muted-foreground/70 backdrop-blur-sm"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-chart-5/50 to-transparent" />
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="relative z-10 px-5 sm:px-8 py-24 sm:py-32 lg:py-40">
        <div ref={secCta.ref} className="max-w-3xl mx-auto text-center">
          <div
            className={`transition-all duration-700 ${
              secCta.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
              Ready to automate?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed max-w-lg mx-auto">
              Typeflow is free, open-source, and built for developers.
              Set it up in minutes and start building workflows today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {isDemoMode ? (
                <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="group relative rounded-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                  <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-7 py-3 rounded-full text-sm font-semibold m-[2px] transition-colors">
                    <Github className="h-4 w-4" />
                    View on GitHub
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </a>
              ) : (
                <Link href="/organizations" className="group relative rounded-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-chart-5 to-primary bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite] rounded-full" />
                  <div className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-7 py-3 rounded-full text-sm font-semibold m-[2px] transition-colors">
                    Get Started — It&apos;s Free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )}
              <a
                href={githubUrl} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-4 w-4" />
                Star on GitHub
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="relative z-10 border-t border-border/30 py-10 sm:py-12 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center">
              <Workflow className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm text-muted-foreground/60">
              &copy; 2026 Typeflow &middot; MIT License
            </span>
          </div>
          <a
            href={githubUrl} target="_blank" rel="noopener noreferrer"
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </footer>
    </div>
  );
}
