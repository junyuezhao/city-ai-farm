/**
 * 城市AI农场 - 主应用逻辑
 */

/* =========================================================
   全局状态
   ========================================================= */
let currentPage   = 'home';
let selectedPlot  = null;
let selectedDate  = null;
let aiScanning    = false;

// ========== 多租户状态 ==========
let currentRole   = null;  // 'super_admin' | 'farm_admin' | 'user'
let currentAdmin  = null;  // 当前登录的管理员对象
let currentFarmId = 'farm_demo'; // 当前操作的农场ID

/* =========================================================
   初始化
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  // ========== 多租户：检查登录态 ==========
  checkLoginState();

  // ========== 用户端：检查登录态 ==========
  checkUserLoginState();

  // 绑定底部 Tab 栏事件（替代内联 onclick，更可靠）
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const page = tab.dataset.page;
      if (page) navigateTo(page);
    });
  });

  // 绑定"我的"页面版本号点击事件（管理端入口）
  const versionEl = document.getElementById('version-trigger');
  if (versionEl) {
    let clickCount = 0;
    let clickTimer = null;
    versionEl.addEventListener('click', () => {
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 600);
      if (clickCount >= 5) {
        clickCount = 0;
        showAdminLogin();
      }
    });
  }

  // 绑定AI识别地块选择事件
  const aiPlotSelect = document.getElementById('ai-plot-select');
  if (aiPlotSelect) {
    aiPlotSelect.addEventListener('change', onAIPlotChange);
  }

  // 绑定AI扫描区域点击事件（直接点作物图片）
  const cropWrap = document.getElementById('crop-image-wrap');
  if (cropWrap) {
    cropWrap.addEventListener('click', simulateScan);
  }

  initFilters();
  renderHome();
  renderPlotList();
  renderMap();
  renderBookings();
  renderAI();
  renderDiary();
  renderLessons();
  renderCommunity();
  renderActivities();
  renderProfile();
  initCalendar();
  populateSelects();
});

/* =========================================================
   路由 / 页面切换
   ========================================================= */
function navigateTo(page) {
  try {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    // 显示目标页
    const target = document.getElementById('page-' + page);
    if (!target) {
      console.warn('页面不存在:', page);
      return;
    }
    target.classList.add('active');
    // 更新Tab高亮
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.tab-item[data-page="${page}"]`);
    if (tab) tab.classList.add('active');
    // 显示/隐藏底部Tab（子页面隐藏）
    const tabbar = document.getElementById('tabbar');
    const hideTabPages = ['activities'];
    if (hideTabPages.includes(page)) {
      tabbar.style.display = 'none';
    } else {
      tabbar.style.display = 'flex';
    }
    currentPage = page;
    // 回顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error('页面切换失败:', e);
    showToast('页面加载出错，请刷新重试');
  }
}

/* =========================================================
   首页渲染
   ========================================================= */
function renderHome() {
  const myPlots = FARM_DATA.plots.filter(p => p.status === 'my');
  const container = document.getElementById('home-my-plots');

  if (myPlots.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌱</div>
        <p>还没有认养地块哦，去认养大厅看看吧！</p>
        <button class="btn btn-primary btn-sm mt-12" data-goto="plots">去认养 →</button>
      </div>`;
    // 绑定"去认养"按钮
    container.querySelector('[data-goto="plots"]')?.addEventListener('click', () => navigateTo('plots'));
    renderHomeActivities();
    return;
  }

  container.innerHTML = myPlots.map(plot => {
    const daysLeft = Math.max(0, Math.ceil((new Date(plot.harvestDate) - new Date()) / 86400000));
    const progress = Math.min(100, Math.max(0, 100 - daysLeft * 2));
    return `
    <div class="my-plot-card" data-plot-id="${plot.id}">
      <div class="my-plot-header">
        <div>
          <div class="plot-id">${plot.plotNo} · ${plot.location}</div>
          <div style="font-size:20px;font-weight:800;margin-top:2px;">${plot.cropIcon} ${plot.crop}</div>
        </div>
        <div class="plot-crop">${plot.cropIcon}</div>
      </div>
      <div class="my-plot-body">
        <div class="crop-name">${plot.crop} · ${plot.area}${plot.unit}</div>
        <div class="dates">🌱 ${plot.plantDate}  →  🌾 预计 ${plot.harvestDate} 收获</div>
        <div class="progress-bar">
          <div class="fill" style="width:${progress}%"></div>
        </div>
        <div style="font-size:11px;color:var(--gray-500);">距收获还有 ${daysLeft} 天 · 完成度 ${progress}%</div>
      </div>
      <div class="my-plot-footer">
        <button class="btn btn-secondary btn-sm" data-goto="ai">🔍 AI识别</button>
        <button class="btn btn-secondary btn-sm" data-goto="diary">📔 写日记</button>
        <button class="btn btn-secondary btn-sm" data-goto="bookings">📅 预约</button>
      </div>
    </div>`;
  }).join('');

  // 绑定地块卡片点击
  container.querySelectorAll('.my-plot-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不打开详情
      if (e.target.closest('button')) return;
      const plotId = card.dataset.plotId;
      if (plotId) openPlotDetail(plotId);
    });
  });
  // 绑定按钮导航
  container.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.goto));
  });

  renderHomeActivities();
}

function renderHomeActivities() {
  const acts = FARM_DATA.activities.slice(0, 2);
  const actsContainer = document.getElementById('home-activities');
  if (!actsContainer) return;
  actsContainer.innerHTML = acts.map(a => `
    <div class="card" style="margin:0 16px 10px;cursor:pointer;" data-act-id="${a.id}">
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="font-size:40px;width:50px;height:50px;background:var(--green-50);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;">${a.tags[0]}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">${a.title}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:3px;">📅 ${a.date} · 已报名 ${a.enrolled}/${a.quota}人</div>
        </div>
        <span style="color:var(--green-600);font-size:14px;">›</span>
      </div>
    </div>
  `).join('');
  // 绑定活动点击
  actsContainer.querySelectorAll('[data-act-id]').forEach(card => {
    card.addEventListener('click', () => openActivityDetail(card.dataset.actId));
  });
}

/* =========================================================
   认养大厅
   ========================================================= */
