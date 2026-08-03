"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarClock } from "lucide-react";

export default function TimetableGeneratingAnimation({
  messages,
}: {
  messages: string[];
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 py-16">
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]"
        animate={reduceMotion ? {} : { scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <CalendarClock size={26} strokeWidth={1.6} />
      </motion.div>
      <motion.p
        key={index}
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="text-[13px] text-[var(--muted-foreground)]"
      >
        {messages[index]}
      </motion.p>
    </div>
  );
}
