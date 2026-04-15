/**
 * LionsCoreIcon — Matches the official LionsCore brand mark.
 * A bold C-shaped arc with dark-to-cyan gradient and a circular ball at the tip,
 * exactly as defined in the LionsCore Brand Identity Manual.
 *
 * Official brand colors:
 *   Dark navy : #021130
 *   Primary   : #12fdee
 */
export function LionsCoreIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Diagonal gradient: dark navy bottom-left → bright cyan top-right */}
        <linearGradient
          id="lc-brand"
          x1="4" y1="17"
          x2="17" y2="3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#071828" />
          <stop offset="50%"  stopColor="#0bbfb8" />
          <stop offset="100%" stopColor="#12fdee" />
        </linearGradient>
      </defs>

      {/* Main arc — ~300° C-shape, opens to the right.
          Center ≈ (10, 10), r = 7.
          Start: lower-right (16, 13.5)  →  clockwise  →  End: upper-right (16, 6.5) */}
      <path
        d="M 16 13.5 A 7 7 0 1 1 16 6.5"
        stroke="url(#lc-brand)"
        strokeWidth="3.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bright cyan ball at the top-right tip */}
      <circle cx="16" cy="6.5" r="2.1" fill="#12fdee" />
    </svg>
  );
}
