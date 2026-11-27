/** Столбчатый график регистраций за 30 дней: SVG, без библиотек. Данные дублируются в таблице для скринридеров. */
export function RegistrationsChart({ data }: { data: { date: string; count: number }[] }) {
  const W = 600;
  const H = 160;
  const pad = { top: 10, bottom: 22, left: 28, right: 4 };
  const max = Math.max(1, ...data.map((d) => d.count));
  const bw = (W - pad.left - pad.right) / data.length;
  const ticks = [0, Math.ceil(max / 2), max];
  const label = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });

  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Регистрации по дням за 30 дней" width="100%">
        {ticks.map((t) => {
          const y = H - pad.bottom - (t / max) * (H - pad.top - pad.bottom);
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="currentColor" opacity={0.12} />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.count / max) * (H - pad.top - pad.bottom);
          return (
            <rect
              key={d.date}
              x={pad.left + i * bw + 1}
              y={H - pad.bottom - h}
              width={Math.max(bw - 2, 1)}
              height={h}
              rx={2}
              fill="#7aa2ff"
            >
              <title>{`${label(d.date)}: ${d.count}`}</title>
            </rect>
          );
        })}
        {[0, 14, 29].map((i) => (
          <text key={i} x={pad.left + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.6}>
            {label(data[i]!.date)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
