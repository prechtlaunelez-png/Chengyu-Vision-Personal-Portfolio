import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { X, Save, Plus, Trash2, Video, Image as ImageIcon, Lock, LogIn, CloudLightning, MessageSquare, Database, Trash, Check, Archive, Clock, Mail, Phone } from 'lucide-react';
import { Project, Message } from '../types';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firebaseService } from '../lib/firebaseService';
import { getDirectUrl } from '../lib/utils';

export default function AdminPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { config, setConfig, projects, setProjects, user, isAdmin, lang, setSuspendCloudUpdates } = useApp();
  const [activeTab, setActiveTab] = useState<'config' | 'projects' | 'showcase' | 'messages'>('config');
  const [isSyncing, setIsSyncing] = useState(false);

  // Suspend cloud listener updates while we are editing in the panel
  React.useEffect(() => {
    if (isOpen) {
      setSuspendCloudUpdates(true);
    } else {
      setSuspendCloudUpdates(false);
    }
  }, [isOpen, setSuspendCloudUpdates]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const getSyncStatus = (p: Project) => {
    if (!p.mediaUrl) return { label: lang === 'zh' ? '缺失内容' : 'No Media', color: 'text-red-400' };
    if (p.mediaUrl.startsWith('local-sync-ref:') || p.mediaUrl.includes('#blob-')) {
      return { label: lang === 'zh' ? '仅此设备可见' : 'Local Only', color: 'text-amber-400' };
    }
    if (p.mediaUrl.startsWith('http') || p.mediaUrl.startsWith('https')) {
      return { label: lang === 'zh' ? '全球可见' : 'Global (Cloud)', color: 'text-green-400' };
    }
    return { label: lang === 'zh' ? '本地暂存' : 'Local Buffer', color: 'text-amber-400' };
  };

  // Subscribe to messages if admin
  React.useEffect(() => {
    if (isAdmin && isOpen) {
      const unsub = firebaseService.subscribeMessages((msgs) => {
        setMessages(msgs);
      });
      return unsub;
    }
  }, [isAdmin, isOpen]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request') {
        console.warn("Login popup was cancelled - usually due to multiple requests.");
        return;
      }
      console.error("Login failed:", err);
      alert("Login failed. Check your connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void, maxSizeMB = 10000) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(lang === 'zh' ? `文件太大了！上限为 ${maxSizeMB}MB` : `File too large! Max ${maxSizeMB}MB.`);
        return;
      }
      
      const isOBJ = file.name.toLowerCase().endsWith('.obj');
      const CLOUD_SYNC_LIMIT = 0.8 * 1024 * 1024; // 800KB safely under 1MB Firestore limit
      
      if (file.size > CLOUD_SYNC_LIMIT || isOBJ) { 
        console.log("Large file detected. Using IndexedDB storage.");
        const blobId = `blob-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        try {
          const { saveToDB } = await import('../lib/storage');
          const success = await saveToDB('media_blobs', blobId, file);
          
          if (!success) throw new Error("IDB Save returned false");

          const tempUrl = URL.createObjectURL(file);
          callback(tempUrl + '#' + blobId); 
          
          if (file.size > 100 * 1024 * 1024) {
             alert(lang === 'zh' ? `检测到大文件 (${(file.size / (1024 * 1024)).toFixed(1)}MB)。已安全缓存到您的浏览器本地数据库。注意：由于文件太大，云端仅同步标题和信息，项目内容需在当前设备查看。` : `Large file detected (${(file.size / (1024 * 1024)).toFixed(1)}MB). Cached to local database. Note: Content only viewable on this device due to size limits.`);
          }
        } catch (err) {
          console.error("Local storage failed:", err);
          alert(lang === 'zh' ? "本地储存空间不足或发生错误。请尝试压缩文件。" : "Local storage failed (possibly out of space). Please compress file.");
          
          // Last ditch effort: Try Base64 if not incredibly huge
          if (file.size < 50 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = () => callback(reader.result as string);
            reader.readAsDataURL(file);
          }
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => callback(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDeploy = async () => {
    if (!isAdmin) {
      alert(lang === 'zh' ? "只有管理员可以保存到云端。内容已保存在本地。" : "Only admin can save to cloud. Saved locally.");
      onClose();
      return;
    }

    setIsSyncing(true);
    try {
      // Sync Config with safety checks
      const cleanedConfig = { ...config };
      if (cleanedConfig.logo && cleanedConfig.logo.length > 900000) {
        console.warn("Logo too large for cloud sync (>900KB). Skipping sync for this field.");
        cleanedConfig.logo = '';
      }
      if (cleanedConfig.profilePic && cleanedConfig.profilePic.length > 900000) {
        console.warn("Profile Pic too large for cloud sync (>900KB). Skipping sync for this field.");
        cleanedConfig.profilePic = '';
      }

      // Filter out giant base64 data strings that might have slipped through
      const cloudProjects = projects.map(p => {
        let mediaUrl = p.mediaUrl;
        let coverUrl = p.coverUrl || '';

        // Handle Media URL
        if (mediaUrl.startsWith('data:') && mediaUrl.length > 900000) {
          mediaUrl = 'cloud-placeholder-large-file'; 
        } else if (mediaUrl.includes('#blob-')) {
          const blobId = mediaUrl.split('#')[1];
          mediaUrl = `local-sync-ref:#${blobId}`;
        }

        // Handle Cover URL
        if (coverUrl.startsWith('data:') && coverUrl.length > 900000) {
          coverUrl = 'cloud-placeholder-large-cover';
        } else if (coverUrl.includes('#blob-')) {
          const blobId = coverUrl.split('#')[1];
          coverUrl = `local-sync-ref:#${blobId}`;
        }

        return { ...p, mediaUrl, coverUrl };
      });

      // Use atomic batch sync for performance and reliability
      await firebaseService.saveProjectsBatch(cloudProjects, cleanedConfig);
      
      alert(lang === 'zh' ? "云端同步成功！" : "Cloud Sync Success!");
      onClose();
    } catch (err) {
      console.error("Sync failed:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('size')) {
        alert(lang === 'zh' ? "部分作品文件过大，无法同步到云端。请尝试压缩后再上传。" : "Some files are too large for cloud sync. Please compress and retry.");
      } else {
        alert("Sync failed. " + errorMsg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const addProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新项目',
      titleEn: 'New Project',
      category: lang === 'zh' ? '分类' : 'Category',
      categoryEn: 'Category',
      description: lang === 'zh' ? '描述' : 'Description',
      descriptionEn: 'Description',
      mediaUrl: '',
      type: 'image',
      tags: [],
      order: projects.length,
    };
    setProjects([...projects, newProject]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const newProjects = [...projects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newProjects.length) return;
    
    // Swap items
    const temp = newProjects[index];
    newProjects[index] = newProjects[targetIndex];
    newProjects[targetIndex] = temp;
    
    // Update order values for all projects to be safe
    const withOrder = newProjects.map((p, i) => ({ ...p, order: i }));
    setProjects(withOrder);
  };

  const removeProject = (id: string) => {
    if (confirm(lang === 'zh' ? '确定删除吗？' : 'Delete this item?')) {
      const updated = projects.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i }));
      setProjects(updated);
      if (isAdmin) {
        firebaseService.deleteProject(id);
      }
    }
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
        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Lock className="w-12 h-12 text-neon-blue mb-6" />
            <h2 className="text-2xl font-display uppercase tracking-widest mb-2">Cloud Access Required</h2>
            <p className="text-white/40 text-sm mb-8">Please login to sync your work globally.</p>
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-neon-blue transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isLoggingIn ? 'Logging in...' : 'Login with Google'}
            </button>
          </div>
        ) : !isAdmin ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-red-400">
             <Lock className="w-12 h-12 mb-6" />
             <p className="text-lg">Access Denied: You are not specified as an administrator.</p>
             <p className="text-sm mt-2 opacity-60">Admin Email: prechtlaunelez@gmail.com</p>
             <button onClick={() => signOut(auth)} className="mt-8 text-white/40 underline text-xs">Switch Account</button>
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
                  Media Management ({projects.length})
                </button>
                <button 
                  onClick={() => setActiveTab('showcase')}
                  className={`text-xs uppercase tracking-widest font-bold ${activeTab === 'showcase' ? 'text-neon-blue' : 'text-white/40'}`}
                >
                  3D Showcase
                </button>
                <button 
                  onClick={() => setActiveTab('messages')}
                  className={`text-xs uppercase tracking-widest font-bold ${activeTab === 'messages' ? 'text-neon-blue' : 'text-white/40'}`}
                >
                  {lang === 'zh' ? '留言管理' : 'Messages'}
                  {messages.filter(m => m.status === 'unread').length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-neon-blue text-black text-[8px] rounded-full">
                      {messages.filter(m => m.status === 'unread').length}
                    </span>
                  )}
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
                       {projects.map((project, index) => (
                         <div key={project.id} className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2">
                                  <div className="flex flex-col gap-1 mr-2 px-1 py-2 bg-black/40 rounded border border-white/5">
                                    <button 
                                      onClick={() => moveProject(index, 'up')}
                                      disabled={index === 0}
                                      className="p-1 hover:text-neon-blue disabled:opacity-20 transition-colors"
                                      title="Move Up"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                    </button>
                                    <button 
                                      onClick={() => moveProject(index, 'down')}
                                      disabled={index === projects.length - 1}
                                      className="p-1 hover:text-neon-blue disabled:opacity-20 transition-colors"
                                      title="Move Down"
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                     <button onClick={() => updateProject(project.id, { type: 'video' })} className={`p-2 rounded ${project.type === 'video' ? 'bg-neon-blue text-black' : 'bg-white/5'}`}><Video size={14}/></button>
                                     <button onClick={() => updateProject(project.id, { type: 'image' })} className={`p-2 rounded ${project.type === 'image' ? 'bg-neon-blue text-black' : 'bg-white/5'}`}><ImageIcon size={14}/></button>
                                  </div>
                               </div>
                               <button onClick={() => removeProject(project.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <input value={project.title} onChange={e => updateProject(project.id, { title: e.target.value })} placeholder="Title (CN)" className="bg-white/5 border border-white/10 rounded p-2 text-xs" />
                               <input value={project.titleEn} onChange={e => updateProject(project.id, { titleEn: e.target.value })} placeholder="Title (EN)" className="bg-white/5 border border-white/10 rounded p-2 text-xs" />
                            </div>
                            <div className="flex flex-col gap-2">
                               <span className="text-[10px] text-white/40 uppercase">1. 视频/图片 (Video/Image):</span>
                               <div className="flex flex-col gap-2 p-2 bg-white/5 rounded border border-white/5">
                                 <span className="text-[9px] text-white/30 uppercase">上传大文件 (Supports 1GB+):</span>
                                 <input type="file" onChange={e => handleFileUpload(e, (base64) => updateProject(project.id, { mediaUrl: base64 }))} className="text-[10px] text-white/40" />
                                 <span className="text-[9px] text-white/30 uppercase mt-1">或 云端链接 (Or Cloud URL):</span>
                                 <input 
                                   value={(project.mediaUrl && (project.mediaUrl.startsWith('blob:') || project.mediaUrl.startsWith('data:') || project.mediaUrl.includes('#blob-'))) ? '' : project.mediaUrl} 
                                   onChange={e => updateProject(project.id, { mediaUrl: e.target.value })}
                                   placeholder="Google Drive Link" 
                                   className="bg-zinc-900 border border-white/10 rounded p-1.5 text-xs text-white" 
                                 />
                               </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                               <span className="text-[10px] text-white/40 uppercase">2. 封面图 (Cover/Thumbnail):</span>
                               <div className="flex flex-col gap-2 p-2 bg-white/5 rounded border border-white/5">
                                 <span className="text-[9px] text-white/30 uppercase">上传预览图 (Max 1MB):</span>
                                 <input type="file" onChange={e => handleFileUpload(e, (base64) => updateProject(project.id, { coverUrl: base64 }), true)} className="text-[10px] text-white/40" />
                                 <span className="text-[9px] text-white/30 uppercase mt-1">或 外部链接 (External Link):</span>
                                 <input 
                                    value={(project.coverUrl && project.coverUrl.length > 500) ? '' : (project.coverUrl || '')} 
                                    onChange={e => updateProject(project.id, { coverUrl: e.target.value })}
                                    placeholder="Thumbnail URL" 
                                    className="bg-zinc-900 border border-white/10 rounded p-1.5 text-xs text-white" 
                                 />
                               </div>
                            </div>
                            {(project.mediaUrl || project.coverUrl) && (
                                <div className="mt-4 aspect-video rounded overflow-hidden bg-black/40 border border-white/5 relative">
                                   {project.type === 'video' ? (
                                      <video 
                                        src={getDirectUrl(project.mediaUrl)} 
                                        poster={getDirectUrl(project.coverUrl || '')}
                                        className="w-full h-full object-cover" 
                                        controls 
                                        referrerPolicy="no-referrer" 
                                      />
                                   ) : (
                                      <img 
                                        src={getDirectUrl(project.mediaUrl || project.coverUrl || '')} 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer" 
                                      />
                                   )}
                                </div>
                             )}
                         </div>
                       ))}
                    </div>
                 </div>
               ) : activeTab === 'showcase' ? (
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
               ) : (
                 <div className="space-y-6">
                    <div className="flex justify-between items-center mb-8">
                       <h3 className="text-lg font-display uppercase tracking-widest">
                          {lang === 'zh' ? '合作咨询' : 'Collaboration Leads'} ({messages.length})
                       </h3>
                    </div>
                    
                    <div className="space-y-4">
                       {messages.length === 0 ? (
                         <div className="text-center py-24 bg-white/5 rounded-3xl border border-dashed border-white/10">
                            <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-sm text-white/30 uppercase tracking-widest">No messages yet.</p>
                         </div>
                       ) : (
                         messages.map(msg => (
                           <div key={msg.id} className={`p-6 rounded-2xl border ${msg.status === 'unread' ? 'bg-neon-blue/5 border-neon-blue/20' : 'bg-white/5 border-white/10'} space-y-4 transition-all`}>
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                 <div>
                                    <div className="flex items-center gap-3 mb-1">
                                       <h4 className="font-bold text-white uppercase text-sm">{msg.name}</h4>
                                       {msg.status === 'unread' && <span className="text-[8px] bg-neon-blue text-black px-2 py-0.5 rounded-full uppercase font-bold tracking-widest">New</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-[11px] text-white/40 uppercase tracking-wider font-mono">
                                       <span className="flex items-center gap-1"><Mail size={12}/> {msg.email}</span>
                                       {msg.phone && <span className="flex items-center gap-1"><Phone size={12}/> {msg.phone}</span>}
                                       {msg.wechat && <span className="flex items-center gap-1"><MessageSquare size={12}/> {msg.wechat}</span>}
                                       <span className="flex items-center gap-1"><Clock size={12}/> {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    {msg.status !== 'read' && (
                                      <button 
                                        onClick={() => firebaseService.updateMessageStatus(msg.id!, 'read')}
                                        className="p-2 bg-white/5 text-white/40 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
                                        title="Mark as read"
                                      >
                                        <Check size={18} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => firebaseService.deleteMessage(msg.id!)}
                                      className="p-2 bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                      title="Delete message"
                                    >
                                      <Trash size={18} />
                                    </button>
                                 </div>
                              </div>
                              <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                 {msg.message}
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
               )}
            </div>
            
            <div className="p-6 bg-zinc-950 border-t border-white/10 flex justify-between items-center">
               <div className="flex flex-col">
                 <button onClick={() => signOut(auth)} className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white transition-colors text-left">Sign Out</button>
                 <p className="text-[9px] text-white/40 mt-1 uppercase tracking-tighter">
                   {lang === 'zh' 
                     ? "注意：云端仅存储元数据(1MB限制)。大文件保存在此设备。" 
                     : "Note: Cloud only stores metadata (1MB limit). Large files stored locally."}
                 </p>
                 <button 
                   onClick={() => alert(lang === 'zh' ? "【免费分享指南】\n\n1. 上传大文件到 Google Drive。\n2. 设置分享为“所有人可查看”。\n3. 在作品管里的“外部云端链接”粘贴该链接。\n\n这样他人就能看到你的 600MB+ 作品了。" : "1. Host on Google Drive.\n2. Set Sharing to Public.\n3. Paste link in 'External URL'.")}
                   className="text-[9px] text-neon-blue uppercase underline tracking-tighter mt-1 text-left"
                 >
                   {lang === 'zh' ? '如何让他人看到大作品？' : 'How to share large files?'}
                 </button>
               </div>
               <button 
                onClick={handleDeploy} 
                className="flex items-center gap-2 px-8 py-3 bg-neon-blue text-black rounded-full text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                disabled={isSyncing}
               >
                  {isSyncing ? <CloudLightning className="animate-spin" size={16}/> : <Save size={16} />}
                  {lang === 'zh' ? '同步到云端' : 'Sync to Cloud'}
               </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
