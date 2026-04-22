"use client";

/**
 * Staff POS login — fullscreen PIN pad, tablet-first.
 *
 * Flow: user taps 4+ digits, we POST /api/staff/auth. On 200 the server sets
 * the httpOnly `arc_staff_auth` cookie containing the staff id; we hard-navigate
 * to ?from= or /staff/tables. On 401 we shake + clear.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const PIN_LENGTH = 4;

function PinPad() {
  const params = useSearchParams();
  const from = params.get("from") || "/staff/tables";

  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error" | "ok">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const submittedRef = useRef(false);

  const submit = useCallback(
    async (fullPin: string) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setStatus("submitting");
      try {
        const res = await fetch("/api/staff/auth", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ pin: fullPin }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || "PIN incorrect");
          setStatus("error");
          submittedRef.current = false;
          /* Shake, then clear after the animation so the user sees the wrong PIN. */
          setTimeout(() => {
            setPin("");
            setStatus("idle");
          }, 700);
          return;
        }
        setStatus("ok");
        /* Hard navigation so the proxy re-runs with the new cookie. */
        window.location.href = from;
      } catch {
        setErrorMsg("Erreur réseau");
        setStatus("error");
        submittedRef.current = false;
        setTimeout(() => {
          setPin("");
          setStatus("idle");
        }, 700);
      }
    },
    [from]
  );

  const onDigit = useCallback(
    (d: string) => {
      if (status === "submitting" || status === "ok") return;
      setErrorMsg(null);
      setStatus("idle");
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + d;
        /* Fire-and-forget the submit as soon as the PIN is full. */
        if (next.length === PIN_LENGTH) {
          submit(next);
        }
        return next;
      });
    },
    [status, submit]
  );

  const onBackspace = useCallback(() => {
    if (status === "submitting" || status === "ok") return;
    setErrorMsg(null);
    setStatus("idle");
    setPin((prev) => prev.slice(0, -1));
  }, [status]);

  const onClear = useCallback(() => {
    if (status === "submitting" || status === "ok") return;
    setErrorMsg(null);
    setStatus("idle");
    setPin("");
  }, [status]);

  /* Physical-keyboard support (handy when running on desktop for dev). */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        onDigit(e.key);
      } else if (e.key === "Backspace") {
        onBackspace();
      } else if (e.key === "Escape") {
        onClear();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDigit, onBackspace, onClear]);

  const shake = status === "error";
  const digits = Array.from({ length: PIN_LENGTH });

  return (
    <div className="w-full max-w-md mx-auto select-none">
      {/* PIN dots ─────────────────────────────────── */}
      <motion.div
        animate={
          shake
            ? { x: [0, -14, 14, -10, 10, -6, 6, 0] }
            : { x: 0 }
        }
        transition={{ duration: 0.55, ease: "easeInOut" }}
        className="flex justify-center gap-5 mb-8"
      >
        {digits.map((_, i) => {
          const filled = i < pin.length;
          return (
            <motion.span
              key={i}
              animate={{
                scale: filled ? 1.15 : 1,
                backgroundColor: filled
                  ? shake
                    ? "#C0392B"
                    : status === "ok"
                      ? "#6B8E23"
                      : "#E8C97A"
                  : "rgba(253,248,240,0.15)",
                borderColor: filled
                  ? shake
                    ? "#C0392B"
                    : status === "ok"
                      ? "#6B8E23"
                      : "#E8C97A"
                  : "rgba(253,248,240,0.4)",
              }}
              transition={{ duration: 0.18 }}
              className="w-5 h-5 rounded-full border-2"
            />
          );
        })}
      </motion.div>

      {/* Status caption ────────────────────────────── */}
      <div className="h-6 mb-6 text-center">
        <AnimatePresence mode="wait">
          {errorMsg ? (
            <motion.p
              key="err"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-red-400 font-medium tracking-wide"
            >
              {errorMsg}
            </motion.p>
          ) : status === "submitting" ? (
            <motion.p
              key="sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-cream/60"
            >
              Vérification…
            </motion.p>
          ) : status === "ok" ? (
            <motion.p
              key="ok"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-green-400 font-medium"
            >
              Bienvenue, ouverture du service…
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-cream/50"
            >
              Composez votre PIN
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Keypad ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <PinKey key={d} label={d} onPress={() => onDigit(d)} />
        ))}
        <PinKey
          label="Effacer"
          small
          onPress={onClear}
          ariaLabel="Tout effacer"
        />
        <PinKey label="0" onPress={() => onDigit("0")} />
        <PinKey
          label="⌫"
          small
          onPress={onBackspace}
          ariaLabel="Supprimer le dernier chiffre"
        />
      </div>
    </div>
  );
}

function PinKey({
  label,
  onPress,
  small = false,
  ariaLabel,
}: {
  label: string;
  onPress: () => void;
  small?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      aria-label={ariaLabel || label}
      className={[
        "h-20 rounded-2xl font-[family-name:var(--font-display)] tracking-wide",
        "bg-white/[0.06] border border-cream/15 text-cream",
        "active:bg-gold/30 active:border-gold",
        "transition-colors shadow-[0_2px_0_rgba(0,0,0,0.15)_inset]",
        small ? "text-sm font-semibold text-cream/80" : "text-3xl font-semibold",
      ].join(" ")}
    >
      {label}
    </motion.button>
  );
}

export default function StaffLoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-brown via-[#2a140c] to-[#1a0e08] bg-noise">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <p className="font-[family-name:var(--font-script)] text-gold-light text-2xl leading-none">
            L&apos;Arc en Ciel
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-cream font-bold tracking-tight">
            GOURMET POS
          </h1>
          <div className="mt-4 mx-auto w-24 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="mt-4 text-xs tracking-[0.3em] text-cream/50 uppercase">
            Poste serveur · Tablette
          </p>
        </div>

        <Suspense fallback={<div className="h-80" />}>
          <PinPad />
        </Suspense>

        <div className="mt-10 text-center text-[11px] text-cream/40 tracking-wide">
          <p>
            PINs démo&nbsp;: Kevin <span className="text-gold-light">1234</span>{" "}
            · Sophie <span className="text-gold-light">2024</span> · Chef{" "}
            <span className="text-gold-light">9999</span>
          </p>
          <p className="mt-3">
            <Link
              href="/"
              className="text-cream/60 hover:text-gold-light transition underline underline-offset-2"
            >
              ← Retour au site public
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
