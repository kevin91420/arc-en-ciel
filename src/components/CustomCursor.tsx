"use client";

import { useEffect, useRef } from "react";

/**
 * Simple custom cursor — dot follows mouse instantly (no smooth/lag).
 * Hidden on touch devices.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;

    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) {
      dot.style.display = "none";
      return;
    }

    document.body.style.cursor = "none";

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
      document.body.style.cursor = "";
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={dotRef}
      className="custom-cursor-dot"
      aria-hidden="true"
    />
  );
}
