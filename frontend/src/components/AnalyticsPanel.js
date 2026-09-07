"use client";

/**
 * Generic renderer for the analytics envelope returned by
 * GET /api/v1/dashboards/overview.
 *
 * The backend sends the same shape for every role - kpis + series + tables +
 * insights - so this component renders all four roles without a single
 * role-specific branch. Adding a role on the server needs no change here.
 *
 * Charts are plain divs. No chart library is pulled in, which keeps the bundle
 * small and matches the project's existing inline-style approach.
 */

const TONE_COLOR = {
  good: '#10b981',
  warn: 'var(--accent-red)',
  neutral: 'var(--text-primary)',
};

const CARD = {
  background: '#fff',
  border: '1px solid var(--border-light)',
  padding: '1.5rem',
};

function KpiCard({ kpi }) {
  return (
    <div style={CARD}>
      <div className="font-mono text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
        {kpi.label.toUpperCase()}
      </div>
      <div
        className="font-display"
        style={{
          fontSize: kpi.display.length > 12 ? '1.4rem' : '2.1rem',
          fontWeight: 900,
          lineHeight: 1.1,
          color: TONE_COLOR[kpi.tone] || TONE_COLOR.neutral,
        }}
      >
        {kpi.display}
      </div>
      {kpi.hint ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.45rem', lineHeight: 1.4 }}>{kpi.hint}</p>
      ) : null}
    </div>
  );
}

function BarChart({ series }) {
  const max = Math.max(...series.points.map((p) => p.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {series.points.map((point, index) => (
        <div key={`${series.key}-${index}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>
            <span style={{ color: 'var(--text-primary)' }}>{point.label}</span>
            <span className="font-mono" style={{ color: 'var(--accent-red)' }}>
              {point.value}
              {series.unit ? ` ${series.unit}` : ''}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#f3f3f6', overflow: 'hidden' }}>
            <div
              style={{
                width: `${(point.value / max) * 100}%`,
                height: '100%',
                background: 'var(--accent-red)',
                transition: 'width 0.6s ease-in-out',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ series }) {
  const values = series.points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px', borderBottom: '1px solid var(--border-light)', paddingBottom: '2px' }}>
        {series.points.map((point, index) => (
          <div
            key={`${series.key}-${index}`}
            title={`${point.label}: ${point.value}${series.unit ? ` ${series.unit}` : ''}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}
          >
            <div
              style={{
                height: `${Math.max(6, ((point.value - min) / span) * 100)}%`,
                background: index === series.points.length - 1 ? 'var(--accent-red)' : 'var(--text-primary)',
                transition: 'height 0.6s ease-in-out',
              }}
            />
          </div>
        ))}
      </div>
      <div className="font-mono" style={{ display: 'flex', gap: '6px', marginTop: '0.4rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
        {series.points.map((point, index) => (
          <div key={`${series.key}-label-${index}`} style={{ flex: 1, textAlign: 'center' }}>{point.label}</div>
        ))}
      </div>
    </div>
  );
}

function SeriesCard({ series }) {
  const hasData = series.points.some((point) => point.value > 0);
  return (
    <div style={CARD}>
      <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        {series.label}
      </h3>
      {series.points.length === 0 || !hasData ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No data recorded for this metric yet.</p>
      ) : series.kind === 'line' ? (
        <LineChart series={series} />
      ) : (
        <BarChart series={series} />
      )}
    </div>
  );
}

function DataTable({ table }) {
  return (
    <div style={{ ...CARD, padding: '1.75rem 1.5rem' }}>
      <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
        {table.title}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {table.columns.map((column) => (
                <th key={column} scope="col" style={{ padding: '0.7rem 0.9rem', whiteSpace: 'nowrap' }}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`${table.key}-${rowIndex}`} style={{ borderBottom: '1px solid #f3f3f6' }}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${table.key}-${rowIndex}-${cellIndex}`}
                    style={{
                      padding: '0.8rem 0.9rem',
                      fontWeight: cellIndex === 0 ? 600 : 400,
                      color: cellIndex === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {table.rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length || 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {table.empty_message}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ data, error, lastUpdated, onRefresh, refreshing }) {
  if (error) {
    return (
      <div role="alert" style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontSize: '0.9rem' }}>
        <strong>Analytics unavailable.</strong> {error}
        <div style={{ marginTop: '1rem' }}>
          <button type="button" onClick={onRefresh} className="btn btn-red" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}>
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse" style={{ padding: '3rem', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-muted)' }}>
        Computing live analytics...
      </div>
    );
  }

  const scopeLabel = { self: 'Personal analytics', cohort: 'Cohort analytics', platform: 'Platform analytics' }[data.scope] || 'Analytics';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Live status strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
        }}
      >
        <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className={refreshing ? 'animate-pulse' : undefined} style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span>LIVE · {scopeLabel.toUpperCase()}</span>
          <span style={{ color: 'var(--text-muted)' }}>
            ENGINE: {String(data.active_engine).toUpperCase()} · QUERY {data.query_latency_ms}ms · AUTO-REFRESH {data.refresh_seconds}s
          </span>
          {lastUpdated ? <span style={{ color: 'var(--text-muted)' }}>UPDATED {lastUpdated}</span> : null}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn btn-dark"
          style={{ padding: '0.45rem 1.1rem', fontSize: '0.7rem' }}
        >
          {refreshing ? 'REFRESHING...' : 'REFRESH NOW'}
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </div>

      {/* Charts + insights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {data.series.map((series) => (
            <SeriesCard key={series.key} series={series} />
          ))}
        </div>

        <div style={{ background: 'var(--dark-bg)', color: '#fff', padding: '2rem' }}>
          <div className="font-mono text-red" style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>ENGINE INSIGHTS</div>
          <h3 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            What The Data Says
          </h3>
          {data.insights.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#bbb' }}>No insights yet. Run a session to generate them.</p>
          ) : (
            <ul style={{ paddingLeft: '1.1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5 }}>
              {data.insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tables */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {data.tables.map((table) => (
          <DataTable key={table.key} table={table} />
        ))}
      </div>
    </div>
  );
}
