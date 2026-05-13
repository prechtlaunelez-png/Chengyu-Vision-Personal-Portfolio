
export interface Project {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  categoryEn: string;
  description: string;
  descriptionEn: string;
  mediaUrl: string;
  coverUrl?: string;
  type: 'image' | 'video';
  tags: string[];
  order?: number;
}

export interface SiteConfig {
  author: string;
  authorEn: string;
  university: string;
  universityEn: string;
  major: string;
  majorEn: string;
  logo: string;
  profilePic: string;
  showcaseModel: string;
  showcaseModels: { id: string; name: string; url: string; mtlUrl?: string; textures?: Record<string, string>; description?: string }[];
  showcaseTitle: string;
  showcaseTitleEn: string;
  showcaseDesc: string;
  showcaseDescEn: string;
  showcaseStats: {
    polygons: string;
    platform: string;
  };
  heroVideo: string;
  awards: string[];
  awardsEn: string[];
}

export interface Message {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  wechat?: string;
  message: string;
  createdAt: any;
  status: 'unread' | 'read' | 'archived';
}
