"use client";

import { useState, useCallback } from "react";

/* ─────────────────── Types ─────────────────── */

interface SeoCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  value: string;
  points: number;
  maxPoints: number;
}

interface SeoCategory {
  name: string;
  icon: string;
  checks: SeoCheck[];
  score: number;
  maxScore: number;
}

interface SeoAuditResult {
  url: string;
  fetchedAt: string;
  responseTime: number;
  statusCode: number;
  categories: SeoCategory[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

/* ─────────────── Circular Score ─────────────── */

function CircularScore({
  percentage,
  size = 160,
  strokeWidth = 10,
  label,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 90
      ? "#22c55e"
      : percentage >= 70
        ? "#3b82f6"
        : percentage >= 40
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s ease-out, stroke 0.5s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{percentage}%</span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-400 text-center max-w-[180px]">
          {label}
        </span>
      )}
    </div>
  );
}

/* ─────────────── Mini Score Bar ─────────────── */

function MiniScore({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color =
    pct >= 90
      ? "bg-green-500"
      : pct >= 70
        ? "bg-blue-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{
            width: `${pct}%`,
            transition: "width 1s ease-out",
          }}
        />
      </div>
      <span className="text-sm font-bold text-white w-12 text-right">
        {pct}%
      </span>
    </div>
  );
}

/* ─────────────── Status Icon ─────────────── */

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass")
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex-shrink-0">
        ✓
      </span>
    );
  if (status === "warn")
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex-shrink-0">
        !
      </span>
    );
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-xs flex-shrink-0">
      ✕
    </span>
  );
}

/* ─────────────── Category Icon ─────────────── */

function CategoryIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    tag: "🏷️",
    heading: "📝",
    share: "📱",
    code: "📊",
    image: "🖼️",
    settings: "⚙️",
  };
  return <span className="text-xl">{icons[icon] || "📋"}</span>;
}

/* ─────────────── Category Card ─────────────── */

