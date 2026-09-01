import * as fs from "fs";
import * as path from "path";
import type { SpriteRef } from "./types";
import { makeUuid } from "./ids";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(@[0-9a-z]+)?$/i;

export function findProjectRoot(fromFile: string): string {
    const resolved = path.resolve(fromFile);
    const parts = resolved.split(path.sep);
    const assetsIndex = parts.lastIndexOf("assets");
    if (assetsIndex > 0) {
        return parts.slice(0, assetsIndex).join(path.sep);
    }

    let dir = path.dirname(resolved);
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, "assets")) && fs.existsSync(path.join(dir, "package.json"))) {
            return dir;
        }
        dir = path.dirname(dir);
    }
    return path.dirname(resolved);
}

export function toFsPath(input: string, projectRoot: string): string {
    let value = input.replace(/\\/g, "/");
    if (value.startsWith("db://assets/")) {
        value = value.slice("db://assets/".length);
        return path.join(projectRoot, "assets", value);
    }
    if (path.isAbsolute(input) || fs.existsSync(input)) {
        return path.resolve(input);
    }
    const underAssets = path.join(projectRoot, "assets", value);
    if (fs.existsSync(underAssets) || fs.existsSync(underAssets + ".meta")) {
        return underAssets;
    }
    const underRoot = path.join(projectRoot, value);
    if (fs.existsSync(underRoot) || fs.existsSync(underRoot + ".meta")) {
        return underRoot;
    }
    return path.resolve(input);
}

export function resolveSprite(input: string, projectRoot: string): SpriteRef {
    const trimmed = input.trim();
    if (!trimmed) {
        throw new Error("Sprite path or uuid is empty");
    }

    if (UUID_RE.test(trimmed)) {
        if (trimmed.includes("@")) {
            const [uuid, sub] = trimmed.split("@");
            // png 的 sprite-frame 一般是 @f9941；其它子资源按图集处理
            const atlas = sub && sub !== "f9941" ? uuid : undefined;
            return { spriteFrame: trimmed, atlas };
        }
        return { spriteFrame: trimmed };
    }

    const filePath = toFsPath(trimmed, projectRoot);
    const metaPath = filePath.endsWith(".meta") ? filePath : filePath + ".meta";
    if (!fs.existsSync(metaPath)) {
        throw new Error(`Cannot resolve sprite, meta not found: ${metaPath}`);
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (meta.importer === "sprite-atlas" || meta.importer === "auto-atlas") {
        throw new Error(`Pass a sprite-frame uuid (uuid@xxxx) for atlas: ${metaPath}`);
    }

    const spriteFrame = findSubMetaUuid(meta, "sprite-frame") || `${meta.uuid}@f9941`;
    const size = spriteFrameRawSize(meta, spriteFrame);
    return { spriteFrame, rawWidth: size.width, rawHeight: size.height };
}

function spriteFrameRawSize(meta: any, spriteUuid: string): { width?: number; height?: number } {
    const subMetas = meta.subMetas || {};
    for (const key of Object.keys(subMetas)) {
        const sub = subMetas[key];
        if (sub?.importer === "sprite-frame" && (sub.uuid === spriteUuid || key === "f9941")) {
            return rawSize(sub.userData);
        }
    }
    return {};
}

export interface AtlasFrame {
    name: string;
    uuid: string;
    rawWidth?: number;
    rawHeight?: number;
}

const ATLAS_HINTS: Record<string, string> = {
    common: "assets/ui3/common/common.plist.meta",
    common_bg: "assets/ui3/common/common_bg.plist.meta",
    common_text: "assets/ui3/common/common_text.plist.meta",
    common_quality: "assets/ui3/common/common_quality.plist.meta",
};

export function findAtlasMeta(projectRoot: string, hint: string): string {
    const mapped = ATLAS_HINTS[hint];
    if (mapped) {
        const p = path.join(projectRoot, mapped);
        if (fs.existsSync(p)) {
            return p;
        }
    }
    const candidates = [
        path.join(projectRoot, "assets/ui3/common", `${hint}.plist.meta`),
        path.join(projectRoot, "assets/ui3/system", `${hint}.plist.meta`),
        path.join(projectRoot, "assets/ui3/activity", `${hint}.plist.meta`),
        path.join(projectRoot, "assets/ui3/game", `${hint}.plist.meta`),
        path.join(projectRoot, "assets/ui3/other", `${hint}.plist.meta`),
        path.join(projectRoot, "assets/localization/zh-Hant-TW/system", `${hint}.plist.meta`),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    throw new Error(`Atlas meta not found for "${hint}"`);
}

export function listAtlasFrames(projectRoot: string, hint: string): AtlasFrame[] {
    const meta = JSON.parse(fs.readFileSync(findAtlasMeta(projectRoot, hint), "utf8"));
    const frames: AtlasFrame[] = [];
    const subMetas = meta.subMetas || {};
    for (const key of Object.keys(subMetas)) {
        const sub = subMetas[key];
        if (sub?.importer === "sprite-frame" && sub.uuid && sub.name) {
            frames.push({
                name: sub.name,
                uuid: sub.uuid,
                rawWidth: rawSize(sub.userData).width,
                rawHeight: rawSize(sub.userData).height,
            });
        }
    }
    return frames.sort((a, b) => a.name.localeCompare(b.name));
}

export function lookupAtlasSprite(projectRoot: string, hint: string, frameName: string): SpriteRef {
    const frames = listAtlasFrames(projectRoot, hint);
    const hit = frames.find((f) => f.name === frameName);
    if (!hit) {
        const names = frames.slice(0, 12).map((f) => f.name).join(", ");
        throw new Error(`Sprite "${frameName}" not in atlas "${hint}". Examples: ${names}`);
    }
    return {
        spriteFrame: hit.uuid,
        atlas: hit.uuid.split("@")[0],
        rawWidth: hit.rawWidth,
        rawHeight: hit.rawHeight,
    };
}

function rawSize(userData: any): { width?: number; height?: number } {
    if (!userData) {
        return {};
    }
    const width = userData.rawWidth || userData.width;
    const height = userData.rawHeight || userData.height;
    return {
        width: typeof width === "number" && width > 0 ? width : undefined,
        height: typeof height === "number" && height > 0 ? height : undefined,
    };
}

function findSubMetaUuid(meta: any, importer: string): string | undefined {
    const subMetas = meta.subMetas || {};
    for (const key of Object.keys(subMetas)) {
        const sub = subMetas[key];
        if (sub && sub.importer === importer && typeof sub.uuid === "string") {
            return sub.uuid;
        }
    }
    return undefined;
}

export function writePrefabMeta(prefabPath: string, nodeName: string): void {
    const metaPath = prefabPath + ".meta";
    if (fs.existsSync(metaPath)) {
        return;
    }
    const meta = {
        ver: "1.1.50",
        importer: "prefab",
        imported: false,
        uuid: makeUuid(),
        files: [".json"],
        subMetas: {},
        userData: {
            syncNodeName: nodeName,
        },
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
}
