/**
 * 城市AI农场 PWA 图标生成器
 * 输出: 512 / 384 / 192 / 180 / 152 / 144 / 96 / 72 / 48 多尺寸 PNG
 */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "assets", "icons");
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [512, 384, 192, 180, 152, 144, 96, 72, 48];

// ── 颜色 ──────────────────────────────────────────────
const BG_TOP    = [22, 163, 74];     // #16a34a
const BG_BOTTOM = [74, 222, 128];    // #4ade80
const RING      = [255, 255, 255, 230];
const LEAF_DARK = [21, 128, 61];
const LEAF_MID  = [34, 197, 94];
const LEAF_LITE = [134, 239, 172];
const CHIP_RING = [255, 255, 255, 180];
const SOIL      = [120, 53, 15];
const WHITE     = [255, 255, 255];

function lerpColor(c1, c2, t) {
  return c1.map((v, i) => Math.round(v + (c2[i] - v) * t));
}

function roundedRect(ctx, x, y, w, h, r, fill, stroke, sw = 1) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = `rgba(${fill.join(",")})`; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = `rgba(${stroke.join(",")})`; ctx.lineWidth = sw; ctx.stroke(); }
}

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const cx = size / 2, cy = size / 2;

  // ── 1. 径向渐变背景 ───────────────────────────────
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
  grad.addColorStop(0, `rgb(${BG_BOTTOM.join(",")})`);
  grad.addColorStop(1, `rgb(${BG_TOP.join(",")})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // ── 2. 外层装饰环 ─────────────────────────────────
  const ringW = Math.max(2, size / 64);
  ctx.strokeStyle = `rgba(${RING.join(",")})`;
  ctx.lineWidth = ringW;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size / 2 - ringW / 2, size / 2 - ringW / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // ── 3. 光晕 ───────────────────────────────────────
  const glowLayers = 12;
  for (let i = glowLayers; i >= 1; i--) {
    const r = (size / 3) * (i / glowLayers);
    const alpha = Math.round(20 * (1 - i / glowLayers));
    ctx.fillStyle = `rgba(74,222,128,${alpha / 255})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 4. 芯片底座 ───────────────────────────────────
  const pad = size / 5;
  const chipPad = size / 12;
  const cr = Math.max(3, size / 32);
  const chipX = pad + chipPad, chipY = pad + chipPad;
  const chipW = size - 2 * pad - 2 * chipPad;
  const chipH = chipW;
  roundedRect(ctx, chipX, chipY, chipW, chipH, cr,
    [255, 255, 255, 220], [255, 255, 255, 180], Math.max(1, size / 128));

  // 引脚
  const pinLen = size / 16, pinW = Math.max(1, size / 80);
  const lx = chipX, rx = chipX + chipW;
  const ty = chipY, by = chipY + chipH;
  ctx.fillStyle = "rgba(200,220,255,0.78)";
  for (let i = 1; i <= 4; i++) {
    const ly = ty + (by - ty) * i / 5;
    const ry = ty + (by - ty) * i / 5;
    const tx2 = lx + (rx - lx) * i / 5;
    ctx.fillRect(lx - pinLen, ly - pinW / 2, pinLen, pinW);
    ctx.fillRect(rx, ry - pinW / 2, pinLen, pinW);
    ctx.fillRect(tx2 - pinW / 2, ty - pinLen, pinW, pinLen);
    ctx.fillRect(tx2 - pinW / 2, by, pinW, pinLen);
  }

  // ── 5. 中心植物 ────────────────────────────────────
  // 土壤
  const soilH = size / 10;
  const soilX = chipX + size / 12;
  const soilY = by - soilH - size / 20;
  const soilW = chipW - 2 * size / 12;
  const soilR = soilH / 3;
  roundedRect(ctx, soilX, soilY, soilW, soilH, soilR, SOIL);

  // 茎
  const stemW = Math.max(2, size / 48);
  const stemH = size / 4;
  const sx = cx - stemW / 2;
  const sy = soilY - stemH;
  ctx.fillStyle = `rgb(${LEAF_DARK.join(",")})`;
  ctx.fillRect(sx, sy, stemW, stemH);

  // 叶子辅助函数
  function drawLeaf(cx2, cy2, lw, lh, color) {
    ctx.fillStyle = `rgba(${color.join(",")})`;
    ctx.beginPath();
    ctx.ellipse(cx2, cy2, lw / 2, lh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const leafSize = size / 5;
  // 左叶
  drawLeaf(cx - leafSize / 2, sy + stemH / 3, leafSize, leafSize * 0.65, LEAF_MID);
  // 右叶
  drawLeaf(cx + leafSize / 2, sy + stemH / 3, leafSize, leafSize * 0.65, LEAF_MID);
  // 顶叶
  drawLeaf(cx, sy - leafSize / 5, leafSize * 0.75, leafSize, LEAF_LITE);

  // ── 6. AI 脉冲点 ───────────────────────────────────
  const dotR = Math.max(2, size / 40);
  const dots = [
    [cx + size / 8, sy - size / 8],
    [cx + size / 5, sy - size / 16],
    [cx + size / 6, sy + size / 24],
  ];
  dots.forEach(([dx, dy], i) => {
    const alpha = 255 - i * 60;
    ctx.fillStyle = `rgba(255,255,255,${alpha / 255})`;
    ctx.beginPath();
    ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas;
}

// ── 生成 ──────────────────────────────────────────────
const manifestIcons = [];

for (const sz of SIZES) {
  const canvas = drawIcon(sz);
  const buf = canvas.toBuffer("image/png");
  const fname = `icon-${sz}x${sz}.png`;
  fs.writeFileSync(path.join(OUT, fname), buf);
  manifestIcons.push({ src: `assets/icons/${fname}`, sizes: `${sz}x${sz}`, type: "image/png", purpose: "any maskable" });
  console.log(`  ✓ ${fname}`);
}

// ── favicon.ico (多尺寸) ──────────────────────────────
const icoSizes = [16, 32, 48];
const icoImages = icoSizes.map(s => {
  const c = drawIcon(s);
  return { width: s, height: s, data: c.toBuffer("image/png") };
});
// 用32x32作为主ico
fs.writeFileSync(path.join(OUT, "favicon.ico"), icoImages[1].data);
console.log("  ✓ favicon.ico");

// ── apple-touch-icon 180x180 ──────────────────────────
const apple = drawIcon(180);
fs.writeFileSync(path.join(OUT, "apple-touch-icon.png"), apple.toBuffer("image/png"));
console.log("  ✓ apple-touch-icon.png");

// ── 保存manifest引用 ──────────────────────────────────
fs.writeFileSync(path.join(OUT, "manifest-icons.json"),
  JSON.stringify({ icons: manifestIcons }, null, 2));
console.log("\n✅ 全部图标生成完成！");
