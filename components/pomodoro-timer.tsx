"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimerState = "idle" | "working" | "break";

interface TimerData {
  workTime: number;
  breakTime: number;
  totalWorkToday: number;
  lastDate: string;
  cycleCount: number;
}

const WORK_TO_BREAK_RATIO = 0.25; // 25% of work time becomes break time
const CYCLE_THRESHOLD = 60 * 60; // 60 minutes in seconds
const CYCLE_BONUS = 15 * 60; // 15 minutes in seconds
const RESET_HOUR = 5; // Reset at 5am

export default function PomodoroTimer() {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [workTime, setWorkTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalWorkToday, setTotalWorkToday] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Store the initial break time when starting a work session
  const [initialBreakTime, setInitialBreakTime] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio with better error handling
  useEffect(() => {
    try {
      // Create audio context for a simple beep sound instead of relying on an external file
      const createBeepSound = () => {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn("AudioContext not supported in this browser");
          return;
        }

        const audioContext = new AudioContext();

        // Function to play a beep
        return () => {
          try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = "sine";
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.5;

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();

            // Fade out
            gainNode.gain.exponentialRampToValueAtTime(
              0.001,
              audioContext.currentTime + 1
            );

            // Stop after 1 second
            setTimeout(() => {
              oscillator.stop();
            }, 1000);
          } catch (e) {
            console.error("Error playing beep:", e);
          }
        };
      };

      // Store the beep function in the ref
      const beepFunction = createBeepSound();
      if (beepFunction) {
        audioRef.current = {
          play: beepFunction,
          pause: () => {},
        } as any;
        setAudioLoaded(true);
      }
    } catch (e) {
      console.error("Error initializing audio:", e);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Load saved data
  useEffect(() => {
    const loadSavedData = () => {
      const savedData = localStorage.getItem("pomodoroData");
      if (savedData) {
        const data: TimerData = JSON.parse(savedData);

        // Check if we need to reset for a new day
        const today = new Date().toDateString();
        const lastDate = data.lastDate;

        if (lastDate !== today) {
          const now = new Date();
          // If it's past 5am, reset the cycle count
          if (now.getHours() >= RESET_HOUR) {
            setCycleCount(0);
            setTotalWorkToday(0);
          } else {
            setCycleCount(data.cycleCount);
            setTotalWorkToday(data.totalWorkToday);
          }
        } else {
          setCycleCount(data.cycleCount);
          setTotalWorkToday(data.totalWorkToday);
        }

        setWorkTime(data.workTime);
        setBreakTime(data.breakTime);
      }
      setIsInitialized(true);
    };

    loadSavedData();
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (!isInitialized) return;

    const saveData = () => {
      const data: TimerData = {
        workTime,
        breakTime,
        totalWorkToday,
        lastDate: new Date().toDateString(),
        cycleCount,
      };
      localStorage.setItem("pomodoroData", JSON.stringify(data));
    };

    saveData();
  }, [workTime, breakTime, totalWorkToday, cycleCount, isInitialized]);

  // Timer logic
  useEffect(() => {
    if (timerState === "idle") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      startTimeRef.current = null;
      setElapsedTime(0);
      return;
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(elapsed);

        if (timerState === "working") {
          // Calculate earned break time in real-time
          // FIXED: Only add the proportional break time, not compounding
          const earnedBreakTime = Math.floor(elapsed * WORK_TO_BREAK_RATIO);
          setBreakTime(initialBreakTime + earnedBreakTime);

          // Check if we've reached a cycle threshold
          const newTotalWork = totalWorkToday + elapsed;
          const previousCycles = Math.floor(totalWorkToday / CYCLE_THRESHOLD);
          const currentCycles = Math.floor(newTotalWork / CYCLE_THRESHOLD);

          if (currentCycles > previousCycles) {
            // Award bonus break time
            setBreakTime((prev) => prev + CYCLE_BONUS);
            setCycleCount((prev) => prev + 1);
          }
        } else if (timerState === "break") {
          // Check if break time is over
          if (elapsed >= breakTime) {
            setTimerState("idle");
            setBreakTime(0);

            // FIXED: Remove dark mode when break ends
            document.body.classList.remove("dark-mode");

            // Play sound and show notification with error handling
            if (audioRef.current && audioLoaded) {
              try {
                audioRef.current.play();
              } catch (e) {
                console.warn("Could not play audio notification");
              }
            }

            // Show notification if supported
            try {
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("Break time is over!", {
                  body: "Time to get back to work!",
                  icon: "/favicon.ico",
                });
              }
            } catch (e) {
              console.warn("Could not show notification:", e);
            }
          }
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerState, breakTime, totalWorkToday, initialBreakTime, audioLoaded]);

  // Request notification permission
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const startWorking = () => {
    // Store the current break time before starting
    setInitialBreakTime(breakTime);

    setTimerState("working");
    startTimeRef.current = Date.now();

    // Apply dark mode to body
    document.body.classList.add("dark-mode");
  };

  const startBreak = () => {
    if (breakTime <= 0) {
      return;
    }

    setTimerState("break");
    startTimeRef.current = Date.now();

    // Keep dark mode for break
    document.body.classList.add("dark-mode");
  };

  const pauseTimer = () => {
    if (timerState === "working") {
      // Update the total work time
      setWorkTime((prev) => prev + elapsedTime);
      setTotalWorkToday((prev) => prev + elapsedTime);
    } else if (timerState === "break") {
      // Subtract used break time from total break time
      setBreakTime((prev) => Math.max(0, prev - elapsedTime));
    }

    setTimerState("idle");

    // Remove dark mode
    document.body.classList.remove("dark-mode");
  };

  const resetTimer = () => {
    setTimerState("idle");
    setElapsedTime(0);

    // Remove dark mode
    document.body.classList.remove("dark-mode");
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hrs > 0 ? `${hrs}:` : ""}${mins
      .toString()
      .padStart(hrs > 0 ? 2 : 1, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateProgress = () => {
    if (timerState === "break" && breakTime > 0) {
      return (elapsedTime / breakTime) * 100;
    }
    return 0;
  };

  const isActive = timerState !== "idle";

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center w-full max-w-md">
        <motion.div
          className="flex flex-col items-center justify-center"
          layout
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.5,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={timerState}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-2"
            >
              {timerState === "idle" ? (
                <div className="text-neutral-500 font-medium text-xl">
                  Ready to work?
                </div>
              ) : timerState === "working" ? (
                <div className="text-emerald-500 font-bold text-xl">
                  Working
                </div>
              ) : (
                <div className="text-blue-500 font-bold text-xl">
                  Taking a break
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <motion.div
            layout
            className="text-7xl font-bold text-center my-8 font-manrope tabular-nums"
          >
            {formatTime(elapsedTime)}
          </motion.div>

          {timerState === "break" && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              className="w-full max-w-xs mb-8"
            >
              <Progress value={calculateProgress()} className="h-2" />
            </motion.div>
          )}

          <motion.div className="flex gap-4 mb-8" layout>
            {timerState === "idle" ? (
              <>
                <Button
                  onClick={startWorking}
                  className="bg-emerald-600 hover:bg-emerald-700 text-base font-bold px-6 py-2"
                >
                  <Play className="mr-2 h-4 w-4" /> Work
                </Button>
                <Button
                  onClick={startBreak}
                  className="bg-blue-600 hover:bg-blue-700 text-base font-bold px-6 py-2"
                  disabled={breakTime <= 0}
                >
                  <Coffee className="mr-2 h-4 w-4" /> Break
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={pauseTimer}
                  className="dark-mode-button text-base font-bold px-6 py-2"
                  variant="outline"
                >
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button
                  onClick={resetTimer}
                  className="text-base font-bold px-6 py-2"
                  variant="destructive"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </>
            )}
          </motion.div>

          <AnimatePresence>
            {!isActive && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{
                  duration: 0.5,
                  height: { duration: 0.4 },
                  opacity: { duration: 0.3 },
                }}
                className="overflow-hidden w-full"
              >
                <div className="grid grid-cols-2 gap-8 mb-8 w-full max-w-xs mx-auto">
                  <div className="text-center">
                    <div className="text-sm text-neutral-500 mb-1">
                      Work Time
                    </div>
                    <div className="text-2xl font-bold">
                      {formatTime(workTime)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-neutral-500 mb-1">
                      Break Time
                    </div>
                    <div className="text-2xl font-bold">
                      {formatTime(breakTime)}
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm text-neutral-500 mt-4">
                  <div className="mb-1">
                    Completed cycles today:{" "}
                    <span className="font-bold">{cycleCount}</span>
                  </div>
                  <div>
                    Total work today:{" "}
                    <span className="font-bold">
                      {formatTime(totalWorkToday)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
