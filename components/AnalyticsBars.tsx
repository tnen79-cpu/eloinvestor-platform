'use client';

export function AnalyticsBars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.value) || 0));
  return (
    <div className="analytics-bars">
      <h3>{title}</h3>
      {rows.map((row) => <div key={row.label} className="analytics-bar-row"><span>{row.label}</span><b>{row.value}</b><i style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} /></div>)}
    </div>
  );
}
