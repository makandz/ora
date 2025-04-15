import PomodoroTimer from "@/components/pomodoro-timer";
import { useWakeLock } from "@/hooks/useWakelock";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flow Timer",
  description:
    "An advanced pomodoro timer that accumulates break time as you work",
};

export default function Home() {
  useWakeLock();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <PomodoroTimer />
    </main>
  );
}
