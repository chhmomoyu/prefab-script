import * as fs from "fs";
import * as path from "path";
import { ROOT_SIZE } from "./factories";
import { AssetIndex } from "./asset-index";
import { RgbaImage, sideBySide } from "./image";
import { PrefabDoc, PrefabNode } from "./prefab-doc";
import { findProjectRoot } from "./assets";
import { previewTempRoot } from "./temp-dir";

export interface PreviewOptions {
    outDir?: string;
    mockup?: string;
    out?: string;
}

export interface PreviewResult {
    previewPath: string;
    comparePath?: string;
    layoutPath: string;
    layout: string;
}

interface World {
    x: number;
    y: number;
    sx: number;
    sy: number;
}

interface LayoutRow {
    path: string;
    canvas: { x: number; y: number; w: number; h: number };
    kind: string;
    detail?: string;
}

const textureCache = new Map<string, RgbaImage>();
const frameCache = new Map<string, RgbaImage>();
const prefabCache = new Map<string, PrefabDoc>();
const indexCache = new Map<string, AssetIndex>();

export function renderPreview(doc: PrefabDoc, options: PreviewOptions = {}): PreviewResult {
    ensureProjectRoot(doc);
    const canvas = RgbaImage.create(ROOT_SIZE.width, ROOT_SIZE.height);
    const index = getIndex(doc.projectRoot);
    const rows: LayoutRow[] = [];
    const visiting = new Set<string>();

    walk(doc, doc.root, { x: 0, y: 0, sx: 1, sy: 1 }, canvas, index, rows, visiting, 1);

    const outDir = options.outDir || defaultOutDir();
    const base = path.basename(doc.filePath || doc.root.name, ".prefab");
    const previewPath = options.out || path.join(outDir, `${base}.preview.png`);
    canvas.writePng(previewPath);

    const layout = rows
        .map((r) => {
            const box = `${Math.round(r.canvas.x)},${Math.round(r.canvas.y)} ${Math.round(r.canvas.w)}x${Math.round(r.canvas.h)}`;
            return `${r.path}  [${r.kind}]  canvas=(${box})${r.detail ? `  ${r.detail}` : ""}`;
        })
        .join("\n");
    const layoutPath = path.join(path.dirname(previewPath), `${base}.layout.txt`);
    fs.mkdirSync(path.dirname(layoutPath), { recursive: true });
    fs.writeFileSync(layoutPath, layout + "\n", "utf8");

    let comparePath: string | undefined;
    if (options.mockup) {
        const mock = fitToCanvas(RgbaImage.load(options.mockup), ROOT_SIZE.width, ROOT_SIZE.height);
        const compare = sideBySide(mock, canvas);
        comparePath = path.join(path.dirname(previewPath), `${base}.compare.png`);
        compare.writePng(comparePath);
    }

    return { previewPath, comparePath, layoutPath, layout };
}

function getIndex(projectRoot: string): AssetIndex {
    const cached = indexCache.get(projectRoot);
    if (cached) {
        return cached;
    }
    const index = new AssetIndex(projectRoot);
    indexCache.set(projectRoot, index);
    return index;
}

function defaultOutDir(): string {
    return previewTempRoot();
}

function ensureProjectRoot(doc: PrefabDoc): void {
    if (fs.existsSync(path.join(doc.projectRoot, "assets"))) {
        return;
    }
    const fromLib = findProjectRoot(__dirname);
    if (fs.existsSync(path.join(fromLib, "assets"))) {
        doc.projectRoot = fromLib;
    }
}

function fitToCanvas(img: RgbaImage, width: number, height: number): RgbaImage {
    if (img.width === width && img.height === height) {
        return img;
    }
    return img.stretchTo(width, height);
}

function walk(
    doc: PrefabDoc,
    node: PrefabNode,
    parent: World,
    canvas: RgbaImage,
    index: AssetIndex,
    rows: LayoutRow[],
    visiting: Set<string>,
    opacity: number
): void {
    if (!node.active) {
        return;
    }
    const nextOpacity = opacity * nodeOpacity(node);

    if (node.isInstance) {
        const uuid = node.instancePrefabUuid();
        const samplePath = uuid ? index.prefabPath(uuid) : null;
        if (uuid && visiting.has(uuid)) {
            return;
        }
        if (samplePath) {
            const sample = loadPrefab(samplePath);
            const size = node.size || sample.root.size || { width: 0, height: 0 };
            const anchor = node.getComponent("UITransform") ? node.anchor : sample.root.anchor;
            const world = compose(parent, node.position, node.scale);
            if (uuid) {
                visiting.add(uuid);
            }
            drawVisuals(sample.root, world, size, anchor, canvas, index, rows, sample.root.path, nextOpacity);
            for (const child of sample.root.children) {
                walk(sample, child, world, canvas, index, rows, visiting, nextOpacity);
            }
            if (uuid) {
                visiting.delete(uuid);
            }
            return;
        }
    }

    const size = node.size || { width: 0, height: 0 };
    const world = compose(parent, node.position, node.scale);
    drawVisuals(node, world, size, node.anchor, canvas, index, rows, node.path, nextOpacity);
    for (const child of node.children) {
        walk(doc, child, world, canvas, index, rows, visiting, nextOpacity);
    }
}

