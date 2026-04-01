"use client";

interface MarqueeProps {
  text: string;
  className?: string;
}

/**
 * Infinite horizontal scroll text.
 * Uses solid color + opacity on the container to avoid sub-pixel aliasing / pixelation.
 */
export default function Marquee({ text, className = "" }: MarqueeProps) {
  const repeated = Array(6).fill(text).join(" \u2022 ") + " \u2022 ";

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`} aria-hidden="true">
      <div className="animate-marquee inline-flex">
        <span className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl lg:text-9xl font-bold tracking-tight select-none">
          {repeated}
        </span>
        <span className="font-[family-name:var(--font-display)] text-5xl sm:text-7xl lg:text-9xl font-bold tracking-tight select-none">
          {repeated}
        </span>
      </div>
    </div>
  );
}
