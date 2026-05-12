import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader, MTLLoader } from 'three-stdlib';

const particleCount = 100000;

const vertexShader = `
  uniform float uTime;
  uniform float uMorphProgress;
  uniform vec3 uHandPos;
  attribute vec3 aTargetPosition;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aTwinkleSpeed;
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vHandGlow;
  varying vec3 vTurbulence;

  void main() {
    // --- Space / Starry Sky Spatial Color Scheme ---
    vec3 spacePurple = vec3(0.5, 0.2, 0.8);
    vec3 spaceCyan = vec3(0.1, 0.8, 0.9);
    vec3 spaceBlue = vec3(0.05, 0.2, 0.8);
    vec3 starlight = vec3(0.95, 0.95, 1.0);

    // Use aTargetPosition for spatial coloring so the model colors are stable
    float hMix = smoothstep(-6.0, 6.0, aTargetPosition.y);
    float wMix = smoothstep(-6.0, 6.0, aTargetPosition.x);
    
    // Smooth transition from dark blue/purple deep space into bright cyan/white
    vec3 color1 = mix(spaceBlue, spacePurple, hMix);
    vec3 color2 = mix(spaceCyan, starlight, hMix);
    vec3 spatialColor = mix(color1, color2, wMix);
    
    // Mix with instance color base to keep some variety
    vColor = mix(aColor, spatialColor, uMorphProgress);
    
    // Refined twinkle effect
    float rawTwinkle = sin(uTime * aTwinkleSpeed + position.x * 15.0 + position.y * 10.0);
    vTwinkle = 0.2 + 0.8 * pow((rawTwinkle + 1.0) * 0.5, 3.0);
    
    // Mix between cloud and model position
    vec3 mixedPosition = mix(position, aTargetPosition, uMorphProgress);
    
    // Smooth idle motion for nebula state
    float flowTime = uTime * 0.15;
    // More subtle fading of motion into model state
    float idleFactor = smoothstep(0.8, 0.0, uMorphProgress);
    
    // Flocking / organic turbulence combining multiple frequencies
    vec3 turbulence = vec3(
        sin(position.y * 2.0 + flowTime) * cos(position.z * 1.5 + flowTime * 0.8),
        cos(position.z * 2.0 + flowTime) * sin(position.x * 1.5 - flowTime * 0.8),
        sin(position.x * 2.0 - flowTime) * cos(position.y * 1.5 + flowTime * 0.8)
    );
    
    // Add second layer for more complex "school of fish" movement
    vec3 flockingOffset = vec3(
        cos(position.z * 4.0 + flowTime * 2.0),
        sin(position.x * 4.0 - flowTime * 1.5),
        cos(position.y * 4.0 + flowTime * 1.8)
    ) * 0.15;
    
    vTurbulence = turbulence * idleFactor;
    
    // Rotating spiral motion
    float angle = flowTime * 0.2 * idleFactor;
    float s = sin(angle);
    float c = cos(angle);
    vec2 rotatedPos = mat2(c, -s, s, c) * mixedPosition.xz;
    mixedPosition.x = rotatedPos.x;
    mixedPosition.z = rotatedPos.y;
    
    // Apply organic motion
    mixedPosition += (turbulence * 0.4 + flockingOffset) * idleFactor;
    
    mixedPosition *= (1.0 + sin(uTime * 0.5) * 0.05 * idleFactor);
    
    // Hand interaction: smooth repulsion with tangential force
    float distToHand = distance(mixedPosition, uHandPos);
    float repulsionRadius = mix(5.0, 2.5, uMorphProgress); // Larger interaction radius
    float repulsionStrength = smoothstep(repulsionRadius, 0.0, distToHand);
    
    if (repulsionStrength > 0.0) {
      vec3 dir = normalize(mixedPosition - uHandPos);
      // stronger force
      float force = repulsionStrength * 3.0 * (1.0 - uMorphProgress * 0.6);
      
      // Dynamic tangential swirl depending on position
      vec3 swirlAxis = normalize(uHandPos + vec3(0.0, 1.0, 0.0));
      vec3 tangent = cross(dir, swirlAxis);
      
      // Add a chaotic twisting force
      float twist = sin(uTime * 2.0 + distToHand) * repulsionStrength;
      vec3 twistForce = cross(dir, tangent) * twist;
      
      mixedPosition += dir * force + tangent * force * 1.5 + twistForce * 2.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(mixedPosition, 1.0);
    
    // Dynamic point size scaling based on hand proximity
    float handProximityScale = 1.0 + repulsionStrength * 3.0;
    vHandGlow = repulsionStrength;

    // Dynamic point size: smaller for ethereal feel
    float baseScale = 0.012 + (1.0 - uMorphProgress) * 0.03;
    float sizeScale = baseScale * handProximityScale;
    float finalSize = aSize * (0.8 + 0.2 * vTwinkle) * sizeScale;
    
    // Scale for depth manually
    float depth = max(0.1, -mvPosition.z);
    gl_PointSize = clamp(finalSize * (400.0 / depth), 0.5, 3.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vHandGlow;
  varying vec3 vTurbulence;

  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // Increase intensity of twinkle based on brightness (luminance of particle color)
    float luminance = dot(vColor, vec3(0.299, 0.587, 0.114));
    float enhancedTwinkle = vTwinkle * (0.8 + luminance * 0.8);
    
    // Star blending: Additive
    vec3 celestialTint = vec3(0.6, 0.8, 1.0); // Bright icy blue for starry sky
    vec3 starColor = mix(vColor, celestialTint, enhancedTwinkle * 0.5);
    
    // Color shift based on flocking turbulence (speed/movement)
    float turbulenceSpeed = length(vTurbulence);
    vec3 movementColorShift = vec3(0.1, 0.2, 0.5) * turbulenceSpeed * 2.5; // Shift towards deep blue/purple
    starColor += movementColorShift;
    
    // Smooth particle edge
    float distanceToCenter = length(cxy);
    float alpha = 1.0 - smoothstep(0.0, 1.0, distanceToCenter);
    
    // Core + Flare
    float core = pow(alpha, 1.5);
    float flare = max(0.0, 1.0 - abs(cxy.x) * 4.0) * max(0.0, 1.0 - abs(cxy.y) * 4.0);
    
    float finalAlpha = (core + flare * 0.3) * enhancedTwinkle * 0.4;
    
    // Apply hand interaction glowing effect
    vec3 interactionBaseColor = vec3(0.2, 0.8, 0.9); // Cyan
    vec3 interactionPeakColor = vec3(0.9, 0.3, 0.8); // Pink/Purple when very close
    
    // Shift color from cyan to pink based on proximity
    vec3 interactionColor = mix(interactionBaseColor, interactionPeakColor, vHandGlow);
    
    starColor = mix(starColor, interactionColor, vHandGlow * 0.85);
    
    // Enhance brightness and opacity when reacting to turbulence and hand
    finalAlpha += vHandGlow * (0.5 + turbulenceSpeed * 0.5); // Make them brighter near hand and when swirling
    
    // Reduce overall alpha since we have 100,000 particles and AdditiveBlending
    finalAlpha *= 0.15;
    
    gl_FragColor = vec4(starColor * finalAlpha, finalAlpha);
  }
`;

