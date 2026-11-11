/**
 * 城市AI农场 - 多租户SaaS数据层
 * 支持：超级管理员 + 多农场 + 农场管理员授权
 */

// ============================================================
// 1. 超级管理员（只有你知道账号密码）
// ============================================================
const SUPER_ADMINS = [
  {
    id: 'super001',
    username: 'superadmin',
    password: 'admin123',   // 首次登录后可在管理端修改
    nickname: '超级管理员',
    avatar: '👑',
    createdAt: '2026-01-01'
  }
];

// ============================================================
// 2. 农场列表
// ============================================================
const FARMS = [
  {
    farmId: 'farm_demo',
    name: '阳光开心农场',
    address: '北京市朝阳区来广营乡',
    description: '亲子采摘、科普教育、农事体验',
    cover: 'https://picsum.photos/seed/farm_cover/800/400',
    status: 'active',       // active=运营中, suspended=暂停
    adminIds: [],           // 该农场的管理员ID列表（从FARM_ADMINS关联）
    createdAt: '2026-09-01',
    plan: 'premium'         // 订阅套餐：basic / premium / enterprise
  }
];

// ============================================================
// 3. 农场管理员（由超级管理员在系统中创建并授权）
// ============================================================
const FARM_ADMINS = [
  // 示例：阳光开心农场的管理员
  {
    id: 'fa001',
    username: 'farm_demo_admin',
    password: 'demo123',
    farmId: 'farm_demo',
    nickname: '开心农场·张站长',
    avatar: '👨‍🌾',
    role: 'admin',          // admin=全权限, editor=编辑, viewer=只读
    status: 'active',
    createdAt: '2026-09-01',
    lastLogin: null
  }
];

// ============================================================
// 4. 通用工具函数
// ============================================================
function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function getFarmById(farmId) {
  return FARMS.find(f => f.farmId === farmId) || null;
}

function getAdminByUsername(username) {
  return [...SUPER_ADMINS, ...FARM_ADMINS].find(a => a.username === username) || null;
}

function getAdminsByFarm(farmId) {
  return FARM_ADMINS.filter(a => a.farmId === farmId);
}

function filterByFarm(arr, farmId) {
  if (!Array.isArray(arr)) return [];
  // 如果是超级管理员查看，返回所有（farmId为'__all__'）
  if (farmId === '__all__') return arr;
  return arr.filter(item => item.farmId === farmId);
}

// ============================================================
// 5. 演示农场数据（farmId: farm_demo）
// ============================================================

