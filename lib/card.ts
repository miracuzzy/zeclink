"use client";
import QRCode from "qrcode";
import { LOCKUP_PATHS, LOCKUP_STROKE, LOCKUP_VIEWBOX } from "./brandLockup";

// The shareable payment card: a PNG drawn on this device with <canvas>. Nothing is uploaded.
// It never shows the receiving address as text. The QR holds the ZIP-321 payment request (zcash:...),
// the same one the payment page shows, so the payer scans it with their wallet and pays.

export const CARD_W = 1080;
export const CARD_H = 1350;

const NIGHT = "#07070a";
const SURFACE = "#0b0b0f";
const GOLD = "#f4b728";
const MIST = "#e7e7ea";
const MUTED = "#9a9aa3";
const FAINT = "#6b6b74";

export interface CardInput {
  qr: string; // zcash: URI
  title?: string;
  zec?: string | null; // null / undefined = open amount
  usd?: string | null; // already formatted, like "$12.34"
  note?: string;
}

/** Font stacks from the self-hosted next/font CSS variables, so the card uses the brand fonts. */
function fontStacks() {
  const cs = getComputedStyle(document.documentElement);
  const pick = (v: string, fb: string) => (cs.getPropertyValue(v).trim() || fb) + ", " + fb;
  return {
    heading: pick("--font-grotesk", "system-ui, sans-serif"),
    body: pick("--font-inter", "system-ui, sans-serif"),
    mono: pick("--font-jbmono", "ui-monospace, monospace"),
  };
}

async function loadFonts(f: ReturnType<typeof fontStacks>) {
  if (!document.fonts?.load) return;
  await Promise.all(
    [`600 64px ${f.heading}`, `400 32px ${f.body}`, `500 32px ${f.body}`, `500 64px ${f.mono}`].map((s) => document.fonts.load(s).catch(() => [])),
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wrap to at most maxLines, adding an ellipsis if it doesn't fit. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  let i = 0;
  for (; i < words.length; i++) {
    let w = words[i];
    // Break a single overlong word (long codes, links) by characters.
    while (ctx.measureText(w).width > maxW) {
      let n = w.length - 1;
      while (n > 1 && ctx.measureText(w.slice(0, n)).width > maxW) n--;
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(w.slice(0, n));
      w = w.slice(n);
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= maxW) cur = t;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    }
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
    cur = "";
  }
  const cut = lines.length > maxLines || i < words.length || cur !== "";
  const out = lines.slice(0, maxLines);
  if (cut && out.length) {
    let last = out[out.length - 1];
    while (last && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    out[out.length - 1] = last.replace(/[\s.,;:]+$/, "") + "…";
  }
  return out;
}

function drawLockup(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  const s = height / LOCKUP_VIEWBOX.h;
  ctx.save();
  ctx.translate(x - LOCKUP_VIEWBOX.x * s, y - LOCKUP_VIEWBOX.y * s);
  ctx.scale(s, s);
  for (const p of LOCKUP_PATHS) {
    const path = new Path2D(p.d);
    if (p.stroke) {
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = LOCKUP_STROKE;
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
      ctx.stroke(path);
    }
    if (p.fill) {
      ctx.fillStyle = p.fill;
      ctx.fill(path);
    }
  }
  ctx.restore();
  return (LOCKUP_VIEWBOX.w * s) | 0;
}

/** Draw the QR module by module on whole pixels, black on white, with a 4-module quiet zone. */
function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxSize: number) {
  // Low error correction, like the payment page: fewest modules, so each one is as big as possible.
  const qr = QRCode.create(text, { errorCorrectionLevel: "L" });
  const quiet = 4;
  const n = qr.modules.size;
  const cell = Math.max(1, Math.floor(maxSize / (n + quiet * 2)));
  const size = cell * (n + quiet * 2);
  const ox = Math.round(x + (maxSize - size) / 2);
  const oy = Math.round(y + (maxSize - size) / 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(ox, oy, size, size);
  ctx.fillStyle = "#000000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    }
  }
  return { size, cell, modules: n };
}