interface ParticleSystemProps {
  modelUrl?: string;
  mtlUrl?: string;
  textures?: Record<string, string>;
  morphProgress: number;
  handVector: { x: number; y: number; z: number };
  isPaused: boolean;
  lang: 'zh' | 'en';
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (errorMessage: string) => void;
}

export default function ParticleSystem({ modelUrl, mtlUrl, textures, morphProgress, handVector, isPaused, lang, onLoadStart, onLoadComplete, onLoadError }: ParticleSystemProps) {
  const meshRef = useRef<THREE.Points>(null);
  const internalTime = useRef(0);
  const lastCallTime = useRef(0);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMorphProgress: { value: 0 },
    uHandPos: { value: new THREE.Vector3(999, 999, 999) }
  }), []);

  const [positions, targetPositions, colors, sizes, twinkleSpeeds] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const targetPos = new Float32Array(particleCount * 3);
    const cols = new Float32Array(particleCount * 3);
    const szs = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Start in a denser, more organized nebula cloud (Golden Ratio spiral)
      const phi = Math.acos(1 - 2 * (i / particleCount));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.0 + Math.random() * 3.5; // Slightly more spread for nebula
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // Add some random "dust" around the sphere
      if (Math.random() > 0.85) {
        pos[i * 3] *= 1.4;
        pos[i * 3 + 1] *= 1.4;
        pos[i * 3 + 2] *= 1.4;
      }

      targetPos[i * 3] = pos[i * 3];
      targetPos[i * 3 + 1] = pos[i * 3 + 1];
      targetPos[i * 3 + 2] = pos[i * 3 + 2];

      // Star sizes: faint mostly, few large ones
      szs[i] = Math.random() < 0.95 ? 0.2 + Math.random() * 0.4 : 0.8 + Math.random() * 1.5;
      speeds[i] = 0.5 + Math.random() * 2.5;

      // Space palette: Very subtle white/cyan/purple
      const rand = Math.random();
      if (rand > 0.95) {
        cols[i * 3] = 0.8;      // Pinkish/Purple
        cols[i * 3 + 1] = 0.4;
        cols[i * 3 + 2] = 0.8;
      } else if (rand > 0.8) {
        cols[i * 3] = 0.2;      // Deep Azure
        cols[i * 3 + 1] = 0.6;
        cols[i * 3 + 2] = 1.0;
      } else if (rand > 0.5) {
        cols[i * 3] = 0.6;      // Cyan/Light Blue
        cols[i * 3 + 1] = 0.9;
        cols[i * 3 + 2] = 1.0;
      } else {
        cols[i * 3] = 0.95;     // White Starlight
        cols[i * 3 + 1] = 0.95;
        cols[i * 3 + 2] = 1.0;
      }
    }
    return [pos, targetPos, cols, szs, speeds];
  }, []);

  const onLoadStartRef = useRef(onLoadStart);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onLoadErrorRef = useRef(onLoadError);

  useEffect(() => {
    onLoadStartRef.current = onLoadStart;
    onLoadCompleteRef.current = onLoadComplete;
    onLoadErrorRef.current = onLoadError;
  }, [onLoadStart, onLoadComplete, onLoadError]);

  const [loadedMesh, setLoadedMesh] = React.useState<THREE.Group | null>(null);

  useEffect(() => {
    if (!modelUrl) return;

    onLoadStartRef.current?.();
    setLoadedMesh(null);

    const manager = new THREE.LoadingManager();
    if (textures) {
      manager.setURLModifier((url) => {
        const filename = url.split(/[\\/]/).pop();
        if (filename && textures[filename]) {
          return textures[filename];
        }
        return url;
      });
    }

    const loader = new OBJLoader(manager);
    const loadObj = (loaderInstance: OBJLoader, url: string) => {
      loaderInstance.load(
        url, 
        (obj) => {
          onLoadCompleteRef.current?.();
          console.log("Model loaded successfully:", url.substring(0, 50) + "...");
          
          const allMats: THREE.Material[] = [];
          
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                const setupMaterial = (mat: THREE.Material) => {
                  mat.transparent = true;
                  mat.opacity = 0;
                  mat.depthWrite = false; // Fix: use false for transparency to avoid z-fighting artifacts
                  allMats.push(mat);
                };
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(setupMaterial);
                } else {
                  setupMaterial(mesh.material);
                }
              }
            }
          });
          
          obj.userData.mats = allMats;
          setLoadedMesh(obj);

          let points: THREE.Vector3[] = [];
          
          obj.updateMatrixWorld(true);
          
          obj.traverse((child: any) => {
            if (child.geometry) {
              child.updateMatrixWorld(true);
              const geometry = child.geometry;
              const posAttr = geometry.getAttribute('position');
              if (posAttr) {
                for (let i = 0; i < posAttr.count; i++) {
                  const p = new THREE.Vector3(
                    posAttr.getX(i),
                    posAttr.getY(i),
                    posAttr.getZ(i)
                  );
                  // Transform local vertex space to object world space
                  p.applyMatrix4(child.matrixWorld);
                  points.push(p);
                }
              }
            }
          });

          if (points.length === 0) {
            console.warn("No points found in OBJ, creating fallback sphere...");
            for(let i=0; i<3000; i++) {
              const phi = Math.acos(-1 + (2 * i) / 3000);
              const theta = Math.sqrt(3000 * Math.PI) * phi;
              points.push(new THREE.Vector3(
                Math.cos(theta) * Math.sin(phi),
                Math.sin(theta) * Math.sin(phi),
                Math.cos(phi)
              ).multiplyScalar(2.5));
            }
          }

          // Normalize size and center points
          const box = new THREE.Box3().setFromPoints(points);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          // Scale to comfortable screen size (~6 units, slightly larger to be visible but not too big limit)
          const scaleFactor = maxDim > 0 ? 6.0 / maxDim : 1.0;

          // Apply to the 3D model itself so it aligns with particles
          obj.position.copy(center).multiplyScalar(-scaleFactor);
          obj.scale.set(scaleFactor, scaleFactor, scaleFactor);

          for (let i = 0; i < points.length; i++) {
            points[i].sub(center).multiplyScalar(scaleFactor);
          }

          const newTargets = new Float32Array(particleCount * 3);
          
          for (let i = 0; i < particleCount; i++) {
            // Pick rand points with slight displacement
            const v = points[Math.floor(Math.random() * points.length)];
            const jitterScale = 0.1; // constant jitter in normalized space
            newTargets[i * 3] = v.x + (Math.random() - 0.5) * jitterScale;
            newTargets[i * 3 + 1] = v.y + (Math.random() - 0.5) * jitterScale;
            newTargets[i * 3 + 2] = v.z + (Math.random() - 0.5) * jitterScale;
          }
          if (meshRef.current) {
            const geom = meshRef.current.geometry;
            const targetAttr = geom.getAttribute('aTargetPosition');
            if (targetAttr) {
              const targetArray = targetAttr.array as Float32Array;
              for(let i=0; i<newTargets.length; i++) {
                targetArray[i] = newTargets[i];
              }
              targetAttr.needsUpdate = true;
            } else {
               geom.setAttribute('aTargetPosition', new THREE.BufferAttribute(newTargets, 3));
            }
            
            // Force reset local morph progress to trigger morph animation
            uniforms.uMorphProgress.value = 0.0;
          }
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log(`Loading model: ${percentComplete}%`);
          }
        },
        (error) => {
          onLoadCompleteRef.current?.();
          const msg = error instanceof Error ? error.message : String(error);
          console.warn("OBJ Load Error. Handled by UI.", msg);
          
          let userFriendlyMsg = msg;
          if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('access-control')) {
            userFriendlyMsg = lang === 'zh' 
              ? "获取失败：该链接受到浏览器CORS安全策略限制。如果该文件是GitHub/Dropbox链接，系统已尝试自动修正，但源站仍拒绝了请求。请下载OBJ文件后点击下方的“本地上传”按钮手动导入。" 
              : "Fetch Failed: Blocked by CORS security. If this is a GitHub/Dropbox link, we've tried auto-correcting it, but the host still rejected the request. Please download the OBJ file and use the 'Upload Local' button below.";
          } else if (msg.toLowerCase().includes('404')) {
            userFriendlyMsg = lang === 'zh' ? "404: 链接失效或文件不存在。" : "404: Link broken or file does not exist.";
          }
          
          onLoadErrorRef.current?.(userFriendlyMsg);
        }
      );
    };

    // ... URLs checking ...
    let activeUrl = modelUrl;
    const isBlobUrl = activeUrl.startsWith('blob:');
    if (activeUrl.includes('github.com') && !activeUrl.includes('raw.githubusercontent.com') && !isBlobUrl) {
      activeUrl = activeUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    if (activeUrl.includes('dropbox.com') && !activeUrl.includes('dl=1') && !isBlobUrl) {
      activeUrl = activeUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    }
    if (activeUrl.startsWith('http://') && window.location.protocol === 'https:' && !isBlobUrl) {
      activeUrl = activeUrl.replace('http://', 'https://');
    }
    if (activeUrl.includes('#blob-')) {
      activeUrl = activeUrl.split('#')[0];
    }

    if (mtlUrl) {
      const mtlActiveUrl = mtlUrl.includes('#blob-') ? mtlUrl.split('#')[0] : mtlUrl;
      const mtlLoader = new MTLLoader(manager);
      mtlLoader.load(mtlActiveUrl, (materials) => {
        materials.preload();
        loader.setMaterials(materials);
        loadObj(loader, activeUrl);
      }, undefined, (e) => {
        console.warn("Failed to load MTL, continuing with OBJ...", e);
        loadObj(loader, activeUrl);
      });
    } else {
      loadObj(loader, activeUrl);
    }
  }, [modelUrl, mtlUrl, textures, lang]);

  useFrame((state) => {
    if (meshRef.current) {
      // Base drift even when paused
      const driftSpeed = isPaused ? 0.05 : 1.0;
      const delta = (state.clock.elapsedTime - lastCallTime.current) * driftSpeed;
      if (lastCallTime.current > 0) {
        internalTime.current += delta;
      }
      uniforms.uTime.value = internalTime.current;
      lastCallTime.current = state.clock.elapsedTime;
      
      uniforms.uMorphProgress.value = THREE.MathUtils.lerp(uniforms.uMorphProgress.value, morphProgress, 0.1);
      
      // Update hand position for shader interaction
      uniforms.uHandPos.value.lerp(new THREE.Vector3(handVector.x, handVector.y, handVector.z), 0.1);

      if (loadedMesh && loadedMesh.userData.mats) {
        const meshFade = Math.pow(uniforms.uMorphProgress.value, 3.0); 
        
        const mats = loadedMesh.userData.mats as THREE.Material[];
        for (let i = 0; i < mats.length; i++) {
           if (mats[i].opacity !== meshFade) {
               mats[i].opacity = meshFade;
           }
        }
      }
    }
  });

  return (
    <group>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aTargetPosition"
            count={particleCount}
            array={targetPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={particleCount}
            array={colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aSize"
            count={particleCount}
            array={sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aTwinkleSpeed"
            count={particleCount}
            array={twinkleSpeeds}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
