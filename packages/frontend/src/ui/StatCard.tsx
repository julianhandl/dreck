import type { ReactElement } from 'react';

type StatCardProps = {
  /** Name of the figure, e.g. "Gesamtstunden". */
  title: string;
  /** The figure, large. */
  value: string;
  /** Breakdown below: label and value per row. */
  rows: [label: string, value: string][];
  /** Colours the figure, e.g. the amount to invoice. */
  tone?: 'default' | 'success';
};

/**
 * Bordered card with a key figure and an optional breakdown.
 * @example <StatCard title="Gesamtstunden" value="12:30" rows={[['Gerundet', '12:45']]} />
 */
export function StatCard({ title, value, rows, tone = 'default' }: StatCardProps): ReactElement {
  return (
    <section className="flex flex-col gap-2 rounded-temp-card bg-temp-surface p-6 shadow-temp-card">
      <h2>{title}</h2>
      <p
        className={`font-medium text-temp-kpi leading-tight tracking-tight ${tone === 'success' ? 'text-temp-success' : 'text-temp-primary'}`}
      >
        {value}
      </p>
      {rows.length > 0 && (
        <dl className="mt-2 flex flex-col gap-1">
          {rows.map(([label, rowValue]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt>{label}</dt>
              <dd className="font-semibold">{rowValue}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
