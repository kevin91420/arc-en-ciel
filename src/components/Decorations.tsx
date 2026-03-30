/** Decorative SVG elements that give the site artisanal warmth */

export function OliveBranch({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main stem */}
      <path
        d="M10 20 Q30 18 60 20 Q90 22 110 20"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* Leaves left side */}
      <ellipse cx="25" cy="15" rx="8" ry="4" transform="rotate(-30 25 15)" fill="currentColor" opacity="0.15" />
      <ellipse cx="40" cy="24" rx="7" ry="3.5" transform="rotate(25 40 24)" fill="currentColor" opacity="0.12" />
      <ellipse cx="55" cy="16" rx="7" ry="3.5" transform="rotate(-20 55 16)" fill="currentColor" opacity="0.15" />
      {/* Leaves right side */}
      <ellipse cx="70" cy="23" rx="8" ry="4" transform="rotate(30 70 23)" fill="currentColor" opacity="0.12" />
      <ellipse cx="85" cy="16" rx="7" ry="3.5" transform="rotate(-25 85 16)" fill="currentColor" opacity="0.15" />
      <ellipse cx="95" cy="23" rx="6" ry="3" transform="rotate(20 95 23)" fill="currentColor" opacity="0.12" />
      {/* Small olives */}
      <circle cx="30" cy="20" r="2" fill="currentColor" opacity="0.2" />
      <circle cx="75" cy="20" r="2" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function WaveDivider({
  className = "",
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      className={`w-full block ${flip ? "rotate-180" : ""} ${className}`}
      viewBox="0 0 1440 40"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M0 20 Q360 0 720 20 Q1080 40 1440 20 V40 H0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HandDrawnCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M50 5 C75 3, 97 20, 95 50 C93 78, 72 97, 48 95 C22 93, 3 75, 5 48 C7 22, 28 7, 50 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}

/** Subtle rainbow arc — brand signature for "L'Arc en Ciel" */
export function RainbowArc({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M20 55 Q100 -15 180 55" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M30 55 Q100 -5 170 55" stroke="#B8922F" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M40 55 Q100 5 160 55" stroke="#E8D5C0" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M50 55 Q100 15 150 55" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M60 55 Q100 25 140 55" stroke="#2C1810" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.25" />
    </svg>
  );
}

export function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M24 4c0 0-10 12-10 22a10 10 0 0020 0C34 16 24 4 24 4zM24 38a6 6 0 01-6-6c0-4 3-9 6-13 3 4 6 9 6 13a6 6 0 01-6 6z" opacity="0.85" />
    </svg>
  );
}

export function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M24 6C12 6 4 18 4 28c0 2 0 4 1 6l2-1c6-3 12-7 17-14 0 0-3 12-14 20l2 1c1 0 3 1 5 1 12 0 24-10 24-24V6H24z" opacity="0.85" />
    </svg>
  );
}

export function DoughIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">
      <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm0 36c-8.8 0-16-7.2-16-16S15.2 8 24 8s16 7.2 16 16-7.2 16-16 16z" opacity="0.3" />
      <path d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14-6.3-14-14-14zm0 24c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10z" opacity="0.5" />
      <circle cx="24" cy="24" r="6" opacity="0.7" />
      <circle cx="18" cy="20" r="1.5" opacity="0.4" />
      <circle cx="30" cy="22" r="1" opacity="0.4" />
      <circle cx="22" cy="30" r="1.2" opacity="0.4" />
    </svg>
  );
}
