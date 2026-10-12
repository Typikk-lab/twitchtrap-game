import { useState } from 'react'
import { useWallet } from './lib/useWallet.js'
import ArcadeGame from './game/ArcadeGame.jsx'
import Leaderboard from './components/Leaderboard.jsx'

export default function App() {
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)

  const {
    providers,
    walletName,
    address,
    shortAddress,
    busy,
    error,
    connect,
    disconnect,
  } = useWallet()

  async function selectWallet(walletId) {
    setWalletMenuOpen(false)
    await connect(walletId)
  }

  async function handleDisconnect() {
    await disconnect()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="TwitchTrap home">
          <span className="brand-mark">T</span>
          <span className="brand-name">TWITCH<span>TRAP</span></span>
        </a>

        <div className="header-actions">
          <div className="network-status">
            <span className="status-dot" />
            <span>LOCAL ARCADE / DEMO</span>
          </div>

          {address ? (
            <button
              className="wallet-button wallet-connected"
              onClick={handleDisconnect}
              disabled={busy}
              title={`${walletName}: ${address}. Click to disconnect.`}
            >
              <span className="wallet-indicator" />
              {busy ? 'DISCONNECTING...' : shortAddress}
            </button>
          ) : (
            <div className="wallet-menu">
              <button
                className="wallet-button"
                disabled={busy || providers.length === 0}
                onClick={() => setWalletMenuOpen((open) => !open)}
                aria-expanded={walletMenuOpen}
                aria-haspopup="true"
                title={
                  providers.length === 0
                    ? 'No supported browser wallet detected'
                    : 'Choose a browser wallet'
                }
              >
                {busy ? 'CONNECTING...' : 'WALLET PREVIEW'}
              </button>

              {walletMenuOpen && providers.length > 0 && (
                <div className="wallet-options" role="menu">
                  {providers.map((item) => (
                    <button
                      key={item.id}
                      className="wallet-option"
                      role="menuitem"
                      onClick={() => selectWallet(item.id)}
                      disabled={busy}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="intro-line">
          <span className="eyebrow"><span className="eyebrow-star">✦</span> THE DEGEN ARCADE <span className="eyebrow-star">✦</span></span>
          <h1>ONE BOX. <span>NO MERCY.</span></h1>
          <p>Keep your cursor inside. The trap keeps moving. Don't blink.</p>
        </div>

        <section className="cabinet" aria-label="TwitchTrap arcade cabinet">
          <div className="cabinet-rivet rivet-tl" />
          <div className="cabinet-rivet rivet-tr" />

          <div className="cabinet-marquee">
            <div className="marquee-side">PLAYER<br />01</div>
            <div className="marquee-center">
              <div className="marquee-title">TWITCHTRAP</div>
              <div className="marquee-sub">✦ &nbsp; SURVIVE THE TRAP &nbsp; ✦</div>
            </div>
            <div className="marquee-side marquee-ready"><span />READY<br />TO PLAY</div>
          </div>

          <div className="cabinet-bezel">
            <div className="bezel-topline">
              <span>CRT DISPLAY // TT-001</span>
              <span className="bezel-live"><i /> SYSTEM ONLINE</span>
            </div>

            <ArcadeGame />

            <div className="cabinet-system-log">
              <span className="log-prompt">&gt;_</span>
              <span>FREE PLAY ENABLED</span>
              <span className="log-divider">/</span>
              <span>NO COINS REQUIRED</span>
              <span className="log-end">[ LOCAL SESSION ]</span>
            </div>
          </div>

          <div className="cabinet-deck">
            <div className="deck-brand">
              <span className="deck-brand-symbol">TT</span>
              <span>ARCADE<br /><strong>CONTROL DECK</strong></span>
            </div>

            <div className="deck-buttons" aria-label="Arcade cabinet decoration">
              <span className="deck-button pink" title="Decorative arcade button" />
              <span className="deck-button cyan" title="Decorative arcade button" />
              <span className="deck-button gold" title="Decorative arcade button" />
              <span className="deck-button purple" title="Decorative arcade button" />
            </div>

            <div className="deck-status">
              <span><i className="led-pink" /> PWR</span>
              <span><i className="led-cyan" /> DEMO</span>
              <span><i className="led-gold" /> FREE</span>
            </div>
          </div>

          <div className="cabinet-bottom">
            <span>TWITCHTRAP INDUSTRIES</span>
            <span>BUILT FOR THE CHRONICALLY ONLINE</span>
            <span>V.01 / FREE DEMO</span>
          </div>

          <div className="cabinet-rivet rivet-bl" />
          <div className="cabinet-rivet rivet-br" />
        </section>

        <div className="under-cabinet">
          <span><i /> NO WALLET REQUIRED</span>
          <span><i /> NO PAYMENTS OR PRIZES</span>
          <span><i /> PERSONAL BEST SAVED LOCALLY</span>
        </div>

        {error && <p className="wallet-error" role="alert">{error}</p>}

        {address && (
          <div className="wallet-card">
            <span className="wallet-card-label">WALLET PREVIEW CONNECTED</span>
            <strong>{walletName}</strong>
            <code>{address}</code>
            <span className="wallet-card-note">
              Connecting a wallet does not affect gameplay or authorize transactions.
            </span>
          </div>
        )}
      </section>

      <Leaderboard />

      <footer className="footer">
        <span>TT / 001</span>
        <span>TWITCHTRAP ARCADE</span>
        <span>INSERT SKILL, NOT COINS <b>✦</b></span>
      </footer>
    </main>
  )
}
