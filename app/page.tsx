import PomodoroTimer from "@/components/pomodoro-timer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ora Timer",
  description:
    "An advanced pomodoro timer that accumulates break time as you work",
};

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <PomodoroTimer />
      <a href="/history" className="mt-8 text-blue-600 hover:underline">
        View today\'s history
      </a>
    </main>
  );
}
