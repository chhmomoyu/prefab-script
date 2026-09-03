import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PrefabDoc } from "./prefab-doc";
import { ROOT_SIZE, WIDGET_ALIGN_FULL } from "./factories";
import { renderPreview } from "./preview";
import { cleanPreviewTemp, previewTempRoot } from "./temp-dir";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prefab-script-"));
const tmpPrefab = path.join(tmpDir, "MiniTest.prefab");

function main() {
    const doc = PrefabDoc.create("MiniTest", tmpPrefab);

    assert.deepStrictEqual(doc.root.size, ROOT_SIZE);
    const widget = doc.root.getComponent("Widget");
    assert.ok(widget);
    assert.strictEqual(widget._alignFlags, WIDGET_ALIGN_FULL);
    assert.strictEqual(widget._left, 0);
    assert.strictEqual(widget._right, 0);
    assert.strictEqual(widget._top, 0);
    assert.strictEqual(widget._bottom, 0);
    assert.ok(doc.root.getComponent("BlockInputEvents"));

    const frame = doc.createChild("frame", {
        components: ["Sprite"],
        position: { x: 10, y: 20 },
        size: { width: 188, height: 188 },
    });
    const frameSprite = frame.getComponent("Sprite");
    assert.ok(frameSprite);
    assert.deepStrictEqual(frame.size, { width: 188, height: 188 });

    const title = doc.createChild("title", { components: ["Label"] });
    title.setLabel("hello").setLabelSize(28).setPosition(0, 80);

    doc.save();

    const reloaded = PrefabDoc.load(tmpPrefab);
    assert.deepStrictEqual(reloaded.root.size, ROOT_SIZE);
    assert.strictEqual(reloaded.root.getComponent("Widget")?._alignFlags, WIDGET_ALIGN_FULL);
    assert.deepStrictEqual(reloaded.node("frame").position, { x: 10, y: 20, z: 0 });
    assert.strictEqual(reloaded.node("title").getComponent("Label")?._string, "hello");
    assert.ok(fs.existsSync(tmpPrefab + ".meta"));

    const tree = reloaded.dumpTree();
    assert.ok(tree.includes("frame"));
    assert.ok(tree.includes("title"));

    const preview = renderPreview(reloaded, { outDir: tmpDir });
    assert.ok(fs.existsSync(preview.previewPath));
    const pngHead = fs.readFileSync(preview.previewPath).subarray(0, 8);
    assert.deepStrictEqual(Array.from(pngHead), [137, 80, 78, 71, 13, 10, 26, 10]);

    const tempRoot = previewTempRoot();
    fs.mkdirSync(tempRoot, { recursive: true });
    fs.writeFileSync(path.join(tempRoot, "keep-all-probe.txt"), "tmp", "utf8");
    const cleaned = cleanPreviewTemp();
    assert.ok(cleaned.removed.includes(tempRoot));
    assert.ok(!fs.existsSync(tempRoot));

    console.log("self-test ok");
    console.log("tmp prefab:", tmpPrefab);
    console.log("preview:", preview.previewPath);
    console.log("--- MiniTest tree ---");
    console.log(tree);
}

main();
