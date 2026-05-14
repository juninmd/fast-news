import React, { useRef, useEffect, useState } from 'react';
import type { ArticleNode, GraphEdge, StoryNode } from '../../hooks/useStories';

interface Props {
  nodes: ArticleNode[];
  edges: GraphEdge[];
  stories: StoryNode[];
  onNodeClick?: (node: ArticleNode) => void;
  height?: number;
}

// Simple canvas-based force graph (no deps)
export function CorrelationGraph({ nodes, edges, stories, onNodeClick, height = 400 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const CATEGORY_COLORS: Record<string, string> = {
    'AI Frontier': '#a78bfa',
    'Big Techs': '#60a5fa',
    'Dev Tools': '#34d399',
    'Gaming': '#f97316',
    'Tecnologia': '#38bdf8',
    'Mundo': '#f472b6',
    'Negocios': '#fbbf24',
    'Brasil': '#4ade80',
    'Ciencia': '#e879f9',
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.offsetWidth;
    const h = height;
    canvas.width = w;
    canvas.height = h;

    // Initialize positions
    nodes.forEach((n) => {
      if (!posRef.current.has(n.id)) {
        posRef.current.set(n.id, {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0,
          vy: 0,
        });
      }
    });

    // Remove stale nodes
    const ids = new Set(nodes.map((n) => n.id));
    for (const k of posRef.current.keys()) {
      if (!ids.has(k)) posRef.current.delete(k);
    }

    const REPEL = 1200;
    const ATTRACT = 0.01;
    const DAMPING = 0.85;
    const CENTER_PULL = 0.002;

    function tick() {
      // Repulsion
      const nodeList = nodes.map((n) => ({ n, p: posRef.current.get(n.id)! }));
      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = nodeList[i].p;
          const b = nodeList[j].p;
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPEL / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // Attraction (edges)
      for (const e of edges) {
        const a = posRef.current.get(e.source);
        const b = posRef.current.get(e.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 80 + (1 - e.similarity) * 120;
        const force = (dist - targetDist) * ATTRACT;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // Center pull + damping + bounds
      for (const { p } of nodeList) {
        if (!p) continue;
        p.vx += (w / 2 - p.x) * CENTER_PULL;
        p.vy += (h / 2 - p.y) * CENTER_PULL;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x = Math.max(20, Math.min(w - 20, p.x + p.vx));
        p.y = Math.max(20, Math.min(h - 20, p.y + p.vy));
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Edges
      for (const e of edges) {
        const a = posRef.current.get(e.source);
        const b = posRef.current.get(e.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(99,102,241,${e.similarity * 0.6})`;
        ctx.lineWidth = e.similarity * 2;
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        const p = posRef.current.get(n.id);
        if (!p) continue;
        const isHovered = hoveredId === n.id;
        const r = isHovered ? 10 : 7;
        const color = CATEGORY_COLORS[n.category] ?? '#94a3b8';

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (isHovered) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
          // label
          ctx.font = '10px sans-serif';
          ctx.fillStyle = 'white';
          ctx.fillText(n.title.slice(0, 40), p.x + 12, p.y + 4);
        }
      }
    }

    function frame() {
      tick();
      draw();
      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, hoveredId, height]);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: string | null = null;
    for (const [id, p] of posRef.current) {
      const dx = p.x - mx;
      const dy = p.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < 12) { found = id; break; }
    }
    setHoveredId(found);
  }

  function handleClick() {
    if (!hoveredId) return;
    const node = nodes.find((n) => n.id === hoveredId);
    if (node) onNodeClick?.(node);
  }

  return (
    <div className="relative rounded-xl border border-border bg-surface overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="cursor-pointer"
      />
      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 bg-surface/80 backdrop-blur rounded-lg p-2 text-xs">
        {Object.entries({ 'AI Frontier': '#a78bfa', 'Big Techs': '#60a5fa', 'Tecnologia': '#38bdf8', 'Mundo': '#f472b6', 'Negocios': '#fbbf24', 'Brasil': '#4ade80' }).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-text-secondary">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
