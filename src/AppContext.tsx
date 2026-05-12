import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_CONFIG, INITIAL_PROJECTS } from './constants';
import { Project, SiteConfig } from './types';
import { saveToDB, loadFromDB } from './lib/storage';

interface AppContextType {
  lang: 'zh' | 'en';
  setLang: (lang: 'zh' | 'en') => void;
  config: SiteConfig;
  setConfig: (config: SiteConfig) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isInitialLoad: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [config, setConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [isPaused, setIsPaused] = useState(false);

  // Initial Load from IDB
  useEffect(() => {
    async function loadData() {
      try {
        const [savedConfig, savedProjects] = await Promise.all([
          loadFromDB('config', 'main'),
          loadFromDB('projects', 'list')
        ]);

        if (savedConfig) {
          const parsed = savedConfig as SiteConfig;
          
          // Resolve Blob IDs if present in URLs
          const resolveBlobs = async (models: any[]) => {
            const { loadFromDB } = await import('./lib/storage');
            return Promise.all(models.map(async (m) => {
              const resolveSingle = async (urlStr: string) => {
                if (urlStr && urlStr.includes('#blob-')) {
                  const blobId = urlStr.split('#')[1];
                  const blob = await loadFromDB('media_blobs', blobId);
                  if (blob) {
                    return URL.createObjectURL(blob as Blob) + '#' + blobId;
                  }
                }
                return urlStr;
              };
              
              const newModel = { ...m };
              if (newModel.url) newModel.url = await resolveSingle(newModel.url);
              if (newModel.mtlUrl) newModel.mtlUrl = await resolveSingle(newModel.mtlUrl);
              
              if (newModel.textures) {
                const resolvedTextures: Record<string, string> = {};
                for (const [key, val] of Object.entries(newModel.textures)) {
                  resolvedTextures[key] = await resolveSingle(val as string);
                }
                newModel.textures = resolvedTextures;
              }
              
              return newModel;
            }));
          };

          if (parsed.showcaseModels) {
            parsed.showcaseModels = await resolveBlobs(parsed.showcaseModels);
          }
          
          if (!parsed.heroVideo) {
            parsed.heroVideo = INITIAL_CONFIG.heroVideo;
          }
          
          setConfig({ 
            ...INITIAL_CONFIG, 
            ...parsed, 
            showcaseStats: { ...INITIAL_CONFIG.showcaseStats, ...parsed.showcaseStats } 
          } as SiteConfig);
        }
        
        if (savedProjects) {
          const projectsList = savedProjects as Project[];
          // Also resolve blobs for projects if they use the same pattern
          const { loadFromDB } = await import('./lib/storage');
          const resolvedProjects = await Promise.all(projectsList.map(async (p) => {
            if (p.mediaUrl && p.mediaUrl.includes('#blob-')) {
              const blobId = p.mediaUrl.split('#')[1];
              const blob = await loadFromDB('media_blobs', blobId);
              if (blob) {
                return { ...p, mediaUrl: URL.createObjectURL(blob as Blob) + '#' + blobId };
              }
            }
            return p;
          }));
          let finalProjects = resolvedProjects;
          // If the DB only has the old single default project, replace it with the new setup
          if (finalProjects.length === 1 && finalProjects[0].id === 'v1' && finalProjects[0].title === '星际轨道站') {
            finalProjects = INITIAL_PROJECTS;
          }
          setProjects(finalProjects);
        }
      } catch (e) {
        console.error("IDB Load Error:", e);
      } finally {
        setIsInitialLoad(false);
      }
    }
    loadData();
  }, []);

  // Save to IDB
  useEffect(() => {
    if (!isInitialLoad) {
      saveToDB('config', 'main', config);
    }
  }, [config, isInitialLoad]);

  useEffect(() => {
    if (!isInitialLoad) {
      saveToDB('projects', 'list', projects);
    }
  }, [projects, isInitialLoad]);

  return (
    <AppContext.Provider value={{ lang, setLang, config, setConfig, projects, setProjects, isPaused, setIsPaused, isInitialLoad }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
