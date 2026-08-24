// Shared presentation primitives for the admin panel. Kept separate from
// AdminPanel.jsx so each tab reads as a description of its data rather than a
// re-implementation of tables, dialogs and charts.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

/* ══════════════════════════════════════════════════════
   Formatting
   ══════════════════════════════════════════════════════ */

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

export function rup(n) {
  return `₹${(Number(n) || 0).toLocaleString('en-IN')}`
}

export function num(n) {
  return (Number(n) || 0).toLocaleString('en-IN')
}

/* ══════════════════════════════════════════════════════
   Toasts — replaces the alert() calls the panel used to
   fire on every failed action.
   ══════════════════════════════════════════════════════ */

const ToastCtx = createContext(null)

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((message, tone = 'info') => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500)
  }, [])

  const api = useMemo(() => ({
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }), [push])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast--${t.tone}`}>
            <span className="adm-toast-icon">{t.tone === 'success' ? '✓' : t.tone === 'error' ? '!' : 'i'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useAdminToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useAdminToast must be used inside AdminToastProvider')
  return ctx
}

/* ══════════════════════════════════════════════════════
   Confirm dialog — replaces window.confirm(). Destructive
   actions additionally require typing the record's name,
   so a mis-click can't delete a user and all their data.
   ══════════════════════════════════════════════════════ */

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', tone = 'default', requireText, busy, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('')

  useEffect(() => { if (open) setTyped('') }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null
  const blocked = Boolean(requireText) && typed.trim() !== requireText

  return (
    <div className="adm-modal-backdrop" onMouseDown={() => !busy && onCancel()}>
      <div className="adm-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className={tone === 'danger' ? 'adm-modal-title adm-modal-title--danger' : 'adm-modal-title'}>{title}</h3>
        <div className="adm-modal-body">{body}</div>
        {requireText && (
          <label className="adm-modal-confirm-field">
            <span>Type <code>{requireText}</code> to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus spellCheck={false} />
          </label>
        )}
        <div className="adm-modal-actions">
          <button className="adm-btn" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className={tone === 'danger' ? 'adm-btn adm-btn--danger' : 'adm-btn adm-btn--primary'}
            type="button"
            onClick={onConfirm}
            disabled={busy || blocked}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="adm-modal-backdrop" onMouseDown={onClose}>
      <div className={`adm-modal${wide ? ' adm-modal--wide' : ''}`} role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="adm-modal-head">
          <h3 className="adm-modal-title">{title}</h3>
          <button className="adm-icon-btn" type="button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="adm-modal-scroll">{children}</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Stat card with a week-over-week delta
   ══════════════════════════════════════════════════════ */

export function StatCard({ label, value, delta, hint, tone, series }) {
  // delta: { current, previous }. A jump from zero has no meaningful
  // percentage, so it renders as a plain "+N" instead of "+∞%".
  let deltaNode = null
  if (delta) {
    const { current = 0, previous = 0 } = delta
    const diff = current - previous
    const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    const pct = previous > 0 ? Math.round((diff / previous) * 100) : null
    deltaNode = (
      <span className={`adm-delta adm-delta--${dir}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'}
        {pct === null ? (diff === 0 ? ' no change' : ` ${diff > 0 ? '+' : ''}${num(diff)}`) : ` ${Math.abs(pct)}%`}
        <span className="adm-delta-note">vs prev 7d</span>
      </span>
    )
  }

  return (
    <div className={`adm-stat${tone ? ` adm-stat--${tone}` : ''}`}>
      <span className="adm-stat-label">{label}</span>
      <strong className="adm-stat-value">{value}</strong>
      {series && series.length > 1 && <Sparkline data={series} />}
      {deltaNode}
      {hint && <span className="adm-stat-hint">{hint}</span>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Charts (inline SVG — no chart library in the bundle)
   ══════════════════════════════════════════════════════ */

export function Sparkline({ data, height = 28 }) {
  const pts = data.map((d) => (typeof d === 'number' ? d : d.value || 0))
  const max = Math.max(...pts, 1)
  const w = 100
  const step = pts.length > 1 ? w / (pts.length - 1) : w
  const coords = pts.map((v, i) => [i * step, height - (v / max) * (height - 4) - 2])
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`

  return (
    <svg className="adm-sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} className="adm-sparkline-area" />
      <path d={line} className="adm-sparkline-line" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// 30-day trend with a metric switcher. Hovering a column reveals its exact
// value and date, so the chart is readable without a tooltip library.
export function TrendChart({ series, metrics, height = 190 }) {
  const [active, setActive] = useState(metrics[0].key)
  const [hover, setHover] = useState(null)
  const metric = metrics.find((m) => m.key === active) || metrics[0]

  const values = series.map((d) => d[metric.key] || 0)
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="adm-chart">
      <div className="adm-chart-head">
        <div className="adm-chart-total">
          <strong>{num(total)}</strong>
          <span>{metric.label.toLowerCase()} in the last 30 days</span>
        </div>
        <div className="adm-chart-tabs">
          {metrics.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`adm-chart-tab${m.key === active ? ' active' : ''}`}
              onClick={() => setActive(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-chart-plot" style={{ height }}>
        {series.map((d, i) => {
          const v = d[metric.key] || 0
          const pct = (v / max) * 100
          return (
            <div
              key={d.day || i}
              className={`adm-chart-bar${hover === i ? ' hovered' : ''}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="adm-chart-bar-fill" style={{ height: `${Math.max(pct, v > 0 ? 3 : 0)}%` }} />
              {hover === i && (
                <span className="adm-chart-tip">
                  <strong>{num(v)}</strong>
                  {new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="adm-chart-axis">
        <span>{series[0] ? new Date(series[0].day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

export function BreakdownBars({ items, empty = 'No data yet' }) {
  if (!items || items.length === 0) return <p className="adm-muted-block">{empty}</p>
  const max = Math.max(...items.map((i) => i.count), 1)
  return (
    <ul className="adm-breakdown">
      {items.map((it) => (
        <li key={it.label}>
          <span className="adm-breakdown-label">{it.label}</span>
          <span className="adm-breakdown-track">
            <span className="adm-breakdown-fill" style={{ width: `${(it.count / max) * 100}%` }} />
          </span>
          <span className="adm-breakdown-count">{num(it.count)}</span>
        </li>
      ))}
    </ul>
  )
}

/* ══════════════════════════════════════════════════════
   DataTable — sorting, pagination and CSV export, so each
   tab declares columns instead of hand-rolling a <table>.
   ══════════════════════════════════════════════════════ */

function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  // A leading =, +, - or @ makes Excel/Sheets treat the cell as a formula.
  // Prefix with an apostrophe so exported user-supplied text stays inert.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => {
    const v = c.exportValue ? c.exportValue(row) : c.sortValue ? c.sortValue(row) : row[c.key]
    return csvCell(v)
  }).join(',')).join('\n')

  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const PAGE_SIZES = [25, 50, 100]

export function DataTable({
  columns,
  rows,
  getRowKey,
  searchKeys,
  searchPlaceholder = 'Search…',
  toolbar,
  exportName,
  defaultSort,
  emptyMessage = 'Nothing here yet',
  onRowClick,
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(defaultSort || null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || !searchKeys?.length) return rows
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
  }, [rows, search, searchKeys])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return filtered
    const val = (r) => (col.sortValue ? col.sortValue(r) : r[col.key])
    return [...filtered].sort((a, b) => {
      const av = val(a); const bv = val(b)
      if (av === bv) return 0
      // Numbers and dates compare naturally; everything else as text, so a
      // column of mixed nulls doesn't scramble the order.
      const cmp = (typeof av === 'number' && typeof bv === 'number')
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true })
      return sort.dir === 'desc' ? -cmp : cmp
    })
  }, [filtered, sort, columns])

  // Deleting the last row of the final page would otherwise strand the user
  // on an empty page with no way back except paging manually.
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  function toggleSort(col) {
    if (col.sortable === false) return
    setPage(0)
    setSort((cur) => {
      if (!cur || cur.key !== col.key) return { key: col.key, dir: 'asc' }
      if (cur.dir === 'asc') return { key: col.key, dir: 'desc' }
      return null
    })
  }

  return (
    <div className="adm-table-card">
      <div className="adm-table-toolbar">
        <div className="adm-table-toolbar-left">
          {searchKeys?.length > 0 && (
            <div className="adm-search-wrap">
              <span className="adm-search-icon" aria-hidden="true">⌕</span>
              <input
                className="adm-search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              />
              {search && (
                <button className="adm-search-clear" type="button" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
              )}
            </div>
          )}
          <span className="adm-table-count">
            {search ? `${num(sorted.length)} of ${num(rows.length)}` : `${num(rows.length)} total`}
          </span>
        </div>
        <div className="adm-table-toolbar-right">
          {toolbar}
          {exportName && (
            <button
              className="adm-btn adm-btn--ghost"
              type="button"
              onClick={() => downloadCsv(`${exportName}-${new Date().toISOString().slice(0, 10)}.csv`, columns.filter((c) => c.exportable !== false), sorted)}
              disabled={sorted.length === 0}
            >
              ⭳ Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="adm-table-scroll">
        <table className="adm-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const isSorted = sort?.key === c.key
                return (
                  <th
                    key={c.key}
                    className={[
                      c.sortable === false ? '' : 'sortable',
                      isSorted ? 'sorted' : '',
                      c.align === 'right' ? 'align-right' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => toggleSort(c)}
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {c.label}
                    {c.sortable !== false && (
                      <span className="adm-sort-caret">{isSorted ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td colSpan={columns.length} className="adm-table-empty">{search ? `No matches for “${search}”` : emptyMessage}</td></tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={onRowClick ? 'clickable' : ''}
                onClick={onRowClick ? (e) => {
                  // Let buttons/links/selects inside the row do their own job.
                  if (e.target.closest('button, a, select, input')) return
                  onRowClick(row)
                } : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={c.align === 'right' ? 'align-right' : undefined}>
                    {c.render ? c.render(row) : (row[c.key] ?? <span className="adm-muted">—</span>)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="adm-pagination">
          <span>
            {num(safePage * pageSize + 1)}–{num(Math.min((safePage + 1) * pageSize, sorted.length))} of {num(sorted.length)}
          </span>
          <div className="adm-pagination-controls">
            <select className="adm-select adm-select--sm" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }}>
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
            <button className="adm-btn adm-btn--ghost" type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
            <span className="adm-page-indicator">{safePage + 1} / {pageCount}</span>
            <button className="adm-btn adm-btn--ghost" type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>Next ›</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   Status / loading
   ══════════════════════════════════════════════════════ */

export function StatusPill({ status }) {
  const key = String(status || 'unknown').toLowerCase()
  return <span className={`adm-pill adm-pill--${key}`}>{key}</span>
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="adm-skeleton">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="adm-skeleton-row" />)}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="adm-error-state">
      <strong>Couldn’t load this data</strong>
      <p>{message}</p>
      {onRetry && <button className="adm-btn adm-btn--primary" type="button" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function SectionCard({ title, subtitle, action, children, padded }) {
  return (
    <section className="adm-card">
      {(title || action) && (
        <header className="adm-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'adm-card-body adm-card-body--padded' : 'adm-card-body'}>{children}</div>
    </section>
  )
}