/** Draw the card and return it as a PNG blob. */
export async function renderCard(input: CardInput): Promise<Blob> {
  const f = fontStacks();
  await loadFonts(f);
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.textBaseline = "alphabetic";

  // Background: Night, with a plain Surface panel. No gradients, per the brand rules.
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const M = 56;
  roundRect(ctx, M, M, CARD_W - M * 2, CARD_H - M * 2, 44);
  ctx.fillStyle = SURFACE;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const P = M + 56; // inner padding
  const innerW = CARD_W - P * 2;

  // Header: lockup left, "payment request" right.
  drawLockup(ctx, P, P, 60);
  ctx.font = `500 26px ${f.body}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText("Payment request", CARD_W - P, P + 42);
  ctx.textAlign = "left";

  let y = P + 60 + 72;

  // Title.
  const title = (input.title || "").trim() || "Payment request";
  let titleSize = 60;
  ctx.font = `600 ${titleSize}px ${f.heading}`;
  if (ctx.measureText(title).width > innerW) {
    titleSize = 52;
    ctx.font = `600 ${titleSize}px ${f.heading}`;
  }
  const titleLines = wrap(ctx, title, innerW, 2);
  ctx.fillStyle = "#ffffff";
  for (const line of titleLines) {
    y += titleSize;
    ctx.fillText(line, P, y);
    y += Math.round(titleSize * 0.2);
  }

  // Amount.
  y += 34;
  if (input.zec) {
    let amtSize = 76;
    const amt = input.zec;
    ctx.font = `500 ${amtSize}px ${f.mono}`;
    const unitW = () => ctx.measureText(" ZEC").width;
    while (amtSize > 44 && ctx.measureText(amt).width + unitW() > innerW * 0.72) {
      amtSize -= 4;
      ctx.font = `500 ${amtSize}px ${f.mono}`;
    }
    y += amtSize;
    ctx.fillStyle = GOLD;
    ctx.fillText(amt, P, y);
    const w = ctx.measureText(amt).width;
    ctx.font = `500 ${Math.round(amtSize * 0.5)}px ${f.mono}`;
    ctx.fillStyle = MIST;
    ctx.fillText(" ZEC", P + w + 6, y);
    if (input.usd) {
      ctx.font = `400 30px ${f.body}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = "right";
      ctx.fillText(`≈ ${input.usd}`, CARD_W - P, y - 4);
      ctx.textAlign = "left";
    }
  } else {
    y += 60;
    ctx.font = `600 60px ${f.heading}`;
    ctx.fillStyle = GOLD;
    ctx.fillText("Pay any amount", P, y);
  }

  // Note.
  const note = (input.note || "").trim();
  if (note) {
    y += 30;
    ctx.font = `400 30px ${f.body}`;
    // A two-line title leaves room for one line of note, so the QR stays big.
    const lines = wrap(ctx, note, innerW, titleLines.length > 1 ? 1 : 2);
    ctx.fillStyle = MUTED;
    for (const line of lines) {
      y += 30;
      ctx.fillText(line, P, y);
      y += 12;
    }
  }

  // QR panel takes the rest, above the footer.
  const footerTop = CARD_H - P - 70;
  const qrTop = y + 36;
  const panel = Math.min(innerW, footerTop - 28 - qrTop, 640);
  const px = Math.round((CARD_W - panel) / 2);
  roundRect(ctx, px, qrTop, panel, panel, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // The QR's own quiet zone is white, so it blends into the panel. Small inset keeps rounded corners clear.
  const inset = 8;
  drawQr(ctx, input.qr, px + inset, qrTop + inset, panel - inset * 2);

  // Footer.
  ctx.textAlign = "center";
  ctx.font = `500 30px ${f.body}`;
  ctx.fillStyle = MIST;
  ctx.fillText("Scan with your Zcash wallet", CARD_W / 2, footerTop + 30);
  ctx.font = `500 26px ${f.mono}`;
  ctx.fillStyle = FAINT;
  ctx.fillText("zeclink.vercel.app", CARD_W / 2, footerTop + 72);
  ctx.textAlign = "left";

  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not make the card"))), "image/png"));
}