function renderPlotList(filter = 'all') {
  let plots = FARM_DATA.plots;
  if (filter === 'available') plots = plots.filter(p => p.status === 'available');
  else if (filter === 'tomato')  plots = plots.filter(p => p.crop.includes('番茄'));
  else if (filter === 'strawberry') plots = plots.filter(p => p.crop.includes('草莓'));
  else if (filter === 'vegetable')  plots = plots.filter(p => p.crop.includes('生菜') || p.crop.includes('黄瓜'));
  else if (filter === 'flower')     plots = plots.filter(p => p.crop.includes('向日葵') || p.crop.includes('花'));

  const container = document.getElementById('plot-list');
  if (plots.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>暂无符合条件的地块</p></div>`;
    return;
  }

  container.innerHTML = plots.map(plot => {
    const statusMap = {
      available: ['可认养', 'badge-available'],
      reserved:  ['已认养', 'badge-reserved'],
      my:        ['我的',   'badge-my']
    };
    const [statusText, statusClass] = statusMap[plot.status] || ['未知', ''];
    const btnHtml = plot.status === 'available'
      ? `<button class="btn btn-primary btn-sm" onclick="openAdoptModal('${plot.id}')">立即认养</button>`
      : plot.status === 'my'
        ? `<button class="btn btn-secondary btn-sm" onclick="navigateTo('diary')">管理</button>`
        : `<button class="btn btn-outline btn-sm" disabled>已认满</button>`;

    return `
    <div class="plot-card" onclick="openPlotDetail('${plot.id}')">
      <div class="plot-card-img">
        <span class="crop-emoji">${plot.cropIcon}</span>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="plot-card-body">
        <div class="plot-id">${plot.plotNo} · ${plot.location}</div>
        <div class="crop-name">${plot.crop}</div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">
          ${plot.plantDate ? `🌱 ${plot.plantDate} 种植` : '🌱 即将开始种植'}
          ${plot.harvestDate ? `  →  🌾 ${plot.harvestDate} 收获` : ''}
        </div>
      </div>
      <div class="plot-card-meta">
        <span class="area">${plot.area} ${plot.unit}</span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="price">¥${plot.price}<span>/${plot.unit === '平米' ? '平米' : '季'}</span></span>
          ${btnHtml}
        </div>
      </div>
    </div>`;
  }).join('');
}

function initFilters() {
  document.querySelectorAll('#plot-filters .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#plot-filters .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderPlotList(chip.dataset.filter);
    });
  });
}

/* =========================================================
   地块详情 & 认养弹窗
   ========================================================= */
function openPlotDetail(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  selectedPlot = plot;

  const isMy   = plot.status === 'my';
  const isAvail= plot.status === 'available';
  const aiHtml = plot.aiResult ? `
    <div style="margin-top:12px;padding:12px;background:var(--green-50);border-radius:var(--radius-sm);">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;">🤖 AI上次检测</div>
      <div style="font-size:13px;color:var(--gray-700);">
        健康度 <strong style="color:var(--green-600);">${plot.aiResult.health} (${plot.aiResult.healthScore}分)</strong><br>
        成熟度 <strong style="color:var(--green-600);">${plot.aiResult.maturity}%</strong><br>
        <span style="font-size:12px;color:var(--gray-500);">${plot.aiResult.advice[0]}</span>
      </div>
    </div>` : '';

  const btnHtml = isMy
    ? `<button class="btn btn-primary btn-full btn-lg mt-16" onclick="closeModal('modal-plot');navigateTo('diary')">📔 去写日记</button>`
    : isAvail
      ? `<button class="btn btn-primary btn-full btn-lg mt-16" onclick="closeModal('modal-plot');openAdoptModal('${plot.id}')">🌱 立即认养这块地</button>`
      : `<button class="btn btn-outline btn-full btn-lg mt-16" disabled>😔 这块地已被认养</button>`;

  document.getElementById('modal-plot-title').textContent = `${plot.plotNo} · ${plot.crop}`;
  document.getElementById('modal-plot-body').innerHTML = `
    <div style="text-align:center;font-size:80px;margin-bottom:12px;">${plot.cropIcon}</div>
    <div style="text-align:center;font-size:16px;font-weight:800;margin-bottom:4px;">${plot.crop}</div>
    <div style="text-align:center;font-size:13px;color:var(--gray-500);margin-bottom:16px;">${plot.location}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--green-50);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--green-600);">${plot.area}</div>
        <div style="font-size:12px;color:var(--gray-500);">面积(${plot.unit})</div>
      </div>
      <div style="background:var(--green-50);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:var(--green-600);">¥${plot.price}</div>
        <div style="font-size:12px;color:var(--gray-500);">认养价格</div>
      </div>
      <div style="background:var(--green-50);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:var(--green-600);">${plot.plantDate || '待定'}</div>
        <div style="font-size:12px;color:var(--gray-500);">种植日期</div>
      </div>
      <div style="background:var(--green-50);border-radius:var(--radius-sm);padding:12px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:var(--green-600);">${plot.harvestDate || '待定'}</div>
        <div style="font-size:12px;color:var(--gray-500);">预计收获</div>
      </div>
    </div>

    ${aiHtml}
    ${btnHtml}
  `;

  openModal('modal-plot');
}

function openAdoptModal(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  selectedPlot = plot;

  document.getElementById('modal-plot-title').textContent = `🌱 认养 ${plot.plotNo}`;
  document.getElementById('modal-plot-body').innerHTML = `
    <div style="text-align:center;font-size:64px;margin-bottom:8px;">${plot.cropIcon}</div>
    <div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:16px;">${plot.crop} · ${plot.area}${plot.unit}</div>

    <div style="background:var(--green-50);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--gray-500);">认养费（${plot.area}${plot.unit}）</span>
        <span style="font-size:15px;font-weight:700;">¥${plot.price}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:13px;color:var(--gray-500);">代种养服务费（可选）</span>
        <span style="font-size:13px;color:var(--gray-500);">¥${Math.round(plot.price * 0.2)}/月</span>
      </div>
      <div style="border-top:1px dashed var(--green-200);margin:8px 0;"></div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:14px;font-weight:700;">合计</span>
        <span style="font-size:20px;font-weight:800;color:var(--green-600);">¥${plot.price}</span>
      </div>
    </div>

    <div class="input-group">
      <label>选择证书名称（给孩子）</label>
      <select class="input-field" id="adopt-cert">
        ${FARM_DATA.certTitles.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>

    <div class="input-group">
      <label>绑定孩子账号（可选）</label>
      <select class="input-field">
        <option value="">不绑定</option>
        ${FARM_DATA.user.children.map(c => `<option value="${c.id}">${c.avatar} ${c.name} (${c.age}岁)</option>`).join('')}
      </select>
    </div>

    <button class="btn btn-primary btn-full btn-lg mt-12" onclick="confirmAdopt()">
      ✅ 确认认养 · ¥${plot.price}
    </button>
    <p style="font-size:11px;color:var(--gray-500);text-align:center;margin-top:8px;">
      认养即表示同意《地块认养协议》，收获农产品归认养人所有
    </p>
  `;

  openModal('modal-plot');
}

function confirmAdopt() {
  if (!selectedPlot) return;
  // 模拟认养成功
  const plot = FARM_DATA.plots.find(p => p.id === selectedPlot.id);
  if (plot) {
    plot.status = 'my';
    plot.plantDate = '2026-11-09';
    plot.harvestDate = '2027-02-01';
    plot.photos = [{ id: Date.now(), date: '2026-11-09', desc: '认养成功，等待种植' }];
  }
  closeModal('modal-plot');
  showToast('🎉 认养成功！欢迎加入城市AI农场！');
  renderHome();
  renderPlotList();
  renderMap();
  populateSelects();
}

/* =========================================================
   农场地图
   ========================================================= */
function renderMap() {
  const canvas = document.getElementById('farm-map');
  const zones = [
    { cls: 'zone-east',   label: '☀️ 东区\n阳光带', plots: ['p1','p2'] },
    { cls: 'zone-center', label: '💧 中区\n水肥带', plots: ['p3','p4'] },
    { cls: 'zone-west',   label: '🌾 西区\n大田带', plots: ['p5','p6'] }
  ];

  // 地块点位坐标（相对地图容器）
  const plotPositions = {
    p1: { top: '40px', left: '30px',  emoji: '🍅', status: 'my' },
    p2: { top: '110px', left: '80px',  emoji: '🍓', status: 'available' },
    p3: { top: '40px', left: '185px', emoji: '🥒', status: 'available' },
    p4: { top: '110px', left: '235px', emoji: '🥬', status: 'available' },
    p5: { top: '40px', left: '340px', emoji: '🍉', status: 'reserved' },
    p6: { top: '110px', left: '390px', emoji: '🌻', status: 'available' }
  };

  let html = zones.map(z => `
    <div class="map-zone ${z.cls}">${z.label.replace('\n','<br>')}</div>
  `).join('');

  FARM_DATA.plots.forEach(plot => {
    const pos = plotPositions[plot.id];
    if (!pos) return;
    const dotClass = pos.status === 'my' ? 'dot-my' : pos.status === 'available' ? 'dot-available' : 'dot-reserved';
    const title = plot.status === 'my' ? `${plot.crop}（我的）` : plot.status === 'available' ? `${plot.crop} 可认养` : `${plot.crop} 已认满`;
    html += `
      <div class="map-plot-dot ${dotClass}"
           style="top:${pos.top};left:${pos.left};"
           title="${title}"
           onclick="openPlotDetail('${plot.id}')">
        ${pos.emoji}
      </div>`;
  });

  canvas.innerHTML = html;
}

/* =========================================================
   预约种养
   ========================================================= */
function populateSelects() {
  const myPlots = FARM_DATA.plots.filter(p => p.status === 'my');
  const options = myPlots.map(p => `<option value="${p.id}">${p.plotNo} · ${p.crop}</option>`).join('');

  const bookingSelect = document.getElementById('booking-plot');
  const aiSelect       = document.getElementById('ai-plot-select');
  const diarySelect    = document.getElementById('diary-plot-select');

  if (bookingSelect) bookingSelect.innerHTML = `<option value="">-- 请选择 --</option>${options}`;
  if (aiSelect)       aiSelect.innerHTML = `<option value="">-- 选择要识别的地块 --</option>${myPlots.map(p => `<option value="${p.id}">${p.plotNo} · ${p.crop}</option>`).join('')}`;
  if (diarySelect)    diarySelect.innerHTML = `<option value="">-- 选择地块 --</option>${options}`;
}

function initCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  const today = new Date();
  const days = ['日','一','二','三','四','五','六'];
  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  // 本月1号
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const startPad = firstDay.getDay();
  const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startPad; i++) html += `<div></div>`;
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), d);
    const isToday = date.toDateString() === today.toDateString();
    const isPast  = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isTooFar= d > today.getDate() + 7;
    const disabled = isPast || isTooFar;
    const cls = [
      'cal-day',
      isToday ? 'today' : '',
      disabled ? 'disabled' : '',
      selectedDate === `${today.getMonth()+1}-${d}` ? 'selected' : ''
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" ${disabled ? '' : `onclick="selectDate('${today.getMonth()+1}-${d}')"`}>${d}</div>`;
  }
  grid.innerHTML = html;
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  initCalendar(); // 重绘高亮
}

function submitBooking() {
  const plotId = document.getElementById('booking-plot').value;
  const time   = document.getElementById('booking-time').value;
  const people = document.getElementById('booking-people').value;
  const note   = document.getElementById('booking-note').value;

  if (!plotId)   return showToast('请选择地块');
  if (!selectedDate) return showToast('请选择预约日期（需提前1-7天）');

  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  FARM_DATA.bookings.push({
    id: 'b' + Date.now(), plotId, userId: FARM_DATA.user.id,
    date: selectedDate, timeSlot: time,
    people: parseInt(people), note,
    status: 'pending', createTime: new Date().toISOString().slice(0, 10)
  });

  showToast('✅ 预约申请已提交，等待农场审核');
  document.getElementById('booking-plot').value = '';
  document.getElementById('booking-note').value = '';
  selectedDate = null;
  initCalendar();
  renderBookings();
}

function renderBookings() {
  const myBookings = FARM_DATA.bookings.filter(b => b.userId === FARM_DATA.user.id);
  const container = document.getElementById('my-bookings');
  const statusMap = { pending: ['⏳ 待审核', 'tag-sun'], approved: ['✅ 已通过', 'tag-green'], rejected: ['❌ 已拒绝', 'tag-brown'] };

  if (myBookings.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>暂无预约记录</p></div>`;
    return;
  }

  container.innerHTML = myBookings.map(b => {
    const plot = FARM_DATA.plots.find(p => p.id === b.plotId);
    const [statusText, statusTag] = statusMap[b.status] || ['未知', ''];
    return `
    <div class="card" style="margin:0 16px 10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:15px;font-weight:700;">${plot ? plot.cropIcon : ''} ${plot ? plot.crop : '未知地块'}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:3px;">📅 ${b.date} · ⏰ ${b.timeSlot} · 👥 ${b.people}人</div>
        </div>
        <span class="tag ${statusTag}">${statusText}</span>
      </div>
      ${b.note ? `<div style="font-size:12px;color:var(--gray-500);margin-top:8px;padding:8px;background:var(--gray-50);border-radius:var(--radius-sm);">📝 ${b.note}</div>` : ''}
    </div>`;
  }).join('');
}

/* =========================================================
   AI识别
   ========================================================= */

function onAIPlotChange() {
  const plotId = document.getElementById('ai-plot-select').value;
  const img = document.getElementById('crop-image-img');
  if (!img) return;

  if (plotId) {
    const plot = FARM_DATA.plots.find(p => p.id === plotId);
    if (plot && plot.photos.length > 0) {
      // 用该地块最新的照片
      img.src = plot.photos[plot.photos.length - 1].url;
      img.alt = plot.crop + ' 照片';
    } else {
      // 没有照片则用占位图
      img.src = `https://picsum.photos/seed/${plotId}/400/400`;
      img.alt = '暂无照片';
    }
  } else {
    img.src = 'https://picsum.photos/seed/farm/400/400';
    img.alt = '请先选择地块';
  }
  resetAIScanner();
}

function resetAIScanner() {
  const wrap = document.getElementById('crop-image-wrap');
  const panel = document.getElementById('ai-panel');
  const connector = document.getElementById('connector-layer');
  const path = document.getElementById('connector-path');
  const hint = document.getElementById('scan-hint');

  wrap?.classList.remove('scanning', 'scanned');
  panel?.classList.remove('visible');
  connector?.classList.remove('visible');
  if (path) path.setAttribute('d', '');
  if (hint) hint.textContent = '📷 点击作物图片开始AI识别';
}

function simulateScan() {
  const plotId = document.getElementById('ai-plot-select').value;
  if (!plotId) return showToast('请先选择地块');

  if (aiScanning) return;
  aiScanning = true;

  const wrap = document.getElementById('crop-image-wrap');
  const hint = document.getElementById('scan-hint');

  // 阶段1：旋转放大 + 扫描线
  wrap.classList.add('scanning');
  if (hint) hint.textContent = '🔍 AI正在分析作物健康状态...';

  // 阶段2：显示连接线和AI建议
  setTimeout(() => {
    wrap.classList.remove('scanning');
    wrap.classList.add('scanned');
    showAIResult(plotId);
    aiScanning = false;
  }, 1800);
}

function showAIResult(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot || !plot.aiResult) {
    showToast('该地块暂无AI数据');
    resetAIScanner();
    return;
  }

  const result = plot.aiResult;
  const wrap = document.getElementById('crop-image-wrap');
  const panel = document.getElementById('ai-panel');
  const connector = document.getElementById('connector-layer');
  const path = document.getElementById('connector-path');
  const panelBody = document.getElementById('ai-panel-body');
  const scanner = document.getElementById('crop-image-wrap').parentElement; // .ai-scanner

  // 构建AI面板内容
  panelBody.innerHTML = `
    <div class="ai-health-badge">${result.health} · ${result.healthScore}分</div>
    <div style="font-size:11px;color:var(--gray-500);margin-bottom:6px;">成熟度</div>
    <div class="ai-maturity-mini">
      <div class="ai-maturity-mini-fill" style="width:${result.maturity}%"></div>
    </div>
    <div style="font-size:11px;color:var(--green-600);font-weight:700;margin-top:4px;">${result.maturity}%</div>
    <div style="margin-top:10px;">
      ${result.advice.map(a => `
        <div class="ai-panel-advice">
          <span class="ai-panel-advice-icon">💡</span>
          <span>${a}</span>
        </div>
      `).join('')}
    </div>
  `;

  // 用百分比计算连接线起止点（相对于 ai-scanner 容器）
  // 起点：图片区域的右侧中部（作物位置）
  const startXPct = 72;  // 图片右侧 72% 处
  const startYPct = 50;  // 图片垂直居中
  // 终点：AI面板的左侧中部
  const endXPct   = 88;  // 面板左侧 88% 处
  const endYPct   = 50;  // 面板垂直居中

  // 贝塞尔曲线路径（百分比坐标，SVG viewBox="0 0 100 100"）
  const cp1x = startXPct + 8;
  const cp1y = startYPct - 10;
  const cp2x = endXPct - 8;
  const cp2y = endYPct + 10;
  const pathD = `M ${startXPct} ${startYPct} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endXPct} ${endYPct}`;
  path.setAttribute('d', pathD);

  // 同步更新下方的传统结果区域（兼容）
  document.getElementById('ai-score-num').textContent = result.healthScore;
  document.getElementById('ai-health-text').textContent = result.health;
  document.getElementById('ai-maturity-text').textContent = result.maturity + '%';
  document.getElementById('ai-maturity-bar').style.width = result.maturity + '%';
  document.getElementById('ai-advice-list').innerHTML = result.advice.map(a => `
    <div class="ai-advice-item">
      <span class="advice-icon">💡</span>
      <span>${a}</span>
    </div>
  `).join('');
  document.getElementById('ai-result').style.display = 'block';

  // 延迟一帧后显示连接线和面板（让CSS过渡生效）
  requestAnimationFrame(() => {
    connector.classList.add('visible');
    panel.classList.add('visible');
    scanner.classList.add('has-result');
  });

  showToast('✅ AI识别完成');
}

