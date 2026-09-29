import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Headphones } from 'lucide-react'
import { getAccessToken, loginWithSpotify } from '../lib/spotify/auth'
import { LangToggle, useLang, useT } from '../lib/i18n'
import SpotlightCard from '../components/SpotlightCard/SpotlightCard'

// Decorative canvas must never blank the page.
class ErrorCatcher extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[bg] background failed:', error)
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// Canvas + text motion — landing only, never in the studio bundle.
const ColorBends = lazy(() => import('../components/ColorBends/ColorBends'))
const SplitText = lazy(() => import('../components/SplitText/SplitText'))
const ScrollReveal = lazy(() => import('../components/ScrollReveal/ScrollReveal'))
const Typewriter = lazy(() => import('../components/Typewriter/Typewriter'))
const RotatingText = lazy(() => import('../components/RotatingText/RotatingText'))
const CountUp = lazy(() => import('../components/CountUp/CountUp'))
import StarBorder from '../components/StarBorder/StarBorder'

const MOCK_BIN_DATA = [
  { label: 'türkçe hip hop', tracks: 104, artists: 41 },
  { label: 'rock', tracks: 58, artists: 21 },
  { label: 'anadolu rock', tracks: 55, artists: 33 },
  { label: 'arabesk', tracks: 42, artists: 26 },
  { label: 'amped', tracks: 311, artists: 231 },
  { label: 'deep', tracks: 293, artists: 238 },
]

