import { motion, AnimatePresence } from "motion/react";
import { NAV_LINKS } from "../constants";
import { cn } from "../lib/utils";
import { Menu, X, Globe, Settings } from "lucide-react";
import { useState } from "react";
import { useApp } from "../AppContext";

export default function Navbar({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, setLang, config } = useApp();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-8 md:px-12 flex justify-between items-center bg-gradient-to-b from-black/20 to-transparent backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        {config.logo ? (
          <img src={config.logo} alt="Logo" className="h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 border border-white/20 flex items-center justify-center rounded-lg">
             <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
        <span className="text-[10px] md:text-xs tracking-[0.4em] font-light uppercase text-white/80">
          {lang === 'zh' ? config.author : config.authorEn} / Digital
        </span>
      </motion.div>

      {/* Desktop Menu */}
      <div className="hidden md:flex gap-10 items-center">
        {NAV_LINKS.map((link, i) => (
          <motion.a
            key={link.name}
            href={link.href}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "text-[9px] uppercase tracking-[0.3em] text-white/50 hover:text-white transition-opacity",
              link.nameEn === "Contact" && "border border-white/20 px-4 py-1 rounded-full"
            )}
          >
            {lang === 'zh' ? link.name : link.nameEn}
          </motion.a>
        ))}
        
        <div className="h-4 w-[1px] bg-white/10" />
        
        <button 
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors"
        >
          <Globe size={12} />
          {lang === 'zh' ? 'EN' : '中文'}
        </button>

        <button 
          onClick={onOpenAdmin}
          className="p-2 text-white/10 hover:text-white/40 transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Mobile Toggle */}
      <div className="md:hidden flex items-center gap-6">
        <button 
           onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
           className="text-[10px] text-white/40 font-bold"
        >
          {lang === 'zh' ? 'EN' : '中文'}
        </button>
        <button className="text-white/60" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black z-40 flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-xl font-display uppercase tracking-[0.3em]"
              >
                {lang === 'zh' ? link.name : link.nameEn}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

