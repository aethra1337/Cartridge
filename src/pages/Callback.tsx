import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleAuthCallback, loginWithSpotify, getAccessToken } from '../lib/spotify/auth'

export default function Callback() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const search = window.location.search
    window.history.replaceState({}, '', '/callback')

    handleAuthCallback(search)
      .then(() => {
        try {
          sessionStorage.setItem('cartridge.justConnected', '1')
        } catch {
          // ignore
        }
        navigate('/app', { replace: true })
      })
      .catch(() => {
        if (getAccessToken()) {
          navigate('/app', { replace: true })
          return
        }
        navigate('/?auth=failed', { replace: true })
      })
  }, [navigate])

  return (
    <main className="landing notfound">
      <section className="notfound-body">
        <p className="kicker">Connecting</p>
        <h1>Talking to Spotify…</h1>
        <p>Finishing the login, you&apos;ll land in the studio.</p>
        <p>
          Stuck here?{' '}
          <button
            className="text-button"
            style={{ display: 'inline' }}
            onClick={() => loginWithSpotify(true)}
          >
            Try connecting again
          </button>
        </p>
      </section>
    </main>
  )
}
