import { motion, useScroll, useTransform } from "motion/react";
import { ArrowDown, PlayCircle } from "lucide-react";
import { useRef } from "react";
import { useApp } from "../AppContext";

export default function Hero() {
  const { lang, config } = useApp();
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const parallaxHyper = useTransform(scrollY, [0, 500], [0, -50]);
  const parallaxDesigner = useTransform(scrollY, [0, 500], [0, 30]);

  return (
    <section 
      id="hero" 
      ref={containerRef}
      className="relative h-screen flex flex-col items-center lg:items-start justify-center overflow-hidden px-6 md:px-12 lg:px-24"
    >
      <motion.div 
        style={{ y, opacity, scale }}
        className="z-10 lg:w-1/2"
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-white/60 font-light">
            Digital / {lang === 'zh' ? '艺术家' : 'Artist'} / 001
          </span>
        </motion.div>

        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.2, delay: 0.2 }}
           className="space-y-2 md:space-y-4 mb-10"
        >
          <motion.h1 style={{ y: parallaxHyper }} className="text-[55px] md:text-[100px] font-extralight tracking-tighter leading-none italic opacity-80 uppercase block">
            Hyper
          </motion.h1>
          <motion.h1 style={{ y: parallaxDesigner }} className="text-[55px] md:text-[100px] font-black not-italic tracking-tighter leading-none uppercase block">
            Designer
          </motion.h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="max-w-sm text-gray-400 text-sm leading-relaxed tracking-wide mb-12"
        >
          {lang === 'zh' 
            ? `来自${config.university}的${config.major}。致力于通过虚幻引擎渲染、3D超写实建模与电影级视觉叙事推动空间设计的边界。`
            : `From ${config.universityEn}, ${config.majorEn}. Committed to pushing the boundaries of spatial design through Unreal Engine rendering, Hyper-realistic 3D modeling, and cinematic visual storytelling.`
          }
        </motion.p>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 1.2 }}
           className="flex flex-wrap items-center gap-6"
        >
          <button 
            onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 bg-white text-black text-[10px] font-bold tracking-[0.2em] uppercase rounded-full hover:scale-105 transition-transform"
          >
            {lang === 'zh' ? '探索作品' : 'Explore Work'}
          </button>
          <button 
            onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-8 py-3 border border-white/20 text-white text-[10px] font-bold tracking-[0.2em] uppercase rounded-full backdrop-blur-sm hover:bg-white/5 transition-all group"
          >
            <PlayCircle size={14} className="group-hover:text-neon-blue transition-colors" />
            {lang === 'zh' ? '播放作品集' : 'Play Reel'}
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 lg:left-24 lg:translate-x-0 flex flex-col items-center lg:items-start gap-4 text-white/30"
      >
        <span className="text-[8px] uppercase tracking-[0.3em]">{lang === 'zh' ? '滚动探索' : 'Scroll to Explore'}</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ArrowDown size={14} />
        </motion.div>
      </motion.div>

      <div className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 vertical-rl rotate-180 hidden md:flex items-center gap-6 opacity-20 transition-opacity hover:opacity-100">
        <span className="text-[8px] uppercase tracking-[0.5em] whitespace-nowrap">
           Immersive Environments / Concept Visuals / 3D Animation
        </span>
        <div className="w-[1px] h-24 bg-white"></div>
      </div>
    </section>
  );
}