// --- 地块数据 ---
// 地图可视化字段（mapX/mapY/mapW/mapH 为百分比坐标，mapColor 为背景色）
const MOCK_PLOTS = [
  {
    id: 'p1', farmId: 'farm_demo', plotNo: 'A-01', area: 20, unit: '平米', price: 599,
    status: 'my',
    crop: '小番茄', cropIcon: '🍅',
    plantDate: '2026-09-01', harvestDate: '2026-11-15',
    location: '农场东区·阳光带',
    mapX: 6, mapY: 8, mapW: 30, mapH: 38, mapColor: '#fef08a',
    photos: [
      { id: 'ph1', url: 'https://picsum.photos/seed/tomato1/400/400', date: '2026-10-01', desc: '定植完成' },
      { id: 'ph2', url: 'https://picsum.photos/seed/tomato2/400/400', date: '2026-10-15', desc: '开始开花' },
      { id: 'ph3', url: 'https://picsum.photos/seed/tomato3/400/400', date: '2026-11-01', desc: '挂果期' }
    ],
    aiResult: {
      health: '良好', healthScore: 85,
      disease: '未发现病虫害',
      advice: ['建议增加磷钾肥施用', '近期天气晴好，可适当增加浇水频率', '预计11月20日前后可首次采摘'],
      maturity: 65
    },
    diary: [
      { id: 'd1', date: '2026-09-01', content: '今天带着天天和朵朵一起认养了这块小番茄地，孩子们特别兴奋！', aiGenerated: false },
      { id: 'd2', date: '2026-10-15', content: '番茄开花了，白白的小花藏在叶子中间，仔细找才能发现。', aiGenerated: false }
    ]
  },
  {
    id: 'p2', farmId: 'farm_demo', plotNo: 'A-02', area: 15, unit: '平米', price: 459,
    status: 'available',
    crop: '草莓', cropIcon: '🍓',
    plantDate: '2026-10-01', harvestDate: '2026-12-20',
    location: '农场东区·阳光带',
    mapX: 38, mapY: 8, mapW: 28, mapH: 38, mapColor: '#fda4af',
    photos: [
      { id: 'ph4', url: 'https://picsum.photos/seed/strawberry1/400/400', date: '2026-10-01', desc: '苗期' },
      { id: 'ph5', url: 'https://picsum.photos/seed/strawberry2/400/400', date: '2026-11-01', desc: '现蕾期' }
    ],
    aiResult: null, diary: []
  },
  {
    id: 'p3', farmId: 'farm_demo', plotNo: 'B-01', area: 30, unit: '平米', price: 899,
    status: 'available',
    crop: '黄瓜', cropIcon: '🥒',
    plantDate: null, harvestDate: null,
    location: '农场中区·水肥带',
    mapX: 6, mapY: 52, mapW: 35, mapH: 40, mapColor: '#bbf7d0',
    photos: [], aiResult: null, diary: []
  },
  {
    id: 'p4', farmId: 'farm_demo', plotNo: 'B-02', area: 10, unit: '平米', price: 329,
    status: 'available',
    crop: '生菜', cropIcon: '🥬',
    plantDate: '2026-10-15', harvestDate: '2026-11-30',
    location: '农场中区·水肥带',
    mapX: 43, mapY: 52, mapW: 28, mapH: 40, mapColor: '#86efac',
    photos: [
      { id: 'ph6', url: 'https://picsum.photos/seed/lettuce1/400/400', date: '2026-10-20', desc: '幼苗期' }
    ],
    aiResult: {
      health: '良好', healthScore: 90,
      disease: '未发现病虫害',
      advice: ['长势喜人，继续保持', '注意控水，避免徒长'],
      maturity: 40
    },
    diary: []
  },
  {
    id: 'p5', farmId: 'farm_demo', plotNo: 'C-01', area: 50, unit: '平米', price: 1499,
    status: 'reserved',
    crop: '西瓜', cropIcon: '🍉',
    plantDate: '2026-08-01', harvestDate: '2026-10-01',
    location: '农场西区·大田带',
    mapX: 72, mapY: 8, mapW: 24, mapH: 38, mapColor: '#f0abfc',
    photos: [], aiResult: null, diary: []
  },
  {
    id: 'p6', farmId: 'farm_demo', plotNo: 'C-02', area: 25, unit: '平米', price: 749,
    status: 'available',
    crop: '向日葵', cropIcon: '🌻',
    plantDate: '2026-09-15', harvestDate: '2026-12-01',
    location: '农场西区·大田带',
    mapX: 72, mapY: 52, mapW: 24, mapH: 40, mapColor: '#fde047',
    photos: [], aiResult: null, diary: []
  }
];

// --- 用户数据 ---
const MOCK_USER = {
  id: 'u001', farmId: 'farm_demo',
  nickname: '农场小达人', avatar: '🌾',
  phone: '138****8888',
  children: [
    { id: 'c1', name: '天天', age: 8, avatar: '👦' },
    { id: 'c2', name: '朵朵', age: 5, avatar: '👧' }
  ],
  myPlots: ['p1'],
  messageSettings: { system: true, activity: true, harvest: true, weather: false }
};

// --- 预约数据 ---
const MOCK_BOOKINGS = [
  {
    id: 'b1', farmId: 'farm_demo', plotId: 'p1', userId: 'u001',
    date: '2026-11-15', timeSlot: '09:00-11:00',
    people: 3, note: '带两个孩子体验采摘',
    status: 'approved',
    createTime: '2026-11-05'
  }
];

// --- 活动数据 ---
const MOCK_ACTIVITIES = [
  {
    id: 'a1', farmId: 'farm_demo',
    title: '🍓 初冬草莓采摘节', date: '2026-12-06',
    location: '农场东区', quota: 30, enrolled: 18,
    desc: '带上家人一起来摘草莓吧！现场还有草莓酱DIY活动。',
    tags: ['采摘', '亲子', 'DIY'],
    cover: 'https://picsum.photos/seed/activity1/800/400'
  },
  {
    id: 'a2', farmId: 'farm_demo',
    title: '🏕️ 星空露营夜', date: '2026-12-13',
    location: '农场西区草坪', quota: 20, enrolled: 12,
    desc: '在农场过夜，看星星、篝火晚会、露天电影。',
    tags: ['露营', '篝火', '亲子'],
    cover: 'https://picsum.photos/seed/activity2/800/400'
  },
  {
    id: 'a3', farmId: 'farm_demo',
    title: '🌽 农作物知识大挑战', date: '2026-12-20',
    location: '农场知识堂', quota: 40, enrolled: 35,
    desc: '答题赢种子礼包，适合全家参与。',
    tags: ['科普', '比赛', '赢奖品'],
    cover: 'https://picsum.photos/seed/activity3/800/400'
  }
];

