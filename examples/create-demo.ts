import * as path from "path";
import { PrefabDoc } from "../src";

const out = path.join(__dirname, "out", "DemoWin.prefab");

const doc = PrefabDoc.create("DemoWin", out);
doc.root.setSize(600, 400);

const bg = doc.createChild("bg", {
    components: ["Sprite"],
    size: { width: 560, height: 360 },
});
const bgSprite = bg.getComponent("Sprite");
if (bgSprite) {
    bgSprite._type = 1;
    bgSprite._sizeMode = 0;
}

const title = doc.createChild("title", {
    components: ["Label"],
    position: { x: 0, y: 140 },
    size: { width: 500, height: 48 },
});
title.setLabel("Prefab Script Demo").setLabelSize(32, 40);

const okBtn = doc.createChild("okBtn", {
    components: ["Sprite", "Button"],
    position: { x: 0, y: -120 },
    size: { width: 180, height: 56 },
});
const okSprite = okBtn.getComponent("Sprite");
if (okSprite) {
    okSprite._type = 1;
    okSprite._sizeMode = 0;
}

const okLabel = okBtn.createChild("Label", {
    components: ["Label"],
    size: { width: 160, height: 40 },
});
okLabel.setLabel("OK").setLabelSize(28, 32);

doc.save();
console.log("created", out);
console.log(doc.dumpTree());