function compose(parent: World, pos: { x: number; y: number }, scale: { x: number; y: number }): World {
    return {
        x: parent.x + pos.x * parent.sx,
        y: parent.y + pos.y * parent.sy,
        sx: parent.sx * scale.x,
        sy: parent.sy * scale.y,
    };
}

function nodeOpacity(node: PrefabNode): number {
    const uio = node.getComponent("UIOpacity");
    if (uio && typeof uio._opacity === "number") {
        return Math.max(0, Math.min(1, uio._opacity / 255));
    }
    return 1;
}

function drawVisuals(
    node: PrefabNode,
    world: World,
    size: { width: number; height: number },
    anchor: { x: number; y: number },
    canvas: RgbaImage,
    index: AssetIndex,
    rows: LayoutRow[],
    layoutPath: string,
    opacity: number
): void {
    const w = size.width * world.sx;
    const h = size.height * world.sy;
    const canvasX = ROOT_SIZE.width / 2 + world.x - w * anchor.x;
    const canvasY = ROOT_SIZE.height / 2 - world.y - h * (1 - anchor.y);

    const sprite = node.getComponent("Sprite");
    const label = node.getComponent("Label");
    const spriteUuid = sprite?._spriteFrame?.__uuid__;
    const labelText = typeof label?._string === "string" ? label._string : "";

    if (w > 0 && h > 0 && (spriteUuid || labelText)) {
        rows.push({
            path: layoutPath,
            canvas: { x: canvasX, y: canvasY, w, h },
            kind: spriteUuid ? "sprite" : "label",
            detail: labelText ? `"${labelText}"` : spriteUuid,
        });
    }

    if (spriteUuid && w > 0 && h > 0) {
        const tint = spriteColor(sprite, opacity);
        const frame = getFrameImage(index, spriteUuid);
        if (frame) {
            canvas.blit(frame, canvasX, canvasY, w, h, tint);
        } else {
            canvas.fillRect(canvasX, canvasY, w, h, { r: 255, g: 0, b: 180, a: Math.round(80 * opacity) });
        }
    }

    if (labelText && w > 0 && h > 0) {
        const c = label?._color || { r: 255, g: 255, b: 255, a: 255 };
        canvas.fillRect(canvasX, canvasY, w, h, {
            r: c.r ?? 255,
            g: c.g ?? 255,
            b: c.b ?? 255,
            a: Math.round(((c.a ?? 255) / 255) * 70 * opacity),
        });
    }
}

function spriteColor(sprite: any, opacity: number): { r: number; g: number; b: number; a: number } {
    const c = sprite?._color || { r: 255, g: 255, b: 255, a: 255 };
    return {
        r: c.r ?? 255,
        g: c.g ?? 255,
        b: c.b ?? 255,
        a: Math.round((c.a ?? 255) * opacity),
    };
}

function getFrameImage(index: AssetIndex, spriteUuid: string): RgbaImage | null {
    const cached = frameCache.get(spriteUuid);
    if (cached) {
        return cached;
    }
    const info = index.frameInfo(spriteUuid);
    if (!info) {
        return null;
    }
    let texture = textureCache.get(info.texturePath);
    if (!texture) {
        try {
            texture = RgbaImage.load(info.texturePath);
        } catch {
            return null;
        }
        textureCache.set(info.texturePath, texture);
    }
    let frame: RgbaImage;
    if (info.width > 0 && info.height > 0) {
        frame = texture.extract(info.trimX, info.trimY, info.width, info.height, info.rotated);
    } else {
        frame = texture;
    }
    frameCache.set(spriteUuid, frame);
    return frame;
}

function loadPrefab(prefabPath: string): PrefabDoc {
    const cached = prefabCache.get(prefabPath);
    if (cached) {
        return cached;
    }
    const doc = PrefabDoc.load(prefabPath);
    prefabCache.set(prefabPath, doc);
    return doc;
}
