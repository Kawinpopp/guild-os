"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  label: string;
}

function animateCount(
  from: number,
  to: number,
  duration: number,
  onUpdate: (n: number) => void
) {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // ease-out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    onUpdate(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function StatCounter({ value, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState("0");
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          observer.unobserve(el);

          if (value === "24/7") {
            animateCount(0, 24, 1200, (n) => setDisplay(`${n}/7`));
            return;
          }

          const match = value.match(/^(\d+)(.*)/);
          if (!match) {
            setDisplay(value);
            return;
          }
          const target = parseInt(match[1]);
          const suffix = match[2];
          animateCount(0, target, 1200, (n) => setDisplay(`${n}${suffix}`));
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display font-bold text-4xl md:text-6xl text-gradient-primary tabular-nums">
        {display}
      </div>
      <div className="mt-2 text-xs md:text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
