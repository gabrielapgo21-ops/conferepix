"use client";

/**
 * Gráficos leves em SVG — sem dependência externa, mobile-friendly,
 * com tooltip simples e visual igual ao Shopify/Square.
 */

import { useState } from "react";
import { formatBRL } from "@/lib/utils";

// ============================================================================
// GRÁFICO DE LINHA / ÁREA
// ============================================================================

interface LineChartProps {
  data: { label: string; valor: number }[];
  height?: number;
  showGrid?: boolean;
  color?: string;
  formatValor?: (v: number) => string;
}

export function LineChart({
  data,
  height = 180,
  showGrid = true,
  color = "hsl(var(--primary))",
  formatValor = formatBRL,
}: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg"
        style={{ height }}
      >
        Sem dados ainda
      </div>
    );
  }

  const w = 800;
  const h = height;
  const padL = 50;
  const padR = 20;
  const padT = 16;
  const padB = 32;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const max = Math.max(...data.map((d) => d.valor), 1);
  const min = 0;

  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const yScale = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;

  const points = data.map((d, i) => ({
    x: padL + i * xStep,
    y: yScale(d.valor),
    valor: d.valor,
    label: d.label,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    path +
    ` L${points[points.length - 1].x.toFixed(1)},${(padT + innerH).toFixed(1)}` +
    ` L${points[0].x.toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => {
    const v = min + ((max - min) * (gridLines - i)) / gridLines;
    return { y: yScale(v), v };
  });

  // Mostra labels no eixo X de forma esparsa
  const xLabelEvery = Math.ceil(data.length / 7);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ maxHeight: height * 1.5 }}
        onMouseLeave={() => setHover(null)}
      >
        {showGrid &&
          gridYs.map((g, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={w - padR}
                y1={g.y}
                y2={g.y}
                stroke="hsl(var(--border))"
                strokeDasharray="3 4"
              />
              <text
                x={padL - 8}
                y={g.y + 4}
                textAnchor="end"
                fontSize={10}
                fill="hsl(var(--muted-foreground))"
              >
                {g.v >= 1000 ? `${(g.v / 1000).toFixed(1)}k` : g.v.toFixed(0)}
              </text>
            </g>
          ))}
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lineGradient)" />
        <path d={path} stroke={color} strokeWidth={2.5} fill="none" />
        {points.map((p, i) =>
          i % xLabelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`l-${i}`}
              x={p.x}
              y={h - 10}
              textAnchor="middle"
              fontSize={10}
              fill="hsl(var(--muted-foreground))"
            >
              {p.label}
            </text>
          ) : null
        )}
        {points.map((p, i) => (
          <g key={`p-${i}`}>
            {hover === i && (
              <circle cx={p.x} cy={p.y} r={5} fill={color} />
            )}
            <rect
              x={p.x - xStep / 2}
              y={padT}
              width={xStep}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        {hover !== null && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={padT}
              y2={padT + innerH}
              stroke={color}
              strokeOpacity={0.3}
              strokeDasharray="2 3"
            />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="text-xs text-center mt-1">
          <span className="font-semibold">{points[hover].label}</span>{" "}
          <span className="text-muted-foreground">·</span>{" "}
          <span className="tabular text-primary font-semibold">
            {formatValor(points[hover].valor)}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GRÁFICO DE BARRA HORIZONTAL (top N de algo)
// ============================================================================

interface BarListProps {
  items: { label: string; valor: number; sublabel?: string; icone?: string }[];
  formatValor?: (v: number) => string;
  emptyMsg?: string;
  color?: string;
}

export function BarList({
  items,
  formatValor = formatBRL,
  emptyMsg = "Sem dados ainda",
  color = "hsl(var(--primary))",
}: BarListProps) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">{emptyMsg}</div>
    );
  }
  const max = Math.max(...items.map((i) => i.valor), 1);
  return (
    <div className="space-y-2.5">
      {items.map((it, idx) => {
        const pct = (it.valor / max) * 100;
        return (
          <div key={`${it.label}-${idx}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {it.icone && <span className="text-base">{it.icone}</span>}
                <span className="font-medium truncate">{it.label}</span>
                {it.sublabel && (
                  <span className="text-muted-foreground flex-shrink-0">
                    · {it.sublabel}
                  </span>
                )}
              </div>
              <span className="tabular font-semibold flex-shrink-0 ml-2">
                {formatValor(it.valor)}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// GRÁFICO DE BARRA VERTICAL (dia da semana, hora)
// ============================================================================

interface BarVerticalProps {
  data: { label: string; valor: number }[];
  height?: number;
  color?: string;
  formatValor?: (v: number) => string;
  showZero?: boolean;
}

export function BarVertical({
  data,
  height = 140,
  color = "hsl(var(--primary))",
  formatValor = formatBRL,
  showZero = false,
}: BarVerticalProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.valor), 1);

  if (data.every((d) => d.valor === 0) && !showZero) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Sem vendas registradas ainda
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const pct = (d.valor / max) * 100;
          const isHover = hover === i;
          return (
            <button
              type="button"
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group cursor-pointer min-w-0"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setHover(isHover ? null : i)}
            >
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: color,
                    opacity: hover === null || isHover ? 1 : 0.4,
                  }}
                />
              </div>
              <div
                className={`text-[10px] transition ${
                  isHover ? "text-foreground font-semibold" : "text-muted-foreground"
                }`}
              >
                {d.label}
              </div>
            </button>
          );
        })}
      </div>
      {hover !== null && (
        <div className="text-xs text-center mt-2">
          <span className="font-semibold">{data[hover].label}</span>{" "}
          <span className="text-muted-foreground">·</span>{" "}
          <span className="tabular text-primary font-semibold">
            {formatValor(data[hover].valor)}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STAT CARD COM TENDÊNCIA
// ============================================================================

interface StatCardProps {
  label: string;
  valor: string;
  sub?: string;
  variacao?: number; // percentual
  icone?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "destructive";
}

export function StatCard({
  label,
  valor,
  sub,
  variacao,
  icone,
  color = "primary",
}: StatCardProps) {
  const corMap = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        {icone && (
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${corMap[color]}`}>
            {icone}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold tabular">{valor}</div>
      {(sub || variacao !== undefined) && (
        <div className="text-xs mt-1 flex items-center gap-1.5">
          {variacao !== undefined && (
            <span
              className={`tabular font-semibold ${
                variacao > 0
                  ? "text-success"
                  : variacao < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {variacao > 0 ? "↑" : variacao < 0 ? "↓" : "="}
              {Math.abs(variacao).toFixed(1)}%
            </span>
          )}
          {sub && <span className="text-muted-foreground">{sub}</span>}
        </div>
      )}
    </div>
  );
}
