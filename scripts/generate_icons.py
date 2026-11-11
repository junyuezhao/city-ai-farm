"""
生成城市AI农场 PWA 图标
尺寸: 512x512 (主) + 192x192 / 180x180 / 152x152 / 144x144 等
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math, os, json

OUT_DIR = r"d:\Documents\city-ai-farm\assets\icons"
os.makedirs(OUT_DIR, exist_ok=True)

SIZES = [512, 384, 192, 180, 152, 144, 96, 72, 48]

# ── 颜色板 ──────────────────────────────────────────────
BG_TOP    = (22, 163, 74)    # #16a34a 深绿
BG_BOTTOM = (74, 222, 128)   # #4ade80 亮绿
RING      = (255, 255, 255, 230)
LEAF_DARK = (21, 128, 61)
LEAF_MID  = (34, 197, 94)
LEAF_LITE = (134, 239, 172)
CHIP_BG   = (255, 255, 255, 200)
CHIP_PIN  = (239, 68, 68)
CHIP_PIN2 = (251, 146, 60)
GLOW      = (74, 222, 128, 60)
WHITE     = (255, 255, 255)
SOIL      = (120, 53, 15)

def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill,
                            outline=outline, width=width)

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # ── 1. 径向渐变背景 ───────────────────────────────
    cx, cy = size // 2, size // 2
    R = size // 2
    for r in range(R, 0, -1):
        t = r / R
        col = tuple(int(BG_TOP[i] * (1 - t) + BG_BOTTOM[i] * t) for i in range(3))
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (255,))

    # ── 2. 外层装饰环 ─────────────────────────────────
    ring_w = max(2, size // 64)
    draw.ellipse([ring_w, ring_w, size - ring_w, size - ring_w],
                 outline=RING, width=ring_w)

    # ── 3. 光晕 ───────────────────────────────────────
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    glow_r = size // 3
    for g_r in range(glow_r, 0, -1):
        alpha = int(40 * (1 - g_r / glow_r))
        gd.ellipse([cx - g_r, cy - g_r, cx + g_r, cy + g_r],
                   fill=(74, 222, 128, alpha))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # ── 4. 芯片底座 ───────────────────────────────────
    pad = size // 5
    chip_pad = size // 12
    chip_xy  = [pad + chip_pad, pad + chip_pad,
                size - pad - chip_pad, size - pad - chip_pad]
    cr = max(3, size // 32)
    rounded_rect(draw, chip_xy, radius=cr,
                 fill=(255, 255, 255, 220),
                 outline=(255, 255, 255, 180), width=max(1, size // 128))

    # 芯片引脚（四边）
    pin_len = size // 16
    pin_w   = max(1, size // 80)
    left_x  = chip_xy[0]
    right_x = chip_xy[2]
    top_y   = chip_xy[1]
    bot_y   = chip_xy[3]
    for i in range(1, 5):
        ly = top_y + (bot_y - top_y) * i // 5
        ry = top_y + (bot_y - top_y) * i // 5
        draw.rectangle([left_x - pin_len, ly - pin_w//2, left_x, ly + pin_w//2],
                        fill=(200, 220, 255, 200))
        draw.rectangle([right_x, ry - pin_w//2, right_x + pin_len, ry + pin_w//2],
                        fill=(200, 220, 255, 200))
        tx = left_x + (right_x - left_x) * i // 5
        draw.rectangle([tx - pin_w//2, top_y - pin_len, tx + pin_w//2, top_y],
                        fill=(200, 220, 255, 200))
        draw.rectangle([tx - pin_w//2, bot_y, tx + pin_w//2, bot_y + pin_len],
                        fill=(200, 220, 255, 200))

    # ── 5. 中心植物图形 ────────────────────────────────
    # 土壤
    soil_h = size // 10
    soil_xy = [chip_xy[0] + size//12, chip_xy[3] - soil_h - size//20,
               chip_xy[2] - size//12, chip_xy[3] - size//20]
    draw.rounded_rectangle(soil_xy, radius=soil_h//3, fill=SOIL)

    # 茎
    stem_w = max(2, size // 48)
    stem_h = size // 4
    sx = cx - stem_w // 2
    sy = soil_xy[1] - stem_h
    draw.rectangle([sx, sy, sx + stem_w, soil_xy[1]], fill=LEAF_DARK)

    # 左叶
    leaf_size = size // 5
    left_leaf = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(left_leaf)
    lcx, lcy = cx - leaf_size // 2, sy + stem_h // 3
    ld.ellipse([lcx - leaf_size, lcy - leaf_size//2,
                lcx + leaf_size, lcy + leaf_size//2], fill=LEAF_MID)
    # 左叶裁剪成水滴形
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([lcx - leaf_size, lcy - leaf_size//2,
                lcx + leaf_size, lcy + leaf_size//2], fill=255)
    img = Image.alpha_composite(img, left_leaf)
    draw = ImageDraw.Draw(img)

    # 右叶
    right_leaf = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(right_leaf)
    rcx, rcy = cx + leaf_size // 2, sy + stem_h // 3
    rd.ellipse([rcx - leaf_size, rcy - leaf_size//2,
                rcx + leaf_size, rcy + leaf_size//2], fill=LEAF_MID)
    img = Image.alpha_composite(img, right_leaf)
    draw = ImageDraw.Draw(img)

    # 顶部小叶
    top_leaf = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    td = ImageDraw.Draw(top_leaf)
    tcx, tcy = cx, sy - leaf_size // 3
    td.ellipse([tcx - leaf_size//2, tcy - leaf_size,
                tcx + leaf_size//2, tcy + leaf_size], fill=LEAF_LITE)
    img = Image.alpha_composite(img, top_leaf)
    draw = ImageDraw.Draw(img)

    # ── 6. AI 脉冲点 ───────────────────────────────────
    dot_r = max(2, size // 40)
    # 三个小圆点表示AI信号
    dots = [
        (cx + size//8, sy - size//8),
        (cx + size//5, sy - size//16),
        (cx + size//6, sy + size//24),
    ]
    for i, (dx, dy) in enumerate(dots):
        alpha = 255 - i * 60
        draw.ellipse([dx - dot_r, dy - dot_r, dx + dot_r, dy + dot_r],
                     fill=(255, 255, 255, alpha))

    # ── 7. 轻微模糊柔化 ───────────────────────────────
    img = img.filter(ImageFilter.GaussianBlur(radius=0.3))

    return img.convert("RGBA")

# ── 生成各尺寸 ──────────────────────────────────────────
for sz in SIZES:
    icon = draw_icon(sz)
    path = os.path.join(OUT_DIR, f"icon-{sz}x{sz}.png")
    icon.save(path, "PNG")
    print(f"  ✓ {path}")

# ── favicon.ico (多尺寸合入) ───────────────────────────
ico_sizes = [(16, 16), (32, 32), (48, 48)]
ico_imgs = []
for w, h in ico_sizes:
    base = draw_icon(max(w, h))
    ico_imgs.append(base.resize((w, h), Image.LANCZOS))
fav_path = os.path.join(OUT_DIR, "favicon.ico")
ico_imgs[0].save(fav_path, format="ICO", sizes=[(s, s) for s in [16, 32, 48]])
print(f"  ✓ {fav_path}")

# ── apple-touch-icon 180x180 ───────────────────────────
apple = draw_icon(180)
apple_path = os.path.join(OUT_DIR, "apple-touch-icon.png")
apple.save(apple_path, "PNG")
print(f"  ✓ {apple_path}")

# ── 保存manifest引用信息 ───────────────────────────────
manifest_ref = {
    "icons": [
        {"src": "assets/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        {"src": "assets/icons/icon-384x384.png", "sizes": "384x384", "type": "image/png", "purpose": "any maskable"},
        {"src": "assets/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
        {"src": "assets/icons/icon-180x180.png", "sizes": "180x180", "type": "image/png", "purpose": "any"},
        {"src": "assets/icons/icon-152x152.png", "sizes": "152x152", "type": "image/png", "purpose": "any"},
        {"src": "assets/icons/icon-144x144.png", "sizes": "144x144", "type": "image/png", "purpose": "any"},
        {"src": "assets/icons/icon-96x96.png",   "sizes": "96x96",   "type": "image/png", "purpose": "any"},
        {"src": "assets/icons/icon-72x72.png",   "sizes": "72x72",   "type": "image/png", "purpose": "any"},
        {"src": "assets/icons/icon-48x48.png",   "sizes": "48x48",   "type": "image/png", "purpose": "any"},
    ]
}
ref_path = os.path.join(OUT_DIR, "manifest-icons.json")
with open(ref_path, "w", encoding="utf-8") as f:
    json.dump(manifest_ref, f, ensure_ascii=False, indent=2)
print(f"  ✓ {ref_path}")
print("\n✅ 全部图标生成完成！")
