import { useEffect, useState } from 'react'
import { exportAnalyticsSession, getAnalyticsSnapshot, subscribeAnalytics } from '../../analytics/tracker'

function downloadEvents() {
  const payload = exportAnalyticsSession()
  const sessionPrefix = payload.session.session_id.replace(/^session-/, '').slice(0, 8)
  const safeVersion = payload.session.build_version.replace(/[^a-z0-9._-]/gi, '-')
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `night-market-${safeVersion}-${sessionPrefix}.json`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function PlaytestDebugPanel() {
  const [snapshot, setSnapshot] = useState(getAnalyticsSnapshot)
  const [collapsed, setCollapsed] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => subscribeAnalytics(() => setSnapshot(getAnalyticsSnapshot())), [])

  if (closed) return null
  return (
    <aside
      className={`playtest-debug${collapsed ? ' is-collapsed' : ''}`}
      data-playtest-debug
      aria-label="Playtest debug information"
    >
      <header>
        <b>Playtest</b>
        <span>
          <button type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand playtest debug panel' : 'Collapse playtest debug panel'}>{collapsed ? 'Show' : 'Hide'}</button>
          <button type="button" onClick={() => setClosed(true)} aria-label="Close playtest debug panel">Close</button>
        </span>
      </header>
      {!collapsed && <>
        <dl>
          <div><dt>Session</dt><dd>{snapshot.sessionId.replace(/^session-/, '').slice(0, 8)}</dd></div>
          {snapshot.participantId && <div><dt>Participant</dt><dd>{snapshot.participantId}</dd></div>}
          <div><dt>Locale</dt><dd>{snapshot.locale}</dd></div>
          <div><dt>Screen</dt><dd>{snapshot.screen}</dd></div>
          <div><dt>Day</dt><dd>{snapshot.day ?? '—'}</dd></div>
          <div><dt>Tutorial</dt><dd>{snapshot.tutorialStep ?? '—'}</dd></div>
          <div><dt>Events</dt><dd>{snapshot.eventCount}</dd></div>
          <div><dt>Build</dt><dd>{snapshot.buildVersion}</dd></div>
        </dl>
        <button type="button" className="playtest-debug__export" onClick={downloadEvents}>Export Events</button>
      </>}
    </aside>
  )
}