function CategoryCard({
  category,
  compareCategory,
}: {
  category: SeoCategory;
  compareCategory?: SeoCategory;
}) {
  const [open, setOpen] = useState(false);
  const pct =
    category.maxScore > 0
      ? Math.round((category.score / category.maxScore) * 100)
      : 0;
  const comparePct =
    compareCategory && compareCategory.maxScore > 0
      ? Math.round((compareCategory.score / compareCategory.maxScore) * 100)
      : null;

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
      >
        <CategoryIcon icon={category.icon} />
        <span className="font-semibold text-white flex-1 text-left">
          {category.name}
        </span>
        {comparePct !== null && (
          <div className="flex items-center gap-2">
            {pct > comparePct ? (
              <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                +{pct - comparePct}%
              </span>
            ) : pct < comparePct ? (
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                {pct - comparePct}%
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded">
                =
              </span>
            )}
          </div>
        )}
        <div className="w-32">
          <MiniScore score={category.score} maxScore={category.maxScore} />
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-2">
          {category.checks.map((check, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-2 border-t border-slate-700/30"
            >
              <StatusIcon status={check.status} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200">
                  {check.name}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {check.value}
                </div>
              </div>
              {check.maxPoints > 0 && (
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded flex-shrink-0 ${
                    check.points === check.maxPoints
                      ? "text-green-400 bg-green-500/10"
                      : check.points > 0
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-red-400 bg-red-500/10"
                  }`}
                >
                  {check.points}/{check.maxPoints}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────── Winner Badge ─────────────── */

function WinnerBadge({ isWinner }: { isWinner: boolean | null }) {
  if (isWinner === null) return null;
  if (isWinner)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
        ★ MEILLEUR
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
      EN RETARD
    </span>
  );
}

/* ─────────────── Site Column ─────────────── */

function SiteAuditColumn({
  result,
  label,
  isWinner,
  compareResult,
}: {
  result: SeoAuditResult;
  label: string;
  isWinner: boolean | null;
  compareResult?: SeoAuditResult;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            {label}
          </span>
          <WinnerBadge isWinner={isWinner} />
        </div>
        <p className="text-sm text-slate-500 truncate max-w-full px-4">
          {result.url}
        </p>
        {result.statusCode === 0 && (
          <p className="text-sm text-red-400 mt-2">
            Site inaccessible — impossible d&apos;analyser
          </p>
        )}
      </div>

      {/* Score Circle */}
      <div className="flex justify-center mb-8">
        <CircularScore
          percentage={result.percentage}
          size={160}
          label={`${result.totalScore}/${result.maxScore} points`}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 px-2">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">
            {result.responseTime}ms
          </div>
          <div className="text-xs text-slate-400">Temps de reponse</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">
            {result.statusCode || "ERR"}
          </div>
          <div className="text-xs text-slate-400">Code HTTP</div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3 px-2">
        {result.categories.map((cat, i) => (
          <CategoryCard
            key={cat.name}
            category={cat}
            compareCategory={compareResult?.categories[i]}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Loading Skeleton ─────────────── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 min-w-0 animate-pulse">
      <div className="text-center mb-6">
        <div className="h-4 bg-slate-700 rounded w-24 mx-auto mb-2" />
        <div className="h-3 bg-slate-700/50 rounded w-48 mx-auto" />
      </div>
      <div className="flex justify-center mb-8">
        <div className="w-40 h-40 rounded-full border-8 border-slate-700" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6 px-2">
        <div className="h-16 bg-slate-800/50 rounded-lg" />
        <div className="h-16 bg-slate-800/50 rounded-lg" />
      </div>
      <div className="space-y-3 px-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 bg-slate-800/30 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Main Page ─────────────── */

export default function SeoAuditPage() {
  const [url1, setUrl1] = useState("");
  const [url2, setUrl2] = useState("");
  const [results, setResults] = useState<SeoAuditResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runAudit = useCallback(async () => {
    if (!url1.trim() || !url2.trim()) {
      setError("Veuillez entrer les deux URLs");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [url1.trim(), url2.trim()],
        }),
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      setResults(data.results);
    } catch {
      setError("Erreur lors de l'analyse. Verifiez les URLs et reessayez.");
    } finally {
      setLoading(false);
    }
  }, [url1, url2]);

  const winner =
    results && results.length === 2
      ? results[0].percentage > results[1].percentage
        ? 0
        : results[1].percentage > results[0].percentage
          ? 1
          : null
      : null;

  const diff =
    results && results.length === 2
      ? Math.abs(results[0].percentage - results[1].percentage)
      : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
              SEO
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Audit SEO</h1>
              <p className="text-xs text-slate-400">
                Comparateur de performance SEO
              </p>
            </div>
          </div>
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Retour au site
          </a>
        </div>
      </header>

      {/* Input Section */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">
            Comparez le SEO de deux sites
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Entrez les URLs des deux sites a comparer. L&apos;analyse est 100%
            transparente : chaque point est verifie en temps reel, zero
            estimation.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Site actuel (ancien)
              </label>
              <input
                type="text"
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                placeholder="https://www.example.com"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nouveau site
              </label>
              <input
                type="text"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                placeholder="https://nouveau-site.vercel.app"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
              />
            </div>
          </div>

          <button
            onClick={runAudit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analyse en cours...
              </span>
            ) : (
              "Lancer l'audit SEO"
            )}
          </button>

          {error && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}
        </div>
      </section>

      {/* Results */}
      {(loading || results) && (
        <section className="max-w-7xl mx-auto px-6 pb-20">
          {/* Winner banner */}
          {results && results.length === 2 && winner !== null && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 mb-10 text-center">
              <p className="text-lg font-bold text-green-400 mb-1">
                {winner === 1 ? "Le nouveau site" : "Le site actuel"} est en
                tete !
              </p>
              <p className="text-slate-400">
                Avec{" "}
                <span className="text-white font-bold">+{diff} points</span>{" "}
                d&apos;avance sur le score SEO global
              </p>
            </div>
          )}

          {results && results.length === 2 && winner === null && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-10 text-center">
              <p className="text-lg font-bold text-slate-300">
                Egalite parfaite !
              </p>
              <p className="text-slate-400">
                Les deux sites ont le meme score SEO
              </p>
            </div>
          )}

          {/* Comparison grid */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {loading ? (
              <>
                <LoadingSkeleton />
                <LoadingSkeleton />
              </>
            ) : results && results.length === 2 ? (
              <>
                <SiteAuditColumn
                  result={results[0]}
                  label="Site actuel"
                  isWinner={winner === 0 ? true : winner === 1 ? false : null}
                  compareResult={results[1]}
                />
                <SiteAuditColumn
                  result={results[1]}
                  label="Nouveau site"
                  isWinner={winner === 1 ? true : winner === 0 ? false : null}
                  compareResult={results[0]}
                />
              </>
            ) : null}
          </div>

          {/* Methodology */}
          {results && (
            <div className="mt-16 bg-slate-800/30 border border-slate-700/30 rounded-2xl p-8">
              <h3 className="text-lg font-bold text-white mb-4">
                Methodologie de notation
              </h3>
              <div className="grid md:grid-cols-3 gap-6 text-sm text-slate-400">
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Meta Tags (25 pts)
                  </h4>
                  <p>
                    Title, description, viewport, charset, lang, URL canonique.
                    Chaque element est verifie pour sa presence et sa conformite.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Structure (15 pts)
                  </h4>
                  <p>
                    Hierarchie H1/H2/H3. Un seul H1 par page, presence de H2
                    pour la structure, profondeur H3.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Reseaux Sociaux (21 pts)
                  </h4>
                  <p>
                    Open Graph (title, desc, image, type, url, locale) et
                    Twitter Card pour le partage optimal.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Donnees Structurees (20 pts)
                  </h4>
                  <p>
                    JSON-LD, types Schema.org, schemas riches (Restaurant,
                    Menu...) pour les rich snippets Google.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Images (13 pts)
                  </h4>
                  <p>
                    Attributs alt pour l&apos;accessibilite et le SEO, lazy
                    loading pour la performance.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">
                    Technique (20 pts)
                  </h4>
                  <p>
                    HTTPS, temps de reponse, robots.txt, sitemap.xml, favicon,
                    taille de page.
                  </p>
                </div>
              </div>
              <p className="mt-6 text-xs text-slate-500 border-t border-slate-700/30 pt-4">
                Tous les scores sont bases sur des verifications reelles en
                temps reel. Aucune estimation, aucune donnee inventee.
                L&apos;analyse est reproductible a tout moment.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Audit SEO — Outil interne de comparaison
      </footer>
    </div>
  );
}