export default function Landing() {
  const t = useT()
  const { lang } = useLang()
  const connected = Boolean(getAccessToken())
  const STEPS = [
    { n: '1', title: t('step1t'), text: t('step1d') },
    { n: '2', title: t('step2t'), text: t('step2d') },
    { n: '3', title: t('step3t'), text: t('step3d') },
    { n: '4', title: t('step4t'), text: t('step4d') },
    { n: '5', title: t('step5t'), text: t('step5d') },
  ]
  const FEATURES = [
    { title: t('feat1t'), text: t('feat1d') },
    { title: t('feat2t'), text: t('feat2d') },
    { title: t('feat3t'), text: t('feat3d') },
    { title: t('feat4t'), text: t('feat4d') },
    { title: t('feat5t'), text: t('feat5d') },
    { title: t('feat6t'), text: t('feat6d') },
  ]
  const FAQS = [
    { q: t('faq1q'), a: t('faq1a') },
    { q: t('faq2q'), a: t('faq2a') },
    { q: t('faq3q'), a: t('faq3a') },
    { q: t('faq4q'), a: t('faq4a') },
    { q: t('faq5q'), a: t('faq5a') },
  ]
  const heroCopy =
    lang === 'tr'
      ? 'Cartridge, Beğenilenlerin veya herhangi bir listeni tür, mod ve on yıl kutularına ayırır — sonra kutuyu tek tıkla yeni bir Spotify listesine dönüştürür.'
      : 'Cartridge sorts your Liked Songs or any playlist into genre, mood and decade bins — then turns any bin into a new Spotify playlist in one click.'
  const rotatorWords =
    lang === 'tr'
      ? ['tür kutuları', 'mod kutuları', 'on yıl kutuları', 'enerji rampaları', 'tek tıklık listeler']
      : ['genre bins', 'mood bins', 'decade bins', 'energy ramps', 'one-click playlists']
  const [bgFailed, setBgFailed] = useState(false)
  // /callback redirects here with ?auth=failed — surface it instead of
  // silently landing the user with no feedback.
  const [authFailed, setAuthFailed] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth') === 'failed'
  )
  useEffect(() => {
    if (authFailed) {
      window.history.replaceState({}, '', '/')
    }
  }, [authFailed])
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  )
  const showMotion = !reducedMotion
  // User override for background motion (persisted). Null = follow OS setting.
  const [motionOverride, setMotionOverride] = useState<boolean | null>(() => {
    try {
      const v = localStorage.getItem('cartridge.bgMotion')
      return v === 'on' ? true : v === 'off' ? false : null
    } catch {
      return null
    }
  })
  const bgMotionOn = motionOverride ?? showMotion
  const toggleBgMotion = () => {
    setMotionOverride((cur) => {
      const next = !((cur ?? showMotion))
      try {
        localStorage.setItem('cartridge.bgMotion', next ? 'on' : 'off')
      } catch {
        // ignore
      }
      return next
    })
  }

  // Global mouse-following border glow for every .glow-box
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const box = (e.target as HTMLElement).closest?.('.glow-box') as HTMLElement | null
      if (!box) return
      const rect = box.getBoundingClientRect()
      box.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
      box.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <main className="landing">
      <div className="page-dots" aria-hidden="true">
        {!bgFailed && (
          <Suspense fallback={null}>
            <ErrorCatcher onError={() => setBgFailed(true)}>
              {/* Reduced-motion users get one still frame: visible, zero movement. */}
              <ColorBends
                colors={['#fb7c1f', '#8c0c0c', '#d6cabd']}
                rotation={-41}
                speed={0}
                scale={0.9}
                frequency={2.4}
                warpStrength={1}
                mouseInfluence={1.4}
                noise={0}
                parallax={0.8}
                iterations={1}
                intensity={1.2}
                bandWidth={3.5}
                transparent
                frozen={!bgMotionOn}
              />
            </ErrorCatcher>
          </Suspense>
        )}
      </div>
      <header className="landing-nav">
        <Link className="brand" to="/">
          <img src="/logo.svg" alt="Cartridge" className="brand-logo" width={32} height={32} />
          <span className="brand-name">Cartridge</span>
        </Link>
        <nav className="landing-links">
          <a href="#how">{t('navHow')}</a>
          <a href="#features">{t('navFeatures')}</a>
          <a href="#faq">{t('navFaq')}</a>
        </nav>
        <div className="landing-cta">
          <LangToggle />
          {connected ? (
            <Link className="button button-accent" to="/app">
              {t('openStudio')} <ArrowRight size={14} />
            </Link>
          ) : (
            <button className="button button-accent" onClick={() => loginWithSpotify(true)}>
              <Headphones size={14} /> {t('connectSpotify')}
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        {authFailed && (
          <div className="notice" role="alert" style={{ marginBottom: 16 }}>
            <span>{t('authFailed')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                className="button button-accent"
                style={{ padding: '4px 10px', fontSize: 11 }}
                onClick={() => loginWithSpotify(true)}
              >
                <Headphones size={14} /> {t('connectSpotify')}
              </button>
              <button className="text-button" style={{ display: 'inline' }} onClick={() => setAuthFailed(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
        <div className="hero-copy">
          <p className="kicker">{t('kicker')}</p>
          {showMotion ? (
            <Suspense fallback={<h1>{t('heroTitle')}</h1>}>
              <SplitText
                text={t('heroTitle')}
                tag="h1"
                textAlign="left"
                splitType="chars"
                delay={35}
                duration={0.9}
              />
            </Suspense>
          ) : (
            <h1>{t('heroTitle')}</h1>
          )}
          <p className="hero-rotator">
            <Suspense fallback={null}>
              <RotatingText key={lang} words={rotatorWords} />
            </Suspense>
          </p>
          <p className="hero-sub">
            <Suspense fallback={<span>{heroCopy}</span>}>
              <Typewriter key={lang} text={heroCopy} speed={40} />
            </Suspense>
          </p>
          <div className="stat-strip">
            <div className="stat glow-box"><Suspense fallback={<strong>8</strong>}><strong><CountUp to={8} /></strong></Suspense><span>{t('statCats')}</span></div>
            <div className="stat glow-box"><Suspense fallback={<strong>100</strong>}><strong><CountUp to={100} suffix="%" /></strong></Suspense><span>{t('statCov')}</span></div>
            <div className="stat glow-box"><Suspense fallback={<strong>1</strong>}><strong><CountUp to={1} /></strong></Suspense><span>{t('statExp')}</span></div>
          </div>
          <div className="logo-marquee" aria-hidden="true">
            <div className="logo-track">
              {['GENRES', 'MOODS', 'STYLES', 'DECADES', 'ENERGY', 'BPM', 'VALENCE', 'STAGING'].concat(['GENRES', 'MOODS', 'STYLES', 'DECADES', 'ENERGY', 'BPM', 'VALENCE', 'STAGING']).map((w, i) => (
                <span key={i} className="logo-chip">{w} ✦</span>
              ))}
            </div>
          </div>
          <div className="hero-actions">
            {connected ? (
              <Link className="button button-accent" to="/app">
                {t('openStudio')} <ArrowRight size={14} />
              </Link>
            ) : (
              <button className="button button-accent" onClick={() => loginWithSpotify(true)}>
                <Headphones size={14} /> {t('connectSpotify')}
              </button>
            )}
            <a className="button button-light" href="#how">{t('seeHow')}</a>
            <Link className="button button-light" to="/app?demo=1">{t('tryDemo')}</Link>
            <StarBorder href="#features" className="hero-star">✦ {t('exploreBins')}</StarBorder>
          </div>
          <p className="hero-note">
            {t('heroNote')} ·{' '}
            <button className="motion-toggle" onClick={toggleBgMotion} title="Toggle animated background">
              {t('bgMotion')}: {bgMotionOn ? t('on') : t('off')}
            </button>
          </p>
        </div>
        <div className="hero-preview glow-box" aria-hidden="true">
          <div className="preview-head">
            <span>GENRES</span>
            <span>{t('genresBins')}</span>
          </div>
          {MOCK_BIN_DATA.map((b) => (
            <div className="preview-bin glow-box" key={b.label}>
              <div>
                <div className="preview-name">{b.label}</div>
                <div className="preview-meta">{b.tracks} {t('tracks')} / {b.artists} artists</div>
              </div>
              <span className="preview-plus">+ Playlist</span>
            </div>
          ))}
          <div className="preview-foot">{t('previewFoot')}</div>
        </div>
      </section>

      <section className="landing-section" id="how">
        <p className="kicker">{t('usageGuide')}</p>
        {showMotion ? (
          <Suspense fallback={<h2>{t('stepsTitle')}</h2>}>
            <ScrollReveal baseOpacity={0.15} blurStrength={3}>
              {t('stepsTitle')}
            </ScrollReveal>
          </Suspense>
        ) : (
          <h2>{t('stepsTitle')}</h2>
        )}
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" id="features">
        <p className="kicker">{t('whatYouGet')}</p>
        {showMotion ? (
          <Suspense fallback={<h2>{t('featuresTitle')}</h2>}>
            <ScrollReveal baseOpacity={0.15} blurStrength={3}>
              {t('featuresTitle')}
            </ScrollReveal>
          </Suspense>
        ) : (
          <h2>{t('featuresTitle')}</h2>
        )}
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} spotlightColor="rgba(251, 124, 31, 0.16)">
              <strong>{f.title}</strong>
              <p>{f.text}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="landing-section" id="faq">
        <p className="kicker">{t('questions')}</p>
        {showMotion ? (
          <Suspense fallback={<h2>{t('faqTitle')}</h2>}>
            <ScrollReveal baseOpacity={0.15} blurStrength={3}>
              {t('faqTitle')}
            </ScrollReveal>
          </Suspense>
        ) : (
          <h2>{t('faqTitle')}</h2>
        )}
        <div className="faq-list">
          {FAQS.map((f) => (
            <details key={f.q} className="glow-box">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-final">
        {showMotion ? (
          <Suspense fallback={<h2>{t('finalTitle')}</h2>}>
            <ScrollReveal baseOpacity={0.15} blurStrength={3}>
              {t('finalTitle')}
            </ScrollReveal>
          </Suspense>
        ) : (
          <h2>{t('finalTitle')}</h2>
        )}
        {connected ? (
          <Link className="button button-accent" to="/app">
            {t('openStudio')} <ArrowRight size={14} />
          </Link>
        ) : (
          <button className="button button-accent" onClick={() => loginWithSpotify(true)}>
            <Headphones size={14} /> {t('connectSpotify')}
          </button>
        )}
      </section>

      <footer className="landing-footer">
        <div className="footer-brand">
          <img src="/logo.svg" alt="Cartridge" width={22} height={22} />
          <span>{t('footerTag')}</span>
        </div>
        <p>{t('footerNote')}</p>
        <nav>
          <Link to="/app">{t('studio')}</Link>
          <a href="https://github.com/aethra1337/Cartridge/issues" target="_blank" rel="noreferrer">{t('feedback')}</a>
        </nav>
      </footer>
    </main>
  )
}
