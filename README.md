# prefab-script

用 TypeScript 脚本读写 [Cocos Creator](https://www.cocos.com/creator) 3.8 的 `.prefab` 文件。

适合把这件事交给 AI 或自己写构建脚本：**不要手改 prefab JSON，也不要让模型直连编辑器拖节点。**

本仓库是一份标准 [Cursor Skill](https://cursor.com/docs)：根目录有 `SKILL.md`，和 `src/` 同级。拷到 `.cursor/skills/prefab-script/` 即可。

[English](./README.en.md) · [更新说明](./CHANGELOG.md)

## 它解决什么问题

Creator 的 `.prefab` 是一份带 `__id__` 交叉引用的 JSON。人可以在编辑器里拖；程序或大模型去改这份 JSON，很容易把引用写坏（嵌套预制体展开失败、节点被挂到 Scene 上、保存时报循环引用等）。

思路是加一层转接：

- 你（或 AI）只写「建节点、贴图、套现成模板、保存」
- 库负责编号、组件、图集 uuid、嵌套实例格式
- `save()` 写出标准 `.prefab` + `.meta`
- Creator 刷新后打开，和手拖出来的资源一样
- 有效果图时：`preview --mock` 合成预览图，左效果图右预览，边搭边对

它**不是**编辑器扩展，不启动 Creator，不走场景 IPC。就是 Node 脚本 + 文件。

```
写脚本  →  PrefabDoc 内存模型  →  写出 .prefab  →  preview --mock 对照  →  改坐标再跑  →  Creator 打开
```

## 接到 Cursor

```bash
# 拷到当前游戏工程
mkdir -p .cursor/skills
git clone https://github.com/chhmomoyu/prefab-script.git .cursor/skills/prefab-script
```

把 [`reference.example.md`](./reference.example.md) **复制成** `reference.md`，填入你自己的画布尺寸、模板短名、图集目录。填好的 `reference.md` 。

## 环境

- Cocos Creator **3.8**（在 3.8.7 上验证）
- Node.js 18+
- `npm install` **只在 `node_modules` 缺失时做一次**；之后直接 `npx ts-node`。不要每次任务都装。

```bash
cd .cursor/skills/prefab-script
# 仅当 node_modules 不存在时：
npm install
npm test
```

## 快速开始

完整可运行示例：[`examples/create-demo.ts`](./examples/create-demo.ts)

```powershell
cd .cursor/skills/prefab-script
# 仅当 node_modules 不存在时：npm install
npx ts-node examples/create-demo.ts
```

会生成 `examples/out/DemoWin.prefab`（不依赖业务图集）。把脚本里的 `out` 改到工程 `assets/` 下，Creator 刷新后即可打开。

贴图、套顶栏等写法见下文 API；`instantiateSample` 需要你自己的模板目录（默认 `assets/sample_UI/`）。

## 两种搭法

| 方式 | API | 文件里实际有什么 |
|------|-----|------------------|
| 真的造节点 | `createChild` + `setSprite` / `setLabel` | 这份 prefab 里完整的 Node / Sprite / Label |
| 套现成模板 | `instantiateSample("title_top")` | 只写嵌套实例：指向已有 prefab 的 uuid，打开时由 Creator 展开 |

第二种**不会复制**模板里的子节点。像 Word 插入页眉：文档里存引用，打开时再展开。因此：

- 不要对实例再 `createChild`（没有可写的 `_children`）
- 改坐标用创建时传入 `position`，或之后 `setPosition`（走属性覆盖）
- `save()` 会把所有嵌套实例登记到根节点的 `nestedPrefabInstanceRoots`。缺这一项时，编辑器展开失败，可能出现 `Converting circular structure to JSON`

模板默认从工程的 `assets/sample_UI/<名字>.prefab` 读取。没有这个目录就把自己的常用弹窗、顶栏、按钮做成预制体放进去，或改 `src/instantiate.ts` 里的路径。`title_top` 只是虚构短名，换成你 `reference.md` 里的名字。

## API 摘要

### PrefabDoc

| 方法 | 作用 |
|------|------|
| `create(name, path)` | 新建。根节点默认 **1080×1920**，Widget 四边距 0（`alignFlags = 45`），带 BlockInputEvents |
| `load(path)` | 打开已有 prefab |
| `createChild(name, options)` | 在根（或 `options.parent`）下建子节点 |
| `instantiateSample(name, options)` | 嵌套实例化模板目录里的 prefab |
| `applyRootLayout()` | 给旧文件补根布局 |
| `dumpTree()` | 打印节点树，便于自检 |
| `save()` | 写 `.prefab`；没有 `.meta` 时补一份 |

`renderPreview(doc, { mockup })` 会按节点贴图合成 1080×1920 PNG，并可与效果图并排。见下文「对照效果图」。

### PrefabNode

| 方法 | 作用 |
|------|------|
| `setPosition` / `setSize` / `setScale` / `setAnchor` | 变换与尺寸 |
| `setSprite(path 或 uuid)` | 散图：读对应 `.meta` 的 sprite-frame。未 `setSize` 时 sizeMode=RAW、关 Trim |
| `setSpriteFrame(图集名, 帧名)` | 从图集 `.plist.meta` 查帧。尺寸规则同上；`setSize` / `createChild.size` 保持 CUSTOM |
| `setOpacity` | Sprite 透明度 0–255 |
| `setLabel` / `setLabelSize` | 文本 |
| `setWidget` | Widget 边距 |
| `addComponent` / `getComponent` | 组件 |

支持的组件：`UITransform`、`Sprite`、`Label`、`Button`、`EditBox`、`Widget`、`BlockInputEvents`。

## 查图集

```powershell
cd .cursor/skills/prefab-script
npx ts-node src/cli.ts atlas <图集短名>
npx ts-node src/cli.ts frames <图集短名>
npx ts-node src/cli.ts dump path/to/Xxx.prefab
npx ts-node src/cli.ts get  path/to/Xxx.prefab 节点名
npx ts-node src/cli.ts preview path/to/Xxx.prefab --mock path/to/mock.png
npx ts-node src/cli.ts clean
```

`atlas` 只列出帧名。选图标必须先 `frames`，看临时目录里的 `<图集>.sheet.png` 按图认帧，不要靠 `text_2` 这种编号猜。

`preview` / `frames` 写到系统临时目录（`os.tmpdir()/prefab-script-preview/`），**不要进工程、不要 Keep All**。对照结束后执行 `cli clean`（会同时清掉仓库里旧的 `.preview/`）。

- `Xxx.preview.png`：合成预览
- `Xxx.compare.png`：左效果图、右预览（加了 `--mock` 才有）
- `Xxx.layout.txt`：画布像素框

脚本里：`import { renderPreview } from "./src"` 后 `renderPreview(doc, { mockup })`。嵌套模板实例会展开贴图；Label 用色块占位。每加一层节点就对照一次，不要一次写完整窗再盲调。

`setSpriteFrame("图集短名", "帧名")` 会在 `src/assets.ts` 的 `ATLAS_HINTS` 和 `assets/` 下查找 `.plist.meta`。**换成你工程的图集目录**。帧名以 meta 里 `subMetas[].name` 为准。

## 接到你自己的工程

1. 根画布默认 1080×1920：改 `factories.ts` 的 `ROOT_SIZE`，或 `create()` 之后 `setSize`
2. 模板目录：改 `instantiate.ts` 的 `SAMPLE_DIR`（默认 `assets/sample_UI/`）
3. 图集短名映射：改 `assets.ts` 的 `ATLAS_HINTS`
4. 写出路径落在 `assets/` 下时会自动识别工程根；否则设 `doc.projectRoot`

## 硬性规则

1. 不要手改 `.prefab` 文本，不要自己排 `__id__`。
2. 只追加对象，保存时不要重排已有 `__id__`（`load` 后再改也遵守这一点）。
3. 嵌套实例上不要 `createChild`。
4. 生成后先 `preview --mock` 看 `compare.png`，再在 Creator 里打开。`dumpTree()` 只能检查结构和尺寸，看不出贴图对不对。
5. 预览图是临时文件。完成或 Keep All 前跑 `cli clean`。

## 局限

- 不覆盖 ScrollView、Layout、Mask、自定义脚本组件等。需要的话可对 `getComponent` 拿到的对象改字段，或扩展 `factories.ts`。
- 预览不是 Creator 真渲染：9 宫格、运行时 Widget 拉伸、字体都和编辑器有差别，最终仍以编辑器为准。
- 不能替代编辑器做视觉微调、动画、预制体关联。
- 给 AI 用时，先填好 `reference.md`（画布尺寸、模板清单、图集目录），否则模型仍会猜帧名。

## 目录

```
.cursor/skills/prefab-script/
  SKILL.md
  reference.example.md
  src/prefab-doc.ts    # 对外 API
  src/factories.ts     # 节点 / 组件 JSON
  src/instantiate.ts   # 嵌套预制体
  src/assets.ts        # 图集与 .meta
  src/atlas-export.ts  # cli frames 裁帧
  src/preview.ts       # 合成预览 / 对照效果图
  src/cli.ts           # dump / atlas / frames / preview / clean
  examples/create-demo.ts
```

## 许可

MIT。见 [LICENSE](./LICENSE)。
