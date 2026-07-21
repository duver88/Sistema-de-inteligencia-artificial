'use client';

import { useEffect, useState } from 'react';

// Deterministic background palette for the initials fallback. Indexed by a
// hash of the user's name so the same user always gets the same color.
const AVATAR_COLORS = [
  'bg-cyan-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// "Jane Doe" → "JD", "admin" → "A", '' → "U"
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  // Optional image URL. When it is missing — or fails to load (expired
  // Facebook CDN URL, 404 from the avatar proxy, ...) — the component
  // renders an initials circle instead of a broken <img>.
  image?: string | null;
  // Diameter in pixels (default 32 = the 8-unit Tailwind size).
  size?: number;
}

export function UserAvatar({ name, image, size = 32 }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // A new source deserves a fresh attempt (e.g. the user connects Facebook).
  useEffect(() => {
    setImgError(false);
  }, [image]);

  const dimension = { width: size, height: size };

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setImgError(true)}
        className="rounded-full object-cover shrink-0"
        style={dimension}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`rounded-full flex items-center justify-center font-bold text-white select-none shrink-0 ${
        AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length]
      }`}
      style={{ ...dimension, fontSize: Math.max(10, Math.round(size * 0.375)) }}
      title={name}
    >
      {initialsOf(name)}
    </div>
  );
}
