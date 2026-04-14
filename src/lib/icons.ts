// 8 slime-style icon definitions
// Each icon is drawn on canvas as a Dragon Quest-style slime with unique color + accessory

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

// Draw a Dragon Quest-style slime on a canvas context
// bounceT: 0-1 animation phase for bounce (0 = no bounce / idle)
// isMoving: whether the slime is currently moving
export function drawClaudeIcon(
  ctx: CanvasRenderingContext2D,
  icon: IconDef,
  cx: number,
  cy: number,
  size: number,
  bounceT: number = 0,
  isMoving: boolean = false,
) {
  const s = size;

  ctx.save();

  // Bounce animation: vertical offset + squash/stretch
  let bounceY = 0;
  let squashX = 1;
  let squashY = 1;
  if (isMoving) {
    // Sine wave bounce: goes up then squashes on landing
    const phase = bounceT % 1;
    bounceY = -Math.abs(Math.sin(phase * Math.PI)) * 12 * s;
    // Squash at bottom, stretch at top
    const sinVal = Math.sin(phase * Math.PI);
    if (sinVal > 0.1) {
      // In air: stretch vertically, narrow horizontally
      squashX = 1 - sinVal * 0.12;
      squashY = 1 + sinVal * 0.15;
    } else {
      // Landing: squash flat, widen
      const land = 1 - Math.abs(sinVal) / 0.1;
      squashX = 1 + land * 0.15;
      squashY = 1 - land * 0.12;
    }
  }

  // Apply bounce transform
  ctx.translate(cx, cy + bounceY);
  ctx.scale(squashX, squashY);

  // --- SLIME BODY (teardrop/onion shape) ---
  const slimeW = 24 * s;
  const slimeH = 28 * s;

  // Ground shadow (drawn at real ground level, undo bounce)
  ctx.save();
  ctx.scale(1 / squashX, 1 / squashY);
  ctx.translate(0, -bounceY);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, slimeH * 0.35, slimeW * 0.7, slimeH * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main slime body — onion/teardrop shape using bezier curves
  ctx.fillStyle = icon.bodyColor;
  ctx.beginPath();
  // Start at bottom center
  ctx.moveTo(0, slimeH * 0.3);
  // Bottom curve (wide base)
  ctx.bezierCurveTo(
    slimeW * 0.9, slimeH * 0.3,
    slimeW * 1.0, -slimeH * 0.1,
    slimeW * 0.5, -slimeH * 0.35,
  );
  // Top curve to point
  ctx.bezierCurveTo(
    slimeW * 0.2, -slimeH * 0.55,
    0, -slimeH * 0.7,
    0, -slimeH * 0.7,
  );
  // Mirror: top to right side down
  ctx.bezierCurveTo(
    0, -slimeH * 0.7,
    -slimeW * 0.2, -slimeH * 0.55,
    -slimeW * 0.5, -slimeH * 0.35,
  );
  ctx.bezierCurveTo(
    -slimeW * 1.0, -slimeH * 0.1,
    -slimeW * 0.9, slimeH * 0.3,
    0, slimeH * 0.3,
  );
  ctx.closePath();
  ctx.fill();

  // Shiny highlight on body (top-left)
  ctx.fillStyle = icon.bellyColor;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(-slimeW * 0.25, -slimeH * 0.25, slimeW * 0.35, slimeH * 0.25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bright specular highlight
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(-slimeW * 0.2, -slimeH * 0.35, slimeW * 0.12, slimeH * 0.1, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // --- FACE ---
  const faceY = -slimeH * 0.05;
  const eyeSpacing = 7 * s;

  // Eyes (big, round, DQ style)
  // White
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing, faceY, 5 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing, faceY, 5 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Iris
  ctx.fillStyle = icon.accentColor;
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing + 0.5 * s, faceY + 1 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + 0.5 * s, faceY + 1 * s, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  ctx.fillStyle = "#0a0a1a";
  ctx.beginPath();
  ctx.arc(-eyeSpacing + 0.5 * s, faceY + 1.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing + 0.5 * s, faceY + 1.5 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(-eyeSpacing + 2 * s, faceY - 1.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing + 2 * s, faceY - 1.5 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Small secondary shine
  ctx.beginPath();
  ctx.arc(-eyeSpacing - 1 * s, faceY + 2 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing - 1 * s, faceY + 2 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();

  // Mouth (happy wide smile)
  ctx.strokeStyle = "#0a0a1a";
  ctx.lineWidth = 1.8 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, faceY + 7 * s, 4 * s, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Blush
  ctx.fillStyle = "rgba(255, 100, 120, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing - 4.5 * s, faceY + 5 * s, 3.5 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing + 4.5 * s, faceY + 5 * s, 3.5 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Accessory (positioned relative to slime top)
  const topY = -slimeH * 0.7;
  drawAccessory(ctx, icon, 0, topY, slimeW * 0.5, s);

  ctx.restore();
}

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  icon: IconDef,
  cx: number,
  topY: number,
  halfW: number,
  s: number,
) {
  switch (icon.accessory) {
    case "crown":
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(cx - 8 * s, topY + 6 * s);
      ctx.lineTo(cx - 10 * s, topY - 4 * s);
      ctx.lineTo(cx - 4 * s, topY);
      ctx.lineTo(cx, topY - 6 * s);
      ctx.lineTo(cx + 4 * s, topY);
      ctx.lineTo(cx + 10 * s, topY - 4 * s);
      ctx.lineTo(cx + 8 * s, topY + 6 * s);
      ctx.closePath();
      ctx.fill();
      break;

    case "hat":
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.ellipse(cx, topY + 4 * s, 14 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 6 * s, topY - 8 * s, 12 * s, 12 * s);
      ctx.beginPath();
      ctx.arc(cx, topY - 8 * s, 6 * s, Math.PI, 0);
      ctx.fill();
      break;

    case "bowtie": {
      ctx.fillStyle = "#e84393";
      const bY = topY + halfW * 2.8;
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
    }

    case "sparkle":
      ctx.fillStyle = "#f1c40f";
      drawStar(ctx, cx + halfW * 0.8, topY + 2 * s, 3 * s, 6 * s, 4);
      ctx.fillStyle = "#f39c12";
      drawStar(ctx, cx - halfW * 1.1, topY + halfW * 0.5, 2 * s, 4 * s, 4);
      break;

    case "flower": {
      const fX = cx + halfW * 0.5;
      const fY = topY + 2 * s;
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
    }

    case "scarf": {
      const scarfY = topY + halfW * 2.5;
      ctx.fillStyle = "#e74c3c";
      ctx.beginPath();
      ctx.ellipse(cx, scarfY, halfW + 8 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.moveTo(cx + 4 * s, scarfY + 2 * s);
      ctx.quadraticCurveTo(cx + 8 * s, scarfY + 12 * s, cx + 3 * s, scarfY + 14 * s);
      ctx.quadraticCurveTo(cx + 10 * s, scarfY + 10 * s, cx + 6 * s, scarfY + 2 * s);
      ctx.fill();
      break;
    }

    case "glasses": {
      const gY = topY + halfW * 1.5;
      ctx.strokeStyle = "#2c3e50";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(cx - 5 * s, gY, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 5 * s, gY, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 1 * s, gY);
      ctx.lineTo(cx + 1 * s, gY);
      ctx.stroke();
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
}

// Maplestory Green Slime — special admin model
export function drawMapleSlime(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  bounceT: number = 0,
  isMoving: boolean = false,
) {
  const s = size;

  ctx.save();

  // Bounce
  let bounceY = 0;
  let squashX = 1;
  let squashY = 1;
  if (isMoving) {
    const phase = bounceT % 1;
    bounceY = -Math.abs(Math.sin(phase * Math.PI)) * 14 * s;
    const sinVal = Math.sin(phase * Math.PI);
    if (sinVal > 0.1) {
      squashX = 1 - sinVal * 0.15;
      squashY = 1 + sinVal * 0.18;
    } else {
      const land = 1 - Math.abs(sinVal) / 0.1;
      squashX = 1 + land * 0.18;
      squashY = 1 - land * 0.15;
    }
  }

  ctx.translate(cx, cy + bounceY);
  ctx.scale(squashX, squashY);

  const slimeW = 26 * s;
  const slimeH = 30 * s;

  // Ground shadow
  ctx.save();
  ctx.scale(1 / squashX, 1 / squashY);
  ctx.translate(0, -bounceY);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(0, slimeH * 0.35, slimeW * 0.75, slimeH * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- MAPLE SLIME BODY (rounder, more blob-like with a spout on top) ---
  // Dark green outline/base
  ctx.fillStyle = "#1a8a3a";
  ctx.beginPath();
  ctx.moveTo(0, slimeH * 0.32);
  ctx.bezierCurveTo(slimeW * 1.0, slimeH * 0.32, slimeW * 1.05, -slimeH * 0.15, slimeW * 0.45, -slimeH * 0.35);
  ctx.bezierCurveTo(slimeW * 0.2, -slimeH * 0.5, slimeW * 0.08, -slimeH * 0.62, 0, -slimeH * 0.72);
  ctx.bezierCurveTo(-slimeW * 0.08, -slimeH * 0.62, -slimeW * 0.2, -slimeH * 0.5, -slimeW * 0.45, -slimeH * 0.35);
  ctx.bezierCurveTo(-slimeW * 1.05, -slimeH * 0.15, -slimeW * 1.0, slimeH * 0.32, 0, slimeH * 0.32);
  ctx.closePath();
  ctx.fill();

  // Main body — bright green
  ctx.fillStyle = "#3ec95e";
  ctx.beginPath();
  ctx.moveTo(0, slimeH * 0.28);
  ctx.bezierCurveTo(slimeW * 0.92, slimeH * 0.28, slimeW * 0.95, -slimeH * 0.12, slimeW * 0.42, -slimeH * 0.32);
  ctx.bezierCurveTo(slimeW * 0.18, -slimeH * 0.47, slimeW * 0.07, -slimeH * 0.58, 0, -slimeH * 0.66);
  ctx.bezierCurveTo(-slimeW * 0.07, -slimeH * 0.58, -slimeW * 0.18, -slimeH * 0.47, -slimeW * 0.42, -slimeH * 0.32);
  ctx.bezierCurveTo(-slimeW * 0.95, -slimeH * 0.12, -slimeW * 0.92, slimeH * 0.28, 0, slimeH * 0.28);
  ctx.closePath();
  ctx.fill();

  // Gel highlight (big shine on left)
  ctx.fillStyle = "#7eeaa0";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(-slimeW * 0.28, -slimeH * 0.15, slimeW * 0.3, slimeH * 0.22, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Bright specular
  ctx.fillStyle = "white";
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(-slimeW * 0.22, -slimeH * 0.3, slimeW * 0.1, slimeH * 0.07, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // --- FACE (Maplestory style — simple, cute) ---
  const faceY = -slimeH * 0.02;
  const eyeSpacing = 6.5 * s;

  // Eyes — solid black ovals (maple style, no sclera)
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath();
  ctx.ellipse(-eyeSpacing, faceY, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeSpacing, faceY, 3.5 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine (single big white dot per eye — classic maple)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(-eyeSpacing + 1.5 * s, faceY - 1.5 * s, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeSpacing + 1.5 * s, faceY - 1.5 * s, 1.8 * s, 0, Math.PI * 2);
  ctx.fill();

  // Mouth — wide grin
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, faceY + 6 * s, 5 * s, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Tiny fangs (optional maple detail)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(-2 * s, faceY + 5.5 * s);
  ctx.lineTo(-1 * s, faceY + 8 * s);
  ctx.lineTo(0, faceY + 5.5 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, faceY + 5.5 * s);
  ctx.lineTo(1 * s, faceY + 8 * s);
  ctx.lineTo(2 * s, faceY + 5.5 * s);
  ctx.fill();

  // Star on forehead (Maplestory signature)
  ctx.fillStyle = "#ffd700";
  drawStar(ctx, 0, -slimeH * 0.42, 3 * s, 6 * s, 5);

  ctx.restore();
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
