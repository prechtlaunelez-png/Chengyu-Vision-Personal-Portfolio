export const NAV_LINKS = [
  { name: "首页", nameEn: "Home", href: "#hero" },
  { name: "作品", nameEn: "Works", href: "#portfolio" },
  { name: "3D展示", nameEn: "3D View", href: "#showcase" },
  { name: "关于", nameEn: "About", href: "#about" },
  { name: "联系", nameEn: "Contact", href: "#contact" },
];

export const SKILLS = [
  { name: "Unreal Engine 5", icon: "Zap" },
  { name: "3D MAX", icon: "Box" },
  { name: "Blender", icon: "Hexagon" },
  { name: "Cinema 4D", icon: "Sparkles" },
  { name: "Photoshop", icon: "Palette" },
  { name: "CAD", icon: "FileCode" },
  { name: "GIS", icon: "Globe" },
];

export const INITIAL_CONFIG = {
  author: "章程",
  authorEn: "Zhang Cheng",
  university: "兰州工业学院",
  universityEn: "Lanzhou Institute of Technology",
  major: "环境设计专业 23级",
  majorEn: "Environment Design, Class of 23",
  logo: "", // Default Empty
  profilePic: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1000",
  showcaseModel: "", // Empty by default
  showcaseModels: [],
  showcaseTitle: "敦煌文化展示",
  showcaseTitleEn: "Dunhuang Art Exhibit",
  showcaseDesc: "基于敦煌石窟飞天形象设计的实时三维资产，展现丝路文化之美。",
  showcaseDescEn: "Real-time 3D assets based on Dunhuang Apsaras, showcasing Silk Road art.",
  showcaseStats: {
    polygons: "145,200",
    platform: "UE5 / WebGL"
  },
  awards: ["数字媒体大赛 - 优秀传统文化奖"],
  awardsEn: ["Digital Media Competition - Cultural Heritage Award"],
  heroVideo: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-background-9045-large.mp4",
};

export const INITIAL_PROJECTS = [
  {
    id: "v1",
    title: "星际轨道站",
    titleEn: "Interstellar Orbit",
    category: "三维动画",
    categoryEn: "3D Animation",
    description: "利用UE5开发的实时渲染场景。",
    descriptionEn: "Real-time rendering scene developed with UE5.",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-background-9045-large.mp4",
    type: "video" as const,
    tags: ["UE5", "C4D"],
  },
  {
    id: "v2",
    title: "未来城邦",
    titleEn: "Future Metropolis",
    category: "概念设计",
    categoryEn: "Concept Design",
    description: "赛博朋克风格未来城市概念设计。",
    descriptionEn: "Cyberpunk style future city concept design.",
    mediaUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000",
    type: "image" as const,
    tags: ["Blender", "Photoshop"],
  },
  {
    id: "v3",
    title: "自然之居",
    titleEn: "Nature's Dwelling",
    category: "建筑可视化",
    categoryEn: "ArchViz",
    description: "融合自然环境的现代建筑室内外渲染。",
    descriptionEn: "Modern architecture rendering blending with natural environment.",
    mediaUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000",
    type: "image" as const,
    tags: ["3ds Max", "Corona", "V-Ray"],
  },
  {
    id: "v4",
    title: "虚拟地貌",
    titleEn: "Virtual Terrain",
    category: "环境设计",
    categoryEn: "Environment Design",
    description: "基于分形生成的外星地貌生态探索。",
    descriptionEn: "Fractal-based alien terrain ecology exploration.",
    mediaUrl: "https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=2000",
    type: "image" as const,
    tags: ["UE5", "World Creator", "Substance"],
  }
];

