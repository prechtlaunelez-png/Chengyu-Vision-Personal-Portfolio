import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDirectUrl(url: string): string {
  if (!url) return url;
  
  // Google Drive
  if (url.includes('drive.google.com') || url.includes('google.com/file/d/')) {
    const match = url.match(/\/d\/(.+?)(?:\/|$|\?)/) || url.match(/id=(.+?)(?:&|$)/);
    if (match && match[1]) {
      // Direct direct download link
      // Note: Google Drive shows a "too large to scan" page for files >100MB 
      // which breaks direct embedding in <video> tags.
      return `https://drive.google.com/uc?id=${match[1]}&export=download`;
    }
  }

  // Dropbox
  if (url.includes('dropbox.com')) {
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
  }

  return url;
}

export function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  if (url.includes('drive.google.com') || url.includes('google.com/file/d/')) {
    const match = url.match(/\/d\/(.+?)(?:\/|$|\?)/) || url.match(/id=(.+?)(?:&|$)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  
  return null;
}
