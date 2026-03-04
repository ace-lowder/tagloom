"use client";

import { motion } from "framer-motion";

export default function GradientBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          x: [0, 12, 0],
          y: [0, -8, 0],
        }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -left-16 h-[320px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(251,146,60,0.55) 0%, rgba(249,115,22,0.3) 40%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -10, 0],
          y: [0, 12, 0],
        }}
        transition={{
          duration: 11,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
        className="absolute -top-8 right-0 h-[300px] w-[380px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(168,85,247,0.45) 0%, rgba(139,92,246,0.25) 40%, transparent 70%)",
          filter: "blur(52px)",
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.06, 1],
          x: [0, 6, 0],
          y: [0, 6, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute left-1/4 top-1/4 h-[260px] w-[340px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(236,72,153,0.38) 0%, rgba(244,114,182,0.2) 40%, transparent 70%)",
          filter: "blur(44px)",
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          x: [0, -8, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
        className="absolute bottom-0 right-0 h-[250px] w-[300px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(253,186,116,0.45) 0%, rgba(251,146,60,0.25) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.07, 1],
          x: [0, 10, 0],
          y: [0, -6, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
        className="absolute bottom-8 left-4 h-[200px] w-[260px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(192,132,252,0.4) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
    </div>
  );
}
