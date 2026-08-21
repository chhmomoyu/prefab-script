/**
 * 最小示例：造一个 1080×1920 界面（标题 + 按钮），不依赖业务图集。
 *
 *   npx ts-node examples/create-demo.ts
 *
 * 默认写到 examples/out/DemoWin.prefab。要让 Creator 导入，把 `out` 改到工程的 assets/ 下。
 * 若工程里有 sample_UI（顶栏、按钮等），取消下面 instantiateSample 的注释即可套模板。
 */
import * as path from "path";
import { PrefabDoc } from "../src";

const libRoot = path.resolve(__dirname, "..");
const out = path.join(libRoot, "examples/out/DemoWin.prefab");

const doc = PrefabDoc.create("DemoWin", out);

const title = doc.createChild("title", {
    components: ["Label"],
    position: { x: 0, y: 240 },
    size: { width: 720, height: 72 },
});
title.setLabel("Hello Prefab Script").setLabelSize(44, 52);

const okBtn = doc.createChild("okBtn", {
    components: ["Button"],
    position: { x: 0, y: -40 },
    size: { width: 280, height: 80 },
});
const okLabel = okBtn.createChild("Label", {
    components: ["Label"],
    size: { width: 240, height: 48 },
});
okLabel.setLabel("OK").setLabelSize(32, 36);

const hint = doc.createChild("hint", {
    components: ["Label"],
    position: { x: 0, y: -160 },
    size: { width: 800, height: 48 },
});
hint.setLabel("Change `out` to assets/... so Creator can import it.").setLabelSize(22, 28);

// doc.instantiateSample("title_top");
// doc.instantiateSample("button_small_1", { name: "btnClose", position: { x: -430, y: 850 } });

doc.save();
console.log("created", out);
console.log(doc.dumpTree());
