import { useState } from 'react'
import { Monitor, Smartphone, ArrowRight } from 'lucide-react'

const ORIENTATIONS = [
  { key: 'horizontal', label: 'Horizontal', Icon: Monitor,    desc: '3.5" × 2"'  },
  { key: 'vertical',   label: 'Vertical',   Icon: Smartphone, desc: '2" × 3.5"'  },
]

const SIZES = [
  { key: 'standard',  label: 'Standard',  desc: '3.5 × 2 in'    },
  { key: 'european',  label: 'European',  desc: '3.35 × 2.17 in' },
  { key: 'square',    label: 'Square',    desc: '2.5 × 2.5 in'   },
  { key: 'mini',      label: 'Mini',      desc: '2.75 × 1.5 in'  },
]

function Toggle({ checked, onChange }) {
  return (
    <label className="bc-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="bc-switch-track" />
    </label>
  )
}

export function SetupDialog({ onCancel, onContinue }) {
  const [orientation, setOrientation] = useState('horizontal')
  const [size, setSize]               = useState('standard')
  const [includeQR, setIncludeQR]     = useState(false)
  const [includeBack, setIncludeBack] = useState(false)

  return (
    <div className="bc-setup-overlay">
      <div className="bc-setup-dialog">
        <h2>Create Business Card</h2>
        <p className="bc-dialog-sub">
          Choose your card format. Templates and content will auto-populate from your profile.
        </p>

        {/* Orientation */}
        <div className="bc-setup-section">
          <div className="bc-setup-label">Orientation</div>
          <div className="bc-opt-row">
            {ORIENTATIONS.map(({ key, label, Icon, desc }) => (
              <button
                key={key}
                type="button"
                className={`bc-opt${orientation === key ? ' selected' : ''}`}
                onClick={() => setOrientation(key)}
              >
                <Icon size={16} />
                <span className="bc-opt-meta">
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="bc-setup-section">
          <div className="bc-setup-label">Card Size</div>
          <div className="bc-opt-row">
            {SIZES.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                className={`bc-opt${size === key ? ' selected' : ''}`}
                onClick={() => setSize(key)}
              >
                <span className="bc-opt-meta">
                  <strong>{label}</strong>
                  <small>{desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="bc-setup-section">
          <div className="bc-setup-label">Options</div>
          <div className="bc-toggle-list">
            <div className="bc-toggle-item">
              <div className="bc-toggle-text">
                <h4>Include QR Code</h4>
                <p>Auto-generated QR linking to your digital card</p>
              </div>
              <Toggle checked={includeQR} onChange={setIncludeQR} />
            </div>
            <div className="bc-toggle-item">
              <div className="bc-toggle-text">
                <h4>Create Back Side</h4>
                <p>Design a second canvas for the back of your card</p>
              </div>
              <Toggle checked={includeBack} onChange={setIncludeBack} />
            </div>
          </div>
        </div>

        <div className="bc-setup-footer">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            onClick={() => onContinue({ orientation, size, includeQR, includeBack })}
          >
            Choose Template <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
