// 8 Claude-like icon definitions
// Each icon is drawn on canvas as a blob character with unique color + accessory

export interface IconDef {
  name: string;
  bodyColor: string;
  bellyColor: string;
  accentColor: string;
  accessory: "none" | "hat" | "bowtie" | "sparkle" | "flower" | "crown" | "scarf" | "glasses";
}

export const ICONS: IconDef[] = [
  {
    name: "Tangerine",
    bodyColor: "#d9773c",
    bellyColor: "#f0c89a",
    accentColor: "#b85d28",
    accessory: "none",
  },
  {
    name: "Grape",
    bodyColor: "#9b59b6",
    bellyColor: "#d7b4e8",
    accentColor: "#7d3c98",
    accessory: "sparkle",
  },
  {
    name: "Ocean",
    bodyColor: "#3498db",
    bellyColor: "#a9d4f5",
    accentColor: "#2176ae",
    accessory: "glasses",
  },
  {
    name: "Mint",
    bodyColor: "#2ecc71",
    bellyColor: "#a3e4be",
    accentColor: "#1fa855",
    accessory: "flower",
  },
  {
    name: "Sakura",
    bodyColor: "#e84393",
    bellyColor: "#f5b7d0",
    accentColor: "#c0277a",
    accessory: "bowtie",
  },
  {
    name: "Royal",
    bodyColor: "#f1c40f",
    bellyColor: "#f9e577",
    accentColor: "#d4a80a",
    accessory: "crown",
  },
  {
    name: "Ember",
    bodyColor: "#e74c3c",
    bellyColor: "#f1a39a",
    accentColor: "#c0392b",
    accessory: "scarf",
  },
  {
    name: "Arctic",
    bodyColor: "#00cec9",
    bellyColor: "#a0ece9",
    accentColor: "#00a8a5",
    accessory: "hat",
  },
];

