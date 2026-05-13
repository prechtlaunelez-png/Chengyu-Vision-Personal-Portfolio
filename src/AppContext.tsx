import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { INITIAL_CONFIG, INITIAL_PROJECTS } from './constants';
import { Project, SiteConfig } from './types';
import { saveToDB, loadFromDB } from './lib/storage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { firebaseService } from './lib/firebaseService';
import { db } from './lib/firebase';
import { doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';

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
  user: User | null;
  isAdmin: boolean;
  suspendCloudUpdates: boolean;
  setSuspendCloudUpdates: (suspend: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ADMIN_EMAIL = 'prechtlaunelez@gmail.com';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [config, setConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suspendCloudUpdates, setSuspendCloudUpdates] = useState(false);
  const suspendRef = useRef(false);
  
  useEffect(() => {
    suspendRef.current = suspendCloudUpdates;
  }, [suspendCloudUpdates]);

  const [isPaused, setIsPaused] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Firebase Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'configs', 'main'));
        console.log("Firebase Connection: Success");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  // Initial Load & Firebase Listener
  useEffect(() => {
    let unsubscribeProjects: (() => void) | null = null;
    let isRehydrated = false;

    async function loadData() {
      try {
        // 1. First, rehydrate from local IDB to avoid empty state flash and data loss
        const [savedConfig, savedProjects] = await Promise.all([
          loadFromDB('config', 'main'),
          loadFromDB('projects', 'list')
        ]);

        if (savedConfig) {
          setConfig(prev => ({ ...prev, ...(savedConfig as SiteConfig) }));
        }
        
        const localProjects = savedProjects ? (savedProjects as Project[]) : INITIAL_PROJECTS;
        const { loadFromDB: loadMedia } = await import('./lib/storage');
        const rehydrated = await Promise.all(localProjects.map(async (p) => {
          if (p.mediaUrl && p.mediaUrl.includes('#blob-')) {
            const blobId = p.mediaUrl.split('#')[1];
            const blob = await loadMedia('media_blobs', blobId);
            if (blob) {
              return { ...p, mediaUrl: URL.createObjectURL(blob as Blob) + '#' + blobId };
            }
          }
          return p;
        }));
        setProjects(rehydrated);
        isRehydrated = true;

        // 2. Now load cloud config
        const cloudConfig = await firebaseService.getConfig();
        if (cloudConfig) {
           // Merge cloud config if it exists
           setConfig(prev => ({ ...prev, ...cloudConfig }));
        }

        // 3. Set up live projects listener from Firestore
        let firstSnapshotReceived = false;
        unsubscribeProjects = firebaseService.subscribeProjects(async (cloudProjects) => {
          // If we are currently editing in the AdminPanel, don't overwrite local state with cloud data
          if (suspendRef.current) return;

          if (cloudProjects.length > 0) {
            const { loadFromDB: loadMedia } = await import('./lib/storage');
            
            // Resolve Cloud URLs/Metadata
            const resolvedCloud = await Promise.all(cloudProjects.map(async (p) => {
              if (p.mediaUrl && (p.mediaUrl.includes('#blob-') || p.mediaUrl.startsWith('local-sync-ref:'))) {
                const parts = p.mediaUrl.split('#');
                const blobId = parts[parts.length - 1];
                if (blobId) {
                  const blob = await loadMedia('media_blobs', blobId);
                  if (blob) return { ...p, mediaUrl: URL.createObjectURL(blob as Blob) + '#' + blobId };
                  const cloudAsset = await firebaseService.getAsset(blobId);
                  if (cloudAsset) return { ...p, mediaUrl: cloudAsset + '#' + blobId };
                }
              }
              return p;
            }));

            // SMART MERGE: If we have local projects that aren't synced yet, we keep them!
            setProjects(currentLocal => {
              // If it's the first sync, we might want to keep local-only projects
              const cloudIds = new Set(resolvedCloud.map(p => p.id));
              const localOnly = currentLocal.filter(p => !cloudIds.has(p.id));
              
              // If we are the admin, we likely want to keep our local unsynced additions
              if (localOnly.length > 0) {
                console.log(`Maintaining ${localOnly.length} local-only projects during cloud sync.`);
                return [...resolvedCloud, ...localOnly].sort((a, b) => (a.order || 0) - (b.order || 0));
              }
              return resolvedCloud;
            });
          }

          if (!firstSnapshotReceived) {
            firstSnapshotReceived = true;
            setIsInitialLoad(false);
          }
        });

      } catch (e) {
        console.error("Data Load Error:", e);
        setIsInitialLoad(false);
      }
    }
    loadData();

    return () => {
      if (unsubscribeProjects) unsubscribeProjects();
    };
  }, []);

  // Save to IDB (Local only)
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
    <AppContext.Provider value={{ 
      lang, setLang, config, setConfig, projects, setProjects, isPaused, setIsPaused, isInitialLoad, user, isAdmin,
      suspendCloudUpdates, setSuspendCloudUpdates
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
