import { useState } from 'react'
import { useWallet } from './lib/useWallet.js'

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
          TWITCH<span>TRAP</span>
        </a>

        <div className="header-actions">
          <div className="network-status">
            <span className="status-dot" />
            DEVNET · PREVIEW
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
                    ? 'Install Phantom or Solflare to connect'
                    : 'Choose a browser wallet'
                }
              >
                {busy ? 'CONNECTING...' : 'CONNECT WALLET'}
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

        <p className="preview-note">
          WALLET CONNECTION ONLY · NO TRANSACTIONS ENABLED
        </p>

        {error && (
          <p className="wallet-error" role="alert">
            {error}
          </p>
        )}

        {!address && providers.length === 0 && (
          <p className="wallet-help">
            Install Phantom or Solflare in this browser to connect a wallet.
          </p>
        )}

        {address && (
          <div className="wallet-card">
            <span className="wallet-card-label">WALLET CONNECTED</span>
            <strong>{walletName}</strong>
            <code>{address}</code>
            <span className="wallet-card-note">
              Connection established. Game and payment features remain disabled.
            </span>
          </div>
        )}
      </section>

      <footer className="footer">
        TWITCHTRAP ARCADE <span>·</span> HIGH RISK, PLAY RESPONSIBLY
      </footer>
    </main>
  )
}
