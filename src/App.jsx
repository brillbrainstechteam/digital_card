import { useEffect, useState } from 'react'
import './App.css'
import { defaultProfile } from './data'
import { prepareLogoAsset } from './theme'
import { Landing } from './components/Landing'
import { Studio } from './components/Studio'
import { CardPreview } from './components/CardPreview'

const STORAGE_KEY = 'brillbrains-digital-card-v2'

function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultProfile
    const profile = JSON.parse(saved)
    return {
      ...defaultProfile,
      ...profile,
      logoSource: profile.logoSource ?? profile.logo ?? defaultProfile.logoSource,
      logoSettings: {
        ...defaultProfile.logoSettings,
        ...profile.logoSettings,
      },
      coverSettings: {
        ...defaultProfile.coverSettings,
        ...profile.coverSettings,
      },
    }
  } catch {
    return defaultProfile
  }
}

function App() {
  const [view, setView] = useState('home')
  const [profile, setProfile] = useState(loadProfile)
  const [paletteStatus, setPaletteStatus] = useState({
    type: 'ready',
    text: 'Auto-matched',
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2_500_000) {
      setPaletteStatus({ type: 'error', text: 'Logo must be under 2.5 MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const logo = String(reader.result)
      setPaletteStatus({ type: 'working', text: 'Matching colors...' })
      try {
        const removal = profile.logoSettings?.removal ?? defaultProfile.logoSettings.removal
        const prepared = await prepareLogoAsset(logo, removal)
        setProfile((current) => ({
          ...current,
          logoSource: logo,
          logo: prepared.logo,
          palette: prepared.palette,
          logoSettings: { ...defaultProfile.logoSettings, ...current.logoSettings, removal },
        }))
        setPaletteStatus({
          type: 'ready',
          text: prepared.hasBackdrop ? 'Background blended' : 'Theme auto-matched',
        })
      } catch (error) {
        setProfile((current) => ({ ...current, logo, logoSource: logo }))
        setPaletteStatus({ type: 'error', text: error.message })
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  async function handleLogoSettingChange(field, value) {
    setProfile((current) => ({
      ...current,
      logoSettings: { ...defaultProfile.logoSettings, ...current.logoSettings, [field]: value },
    }))
    if (field !== 'removal') return

    const source = profile.logoSource ?? profile.logo
    try {
      const prepared = await prepareLogoAsset(source, value)
      setProfile((current) => ({ ...current, logo: prepared.logo, palette: prepared.palette }))
      setPaletteStatus({
        type: 'ready',
        text: prepared.hasBackdrop ? 'Background blended' : 'No background detected',
      })
    } catch (error) {
      setPaletteStatus({ type: 'error', text: error.message })
    }
  }

  function handleCoverUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 4_000_000) {
      setPaletteStatus({ type: 'error', text: 'Cover image must be under 4 MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setProfile((current) => ({ ...current, coverImage: String(reader.result) }))
      setPaletteStatus({ type: 'ready', text: 'Cover image updated' })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleCoverSettingChange(field, value) {
    setProfile((current) => ({
      ...current,
      coverSettings: { ...defaultProfile.coverSettings, ...current.coverSettings, [field]: value },
    }))
  }

  function resetSample() {
    localStorage.removeItem(STORAGE_KEY)
    setProfile(defaultProfile)
    setPaletteStatus({ type: 'ready', text: 'Sample restored' })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="product-mark" type="button" onClick={() => setView('home')}>
          <span>BB</span>
          <strong>Digital Card</strong>
        </button>
        <nav aria-label="Main navigation">
          <button type="button" className={view === 'studio' ? 'active' : ''} onClick={() => setView('studio')}>
            Studio
          </button>
          <button type="button" className={view === 'public' ? 'active' : ''} onClick={() => setView('public')}>
            Public card
          </button>
        </nav>
        <button className="topbar-action" type="button" onClick={() => setView('studio')}>
          Edit card
        </button>
      </header>

      {view === 'home' && (
        <Landing profile={profile} onCreate={() => setView('studio')} onPreview={() => setView('public')} />
      )}
      {view === 'studio' && (
        <Studio
          profile={profile}
          setProfile={setProfile}
          onLogoUpload={handleLogoUpload}
          onLogoSettingChange={handleLogoSettingChange}
          onCoverUpload={handleCoverUpload}
          onCoverSettingChange={handleCoverSettingChange}
          paletteStatus={paletteStatus}
          onReset={resetSample}
          onPublicView={() => setView('public')}
        />
      )}
      {view === 'public' && (
        <main className="public-view" style={{ '--public-background': profile.palette.surface }}>
          <div className="public-controls">
            <button className="secondary-button" type="button" onClick={() => setView('studio')}>
              Edit this card
            </button>
          </div>
          <CardPreview profile={profile} immersive />
        </main>
      )}
    </div>
  )
}

export default App
