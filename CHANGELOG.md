# Changelog

## 1.2.0

仓库改成标准 Cursor Skill，并修工程根探测、临时预览清理。

### Skill 包装

- 仓库根增加 `SKILL.md`、`reference.example.md`（填空后复制为不公开的 `reference.md`）
- README 按 Skill 根路径书写：`cd .cursor/skills/prefab-script` 后 `npm install` / `npx ts-node src/cli.ts`
- 去掉伪装成编辑器扩展的 `editor-main.js`

### 预览与工程根

- `preview` / `frames` 写到系统临时目录（`os.tmpdir()/prefab-script-preview/`），不进工程
- `cli clean`：Keep All / 完成前清掉临时文件，并删仓库里旧的 `.preview/`
- `findProjectRoot` 向上查找带 `assets` 的 Creator 工程，不再写死相对路径
- `tsconfig` 使用 `module` / `moduleResolution`: `Node16`

### 图集路径

- 默认不再带具体工程的图集目录。在 `ATLAS_HINTS` 里映射短名，或让库在 `assets/` 下查找 `<短名>.plist.meta`
- 自测与 demo 不再依赖某款游戏的预制体 / uuid

---

## 1.2.0 (English)

Ship as a standard Cursor Skill, and fix project-root detection plus temp previews.

- Root `SKILL.md` + `reference.example.md`; docs assume `cd .cursor/skills/prefab-script`
- Drop `editor-main.js` (not an editor extension)
- Preview/frames go to `os.tmpdir()/prefab-script-preview/`; `cli clean` before Keep All
- `findProjectRoot` walks up to a Creator `assets` folder; tsconfig uses Node16
- Atlas lookup is generic (`ATLAS_HINTS` + walk under `assets/`); demo/self-test do not need a specific game

---

## 1.1.0

对照效果图搭预制体，并修正绑图后的 Sprite 尺寸模式。

### 效果图对照

- `renderPreview(doc, { mockup })` / `cli preview --mock`：按节点贴图合成 1080×1920 预览，并可与效果图并排输出 `compare.png`
- 嵌套模板实例会展开贴图；Label 用色块占位
- 产物写在 `.preview/`，不进 `assets/`

### 按帧识图

- `cli frames <图集短名>`：从 `.plist.meta` 取帧名/uuid，从 `.plist` 的 `textureRect` 和大图裁出每一帧
- 导出单帧 PNG、编号 sheet、`legend.txt`，按图认帧，避免靠 `text_2` 这种编号猜图标

### Sprite sizeMode

- 未 `setSize`：绑图后 `sizeMode = RAW`、关闭 Trim，`contentSize` 用图原始宽高
- `setSize` / `createChild({ size })`：保持 `CUSTOM`，不改你定的宽高
- `setSpriteFrame` 会带上图集 uuid 和原始尺寸，不再只传 sprite-frame uuid

### 其它

- 新增 `pngjs` / `jpeg-js`，用于预览与图集裁切
- CLI 增加 `preview`、`frames`；`atlas` 仍只列帧名

---

## 1.1.0 (English)

Build prefabs against a mockup, and fix Sprite sizeMode after binding frames.

- **Preview**: `preview --mock` composites a 1080×1920 PNG and a side-by-side `compare.png`. Nested template instances are expanded.
- **Frame ID**: `cli frames` crops each atlas frame so icons are matched visually, not by numbered names like `text_2`.
- **sizeMode**: unbound size → RAW, Trim off, native pixel size; `setSize` / `createChild.size` stays CUSTOM. `setSpriteFrame` keeps atlas uuid and raw size.
