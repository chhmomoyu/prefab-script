# 项目对照表（模板）

把本文件复制为 Skill 目录下的 `reference.md`，把所有 `你的_*` 换成自己工程里的值。

**填好后的 `reference.md` 不要公开**（里面会有你们自己的图集目录、模板名、内部工具）。公开仓库只带这份空白模板。Agent 必须读**你填好的**那份。

## 画布

- 尺寸：`你的宽` × `你的高`（库默认 1080×1920；不同则改 `ROOT_SIZE`）
- 根节点 Widget：四边拉伸，边距 0
- 是否要 BlockInputEvents：是 / 否

## 模板预制体（`instantiateSample`）

目录：`你的模板目录`（库默认 `assets/sample_UI/`）。只写短名，不要 `.prefab`。

| 短名 | 用途 |
|------|------|
| `你的顶栏` | 全屏标题 / 返回 |
| `你的弹窗` | 弹窗底板 |
| `你的竖列表` | 纵向列表 |
| `你的横列表` | 横向列表 |
| `你的网格列表` | 网格列表 |
| `你的Tab` | Tab 组 |
| `你的小按钮` | 小按钮 |

没有的行删掉。磁盘上不存在的名字不要写。

## 图集

搜索路径（同时改 `src/assets.ts`）：

- 通用图集：`你的图集目录/`
- 散图：`你的散图目录/`

`setSpriteFrame("图集短名", "帧名")` 以 `.plist.meta` 的 `subMetas[].name` 为准。  
未 `setSize` → RAW 且关 Trim；`setSize` / `createChild.size` → CUSTOM。

## 给自己团队看的（可选）

Win / CC 怎么注册、还有哪些内部 Skill、命名习惯等，只写在**不公开**的 `reference.md` 里。
