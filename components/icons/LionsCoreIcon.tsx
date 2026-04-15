/**
 * LionsCoreIcon — SVG icon extracted from the LionsCore brand logo.
 * Represents the stylized double-arc / lion swirl mark.
 */
export function LionsCoreIcon({ className, size = 20 }: { className?: string; size?: number }) {
  const id = 'lc';
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
        <linearGradient id={`${id}-g`} x1="2" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00E5FF" />
          <stop offset="1" stopColor="#00B4C8" />
        </linearGradient>
      </defs>
      {/* Outer arc */}
      <path
        d="M15.5 4C13.5 2.3 10.8 2 8.5 3.3C5.2 5.2 3.5 8.8 4 12.2C4.5 15.6 7.2 18.2 10.8 18C12.8 17.8 14.8 16.5 16 14.5"
        stroke={`url(#${id}-g)`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Inner arc */}
      <path
        d="M13 7.5C11.8 6.4 10 6.4 9 7.5C8 8.5 7.8 10.2 8.5 11.6C9.2 13 10.8 13.5 12.2 12.8C13 12.4 13.5 11.4 13.4 10.5"
        stroke={`url(#${id}-g)`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
