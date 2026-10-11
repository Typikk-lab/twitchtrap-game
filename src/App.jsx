export default function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="TwitchTrap home">
          TWITCH<span>TRAP</span>
        </a>

        <div className="network-status">
          <span className="status-dot" />
          DEVNET · PREVIEW
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">INSERT DEGEN ENERGY</p>

        <h1>
          PLAY THE GAME.
          <br />
          <span>BEAT THE TRAP.</span>
        </h1>

        <p className="hero-copy">
          The arcade is booting up. The next run starts here.
        </p>

        <button className="play-button" disabled>
          GAME MIGRATION IN PROGRESS
        </button>
      </section>

      <footer className="footer">
        TWITCHTRAP ARCADE <span>·</span> HIGH RISK, PLAY RESPONSIBLY
      </footer>
    </main>
  )
}
