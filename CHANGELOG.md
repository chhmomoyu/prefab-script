# Changelog

## 1.1.0

对照效果图搭预制体，并修正绑图后的 Sprite 尺寸模式。

### 效果图对照

- `renderPreview(doc, { mockup })` / `cli preview --mock`：按节点贴图合成 1080×1920 预览，并可与效果图并排输出 `compare.png`
- 嵌套 `sample_UI` 实例会展开贴图；Label 用色块占位
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

- **Preview**: `preview --mock` composites a 1080×1920 PNG and a side-by-side `compare.png`. Nested `sample_UI` instances are expanded.
- **Frame ID**: `cli frames` crops each atlas frame so icons are matched visually, not by numbered names like `text_2`.
- **sizeMode**: unbound size → RAW, Trim off, native pixel size; `setSize` / `createChild.size` stays CUSTOM. `setSpriteFrame` keeps atlas uuid and raw size.
