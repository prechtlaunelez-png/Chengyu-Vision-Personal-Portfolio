import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp,
  Timestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Project, SiteConfig, Message } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  // Config
  async getConfig(): Promise<SiteConfig | null> {
    const path = 'configs/main';
    try {
      const docSnap = await getDoc(doc(db, path));
      return docSnap.exists() ? (docSnap.data() as SiteConfig) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveConfig(config: SiteConfig) {
    const path = 'configs/main';
    try {
      await setDoc(doc(db, path), {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Projects
  subscribeProjects(callback: (projects: Project[]) => void) {
    const path = 'projects';
    // Remove server-side orderBy to avoid filtering out docs without the 'order' field
    const q = query(collection(db, path)); 
    
    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => doc.data() as Project);
      // Sort on client side to ensure all items (even those without 'order') are shown
      const sorted = [...projects].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      callback(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async saveProject(project: Project) {
    const path = `projects/${project.id}`;
    try {
      await setDoc(doc(db, 'projects', project.id), {
        ...project,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveProjectsBatch(projects: Project[], config: SiteConfig) {
    const batch = writeBatch(db);
    
    // Save Config
    const configRef = doc(db, 'configs', 'main');
    batch.set(configRef, {
      ...config,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.uid
    });
    
    // Deletion: Identify projects to delete from cloud (those in cloud but not in current local state)
    try {
      const currentCloudProjects = await getDocs(collection(db, 'projects'));
      const localIds = new Set(projects.map(p => p.id));
      currentCloudProjects.docs.forEach(docSnap => {
        if (!localIds.has(docSnap.id)) {
           batch.delete(docSnap.ref);
        }
      });
    } catch (e) {
      console.warn("Could not fetch documents for deletion cleanup. Proceeding with update only.", e);
    }

    // Save Projects
    projects.forEach(project => {
      const pRef = doc(db, 'projects', project.id);
      batch.set(pRef, {
        ...project,
        updatedAt: serverTimestamp()
      });
    });
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch_sync');
      throw error;
    }
  },

  async deleteProject(projectId: string) {
    const path = `projects/${projectId}`;
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Assets (Base64 small files)
  async saveAsset(id: string, data: string, mimeType: string) {
    const path = `assets/${id}`;
    try {
      await setDoc(doc(db, 'assets', id), {
        id,
        data,
        mimeType,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAsset(id: string): Promise<string | null> {
    const path = `assets/${id}`;
    try {
      const docSnap = await getDoc(doc(db, path));
      return docSnap.exists() ? docSnap.data().data : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  // Messages
  async sendMessage(msg: Omit<Message, 'id' | 'createdAt' | 'status'>) {
    const path = 'messages';
    try {
      await addDoc(collection(db, path), {
        ...msg,
        status: 'unread',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeMessages(callback: (messages: Message[]) => void) {
    const path = 'messages';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      callback(messages);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async updateMessageStatus(id: string, status: Message['status']) {
    const path = `messages/${id}`;
    try {
      await updateDoc(doc(db, 'messages', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteMessage(id: string) {
    const path = `messages/${id}`;
    try {
      await deleteDoc(doc(db, 'messages', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
