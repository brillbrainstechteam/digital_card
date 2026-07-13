import './publish-progress.css'

const STAGES = [
  'Saving your design...',
  'Curating your customized Business Card...',
  'Generating your branded QR Code...',
  'Publishing your content...',
  'Done!',
]

// Presentational only — StudioPage drives `stage` (0..STAGES.length-1)
// through the actual publish sequence, pausing on each just long enough to
// read before advancing. Replaces the old instant toast + spinner with
// something that reads as real progress instead of a black box.
export function PublishProgress({ stage }) {
  if (stage === null || stage === undefined) return null

  return (
    <div className="confirm-overlay publish-progress-overlay">
      <div className="publish-progress-dialog">
        <div className="publish-progress-list">
          {STAGES.map((label, index) => {
            const state = index < stage ? 'done' : index === stage ? 'active' : 'pending'
            return (
              <div key={label} className={`publish-progress-row publish-progress-row--${state}`}>
                <span className="publish-progress-icon">
                  {state === 'done' ? '✓' : state === 'active' ? <span className="publish-progress-spinner" /> : ''}
                </span>
                <span className="publish-progress-label">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="publish-progress-bar">
          <div
            className="publish-progress-bar-fill"
            style={{ width: `${Math.min(100, ((stage + 1) / STAGES.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
