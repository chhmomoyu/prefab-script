---
name: prefab-script
description: >-
  用 PrefabDoc 创建或修改 Cocos Creator 3.8 预制体（禁止手写 prefab JSON）。
  有效果图时 preview --mock 对照；选图必须 cli frames 按帧识图；完成前 cli clean。
  先把 reference.example.md 填成自己的 reference.md。
  Use when creating UI prefabs, 搭预制体, 效果图转 prefab, instantiateSample, or PrefabDoc.
---

# prefab-script

用 Node 脚本写 `.prefab`。**不是** Creator 编辑器扩展。

把本文件夹拷到 `.cursor/skills/prefab-script/`（或 clone 到该路径）。然后把 [`reference.example.md`](reference.example.md) **复制成** `reference.md`，填入**你自己的**画布尺寸、模板短名、图集目录。不要把示例里的占位符原样当真实路径用。

本 Skill **只负责拼 prefab**。界面注册、业务脚本、其它 Skill 不要写进这份公开说明。

## 依赖（只装一次）

包在 `node_modules/`（不入库）。**禁止每个任务开头都 `npm install`。**

1. 先看本 Skill 目录（若库在 `lib/` 则看 `lib/`）下有没有 `node_modules`。
2. **没有才**执行下面命令；有就跳过，直接跑脚本。

```powershell
cd .cursor/skills/prefab-script
npm install
```

只在：第一次用、`package.json` 依赖变了、或有人删了 `node_modules` 时再装。

## 硬性规则

1. **禁止**直接改 `.prefab` 文本或自己排 `__id__`。必须用 `PrefabDoc`。
2. 画布、Widget、模板名单以你填好的 `reference.md` 为准。库默认根节点 **1080×1920**、四边 Widget、带 `BlockInputEvents`（`create()` / `applyRootLayout()`）。若分辨率不同，改 `src/factories.ts` 的 `ROOT_SIZE`。
3. 顶栏、弹窗、列表、Tab、常用按钮：有模板 prefab 就 `instantiateSample("短名")`，不要从零搭。模板目录改 `src/instantiate.ts` 的 `SAMPLE_DIR`。
4. 列表 / Tab 的短名只来自你的 `reference.md`，禁止瞎编。
5. 绑图用 `setSpriteFrame("图集短名", "帧名")` 或 `setSprite("散图路径")`。**写帧名之前**必须 `cli frames` 并 Read sheet。禁止靠 `text_2` 这种编号猜。
6. 用户给了效果图：每次 `save()` 后 `preview --mock`，Read `compare.png`（左效果图、右预览）再改。禁止只看 `dumpTree()` 就宣布完成。
7. 预览 / 识图产物在系统临时目录。用户要点 Keep All、或你宣布完成前，必须 `npx ts-node src/cli.ts clean`。禁止把 PNG 当工程文件留下。

## 流程

1. 没有 `reference.md` 就先从 `reference.example.md` 复制一份；画布 / 模板 / 图集未填且用户也没说时，先问再写死路径。
2. 确认输出 prefab 路径。已存在则 `load`，覆盖前先问。
3. 按 `reference.md` 选模板。
4. 写 `ts-node` 脚本。有效果图则分层搭（背景 → 顶栏/底板 → 列表/按钮），每层 preview。
5. `dumpTree()` 只查结构；视觉以 `compare.png` 为准。
6. `npx ts-node src/cli.ts clean`。

## 效果图对照

```powershell
cd .cursor/skills/prefab-script
npx ts-node src/cli.ts preview <预制体路径> --mock <效果图.png>
```

产物在 `os.tmpdir()/prefab-script-preview/`（不要进 `assets/`、不要 Keep All）：

| 文件 | 含义 |
|------|------|
| `Xxx.preview.png` | 合成预览 |
| `Xxx.compare.png` | 左效果图、右预览，**必须 Read** |
| `Xxx.layout.txt` | 画布像素框 |

Label 是色块；嵌套模板实例会展开贴图。9 宫格 / 运行时 Widget 可能和编辑器不一致。

## 按帧识图（绑图集帧前必做）

```powershell
npx ts-node src/cli.ts frames <图集短名>
```

Read `<图集>.sheet.png` 再 `setSpriteFrame`。没看 sheet 禁止写帧名。

## 脚本骨架

```ts
import * as path from "path";
import { PrefabDoc, findProjectRoot, renderPreview } from "./src";

const root = findProjectRoot(__filename);
const out = path.join(root, "assets/prefabs/ui/XxxWin.prefab"); // 改成你的路径

const doc = PrefabDoc.create("XxxWin", out);
doc.projectRoot = root;

// doc.instantiateSample("你的顶栏短名");
const bg = doc.createChild("bg", { components: ["Sprite"] });
bg.setSpriteFrame("你的图集", "你的帧名");

doc.save();
console.log(doc.dumpTree());
renderPreview(doc, { mockup: "效果图路径.png" });
```

```powershell
cd .cursor/skills/prefab-script
npx ts-node path/to/your-script.ts
npx ts-node src/cli.ts clean
```

## API

| 目的 | 调用 |
|------|------|
| 新建（已带根布局） | `PrefabDoc.create(name, path)` |
| 打开 | `PrefabDoc.load(path)` |
| 套模板 | `doc.instantiateSample("短名")` |
| 普通节点 | `doc.createChild(name, { components, position, size })` |
| 图集出图 | `node.setSpriteFrame("图集短名", "帧名")` |
| 散图 | `node.setSprite("assets/...")` |
| 绑图尺寸 | 未 `setSize` → RAW 关 Trim；`setSize` / `createChild.size` → CUSTOM |
| 透明度 | `node.setOpacity(0-255)` |
| 对照效果图 | `renderPreview(doc, { mockup })` / `cli preview --mock` |
| 按帧识图 | `cli frames <图集短名>` |
| 清临时文件 | `cli clean` |

嵌套实例上不要 `createChild`。改坐标用创建时的 `position` 或之后 `setPosition`。

图集搜索路径改 `src/assets.ts`，并写进你的 `reference.md`。
