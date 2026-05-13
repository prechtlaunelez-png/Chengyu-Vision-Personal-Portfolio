import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ExternalLink, Play, X, Volume2, VolumeX, Pause, RefreshCw } from "lucide-react";
import { useApp } from "../AppContext";
import { Project } from "../types";
import { getDirectUrl, getEmbedUrl } from "../lib/utils";

export default function Portfolio() {
  const { lang, projects } = useApp();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <section id="portfolio" className="py-32 px-6 md:px-12 lg:px-24 bg-black relative">
      <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="text-neon-blue text-xs uppercase tracking-[0.4em] mb-4"
          >
            {lang === 'zh' ? '作品精选' : 'Selected Works'}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extralight italic uppercase tracking-tighter"
          >
            {lang === 'zh' ? (
              <>
                 空间 <span className="font-black not-italic text-white">档案</span>
              </>
            ) : (
              <>
                Spatial <span className="font-black not-italic text-white">Archives</span>
              </>
            )}
          </motion.h2>
        </div>
        <motion.div
           initial={{ opacity: 0 }}
           whileInView={{ opacity: 1 }}
           className="max-w-md text-white/50 text-sm leading-relaxed text-right font-light"
        >
          {lang === 'zh' 
            ? '通过实时技术和数字工艺探索的一系列环境、建筑概念和交互研究。'
            : 'A curated collection of environments, architectural concepts, and interaction studies explored through real-time technology and digital craftsmanship.'
          }
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        {projects.map((project, i) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            index={i} 
            lang={lang} 
            onOpen={() => setSelectedProject(project)}
          />
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-24 text-center border border-dashed border-white/10 rounded-3xl">
             <p className="text-white/20 uppercase tracking-[0.5em] text-xs">Waiting for Transmission...</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedProject && (
          <VideoModal 
            project={selectedProject} 
            lang={lang}
            onClose={() => setSelectedProject(null)} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ProjectCard({ project, index, lang, onOpen }: { project: Project; index: number, lang: string, onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index % 2 * 0.2 }}
      className="group relative cursor-pointer"
      onClick={onOpen}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-zinc-900 border border-white/5">
        {project.type === 'video' ? (
          project.mediaUrl || project.coverUrl ? (
            <video 
               src={getDirectUrl(project.mediaUrl)}
               poster={getDirectUrl(project.coverUrl || '')}
               autoPlay 
               muted 
               loop 
               playsInline
               referrerPolicy="no-referrer"
               className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 filter grayscale group-hover:grayscale-0 shadow-2xl"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/20 text-[10px] uppercase tracking-widest">
              Missing Media
            </div>
          )
        ) : (
          <img
            src={getDirectUrl(project.mediaUrl) || "https://images.unsplash.com/photo-1614728263952-84ea206f99b6?auto=format&fit=crop&q=80&w=2000"}
            alt={project.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 filter grayscale group-hover:grayscale-0 shadow-2xl"
          />
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
           <div className="flex justify-between items-end">
              <div className="flex flex-wrap gap-2 mb-4">
                {project.tags.map((tag: string) => (
                  <span key={tag} className="text-[9px] uppercase tracking-widest px-2 py-1 bg-white/10 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              <motion.div 
                whileHover={{ scale: 1.1 }}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mb-4"
              >
                {project.type === 'video' ? <Play size={20} fill="black" /> : <ExternalLink size={20} />}
              </motion.div>
           </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between items-start px-2">
        <div>
          <h3 className="text-2xl font-display font-medium uppercase tracking-tighter mb-2 group-hover:text-glow group-hover:text-neon-blue transition-all">
            {lang === 'zh' ? project.title : project.titleEn}
          </h3>
          <p className="text-xs uppercase tracking-widest text-white/40">
            {lang === 'zh' ? project.category : project.categoryEn}
          </p>
        </div>
        <div className="text-white/20 group-hover:text-white transition-colors pt-1">
          <ExternalLink size={18} />
        </div>
      </div>
    </motion.div>
  );
}

function VideoModal({ project, lang, onClose }: { project: Project, lang: string, onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmbed, setShowEmbed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const embedUrl = project.mediaUrl ? getEmbedUrl(project.mediaUrl) : null;
  
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        }).catch(err => {
          console.warn("Play failed:", err);
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.warn("Fallback play failed:", e));
          }
        });
      }
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Initial setup: try to play (likely muted first)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && !isPlaying && !showEmbed) {
         videoRef.current.play().then(() => {
           setIsPlaying(true);
         }).catch(() => {
           // Silently fail initial autoplay if blocked
         });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [showEmbed]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-3xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative transition-all duration-500 ease-out bg-black overflow-hidden flex flex-col ${
          isFullscreen ? 'w-screen h-screen rounded-0' : 'w-full max-w-6xl aspect-video rounded-xl border border-white/10 shadow-3xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-6 right-6 z-50 flex gap-4">
           {isLoading && (
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                <RefreshCw size={14} className="animate-spin text-neon-blue" />
                <span className="text-[10px] uppercase tracking-widest text-white/50">{lang === 'zh' ? '正在加载数据...' : 'Buffering Data...'}</span>
              </div>
           )}
           {embedUrl && !showEmbed && (
             <button 
              onClick={() => setShowEmbed(true)}
              className="px-4 py-2 bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue rounded-full border border-neon-blue/30 text-[10px] uppercase tracking-widest transition-all"
             >
               {lang === 'zh' ? '加载失败？点击使用预览模式' : 'Load failed? Try Preview Mode'}
             </button>
           )}
           <button 
             onClick={() => setIsFullscreen(!isFullscreen)}
             className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors text-white"
             title="Toggle Fullscreen"
           >
             <motion.div animate={{ scale: isFullscreen ? 0.8 : 1 }}>
               {isFullscreen ? <X size={20} /> : <ExternalLink size={20} />}
             </motion.div>
           </button>
           <button 
             onClick={onClose}
             className="p-2 bg-black/40 hover:bg-black/60 rounded-full border border-white/10 transition-colors text-white"
           >
             <X size={24} />
           </button>
        </div>

        {project.type === 'video' ? (
          <div className="relative flex-1 group/player bg-black overflow-hidden">
            {showEmbed && embedUrl ? (
              <iframe 
                src={embedUrl} 
                className="w-full h-full border-0" 
                allow="autoplay; fullscreen"
                onLoad={() => setIsLoading(false)}
              />
            ) : project.mediaUrl ? (
              <video 
                ref={videoRef}
                src={getDirectUrl(project.mediaUrl)}
                poster={getDirectUrl(project.coverUrl || '')}
                muted={isMuted}
                loop 
                playsInline
                referrerPolicy="no-referrer"
                className={`w-full h-full cursor-pointer ${isFullscreen ? 'object-contain' : 'object-cover'}`}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsLoading(true)}
                onCanPlay={() => setIsLoading(false)}
                onLoadStart={() => setIsLoading(true)}
                onLoadedData={() => setIsLoading(false)}
                onError={(e) => {
                  console.warn("Video failed to load: " + project.mediaUrl);
                  setIsLoading(false);
                  if (project.mediaUrl.includes('google.com')) {
                    setShowEmbed(true);
                  }
                }}
                onClick={togglePlay}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">No Video Available</div>
            )}
            
            {/* Custom Controls Overlay (Only if not in embed mode) */}
            {!showEmbed && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/player:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8 pointer-events-none">
                <div className="flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={togglePlay}
                        className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                      >
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                      </button>
                      <div className="flex items-center gap-3 bg-black/40 px-3 py-2 rounded-full border border-white/10 backdrop-blur-md">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMuted(!isMuted);
                              if (isMuted) {
                                if (videoRef.current) videoRef.current.muted = false;
                                setIsPlaying(true);
                              }
                            }}
                            className={`p-2 rounded-full transition-all ${!isMuted ? 'text-neon-blue' : 'text-white/40'}`}
                          >
                            {!isMuted ? <Volume2 size={20} /> : <VolumeX size={20} />}
                          </button>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1" 
                            defaultValue="0.5"
                            className="w-20 accent-neon-blue h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                            onChange={(e) => {
                              if (videoRef.current) {
                                videoRef.current.volume = parseFloat(e.target.value);
                                if (videoRef.current.volume > 0) {
                                  setIsMuted(false);
                                  videoRef.current.muted = false;
                                }
                              }
                            }}
                            onClick={e => e.stopPropagation()}
                          />
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <h4 className="text-xl font-display uppercase tracking-widest text-white mb-1 drop-shadow-md">
                        {lang === 'zh' ? project.title : project.titleEn}
                      </h4>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-neon-blue font-bold">
                        {lang === 'zh' ? project.category : project.categoryEn}
                      </p>
                    </div>
                </div>
              </div>
            )}
            
            {/* Initial Play with Sound Prompt if muted and paused by browser */}
            {!isPlaying && !isLoading && !showEmbed && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer backdrop-blur-[2px]" 
                onClick={() => {
                  setIsMuted(false);
                  setIsPlaying(true);
                }}
              >
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex flex-col items-center gap-6"
                 >
                    <div className="p-10 bg-white text-black rounded-full shadow-3xl hover:scale-105 transition-transform">
                       <Play size={48} fill="currentColor" className="ml-2" />
                    </div>
                    <div className="bg-black/60 px-6 py-2 rounded-full border border-white/20 backdrop-blur-md">
                       <span className="text-xs uppercase tracking-[0.2em] font-bold text-white">
                         {lang === 'zh' ? '点击播放（包含音频）' : 'Click to Play with Audio'}
                       </span>
                    </div>
                 </motion.div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <img 
              src={getDirectUrl(project.mediaUrl)} 
              alt={project.title} 
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}


