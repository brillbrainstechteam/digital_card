import { paletteVariables } from '../../theme'

// A sample business card curated automatically from the digital card's
// extracted brand theme. Hovering flips it to a back face with contact
// details — the real, editable business card product is built separately;
// this is the "here's what it'll look like" preview shown right after
// publish so the sellable flow feels complete end-to-end.
export function SampleBusinessCard({ profile, onEdit }) {
  const vars = paletteVariables(profile.palette || {}, profile.theme || {})
  const companyName = profile.companyName || profile.brandName || 'Your Company'
  const tagline = profile.tagline || 'Your tagline goes here'
  const personName = profile.personName || profile.brandName || 'Your Name'
  const designation = profile.designation || 'Founder'

  return (
    <div className="sample-bcard-wrap">
      <div className="sample-bcard-flip-zone" style={vars}>
        <div className="sample-bcard-flip">
          <div className="sample-bcard-face sample-bcard-front">
            {profile.logo && <img src={profile.logo} alt="" className="sample-bcard-logo" />}
            <h3 className="sample-bcard-company">{companyName}</h3>
            <p className="sample-bcard-tagline">{tagline}</p>
          </div>
          <div className="sample-bcard-face sample-bcard-back">
            <p className="sample-bcard-back-name">{personName}</p>
            <p className="sample-bcard-back-role">{designation}</p>
            <div className="sample-bcard-back-divider" />
            <div className="sample-bcard-back-contact">
              <span>{profile.email || 'you@company.com'}</span>
              <span>{profile.phone || '+1 555 000 0000'}</span>
              {profile.website && <span>{profile.website}</span>}
            </div>
          </div>
        </div>
      </div>
      <p className="sample-bcard-hint">Hover the card to preview the back</p>
      <button type="button" className="secondary-button sample-bcard-edit" onClick={onEdit}>
        Edit Business Card
      </button>
    </div>
  )
}
