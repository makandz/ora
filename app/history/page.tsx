'use client'

import { useEffect, useState } from 'react'

interface Session {
  type: 'working' | 'break'
  duration: number
  timestamp: number
}

const RESET_HOUR = 5

export default function HistoryPage() {
  const [history, setHistory] = useState<Session[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('pomodoroData')
    if (!saved) return
    try {
      const data = JSON.parse(saved)
      const sessions: Session[] = data.history || []

      const now = new Date()
      const boundary = new Date()
      boundary.setHours(RESET_HOUR, 0, 0, 0)
      if (now.getHours() < RESET_HOUR) {
        boundary.setDate(boundary.getDate() - 1)
      }

      setHistory(sessions.filter((s) => s.timestamp >= boundary.getTime()))
    } catch {
      // ignore parse errors
    }
  }, [])

  const format = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const secs = sec % 60
    return `${hrs > 0 ? `${hrs}:` : ''}${mins
      .toString()
      .padStart(hrs > 0 ? 2 : 1, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Today's History</h1>
      {history.length === 0 ? (
        <p className="text-neutral-500">No sessions yet.</p>
      ) : (
        <ul className="w-full max-w-md space-y-4">
          {history.map((session, idx) => (
            <li
              key={idx}
              className="flex justify-between border-b pb-2 text-lg"
            >
              <span className="capitalize">{session.type}</span>
              <span>{format(session.duration)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

