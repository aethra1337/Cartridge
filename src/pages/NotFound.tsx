import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="landing notfound">
      <header className="landing-nav">
        <Link className="brand" to="/">
          <img src="/logo.svg" alt="Cartridge" className="brand-logo" width={32} height={32} />
          <span className="brand-name">Cartridge</span>
        </Link>
      </header>
      <section className="notfound-body">
        <p className="kicker">404</p>
        <h1>This crate is empty.</h1>
        <p>The page you&apos;re looking for isn&apos;t in the collection.</p>
        <div className="hero-actions">
          <Link className="button button-accent" to="/">Back home</Link>
          <Link className="button button-light" to="/app">Open the studio</Link>
        </div>
      </section>
    </main>
  )
}
