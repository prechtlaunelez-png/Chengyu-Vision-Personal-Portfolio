/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./components/Navbar";
import Scene3D from "./components/Scene3D";
import Hero from "./sections/Hero";
import Portfolio from "./sections/Portfolio";
import About from "./sections/About";
import Showcase3D from "./components/Showcase3D";
import Contact from "./sections/Contact";
import AdminPanel from "./components/AdminPanel";
import { AppProvider, useApp } from "./AppContext";

function AppContent() {
  const { isInitialLoad } = useApp();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative min-h-screen selection:bg-neon-blue/30 selection:text-white overflow-x-hidden">
      <AnimatePresence>
        {isInitialLoad && (
          <motion.div
            exit={{ opacity: 0, filter: "blur(20px)" }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-12 text-center"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 120 }}
              className="h-[1px] bg-white mb-6"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <h2 className="text-sm uppercase tracking-[0.5em] font-bold text-white">Initializing Interface</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Protocol: Neural Environment Design</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Cursor */}
       <motion.div
        className="hidden md:block fixed w-8 h-8 border border-white/20 rounded-full pointer-events-none z-[999] bg-white/5"
        animate={{
          x: mousePos.x - 16,
          y: mousePos.y - 16,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.2 }}
      />
      <motion.div
        className="hidden md:block fixed w-1.5 h-1.5 bg-neon-blue rounded-full pointer-events-none z-[999] shadow-[0_0_10px_#00E5FF]"
        animate={{
          x: mousePos.x - 3,
          y: mousePos.y - 3,
        }}
        transition={{ type: "spring", damping: 40, stiffness: 600, mass: 0.1 }}
      />

      <Navbar onOpenAdmin={() => setIsAdminOpen(true)} />
      <Scene3D />
      
      <main>
        <Hero />
        <Portfolio />
        <About />
        <Showcase3D />
        <Contact />
      </main>

      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      {/* Background Glows and Grid */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-5 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#1a2b4a] rounded-full blur-[150px] opacity-20 animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[500px] bg-[#2d1b4d] rounded-full blur-[120px] opacity-15 animate-pulse" />
        <div className="absolute inset-0 cinematic-grid opacity-[0.01]" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

