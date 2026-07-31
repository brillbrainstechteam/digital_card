import './publish-progress.css'

const STAGES = [
  'Saving your design...',
  'Generating your branded QR Code...',
  'Preparing secure checkout...',
  'Ready for payment!',
]

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
