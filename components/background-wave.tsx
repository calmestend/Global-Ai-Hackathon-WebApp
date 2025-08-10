"use client";
import { motion } from "framer-motion";

export const BackgroundWave = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[-1] hidden md:block pointer-events-none"
      style={{
        background: `
          repeating-linear-gradient(135deg, #232526 0px, #232526 2px, #1a1a1a 4px, #232526 6px),
          linear-gradient(135deg, #232526 0%, #0f0f0f 100%)
        `
      }}
    />
  );
};
