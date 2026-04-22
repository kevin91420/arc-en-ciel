"use client";

/**
 * /admin/fidelite/scanner — Interface staff pour valider un tampon.
 * Saisie manuelle ACE-XXXX + scan caméra via BarcodeDetector (progressive enhancement).
 * Grands boutons tactiles, fond brown, accents gold, auto-reset 5 s.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type StampResponse = {
  success: boolean;
  card: {
    card_number: string;
    current_stamps: number;
    total_stamps_earned: number;
    rewards_claimed: number;
  };
  rewardEarned: boolean;
  stampsAdded: number;
  stampsRequired: number;
};

type Phase = "idle" | "submitting" | "success" | "error";

/* Typed helper so TS doesn't complain about BarcodeDetector global. */
type BarcodeDetectorLike = {
  detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};
declare global {
  interface Window {
    BarcodeDetector?: {
      new (opts?: { formats?: string[] }): BarcodeDetectorLike;
    };
  }
}

export default function ScannerPage() {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<StampResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camSupported, setCamSupported] = useState<boolean | null>(null);
  const [camActive, setCamActive] = useState(false);
  const [config, setConfig] = useState<{ reward_label: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const submitLockRef = useRef(false);

  /* Check BarcodeDetector once mounted (client only) */
  useEffect(() => {
    setCamSupported(
      typeof window !== "undefined" && typeof window.BarcodeDetector === "function"
    );
  }, []);

  /* Load config for reward label */
  useEffect(() => {
    fetch("/api/admin/loyalty/config", {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setConfig({ reward_label: c.reward_label }))
      .catch(() => {});
  }, []);

  const submit = useCallback(
    async (cardNumber: string) => {
      if (submitLockRef.current) return;
      const trimmed = cardNumber.trim().toUpperCase();
      if (!trimmed) return;
      submitLockRef.current = true;
      setPhase("submitting");
      setError(null);
      try {
        const res = await fetch("/api/loyalty/stamp", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card_number: trimmed, staff_member: "scanner" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setResult(data);
        setPhase("success");
        /* Auto-reset after 5 s */
        setTimeout(() => {
          setPhase("idle");
          setResult(null);
          setValue("");
          submitLockRef.current = false;
        }, 5000);
      } catch (e) {
        setError((e as Error).message || "Erreur");
        setPhase("error");
        setTimeout(() => {
          setPhase("idle");
          setError(null);
          submitLockRef.current = false;
        }, 3000);
      }
    },
    []
  );

  /* Camera setup */
  const stopCamera = useCallback(() => {
    setCamActive(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!camSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (!detectorRef.current && window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
      }
      const tick = async () => {
        if (!videoRef.current || !detectorRef.current || !canvasRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes.length > 0) {
            const raw = codes[0].rawValue;
            /* Extract ACE-XXXX pattern */
            const match = raw.match(/ACE-[A-Z0-9]{4}/i);
            const found = (match ? match[0] : raw).toUpperCase();
            stopCamera();
            setValue(found);
            submit(found);
            return;
          }
        } catch {
          /* Silently retry next frame */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      setCamActive(false);
      setError(
        (e as Error).message.includes("Permission")
          ? "Permission caméra refusée"
          : "Impossible d'ouvrir la caméra"
      );
    }
  }, [camSupported, submit, stopCamera]);

  /* Cleanup on unmount */
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  /* Format input ACE-XXXX as user types */
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    /* Auto-insert dash after "ACE" if missing */
    if (v.length === 3 && !v.includes("-") && v === "ACE") v = "ACE-";
    if (v.length > 8) v = v.slice(0, 8);
    setValue(v);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] -mx-4 md:-mx-8 -my-6 bg-gradient-to-b from-brown via-[#3d2418] to-brown text-cream px-4 py-8 md:px-8 md:py-12 flex flex-col">
      {/* Top bar */}
      <div className="max-w-2xl w-full mx-auto flex items-center justify-between mb-6">
        <Link
          href="/admin/fidelite"
          className="inline-flex items-center gap-2 text-cream/75 hover:text-gold-light transition text-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
            <path
              d="M14 7l-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Retour
        </Link>
        <p className="font-[family-name:var(--font-script)] text-gold-light text-lg">
          Scanner fidélité
        </p>
      </div>

      <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {phase === "success" && result ? (
            <SuccessPanel
              key="success"
              result={result}
              rewardLabel={config?.reward_label || "Récompense"}
            />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-cream">
                  Valider un tampon
                </h1>
                <p className="mt-2 text-cream/70">
                  Scannez le QR ou tapez le numéro de carte
                </p>
              </div>

              {/* Camera */}
              <div className="rounded-3xl bg-black/30 border border-cream/10 overflow-hidden">
                {camSupported === false ? (
                  <div className="p-6 text-center text-cream/70 text-sm">
                    Scan QR non supporté sur cet appareil —{" "}
                    <span className="text-gold-light">
                      entrez le numéro manuellement
                    </span>
                    .
                  </div>
                ) : camActive ? (
                  <div className="relative aspect-square">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Viewfinder frame */}
                    <div className="absolute inset-[15%] pointer-events-none">
                      <div className="w-full h-full relative">
                        {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
                          (pos, i) => (
                            <span
                              key={i}
                              className={`absolute w-8 h-8 border-gold ${pos} ${
                                pos.includes("top") ? "border-t-4" : "border-b-4"
                              } ${pos.includes("left") ? "border-l-4" : "border-r-4"} rounded-[6px]`}
                            />
                          )
                        )}
                        <motion.span
                          initial={{ top: "0%" }}
                          animate={{ top: "100%" }}
                          transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                          }}
                          className="absolute inset-x-0 h-0.5 bg-gold shadow-[0_0_16px_rgba(184,146,47,0.8)]"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="absolute top-3 right-3 bg-black/60 text-cream text-xs px-3 py-1.5 rounded-full"
                    >
                      Arrêter
                    </button>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full p-6 text-center hover:bg-cream/5 transition"
                  >
                    <div className="inline-flex w-16 h-16 rounded-full bg-gold/15 items-center justify-center mb-3">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-8 h-8 text-gold"
                        aria-hidden
                      >
                        <path
                          d="M4 7a2 2 0 0 1 2-2h2l2-2h4l2 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    </div>
                    <p className="text-cream font-semibold">Scanner un QR</p>
                    <p className="text-cream/60 text-sm mt-1">
                      Pointez la caméra vers le code fidélité
                    </p>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-cream/40 text-xs uppercase tracking-widest">
                <span className="flex-1 h-px bg-cream/10" />
                ou
                <span className="flex-1 h-px bg-cream/10" />
              </div>

              {/* Manual input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(value);
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="block text-[11px] uppercase tracking-[0.18em] text-gold-light font-bold mb-2">
                    Numéro de carte
                  </span>
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    value={value}
                    onChange={onChange}
                    placeholder="ACE-XXXX"
                    maxLength={8}
                    className="w-full text-center font-mono text-3xl md:text-5xl tracking-[0.2em] font-bold py-5 rounded-2xl bg-black/30 border-2 border-cream/15 text-gold-light placeholder:text-cream/20 focus:outline-none focus:border-gold focus:ring-4 focus:ring-gold/25 transition"
                  />
                </label>

                <button
                  type="submit"
                  disabled={phase === "submitting" || value.length < 5}
                  className="w-full bg-gold hover:bg-gold-dark text-brown font-bold text-lg py-4 rounded-2xl shadow-lg active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {phase === "submitting" ? "Validation…" : "Valider le tampon"}
                </button>
              </form>

              {phase === "error" && error && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm bg-red/20 border border-red/40 text-cream px-4 py-3 rounded-xl"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════ */

function SuccessPanel({
  result,
  rewardLabel,
}: {
  result: StampResponse;
  rewardLabel: string;
}) {
  const { card, rewardEarned, stampsRequired } = result;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 20, stiffness: 260 }}
      className="text-center space-y-6"
    >
      {rewardEarned ? (
        <>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 14, stiffness: 180 }}
            className="inline-flex relative"
          >
            <span className="absolute inset-0 rounded-full bg-gold/30 blur-3xl animate-pulse" />
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-6xl shadow-[0_0_60px_rgba(184,146,47,0.6)]">
              🎉
            </div>
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-[11px] uppercase tracking-[0.28em] text-gold-light font-bold"
            >
              Récompense débloquée
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="mt-3 font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-gold-light"
            >
              {rewardLabel}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 text-cream/80"
            >
              Offrez la récompense au client, la carte repart à zéro.
            </motion.p>
          </div>
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 200 }}
            className="inline-flex"
          >
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold/90 to-gold-dark flex items-center justify-center shadow-[0_0_40px_rgba(184,146,47,0.45)]">
              <motion.svg
                viewBox="0 0 60 60"
                className="w-16 h-16 text-brown"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.12 }}
              >
                <motion.path
                  d="M12 32l12 12 24-24"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
                />
              </motion.svg>
            </div>
          </motion.div>
          <div>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-[family-name:var(--font-display)] text-4xl font-bold text-gold-light"
            >
              ✓ Tampon ajouté
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-cream/80"
            >
              Plus que{" "}
              <span className="font-bold text-gold-light">
                {stampsRequired - card.current_stamps}
              </span>{" "}
              avant la récompense.
            </motion.p>
          </div>
        </>
      )}

      {/* Card info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="inline-flex flex-col items-center gap-2 bg-black/30 border border-cream/10 rounded-2xl px-6 py-4"
      >
        <p className="font-mono text-xs tracking-widest text-gold-light">
          {card.card_number}
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: stampsRequired }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + i * 0.04 }}
              className={[
                "w-3 h-3 rounded-full",
                i < card.current_stamps
                  ? "bg-gold shadow-[0_0_8px_rgba(184,146,47,0.7)]"
                  : "bg-cream/15",
              ].join(" ")}
            />
          ))}
        </div>
        <p className="text-xs text-cream/60">
          {card.current_stamps} / {stampsRequired}
        </p>
      </motion.div>

      <p className="text-xs text-cream/40">Retour automatique dans 5 secondes…</p>
    </motion.div>
  );
}