// --- 知识课堂数据 ---
const MOCK_LESSONS = [
  {
    id: 'l1', farmId: 'farm_demo', crop: '小番茄',
    title: '番茄为什么是蔬菜不是水果？',
    type: 'article', readTime: '3分钟',
    cover: '', content: '从植物学角度来讲，番茄是水果；但从烹饪和法律角度，它被归类为蔬菜...'
  },
  {
    id: 'l2', farmId: 'farm_demo', crop: '小番茄',
    title: '番茄的12个营养真相',
    type: 'video', readTime: '5分钟',
    cover: '', content: '番茄富含番茄红素、维生素C和钾元素...'
  },
  {
    id: 'l3', farmId: 'farm_demo', crop: '草莓',
    title: '草莓表面的"小籽"是什么？',
    type: 'article', readTime: '2分钟',
    cover: '', content: '草莓表面的小颗粒叫"瘦果"，是草莓真正的果实...'
  },
  {
    id: 'l4', farmId: 'farm_demo', crop: '向日葵',
    title: '向日葵为什么总朝太阳转？',
    type: 'video', readTime: '4分钟',
    cover: '', content: '向日葵茎部含有生长素，受光照影响分布不均...'
  }
];

// --- 社区动态数据 ---
const MOCK_COMMUNITY = [
  {
    id: 'post1', farmId: 'farm_demo', userId: 'u002', nickname: '果果妈妈', avatar: '👩',
    plotId: 'p2', plotName: 'A-02 草莓地',
    content: '今天带果果去看草莓，已经开小白花了！🌸',
    images: [], likes: 12, comments: 3,
    time: '2026-11-07 14:30'
  },
  {
    id: 'post2', farmId: 'farm_demo', userId: 'u003', nickname: '种菜小白', avatar: '👨‍🌾',
    plotId: 'p4', plotName: 'B-02 生菜地',
    content: '第一次种生菜，长得还不错吧？求指导！',
    images: [], likes: 8, comments: 5,
    time: '2026-11-06 10:15'
  },
  {
    id: 'post3', farmId: 'farm_demo', userId: 'u004', nickname: '田园梦想家', avatar: '👩‍🎓',
    plotId: 'p6', plotName: 'C-02 向日葵',
    content: '向日葵长到半人高了，期待开花那天！🌻',
    images: [], likes: 24, comments: 7,
    time: '2026-11-05 16:45'
  }
];

// --- 代种养人数据 ---
const MOCK_MANAGERS = [
  { id: 'm1', farmId: 'farm_demo', name: '李大叔', avatar: '👨‍🌾', exp: '20年种植经验', rating: 4.9, plots: 12 },
  { id: 'm2', farmId: 'farm_demo', name: '王阿姨', avatar: '👩‍🌾', exp: '15年种植经验', rating: 4.8, plots: 8 }
];

// --- 证书模板 ---
const CERT_TITLES = [
  '小小拖拉机手', '采摘小能手', '种植小专家', '农场小管家',
  '植物小医生', '丰收小达人', '土壤小侦探', '种子守护者'
];

// ============================================================
// 6. 全局数据对象（兼容原有FARM_DATA）
// ============================================================
const FARM_DATA = {
  // 系统级
  SUPER_ADMINS, FARMS, FARM_ADMINS,
  // 业务数据（默认farm_demo）
  user: MOCK_USER,
  plots: MOCK_PLOTS,
  bookings: MOCK_BOOKINGS,
  activities: MOCK_ACTIVITIES,
  lessons: MOCK_LESSONS,
  community: MOCK_COMMUNITY,
  managers: MOCK_MANAGERS,
  certTitles: CERT_TITLES
};
window.FARM_DATA = FARM_DATA;
