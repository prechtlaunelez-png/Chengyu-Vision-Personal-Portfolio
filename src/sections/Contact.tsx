import { motion } from "motion/react";
import { Mail, MessageSquare, Send, ArrowRight, Phone } from "lucide-react";
import { useApp } from "../AppContext";

export default function Contact() {
  const { lang, config } = useApp();

  return (
    <section id="contact" className="py-32 px-6 md:px-12 lg:px-24 bg-black relative">
       <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
             <div>
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  className="text-neon-blue text-xs uppercase tracking-[0.4em] mb-6"
                >
                  {lang === 'zh' ? '开启连接' : 'Initiate Connection'}
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-7xl font-extralight italic uppercase mb-8 leading-tight tracking-tighter"
                >
                  {lang === 'zh' ? (
                    <>
                      准备好 <br /> <span className="font-black not-italic text-white">合作了吗？</span>
                    </>
                  ) : (
                    <>
                      Ready to <br /> <span className="font-black not-italic text-white">Collaborate?</span>
                    </>
                  )}
                </motion.h2>

                <div className="space-y-8 mt-12">
                   <div className="flex items-center gap-6 group cursor-pointer">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:border-neon-blue group-hover:text-neon-blue transition-all">
                        <Mail size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Email / {lang === 'zh' ? '合作邮箱' : 'Cooperation Email'}</p>
                         <p className="text-lg font-display">3335355856@qq.com</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 group cursor-pointer">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:border-neon-blue group-hover:text-neon-blue transition-all">
                        <Phone size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Phone / {lang === 'zh' ? '联系方式' : 'Contact'}</p>
                         <p className="text-lg font-display">13397587439</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 group cursor-pointer">
                      <div className="w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:border-neon-blue group-hover:text-neon-blue transition-all">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">WeChat / {lang === 'zh' ? '微信' : 'WeChat'}</p>
                         <p className="text-lg font-display">zc999166zc</p>
                      </div>
                   </div>
                </div>

                <div className="mt-24 pt-12 border-t border-white/5 grid grid-cols-2 gap-8 text-[10px] uppercase tracking-[0.3em] text-white/40 font-mono">
                   <div>
                      <p className="mb-2">{lang === 'zh' ? '地点' : 'Location'}</p>
                      <p className="text-white">UTC+8 / Remote</p>
                   </div>
                   <div>
                      <p className="mb-2">{lang === 'zh' ? '状态' : 'Availability'}</p>
                      <p className="text-neon-blue">{lang === 'zh' ? '接受邀约' : 'Open for Freelance'}</p>
                   </div>
                </div>
             </div>

             <div className="glass-card p-8 md:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <div className="w-16 h-16 border-t border-r border-white/20" />
                </div>
                
                <form className="space-y-8 relative z-10" onSubmit={(e) => e.preventDefault()}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">
                            {lang === 'zh' ? '姓名' : 'Full Name'}
                         </label>
                         <input 
                            type="text" 
                            className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm focus:border-neon-blue focus:outline-none transition-colors"
                            placeholder={lang === 'zh' ? '您的尊姓大名' : 'John Doe'}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">
                            {lang === 'zh' ? '邮箱' : 'Email Address'}
                         </label>
                         <input 
                            type="email" 
                            className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm focus:border-neon-blue focus:outline-none transition-colors"
                            placeholder="email@example.com"
                         />
                      </div>
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 ml-4">
                         {lang === 'zh' ? '项目简述' : 'Project Brief'}
                      </label>
                      <textarea 
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-neon-blue focus:outline-none transition-colors resize-none"
                        placeholder={lang === 'zh' ? '请描述您的愿景...' : 'Tell me about your vision...'}
                      />
                   </div>

                   <button className="w-full group relative flex items-center justify-between px-8 py-6 bg-white text-black font-display font-bold uppercase tracking-[0.2em] text-xs overflow-hidden transition-all hover:scale-[1.02] active:scale-95">
                      <span className="flex items-center gap-2">
                         <Send size={16} />
                         {lang === 'zh' ? '发送信号' : 'Transmit Signal'}
                      </span>
                      <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                      <div className="absolute inset-0 bg-neon-blue -translate-x-full group-hover:translate-x-0 transition-transform duration-500 opacity-20 pointer-events-none" />
                   </button>
                </form>
             </div>
          </div>
       </div>

       <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/20">© 2026 Aura Studio. All rights reserved.</p>
          <div className="flex gap-8">
             {['Behance', 'Artstation', 'Twitter', 'Dribbble'].map(link => (
                <a key={link} className="text-[10px] uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors">{link}</a>
             ))}
          </div>
       </footer>
    </section>
  );
}

