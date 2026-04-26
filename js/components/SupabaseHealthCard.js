// Supabase Health monitoring card for Integrations settings panel.
// Client-safe: uses only the existing supabase anon client. No service-role
// keys, no Management API tokens. Database size comes from a Postgres RPC
// (`get_db_stats`) the user pastes into Supabase SQL editor — see SQL_SETUP
// below.

const TABLES_TO_COUNT = [
  'logistics_routes',
  'allowed_users',
  'activity_log',
  'logistics_config'
];

const SQL_SETUP = `-- Run once in Supabase SQL Editor
-- Returns DB size and table sizes; safe (read-only, aggregate stats)
CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'database_pretty', pg_size_pretty(pg_database_size(current_database())),
    'tables', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT
          schemaname || '.' || tablename AS name,
          pg_total_relation_size(schemaname || '.' || tablename) AS bytes,
          pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS pretty
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
        LIMIT 10
      ) t
    ),
    'checked_at', now()
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_db_stats() TO anon, authenticated;
`;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
};

const formatRelative = (timestamp) => {
  if (!timestamp) return 'never';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
};

const StatusDot = ({ color }) =>
  /*#__PURE__*/ React.createElement('span', {
    style: {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}80`
    }
  });

export default function SupabaseHealthCard({ supabase, SUPABASE_URL, syncHealth, presenceConnected }) {
  const [planQuotaGB, setPlanQuotaGB] = React.useState(() => {
    const v = parseFloat(localStorage.getItem('supabase_plan_quota_gb'));
    return Number.isFinite(v) && v > 0 ? v : 8;
  });
  const [stats, setStats] = React.useState({
    latencyMs: null,
    dbBytes: null,
    dbPretty: null,
    tables: null,
    rowCounts: {},
    storageEstimate: null,
    connected: false,
    rpcAvailable: null, // null = unknown, true/false
    lastChecked: null,
    error: null
  });
  const [loading, setLoading] = React.useState(false);
  const [showSql, setShowSql] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const persistQuota = React.useCallback((value) => {
    try {
      localStorage.setItem('supabase_plan_quota_gb', String(value));
    } catch (err) {
      // ignore — non-fatal
    }
  }, []);

  const runHealthCheck = React.useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const result = {
      latencyMs: null,
      dbBytes: null,
      dbPretty: null,
      tables: null,
      rowCounts: {},
      storageEstimate: null,
      connected: false,
      rpcAvailable: null,
      lastChecked: new Date().toISOString(),
      error: null
    };

    // Latency ping (cheap HEAD count on logistics_config)
    try {
      const t0 = performance.now();
      const { error } = await supabase.from('logistics_config').select('*', { count: 'exact', head: true });
      const t1 = performance.now();
      if (error) {
        result.error = error.message;
      } else {
        result.latencyMs = Math.round(t1 - t0);
        result.connected = true;
      }
    } catch (err) {
      result.error = err.message;
    }

    // Row counts in parallel
    if (result.connected) {
      const counts = await Promise.all(
        TABLES_TO_COUNT.map(async (table) => {
          try {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            return [table, error ? null : count];
          } catch {
            return [table, null];
          }
        })
      );
      counts.forEach(([table, count]) => {
        result.rowCounts[table] = count;
      });
    }

    // RPC for DB size (optional — requires user to install the function)
    if (result.connected) {
      try {
        const { data, error } = await supabase.rpc('get_db_stats');
        if (error) {
          result.rpcAvailable = false;
        } else if (data && typeof data === 'object') {
          result.rpcAvailable = true;
          result.dbBytes = data.database_bytes;
          result.dbPretty = data.database_pretty;
          result.tables = data.tables || null;
        }
      } catch {
        result.rpcAvailable = false;
      }
    }

    // Browser storage estimate
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        result.storageEstimate = { usage: est.usage, quota: est.quota };
      }
    } catch {
      // ignore
    }

    setStats(result);
    setLoading(false);
  }, [supabase]);

  React.useEffect(() => {
    runHealthCheck();
    const interval = setInterval(runHealthCheck, 60000);
    return () => clearInterval(interval);
  }, [runHealthCheck]);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SETUP);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // ─── Derived display values ──────────────────────────────────────
  const projectRef = (() => {
    try {
      return new URL(SUPABASE_URL).hostname.split('.')[0];
    } catch {
      return null;
    }
  })();

  const latencyColor =
    stats.latencyMs == null
      ? '#9e9e9e'
      : stats.latencyMs < 200
      ? '#4caf50'
      : stats.latencyMs < 600
      ? '#ff9800'
      : '#f44336';

  const planQuotaBytes = planQuotaGB * 1024 * 1024 * 1024;
  const usedBytes = stats.dbBytes || 0;
  const remainingBytes = Math.max(0, planQuotaBytes - usedBytes);
  const usedPct = planQuotaBytes > 0 ? Math.min(100, (usedBytes / planQuotaBytes) * 100) : 0;
  const usageBarColor = usedPct < 60 ? '#4caf50' : usedPct < 85 ? '#ff9800' : '#f44336';

  const overallColor = stats.error
    ? '#f44336'
    : stats.connected && presenceConnected
    ? '#4caf50'
    : stats.connected
    ? '#ff9800'
    : '#9e9e9e';
  const overallLabel = stats.error
    ? 'Connection error'
    : stats.connected && presenceConnected
    ? 'Healthy'
    : stats.connected
    ? 'Degraded (realtime offline)'
    : 'Connecting…';

  // ─── UI ──────────────────────────────────────────────────────────
  return /*#__PURE__*/ React.createElement(
    'div',
    {
      style: {
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        marginTop: '16px'
      }
    },
    // Header
    /*#__PURE__*/ React.createElement(
      'div',
      { style: { padding: '16px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' } },
      /*#__PURE__*/ React.createElement(
        'div',
        null,
        /*#__PURE__*/ React.createElement(
          'h3',
          { style: { margin: 0, fontSize: '16px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '10px' } },
          /*#__PURE__*/ React.createElement(StatusDot, { color: overallColor }),
          '🔋 Supabase Health'
        ),
        /*#__PURE__*/ React.createElement(
          'p',
          { style: { margin: '6px 0 0', fontSize: '12px', color: '#666' } },
          overallLabel,
          projectRef && ` · project: ${projectRef}`,
          stats.lastChecked && ` · checked ${formatRelative(stats.lastChecked)}`
        )
      ),
      /*#__PURE__*/ React.createElement(
        'button',
        {
          onClick: runHealthCheck,
          disabled: loading,
          style: {
            background: '#1a7f4b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            opacity: loading ? 0.7 : 1
          }
        },
        loading ? '⏳ Checking…' : '🔄 Refresh'
      )
    ),

    // Body
    /*#__PURE__*/ React.createElement(
      'div',
      { style: { padding: '20px' } },

      // Top stat cards row
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' } },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' } },
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' } }, 'Latency'),
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '22px', fontWeight: 700, color: latencyColor } }, stats.latencyMs != null ? stats.latencyMs + ' ms' : '—'),
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', marginTop: '2px' } }, 'DB ping')
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' } },
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' } }, 'Realtime'),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: presenceConnected ? '#4caf50' : '#ff9800' } },
            presenceConnected ? '✅ Live' : '⚠ Off'
          ),
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', marginTop: '2px' } }, 'Presence channel')
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' } },
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' } }, 'Database Size'),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: stats.rpcAvailable ? '#1a7f4b' : '#9e9e9e' } },
            stats.rpcAvailable === true && stats.dbPretty ? stats.dbPretty : stats.rpcAvailable === false ? 'Setup needed' : '—'
          ),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { fontSize: '11px', color: '#888', marginTop: '2px' } },
            stats.rpcAvailable === false ? 'Run SQL below' : 'Used on disk'
          )
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { padding: '14px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' } },
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' } }, 'Remaining'),
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { fontSize: '22px', fontWeight: 700, color: stats.rpcAvailable ? usageBarColor : '#9e9e9e' } },
            stats.rpcAvailable === true ? formatBytes(remainingBytes) : '—'
          ),
          /*#__PURE__*/ React.createElement('div', { style: { fontSize: '11px', color: '#888', marginTop: '2px' } }, `of ${planQuotaGB} GB plan`)
        )
      ),

      // Usage progress bar
      stats.rpcAvailable === true && /*#__PURE__*/ React.createElement(
        'div',
        { style: { marginBottom: '20px' } },
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' } },
          /*#__PURE__*/ React.createElement(
            'span',
            { style: { fontSize: '13px', fontWeight: 600, color: '#333' } },
            `${stats.dbPretty} used`
          ),
          /*#__PURE__*/ React.createElement(
            'span',
            { style: { fontSize: '12px', color: '#666' } },
            `${usedPct.toFixed(1)}% of ${planQuotaGB} GB`
          )
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { background: '#e0e0e0', borderRadius: '6px', height: '12px', overflow: 'hidden' } },
          /*#__PURE__*/ React.createElement('div', {
            style: {
              height: '100%',
              width: usedPct + '%',
              background: usageBarColor,
              transition: 'width 0.4s ease, background 0.4s ease'
            }
          })
        ),
        usedPct >= 85 && /*#__PURE__*/ React.createElement(
          'div',
          { style: { marginTop: '8px', padding: '8px 12px', background: '#fff3e0', border: '1px solid #ffb74d', borderRadius: '6px', fontSize: '12px', color: '#e65100' } },
          '⚠️ You are using ' + usedPct.toFixed(1) + '% of your configured plan quota. Consider upgrading or cleaning up old data.'
        )
      ),

      // Plan quota config
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { marginBottom: '20px', padding: '12px 14px', background: '#f5f5f5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' } },
        /*#__PURE__*/ React.createElement('label', { style: { fontSize: '13px', color: '#333', fontWeight: 500 } }, 'Your plan disk quota:'),
        /*#__PURE__*/ React.createElement('input', {
          type: 'number',
          min: '0.5',
          step: '0.5',
          value: planQuotaGB,
          onChange: (e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v) && v > 0) {
              setPlanQuotaGB(v);
              persistQuota(v);
            }
          },
          style: { width: '90px', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }
        }),
        /*#__PURE__*/ React.createElement('span', { style: { fontSize: '13px', color: '#666' } }, 'GB'),
        /*#__PURE__*/ React.createElement(
          'span',
          { style: { fontSize: '11px', color: '#888' } },
          'Pro: 8 GB · Team: 8 GB · Free: 0.5 GB. Adjust to your plan.'
        )
      ),

      // Row counts
      /*#__PURE__*/ React.createElement(
        'div',
        { style: { marginBottom: '20px' } },
        /*#__PURE__*/ React.createElement(
          'h4',
          { style: { margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#333' } },
          '📄 Table Row Counts'
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' } },
          TABLES_TO_COUNT.map((table) =>
            /*#__PURE__*/ React.createElement(
              'div',
              {
                key: table,
                style: {
                  padding: '10px 12px',
                  background: '#fafafa',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }
              },
              /*#__PURE__*/ React.createElement('span', { style: { fontSize: '12px', color: '#666', fontFamily: 'monospace' } }, table),
              /*#__PURE__*/ React.createElement(
                'span',
                { style: { fontSize: '14px', fontWeight: 600, color: stats.rowCounts[table] != null ? '#333' : '#bbb' } },
                stats.rowCounts[table] != null ? stats.rowCounts[table].toLocaleString() : '—'
              )
            )
          )
        )
      ),

      // Local storage usage
      stats.storageEstimate && /*#__PURE__*/ React.createElement(
        'div',
        { style: { marginBottom: '20px', padding: '12px 14px', background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', fontSize: '12px', color: '#666' } },
        /*#__PURE__*/ React.createElement('strong', { style: { color: '#333' } }, '💻 Browser storage: '),
        formatBytes(stats.storageEstimate.usage),
        ' used of ',
        formatBytes(stats.storageEstimate.quota),
        ' available (used for offline backups & service worker cache)'
      ),

      // Setup instructions (if RPC not installed)
      stats.rpcAvailable === false && /*#__PURE__*/ React.createElement(
        'div',
        { style: { padding: '14px 16px', background: '#fff8e1', border: '1px solid #ffc107', borderRadius: '8px' } },
        /*#__PURE__*/ React.createElement('div', { style: { fontWeight: 600, color: '#e65100', marginBottom: '6px' } }, '⚠ Database size unavailable'),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { fontSize: '13px', color: '#555', marginBottom: '10px' } },
          'To see disk usage, run this one-time SQL setup in your Supabase project. It creates a read-only function that exposes only aggregate database size — no row data.'
        ),
        /*#__PURE__*/ React.createElement(
          'div',
          { style: { display: 'flex', gap: '8px', marginBottom: showSql ? '10px' : 0, flexWrap: 'wrap' } },
          /*#__PURE__*/ React.createElement(
            'button',
            {
              onClick: () => setShowSql((v) => !v),
              style: { padding: '8px 14px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }
            },
            showSql ? '▲ Hide SQL' : '▼ Show setup SQL'
          ),
          /*#__PURE__*/ React.createElement(
            'a',
            {
              href: projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'https://supabase.com/dashboard',
              target: '_blank',
              rel: 'noopener noreferrer',
              style: { padding: '8px 14px', background: 'white', color: '#1a7f4b', border: '1px solid #1a7f4b', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: 500 }
            },
            '🔗 Open Supabase SQL Editor'
          )
        ),
        showSql && /*#__PURE__*/ React.createElement(
          'div',
          null,
          /*#__PURE__*/ React.createElement(
            'div',
            { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' } },
            /*#__PURE__*/ React.createElement(
              'button',
              {
                onClick: copySql,
                style: { padding: '4px 10px', background: copied ? '#4caf50' : '#1a7f4b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }
              },
              copied ? '✓ Copied!' : '📋 Copy SQL'
            )
          ),
          /*#__PURE__*/ React.createElement(
            'pre',
            {
              style: {
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: '14px',
                borderRadius: '6px',
                fontSize: '11px',
                overflow: 'auto',
                maxHeight: '320px',
                margin: 0,
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                lineHeight: '1.5'
              }
            },
            SQL_SETUP
          )
        )
      ),

      // Connection error display
      stats.error && /*#__PURE__*/ React.createElement(
        'div',
        { style: { padding: '12px 14px', background: '#ffebee', border: '1px solid #ef5350', borderRadius: '8px', fontSize: '12px', color: '#c62828' } },
        /*#__PURE__*/ React.createElement('strong', null, '❌ Error: '),
        stats.error
      )
    )
  );
}
