import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import * as jpeg from "jpeg-js";

export class RgbaImage {
    constructor(readonly width: number, readonly height: number, readonly data: Buffer) {}

    static create(width: number, height: number, fill: [number, number, number, number] = [32, 32, 40, 255]): RgbaImage {
        const data = Buffer.alloc(width * height * 4);
        for (let i = 0; i < data.length; i += 4) {
            data[i] = fill[0];
            data[i + 1] = fill[1];
            data[i + 2] = fill[2];
            data[i + 3] = fill[3];
        }
        return new RgbaImage(width, height, data);
    }

    static load(filePath: string): RgbaImage {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
            throw new Error(`Image not found: ${resolved}`);
        }
        const buf = fs.readFileSync(resolved);
        const ext = path.extname(resolved).toLowerCase();
        if (ext === ".jpg" || ext === ".jpeg") {
            const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
            return new RgbaImage(decoded.width, decoded.height, Buffer.from(decoded.data));
        }
        const png = PNG.sync.read(buf);
        return new RgbaImage(png.width, png.height, png.data as Buffer);
    }

    clone(): RgbaImage {
        return new RgbaImage(this.width, this.height, Buffer.from(this.data));
    }

    writePng(filePath: string): string {
        const png = new PNG({ width: this.width, height: this.height });
        this.data.copy(png.data);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, PNG.sync.write(png));
        return filePath;
    }

    extract(sx: number, sy: number, width: number, height: number, rotated = false): RgbaImage {
        const dw = width;
        const dh = height;
        const out = Buffer.alloc(dw * dh * 4);
        for (let y = 0; y < dh; y++) {
            for (let x = 0; x < dw; x++) {
                const srcX = rotated ? sx + y : sx + x;
                const srcY = rotated ? sy + (width - 1 - x) : sy + y;
                if (srcX < 0 || srcY < 0 || srcX >= this.width || srcY >= this.height) {
                    continue;
                }
                const si = (srcY * this.width + srcX) * 4;
                const di = (y * dw + x) * 4;
                out[di] = this.data[si];
                out[di + 1] = this.data[si + 1];
                out[di + 2] = this.data[si + 2];
                out[di + 3] = this.data[si + 3];
            }
        }
        return new RgbaImage(dw, dh, out);
    }

    blit(
        src: RgbaImage,
        dx: number,
        dy: number,
        dw = src.width,
        dh = src.height,
        tint?: { r: number; g: number; b: number; a: number }
    ): void {
        const tr = tint?.r ?? 255;
        const tg = tint?.g ?? 255;
        const tb = tint?.b ?? 255;
        const ta = (tint?.a ?? 255) / 255;
        if (dw <= 0 || dh <= 0) {
            return;
        }
        const x0 = Math.max(0, Math.floor(dx));
        const y0 = Math.max(0, Math.floor(dy));
        const x1 = Math.min(this.width, Math.ceil(dx + dw));
        const y1 = Math.min(this.height, Math.ceil(dy + dh));
        for (let y = y0; y < y1; y++) {
            const v = (y - dy) / dh;
            const srcY = Math.min(src.height - 1, Math.max(0, Math.floor(v * src.height)));
            for (let x = x0; x < x1; x++) {
                const u = (x - dx) / dw;
                const srcX = Math.min(src.width - 1, Math.max(0, Math.floor(u * src.width)));
                const si = (srcY * src.width + srcX) * 4;
                const sa = (src.data[si + 3] / 255) * ta;
                if (sa <= 0) {
                    continue;
                }
                const di = (y * this.width + x) * 4;
                const sr = (src.data[si] * tr) / 255;
                const sg = (src.data[si + 1] * tg) / 255;
                const sb = (src.data[si + 2] * tb) / 255;
                const inv = 1 - sa;
                this.data[di] = Math.round(sr * sa + this.data[di] * inv);
                this.data[di + 1] = Math.round(sg * sa + this.data[di + 1] * inv);
                this.data[di + 2] = Math.round(sb * sa + this.data[di + 2] * inv);
                this.data[di + 3] = Math.min(255, Math.round(sa * 255 + this.data[di + 3] * inv));
            }
        }
    }

    fillRect(x: number, y: number, w: number, h: number, color: { r: number; g: number; b: number; a: number }): void {
        const dummy = RgbaImage.create(1, 1, [color.r, color.g, color.b, color.a]);
        this.blit(dummy, x, y, w, h);
    }

    stretchTo(width: number, height: number): RgbaImage {
        const out = RgbaImage.create(width, height, [0, 0, 0, 0]);
        out.blit(this, 0, 0, width, height);
        return out;
    }
}

export function sideBySide(left: RgbaImage, right: RgbaImage, gap = 8): RgbaImage {
    const height = Math.max(left.height, right.height);
    const out = RgbaImage.create(left.width + gap + right.width, height, [12, 12, 16, 255]);
    out.blit(left, 0, 0);
    out.blit(right, left.width + gap, 0);
    return out;
}
