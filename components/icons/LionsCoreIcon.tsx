/**
 * LionsCoreIcon — Simplified geometric lion head silhouette.
 * White filled shapes work clearly against the cyan gradient background at all sizes.
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
      {/* Left ear */}
      <path d="M5.5 8.5L3.5 4L8.5 6.5Z" fill="white" />
      {/* Right ear */}
      <path d="M14.5 8.5L16.5 4L11.5 6.5Z" fill="white" />
      {/* Mane ring — subtle outer glow */}
      <circle cx="10" cy="12" r="7" fill="white" opacity="0.18" />
      {/* Head */}
      <circle cx="10" cy="12" r="5.5" fill="white" />
    </svg>
  );
}
