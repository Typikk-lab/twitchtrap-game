import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import './Leaderboard.css'

function formatTime(value) {
  const seconds = Number(value)
  return Number.isFinite(seconds) ? `${seconds.toFixed(3)}s` : '—'
}

export default function Leaderboard() {
  const [scores, setScores] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true

    async function loadScores() {
      if (!supabase) {
        if (active) setStatus('config')
        return
      }

      const { data, error } = await supabase
        .from('arcade_scores')
        .select('display_name, survival_seconds, created_at')
        .eq('verified', true)
        .order('survival_seconds', { ascending: false })
        .limit(10)

      if (!active) return

      if (error) {
        console.error('Leaderboard could not be loaded:', error.message)
        setStatus('error')
        return
      }

      setScores(data ?? [])
      setStatus(data?.length ? 'ready' : 'empty')
    }

    loadScores()

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard-header">
        <div>
          <p className="leaderboard-kicker">GLOBAL RANKINGS // TT-001</p>
          <h2 id="leaderboard-title">THE SURVIVORS</h2>
          <p className="leaderboard-description">
            Ten longest verified runs. No shortcuts.
          </p>
        </div>
        <div className="leaderboard-live">
          <span aria-hidden="true" />
          VERIFIED
        </div>
      </div>

      <div className="leaderboard-columns" aria-hidden="true">
        <span>RANK / PLAYER</span>
        <span>SURVIVAL TIME</span>
      </div>

      {status === 'loading' && (
        <p className="leaderboard-message" role="status">
          CONNECTING TO THE SCOREBOARD...
        </p>
      )}

      {status === 'config' && (
        <p className="leaderboard-message" role="status">
          SCOREBOARD CONFIGURATION REQUIRED.
        </p>
      )}

      {status === 'error' && (
        <p className="leaderboard-message" role="status">
          SCOREBOARD TEMPORARILY OFFLINE. TRY AGAIN LATER.
        </p>
      )}

      {status === 'empty' && (
        <div className="leaderboard-empty">
          <span className="leaderboard-empty-mark" aria-hidden="true">+</span>
          <strong>NO VERIFIED RUNS YET</strong>
          <p>The first verified survivors will appear here.</p>
        </div>
      )}

      {status === 'ready' && (
        <ol className="leaderboard-list">
          {scores.map((score, index) => (
            <li
              className={`leaderboard-row${index === 0 ? ' leaderboard-first' : ''}`}
              key={`${score.created_at}-${index}`}
            >
              <div className="leaderboard-player">
                <span className="leaderboard-rank">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="leaderboard-player-name">
                  {score.display_name || 'ANONYMOUS'}
                </span>
              </div>
              <strong className="leaderboard-time">
                {formatTime(score.survival_seconds)}
              </strong>
            </li>
          ))}
        </ol>
      )}

      <div className="leaderboard-footer">
        <span>FREE PLAY ONLY</span>
        <span>CLIENT SUBMISSIONS DISABLED</span>
      </div>
    </section>
  )
}
