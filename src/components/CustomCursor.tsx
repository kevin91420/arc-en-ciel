"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Simple custom cursor — dot follows mouse instantly (no smooth/lag).
 * Hidden on touch devices and when prefers-reduced-motion is set.
 * Does NOT hide the native cursor for accessibility.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    // Skip on touch devices or reduced motion
    if (reducedMotion || window.matchMedia("(pointer: coarse)").matches) {
      dot.style.display = "none";
      return;
    }
    dot.style.display = "";

    // Track already-bound elements to avoid duplicate listeners
    const boundElements = new WeakSet<Element>();

    const onMove = (e: MouseEvent) => {
      const isExpanded = dot.classList.contains("cursor-expanded");
      const offset = isExpanded ? 20 : 6;
      dot.style.transform = `translate(${e.clientX - offset}px, ${e.clientY - offset}px)`;
    };

    // Expand on interactive elements
    const onEnter = () => dot.classList.add("cursor-expanded");
    const onLeave = () => dot.classList.remove("cursor-expanded");

    const bindHover = () => {
      document.querySelectorAll("a, button, [data-cursor-expand]").forEach((el) => {
        if (boundElements.has(el)) return;
        boundElements.add(el);
        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);
      });
    };

    window.addEventListener("mousemove", onMove);
    bindHover();

    const observer = new MutationObserver(bindHover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      observer.disconnect();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={dotRef}
      className="custom-cursor-dot"
      aria-hidden="true"
    />
  );
}
