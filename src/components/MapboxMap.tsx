"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// L'Arc en Ciel — 36 Rue de l'Église, 91420 Morangis
const LNG = 2.3387;
const LAT = 48.7056;

export default function MapboxMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !TOKEN || mapRef.current) return;

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [LNG, LAT],
      zoom: 16,
      pitch: 55,
      bearing: -20,
      antialias: true,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "top-right");

    // Custom marker
    const markerEl = document.createElement("div");
    markerEl.innerHTML = `
      <div style="
        width: 52px; height: 52px;
        background: #C0392B;
        border: 3px solid #FFFDF9;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 6px 20px rgba(44,24,16,0.4);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 22px;
          line-height: 1;
        ">🍕</span>
      </div>
    `;

    new mapboxgl.Marker({ element: markerEl, anchor: "bottom" })
      .setLngLat([LNG, LAT])
      .setPopup(
        new mapboxgl.Popup({ offset: 30, closeButton: false, className: "arc-popup" }).setHTML(`
          <div style="font-family: system-ui; padding: 6px 2px;">
            <strong style="font-size: 15px; color: #2C1810;">🍕 L'Arc en Ciel</strong>
            <p style="margin: 6px 0 2px; font-size: 12px; color: #5C3D2E;">36 Rue de l'Église<br/>91420 Morangis</p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #C0392B; font-weight: 600;">Pizzas au Feu de Bois & Grillades</p>
          </div>
        `)
      )
      .addTo(map);

    // Add 3D buildings on load
    map.on("style.load", () => {
      const layers = map.getStyle().layers;
      // Find the first label layer to insert 3D buildings beneath it
      let labelLayerId: string | undefined;
      if (layers) {
        for (const layer of layers) {
          if (layer.type === "symbol" && (layer.layout as Record<string, unknown>)?.["text-field"]) {
            labelLayerId = layer.id;
            break;
          }
        }
      }

      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": "#d4c5b0",
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.7,
          },
        },
        labelLayerId
      );

      setLoaded(true);
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fallback if no token
  if (!TOKEN) {
    return (
      <div className="w-full h-full bg-cream-dark rounded-2xl flex items-center justify-center">
        <a
          href="https://www.google.com/maps/search/?api=1&query=36+Rue+de+l'Église+91420+Morangis"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-3 text-brown-light hover:text-red transition-colors group"
        >
          <svg className="w-16 h-16 text-terracotta-deep group-hover:text-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Ouvrir dans Maps
          </span>
          <span className="text-sm">36 Rue de l&apos;Église, 91420 Morangis</span>
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`w-full h-full transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
      {!loaded && (
        <div className="absolute inset-0 bg-cream-dark animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-terracotta-deep animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
