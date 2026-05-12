import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stage, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Box, Rotate3d, Settings, Info, Camera, Sparkles, Wand2, Plus } from "lucide-react";
import { useApp } from "../AppContext";
import ParticleSystem from "./showcase/ParticleSystem";
import HandTracker from "./showcase/HandTracker";
import { saveToDB } from "../lib/storage";

export default function Showcase3D() {
  const { lang, config, setConfig, isPaused, setIsPaused } = useApp();
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [morphProgress, setMorphProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [handPos, setHandPos] = useState({ x: 0, y: 0 });
  const [handVector, setHandVector] = useState({ x: 999, y: 999, z: 999 });
  const [handScale, setHandScale] = useState(1);
  const [isOkGesture, setIsOkGesture] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState({ isInitializing: false, error: null as string | null, isRunning: false });
  const [isInteractionEnabled, setIsInteractionEnabled] = useState(false);
  
  const lastGestureTime = useRef(0);
  const currentModel = config.showcaseModels[activeModelIndex];

  // Static Description Generation
  const generateDescription = useCallback((modelName: string) => {
    if (!modelName) {
      setIsLoadingAi(false);
      return;
    }
    setIsLoadingAi(true);
    setAiDescription("");
    
    // Simulate AI processing delay for aesthetic effect
    setTimeout(() => {
        setAiDescription(lang === 'zh' 
          ? `这是一件名为『${modelName}』的作品。飞天仙女，长裙曳地，舞姿翩跹，衣袂随气流在无重力的虚空中翻飞，这穿越千年的景象，跨越了物理的界限，向我们传递着丝绸之路上那璀璨而神秘的文化回声。`
          : `Through "${modelName}", one can witness the exquisite forms and lines of Dunhuang art. The flying fairy, with trailing skirts and graceful dances, her ribbons fluttering in a gravity-defying void. This millennium-crossing spectacle conveys the brilliant and mysterious cultural echoes of the Silk Road.`);
        setIsLoadingAi(false);
    }, 1500);
  }, [lang]);

  useEffect(() => {
    if (currentModel && currentModel.url && !isModelLoading && !modelLoadError) {
      generateDescription(currentModel.name);
    } else {
      if (!currentModel || !currentModel.url) setAiDescription("");
    }
  }, [currentModel?.id, currentModel?.url, isModelLoading, modelLoadError, generateDescription]);

  const handleCameraStatusChange = useCallback((status: { isInitializing: boolean; error: string | null; isRunning: boolean }) => {
    setCameraStatus(status);
  }, []);

  const handleModelLoadStart = useCallback(() => {
    setIsModelLoading(true);
    setModelLoadError(null);
  }, []);

  const handleModelLoadComplete = useCallback(() => {
    setIsModelLoading(false);
  }, []);

  const handleModelLoadError = useCallback((err: string) => {
    setModelLoadError(err);
    setIsModelLoading(false);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    const objFile = files.find(f => f.name.toLowerCase().endsWith('.obj'));
    
    if (!objFile) {
      alert(lang === 'zh' ? "请选择至少一个 .obj 格式的文件。" : "Please select at least one .obj file.");
      return;
    }

    try {
      const objBlobId = `blob-${Date.now()}-obj`;
      await saveToDB('media_blobs', objBlobId, objFile);
      const newModel: any = {
        id: objBlobId,
        name: objFile.name.replace('.obj', '').slice(0, 15),
        url: `${URL.createObjectURL(objFile)}#${objBlobId}`
      };

      const mtlFile = files.find(f => f.name.toLowerCase().endsWith('.mtl'));
      if (mtlFile) {
        const mtlBlobId = `blob-${Date.now()}-mtl`;
        await saveToDB('media_blobs', mtlBlobId, mtlFile);
        newModel.mtlUrl = `${URL.createObjectURL(mtlFile)}#${mtlBlobId}`;
      }

      const textureFiles = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name));
      if (textureFiles.length > 0) {
        newModel.textures = {};
        for (let i = 0; i < textureFiles.length; i++) {
          const f = textureFiles[i];
          const texBlobId = `blob-${Date.now()}-tex-${i}`;
          await saveToDB('media_blobs', texBlobId, f);
          newModel.textures[f.name] = `${URL.createObjectURL(f)}#${texBlobId}`;
        }
      }

      setConfig({
        ...config,
        showcaseModels: [...config.showcaseModels, newModel]
      });
      
      setActiveModelIndex(config.showcaseModels.length); // Switch to the new model
      setModelLoadError(null);
    } catch (err) {
      console.error("Local upload error:", err);
      alert("Failed to process local file.");
    }
  };

  // Hand gesture processing
  useEffect(() => {
    if (activeModelIndex !== undefined) {
      setMorphProgress(0);
      const interval = setInterval(() => {
        setMorphProgress(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            return 1;
          }
          return prev + 0.05;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [activeModelIndex]);

  const handleHandResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // 1. Rotation (Smooth interpolation)
      const palmX = landmarks[0].x;
      const palmY = landmarks[0].y;
      const palmZ = landmarks[0].z;
      
      setHandPos(prev => ({ ...prev, x: (0.5 - palmX) * 2.5 })); // Increased sensitivity
      setHandVector(prev => {
         const next = { 
           x: (palmX - 0.5) * 10, 
           y: (0.5 - palmY) * 10, 
           z: (palmZ) * 5 
         };
         // Only update if significantly different to reduce render pressure
         if (Math.abs(prev.x - next.x) < 0.01 && Math.abs(prev.y - next.y) < 0.01) return prev;
         return next;
      });

      // 2. Linear Scaling (Thumb to Index distance)
      const thumb = landmarks[4];
      const index = landmarks[8];
      const dist = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));
      const targetScale = Math.max(0.4, Math.min(2.5, dist * 6));
      setHandScale(prev => prev + (targetScale - prev) * 0.15);

      // 3. Fist Gesture Detection
      const wrist = landmarks[0];
      const getDist = (idx: number) => Math.sqrt(Math.pow(landmarks[idx].x - wrist.x, 2) + Math.pow(landmarks[idx].y - wrist.y, 2));
      
      const indexFolded = getDist(8) < getDist(5);
      const middleFolded = getDist(12) < getDist(9);
      const ringFolded = getDist(16) < getDist(13);
      const pinkyFolded = getDist(20) < getDist(17);
      
      const isFist = indexFolded && middleFolded && ringFolded && pinkyFolded;
      
      if (isFist) {
        setIsOkGesture(true);
      } else {
        setIsOkGesture(false);
      }
    } else {
      setIsOkGesture(false);
      setHandVector(prev => prev.x === 999 ? prev : { x: 999, y: 999, z: 999 });
    }
  }, [config.showcaseModels.length]);

  return (
    <section id="showcase" className="py-32 px-6 md:px-12 lg:px-24 bg-black relative min-h-[100vh] flex flex-col justify-center overflow-hidden">
      {/* Background Decoration - even more subtle */}
      <div className="absolute inset-0 opacity-[0.01] pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-neon-blue rounded-full filter blur-[250px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-500 rounded-full filter blur-[250px] opacity-10" />
      </div>

      <div className="grid lg:grid-cols-12 gap-12 max-w-8xl mx-auto w-full relative">
        
        {/* Left Sidebar: Artifact List */}
        <div className="lg:col-span-3 z-20 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="glass-card bg-black/60 p-6 border-white/5"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-neon-blue/60" size={18} />
              <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Artifact Buffer</h3>
            </div>
            
            <div className="space-y-3">
              {config.showcaseModels.map((model, idx) => (
                <button
                  key={model.id}
                  onClick={() => setActiveModelIndex(idx)}
                  className={`w-full group flex items-center justify-between p-3 rounded-lg border transition-all ${
                    activeModelIndex === idx 
                      ? 'bg-neon-blue/5 border-neon-blue/30 text-white' 
                      : 'bg-white/2 border-white/5 text-white/20 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-widest">{model.name}</span>
                  <div className={`w-1 h-1 rounded-full ${activeModelIndex === idx ? 'bg-neon-blue' : 'bg-white/10'}`} />
                </button>
              ))}
              
              {/* Local Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/10 text-white/20 hover:text-white/40 hover:border-white/20 transition-all bg-white/1"
              >
                <Plus size={14} />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Import Local OBJ</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".obj,.mtl,image/*" 
                multiple
                className="hidden" 
              />
              {config.showcaseModels.length === 0 && (
                <div className="py-8 text-center text-white/10 text-[9px] uppercase tracking-widest">
                  Archive Empty
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Description Panel */}
          <AnimatePresence mode="wait">
            {currentModel && currentModel.url && (
              <motion.div
                key={currentModel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card bg-black/60 p-6 relative overflow-hidden group border-white/5"
              >
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-neon-blue/20 via-yellow-500/20 to-neon-blue/20" />
                <div className="flex items-center gap-3 mb-4">
                  <Wand2 size={14} className="text-yellow-500/50" />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/30">Gemini Insight</span>
                </div>
                
                {isLoadingAi ? (
                  <div className="space-y-2 animate-pulse">
                     <div className="h-2 bg-white/5 rounded w-full" />
                     <div className="h-2 bg-white/5 rounded w-[90%]" />
                  </div>
                ) : (
                  <p className="text-[11px] text-white/40 leading-relaxed italic font-serif">
                    {aiDescription || (lang === 'zh' ? "飞天仙女，翩若惊鸿。正在通过AI模型解析敦煌壁画的灵动神韵..." : "Parsing spiritual charm via AI model...")}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center: 3D Viewport */}
        <div className="lg:col-span-9 relative aspect-square lg:aspect-video rounded-3xl overflow-hidden border border-white/5 bg-black">
          <div className="absolute inset-0 bg-black z-0" />
          
          <div className="absolute top-8 left-8 z-10 space-y-2">
            <h2 className="text-4xl md:text-5xl font-extralight italic uppercase tracking-tighter text-white/80">
              {currentModel ? currentModel.name : (lang === 'zh' ? '交互星云模式' : "Nebula Interaction")}
            </h2>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isModelLoading ? 'bg-yellow-500 animate-pulse' : 'bg-neon-blue/20'}`} />
                  <span className="text-[9px] tracking-widest text-white/20 uppercase">
                    {isModelLoading 
                      ? (lang === 'zh' ? '正在连接多维空间...' : 'Linking Dimensions...') 
                      : (currentModel ? 'Neural Context Active' : (lang === 'zh' ? '星云模式：保护隐私中' : 'Nebula Mode: Privacy Active'))}
                  </span>
               </div>
            </div>
          </div>

          <Suspense fallback={null}>
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, alpha: false }}>
              <color attach="background" args={["#000000"]} />
              <fog attach="fog" args={["#000000", 5, 15]} />
              <ambientLight intensity={0.1} />
              <pointLight position={[10, 10, 10]} intensity={0.2} color="#00f2ff" />
              <pointLight position={[-10, -10, -10]} intensity={0.05} color="#ffd700" />
              
              <group scale={handScale} rotation={[0, handPos.x, 0]}>
                <ParticleSystem 
                  modelUrl={currentModel?.url} 
                  mtlUrl={currentModel?.mtlUrl}
                  textures={currentModel?.textures}
                  morphProgress={morphProgress} 
                  handVector={handVector} 
                  isPaused={isPaused}
                  lang={lang}
                  onLoadStart={handleModelLoadStart}
                  onLoadComplete={handleModelLoadComplete}
                  onLoadError={handleModelLoadError}
                />
              </group>

              <EffectComposer multisampling={0}>
                <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.1} intensity={0.25} />
              </EffectComposer>

              <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>
          </Suspense>
          
          {/* Model Loading Overlay */}
          <AnimatePresence>
            {isModelLoading && !modelLoadError && currentModel && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none text-center backdrop-blur-[2px] bg-black/20"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                      className="absolute inset-0 border-t-2 border-neon-blue rounded-full opacity-50"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 3, ease: "linear", repeat: Infinity }}
                      className="absolute inset-2 border-b-2 border-yellow-500 rounded-full opacity-50"
                    />
                    <Sparkles size={16} className="text-white/50 animate-pulse" />
                  </div>
                  <div className="text-[10px] text-white/50 uppercase tracking-[0.3em] font-bold">
                    {lang === 'zh' ? '正在解析时空数据...' : 'Parsing Spatial Data...'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Loading Error Overlay */}
          <AnimatePresence>
            {modelLoadError && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <Box size={48} className="text-red-500/50 mb-4" />
                <h3 className="text-xl font-display text-white mb-2 uppercase tracking-tight">
                  {lang === 'zh' ? '模型加载失败' : 'Model Load Failed'}
                </h3>
                <p className="text-xs text-white/40 max-w-md mb-6 leading-relaxed">
                  {lang === 'zh' 
                    ? "由于CORS协议限制或链接无效，无法从外部服务器获取三维数据。建议检查访问链接是否正确。如果问题持续，请尝试下载该OBJ文件后点击左侧“+”号手动上传。" 
                    : "Unable to fetch 3D data. Please verify the model URL and check if the host server allows CORS. If this persists, try downloading the OBJ file and click '+' on the left to upload it manually."}
                </p>
                <div className="text-[10px] bg-red-500/10 border border-red-500/20 px-3 py-2 rounded font-mono text-red-400 mb-6 max-w-xs break-all shadow-inner shadow-red-500/10">
                  ERROR: {modelLoadError}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setModelLoadError(null);
                      // Force re-render if needed, but usually same URL won't reload
                      // We can just switch back to nebula or clear active model
                    }}
                    className="px-6 py-2 bg-white/10 text-white text-[10px] uppercase font-bold tracking-widest rounded-full hover:bg-white/20 transition-colors border border-white/10"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => {
                      setModelLoadError(null);
                      fileInputRef.current?.click();
                    }}
                    className="px-6 py-2 bg-neon-blue text-black text-[10px] uppercase font-bold tracking-widest rounded-full hover:bg-white transition-colors"
                  >
                    {lang === 'zh' ? '本地上传' : 'Upload Local'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Gesture HUD */}
          <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end gap-6 text-right">
             <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    isPaused 
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' 
                      : 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue hover:bg-neon-blue/20'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-neon-blue'} animate-pulse`} />
                  <span className="text-[9px] uppercase tracking-widest font-bold">
                    {isPaused ? 'Paused' : 'Playing'}
                  </span>
                </button>
             </div>
             
             <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-white/30">Motion Status</div>
                <div className={`text-xs font-mono font-bold flex items-center justify-end gap-2 transition-colors ${!isInteractionEnabled ? 'text-white/30' : (handVector.x === 999 ? 'text-red-500/50' : 'text-neon-blue')}`}>
                  <Rotate3d size={12} className={(!isInteractionEnabled || handVector.x === 999) ? '' : 'animate-spin-slow'} />
                  {!isInteractionEnabled ? "CLICK_TO_START" : (handVector.x === 999 ? "WAITING_FOR_HAND" : (isOkGesture ? "MORPH_ACTIVE" : "ACTIVE_TRACKING"))}
                </div>
             </div>
             <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-widest text-white/30">Current Scale</div>
                <div className="text-xl font-display font-light text-white tracking-widest">
                  {handScale.toFixed(2)}x
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Hand Tracker & Camera Overlay */}
      {isInteractionEnabled ? (
        <HandTracker 
          onResults={handleHandResults} 
          onStatusChange={handleCameraStatusChange}
          gestureActive={isOkGesture}
        />
      ) : (
        <button 
          onClick={() => setIsInteractionEnabled(true)}
          className="fixed bottom-6 right-6 w-48 h-36 bg-black/80 backdrop-blur-md rounded-xl border border-neon-blue/30 z-50 flex flex-col items-center justify-center group shadow-2xl hover:bg-neon-blue/10 transition-all cursor-pointer"
        >
          <Camera className="text-neon-blue mb-2 group-hover:scale-110 transition-transform duration-300" size={24} />
          <span className="text-[10px] uppercase font-bold tracking-widest text-neon-blue">{lang === 'zh' ? '启动手势交互' : 'Start Interaction'}</span>
          <span className="text-[7px] text-white/50 mt-1 uppercase tracking-widest">Enable Hand Tracking</span>
        </button>
      )}
      
      {/* Gesture Trigger Progress */}
      <AnimatePresence>
        {morphProgress > 0 && morphProgress < 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-12 right-24 z-50 flex flex-col items-center gap-2"
          >
            <div className="relative w-16 h-16">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-white/10"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={175.9}
                  strokeDashoffset={175.9 - morphProgress * 175.9}
                  className="text-yellow-500 transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[8px] font-bold text-yellow-500">FIST</span>
              </div>
            </div>
            <span className="text-[8px] uppercase tracking-widest text-yellow-500/80 font-bold">{lang === 'zh' ? '正在重组' : 'Morphing'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
