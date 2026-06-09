'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import {
  Grid, Direction,
  initGrid, addRandomTile, move, isGameOver, hasWon
} from '@/lib/game'

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2:    { bg: '#eee4da', text: '#776e65' },
  4:    { bg: '#ede0c8', text: '#776e65' },
  8:    { bg: '#f2b179', text: '#f9f6f2' },
  16:   { bg: '#f59563', text: '#f9f6f2' },
  32:   { bg: '#f67c5f', text: '#f9f6f2' },
  64:   { bg: '#f65e3b', text: '#f9f6f2' },
  128:  { bg: '#edcf72', text: '#f9f6f2' },
  256:  { bg: '#edcc61', text: '#f9f6f2' },
  512:  { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
}

const LOCAL_HS_KEY = (dim: number) => `2048_highscore_${dim}`

function getTileStyle(value: number | null, cellSize: number) {
  if (!value) return {}
  const colors = TILE_COLORS[value] ?? { bg: '#3c3a32', text: '#f9f6f2' }
  const fontSize = value >= 1000
    ? cellSize * 0.3
    : value >= 100
    ? cellSize * 0.36
    : cellSize * 0.44
  return {
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: `${fontSize}px`,
  }
}

interface GameProps {
  user: User | null
}

export default function Game2048({ user }: GameProps) {
  const supabase = createClient()

  const [dimension, setDimension] = useState(4)
  const [grid, setGrid] = useState<Grid>(() => initGrid(4))
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [keepPlaying, setKeepPlaying] = useState(false)

  // Board visual size (px) — resizable via drag
  const [boardSize, setBoardSize] = useState(460)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, size: 460 })
  const boardRef = useRef<HTMLDivElement>(null)

  // Touch swipe support
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Load high score on mount / dimension change
  useEffect(() => {
    async function loadHighScore() {
      if (user) {
        const res = await fetch(`/api/scores?dimension=${dimension}`)
        if (res.ok) {
          const data = await res.json()
          setHighScore(data.score ?? 0)
        }
      } else {
        const local = localStorage.getItem(LOCAL_HS_KEY(dimension))
        setHighScore(local ? parseInt(local) : 0)
      }
    }
    loadHighScore()
  }, [user, dimension])

  // Save score when score updates
  useEffect(() => {
    if (score <= 0) return
    if (score <= highScore) return

    setHighScore(score)

    if (user) {
      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, dimension }),
      })
    } else {
      localStorage.setItem(LOCAL_HS_KEY(dimension), score.toString())
    }
  }, [score]) // eslint-disable-line

  const newGame = useCallback((dim?: number) => {
    const d = dim ?? dimension
    setGrid(initGrid(d))
    setScore(0)
    setGameOver(false)
    setWon(false)
    setKeepPlaying(false)
  }, [dimension])

  const handleMove = useCallback((dir: Direction) => {
    if (gameOver || (won && !keepPlaying)) return
    setGrid(prev => {
      const { grid: newGrid, score: gained, moved } = move(prev, dir)
      if (!moved) return prev
      const withTile = addRandomTile(newGrid)
      setScore(s => s + gained)
      if (!keepPlaying && hasWon(withTile)) setWon(true)
      if (isGameOver(withTile)) setGameOver(true)
      return withTile
    })
  }, [gameOver, won, keepPlaying])

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down',
        ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      }
      if (map[e.key]) {
        e.preventDefault()
        handleMove(map[e.key])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleMove])

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const absDx = Math.abs(dx), absDy = Math.abs(dy)
    if (Math.max(absDx, absDy) < 20) return
    if (absDx > absDy) handleMove(dx > 0 ? 'right' : 'left')
    else handleMove(dy > 0 ? 'down' : 'up')
    touchStart.current = null
  }

  // Corner drag resize
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, size: boardSize }
  }
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ((e.clientX - dragStart.current.x) + (e.clientY - dragStart.current.y)) / 2
      const newSize = Math.min(680, Math.max(240, dragStart.current.size + delta))
      setBoardSize(newSize)
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const gap = Math.max(4, boardSize * 0.018)
  const cellSize = (boardSize - gap * (dimension + 1)) / dimension

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="game-wrap">
      {/* Header */}
      <div className="header">
        <div className="title-block">
          <h1>2048</h1>
          <p className="subtitle">Join tiles, reach <strong>2048!</strong></p>
        </div>
        <div className="scores-block">
          <div className="score-box">
            <span className="score-label">SCORE</span>
            <span className="score-val">{score}</span>
          </div>
          <div className="score-box">
            <span className="score-label">BEST</span>
            <span className="score-val">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="dim-picker">
          {[3, 4, 5, 6, 7].map(d => (
            <button
              key={d}
              className={`dim-btn ${dimension === d ? 'active' : ''}`}
              onClick={() => { setDimension(d); newGame(d) }}
            >
              {d}×{d}
            </button>
          ))}
        </div>
        <div className="right-controls">
          <button className="new-game-btn" onClick={() => newGame()}>New Game</button>
          {user ? (
            <button className="auth-btn" onClick={handleLogout} title={user.email ?? ''}>
              <span className="user-avatar">{(user.email ?? 'U')[0].toUpperCase()}</span>
              Sign out
            </button>
          ) : (
            <button className="auth-btn google" onClick={handleLogin}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in
            </button>
          )}
        </div>
      </div>

      {!user && (
        <div className="guest-notice">
          <span>👤 Playing as guest — <button onClick={handleLogin} className="inline-link">sign in with Google</button> to sync your scores</span>
        </div>
      )}

      {/* Board */}
      <div className="board-container" style={{ width: boardSize, height: boardSize }}>
        <div
          ref={boardRef}
          className="board"
          style={{
            width: boardSize,
            height: boardSize,
            padding: gap,
            gap: gap,
            gridTemplateColumns: `repeat(${dimension}, 1fr)`,
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {grid.flat().map((val, i) => (
            <div
              key={i}
              className={`tile ${val ? 'tile-filled' : 'tile-empty'} ${val === 2048 ? 'tile-2048' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: Math.max(4, cellSize * 0.08),
                ...getTileStyle(val, cellSize),
              }}
            >
              {val && (
                <span style={{ fontSize: getTileStyle(val, cellSize).fontSize }}>
                  {val}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Overlays */}
        {(gameOver || (won && !keepPlaying)) && (
          <div className="overlay">
            <div className="overlay-card">
              <div className="overlay-emoji">{won ? '🎉' : '😔'}</div>
              <h2>{won ? 'You reached 2048!' : 'Game Over'}</h2>
              <p>Score: <strong>{score}</strong></p>
              {won && (
                <button className="overlay-btn secondary" onClick={() => setKeepPlaying(true)}>
                  Keep playing
                </button>
              )}
              <button className="overlay-btn primary" onClick={() => newGame()}>
                {won ? 'Play again' : 'Try again'}
              </button>
            </div>
          </div>
        )}

        {/* Resize handle */}
        <div
          className="resize-handle"
          onMouseDown={handleDragStart}
          title="Drag to resize board"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M13 1L1 13M13 7L7 13M13 13L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <p className="hint">Arrow keys or WASD to move · Drag corner to resize</p>

      <style jsx>{`
        .game-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 24px 16px;
          min-height: 100vh;
          background: #faf8ef;
          font-family: 'Clear Sans', 'Helvetica Neue', Arial, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          max-width: 480px;
        }
        h1 {
          font-size: 64px;
          font-weight: 800;
          color: #776e65;
          line-height: 1;
          margin: 0;
        }
        .subtitle {
          color: #776e65;
          font-size: 14px;
          margin: 4px 0 0;
        }
        .scores-block {
          display: flex;
          gap: 8px;
        }
        .score-box {
          background: #bbada0;
          border-radius: 6px;
          padding: 8px 18px;
          text-align: center;
          min-width: 70px;
        }
        .score-label {
          display: block;
          color: #eee4da;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .score-val {
          display: block;
          color: white;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.3;
        }
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 480px;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dim-picker {
          display: flex;
          gap: 4px;
        }
        .dim-btn {
          background: #bbada0;
          color: #f9f6f2;
          border: none;
          border-radius: 5px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .dim-btn:hover { background: #a89080; }
        .dim-btn.active { background: #8f7a66; }
        .right-controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .new-game-btn {
          background: #8f7a66;
          color: #f9f6f2;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .new-game-btn:hover { background: #7a6858; }
        .auth-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #eee4da;
          color: #776e65;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .auth-btn:hover { background: #e0d0c0; }
        .auth-btn.google { background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        .auth-btn.google:hover { background: #f5f5f5; }
        .user-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8f7a66;
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .guest-notice {
          background: #ede0c8;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          color: #776e65;
          width: 100%;
          max-width: 480px;
          text-align: center;
        }
        .inline-link {
          background: none;
          border: none;
          color: #8f7a66;
          font-weight: 700;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font-size: inherit;
        }
        .board-container {
          position: relative;
          user-select: none;
        }
        .board {
          display: grid;
          background: #bbada0;
          border-radius: 10px;
          box-sizing: border-box;
        }
        .tile {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          transition: background-color 0.1s;
        }
        .tile-empty {
          background: rgba(238, 228, 218, 0.35);
        }
        .tile-filled {
          animation: pop 0.12s ease-out;
        }
        .tile-2048 {
          box-shadow: 0 0 20px 4px rgba(237, 194, 46, 0.6);
        }
        @keyframes pop {
          0% { transform: scale(0.85); }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(238, 228, 218, 0.75);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(3px);
          animation: fadein 0.2s ease;
        }
        @keyframes fadein { from { opacity: 0 } to { opacity: 1 } }
        .overlay-card {
          text-align: center;
          background: rgba(255,255,255,0.92);
          border-radius: 12px;
          padding: 28px 36px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
        }
        .overlay-emoji { font-size: 40px; margin-bottom: 8px; }
        .overlay-card h2 {
          font-size: 24px;
          color: #776e65;
          margin: 0 0 8px;
        }
        .overlay-card p {
          color: #776e65;
          margin: 0 0 16px;
          font-size: 15px;
        }
        .overlay-btn {
          display: block;
          width: 100%;
          border: none;
          border-radius: 6px;
          padding: 10px 20px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          transition: opacity 0.15s;
        }
        .overlay-btn:hover { opacity: 0.85; }
        .overlay-btn.primary { background: #8f7a66; color: #f9f6f2; }
        .overlay-btn.secondary { background: #bbada0; color: #f9f6f2; }
        .resize-handle {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 22px;
          height: 22px;
          cursor: nwse-resize;
          color: #bbada0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .resize-handle:hover { opacity: 1; }
        .hint {
          color: #a39080;
          font-size: 12px;
          text-align: center;
          margin: 0;
        }

        @media (max-width: 520px) {
          h1 { font-size: 44px; }
          .score-box { padding: 6px 12px; min-width: 56px; }
          .score-val { font-size: 16px; }
        }
      `}</style>
    </div>
  )
}
