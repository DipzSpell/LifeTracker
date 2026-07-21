/** Reveal.jsx — small shared fade-up-on-scroll wrapper for landing sections. */
import { motion, useReducedMotion } from "framer-motion";

export default function Reveal({ children, delay = 0, className = "", as = "div", y = 18 }) {
  const reduced = useReducedMotion();
  const Comp = motion[as] || motion.div;
  return (
    <Comp
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </Comp>
  );
}