function renderAI() {
  const historyContainer = document.getElementById('ai-history');
  const history = [
    { date: '2026-11-01', plot: 'A-01 小番茄', score: 85, result: '良好' },
    { date: '2026-10-15', plot: 'A-01 小番茄', score: 72, result: '一般' }
  ];
  historyContainer.innerHTML = history.map(h => `
    <div class="card" style="margin:0 16px 10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:14px;font-weight:700;">${h.plot}</div>
          <div style="font-size:12px;color:var(--gray-500);">${h.date}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:800;color:var(--green-600);">${h.score}分</div>
          <div style="font-size:12px;color:var(--gray-500);">${h.result}</div>
        </div>
      </div>
    </div>
  `).join('');
}

/* =========================================================
   种植日记
   ========================================================= */
function onDiaryPlotChange() {
  const plotId = document.getElementById('diary-plot-select').value;
  document.getElementById('diary-write-area').style.display = plotId ? 'block' : 'none';
  renderDiaryList(plotId);
}

function renderDiary() {
  // 初始隐藏写日记区域
  document.getElementById('diary-write-area').style.display = 'none';
  renderDiaryList(null);
  renderCertificate();
}

function renderDiaryList(plotId) {
  const myPlots = FARM_DATA.plots.filter(p => p.status === 'my');
  const targetPlotId = plotId || (myPlots.length > 0 ? myPlots[0].id : null);
  if (!targetPlotId) return;

  const plot = FARM_DATA.plots.find(p => p.id === targetPlotId);
  const container = document.getElementById('diary-list');

  if (!plot || !plot.diary || plot.diary.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📔</div><p>还没有日记，写第一篇吧！</p></div>`;
    return;
  }

  container.innerHTML = plot.diary.map(d => `
    <div class="diary-card">
      <div class="diary-date">
        📅 ${d.date}
        ${d.aiGenerated ? '<span class="diary-badge">✨ AI生成</span>' : ''}
      </div>
      <div class="diary-content">${d.content}</div>
    </div>
  `).join('');
}

function generateAIDraft() {
  const plotId = document.getElementById('diary-plot-select').value;
  if (!plotId) return showToast('请先选择地块');
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;

  const drafts = [
    `今天去农场看${plot.crop}，长势特别好！叶子绿油油的，已经能看到小果子了。孩子们在田埂上跑来跑去，开心极了。期待收获的日子快点到来！🌱`,
    `${plot.crop}又长高了不少，农场李大叔帮忙修剪了侧枝。 learned today: 番茄需要搭架子，不然会倒伏。下次来要给它们绑上竹竿。`,
    `带着天天和朵朵来给${plot.crop}浇水。朵朵说"小番茄什么时候变红呀？"我告诉她还要等一个月呢。亲子时光，就是这么美好。❤️`
  ];
  const draft = drafts[Math.floor(Math.random() * drafts.length)];
  document.getElementById('diary-content').value = draft;
  showToast('✨ AI已帮你写好草稿，可编辑后发布');
}

function submitDiary() {
  const plotId  = document.getElementById('diary-plot-select').value;
  const content = document.getElementById('diary-content').value.trim();
  if (!plotId)   return showToast('请先选择地块');
  if (!content)  return showToast('请填写日记内容');

  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (plot) {
    plot.diary.unshift({
      id: 'd' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      content,
      aiGenerated: false
    });
  }

  document.getElementById('diary-content').value = '';
  renderDiaryList(plotId);
  renderCertificate();
  showToast('✅ 日记发布成功！');
}

function renderCertificate() {
  const myPlots = FARM_DATA.plots.filter(p => p.status === 'my');
  const container = document.getElementById('cert-preview');
  if (myPlots.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>认养地块后即可获得成长证书</p></div>`;
    return;
  }

  const plot = myPlots[0];
  const title = FARM_DATA.certTitles[0];
  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#fef9c3,#fde68a);border-radius:var(--radius-md);padding:20px;text-align:center;border:3px dashed var(--sun-500);margin-bottom:12px;">
      <div style="font-size:36px;margin-bottom:8px;">🏆</div>
      <div style="font-size:12px;color:#92400e;font-weight:600;letter-spacing:2px;">成长证书</div>
      <div style="font-size:22px;font-weight:900;color:#78350f;margin:8px 0;">${title}</div>
      <div style="font-size:13px;color:#92400e;">授予 <strong>${FARM_DATA.user.nickname}</strong></div>
      <div style="font-size:12px;color:#92400e;margin-top:4px;">认养 ${plot.plotNo} · ${plot.crop}</div>
      <div style="font-size:11px;color:#a16207;margin-top:12px;">城市AI农场 · ${new Date().getFullYear()}</div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="showToast('证书已保存到相册')">💾 保存证书</button>
      <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="showToast('分享链接已复制')">🔗 分享</button>
    </div>
  `;
}

/* =========================================================
   知识课堂
   ========================================================= */
function renderLessons(filter = 'all') {
  const lessons = filter === 'all' ? FARM_DATA.lessons : FARM_DATA.lessons.filter(l => l.crop === filter);
  const container = document.getElementById('lesson-list');

  container.innerHTML = lessons.map(l => `
    <div class="lesson-card" onclick="showToast('打开课程：${l.title}')">
      <div class="lesson-thumb ${l.type}">
        ${l.type === 'video' ? '▶️' : '📄'}
      </div>
      <div class="lesson-info">
        <div>
          <div class="lesson-crop">${l.crop}</div>
          <div class="lesson-title">${l.title}</div>
        </div>
        <div class="lesson-meta">
          <span>${l.type === 'video' ? '🎬 视频' : '📄 图文'}</span>
          <span>⏱ ${l.readTime}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// 课程分类Tab
document.addEventListener('click', e => {
  const tab = e.target.closest('.lesson-cat-tab');
  if (tab) {
    document.querySelectorAll('.lesson-cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLessons(tab.dataset.crop);
  }
});

/* =========================================================
   社区
   ========================================================= */
function renderCommunity() {
  const container = document.getElementById('community-posts');
  container.innerHTML = FARM_DATA.community.map(post => `
    <div class="post-card">
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div class="post-meta">
          <div class="post-nickname">${post.nickname}</div>
          <div class="post-time">${post.time}</div>
        </div>
        <span class="post-plot-tag">${post.plotName}</span>
      </div>
      <div class="post-content">${post.content}</div>
      <div class="post-actions">
        <div class="post-action" onclick="toggleLike(this)">
          <span class="action-icon">🤍</span>
          <span class="like-count">${post.likes}</span>
        </div>
        <div class="post-action" onclick="showToast('评论功能开发中')">
          <span class="action-icon">💬</span>
          <span>${post.comments}</span>
        </div>
        <div class="post-action" onclick="showToast('已访问TA的地块')">
          <span class="action-icon">🚜</span>
          <span>互访</span>
        </div>
        <div class="post-action" onclick="showToast('分享功能开发中')" style="margin-left:auto;">
          <span class="action-icon">↗️</span>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleLike(el) {
  el.classList.toggle('liked');
  const icon = el.querySelector('.action-icon');
  const count = el.querySelector('.like-count');
  if (el.classList.contains('liked')) {
    icon.textContent = '❤️';
    count.textContent = parseInt(count.textContent) + 1;
  } else {
    icon.textContent = '🤍';
    count.textContent = parseInt(count.textContent) - 1;
  }
}

/* =========================================================
   活动
   ========================================================= */
function renderActivities() {
  const container = document.getElementById('activity-list');
  container.innerHTML = FARM_DATA.activities.map(a => `
    <div class="card" style="margin:0 16px 12px;cursor:pointer;" onclick="openActivityDetail('${a.id}')">
      <div style="height:120px;background:linear-gradient(135deg,var(--green-100),var(--green-200));border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-size:56px;margin-bottom:12px;">
        ${a.tags[0]}
      </div>
      <div style="font-size:16px;font-weight:800;margin-bottom:6px;">${a.title}</div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:10px;line-height:1.6;">${a.desc}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
        ${a.tags.map(t => `<span class="tag tag-green">${t}</span>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--gray-500);">
        <span>📅 ${a.date} · 📍 ${a.location}</span>
        <span style="color:var(--green-600);font-weight:700;">${a.enrolled}/${a.quota}人已报名</span>
      </div>
      <div class="progress-bar" style="margin-top:8px;">
        <div class="fill" style="width:${(a.enrolled / a.quota * 100).toFixed(0)}%"></div>
      </div>
    </div>
  `).join('');
}

function openActivityDetail(actId) {
  const act = FARM_DATA.activities.find(a => a.id === actId);
  if (!act) return;

  document.getElementById('modal-activity-title').textContent = act.title;
  document.getElementById('modal-activity-body').innerHTML = `
    <div style="text-align:center;font-size:72px;margin-bottom:12px;">${act.tags[0]}</div>
    <div style="text-align:center;font-size:15px;font-weight:700;margin-bottom:12px;">${act.title}</div>
    <div style="font-size:13px;color:var(--gray-500);text-align:center;margin-bottom:16px;">
      📅 ${act.date} · 📍 ${act.location}
    </div>
    <div style="font-size:14px;line-height:1.7;margin-bottom:16px;">${act.desc}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;">
      ${act.tags.map(t => `<span class="tag tag-green">${t}</span>`).join('')}
    </div>
    <button class="btn btn-primary btn-full btn-lg" onclick="joinActivity('${act.id}')">
      🎉 立即报名（${act.enrolled}/${act.quota}）
    </button>
  `;
  openModal('modal-activity');
}

function joinActivity(actId) {
  const act = FARM_DATA.activities.find(a => a.id === actId);
  if (act && act.enrolled < act.quota) {
    act.enrolled++;
    closeModal('modal-activity');
    showToast(`🎉 报名成功！活动前会有短信提醒`);
    renderActivities();
    renderHome();
  } else {
    showToast('😔 活动名额已满');
  }
}

/* =========================================================
   个人中心
   ========================================================= */
function renderProfile() {
  updateProfileUI();
}

/* =========================================================
   弹窗控制
   ========================================================= */
function openModal(id) {
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  document.body.style.overflow = '';
}
// 点击遮罩关闭
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  });
});

/* =========================================================
   吐司提示
   ========================================================= */
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* =========================================================
   多租户 - 登录态管理
   ========================================================= */
