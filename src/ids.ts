import { randomBytes, randomUUID } from "crypto";

const FILE_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function makeUuid(): string {
    return randomUUID();
}

export function makeFileId(used: Set<string>): string {
    for (let i = 0; i < 32; i++) {
        const bytes = randomBytes(16);
        let id = "";
        for (let j = 0; j < 22; j++) {
            id += FILE_ID_CHARS[bytes[j % bytes.length] % FILE_ID_CHARS.length];
        }
        if (!used.has(id)) {
            used.add(id);
            return id;
        }
    }
    throw new Error("Failed to allocate unique prefab fileId");
}

export function collectFileIds(objects: Array<{ __type__: string; fileId?: string }>): Set<string> {
    const used = new Set<string>();
    for (const obj of objects) {
        if (typeof obj.fileId === "string") {
            used.add(obj.fileId);
        }
    }
    return used;
}

export function eulerZToQuat(zDeg: number): { x: number; y: number; z: number; w: number } {
    const half = (zDeg * Math.PI) / 360;
    return { x: 0, y: 0, z: Math.sin(half), w: Math.cos(half) };
}

export function quatToEulerZ(q: { x: number; y: number; z: number; w: number } | undefined, eulerZ?: number): number {
    if (typeof eulerZ === "number") {
        return eulerZ;
    }
    if (!q) {
        return 0;
    }
    return (Math.atan2(2 * q.w * q.z, 1 - 2 * q.z * q.z) * 180) / Math.PI;
}
