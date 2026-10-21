"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type RevealProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "whileInView" | "whileHover" | "transition"
> & {
  as?: "div" | "section";
  delay?: number;
  onView?: boolean;
  lift?: boolean;
};

/** One entrance per mount; long forms retain their natural document height. */
export function MotionReveal({
  children,
  as = "div",
  delay = 0,
  onView = true,
  lift = false,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();
  const Component = as === "section" ? motion.section : motion.div;

  return (
    <Component
      {...props}
      data-motion="reveal"
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0 },
      }}
      initial={reduce ? false : "hidden"}
      animate={onView && !reduce ? undefined : "visible"}
      whileInView={onView && !reduce ? "visible" : undefined}
      viewport={{ once: true, amount: "some" }}
      whileHover={
        lift && !reduce
          ? { y: -3, transition: { duration: 0.2, delay: 0, ease } }
          : undefined
      }
      transition={{
        duration: reduce ? 0 : 0.5,
        delay: reduce ? 0 : delay,
        ease,
      }}
    >
      {children}
    </Component>
  );
}

/** Key only the visual page, leaving the navigation and workspace mounted. */
export function MotionPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      className="motion-page"
      data-motion="page"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease }}
    >
      {children}
    </motion.div>
  );
}

export function MotionStep({
  children,
  step,
}: {
  children: ReactNode;
  step: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={step}
      className="motion-step"
      data-motion="step"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Inherit the panel trigger: a collapsed fill cannot observe its own viewport. */
export function MotionFill({
  style,
  vertical = false,
  delay = 0,
}: {
  style: CSSProperties;
  vertical?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const scale = vertical ? "scaleY" : "scaleX";

  return (
    <motion.div
      data-motion="fill"
      style={{ ...style, transformOrigin: vertical ? "bottom" : "left" }}
      variants={{ hidden: { [scale]: 0 }, visible: { [scale]: 1 } }}
      transition={{
        duration: reduce ? 0 : 0.7,
        delay: reduce ? 0 : delay,
        ease,
      }}
    />
  );
}
