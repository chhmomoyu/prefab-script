import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PrefabDoc } from "./prefab-doc";
import { ROOT_SIZE, WIDGET_ALIGN_FULL } from "./factories";
import { renderPreview } from "./preview";

const clientRoot = path.resolve(__dirname, "../../..");
const slotitem = path.join(clientRoot, "assets/prefabs/ui/common/slotitem.prefab");
const commonPng = path.join(clientRoot, "assets/ui3/common/common.png");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prefab-script-"));
const tmpPrefab = path.join(tmpDir, "MiniTest.prefab");

function main() {
    const doc = PrefabDoc.create("MiniTest", tmpPrefab);
    doc.projectRoot = clientRoot;

    assert.deepStrictEqual(doc.root.size, ROOT_SIZE);
    const widget = doc.root.getComponent("Widget");
    assert.ok(widget);
    assert.strictEqual(widget._alignFlags, WIDGET_ALIGN_FULL);
    assert.strictEqual(widget._left, 0);
    assert.strictEqual(widget._right, 0);
    assert.strictEqual(widget._top, 0);
    assert.strictEqual(widget._bottom, 0);
    assert.ok(doc.root.getComponent("BlockInputEvents"));

    const titleTop = doc.instantiateSample("title_top");
    assert.ok(titleTop.isInstance);
    assert.strictEqual(titleTop.name, "title_top");

    const frame = doc.createChild("frame", {
        components: ["Sprite"],
        position: { x: 10, y: 20 },
        size: { width: 188, height: 188 },
    });
    frame.setSprite(commonPng);
    frame.setSpriteFrame("common", "common_dec_2");
    frame.setOpacity(200);
    const frameSprite = frame.getComponent("Sprite");
    assert.strictEqual(frameSprite?._sizeMode, 0);
    assert.deepStrictEqual(frame.size, { width: 188, height: 188 });

    const badge = doc.createChild("badge", { components: ["Sprite"] });
    badge.setSpriteFrame("common", "common_dec_2");
    const badgeSprite = badge.getComponent("Sprite");
    assert.strictEqual(badgeSprite?._sizeMode, 2);
    assert.strictEqual(badgeSprite?._isTrimmedMode, false);
    assert.ok((badge.size?.width || 0) > 0);
    assert.ok((badge.size?.height || 0) > 0);
    assert.notDeepStrictEqual(badge.size, { width: 100, height: 100 });

    const title = doc.createChild("title", { components: ["Label"] });
    title.setLabel("hello").setLabelSize(28).setPosition(0, 80);

    const btn = doc.instantiateSample("button_small_1", {
        name: "okBtn",
        position: { x: 0, y: -200 },
    });
    assert.strictEqual(btn.name, "okBtn");

    doc.save();

    const reloaded = PrefabDoc.load(tmpPrefab);
    assert.deepStrictEqual(reloaded.root.size, ROOT_SIZE);
    assert.strictEqual(reloaded.root.getComponent("Widget")?._alignFlags, WIDGET_ALIGN_FULL);
    assert.ok(reloaded.node("title_top").isInstance);
    assert.strictEqual(reloaded.node("okBtn").name, "okBtn");
    assert.deepStrictEqual(reloaded.node("okBtn").position, { x: 0, y: -200, z: 0 });
    assert.deepStrictEqual(reloaded.node("frame").position, { x: 10, y: 20, z: 0 });
    assert.strictEqual(reloaded.node("title").getComponent("Label")?._string, "hello");
    assert.ok(fs.existsSync(tmpPrefab + ".meta"));

    const rootInfo = reloaded.objects[reloaded.root.raw._prefab.__id__];
    const nestedIds = (rootInfo.nestedPrefabInstanceRoots || []).map((ref: { __id__: number }) => ref.__id__);
    assert.ok(nestedIds.includes(reloaded.node("title_top").id));
    assert.ok(nestedIds.includes(reloaded.node("okBtn").id));

    const titleInfo = reloaded.objects[reloaded.node("title_top").raw._prefab.__id__];
    const inst = reloaded.objects[titleInfo.instance.__id__];
    const targetIds = inst.propertyOverrides.map((ref: { __id__: number }) => {
        return reloaded.objects[ref.__id__].targetInfo.__id__;
    });
    assert.strictEqual(new Set(targetIds).size, targetIds.length);

    const tree = reloaded.dumpTree();
    assert.ok(tree.includes("title_top"));
    assert.ok(tree.includes("[sample]"));

    const real = PrefabDoc.load(slotitem);
    assert.ok(real.dumpTree().includes("frame"));

    const preview = renderPreview(reloaded, { outDir: tmpDir });
    assert.ok(fs.existsSync(preview.previewPath));
    const pngHead = fs.readFileSync(preview.previewPath).subarray(0, 8);
    assert.deepStrictEqual(Array.from(pngHead), [137, 80, 78, 71, 13, 10, 26, 10]);

    console.log("self-test ok");
    console.log("tmp prefab:", tmpPrefab);
    console.log("preview:", preview.previewPath);
    console.log("--- MiniTest tree ---");
    console.log(tree);
}

main();
