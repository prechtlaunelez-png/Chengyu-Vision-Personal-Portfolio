import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { X, Save, Plus, Trash2, Video, Image as ImageIcon, Lock } from 'lucide-react';
import { Project } from '../types';

export default function AdminPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { config, setConfig, projects, setProjects } = useApp();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'projects' | 'showcase'>('config');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'zc999166') {
      setIsAuthorized(true);
    } else {
      alert('密码错误 / Incorrect Password');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, maxSizeMB = 10000) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`文件太大了！上限为 ${maxSizeMB}MB (约10GB)。 / File too large! Max ${maxSizeMB}MB.`);
        return;
      }
      
      // For OBJ files or large files, we prefer saving as Blob to IndexedDB
      const isOBJ = file.name.toLowerCase().endsWith('.obj');
      
      if (file.size > 50 * 1024 * 1024 || isOBJ) { // Lower threshold to 50MB for blobs
        console.log("Saving file as Blob to IndexedDB for performance...");
        const blobId = `blob-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        try {
          const { saveToDB } = await import('../lib/storage');
          await saveToDB('media_blobs', blobId, file);
          
          // Generate a temp URL for immediate preview
          const tempUrl = URL.createObjectURL(file);
          // We indicate this is a stored blob by prefixing or using a specific scheme if needed, 
          // but for now let's just pass the tempUrl and handle persistence in AppContext
          callback(tempUrl + '#' + blobId); 
          
          console.log("Saved to IDB media_blobs:", blobId);
          alert(isOBJ ? "模型文件已安全存入本地数据库。 / Model saved to local database." : "大文件已存入本地数据库。 / Large file saved to local DB.");
        } catch (err) {
          console.error("Blob save failed:", err);
          // Fallback to Base64 if IDB fails for some reason
          const reader = new FileReader();
          reader.onload = () => callback(reader.result as string);
          reader.readAsDataURL(file);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => callback(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const addProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新项目',
      titleEn: 'New Project',
      category: '分类',
      categoryEn: 'Category',
      description: '描述',
      descriptionEn: 'Description',
      mediaUrl: '',
      type: 'image',
      tags: [],
    };
    setProjects([...projects, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-5xl h-[80vh] bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {!isAuthorized ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Lock className="w-12 h-12 text-neon-blue mb-6" />
            <h2 className="text-2xl font-display uppercase tracking-widest mb-8">System Access Required</h2>
            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-center text-sm focus:border-neon-blue outline-none"
                autoFocus
              />
              <button className="w-full py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs">
                Authorize
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-zinc-950">
              <div className="flex gap-8">
                <button 
                  onClick={() => setActiveTab('config')}
                  className={`text-xs uppercase tracking-widest font-bold ${activeTab === 'config' ? 'text-neon-blue' : 'text-white/40'}`}
                >
                  Site Config
                </button>
                <button 
                  onClick={() => setActiveTab('projects')}
                  className={`text-xs uppercase tracking-widest font-bold ${activeTab === 'projects' ? 'text-neon-blue' : 'text-white/40'}`}
                >
                  Media Management
                </button>
                <button 
                  onClick={() => setActiveTab('showcase')}
                  className={`text-xs uppercase tracking-widest font-bold ${activeTab === 'showcase' ? 'text-neon-blue' : 'text-white/40'}`}
                >
                  3D Showcase
                </button>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
               {activeTab === 'config' ? (
                 <div className="space-y-8 max-w-2xl mx-auto">
                    <div className="grid grid-cols-2 gap-6">
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">Author Name (CN)</span>
                         <input value={config.author} onChange={e => setConfig({...config, author: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-neon-blue outline-none" />
                       </label>
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">Author Name (EN)</span>
                         <input value={config.authorEn} onChange={e => setConfig({...config, authorEn: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-neon-blue outline-none" />
                       </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">Site Logo (Local File)</span>
                         <div className="flex gap-4">
                            <input type="file" onChange={e => handleFileUpload(e, (base64) => setConfig({...config, logo: base64}))} className="text-[10px] text-white/40 file:bg-white/10 file:text-white file:border-none file:rounded file:px-2 file:py-1" />
                            {config.logo && <img src={config.logo} className="h-10 w-10 object-contain rounded bg-black/40" />}
                         </div>
                       </label>
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">Profile Pic (Local File)</span>
                         <div className="flex gap-4">
                            <input type="file" onChange={e => handleFileUpload(e, (base64) => setConfig({...config, profilePic: base64}))} className="text-[10px] text-white/40 file:bg-white/10 file:text-white file:border-none file:rounded file:px-2 file:py-1" />
                            {config.profilePic && <img src={config.profilePic} className="h-10 w-10 object-cover rounded bg-black/40" />}
                         </div>
                       </label>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">University (CN)</span>
                         <input value={config.university} onChange={e => setConfig({...config, university: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-neon-blue outline-none" />
                       </label>
                       <label className="flex flex-col gap-2">
                         <span className="text-[10px] uppercase tracking-widest text-white/30">University (EN)</span>
                         <input value={config.universityEn} onChange={e => setConfig({...config, universityEn: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm focus:border-neon-blue outline-none" />
                       </label>
                    </div>
                 </div>
               ) : activeTab === 'projects' ? (
                 <div className="space-y-12">
                    <div className="flex justify-between items-center">
                       <h3 className="text-lg font-display uppercase tracking-widest">Media Buffer ({projects.length})</h3>
                       <button onClick={addProject} className="flex items-center gap-2 px-4 py-2 bg-neon-blue text-black rounded text-[10px] font-bold uppercase tracking-widest">
                         <Plus size={14} /> Add Content
                       </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {projects.map(project => (
                         <div key={project.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                            <div className="flex justify-between items-start">
                               <div className="flex gap-2">
                                  <button onClick={() => updateProject(project.id, { type: 'video' })} className={`p-2 rounded ${project.type === 'video' ? 'bg-neon-blue text-black' : 'bg-white/5'}`}><Video size={14}/></button>
                                  <button onClick={() => updateProject(project.id, { type: 'image' })} className={`p-2 rounded ${project.type === 'image' ? 'bg-neon-blue text-black' : 'bg-white/5'}`}><ImageIcon size={14}/></button>
                               </div>
                               <button onClick={() => removeProject(project.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <input value={project.title} onChange={e => updateProject(project.id, { title: e.target.value })} placeholder="Title (CN)" className="bg-white/5 border border-white/10 rounded p-2 text-xs" />
                               <input value={project.titleEn} onChange={e => updateProject(project.id, { titleEn: e.target.value })} placeholder="Title (EN)" className="bg-white/5 border border-white/10 rounded p-2 text-xs" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <span className="text-[10px] text-white/40 uppercase">Upload Local File (Max 1GB+ / 支持1GB+高清视频):</span>
                               <input type="file" onChange={e => handleFileUpload(e, (base64) => updateProject(project.id, { mediaUrl: base64 }))} className="text-[10px] text-white/40" />
                            </div>
                            {project.mediaUrl && (
                               <div className="mt-4 aspect-video rounded overflow-hidden bg-black/40 border border-white/5">
                                  {project.type === 'video' ? (
                                     <video src={project.mediaUrl} className="w-full h-full object-cover" controls />
                                  ) : (
                                     <img src={project.mediaUrl} className="w-full h-full object-cover" />
                                  )}
                               </div>
                            )}
                         </div>
                       ))}
                    </div>
                 </div>
               ) : (
                 <div className="space-y-8 max-w-2xl mx-auto">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                       <h3 className="text-sm font-bold uppercase tracking-widest text-neon-blue">Advanced 3D Showcase Setup</h3>
                       
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-[10px] uppercase tracking-widest text-white/30">OBJ Artifacts ({config.showcaseModels.length})</span>
                           <button 
                            onClick={() => {
                              const newModel = { id: Math.random().toString(36).substr(2, 9), name: 'Antique Item', url: '' };
                              setConfig({...config, showcaseModels: [...config.showcaseModels, newModel]});
                            }}
                            className="px-3 py-1 bg-white hover:bg-neon-blue transition-colors text-black text-[9px] font-bold uppercase rounded"
                           >
                             Add New OBJ
                           </button>
                         </div>

                         <div className="space-y-4">
                           {config.showcaseModels.map((model, idx) => (
                             <div key={model.id} className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-3">
                               <div className="flex justify-between gap-4">
                                 <input 
                                   value={model.name} 
                                   onChange={e => {
                                     const newModels = [...config.showcaseModels];
                                     newModels[idx].name = e.target.value;
                                     setConfig({...config, showcaseModels: newModels});
                                   }}
                                   placeholder="Artifact Name"
                                   className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                                 />
                                 <button 
                                   onClick={() => {
                                     const newModels = config.showcaseModels.filter((_, i) => i !== idx);
                                     setConfig({...config, showcaseModels: newModels});
                                   }}
                                   className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                               
                               <div className="space-y-3">
                                 <div className="flex flex-col gap-2">
                                   <span className="text-[9px] uppercase text-white/20">方式 1: 本地文件 (.obj, 支持 1GB+) / Method 1: Local File (1GB+)</span>
                                   <input 
                                     type="file" 
                                     accept=".obj" 
                                     onChange={e => handleFileUpload(e, (base64) => {
                                       const newModels = [...config.showcaseModels];
                                       newModels[idx].url = base64;
                                       setConfig({...config, showcaseModels: newModels});
                                     })} 
                                     className="text-[10px] text-white/40" 
                                   />
                                 </div>
                                 
                                 <div className="flex flex-col gap-2">
                                   <span className="text-[9px] uppercase text-white/20">Method 2: External URL</span>
                                   <input 
                                     value={model.url.startsWith('data:') ? '' : model.url} 
                                     onChange={e => {
                                       const newModels = [...config.showcaseModels];
                                       newModels[idx].url = e.target.value;
                                       setConfig({...config, showcaseModels: newModels});
                                     }}
                                     placeholder="https://example.com/model.obj"
                                     className="bg-white/5 border border-white/10 rounded p-2 text-xs"
                                   />
                                 </div>
                                 {model.url && <p className="text-[9px] text-green-500 uppercase font-bold">Source Linked ✓</p>}
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/5">
                          <label className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-white/30">Polygon Count Display</span>
                            <input value={config.showcaseStats.polygons} onChange={e => setConfig({...config, showcaseStats: {...config.showcaseStats, polygons: e.target.value}})} className="bg-black/20 border border-white/10 rounded p-2 text-xs" />
                          </label>
                          <label className="flex flex-col gap-2">
                            <span className="text-[10px] uppercase tracking-widest text-white/30">Target Platform Display</span>
                            <input value={config.showcaseStats.platform} onChange={e => setConfig({...config, showcaseStats: {...config.showcaseStats, platform: e.target.value}})} className="bg-black/20 border border-white/10 rounded p-2 text-xs" />
                          </label>
                       </div>
                    </div>
                 </div>
               )}
            </div>
            
            <div className="p-6 bg-zinc-950 border-t border-white/10 flex justify-end">
               <button onClick={onClose} className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest">
                  <Save size={16} /> Deploy Changes
               </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
