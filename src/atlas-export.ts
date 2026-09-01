import * as fs from "fs";
import * as path from "path";
import { findAtlasMeta, listAtlasFrames } from "./assets";
import { RgbaImage } from "./image";

export interface ExportedFrame {
    index: number;
    name: string;
    uuid: string;
    file: string;
    packed: { x: number; y: number; w: number; h: number; rotated: boolean };
}

export interface FramesExportResult {
    dir: string;
    sheet: string;
    legend: string;
    frames: ExportedFrame[];
}

interface PackedRect {
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotated: boolean;
}

const CELL = 120;
const COLS = 4;
const PAD = 8;
const LABEL_H = 18;

export function exportAtlasFrames(projectRoot: string, hint: string, outDir?: string): FramesExportResult {
    const metaPath = findAtlasMeta(projectRoot, hint);
    const plistPath = metaPath.replace(/\.meta$/i, "");
    const atlasPng = resolveAtlasPng(plistPath);
    const texture = RgbaImage.load(atlasPng);
    const packed = parsePlistRects(plistPath);
    const listed = listAtlasFrames(projectRoot, hint);
    const dir = outDir || path.resolve(__dirname, "../.preview/frames", hint);
    fs.mkdirSync(dir, { recursive: true });

    const frames: ExportedFrame[] = [];
    for (let i = 0; i < listed.length; i++) {
        const item = listed[i];
        const rect = packed.get(item.name) || packed.get(`${item.name}.png`);
        if (!rect) {
            continue;
        }
        const crop = texture.extract(rect.x, rect.y, rect.w, rect.h, false);
        const file = path.join(dir, `${item.name}.png`);
        crop.writePng(file);
        frames.push({
            index: i + 1,
            name: item.name,
            uuid: item.uuid,
            file,
            packed: { x: rect.x, y: rect.y, w: rect.w, h: rect.h, rotated: rect.rotated },
        });
    }

    const sheet = writeSheet(dir, hint, frames);
    const legendLines = [
        `# ${hint}  ${frames.length} frames`,
        `# atlas: ${atlasPng}`,
        `# sheet: ${sheet}`,
        "",
        ...frames.map((f) => {
            const rot = f.packed.rotated ? "  rotated" : "";
            return `${String(f.index).padStart(2, "0")}\t${f.name}\t${f.packed.w}x${f.packed.h}${rot}\t${f.file}`;
        }),
    ];
    const legend = path.join(dir, "legend.txt");
    fs.writeFileSync(legend, legendLines.join("\n") + "\n", "utf8");
    return { dir, sheet, legend, frames };
}

function resolveAtlasPng(plistPath: string): string {
    const base = plistPath.replace(/\.plist$/i, "");
    for (const ext of [".png", ".jpg", ".jpeg"]) {
        const p = base + ext;
        if (fs.existsSync(p)) {
            return p;
        }
    }
    throw new Error(`Atlas texture not found next to ${plistPath}`);
}

function parsePlistRects(plistPath: string): Map<string, PackedRect> {
    const map = new Map<string, PackedRect>();
    if (!fs.existsSync(plistPath)) {
        return map;
    }
    const xml = fs.readFileSync(plistPath, "utf8");
    const blockRe = /<key>([^<]+\.png)<\/key>\s*<dict>([\s\S]*?)<\/dict>/g;
    let match: RegExpExecArray | null;
    while ((match = blockRe.exec(xml))) {
        const rawName = match[1].replace(/\.png$/i, "");
        const body = match[2];
        const rect = body.match(/<key>textureRect<\/key>\s*<string>\{\{(\d+),(\d+)\},\{(\d+),(\d+)\}\}<\/string>/);
        if (!rect) {
            continue;
        }
        const rotated = /<key>textureRotated<\/key>\s*<true\s*\/>/.test(body);
        map.set(rawName, {
            name: rawName,
            x: Number(rect[1]),
            y: Number(rect[2]),
            w: Number(rect[3]),
            h: Number(rect[4]),
            rotated,
        });
    }
    return map;
}

function writeSheet(dir: string, hint: string, frames: ExportedFrame[]): string {
    const cols = Math.min(COLS, Math.max(1, frames.length));
    const rows = Math.ceil(frames.length / cols);
    const cellW = CELL + PAD;
    const cellH = CELL + LABEL_H + PAD;
    const sheet = RgbaImage.create(cols * cellW + PAD, rows * cellH + PAD, [18, 18, 24, 255]);
    for (let i = 0; i < frames.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = PAD + col * cellW;
        const y = PAD + row * cellH;
        sheet.fillRect(x, y, CELL, CELL, { r: 40, g: 40, b: 48, a: 255 });
        const img = RgbaImage.load(frames[i].file);
        const fit = Math.min(CELL - 8, CELL - 8);
        const scale = Math.min(fit / img.width, fit / img.height, 1);
        const dw = Math.max(1, Math.round(img.width * scale));
        const dh = Math.max(1, Math.round(img.height * scale));
        sheet.blit(img, x + Math.floor((CELL - dw) / 2), y + Math.floor((CELL - dh) / 2), dw, dh);
        drawIndex(sheet, x + 4, y + 4, frames[i].index);
    }
    const out = path.join(dir, `${hint}.sheet.png`);
    sheet.writePng(out);
    return out;
}

const DIGITS: Record<string, string[]> = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "001", "001", "001"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
};

function drawIndex(img: RgbaImage, x: number, y: number, n: number): void {
    const text = String(n).padStart(2, "0");
    img.fillRect(x - 2, y - 2, text.length * 8 + 4, 14, { r: 0, g: 0, b: 0, a: 180 });
    let cx = x;
    for (const ch of text) {
        const glyph = DIGITS[ch];
        if (!glyph) {
            continue;
        }
        for (let gy = 0; gy < glyph.length; gy++) {
            for (let gx = 0; gx < glyph[gy].length; gx++) {
                if (glyph[gy][gx] === "1") {
                    img.fillRect(cx + gx * 2, y + gy * 2, 2, 2, { r: 255, g: 220, b: 80, a: 255 });
                }
            }
        }
        cx += 8;
    }
}
