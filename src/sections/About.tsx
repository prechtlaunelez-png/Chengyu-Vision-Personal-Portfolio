import { motion } from "motion/react";
import { SKILLS } from "../constants";
import * as Icons from "lucide-react";
import { useApp } from "../AppContext";

export default function About() {
  const { lang, config } = useApp();

  return (
    <section id="about" className="py-32 px-6 md:px-12 lg:px-24 bg-zinc-950/50">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           whileInView={{ opacity: 1, scale: 1 }}
           className="relative aspect-square rounded-3xl overflow-hidden border border-white/5"
        >
          <img 
            src={config.profilePic || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1000"} 
            alt="Profile" 
            className="w-full h-full object-cover opacity-50 grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          
          <div className="absolute top-8 left-8 flex flex-col gap-2">
            <div className="w-12 h-[1px] bg-neon-blue" />
            <span className="text-[10px] uppercase tracking-[0.4em] font-medium">Subject 01</span>
          </div>
          
          <div className="absolute bottom-8 right-8 text-right">
             <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-1">Status</p>
             <p className="text-xs uppercase tracking-widest flex items-center justify-end gap-2 text-neon-blue font-bold">
               <span className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
               {lang === 'zh' ? '设计载入中' : 'OPTIMIZING REALITY'}
             </p>
          </div>
        </motion.div>

        <div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-white/40 text-[9px] uppercase tracking-[0.4em] mb-6 flex items-center gap-2"
          >
            <span className="w-10 h-[1px] bg-white/20" />
            {lang === 'zh' ? '关于作者' : 'Subject // Spatial Designer'}
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-[52px] font-extralight uppercase italic leading-[1.05] mb-8 tracking-tighter"
          >
            {lang === 'zh' ? (
              <>
                探索 <br />
                <span className="font-black not-italic text-white">空间</span> 与 <span className="text-white/20 italic">算力</span> 的边界。
              </>
            ) : (
              <>
                Pioneering the intersection of <br /> 
                <span className="font-black not-italic text-white">Space</span> and <span className="text-white/20 italic">Computation.</span>
              </>
            )}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-400 font-light leading-relaxed mb-12"
          >
             <p>
                {lang === 'zh' 
                  ? `目前就读于${config.university}，主修${config.major}。在数字艺术与空间叙事领域拥有深厚的兴趣和扎实的技术积累，能够利用实时渲染引擎创造感官丰富的数字化空间。`
                  : `Currently studying at ${config.universityEn}, majoring in ${config.majorEn}. With deep interest and solid technical expertise in digital art and spatial storytelling, I specialize in creating sensory-rich digital spaces using real-time rendering engines.`
                }
             </p>
             <div className="flex flex-col gap-1 border-l border-white/10 pl-6">
                <span className="text-[9px] uppercase tracking-widest text-white/20">{lang === 'zh' ? '坐标' : 'Coordinates'}</span>
                <span className="font-mono text-[10px] tracking-widest">34.0522° N, 118.2437° W</span>
                <span className="text-[9px] uppercase tracking-widest text-white/20 mt-2">{lang === 'zh' ? '最新荣誉' : 'Latest Award'}</span>
                <span className="text-[10px]">{lang === 'zh' ? config.awards[0] : config.awardsEn[0]}</span>
             </div>
          </motion.div>

          <div className="space-y-12">
             <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6 flex items-center gap-4">
                  <span className="w-8 h-[1px] bg-white/20" />
                  {lang === 'zh' ? '核心技术' : 'Tech Stack'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SKILLS.map((skill, index) => {
                    const IconComponent = (Icons as any)[skill.icon];
                    return (
                      <motion.div
                        key={skill.name}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.05)" }}
                        className="px-4 py-6 border border-white/5 rounded-xl flex flex-col items-center gap-3 text-center group cursor-default"
                      >
                        <div className="p-2 rounded-full bg-white/5 text-white/40 group-hover:text-neon-blue transition-colors">
                           {IconComponent && <IconComponent size={18} />}
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-white/60">
                          {skill.name}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

