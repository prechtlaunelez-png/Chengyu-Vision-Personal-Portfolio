import React, { useRef, useEffect, useState } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';

interface HandTrackerProps {
  onResults: (results: Results) => void;
  onStatusChange?: (status: { isInitializing: boolean; error: string | null; isRunning: boolean }) => void;
  gestureActive?: boolean;
}

// Remove local variables to prevent HMR shadowing
// We'll use (window as any) for global singletons to survive HMR

const HandTracker = React.memo(({ onResults, onStatusChange, gestureActive = false }: HandTrackerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const onResultsRef = useRef(onResults);
  const gestureActiveRef = useRef(gestureActive);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const retryCountRef = useRef(0);

  const onStatusChangeRef = useRef(onStatusChange);
  
  useEffect(() => {
    gestureActiveRef.current = gestureActive;
  }, [gestureActive]);
  
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  // Report status to parent
  useEffect(() => {
    onStatusChangeRef.current?.({ isInitializing, error, isRunning });
  }, [isInitializing, error, isRunning]);

  // Update ref when onResults changes
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  const isStarting = useRef(false);

  const startCamera = async () => {
    if (isStarting.current) return;
    isStarting.current = true;
    setError(null);
    setIsInitializing(true);
    
    // Cleanup existing stream if any
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn("Cleanup error:", e);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("NO_SECURE_CONTEXT: 无法访问相机 API。请检查浏览器安全设置。 / API blocked.");
      setIsInitializing(false);
      isStarting.current = false;
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      
      const constraints = selectedDeviceId 
        ? { video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } } }
        : { video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsInitializing(false);
            setError(null);
            setIsRunning(true);
          }).catch(playErr => {
            console.warn("Video play failed:", playErr);
            setError("播放失败 / Play failed");
            setIsInitializing(false);
          });
        };
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      const errMsg = err.message || String(err);
      if (errMsg.toLowerCase().includes('permission') || err.name === 'NotAllowedError') {
        setError("访问拒绝: 请检查浏览器权限或在新标签页中打开 / Permission Denied: Check browser permissions or open in new tab");
      } else if (err.name === 'NotReadableError' || errMsg.toLowerCase().includes('could not start video source')) {
        setError("相机被占用或故障: 请关闭其他使用相机的应用 / Camera in use: Please close other apps using the camera");
      } else {
        // Fallback for devices that don't support 640x480 or facingMode
        try {
           const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
           if (videoRef.current) {
             videoRef.current.srcObject = fallbackStream;
             videoRef.current.onloadedmetadata = () => {
               videoRef.current?.play().then(() => {
                 setIsInitializing(false);
                 setError(null);
                 setIsRunning(true);
               }).catch(() => setIsInitializing(false));
             };
           }
        } catch (fallbackErr: any) {
           const fbErrMsg = fallbackErr.message || String(fallbackErr);
           if (fbErrMsg.toLowerCase().includes('permission') || fallbackErr.name === 'NotAllowedError') {
             setError("访问拒绝: 请检查浏览器权限或在新标签页中打开 / Permission Denied: Check browser permissions or open in new tab");
           } else if (fbErrMsg.toLowerCase().includes('could not start video source') || fallbackErr.name === 'NotReadableError') {
             setError("相机被占用或故障: 请关闭其他应用程序 / Camera in use or hardware failure: Close other apps");
           } else {
             setError(`连接失败 / Connection fail: ${fbErrMsg}`);
           }
           setIsInitializing(false);
           setIsRunning(false);
        }
      }
    }
    isStarting.current = false;
  };

  useEffect(() => {
    let hands: any;
    let keepRunning = true;
    let animationId: number;
    
    const initHands = async () => {
      try {
        if (!(window as any).globalHandsInstance) {
          // Dynamically load hands.js to avoid bundler issues
          if (!(window as any).Hands) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = '/hands-assets/hands.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Failed to load MediaPipe script'));
              document.head.appendChild(script);
            });
          }

          const GlobalHands = (window as any).Hands;
          hands = new GlobalHands({
            locateFile: (file: string) => {
              return `/hands-assets/${file}`;
            }
          });

          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          
          (window as any).globalHandsInstance = hands;
          (window as any).globalInitPromise = hands.initialize().then(() => {
            console.log("Hands model initialized successfully!");
            (window as any).isModelReady = true;
          }).catch((e: Error) => {
            console.warn("Hands model init failed:", e);
            if (keepRunning) {
              setError("Engine Crash: (Please refresh / 请刷新页面) " + e.message);
              setIsInitializing(false);
            }
          });
        } else {
          hands = (window as any).globalHandsInstance;
        }

        hands.onResults((results: any) => {
          if (!keepRunning) return;
          onResultsRef.current(results);
          
          if (canvasRef.current && videoRef.current) {
            const canvasCtx = canvasRef.current.getContext('2d');
            if (!canvasCtx) return;

            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
              const time = Date.now();
              const handPulse = (Math.sin(time / 200) + 1) * 0.5;
              const isActive = gestureActiveRef.current;
              const activeColor = isActive ? 'rgba(0, 255, 0, 1)' : 'rgba(0, 243, 255, 1)';
              const glowColor = isActive ? `rgba(0, 255, 0, ${0.4 + handPulse * 0.4})` : `rgba(0, 243, 255, ${0.4 + handPulse * 0.4})`;

              for (const landmarks of results.multiHandLandmarks) {
                canvasCtx.strokeStyle = glowColor;
                canvasCtx.lineWidth = isActive ? 1.5 : 1 + handPulse * 0.5;
                canvasCtx.beginPath();
                const connections = (window as any).HAND_CONNECTIONS || [
                  [0, 1], [1, 2], [2, 3], [3, 4],
                  [0, 5], [5, 6], [6, 7], [7, 8],
                  [5, 9], [9, 10], [10, 11], [11, 12],
                  [9, 13], [13, 14], [14, 15], [15, 16],
                  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
                ];
                for (const connection of connections) {
                  const start = landmarks[connection[0]];
                  const end = landmarks[connection[1]];
                  if (start && end) {
                    canvasCtx.moveTo(start.x * canvasRef.current.width, start.y * canvasRef.current.height);
                    canvasCtx.lineTo(end.x * canvasRef.current.width, end.y * canvasRef.current.height);
                  }
                }
                canvasCtx.stroke();
                
                const palm = landmarks[0];
                if (palm) {
                   canvasCtx.beginPath();
                   canvasCtx.arc(palm.x * canvasRef.current.width, palm.y * canvasRef.current.height, isActive ? 12 + handPulse * 6 : 10 + handPulse * 10, 0, Math.PI * 2);
                   canvasCtx.fillStyle = isActive ? `rgba(0, 255, 0, ${0.2 + handPulse * 0.2})` : `rgba(0, 243, 255, ${0.1 * (1 - handPulse)})`;
                   canvasCtx.fill();
                   canvasCtx.strokeStyle = isActive ? `rgba(0, 255, 0, ${0.4 + handPulse * 0.4})` : `rgba(0, 243, 255, ${0.2 * handPulse})`;
                   canvasCtx.stroke();
                }
                
                canvasCtx.fillStyle = isActive ? '#00ff00' : '#00f3ff';
                for (let i = 0; i < landmarks.length; i++) {
                   const data = landmarks[i];
                   const x = data.x * canvasRef.current.width;
                   const y = data.y * canvasRef.current.height;
                   
                   let r = 1.2;
                   if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
                     r = isActive ? 3.5 + handPulse * 1.5 : 2.5 + handPulse * 1.5;
                   }
                   
                   canvasCtx.beginPath();
                   canvasCtx.arc(x, y, r, 0, Math.PI * 2);
                   canvasCtx.fill();
                }
              }
            } else {
              canvasCtx.translate(canvasRef.current.width, 0);
              canvasCtx.scale(-1, 1);
              
              const time = Date.now();
              const pulse = (Math.sin(time / 300) + 1) * 0.5;
              const slowPulse = (Math.sin(time / 800) + 1) * 0.5;
              const dots = ".".repeat(Math.floor((time / 400) % 4));
              
              canvasCtx.fillStyle = `rgba(0, 243, 255, ${0.3 + slowPulse * 0.3})`;
              canvasCtx.font = 'bold 9px monospace';
              canvasCtx.textAlign = 'center';
              canvasCtx.fillText(`SCANNING${dots}`, canvasRef.current.width / 2, canvasRef.current.height / 2);
              
              canvasCtx.beginPath();
              canvasCtx.arc(canvasRef.current.width / 2, canvasRef.current.height / 2, 20 + pulse * 15, 0, Math.PI * 2);
              canvasCtx.strokeStyle = `rgba(0, 243, 255, ${0.1 + (1 - pulse) * 0.3})`;
              canvasCtx.lineWidth = 1;
              canvasCtx.stroke();
              
              canvasCtx.beginPath();
              canvasCtx.arc(canvasRef.current.width / 2, canvasRef.current.height / 2, 35 + pulse * 5, 0, Math.PI * 2);
              canvasCtx.strokeStyle = `rgba(0, 243, 255, ${0.05})`;
              canvasCtx.stroke();
            }
            canvasCtx.restore();
          }
        });

        handsRef.current = hands;
      } catch (e) {
        console.warn("Sync init failure:", e);
        if (keepRunning) {
          setError("Engine Crash: (Please refresh / 请刷新页面)");
          setIsInitializing(false);
        }
      }
    };
    
    initHands();

    const cameraTimer = setTimeout(() => {
      startCamera();
    }, 1000);

    let lastVideoTime = -1;
    let lastProcessTime = 0;
    const process = async () => {
      if (!keepRunning) return;
      
      const vRef = videoRef.current;
      const now = Date.now();
      if (vRef && !vRef.paused && !vRef.ended && vRef.readyState >= 2 && vRef.videoWidth > 0 && (window as any).isModelReady && hands) {
        if (vRef.currentTime !== lastVideoTime && !(window as any).globalIsProcessing && (now - lastProcessTime > 40)) {
          lastVideoTime = vRef.currentTime;
          lastProcessTime = now;
          (window as any).globalIsProcessing = true;
          
          if (canvasRef.current && (canvasRef.current.width !== vRef.videoWidth || canvasRef.current.height !== vRef.videoHeight)) {
            canvasRef.current.width = vRef.videoWidth;
            canvasRef.current.height = vRef.videoHeight;
          }
          try {
            await hands.send({ image: vRef });
          } catch (e) {
            console.warn("Hands send skipped/error", e);
            if (String(e).includes("abort") || String(e).includes("out of bounds") || String(e).includes("arguments_")) {
              console.warn("Wasm crashed, resetting global hands model...");
              setError("摄像头引擎崩溃，请刷新页面重试 / Engine crashed, please refresh page");
              (window as any).globalHandsInstance = null;
              (window as any).globalInitPromise = null;
              (window as any).isModelReady = false;
            }
          } finally {
            (window as any).globalIsProcessing = false;
          }
        }
      }
      if (keepRunning) {
        animationId = requestAnimationFrame(process);
      }
    };
    process();

    return () => {
      keepRunning = false;
      clearTimeout(cameraTimer);
      cancelAnimationFrame(animationId);
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 w-48 h-36 bg-[#030014] rounded-xl overflow-hidden border border-white/10 z-50 flex items-center justify-center group shadow-2xl">
      {/* Starry Sky Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
      </div>

      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[4px] pointer-events-none saturate-50"
        style={{ transform: 'scaleX(-1)' }}
        muted
        playsInline
        autoPlay
      />
      
      {/* Skeleton Visualization - Only thing the user sees clearly */}
      <canvas 
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-10 ${(error || isInitializing) ? 'opacity-0' : 'opacity-100'}`}
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Privacy Mode Indicator */}
      {!error && !isInitializing && (
        <div className="absolute inset-0 pointer-events-none border-2 border-neon-blue/20 rounded-xl" />
      )}
      
      {isInitializing && !error && (
        <div className="z-10 flex flex-col items-center gap-2">
          <RefreshCw className="text-neon-blue animate-spin" size={24} />
          <span className="text-[8px] uppercase tracking-widest text-white/50">Waking Sensor...</span>
          <button 
            onClick={startCamera}
            className="mt-2 text-[7px] text-neon-blue underline uppercase tracking-tighter"
          >
            Force Start
          </button>
        </div>
      )}

      {error && (
        <div className="z-10 p-3 flex flex-col items-center text-center gap-2 bg-black/60 inset-0 absolute justify-center">
          <CameraOff className="text-red-500 mb-1" size={18} />
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest text-red-500 font-bold">
              {error.split(':')[0]}
            </p>
            <p className="text-[8px] text-white/80 leading-tight">
              {error.includes(':') ? error.substring(error.indexOf(':') + 1).trim() : error}
            </p>
          </div>

          {availableDevices.length > 1 && (
            <select 
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                setTimeout(() => startCamera(), 100);
              }}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[8px] text-white outline-none mt-1"
            >
              <option value="">默认摄像头 / Default Camera</option>
              {availableDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          )}

          <div className="flex flex-col gap-1.5 w-full px-1">
            <button 
              onClick={() => startCamera()}
              className="flex items-center justify-center gap-2 py-1.5 bg-neon-blue/20 hover:bg-neon-blue/30 border border-neon-blue/30 rounded-md transition-all active:scale-95"
            >
              <RefreshCw size={10} className="text-neon-blue" />
              <span className="text-[8px] uppercase font-bold tracking-widest text-neon-blue">立即连接 / RECONNECT</span>
            </button>
            <div className="text-[6px] text-white/40 bg-white/5 py-1 px-2 rounded space-y-0.5 text-left border border-white/5 lowercase">
               <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-white/20 rounded-full"/> Close other tabs</div>
               <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-white/20 rounded-full"/> Quit Zoom/WeChat</div>
               <div className="flex items-center gap-1"><div className="w-0.5 h-0.5 bg-white/20 rounded-full"/> Check system privacy</div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="py-1 text-[7px] text-white/40 hover:text-white/60 uppercase tracking-tighter"
            >
              刷新整个页面 / FULL RELOAD
            </button>
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="py-1 text-[7px] text-neon-blue/80 hover:text-neon-blue uppercase tracking-tighter underline"
            >
              在新标签页中打开 / OPEN IN NEW TAB 🌐
            </button>
          </div>
          <p className="text-[6px] text-white/20 uppercase mt-0.5 leading-tight">
            隐私提示: 仅捕捉手部骨骼数据，不记录面部信息
          </p>
        </div>
      )}

      {!error && !isInitializing && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full border border-neon-blue/20 w-fit pointer-events-none">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-blue animate-pulse" />
            <span className="text-[7px] uppercase tracking-widest text-neon-blue/80 font-bold">Camera Active</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default HandTracker;
