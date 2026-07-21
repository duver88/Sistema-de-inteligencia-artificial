'use client';

import { useState } from 'react';

export interface DayPoint {
  day: string; // YYYY-MM-DD
  total: number;
  replied: number;
}

function formatDay(day: string): string {
  // Parse as UTC to match the server's day bucketing.
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Single-series activity chart: comments processed per day (last 14 days).
 * Brand cyan bars anchored to the baseline, rounded tops, 2px gaps, per-bar
 * hover tooltip that also surfaces the replied count. One series → no legend.
 */
export function ActivityChart({ data }: { data: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.total));
  const peak = Math.max(...data.map((d) => d.total));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          Comments per day
        </p>
        <p className="text-[11px] text-slate-400">Last 14 days</p>
      </div>
      <p className="text-xs text-slate-400 mb-5">Peak {peak.toLocaleString('en-US')} in a day</p>

      <div className="relative">
        {/* Plot */}
        <div className="flex items-end gap-1 h-40">
          {data.map((d, i) => {
            const h = (d.total / max) * 100;
            const active = hover === i;
            return (
              <div
                key={d.day}
                className="flex-1 h-full flex items-end"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <div
                  className="w-full rounded-t transition-opacity"
                  style={{
                    height: `${Math.max(d.total > 0 ? 4 : 1, h)}%`,
                    background: d.total > 0
                      ? 'linear-gradient(180deg, #00E5FF 0%, #00C4D4 100%)'
                      : '#e2e8f0',
                    opacity: hover === null || active ? 1 : 0.45,
                    minHeight: d.total > 0 ? 4 : 2,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X axis labels — every other day to avoid crowding */}
        <div className="flex gap-1 mt-2">
          {data.map((d, i) => (
            <div key={d.day} className="flex-1 text-center">
              <span className="text-[10px] text-slate-400">
                {i % 2 === 0 ? formatDay(d.day) : ' '}
              </span>
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hover !== null && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap z-10"
          >
            <p className="font-semibold">{formatDay(data[hover].day)}</p>
            <p className="text-slate-300">
              {data[hover].total.toLocaleString('en-US')} comments
              {' · '}
              <span className="text-cyan-300">{data[hover].replied.toLocaleString('en-US')} replied</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
