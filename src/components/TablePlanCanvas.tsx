"use client";

/**
 * TablePlanCanvas — Canvas 2D drag&drop pour positionner les tables.
 *
 * Coordonnées en "grid units" (1 unit ≈ 40px). Stockées dans la config
 * white-label. Drag = repositionnement, click = sélection pour éditer
 * forme + capacité.
 *
 * Utilisé en mode admin (drag&drop) ET en mode staff (read-only avec état
 * temps réel). Le mode est piloté par la prop `interactive`.
 */

import { motion, type PanInfo } from "framer-motion";
import { useMemo, useRef } from "react";
import type { TableConfig, TableShape } from "@/lib/db/settings-types";

const GRID = 40; // px per grid unit
const CANVAS_W = 24; // grid units = 960px
const CANVAS_H = 14; // grid units = 560px

function shapeDimensions(shape: TableShape | undefined): {
  w: number;
  h: number;
} {
  switch (shape) {
    case "round":
      return { w: 2, h: 2 };
    case "rect":
      return { w: 3, h: 2 };
    case "square":
    default:
      return { w: 2, h: 2 };
  }
}

/** Auto-layout pour les tables sans coordonnées : grille 6 colonnes */
function autoPosition(index: number): { x: number; y: number } {
  const cols = 6;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: col * 3 + 1, y: row * 3 + 1 };
}

export interface TablePlanCanvasProps {
  tables: TableConfig[];
  /** Drag activé seulement en mode édition (admin). */
  interactive?: boolean;
  /** Override colors/labels for the staff state (libre/cuisine/prête). */
  renderTable?: (table: TableConfig) => {
    bg: string;
    border: string;
    badge?: string;
    pulse?: boolean;
    label?: React.ReactNode;
    sublabel?: React.ReactNode;
    onClick?: () => void;
  };
  /** Sélection courante pour l'édition. */
  selectedNumber?: number | null;
  onSelect?: (number: number) => void;
  /** Drag terminé → coords mises à jour. */
  onMove?: (number: number, x: number, y: number) => void;
}

export default function TablePlanCanvas({
  tables,
  interactive = false,
  renderTable,
  selectedNumber,
  onSelect,
  onMove,
}: TablePlanCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);

  /* Auto-position tables that have no coordinates yet. */
  const placed = useMemo(() => {
    return tables.map((t, i) => {
      const auto = autoPosition(i);
      const x = Number.isFinite(t.x) ? (t.x as number) : auto.x;
      const y = Number.isFinite(t.y) ? (t.y as number) : auto.y;
      const { w, h } = shapeDimensions(t.shape);
      return {
        ...t,
        x,
        y,
        width: t.width ?? w,
        height: t.height ?? h,
      };
    });
  }, [tables]);

  function handleDragEnd(table: TableConfig, info: PanInfo) {
    if (!interactive || !onMove) return;
    const dx = info.offset.x / GRID;
    const dy = info.offset.y / GRID;
    const placedT = placed.find((t) => t.number === table.number)!;
    const nx = Math.max(0, Math.min(CANVAS_W - placedT.width, Math.round(placedT.x + dx)));
    const ny = Math.max(0, Math.min(CANVAS_H - placedT.height, Math.round(placedT.y + dy)));
    onMove(table.number, nx, ny);
  }

  return (
    <div
      ref={ref}
      className="relative w-full rounded-2xl border border-terracotta/30 overflow-hidden bg-cream/60"
      style={{
        aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
        backgroundImage:
          "radial-gradient(rgba(184,146,47,0.18) 1px, transparent 1px)",
        backgroundSize: `${100 / CANVAS_W}% ${100 / CANVAS_H}%`,
      }}
    >
      {placed.map((t) => {
        const cellW = `${(t.width / CANVAS_W) * 100}%`;
        const cellH = `${(t.height / CANVAS_H) * 100}%`;
        const left = `${(t.x / CANVAS_W) * 100}%`;
        const top = `${(t.y / CANVAS_H) * 100}%`;
        const selected = selectedNumber === t.number;
        const visual = renderTable?.(t) ?? {
          bg: "bg-white-warm",
          border: "border-terracotta/40",
        };
        return (
          <motion.div
            key={t.number}
            drag={interactive}
            dragMomentum={false}
            dragElastic={0}
            onDragEnd={(_, info) => handleDragEnd(t, info)}
            onClick={() => {
              visual.onClick?.();
              onSelect?.(t.number);
            }}
            whileHover={{ scale: interactive ? 1.02 : 1 }}
            whileDrag={{ scale: 1.05, zIndex: 50 }}
            className={[
              "absolute flex flex-col items-center justify-center text-center select-none",
              "border-2 transition-colors",
              t.shape === "round" ? "rounded-full" : "rounded-2xl",
              visual.bg,
              visual.border,
              interactive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
              selected ? "ring-4 ring-gold/60" : "",
            ].join(" ")}
            style={{
              left,
              top,
              width: cellW,
              height: cellH,
              padding: 4,
            }}
          >
            {visual.pulse && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-2xl ring-4 ring-green-500/60 pointer-events-none"
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.02, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  borderRadius: t.shape === "round" ? "9999px" : "1rem",
                }}
              />
            )}
            {visual.badge && (
              <span className="absolute top-1 right-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brown text-cream">
                {visual.badge}
              </span>
            )}
            <span className="font-[family-name:var(--font-display)] font-bold text-brown text-base sm:text-xl leading-none">
              {visual.label ?? t.label}
            </span>
            {visual.sublabel && (
              <span className="text-[9px] text-brown-light mt-1 leading-tight">
                {visual.sublabel}
              </span>
            )}
            {!visual.sublabel && (
              <span className="text-[9px] text-brown-light/70 mt-0.5">
                {t.capacity} pl
              </span>
            )}
          </motion.div>
        );
      })}

      {placed.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-brown-light/60">
          Pas de tables. Ajoutez-en pour commencer le plan.
        </div>
      )}
    </div>
  );
}
