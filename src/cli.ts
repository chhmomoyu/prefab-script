import * as fs from "fs";
import * as path from "path";
import { listAtlasFrames } from "./assets";
import { exportAtlasFrames } from "./atlas-export";
import { PrefabDoc } from "./prefab-doc";
import { renderPreview } from "./preview";

function usage(): never {
    console.log(`Usage:
  npx ts-node src/cli.ts dump <prefab>
  npx ts-node src/cli.ts get <prefab> <nodePath>
  npx ts-node src/cli.ts atlas <common|common_bg|system_xxx|activity_xxx>
  npx ts-node src/cli.ts frames <图集短名>
  npx ts-node src/cli.ts preview <prefab> [--mock 效果图.png] [--out out.png]
`);
    process.exit(1);
}

function projectRoot(): string {
    const fromLib = path.resolve(__dirname, "../../..");
    if (fs.existsSync(path.join(fromLib, "assets/ui3"))) {
        return fromLib;
    }
    return process.cwd();
}

function parseFlags(argv: string[]): { rest: string[]; mock?: string; out?: string } {
    const rest: string[] = [];
    let mock: string | undefined;
    let out: string | undefined;
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--mock" || a === "--out") {
            const val = argv[i + 1];
            if (!val) {
                usage();
            }
            if (a === "--mock") {
                mock = path.resolve(val);
            } else {
                out = path.resolve(val);
            }
            i++;
        } else {
            rest.push(a);
        }
    }
    return { rest, mock, out };
}

const args = process.argv.slice(2);
const { rest, mock, out } = parseFlags(args);
const cmd = rest[0];
const arg1 = rest[1];
const arg2 = rest[2];

if (!cmd || !arg1) {
    usage();
}

if (cmd === "atlas") {
    const frames = listAtlasFrames(projectRoot(), arg1);
    for (const frame of frames) {
        console.log(`${frame.name}\t${frame.uuid}`);
    }
    console.log(`# ${frames.length} frames`);
} else if (cmd === "frames") {
    const result = exportAtlasFrames(projectRoot(), arg1);
    console.log(fs.readFileSync(result.legend, "utf8"));
    console.log(`sheet: ${result.sheet}`);
} else if (cmd === "dump") {
    console.log(PrefabDoc.load(arg1).dumpTree());
} else if (cmd === "get") {
    if (!arg2) {
        usage();
    }
    console.log(JSON.stringify(PrefabDoc.load(arg1).node(arg2).dump(), null, 2));
} else if (cmd === "preview") {
    const doc = PrefabDoc.load(path.resolve(arg1));
    const result = renderPreview(doc, { mockup: mock, out });
    console.log(result.layout);
    console.log(`preview: ${result.previewPath}`);
    if (result.comparePath) {
        console.log(`compare: ${result.comparePath}`);
    }
    console.log(`layout: ${result.layoutPath}`);
} else {
    usage();
}
