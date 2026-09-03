import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** 预览 / 识图产物只写系统临时目录，不进工程，避免 Cursor Keep All 留下垃圾。 */
export function previewTempRoot(): string {
    return path.join(os.tmpdir(), "prefab-script-preview");
}

export function framesTempDir(hint: string): string {
    return path.join(previewTempRoot(), "frames", hint);
}

export function legacyPreviewDir(): string {
    return path.resolve(__dirname, "../.preview");
}

export function cleanPreviewTemp(): { roots: string[]; removed: string[] } {
    const roots = [previewTempRoot(), legacyPreviewDir()];
    const removed: string[] = [];
    for (const dir of roots) {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            removed.push(dir);
        }
    }
    return { roots, removed };
}
