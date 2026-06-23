"use client";

// Extracted from the Server Component landing page because onMouseEnter,
// onMouseLeave, and onAnimationEnd are browser event handlers — they can
// only exist in Client Components. Everything else on the landing page
// stays server-rendered; only this one interactive span is a client island.
// Splits "a rhythm" into individual animated characters.
// Each letter climbs up with a stagger delay, vibrates while elevated,
// then returns to rest — creating a wave + shake sequence on hover.

// import { useState } from "react";
import { motion } from "motion/react";

const TEXT = "a rhythm.";
const CHARS = TEXT.split("");

export function RhythmText() {
  // const [hovered, setHovered] = useState(false);

  return (
    <span
      className="inline-block cursor-default select-none"
      // onMouseEnter={() => setHovered(true)}
      // onMouseLeave={() => setHovered(false)}
      aria-label={TEXT}
    >
      {CHARS.map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          // inline-block is required — CSS transforms don't apply to inline elements
          className="inline-block"
          style={{
            // Gradient applied per-letter. Each character shows the full
            // green→gold diagonal, giving a gem-like shimmer on each letter.
            backgroundImage: "linear-gradient(135deg, #52B788 0%, #C9A96E 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          animate={{
            y: [0, -14, -12, -14, -10, -14, 0],
            x: [0,   0,  -4,   4,  -3,   2, 0],
          }}
          transition={{
            // CHANGED: repeat: Infinity makes this loop forever automatically.
            // repeatDelay pauses 2.5s between each full cycle so it breathes.
            // The stagger (delay: i * 0.045) creates the left-to-right wave.
            delay: i * 0.045,
            duration: 0.7,
            times: [0, 0.2, 0.35, 0.5, 0.62, 0.75, 1],
            ease: "easeOut",
            repeat: Infinity,
            repeatDelay: 1.5,
          }}
          // variants={{
          //   idle: { y: 0, x: 0 },
          //   hover: {
          //     // Phase 1 (0→0.2): letter climbs up to -14px
          //     // Phase 2 (0.2→0.7): vibrates horizontally while elevated
          //     // Phase 3 (0.7→1): returns to rest
          //     y: [0, -14, -12, -14, -10, -14, 0],
          //     x: [0,   0,  -4,   4,  -3,   2, 0],
          //     transition: {
          //       // Stagger: each letter starts 45ms after the previous one
          //       delay: i * 0.045,
          //       duration: 0.7,
          //       times: [0, 0.2, 0.35, 0.5, 0.62, 0.75, 1],
          //       ease: "easeOut",
          //     },
          //   },
          // }}
          // animate={hovered ? "hover" : "idle"}
        >
          {/* Non-breaking space prevents the space character from collapsing */}
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}