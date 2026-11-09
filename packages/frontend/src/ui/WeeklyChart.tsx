import type { ReactElement } from 'react';

export type ChartPoint = {
  /** Label of the x axis tick or `null` for none, e.g. the month at its first week. */
  tick: string | null;
  /** Accessible label of the point, e.g. "9.–15. Nov.". */
  label: string;
  /** Value in hours. */
  value: number;
  /** Highlighted column, e.g. the current week. */
  current?: boolean;
};

type WeeklyChartProps = {
  /** Points from left to right. */
  points: ChartPoint[];
  /** `bars` per point or a `line` (cumulative progress). */
  mode: 'bars' | 'line';
  /** Text above the y axis, e.g. "Stunden". */
  unit: string;
  /** Text above the highlighted column, e.g. "Diese Woche". */
  currentLabel: string;
  /** Formats the value for the hidden data table, e.g. `h:mm`. */
  formatValue: (value: number) => string;
  /** Caption of the hidden data table (screen readers). */
  caption: string;
};

const W = 1000;
const H = 300;
const TOP = 30;
const BOTTOM = 270;

/**
 * Simple SVG chart of weekly values with horizontal grid lines; screen readers get the same
 * values as a table.
 * @example <WeeklyChart points={points} mode="bars" unit="Stunden" currentLabel="Diese Woche" formatValue={fmt} caption="Stunden pro Woche" />
 */
export function WeeklyChart({
  points,
  mode,
  unit,
  currentLabel,
  formatValue,
  caption,
}: WeeklyChartProps): ReactElement {
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const step = W / Math.max(points.length, 1);
  const x = (i: number): number => i * step + step / 2;
  const y = (value: number): number => BOTTOM - (value / max) * (BOTTOM - TOP);
  const grid = [0.2, 0.4, 0.6, 0.8, 1].map((f) => f * max);
  const currentIndex = points.findIndex((p) => p.current);

  return (
    <figure className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H + 30}`}
        className="h-auto w-full overflow-visible"
        aria-hidden="true"
      >
        <text x={0} y={12} className="fill-temp-ink-muted text-[0.75rem]">
          {unit}
        </text>
        {currentIndex >= 0 && (
          <g>
            <rect
              x={currentIndex * step}
              y={TOP}
              width={step}
              height={BOTTOM - TOP}
              className="fill-temp-chart-soft"
            />
            <line
              x1={currentIndex * step}
              x2={(currentIndex + 1) * step}
              y1={TOP}
              y2={TOP}
              className="stroke-temp-chart"
              strokeWidth={3}
            />
            <text
              x={x(currentIndex)}
              y={TOP - 8}
              textAnchor="middle"
              className="fill-temp-ink-muted text-[0.75rem]"
            >
              {currentLabel}
            </text>
          </g>
        )}
        {grid.map((value) => (
          <g key={value}>
            <line x1={0} x2={W} y1={y(value)} y2={y(value)} className="stroke-temp-divider" />
            <text x={4} y={y(value) + 16} className="fill-temp-ink-muted text-[0.75rem]">
              {Math.round(value * 10) / 10}
            </text>
          </g>
        ))}
        <line x1={0} x2={W} y1={BOTTOM} y2={BOTTOM} className="stroke-temp-ink-muted" />
        {mode === 'bars' &&
          points.map((p, i) => (
            <rect
              key={p.label}
              x={x(i) - step * 0.3}
              y={y(p.value)}
              width={step * 0.6}
              height={BOTTOM - y(p.value)}
              rx={2}
              className="fill-temp-chart"
            />
          ))}
        {mode === 'line' && (
          <polyline
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
            fill="none"
            strokeWidth={3}
            className="stroke-temp-chart"
          />
        )}
        {points.map(
          (p, i) =>
            p.tick && (
              <g key={`tick-${p.label}`}>
                <line
                  x1={i * step}
                  x2={i * step}
                  y1={BOTTOM}
                  y2={BOTTOM + 12}
                  className="stroke-temp-ink-muted"
                />
                <text
                  x={i * step + 6}
                  y={BOTTOM + 26}
                  className="fill-temp-ink-muted text-[0.75rem]"
                >
                  {p.tick}
                </text>
              </g>
            ),
        )}
      </svg>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{formatValue(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Upper end of the y axis: 1, 2 or 5 times a power of ten, at least 1
function niceMax(value: number): number {
  if (value <= 1) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const factor = [1, 2, 5, 10].find((f) => f * power >= value) ?? 10;
  return factor * power;
}
