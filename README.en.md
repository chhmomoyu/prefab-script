# prefab-script

A TypeScript library that reads and writes [Cocos Creator](https://www.cocos.com/creator) 3.8 `.prefab` files.

Built so humans or AI agents can assemble UI prefabs by writing scripts, instead of hand-editing `__id__` JSON or driving the editor.

This repo is a standard [Cursor Skill](https://cursor.com/docs): `SKILL.md` sits next to `src/`. Clone it to `.cursor/skills/prefab-script/`.

[中文](./README.md) · [Changelog](./CHANGELOG.md)

## Why

A Creator prefab is a JSON array of objects linked by `__id__`. That format is easy to break from a text editor or an LLM. This package is a thin adapter:

- You call `createChild`, `setSpriteFrame`, `instantiateSample`, `save`
- The library fills node ids, components, atlas UUIDs, and nested-instance bookkeeping
- Creator refreshes the asset like any other prefab

It is **not** an editor extension. It never talks to the scene IPC. It only writes files.

## Setup

Cocos Creator 3.8 (tested on 3.8.7), Node 18+. Copy `reference.example.md` to `reference.md` and fill in your canvas size, template names, and atlas folders. Do not publish the filled `reference.md`.

```bash
mkdir -p .cursor/skills
git clone https://github.com/chhmomoyu/prefab-script.git .cursor/skills/prefab-script
cd .cursor/skills/prefab-script
# only when node_modules is missing:
npm install
npm test
npx ts-node examples/create-demo.ts
```

The demo writes `examples/out/DemoWin.prefab` and does not need a game atlas. Point `out` at `assets/` if you want Creator to import it.

## Two ways to build

| | API | What lands in the file |
|---|-----|------------------------|
| Real nodes | `createChild` + sprite/label setters | Full Node / Sprite / Label objects |
| Nested template | `instantiateSample("title_top")` | A prefab instance pointing at an existing asset UUID |

`title_top` is a placeholder short name — use names from your `reference.md`. Do not `createChild` on an instance. `save()` registers nested roots on `nestedPrefabInstanceRoots`; skipping that can make the editor fail with `Converting circular structure to JSON`.

Templates are loaded from `assets/sample_UI/<name>.prefab` by default. Change `SAMPLE_DIR` in `src/instantiate.ts` for your project.

Root nodes default to **1080×1920** with a full-stretch Widget (`alignFlags = 45`) and `BlockInputEvents`. Override `ROOT_SIZE` or call `setSize` after `create()`.

Atlas lookup lives in `src/assets.ts` (`ATLAS_HINTS` plus a walk under `assets/`). Map short names to your `.plist.meta` files.

## Preview and frame ID

```powershell
cd .cursor/skills/prefab-script
npx ts-node src/cli.ts frames <atlas>
npx ts-node src/cli.ts preview path/to/Xxx.prefab --mock path/to/mock.png
npx ts-node src/cli.ts clean
```

`frames` writes per-frame PNGs and a numbered sheet under the system temp dir. Match icons by looking at the sheet; do not guess from names like `text_2`.

`preview --mock` writes a side-by-side `compare.png` (mockup left, composite right). Nested template instances are expanded. Run `cli clean` before Keep All / when you finish — previews are temp files, not project assets.

Binding a sprite without `setSize` uses RAW sizeMode, Trim off, and the image's raw pixel size. `setSize` / `createChild({ size })` keeps CUSTOM.

## License

MIT. See [LICENSE](./LICENSE).
