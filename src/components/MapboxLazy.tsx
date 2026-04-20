"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MapboxMap = dynamic(() => import("./MapboxMap"), { ssr: false });

interface MapboxLazyProps {
  mapsLink: string;
}

/**
 * Ne charge le bundle mapbox-gl qu’une fois la carte proche du viewport
 * (gain Lighthouse : JS initial / unused-javascript).
 */
export default function MapboxLazy({ mapsLink }: MapboxLazyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="relative h-full min-h-[400px] w-full bg-terracotta/20">
      {!shouldLoad && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-brown-light text-sm">Carte interactive</p>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-red px-5 py-2.5 text-sm font-semibold text-white-warm transition-colors hover:bg-red-dark"
          >
            Ouvrir dans Google Maps
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
      {shouldLoad && (
        <div className="absolute inset-0 h-full w-full">
          <MapboxMap />
        </div>
      )}
    </div>
  );
}
