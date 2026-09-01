import * as path from "path";
import { PrefabDoc } from "../src";

const clientRoot = path.resolve(__dirname, "../../..");
const out = path.join(clientRoot, "assets/prefabs/prefabScriptDemo.prefab");

const panelSprite = "b96d3fca-49a4-4108-a7b7-bf3588c57464@72a9e";
const btnSprite = "daaf2b18-9dd8-469d-80c1-dfc5f8873551@ce14b";

const doc = PrefabDoc.create("prefabScriptDemo", out);
doc.projectRoot = clientRoot;
doc.root.setSize(600, 400);

const bg = doc.createChild("bg", {
    components: ["Sprite"],
    size: { width: 560, height: 360 },
});
bg.setSprite(panelSprite);
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
okBtn.setSprite(btnSprite);
const okSprite = okBtn.getComponent("Sprite");
if (okSprite) {
    okSprite._type = 1;
    okSprite._sizeMode = 0;
}

const okLabel = okBtn.createChild("Label", {
    components: ["Label"],
    size: { width: 160, height: 40 },
});
okLabel.setLabel("确定").setLabelSize(28, 32);

doc.save();
console.log("created", out);
console.log(doc.dumpTree());
