import * as fs from "fs";
import * as path from "path";

const META_RE = /\.(plist|png|jpg|jpeg|prefab|webp)\.meta$/i;

const SEARCH_DIRS = ["assets"];

export interface FrameInfo {
    texturePath: string;
    rotated: boolean;
    trimX: number;
    trimY: number;
    width: number;
    height: number;
    rawWidth: number;
    rawHeight: number;
}

interface AssetHit {
    metaPath: string;
    importer: string;
    uuid: string;
}

export class AssetIndex {
    private byUuid = new Map<string, AssetHit>();
    private built = false;

    constructor(readonly projectRoot: string) {}

    prefabPath(uuid: string): string | null {
        this.ensure();
        const hit = this.byUuid.get(uuid.split("@")[0]);
        if (!hit || hit.importer !== "prefab") {
            return null;
        }
        const prefab = hit.metaPath.replace(/\.meta$/i, "");
        return fs.existsSync(prefab) ? prefab : null;
    }

    frameInfo(spriteUuid: string): FrameInfo | null {
        this.ensure();
        const base = spriteUuid.split("@")[0];
        const hit = this.byUuid.get(base);
        if (!hit) {
            return null;
        }
        const meta = JSON.parse(fs.readFileSync(hit.metaPath, "utf8"));
        const sub = findSubMeta(meta, spriteUuid);
        const texturePath = resolveTexturePath(hit.metaPath, hit.importer);
        if (!texturePath) {
            return null;
        }
        if (sub?.importer === "sprite-frame" && sub.userData) {
            const u = sub.userData;
            return {
                texturePath,
                rotated: !!u.rotated,
                trimX: u.trimX || 0,
                trimY: u.trimY || 0,
                width: u.width || u.rawWidth || 0,
                height: u.height || u.rawHeight || 0,
                rawWidth: u.rawWidth || u.width || 0,
                rawHeight: u.rawHeight || u.height || 0,
            };
        }
        if (hit.importer === "sprite-atlas" || hit.importer === "auto-atlas") {
            return null;
        }
        return {
            texturePath,
            rotated: false,
            trimX: 0,
            trimY: 0,
            width: 0,
            height: 0,
            rawWidth: 0,
            rawHeight: 0,
        };
    }

    private ensure(): void {
        if (this.built) {
            return;
        }
        this.built = true;
        for (const rel of SEARCH_DIRS) {
            const dir = path.join(this.projectRoot, rel);
            if (fs.existsSync(dir)) {
                this.walk(dir);
            }
        }
    }

    private walk(dir: string): void {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                this.walk(full);
            } else if (ent.isFile() && META_RE.test(ent.name)) {
                this.indexMeta(full);
            }
        }
    }

    private indexMeta(metaPath: string): void {
        const peek = peekMetaHeader(metaPath);
        if (!peek) {
            return;
        }
        this.byUuid.set(peek.uuid, {
            metaPath,
            importer: peek.importer,
            uuid: peek.uuid,
        });
    }
}

function peekMetaHeader(metaPath: string): { uuid: string; importer: string } | null {
    let text: string;
    try {
        const fd = fs.openSync(metaPath, "r");
        try {
            const buf = Buffer.alloc(2048);
            const n = fs.readSync(fd, buf, 0, buf.length, 0);
            text = buf.toString("utf8", 0, n);
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
    const uuid = text.match(/"uuid"\s*:\s*"([^"]+)"/);
    const importer = text.match(/"importer"\s*:\s*"([^"]+)"/);
    if (!uuid) {
        return null;
    }
    return { uuid: uuid[1], importer: importer?.[1] || "" };
}

function findSubMeta(meta: any, spriteUuid: string): any | null {
    const subMetas = meta.subMetas || {};
    for (const key of Object.keys(subMetas)) {
        const sub = subMetas[key];
        if (sub?.uuid === spriteUuid) {
            return sub;
        }
    }
    if (spriteUuid.includes("@")) {
        const suffix = spriteUuid.split("@")[1];
        if (subMetas[suffix]) {
            return subMetas[suffix];
        }
    }
    return null;
}

function resolveTexturePath(metaPath: string, importer: string): string | null {
    const assetPath = metaPath.replace(/\.meta$/i, "");
    if (importer === "sprite-atlas" || importer === "auto-atlas") {
        const base = assetPath.replace(/\.plist$/i, "");
        for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
            const p = base + ext;
            if (fs.existsSync(p)) {
                return p;
            }
        }
        return null;
    }
    return fs.existsSync(assetPath) ? assetPath : null;
}
