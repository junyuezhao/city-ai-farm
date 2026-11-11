const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const canvas = createCanvas(512, 512);
const ctx = canvas.getContext("2d");
const cx = 256, cy = 256;

// 径向渐变背景
const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256);
grad.addColorStop(0, "rgb(74,222,128)");
grad.addColorStop(1, "rgb(22,163,74)");
ctx.fillStyle = grad;
ctx.fillRect(0, 0, 512, 512);

// 外环
ctx.strokeStyle = "rgba(255,255,255,0.9)";
ctx.lineWidth = 6;
ctx.beginPath();
ctx.ellipse(cx, cy, 248, 248, 0, 0, Math.PI * 2);
ctx.stroke();

// 光晕
for (let i = 12; i >= 1; i--) {
  const r = 85 * (i / 12);
  const alpha = 20 * (1 - i / 12);
  ctx.fillStyle = `rgba(74,222,128,${alpha / 255})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 芯片底座
const pad = 102, chipPad = 42;
const chipX = pad + chipPad, chipY = pad + chipPad;
const chipW = 512 - 2 * pad - 2 * chipPad;
const chipH = chipW;
const cr = 10;
ctx.fillStyle = "rgba(255,255,255,0.92)";
ctx.strokeStyle = "rgba(255,255,255,0.8)";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(chipX + cr, chipY);
ctx.lineTo(chipX + chipW - cr, chipY);
ctx.quadraticCurveTo(chipX + chipW, chipY, chipX + chipW, chipY + cr);
ctx.lineTo(chipX + chipW, chipY + chipH - cr);
ctx.quadraticCurveTo(chipX + chipW, chipY + chipH, chipX + chipW - cr, chipY + chipH);
ctx.lineTo(chipX + cr, chipY + chipH);
ctx.quadraticCurveTo(chipX, chipY + chipH, chipX, chipY + chipH - cr);
ctx.lineTo(chipX, chipY + cr);
ctx.quadraticCurveTo(chipX, chipY, chipX + cr, chipY);
ctx.closePath();
ctx.fill();
ctx.stroke();

// 引脚
const pinLen = 32, pinW = 3;
const lx = chipX, rx = chipX + chipW;
const ty = chipY, by = chipY + chipH;
ctx.fillStyle = "rgba(200,220,255,0.78)";
for (let i = 1; i <= 4; i++) {
  const ly = ty + (by - ty) * i / 5;
  const ry = ty + (by - ty) * i / 5;
  const tx = lx + (rx - lx) * i / 5;
  ctx.fillRect(lx - pinLen, ly - pinW/2, pinLen, pinW);
  ctx.fillRect(rx, ry - pinW/2, pinLen, pinW);
  ctx.fillRect(tx - pinW/2, ty - pinLen, pinW, pinLen);
  ctx.fillRect(tx - pinW/2, by, pinW, pinLen);
}

// 土壤
const soilH = 51;
const soilX = chipX + 42;
const soilY = by - soilH - 25;
const soilW = chipW - 84;
const soilR = soilH / 3;
ctx.fillStyle = "rgb(120,53,15)";
ctx.beginPath();
ctx.moveTo(soilX + soilR, soilY);
ctx.lineTo(soilX + soilW - soilR, soilY);
ctx.quadraticCurveTo(soilX + soilW, soilY, soilX + soilW, soilY + soilR);
ctx.lineTo(soilX + soilW, soilY + soilH - soilR);
ctx.quadraticCurveTo(soilX + soilW, soilY + soilH, soilX + soilW - soilR, soilY + soilH);
ctx.lineTo(soilX + soilR, soilY + soilH);
ctx.quadraticCurveTo(soilX, soilY + soilH, soilX, soilY + soilH - soilR);
ctx.lineTo(soilX, soilY + soilR);
ctx.quadraticCurveTo(soilX, soilY, soilX + soilR, soilY);
ctx.closePath();
ctx.fill();

// 茎
const stemW = 10, stemH = 128;
const sx = cx - stemW/2, sy = soilY - stemH;
ctx.fillStyle = "rgb(21,128,61)";
ctx.fillRect(sx, sy, stemW, stemH);

// 叶子
function drawLeaf(cx2, cy2, lw, lh, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx2, cy2, lw/2, lh/2, 0, 0, Math.PI*2);
  ctx.fill();
}
const leafSize = 102;
drawLeaf(cx - leafSize/2, sy + stemH/3, leafSize, leafSize*0.65, "rgb(34,197,94)");
drawLeaf(cx + leafSize/2, sy + stemH/3, leafSize, leafSize*0.65, "rgb(34,197,94)");
drawLeaf(cx, sy - leafSize/5, leafSize*0.75, leafSize, "rgb(134,239,172)");

// AI脉冲点
const dotR = 6;
const dots = [[cx+64, sy-64], [cx+102, sy-32], [cx+85, sy+12]];
dots.forEach(([dx, dy], i) => {
  const alpha = 255 - i * 60;
  ctx.fillStyle = `rgba(255,255,255,${alpha/255})`;
  ctx.beginPath();
  ctx.arc(dx, dy, dotR, 0, Math.PI*2);
  ctx.fill();
});

// 导出 PNG (512x512)
const pngPath = path.join(__dirname, "assets", "icons", "icon-512x512.png");
fs.writeFileSync(pngPath, canvas.toBuffer("image/png"));
console.log("✓ icon-512x512.png");

// 导出 ICO (多尺寸)
const sizes = [256, 128, 64, 48, 32, 16];
const icons = sizes.map(s => {
  const c = createCanvas(s, s);
  c.getContext("2d").drawImage(canvas, 0, 0, s, s);
  return { width: s, height: s, data: c.toBuffer("image/png") };
});
const icoPath = path.join(__dirname, "assets", "icons", "icon-512x512.ico");
fs.writeFileSync(icoPath, icons[0].data);
console.log("✓ icon-512x512.ico");