function checkLoginState() {
  // 检查URL是否有farm参数
  const params = new URLSearchParams(window.location.search);
  const farmId = params.get('farm');
  if (farmId && getFarmById(farmId)) {
    currentFarmId = farmId;
  }

  // 检查sessionStorage中的登录态
  const savedRole = sessionStorage.getItem('admin_role');
  const savedAdmin = sessionStorage.getItem('admin_data');

  if (savedRole && savedAdmin) {
    currentRole = savedRole;
    currentAdmin = JSON.parse(savedAdmin);
    if (currentRole === 'super_admin') {
      showSuperAdminPanel();
    } else if (currentRole === 'farm_admin') {
      // 验证该管理员是否仍有效
      const admin = getAdminByUsername(currentAdmin.username);
      if (admin && admin.status === 'active') {
        currentFarmId = admin.farmId;
        showFarmAdminPanel();
      } else {
        clearAdminSession();
      }
    }
  }
}

function clearAdminSession() {
  currentRole = null;
  currentAdmin = null;
  sessionStorage.removeItem('admin_role');
  sessionStorage.removeItem('admin_data');
}

function showAdminLogin() {
  // 关闭用户端页面，显示登录界面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-admin-login').classList.add('active');
  document.getElementById('tabbar').style.display = 'none';
}

function hideAdminLogin() {
  document.getElementById('page-admin-login').classList.remove('active');
  document.getElementById('tabbar').style.display = 'flex';
  navigateTo('home');
}

// 超级管理员登录
function handleSuperAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('sa-username').value.trim();
  const password = document.getElementById('sa-password').value;

  const admin = SUPER_ADMINS.find(a => a.username === username && a.password === password);
  if (!admin) {
    showToast('❌ 账号或密码错误');
    return;
  }

  currentRole = 'super_admin';
  currentAdmin = { id: admin.id, username: admin.username, nickname: admin.nickname, avatar: admin.avatar };
  sessionStorage.setItem('admin_role', 'super_admin');
  sessionStorage.setItem('admin_data', JSON.stringify(currentAdmin));

  showToast('✅ 超级管理员登录成功');
  showSuperAdminPanel();
}

// 农场管理员登录
function handleFarmAdminLogin(e) {
  e.preventDefault();
  const farmId = document.getElementById('fa-farm-select').value;
  const username = document.getElementById('fa-username').value.trim();
  const password = document.getElementById('fa-password').value;

  if (!farmId) return showToast('请选择农场');
  if (!username || !password) return showToast('请填写账号和密码');

  const admin = FARM_ADMINS.find(a => a.farmId === farmId && a.username === username && a.password === password && a.status === 'active');
  if (!admin) {
    showToast('❌ 账号或密码错误，或该账号已禁用');
    return;
  }

  // 更新最后登录时间
  admin.lastLogin = new Date().toISOString().slice(0, 16).replace('T', ' ');

  currentRole = 'farm_admin';
  currentFarmId = admin.farmId;
  currentAdmin = { id: admin.id, username: admin.username, farmId: admin.farmId, nickname: admin.nickname, avatar: admin.avatar, role: admin.role };
  sessionStorage.setItem('admin_role', 'farm_admin');
  sessionStorage.setItem('admin_data', JSON.stringify(currentAdmin));

  showToast('✅ 登录成功');
  showFarmAdminPanel();
}

// 退出登录
function handleAdminLogout() {
  clearAdminSession();
  showToast('已退出登录');
  hideAdminLogin();
}

// 登录页Tab切换
function switchLoginTab(role) {
  const saForm = document.getElementById('form-super-admin');
  const faForm = document.getElementById('form-farm-admin');
  const saTab = document.getElementById('tab-sa');
  const faTab = document.getElementById('tab-fa');

  if (role === 'super_admin') {
    saForm.style.display = 'flex';
    faForm.style.display = 'none';
    saTab.style.background = 'var(--white)';
    saTab.style.color = 'var(--gray-900)';
    saTab.style.boxShadow = 'var(--shadow-sm)';
    faTab.style.background = 'transparent';
    faTab.style.color = 'var(--gray-500)';
    faTab.style.boxShadow = 'none';
  } else {
    saForm.style.display = 'none';
    faForm.style.display = 'flex';
    faTab.style.background = 'var(--white)';
    faTab.style.color = 'var(--gray-900)';
    faTab.style.boxShadow = 'var(--shadow-sm)';
    saTab.style.background = 'transparent';
    saTab.style.color = 'var(--gray-500)';
    saTab.style.boxShadow = 'none';
  }
}

/* =========================================================
   多租户 - 超级管理端
   ========================================================= */
function showSuperAdminPanel() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-super-admin').classList.add('active');
  document.getElementById('tabbar').style.display = 'none';
  renderSuperAdminDashboard();
}