// Draw a Claude icon on a canvas context
export function drawClaudeIcon(
  ctx: CanvasRenderingContext2D,
  icon: IconDef,
  cx: number,
  cy: number,
  size: number, // base size 1 = normal
) {
  const s = size;
  const bodyW = 22 * s;
  const bodyH = 20 * s;
  const headR = 22 * s;

  ctx.save();

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyH * 0.7, bodyW * 0.9, bodyH * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (small chibi body)
  ctx.fillStyle = icon.bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2 * s, bodyW, bodyH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Belly highlight
  ctx.fillStyle = icon.bellyColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4 * s, bodyW * 0.55, bodyH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tiny feet
  const footY = cy + bodyH * 0.8;
  ctx.fillStyle = icon.accentColor;
  ctx.beginPath();
  ctx.ellipse(cx - bodyW * 0.4, footY, 6 * s, 4 * s, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + bodyW * 0.4, footY, 6 * s, 4 * s, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Arms (tiny nubs)
  ctx.fillStyle = icon.bodyColor;
  ctx.beginPath();
  ctx.ellipse(cx - bodyW * 0.95, cy, 7 * s, 5 * s, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + bodyW * 0.95, cy, 7 * s, 5 * s, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Head (huge anime head)
  const headY = cy - bodyH * 0.7;
  ctx.fillStyle = icon.bodyColor;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Hair highlight (anime sheen on head)
  ctx.fillStyle = icon.bellyColor;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.3, headY - headR * 0.5, headR * 0.5, headR * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // --- ANIME EYES ---
  const eyeY = headY + 2 * s;
  const eyeSpacing = 8 * s;
  const eyeW = 6 * s;
  const eyeH = 7.5 * s;

  // White sclera (tall ovals)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx - eyeSpacing, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + eyeSpacing, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris (colored, large)
  ctx.fillStyle = icon.accentColor;
  ctx.beginPath();
  ctx.ellipse(cx - eyeSpacing + 0.5 * s, eyeY + 1 * s, eyeW * 0.75, eyeH * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + eyeSpacing + 0.5 * s, eyeY + 1 * s, eyeW * 0.75, eyeH * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil (dark center)
  ctx.fillStyle = "#0a0a1a";
  ctx.beginPath();
  ctx.arc(cx - eyeSpacing + 0.5 * s, eyeY + 1.5 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpacing + 0.5 * s, eyeY + 1.5 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();

  // Big anime eye shine (main highlight, top-right)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx - eyeSpacing + 2.5 * s, eyeY - 2 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpacing + 2.5 * s, eyeY - 2 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Secondary small shine (bottom-left)
  ctx.beginPath();
  ctx.arc(cx - eyeSpacing - 1.5 * s, eyeY + 2 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpacing - 1.5 * s, eyeY + 2 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Tiny third sparkle
  ctx.beginPath();
  ctx.arc(cx - eyeSpacing + 1 * s, eyeY + 3 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + eyeSpacing + 1 * s, eyeY + 3 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.fill();

  // Upper eyelid line (anime style thick top)
  ctx.strokeStyle = "#0a0a1a";
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(cx - eyeSpacing, eyeY, eyeW, eyeH, 0, Math.PI + 0.4, -0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + eyeSpacing, eyeY, eyeW, eyeH, 0, Math.PI + 0.4, -0.4);
  ctx.stroke();

  // Blush (anime style — three small lines or oval)
  ctx.fillStyle = "rgba(255, 100, 120, 0.4)";
  ctx.beginPath();
  ctx.ellipse(cx - eyeSpacing - 5 * s, eyeY + 6 * s, 4.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + eyeSpacing + 5 * s, eyeY + 6 * s, 4.5 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Blush lines
  ctx.strokeStyle = "rgba(255, 100, 120, 0.3)";
  ctx.lineWidth = 1 * s;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - eyeSpacing - 5 * s + i * 2.5 * s, eyeY + 5 * s);
    ctx.lineTo(cx - eyeSpacing - 5 * s + i * 2.5 * s, eyeY + 7 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + eyeSpacing + 5 * s + i * 2.5 * s, eyeY + 5 * s);
    ctx.lineTo(cx + eyeSpacing + 5 * s + i * 2.5 * s, eyeY + 7 * s);
    ctx.stroke();
  }

  // Mouth (small cat-like :3 mouth)
  ctx.strokeStyle = "#0a0a1a";
  ctx.lineWidth = 1.5 * s;
  ctx.lineCap = "round";
  // Left curve
  ctx.beginPath();
  ctx.arc(cx - 2 * s, eyeY + 8 * s, 2.5 * s, -0.3, Math.PI * 0.7);
  ctx.stroke();
  // Right curve
  ctx.beginPath();
  ctx.arc(cx + 2 * s, eyeY + 8 * s, 2.5 * s, Math.PI * 0.3, Math.PI + 0.3);
  ctx.stroke();

  // Accessory
  drawAccessory(ctx, icon, cx, headY, headR, s);

  ctx.restore();
}

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  icon: IconDef,
  cx: number,
  headY: number,
  headR: number,
  s: number,
) {
  switch (icon.accessory) {
    case "crown":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(cx - 8 * s, headY - headR + 2 * s);
      ctx.lineTo(cx - 10 * s, headY - headR - 8 * s);
      ctx.lineTo(cx - 4 * s, headY - headR - 4 * s);
      ctx.lineTo(cx, headY - headR - 10 * s);
      ctx.lineTo(cx + 4 * s, headY - headR - 4 * s);
      ctx.lineTo(cx + 10 * s, headY - headR - 8 * s);
      ctx.lineTo(cx + 8 * s, headY - headR + 2 * s);
      ctx.closePath();
      ctx.fill();
      break;

    case "hat":
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR + 2 * s, 16 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 7 * s, headY - headR - 10 * s, 14 * s, 12 * s);
      ctx.beginPath();
      ctx.arc(cx, headY - headR - 10 * s, 7 * s, Math.PI, 0);
      ctx.fill();
      break;

    case "bowtie":
      ctx.fillStyle = "#e84393";
      const bY = headY + headR - 2 * s;
      ctx.beginPath();
      ctx.moveTo(cx, bY);
      ctx.lineTo(cx - 7 * s, bY - 4 * s);
      ctx.lineTo(cx - 7 * s, bY + 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, bY);
      ctx.lineTo(cx + 7 * s, bY - 4 * s);
      ctx.lineTo(cx + 7 * s, bY + 4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c0277a";
      ctx.beginPath();
      ctx.arc(cx, bY, 2 * s, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "sparkle":
      ctx.fillStyle = "#f1c40f";
      const spX = cx + headR * 0.7;
      const spY = headY - headR * 0.7;
      drawStar(ctx, spX, spY, 3 * s, 6 * s, 4);
      ctx.fillStyle = "#f39c12";
      drawStar(ctx, cx - headR * 0.9, headY - headR * 0.3, 2 * s, 4 * s, 4);
      break;

    case "flower":
      const fX = cx + headR * 0.5;
      const fY = headY - headR * 0.8;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        ctx.fillStyle = "#ff9ff3";
        ctx.beginPath();
        ctx.arc(fX + Math.cos(angle) * 4 * s, fY + Math.sin(angle) * 4 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#feca57";
      ctx.beginPath();
      ctx.arc(fX, fY, 2.5 * s, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "scarf":
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.ellipse(cx, headY + headR - 1 * s, headR + 4 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Scarf tail
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.moveTo(cx + headR * 0.3, headY + headR + 2 * s);
      ctx.quadraticCurveTo(cx + headR * 0.6, headY + headR + 12 * s, cx + headR * 0.2, headY + headR + 14 * s);
      ctx.quadraticCurveTo(cx + headR * 0.8, headY + headR + 10 * s, cx + headR * 0.5, headY + headR + 2 * s);
      ctx.fill();
      break;

    case "glasses":
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 1.5 * s;
      const gY = headY - 1 * s;
      // Left lens
      ctx.beginPath();
      ctx.arc(cx - 5 * s, gY, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
      // Right lens
      ctx.beginPath();
      ctx.arc(cx + 5 * s, gY, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(cx - 1 * s, gY);
      ctx.lineTo(cx + 1 * s, gY);
      ctx.stroke();
      // Temple arms
      ctx.beginPath();
      ctx.moveTo(cx - 9 * s, gY);
      ctx.lineTo(cx - 12 * s, gY - 2 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 9 * s, gY);
      ctx.lineTo(cx + 12 * s, gY - 2 * s);
      ctx.stroke();
      break;
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  points: number,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
