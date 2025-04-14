import PomodoroTimer from "@/components/pomodoro-timer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Flow Timer",
  description: "An advanced pomodoro timer that accumulates break time as you work",
}

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <PomodoroTimer />
    </main>
  )
}
