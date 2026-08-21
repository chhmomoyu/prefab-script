import * as fs from "fs";
import * as path from "path";
import { listAtlasFrames } from "./assets";
import { PrefabDoc } from "./prefab-doc";

function usage(): never {
    console.log(`Usage:
  npx ts-node src/cli.ts dump <prefab>
  npx ts-node src/cli.ts get <prefab> <nodePath>
  npx ts-node src/cli.ts atlas <common|common_bg|system_xxx|activity_xxx>
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

const [, , cmd, arg1, arg2] = process.argv;
if (!cmd || !arg1) {
    usage();
}

if (cmd === "atlas") {
    const frames = listAtlasFrames(projectRoot(), arg1);
    for (const frame of frames) {
        console.log(`${frame.name}\t${frame.uuid}`);
    }
    console.log(`# ${frames.length} frames`);
} else if (cmd === "dump") {
    console.log(PrefabDoc.load(arg1).dumpTree());
} else if (cmd === "get") {
    if (!arg2) {
        usage();
    }
    console.log(JSON.stringify(PrefabDoc.load(arg1).node(arg2).dump(), null, 2));
} else {
    usage();
}