function renderSuperAdminDashboard() {
  const totalFarms = FARMS.length;
  const activeFarms = FARMS.filter(f => f.status === 'active').length;
  const totalAdmins = FARM_ADMINS.length;
  const totalPlots = FARM_DATA.plots.length;

  const container = document.getElementById('sa-content');
  container.innerHTML = `
    <div class="admin-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:32px;">👑</div>
        <div>
          <div style="font-size:18px;font-weight:800;color:var(--gray-900);">超级管理后台</div>
          <div style="font-size:12px;color:var(--gray-500);">欢迎回来，${currentAdmin.nickname}</div>
        </div>
      </div>
      <button onclick="handleAdminLogout()" style="padding:8px 16px;border-radius:var(--radius-full);background:var(--gray-100);color:var(--gray-700);font-size:13px;font-weight:600;">退出</button>
    </div>

    <!-- 数据概览 -->
    <div style="padding:16px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px;">📊 全局概览</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:24px;font-weight:800;color:var(--green-700);">${totalFarms}</div>
          <div style="font-size:12px;color:var(--green-600);margin-top:2px;">入驻农场</div>
        </div>
        <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:24px;font-weight:800;color:#1d4ed8;">${totalAdmins}</div>
          <div style="font-size:12px;color:#3b82f6;margin-top:2px;">管理员</div>
        </div>
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:24px;font-weight:800;color:#b45309;">${totalPlots}</div>
          <div style="font-size:12px;color:#d97706;margin-top:2px;">总地块数</div>
        </div>
        <div style="background:linear-gradient(135deg,#f3e8ff,#e9d5ff);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:24px;font-weight:800;color:#7e22ce;">${activeFarms}</div>
          <div style="font-size:12px;color:#9333ea;margin-top:2px;">运营中</div>
        </div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div style="padding:0 16px 16px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px;">🛠️ 管理功能</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button onclick="renderSuperFarmList()" class="admin-menu-btn">
          <span class="admin-menu-icon">🏡</span>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:700;">农场管理</div>
            <div style="font-size:11px;color:var(--gray-500);">查看/创建/编辑农场</div>
          </div>
          <span style="margin-left:auto;color:var(--gray-400);">›</span>
        </button>
        <button onclick="renderSuperAdminList()" class="admin-menu-btn">
          <span class="admin-menu-icon">👥</span>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:700;">管理员授权</div>
            <div style="font-size:11px;color:var(--gray-500);">为农场创建/管理管理员账号</div>
          </div>
          <span style="margin-left:auto;color:var(--gray-400);">›</span>
        </button>
        <button onclick="renderSuperAllPlots()" class="admin-menu-btn">
          <span class="admin-menu-icon">🟩</span>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:700;">全场地块</div>
            <div style="font-size:11px;color:var(--gray-500);">查看所有农场的地块数据</div>
          </div>
          <span style="margin-left:auto;color:var(--gray-400);">›</span>
        </button>
        <button onclick="renderSuperAllOrders()" class="admin-menu-btn">
          <span class="admin-menu-icon">📋</span>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:700;">全部认养订单</div>
            <div style="font-size:11px;color:var(--gray-500);">跨农场查看所有认养记录</div>
          </div>
          <span style="margin-left:auto;color:var(--gray-400);">›</span>
        </button>
      </div>
    </div>

    <!-- 农场列表预览 -->
    <div style="padding:0 16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div style="font-size:15px;font-weight:700;">🏡 农场列表</div>
        <button onclick="showCreateFarmModal()" style="font-size:12px;color:var(--green-600);font-weight:600;">+ 新建农场</button>
      </div>
      ${FARMS.map(farm => `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;margin-bottom:8px;box-shadow:var(--shadow-card);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:48px;height:48px;border-radius:var(--radius-sm);overflow:hidden;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:24px;">🌾</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;">${farm.name}</div>
              <div style="font-size:11px;color:var(--gray-500);">${farm.address}</div>
            </div>
            <span class="tag ${farm.status === 'active' ? 'tag-green' : 'tag-gray'}">${farm.status === 'active' ? '运营中' : '暂停'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button onclick="editFarm('${farm.farmId}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑</button>
            <button onclick="toggleFarmStatus('${farm.farmId}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--gray-100);color:var(--gray-700);font-size:12px;font-weight:600;">
              ${farm.status === 'active' ? '暂停' : '启用'}
            </button>
            <button onclick="renderFarmAdminList('${farm.farmId}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--sky-50);color:var(--sky-600);font-size:12px;font-weight:600;">管理员</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 农场列表页（超级管理员）
function renderSuperFarmList() {
  const container = document.getElementById('sa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderSuperAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">农场管理</div>
      </div>
      ${FARMS.map(farm => `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:16px;margin-bottom:10px;box-shadow:var(--shadow-card);">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <div style="width:56px;height:56px;border-radius:var(--radius-md);overflow:hidden;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:32px;">🌾</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:700;">${farm.name}</div>
              <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">${farm.address}</div>
              <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">ID: ${farm.farmId}</div>
            </div>
            <span class="tag ${farm.status === 'active' ? 'tag-green' : 'tag-gray'}">${farm.status === 'active' ? '运营中' : '暂停'}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-500);margin-bottom:10px;">${farm.description || '暂无描述'}</div>
          <div style="display:flex;gap:8px;">
            <button onclick="showEditFarmModal('${farm.farmId}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑信息</button>
            <button onclick="toggleFarmStatus('${farm.farmId}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:var(--gray-100);color:var(--gray-700);font-size:12px;font-weight:600;">
              ${farm.status === 'active' ? '⏸ 暂停运营' : '▶ 启用运营'}
            </button>
            <button onclick="deleteFarm('${farm.farmId}')" style="padding:8px 12px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
          </div>
        </div>
      `).join('')}
      <button onclick="showCreateFarmModal()" style="width:100%;padding:16px;border-radius:var(--radius-md);border:2px dashed var(--green-300);background:var(--green-50);color:var(--green-600);font-size:14px;font-weight:600;margin-top:10px;">+ 新建农场</button>
    </div>
  `;
}

// 管理员列表页（超级管理员）
function renderSuperAdminList() {
  const container = document.getElementById('sa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderSuperAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">管理员授权</div>
      </div>
      <button onclick="showCreateAdminModal()" style="width:100%;padding:14px;border-radius:var(--radius-md);border:2px dashed var(--green-300);background:var(--green-50);color:var(--green-600);font-size:14px;font-weight:600;margin-bottom:16px;">+ 新建管理员账号</button>
      ${FARM_ADMINS.map(admin => {
        const farm = getFarmById(admin.farmId);
        return `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;margin-bottom:8px;box-shadow:var(--shadow-card);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:20px;">${admin.avatar}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;">${admin.nickname}</div>
              <div style="font-size:11px;color:var(--gray-500);">@${admin.username} · ${farm ? farm.name : '未知农场'}</div>
            </div>
            <span class="tag ${admin.role === 'admin' ? 'tag-green' : 'tag-blue'}">${admin.role === 'admin' ? '全权限' : admin.role === 'editor' ? '编辑' : '只读'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button onclick="showEditAdminModal('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑</button>
            <button onclick="toggleAdminStatus('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--gray-100);color:var(--gray-700);font-size:12px;font-weight:600;">
              ${admin.status === 'active' ? '禁用' : '启用'}
            </button>
            <button onclick="deleteAdmin('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
          </div>
        </div>
      `}).join('')}
    </div>
  `;
}

// 单个农场的管理员列表
function renderFarmAdminList(farmId) {
  const farm = getFarmById(farmId);
  const admins = getAdminsByFarm(farmId);
  const container = document.getElementById('sa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderSuperAdminList()" style="font-size:20px;">‹</button>
        <div>
          <div style="font-size:16px;font-weight:700;">${farm ? farm.name : '农场'} · 管理员</div>
          <div style="font-size:11px;color:var(--gray-500);">管理该农场的后台账号</div>
        </div>
      </div>
      <button onclick="showCreateAdminModal('${farmId}')" style="width:100%;padding:14px;border-radius:var(--radius-md);border:2px dashed var(--green-300);background:var(--green-50);color:var(--green-600);font-size:14px;font-weight:600;margin-bottom:16px;">+ 为该农场创建管理员</button>
      ${admins.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--gray-400);">暂无管理员</div>' : ''}
      ${admins.map(admin => `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;margin-bottom:8px;box-shadow:var(--shadow-card);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:20px;">${admin.avatar}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:700;">${admin.nickname}</div>
              <div style="font-size:11px;color:var(--gray-500);">@${admin.username} · 最后登录: ${admin.lastLogin || '从未'}</div>
            </div>
            <span class="tag ${admin.role === 'admin' ? 'tag-green' : 'tag-blue'}">${admin.role === 'admin' ? '全权限' : admin.role === 'editor' ? '编辑' : '只读'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button onclick="showEditAdminModal('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑</button>
            <button onclick="toggleAdminStatus('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--gray-100);color:var(--gray-700);font-size:12px;font-weight:600;">
              ${admin.status === 'active' ? '禁用' : '启用'}
            </button>
            <button onclick="deleteAdmin('${admin.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 全场地块查看
function renderSuperAllPlots() {
  const container = document.getElementById('sa-content');
  const allPlots = FARM_DATA.plots;
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderSuperAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">全场地块 (${allPlots.length})</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${allPlots.map(plot => {
          const farm = getFarmById(plot.farmId);
          return `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:16px;font-weight:800;">${plot.plotNo}</span>
                <span style="font-size:13px;color:var(--gray-500);margin-left:8px;">${plot.crop} ${plot.cropIcon}</span>
              </div>
              <span class="tag ${plot.status === 'my' ? 'tag-green' : plot.status === 'available' ? 'tag-blue' : 'tag-orange'}">
                ${plot.status === 'my' ? '已认养' : plot.status === 'available' ? '可认养' : '已预约'}
              </span>
            </div>
            <div style="font-size:11px;color:var(--gray-400);margin-top:4px;">${farm ? farm.name : '未知农场'} · ${plot.location}</div>
          </div>
        `}).join('')}
      </div>
    </div>
  `;
}

// 全部认养订单
function renderSuperAllOrders() {
  const container = document.getElementById('sa-content');
  const allOrders = FARM_DATA.bookings;
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderSuperAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">全部认养订单 (${allOrders.length})</div>
      </div>
      ${allOrders.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--gray-400);">暂无订单</div>' : ''}
      ${allOrders.map(order => {
        const plot = FARM_DATA.plots.find(p => p.id === order.plotId);
        const farm = getFarmById(order.farmId);
        return `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;margin-bottom:8px;box-shadow:var(--shadow-card);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:14px;font-weight:700;">${plot ? plot.plotNo + ' ' + plot.crop : '未知地块'}</div>
            <span class="tag ${order.status === 'approved' ? 'tag-green' : order.status === 'pending' ? 'tag-orange' : 'tag-red'}">
              ${order.status === 'approved' ? '已通过' : order.status === 'pending' ? '待审核' : '已拒绝'}
            </span>
          </div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">
            ${farm ? farm.name : ''} · ${order.date} ${order.timeSlot} · ${order.people}人
          </div>
        </div>
      `}).join('')}
    </div>
  `;
}

/* =========================================================
   多租户 - 农场管理端
   ========================================================= */
function showFarmAdminPanel() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-farm-admin').classList.add('active');
  document.getElementById('tabbar').style.display = 'none';
  renderFarmAdminDashboard();
}

function renderFarmAdminDashboard() {
  const farm = getFarmById(currentFarmId);
  const plots = FARM_DATA.plots.filter(p => p.farmId === currentFarmId);
  const bookings = FARM_DATA.bookings.filter(b => b.farmId === currentFarmId);
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const community = FARM_DATA.community.filter(c => c.farmId === currentFarmId);
  const pendingPosts = community.filter(p => p.status === 'pending').length;
  const myPlots = plots.filter(p => p.status === 'my').length;
  const availablePlots = plots.filter(p => p.status === 'available').length;

  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div class="admin-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:32px;">🌾</div>
        <div>
          <div style="font-size:16px;font-weight:800;color:var(--gray-900);">${farm ? farm.name : '农场'}管理后台</div>
          <div style="font-size:11px;color:var(--gray-500);">${currentAdmin.nickname} · ${currentAdmin.role === 'admin' ? '全权限' : currentAdmin.role === 'editor' ? '编辑' : '只读'}</div>
        </div>
      </div>
      <button onclick="handleAdminLogout()" style="padding:8px 16px;border-radius:var(--radius-full);background:var(--gray-100);color:var(--gray-700);font-size:13px;font-weight:600;">退出</button>
    </div>

    <!-- 数据概览 -->
    <div style="padding:16px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px;">📊 数据看板</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:22px;font-weight:800;color:var(--green-700);">${plots.length}</div>
          <div style="font-size:11px;color:var(--green-600);margin-top:2px;">总地块</div>
        </div>
        <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${myPlots}</div>
          <div style="font-size:11px;color:#3b82f6;margin-top:2px;">已认养</div>
        </div>
        <div style="background:linear-gradient(135deg,#fef9c3,#fef08a);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:22px;font-weight:800;color:#a16207;">${availablePlots}</div>
          <div style="font-size:11px;color:#ca8a04;margin-top:2px;">可认养</div>
        </div>
        <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);border-radius:var(--radius-md);padding:16px;">
          <div style="font-size:22px;font-weight:800;color:#dc2626;">${pendingBookings}</div>
          <div style="font-size:11px;color:#ef4444;margin-top:2px;">待审核预约</div>
        </div>
      </div>
    </div>

    <!-- 功能菜单 -->
    <div style="padding:0 16px 16px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:12px;">🛠️ 管理功能</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button onclick="renderAdminPlots()" class="admin-grid-btn">
          <span class="admin-grid-icon">🟩</span>
          <span style="font-size:13px;font-weight:600;">地块管理</span>
        </button>
        <button onclick="renderAdminBookings()" class="admin-grid-btn">
          <span class="admin-grid-icon">📅</span>
          <span style="font-size:13px;font-weight:600;">预约审核</span>
          ${pendingBookings > 0 ? `<span style="position:absolute;top:8px;right:8px;min-width:18px;height:18px;border-radius:9px;background:#dc2626;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;">${pendingBookings}</span>` : ''}
        </button>
        <button onclick="renderAdminAI()" class="admin-grid-btn">
          <span class="admin-grid-icon">🤖</span>
          <span style="font-size:13px;font-weight:600;">AI识别管理</span>
        </button>
        <button onclick="renderAdminCommunity()" class="admin-grid-btn">
          <span class="admin-grid-icon">💬</span>
          <span style="font-size:13px;font-weight:600;">社区审核</span>
          ${pendingPosts > 0 ? `<span style="position:absolute;top:8px;right:8px;min-width:18px;height:18px;border-radius:9px;background:#dc2626;color:white;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;">${pendingPosts}</span>` : ''}
        </button>
        <button onclick="renderAdminOrders()" class="admin-grid-btn">
          <span class="admin-grid-icon">📋</span>
          <span style="font-size:13px;font-weight:600;">认养订单</span>
        </button>
        <button onclick="renderAdminActivities()" class="admin-grid-btn">
          <span class="admin-grid-icon">🎉</span>
          <span style="font-size:13px;font-weight:600;">活动管理</span>
        </button>
      </div>
    </div>

    <!-- 快捷操作 -->
    ${currentAdmin.role !== 'viewer' ? `
    <div style="padding:0 16px 24px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:10px;">⚡ 快捷操作</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button onclick="showCreatePlotModal()" style="width:100%;padding:14px;border-radius:var(--radius-md);background:linear-gradient(135deg,var(--green-500),var(--green-600));color:white;font-size:14px;font-weight:700;box-shadow:0 4px 12px rgba(34,197,94,0.3);">+ 新增地块</button>
        <button onclick="showCreateActivityModal()" style="width:100%;padding:14px;border-radius:var(--radius-md);background:var(--white);border:2px solid var(--green-200);color:var(--green-700);font-size:14px;font-weight:600;">+ 发布活动</button>
      </div>
    </div>
    ` : ''}
  `;
}

// 地块管理页（农场管理员）
function renderAdminPlots() {
  const plots = FARM_DATA.plots.filter(p => p.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">地块管理 (${plots.length})</div>
      </div>
      ${currentAdmin.role !== 'viewer' ? `
      <button onclick="showCreatePlotModal()" style="width:100%;padding:12px;border-radius:var(--radius-md);border:2px dashed var(--green-300);background:var(--green-50);color:var(--green-600);font-size:13px;font-weight:600;margin-bottom:12px;">+ 新增地块</button>
      ` : ''}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${plots.map(plot => `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:16px;font-weight:800;">${plot.plotNo}</span>
                <span style="font-size:18px;margin:0 4px;">${plot.cropIcon}</span>
                <span style="font-size:13px;color:var(--gray-700);">${plot.crop}</span>
              </div>
              <span class="tag ${plot.status === 'my' ? 'tag-green' : plot.status === 'available' ? 'tag-blue' : 'tag-orange'}">
                ${plot.status === 'my' ? '已认养' : plot.status === 'available' ? '可认养' : '已预约'}
              </span>
            </div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">${plot.area}${plot.unit} · ¥${plot.price}/${plot.unit === '平米' ? '平米' : '块'}</div>
            ${currentAdmin.role !== 'viewer' ? `
            <div style="display:flex;gap:6px;margin-top:10px;">
              <button onclick="showEditPlotModal('${plot.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑</button>
              <button onclick="editPlotStatus('${plot.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--gray-100);color:var(--gray-700);font-size:12px;font-weight:600;">变更状态</button>
              <button onclick="deletePlot('${plot.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 预约审核页
function renderAdminBookings() {
  const bookings = FARM_DATA.bookings.filter(b => b.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">预约审核</div>
      </div>
      ${bookings.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--gray-400);">暂无预约</div>' : ''}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${bookings.map(order => {
          const plot = FARM_DATA.plots.find(p => p.id === order.plotId);
          return `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:14px;font-weight:700;">${plot ? plot.plotNo + ' · ' + plot.crop : '未知地块'}</div>
              <span class="tag ${order.status === 'approved' ? 'tag-green' : order.status === 'pending' ? 'tag-orange' : 'tag-red'}">
                ${order.status === 'approved' ? '已通过' : order.status === 'pending' ? '待审核' : '已拒绝'}
              </span>
            </div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">
              📅 ${order.date} · ⏰ ${order.timeSlot} · 👥 ${order.people}人
            </div>
            ${order.note ? `<div style="font-size:12px;color:var(--gray-400);margin-top:4px;">备注: ${order.note}</div>` : ''}
            ${order.status === 'pending' && currentAdmin.role !== 'viewer' ? `
            <div style="display:flex;gap:6px;margin-top:10px;">
              <button onclick="approveBooking('${order.id}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:var(--green-500);color:white;font-size:12px;font-weight:600;">通过</button>
              <button onclick="rejectBooking('${order.id}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">拒绝</button>
            </div>
            ` : ''}
          </div>
        `}).join('')}
      </div>
    </div>
  `;
}

// AI识别管理页
function renderAdminAI() {
  const plots = FARM_DATA.plots.filter(p => p.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">AI识别管理</div>
      </div>
      <div style="font-size:13px;color:var(--gray-500);margin-bottom:14px;">为地块上传照片并填写AI诊断结果</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${plots.map(plot => `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:15px;font-weight:700;">${plot.plotNo}</span>
                <span style="font-size:14px;margin-left:6px;">${plot.cropIcon} ${plot.crop}</span>
              </div>
              <span class="tag ${plot.aiResult ? 'tag-green' : 'tag-gray'}">${plot.aiResult ? '已录入' : '未录入'}</span>
            </div>
            ${currentAdmin.role !== 'viewer' ? `
            <button onclick="showEditAIModal('${plot.id}')" style="width:100%;margin-top:10px;padding:8px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">
              ${plot.aiResult ? '编辑AI结果' : '录入AI结果'}
            </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 社区审核页
function renderAdminCommunity() {
  const posts = FARM_DATA.community.filter(c => c.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">社区审核 (${posts.length})</div>
      </div>
      ${posts.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--gray-400);">暂无帖子</div>' : ''}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${posts.map(post => `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--green-100);display:flex;align-items:center;justify-content:center;font-size:18px;">${post.avatar}</div>
              <div>
                <div style="font-size:13px;font-weight:700;">${post.nickname}</div>
                <div style="font-size:11px;color:var(--gray-400);">${post.time}</div>
              </div>
            </div>
            <div style="font-size:13px;color:var(--gray-700);margin-bottom:8px;">${post.content}</div>
            <div style="font-size:12px;color:var(--gray-400);">📍 ${post.plotName} · ❤️ ${post.likes} · 💬 ${post.comments}</div>
            ${currentAdmin.role !== 'viewer' ? `
            <div style="display:flex;gap:6px;margin-top:10px;">
              <button onclick="pinPost('${post.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">置顶</button>
              <button onclick="deletePost('${post.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 认养订单管理页
function renderAdminOrders() {
  const bookings = FARM_DATA.bookings.filter(b => b.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">认养订单 (${bookings.length})</div>
      </div>
      ${bookings.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--gray-400);">暂无订单</div>' : ''}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${bookings.map(order => {
          const plot = FARM_DATA.plots.find(p => p.id === order.plotId);
          return `
          <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-card);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-size:14px;font-weight:700;">${plot ? plot.plotNo + ' · ' + plot.crop : '未知地块'}</div>
              <span class="tag ${order.status === 'approved' ? 'tag-green' : order.status === 'pending' ? 'tag-orange' : 'tag-red'}">
                ${order.status === 'approved' ? '已通过' : order.status === 'pending' ? '待审核' : '已拒绝'}
              </span>
            </div>
            <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">
              👤 用户${order.userId} · 📅 ${order.date} · ⏰ ${order.timeSlot}
            </div>
            ${order.note ? `<div style="font-size:12px;color:var(--gray-400);margin-top:4px;">备注: ${order.note}</div>` : ''}
            ${order.status === 'pending' && currentAdmin.role !== 'viewer' ? `
            <div style="display:flex;gap:6px;margin-top:10px;">
              <button onclick="approveBooking('${order.id}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:var(--green-500);color:white;font-size:12px;font-weight:600;">通过</button>
              <button onclick="rejectBooking('${order.id}')" style="flex:1;padding:8px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">拒绝</button>
            </div>
            ` : ''}
          </div>
        `}).join('')}
      </div>
    </div>
  `;
}

// 活动管理页
function renderAdminActivities() {
  const activities = FARM_DATA.activities.filter(a => a.farmId === currentFarmId);
  const container = document.getElementById('fa-content');
  container.innerHTML = `
    <div style="padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <button onclick="renderFarmAdminDashboard()" style="font-size:20px;">‹</button>
        <div style="font-size:16px;font-weight:700;">活动管理 (${activities.length})</div>
      </div>
      ${currentAdmin.role !== 'viewer' ? `
      <button onclick="showCreateActivityModal()" style="width:100%;padding:12px;border-radius:var(--radius-md);border:2px dashed var(--green-300);background:var(--green-50);color:var(--green-600);font-size:13px;font-weight:600;margin-bottom:12px;">+ 发布新活动</button>
      ` : ''}
      ${activities.map(act => `
        <div style="background:var(--white);border-radius:var(--radius-md);padding:14px;margin-bottom:8px;box-shadow:var(--shadow-card);">
          <div style="font-size:14px;font-weight:700;">${act.title}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;">📅 ${act.date} · 📍 ${act.location}</div>
          <div style="font-size:12px;color:var(--gray-400);margin-top:2px;">已报名 ${act.enrolled}/${act.quota}</div>
          ${currentAdmin.role !== 'viewer' ? `
          <div style="display:flex;gap:6px;margin-top:10px;">
            <button onclick="showEditActivityModal('${act.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:var(--green-50);color:var(--green-700);font-size:12px;font-weight:600;">编辑</button>
            <button onclick="deleteActivity('${act.id}')" style="flex:1;padding:6px;border-radius:var(--radius-sm);background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;">删除</button>
          </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

/* =========================================================
   多租户 - 操作函数
   ========================================================= */
function approveBooking(id) {
  const order = FARM_DATA.bookings.find(b => b.id === id);
  if (order) {
    order.status = 'approved';
    showToast('✅ 预约已通过');
    renderAdminBookings();
    renderFarmAdminDashboard();
  }
}

function rejectBooking(id) {
  const order = FARM_DATA.bookings.find(b => b.id === id);
  if (order) {
    order.status = 'rejected';
    showToast('❌ 预约已拒绝');
    renderAdminBookings();
    renderFarmAdminDashboard();
  }
}

function pinPost(id) {
  showToast('📌 帖子已置顶');
}

function deletePost(id) {
  const idx = FARM_DATA.community.findIndex(c => c.id === id);
  if (idx > -1) {
    FARM_DATA.community.splice(idx, 1);
    showToast('🗑️ 帖子已删除');
    renderAdminCommunity();
    renderFarmAdminDashboard();
  }
}

function editPlotStatus(id) {
  const plot = FARM_DATA.plots.find(p => p.id === id);
  if (!plot) return;
  const statuses = ['available', 'my', 'reserved'];
  const currentIdx = statuses.indexOf(plot.status);
  plot.status = statuses[(currentIdx + 1) % statuses.length];
  showToast('✅ 状态已更新');
  renderAdminPlots();
  renderFarmAdminDashboard();
}

function deletePlot(id) {
  const idx = FARM_DATA.plots.findIndex(p => p.id === id);
  if (idx > -1) {
    FARM_DATA.plots.splice(idx, 1);
    showToast('🗑️ 地块已删除');
    renderAdminPlots();
    renderFarmAdminDashboard();
  }
}

function deleteActivity(id) {
  const idx = FARM_DATA.activities.findIndex(a => a.id === id);
  if (idx > -1) {
    FARM_DATA.activities.splice(idx, 1);
    showToast('🗑️ 活动已删除');
    renderAdminActivities();
    renderFarmAdminDashboard();
  }
}

function toggleFarmStatus(farmId) {
  const farm = getFarmById(farmId);
  if (farm) {
    farm.status = farm.status === 'active' ? 'suspended' : 'active';
    showToast(`农场已${farm.status === 'active' ? '启用' : '暂停'}`);
    renderSuperAdminDashboard();
  }
}

function deleteFarm(farmId) {
  if (!confirm('确定要删除这个农场吗？相关数据将一并删除。')) return;
  const idx = FARMS.findIndex(f => f.farmId === farmId);
  if (idx > -1) {
    FARMS.splice(idx, 1);
    // 同时删除该农场的管理员和业务数据
    const adminIdx = FARM_ADMINS.findIndex(a => a.farmId === farmId);
    if (adminIdx > -1) FARM_ADMINS.splice(adminIdx, 1);
    FARM_DATA.plots = FARM_DATA.plots.filter(p => p.farmId !== farmId);
    FARM_DATA.bookings = FARM_DATA.bookings.filter(b => b.farmId !== farmId);
    FARM_DATA.activities = FARM_DATA.activities.filter(a => a.farmId !== farmId);
    FARM_DATA.community = FARM_DATA.community.filter(c => c.farmId !== farmId);
    showToast('🗑️ 农场已删除');
    renderSuperAdminDashboard();
  }
}

function editFarm(farmId) {
  showEditFarmModal(farmId);
}

function showCreateFarmModal() {
  const html = `
    <div id="modal-farm" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">🏡 新建农场</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">农场名称</label>
              <input id="new-farm-name" type="text" placeholder="例如：阳光田园农场" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--green-400)'" onblur="this.style.borderColor='var(--gray-200)'">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">地址</label>
              <input id="new-farm-address" type="text" placeholder="例如：北京市通州区" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;" onfocus="this.style.borderColor='var(--green-400)'" onblur="this.style.borderColor='var(--gray-200)'">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">简介</label>
              <textarea id="new-farm-desc" rows="3" placeholder="农场特色介绍..." style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;resize:none;" onfocus="this.style.borderColor='var(--green-400)'" onblur="this.style.borderColor='var(--gray-200)'"></textarea>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">订阅套餐</label>
              <select id="new-farm-plan" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;background:white;">
                <option value="basic">基础版</option>
                <option value="premium" selected>高级版</option>
                <option value="enterprise">企业版</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-farm')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="createFarm()" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">创建</button>
          </div>
        </div>
      </div>
    </div>
  `;
  // 移除旧弹窗
  const old = document.getElementById('modal-farm');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-farm');
}

function showEditFarmModal(farmId) {
  const farm = getFarmById(farmId);
  if (!farm) return;
  const html = `
    <div id="modal-farm-edit" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">✏️ 编辑农场</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">农场名称</label>
              <input id="edit-farm-name" type="text" value="${farm.name}" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">地址</label>
              <input id="edit-farm-address" type="text" value="${farm.address}" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">简介</label>
              <textarea id="edit-farm-desc" rows="3" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;resize:none;">${farm.description || ''}</textarea>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-farm-edit')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="updateFarm('${farmId}')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-farm-edit');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-farm-edit');
}

function createFarm() {
  const name = document.getElementById('new-farm-name').value.trim();
  const address = document.getElementById('new-farm-address').value.trim();
  const desc = document.getElementById('new-farm-desc').value.trim();
  const plan = document.getElementById('new-farm-plan').value;
  if (!name) return showToast('请输入农场名称');
  if (!address) return showToast('请输入农场地址');

  const farmId = 'farm_' + Date.now();
  FARMS.push({
    farmId, name, address, description: desc,
    cover: `https://picsum.photos/seed/${farmId}/800/400`,
    status: 'active', adminIds: [],
    createdAt: new Date().toISOString().slice(0, 10),
    plan
  });
  closeModal('modal-farm');
  showToast('✅ 农场创建成功');
  renderSuperAdminDashboard();
}

function updateFarm(farmId) {
  const farm = getFarmById(farmId);
  if (!farm) return;
  farm.name = document.getElementById('edit-farm-name').value.trim() || farm.name;
  farm.address = document.getElementById('edit-farm-address').value.trim() || farm.address;
  farm.description = document.getElementById('edit-farm-desc').value.trim();
  closeModal('modal-farm-edit');
  showToast('✅ 农场信息已更新');
  renderSuperAdminDashboard();
}

// 管理员CRUD
function showCreateAdminModal(presetFarmId) {
  const html = `
    <div id="modal-admin" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">👤 新建管理员</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">所属农场</label>
              <select id="new-admin-farm" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;background:white;">
                ${FARMS.map(f => `<option value="${f.farmId}" ${presetFarmId === f.farmId ? 'selected' : ''}>${f.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">昵称</label>
              <input id="new-admin-nickname" type="text" placeholder="例如：开心农场·李站长" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">登录账号</label>
              <input id="new-admin-username" type="text" placeholder="用于登录的用户名" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">密码</label>
              <input id="new-admin-password" type="text" placeholder="初始密码" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">权限</label>
              <select id="new-admin-role" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;background:white;">
                <option value="admin">全权限管理员</option>
                <option value="editor">编辑（不能删除）</option>
                <option value="viewer">只读</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-admin')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="createAdmin()" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">创建</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-admin');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-admin');
}

function showEditAdminModal(adminId) {
  const admin = FARM_ADMINS.find(a => a.id === adminId);
  if (!admin) return;
  const html = `
    <div id="modal-admin-edit" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">✏️ 编辑管理员</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">昵称</label>
              <input id="edit-admin-nickname" type="text" value="${admin.nickname}" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">新密码（留空不变）</label>
              <input id="edit-admin-password" type="text" placeholder="留空则不修改" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">权限</label>
              <select id="edit-admin-role" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;background:white;">
                <option value="admin" ${admin.role === 'admin' ? 'selected' : ''}>全权限管理员</option>
                <option value="editor" ${admin.role === 'editor' ? 'selected' : ''}>编辑</option>
                <option value="viewer" ${admin.role === 'viewer' ? 'selected' : ''}>只读</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-admin-edit')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="updateAdmin('${adminId}')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-admin-edit');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-admin-edit');
}

function createAdmin() {
  const farmId = document.getElementById('new-admin-farm').value;
  const nickname = document.getElementById('new-admin-nickname').value.trim();
  const username = document.getElementById('new-admin-username').value.trim();
  const password = document.getElementById('new-admin-password').value.trim();
  const role = document.getElementById('new-admin-role').value;
  if (!nickname || !username || !password) return showToast('请填写完整信息');
  if (FARM_ADMINS.find(a => a.username === username)) return showToast('该账号名已存在');

  FARM_ADMINS.push({
    id: genId('fa'), farmId, nickname, username, password,
    avatar: '👤', role, status: 'active',
    createdAt: new Date().toISOString().slice(0, 10),
    lastLogin: null
  });
  closeModal('modal-admin');
  showToast('✅ 管理员账号已创建');
  renderSuperAdminList();
}

function updateAdmin(adminId) {
  const admin = FARM_ADMINS.find(a => a.id === adminId);
  if (!admin) return;
  const nickname = document.getElementById('edit-admin-nickname').value.trim();
  const password = document.getElementById('edit-admin-password').value.trim();
  const role = document.getElementById('edit-admin-role').value;
  if (nickname) admin.nickname = nickname;
  if (password) admin.password = password;
  admin.role = role;
  closeModal('modal-admin-edit');
  showToast('✅ 管理员信息已更新');
  renderSuperAdminList();
}

function toggleAdminStatus(adminId) {
  const admin = FARM_ADMINS.find(a => a.id === adminId);
  if (admin) {
    admin.status = admin.status === 'active' ? 'disabled' : 'active';
    showToast(admin.status === 'active' ? '✅ 账号已启用' : '⏸ 账号已禁用');
    renderSuperAdminList();
  }
}

function deleteAdmin(adminId) {
  if (!confirm('确定要删除该管理员账号吗？')) return;
  const idx = FARM_ADMINS.findIndex(a => a.id === adminId);
  if (idx > -1) {
    FARM_ADMINS.splice(idx, 1);
    showToast('🗑️ 账号已删除');
    renderSuperAdminList();
  }
}

// 地块CRUD弹窗
function showCreatePlotModal() {
  const html = `
    <div id="modal-plot" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:85vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">🟩 新增地块</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">地块编号</label>
                <input id="new-plot-no" type="text" placeholder="如 A-03" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">作物</label>
                <input id="new-plot-crop" type="text" placeholder="如 草莓" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">面积</label>
                <input id="new-plot-area" type="number" placeholder="20" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">价格(元)</label>
                <input id="new-plot-price" type="number" placeholder="599" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">位置描述</label>
              <input id="new-plot-location" type="text" placeholder="如 农场东区·阳光带" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div style="font-size:12px;font-weight:700;color:var(--green-600);margin-top:4px;">🗺️ 地图显示设置（百分比）</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
              <div>
                <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;color:var(--gray-500);">X (%)</label>
                <input id="plot-mapX" type="number" value="5" min="0" max="95" style="width:100%;padding:8px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;outline:none;">
              </div>
              <div>
                <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;color:var(--gray-500);">Y (%)</label>
                <input id="plot-mapY" type="number" value="5" min="0" max="95" style="width:100%;padding:8px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;outline:none;">
              </div>
              <div>
                <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;color:var(--gray-500);">宽 (%)</label>
                <input id="plot-mapW" type="number" value="20" min="5" max="50" style="width:100%;padding:8px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;outline:none;">
              </div>
              <div>
                <label style="font-size:11px;font-weight:600;display:block;margin-bottom:4px;color:var(--gray-500);">高 (%)</label>
                <input id="plot-mapH" type="number" value="20" min="5" max="50" style="width:100%;padding:8px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;outline:none;">
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">地块卡片颜色</label>
              <input id="plot-mapColor" type="color" value="#dcfce7" style="width:100%;height:40px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);cursor:pointer;padding:2px;">
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-plot')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="createPlot()" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">创建</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-plot');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-plot');
}

function showEditPlotModal(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  showCreatePlotModal();
  setTimeout(() => {
    document.getElementById('new-plot-no').value = plot.plotNo;
    document.getElementById('new-plot-crop').value = plot.crop;
    document.getElementById('new-plot-area').value = plot.area;
    document.getElementById('new-plot-price').value = plot.price;
    document.getElementById('new-plot-location').value = plot.location || '';
    // 地图可视化字段
    document.getElementById('plot-mapX').value = plot.mapX ?? 5;
    document.getElementById('plot-mapY').value = plot.mapY ?? 5;
    document.getElementById('plot-mapW').value = plot.mapW ?? 20;
    document.getElementById('plot-mapH').value = plot.mapH ?? 20;
    document.getElementById('plot-mapColor').value = plot.mapColor || '#dcfce7';
    // 修改创建按钮为更新
    const createBtn = document.querySelector('#modal-plot button:last-child');
    if (createBtn) {
      createBtn.textContent = '更新';
      createBtn.onclick = () => updatePlot(plotId);
    }
  }, 100);
}

function createPlot() {
  const plotNo = document.getElementById('new-plot-no').value.trim();
  const crop = document.getElementById('new-plot-crop').value.trim() || '未知';
  const area = parseInt(document.getElementById('new-plot-area').value) || 10;
  const price = parseInt(document.getElementById('new-plot-price').value) || 0;
  const location = document.getElementById('new-plot-location').value.trim();
  const mapX = parseInt(document.getElementById('plot-mapX').value) || 5;
  const mapY = parseInt(document.getElementById('plot-mapY').value) || 5;
  const mapW = parseInt(document.getElementById('plot-mapW').value) || 20;
  const mapH = parseInt(document.getElementById('plot-mapH').value) || 20;
  const mapColor = document.getElementById('plot-mapColor').value || '#dcfce7';
  if (!plotNo) return showToast('请输入地块编号');

  const cropIcons = { '小番茄': '🍅', '草莓': '🍓', '黄瓜': '🥒', '生菜': '🥬', '西瓜': '🍉', '向日葵': '🌻' };
  FARM_DATA.plots.push({
    id: genId('p'), farmId: currentFarmId, plotNo, crop, cropIcon: cropIcons[crop] || '🌱',
    area, unit: '平米', price,
    status: 'available',
    plantDate: null, harvestDate: null,
    location: location || '未设置',
    mapX, mapY, mapW, mapH, mapColor,
    photos: [], aiResult: null, diary: []
  });
  closeModal('modal-plot');
  showToast('✅ 地块已创建');
  renderAdminPlots();
  renderFarmAdminDashboard();
  renderMap();
}

function updatePlot(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  const plotNo = document.getElementById('new-plot-no').value.trim();
  const crop = document.getElementById('new-plot-crop').value.trim();
  const area = parseInt(document.getElementById('new-plot-area').value);
  const price = parseInt(document.getElementById('new-plot-price').value);
  const location = document.getElementById('new-plot-location').value.trim();
  const mapX = parseInt(document.getElementById('plot-mapX').value);
  const mapY = parseInt(document.getElementById('plot-mapY').value);
  const mapW = parseInt(document.getElementById('plot-mapW').value);
  const mapH = parseInt(document.getElementById('plot-mapH').value);
  const mapColor = document.getElementById('plot-mapColor').value;
  if (!plotNo) return showToast('请输入地块编号');

  const cropIcons = { '小番茄': '🍅', '草莓': '🍓', '黄瓜': '🥒', '生菜': '🥬', '西瓜': '🍉', '向日葵': '🌻' };
  plot.plotNo = plotNo;
  plot.crop = crop || plot.crop;
  plot.cropIcon = cropIcons[plot.crop] || '🌱';
  if (area) plot.area = area;
  if (price) plot.price = price;
  plot.location = location || plot.location;
  if (!isNaN(mapX)) plot.mapX = mapX;
  if (!isNaN(mapY)) plot.mapY = mapY;
  if (!isNaN(mapW)) plot.mapW = mapW;
  if (!isNaN(mapH)) plot.mapH = mapH;
  plot.mapColor = mapColor || plot.mapColor;
  closeModal('modal-plot');
  showToast('✅ 地块已更新');
  renderAdminPlots();
  renderFarmAdminDashboard();
  renderMap();
  populateSelects();
}

// AI结果编辑弹窗
function showEditAIModal(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  const result = plot.aiResult || { health: '良好', healthScore: 70, disease: '未发现', advice: [''], maturity: 50 };
  const html = `
    <div id="modal-ai" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:90vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">🤖 AI识别结果 - ${plot.plotNo} ${plot.crop}</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">健康状态</label>
                <select id="ai-health" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;background:white;">
                  <option value="优秀" ${result.health === '优秀' ? 'selected' : ''}>优秀</option>
                  <option value="良好" ${result.health === '良好' ? 'selected' : ''}>良好</option>
                  <option value="一般" ${result.health === '一般' ? 'selected' : ''}>一般</option>
                  <option value="较差" ${result.health === '较差' ? 'selected' : ''}>较差</option>
                </select>
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">健康评分 (0-100)</label>
                <input id="ai-score" type="number" value="${result.healthScore}" min="0" max="100" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">病虫害情况</label>
              <input id="ai-disease" type="text" value="${result.disease}" placeholder="如：未发现病虫害" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">成熟度 (%)</label>
              <input id="ai-maturity" type="number" value="${result.maturity}" min="0" max="100" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">AI建议（每行一条）</label>
              <textarea id="ai-advice" rows="4" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;resize:none;">${(result.advice || []).join('\n')}</textarea>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-ai')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="saveAIResult('${plotId}')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">保存</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-ai');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-ai');
}

function saveAIResult(plotId) {
  const plot = FARM_DATA.plots.find(p => p.id === plotId);
  if (!plot) return;
  const adviceText = document.getElementById('ai-advice').value.trim();
  plot.aiResult = {
    health: document.getElementById('ai-health').value,
    healthScore: parseInt(document.getElementById('ai-score').value) || 70,
    disease: document.getElementById('ai-disease').value.trim() || '未发现病虫害',
    advice: adviceText ? adviceText.split('\n').filter(a => a.trim()) : ['暂无建议'],
    maturity: parseInt(document.getElementById('ai-maturity').value) || 0
  };
  closeModal('modal-ai');
  showToast('✅ AI结果已保存');
  renderAdminAI();
  renderFarmAdminDashboard();
}

// 活动创建弹窗
function showCreateActivityModal() {
  const html = `
    <div id="modal-activity" class="modal-overlay" style="display:flex;align-items:flex-end;">
      <div class="modal-sheet" style="max-height:90vh;overflow-y:auto;">
        <div style="padding:20px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">🎉 发布活动</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">活动标题</label>
              <input id="new-act-title" type="text" placeholder="如：草莓采摘节" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">日期</label>
                <input id="new-act-date" type="date" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
              <div>
                <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">名额</label>
                <input id="new-act-quota" type="number" placeholder="30" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
              </div>
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">地点</label>
              <input id="new-act-location" type="text" placeholder="如：农场东区" style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;">
            </div>
            <div>
              <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px;">活动描述</label>
              <textarea id="new-act-desc" rows="3" placeholder="活动详情..." style="width:100%;padding:10px 14px;border:1.5px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14px;outline:none;resize:none;"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:10px;margin-top:20px;">
            <button onclick="closeModal('modal-activity')" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--gray-100);color:var(--gray-700);font-size:14px;font-weight:600;">取消</button>
            <button onclick="createActivity()" style="flex:1;padding:12px;border-radius:var(--radius-md);background:var(--green-500);color:white;font-size:14px;font-weight:700;">发布</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const old = document.getElementById('modal-activity');
  if (old) old.remove();
  document.body.insertAdjacentHTML('beforeend', html);
  openModal('modal-activity');
}

function createActivity() {
  const title = document.getElementById('new-act-title').value.trim();
  const date = document.getElementById('new-act-date').value;
  const quota = parseInt(document.getElementById('new-act-quota').value) || 20;
  const location = document.getElementById('new-act-location').value.trim();
  const desc = document.getElementById('new-act-desc').value.trim();
  if (!title || !date) return showToast('请填写活动标题和日期');

  FARM_DATA.activities.push({
    id: genId('act'), farmId: currentFarmId,
    title, date, location: location || '待定', quota, enrolled: 0,
    desc: desc || '', tags: [], cover: ''
  });
  closeModal('modal-activity');
  showToast('✅ 活动已发布');
  renderAdminActivities();
  renderFarmAdminDashboard();
}

function showEditActivityModal(actId) {
  showCreateActivityModal();
  setTimeout(() => {
    const act = FARM_DATA.activities.find(a => a.id === actId);
    if (!act) return;
    document.getElementById('new-act-title').value = act.title;
    document.getElementById('new-act-date').value = act.date;
    document.getElementById('new-act-quota').value = act.quota;
    document.getElementById('new-act-location').value = act.location;
    document.getElementById('new-act-desc').value = act.desc;
    const createBtn = document.querySelector('#modal-activity button:last-child');
    if (createBtn) {
      createBtn.textContent = '更新';
      createBtn.onclick = () => updateActivity(actId);
    }
  }, 100);
}

function updateActivity(actId) {
  const act = FARM_DATA.activities.find(a => a.id === actId);
  if (!act) return;
  act.title = document.getElementById('new-act-title').value.trim() || act.title;
  act.date = document.getElementById('new-act-date').value || act.date;
  act.quota = parseInt(document.getElementById('new-act-quota').value) || act.quota;
  act.location = document.getElementById('new-act-location').value.trim() || act.location;
  act.desc = document.getElementById('new-act-desc').value.trim();
  closeModal('modal-activity');
  showToast('✅ 活动已更新');
  renderAdminActivities();
  renderFarmAdminDashboard();
}

/* =========================================================
   工具：格式化日期
   ========================================================= */
function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* =========================================================
   用户端 - 登录 / 注册
   ========================================================= */

// 切换登录/注册 Tab
function switchAuthTab(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const loginForm = document.getElementById('auth-form-login');
  const regForm = document.getElementById('auth-form-register');

  if (tab === 'login') {
    loginTab.style.background = 'var(--white)';
    loginTab.style.color = 'var(--gray-900)';
    loginTab.style.boxShadow = 'var(--shadow-sm)';
    loginTab.style.fontWeight = '700';
    regTab.style.background = 'transparent';
    regTab.style.color = 'var(--gray-500)';
    regTab.style.boxShadow = 'none';
    regTab.style.fontWeight = '600';
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    regTab.style.background = 'var(--white)';
    regTab.style.color = 'var(--gray-900)';
    regTab.style.boxShadow = 'var(--shadow-sm)';
    regTab.style.fontWeight = '700';
    loginTab.style.background = 'transparent';
    loginTab.style.color = 'var(--gray-500)';
    loginTab.style.boxShadow = 'none';
    loginTab.style.fontWeight = '600';
    regForm.style.display = 'block';
    loginForm.style.display = 'none';
  }
}

// 模拟发送验证码
function sendVerifyCode(type) {
  const phoneInput = document.getElementById(type === 'login' ? 'login-phone' : 'reg-phone');
  const phone = phoneInput.value.trim();
  if (!/^1\d{10}$/.test(phone)) return showToast('请输入正确的11位手机号');

  const btnId = type === 'login' ? 'login-send-code' : 'reg-send-code';
  const btn = document.getElementById(btnId);
  if (!btn) return;

  let seconds = 60;
  btn.disabled = true;
  btn.style.opacity = '0.5';
  btn.textContent = `${seconds}s`;

  const timer = setInterval(() => {
    seconds--;
    btn.textContent = `${seconds}s`;
    if (seconds <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.textContent = '重新获取';
    }
  }, 1000);

  showToast('📱 验证码已发送（演示：任意6位数字即可）');
}

// 用户登录
function handleUserLogin() {
  const phone = document.getElementById('login-phone').value.trim();
  const code = document.getElementById('login-code').value.trim();

  if (!/^1\d{10}$/.test(phone)) return showToast('请输入正确的11位手机号');
  if (!/^\d{6}$/.test(code)) return showToast('请输入6位验证码');

  // 模拟登录：检查 localStorage 中是否有该用户
  const users = JSON.parse(localStorage.getItem('farm_users') || '[]');
  let user = users.find(u => u.phone === phone);

  if (!user) {
    // 演示模式：手机号未注册则自动创建临时账号
    user = {
      id: 'u_' + Date.now(),
      phone,
      nickname: '农场用户' + phone.slice(-4),
      avatar: '🌾',
      children: []
    };
    users.push(user);
    localStorage.setItem('farm_users', JSON.stringify(users));
  }

  // 保存登录态（localStorage，关闭浏览器不失效；如需 session 级可改用 sessionStorage）
  localStorage.setItem('farm_current_user', JSON.stringify(user));

  showToast(`✅ 欢迎回来，${user.nickname}！`);
  hideAuthPage();
  updateProfileUI();
  populateSelects();
}

// 用户注册
function handleUserRegister() {
  const nickname = document.getElementById('reg-nickname').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const code = document.getElementById('reg-code').value.trim();

  if (!nickname) return showToast('请输入昵称');
  if (!/^1\d{10}$/.test(phone)) return showToast('请输入正确的11位手机号');
  if (!/^\d{6}$/.test(code)) return showToast('请输入6位验证码');

  // 检查手机号是否已注册
  const users = JSON.parse(localStorage.getItem('farm_users') || '[]');
  if (users.find(u => u.phone === phone)) {
    return showToast('该手机号已注册，请直接登录');
  }

  // 创建新用户（仅普通用户）
  const newUser = {
    id: 'u_' + Date.now(),
    phone,
    nickname: nickname || '农场用户' + phone.slice(-4),
    avatar: '🌾',
    children: [],
    farmId: 'farm_demo', // 默认加入演示农场
    myPlots: []
  };

  users.push(newUser);
  localStorage.setItem('farm_users', JSON.stringify(users));
  localStorage.setItem('farm_current_user', JSON.stringify(newUser));

  showToast(`🎉 注册成功！欢迎加入城市AI农场`);
  hideAuthPage();
  updateProfileUI();
  populateSelects();
}

// 隐藏登录/注册页，返回首页
function hideAuthPage() {
  document.getElementById('page-auth').classList.remove('active');
  document.getElementById('tabbar').style.display = 'flex';
  navigateTo('home');
}

// 显示登录/注册页
function showAuthPage() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('tabbar').style.display = 'none';
  // 清空表单
  document.getElementById('login-phone').value = '';
  document.getElementById('login-code').value = '';
  document.getElementById('reg-nickname').value = '';
  document.getElementById('reg-phone').value = '';
  document.getElementById('reg-code').value = '';
  switchAuthTab('login');
}

// 更新"我的"页面显示（登录态）
function updateProfileUI() {
  const userStr = localStorage.getItem('farm_current_user');
  const guestEl = document.getElementById('profile-guest');
  const userEl = document.getElementById('profile-user');
  const logoutBtn = document.getElementById('menu-logout');

  if (!userStr) {
    // 未登录
    if (guestEl) guestEl.style.display = 'block';
    if (userEl) userEl.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  const user = JSON.parse(userStr);
  // 已登录
  if (guestEl) guestEl.style.display = 'none';
  if (userEl) userEl.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'flex';

  // 更新个人信息
  const avatarEl = document.getElementById('profile-avatar');
  const nickEl = document.getElementById('profile-nickname');
  const phoneEl = document.getElementById('profile-phone');
  if (avatarEl) avatarEl.textContent = user.avatar || '🌾';
  if (nickEl) nickEl.textContent = user.nickname || '农场用户';
  if (phoneEl) phoneEl.textContent = maskPhone(user.phone || '');

  // 更新家庭成员
  const familyContainer = document.getElementById('family-list');
  if (familyContainer && user.children && user.children.length > 0) {
    familyContainer.innerHTML = `
      <div style="display:flex;gap:10px;overflow-x:auto;padding:12px 0;">
        ${user.children.map(c => `
          <div style="flex-shrink:0;background:var(--white);border-radius:var(--radius-md);padding:14px;width:100px;text-align:center;box-shadow:var(--shadow-card);">
            <div style="font-size:36px;">${c.avatar}</div>
            <div style="font-size:13px;font-weight:700;margin-top:4px;">${c.name}</div>
            <div style="font-size:11px;color:var(--gray-500);">${c.age}岁</div>
            <div style="margin-top:8px;"><span class="tag tag-green" style="font-size:10px;">已绑定</span></div>
          </div>
        `).join('')}
        <div style="flex-shrink:0;background:var(--green-50);border-radius:var(--radius-md);padding:14px;width:100px;text-align:center;border:2px dashed var(--green-300);cursor:pointer;" onclick="showToast('添加孩子功能开发中')">
          <div style="font-size:32px;color:var(--green-400);">+</div>
          <div style="font-size:12px;color:var(--green-600);font-weight:600;margin-top:4px;">添加孩子</div>
        </div>
      </div>
    `;
  } else if (familyContainer) {
    familyContainer.innerHTML = `
      <div style="text-align:center;padding:20px;color:var(--gray-400);font-size:13px;">
        登录后可添加家庭成员 👨‍👩‍👧‍👦
      </div>
    `;
  }
}

// 手机号脱敏
function maskPhone(phone) {
  if (phone.length !== 11) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(7);
}

// 用户退出登录
function handleUserLogout() {
  localStorage.removeItem('farm_current_user');
  showToast('已退出登录');
  updateProfileUI();
  navigateTo('home');
}

// 检查用户登录态（页面加载时调用）
function checkUserLoginState() {
  updateProfileUI();
}
