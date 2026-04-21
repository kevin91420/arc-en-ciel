"use client";

import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   QR GENERATOR — Print-ready table QR codes
   Pour générer les QR à coller sur les tables du restaurant.
   Utilise l'API publique api.qrserver.com (free, sans auth).
   ═══════════════════════════════════════════════════════════ */

const BASE_URL = "https://arc-en-ciel-theta.vercel.app/m/carte";

export default function QRGeneratorPage() {
  const [count, setCount] = useState(10);
  const [startFrom, setStartFrom] = useState(1);

  const tables = Array.from({ length: count }, (_, i) => startFrom + i);

  const getQrUrl = (tableNum: number) => {
    const url = `${BASE_URL}?table=${tableNum}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
      url
    )}&margin=10&ecc=M`;
  };

  return (
    <div className="min-h-screen bg-cream bg-paper p-8 print:p-0 print:bg-white">
      {/* Controls (hidden on print) */}
      <div className="max-w-3xl mx-auto mb-8 bg-white-warm rounded-2xl p-6 shadow-md print:hidden">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-brown mb-4">
          Générateur de QR Codes — Tables
        </h1>
        <p className="text-brown-light mb-6 text-sm">
          Configurez vos paramètres, puis imprimez cette page. Chaque QR code renvoie vers le menu mobile avec le numéro de table encodé.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-brown-light font-semibold mb-1 block">
              Table de départ
            </span>
            <input
              type="number"
              min={1}
              value={startFrom}
              onChange={(e) => setStartFrom(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-4 py-2 rounded-lg border border-terracotta/20 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none text-brown font-bold"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-brown-light font-semibold mb-1 block">
              Nombre de tables
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
              className="w-full px-4 py-2 rounded-lg border border-terracotta/20 focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none text-brown font-bold"
            />
          </label>
        </div>
        <button
          onClick={() => window.print()}
          className="w-full bg-brown hover:bg-brown/90 text-cream font-bold py-3 rounded-full transition-colors active:scale-[0.98]"
        >
          🖨️ Imprimer les {count} QR codes
        </button>
      </div>

      {/* QR cards grid — A4 layout: 2x3 = 6 per page */}
      <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4 print:gap-3">
        {tables.map((tableNum) => (
          <div
            key={tableNum}
            className="bg-white rounded-2xl p-5 text-center border-2 border-brown print:border-brown print:break-inside-avoid print:page-break-inside-avoid"
            style={{ breakInside: "avoid" }}
          >
            <p className="font-[family-name:var(--font-script)] text-gold text-lg mb-0">
              L&apos;Arc en Ciel
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-brown text-3xl font-bold mb-3 leading-none">
              Table {tableNum}
            </h2>
            <div className="relative w-full aspect-square mb-3 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getQrUrl(tableNum)}
                alt={`QR code table ${tableNum}`}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-brown-light font-bold mb-1">
              Scannez pour accéder
            </p>
            <p className="font-[family-name:var(--font-display)] text-brown text-sm font-semibold">
              à la carte
            </p>
            <div className="mt-2 pt-2 border-t border-brown/10 text-[9px] text-brown-light/70">
              arc-en-ciel-theta.vercel.app
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
