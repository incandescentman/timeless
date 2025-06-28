import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated Day Row
export const AnimatedDayRow = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 0.8
      }}
      layout
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Animated Note Item
export const AnimatedNoteItem = ({ children, isNew = false, ...props }) => {
  return (
    <motion.div
      initial={isNew ? { opacity: 0, scale: 0.8, y: 10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: -20 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.5
      }}
      layout
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Animated Month Header
export const AnimatedMonthHeader = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Floating Textarea Animation
export const AnimatedFloatingTextarea = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.3
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Loading Spinner
export const AnimatedSpinner = ({ size = 40, color = "#4299e1", ...props }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        width: size,
        height: size,
        border: `3px solid transparent`,
        borderTop: `3px solid ${color}`,
        borderRadius: '50%'
      }}
      {...props}
    />
  );
};

// Toast Animation
export const AnimatedToast = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Page Transition
export const PageTransition = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1]
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Stagger Container (for animating lists)
export const StaggerContainer = ({ children, staggerDelay = 0.05, ...props }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Stagger Item (child of StaggerContainer)
export const StaggerItem = ({ children, ...props }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Ripple Effect
export const RippleEffect = ({ children, ...props }) => {
  return (
    <motion.div
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Smooth Scroll Container
export const SmoothScrollContainer = ({ children, ...props }) => {
  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Keyboard Navigation Highlight
export const KeyboardHighlight = ({ isActive, children, ...props }) => {
  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive 
          ? "0 0 0 2px #4299e1, 0 0 15px rgba(66, 153, 225, 0.3)"
          : "none"
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Glassmorphism Effect
export const GlassmorphismContainer = ({ children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      transition={{ duration: 0.3 }}
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Today Pulse Animation
export const TodayPulse = ({ children, ...props }) => {
  return (
    <motion.div
      animate={{
        boxShadow: [
          "0 0 0 0 rgba(229, 62, 62, 0.4)",
          "0 0 15px 10px rgba(229, 62, 62, 0.2)",
          "0 0 0 0 rgba(229, 62, 62, 0)"
        ]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Smooth Height Animation
export const SmoothHeightContainer = ({ children, ...props }) => {
  return (
    <motion.div
      layout
      transition={{
        layout: {
          type: "spring",
          stiffness: 300,
          damping: 30
        }
      }}
      {...props}
    >
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </motion.div>
  );
};

// Custom Easing Curves (matching vanilla implementation)
export const customEasing = {
  // Smooth scroll easing
  smoothScroll: [0.25, 0.46, 0.45, 0.94],
  // Gentle bounce
  gentleBounce: [0.68, -0.55, 0.265, 1.55],
  // Quick ease out
  quickEase: [0.22, 1, 0.36, 1],
  // Calendar navigation
  calendarNav: [0.4, 0, 0.2, 1]
};

// Wrap components with AnimatePresence for exit animations
export const AnimatePresenceWrapper = ({ children, mode = "wait", ...props }) => {
  return (
    <AnimatePresence mode={mode} {...props}>
      {children}
    </AnimatePresence>
  );
};

export default {
  AnimatedDayRow,
  AnimatedNoteItem,
  AnimatedMonthHeader,
  AnimatedFloatingTextarea,
  AnimatedSpinner,
  AnimatedToast,
  PageTransition,
  StaggerContainer,
  StaggerItem,
  RippleEffect,
  SmoothScrollContainer,
  KeyboardHighlight,
  GlassmorphismContainer,
  TodayPulse,
  SmoothHeightContainer,
  AnimatePresenceWrapper,
  customEasing
};