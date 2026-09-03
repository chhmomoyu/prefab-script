import * as fs from "fs";
import * as path from "path";
import { findProjectRoot, lookupAtlasSprite, resolveSprite, writePrefabMeta } from "./assets";
import { AssetIndex } from "./asset-index";
import {
    addComponentObject,
    attachPrefabInfo,
    createBlockInputEvents,
    createButton,
    createEditBox,
    createLabel,
    createNodeObject,
    createPrefabAsset,
    createSprite,
    createUITransform,
    createWidget,
    normalizeComponentName,
    ROOT_SIZE,
    SPRITE_SIZE_CUSTOM,
    SPRITE_SIZE_RAW,
    WIDGET_ALIGN_FULL,
    type FactoryContext,
} from "./factories";
import { collectFileIds, eulerZToQuat, quatToEulerZ } from "./ids";
import { instantiateSample as instantiateSampleImpl } from "./instantiate";
import type { CreateChildOptions, InstantiateSampleOptions, NodeDump, PrefabObject, SpriteRef, WidgetOptions } from "./types";

export class PrefabDoc {
    objects: PrefabObject[];
    filePath: string | null;
    projectRoot: string;
    usedFileIds: Set<string>;
    private _assetIndex: AssetIndex | null = null;
    private explicitSizeIds = new Set<number>();

    private constructor(objects: PrefabObject[], filePath: string | null, projectRoot: string) {
        this.objects = objects;
        this.filePath = filePath;
        this.projectRoot = projectRoot;
        this.usedFileIds = collectFileIds(objects);
    }

    assetIndex(): AssetIndex {
        if (!this._assetIndex || this._assetIndex.projectRoot !== this.projectRoot) {
            this._assetIndex = new AssetIndex(this.projectRoot);
        }
        return this._assetIndex;
    }

    markExplicitSize(nodeId: number): void {
        this.explicitSizeIds.add(nodeId);
    }

    hasExplicitSize(nodeId: number): boolean {
        return this.explicitSizeIds.has(nodeId);
    }

    static load(filePath: string): PrefabDoc {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
            throw new Error(`Prefab not found: ${resolved}`);
        }
        const objects = JSON.parse(fs.readFileSync(resolved, "utf8")) as PrefabObject[];
        if (!Array.isArray(objects) || objects[0]?.__type__ !== "cc.Prefab") {
            throw new Error(`Not a Cocos prefab JSON array: ${resolved}`);
        }
        return new PrefabDoc(objects, resolved, findProjectRoot(resolved));
    }

    static create(name: string, filePath?: string): PrefabDoc {
        const objects: PrefabObject[] = [];
        const usedFileIds = new Set<string>();
        objects.push(createPrefabAsset(name));
        const ctx: FactoryContext = { objects, usedFileIds, rootNodeId: 1 };
        const nodeId = objects.length;
        objects.push(createNodeObject(name, null));
        addComponentObject(ctx, nodeId, createUITransform(ROOT_SIZE.width, ROOT_SIZE.height));
        attachPrefabInfo(ctx, nodeId);
        const resolved = filePath ? path.resolve(filePath) : null;
        const projectRoot = resolved ? findProjectRoot(resolved) : process.cwd();
        const doc = new PrefabDoc(objects, resolved, projectRoot);
        doc.applyRootLayout();
        return doc;
    }

    get rootId(): number {
        const id = this.objects[0]?.data?.__id__;
        if (typeof id !== "number") {
            throw new Error("Prefab asset missing data.__id__");
        }
        return id;
    }

    get root(): PrefabNode {
        return new PrefabNode(this, this.rootId);
    }

    ctx(): FactoryContext {
        return {
            objects: this.objects,
            usedFileIds: this.usedFileIds,
            rootNodeId: this.rootId,
        };
    }

    node(pathOrName: string): PrefabNode {
        const matches = this.find(pathOrName);
        if (matches.length === 0) {
            throw new Error(`Node not found: ${pathOrName}`);
        }
        if (matches.length > 1) {
            const paths = matches.map((n) => n.path).join(", ");
            throw new Error(`Node name is not unique: ${pathOrName}. Use a full path. Candidates: ${paths}`);
        }
        return matches[0];
    }

    find(pathOrName: string): PrefabNode[] {
        const keyword = pathOrName.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
        if (!keyword) {
            return [this.root];
        }
        const all = this.collectNodes();
        const exactPath = all.filter((n) => n.path === keyword || n.path === `${this.root.name}/${keyword}`);
        if (exactPath.length > 0) {
            return exactPath;
        }
        if (keyword.includes("/")) {
            return all.filter((n) => n.path.endsWith("/" + keyword) || n.path === keyword);
        }
        return all.filter((n) => n.name === keyword);
    }

    collectNodes(): PrefabNode[] {
        const list: PrefabNode[] = [];
        const walk = (node: PrefabNode) => {
            list.push(node);
            for (const child of node.children) {
                walk(child);
            }
        };
        walk(this.root);
        return list;
    }

    dumpTree(): string {
        const lines: string[] = [];
        const walk = (node: PrefabNode, indent: string) => {
            lines.push(indent + node.summary());
            for (const child of node.children) {
                walk(child, indent + "  ");
            }
        };
        walk(this.root, "");
        return lines.join("\n");
    }

    createChild(name: string, options: CreateChildOptions = {}): PrefabNode {
        const parent = options.parent ? this.node(options.parent) : this.root;
        return parent.createChild(name, options);
    }

    applyRootLayout(): this {
        this.root.applyRootLayout();
        return this;
    }

    instantiateSample(sampleName: string, options: InstantiateSampleOptions = {}): PrefabNode {
        const parent = options.parent ? this.node(options.parent) : this.root;
        return parent.instantiateSample(sampleName, options);
    }

    lookupSprite(atlasHint: string, frameName: string) {
        return lookupAtlasSprite(this.projectRoot, atlasHint, frameName);
    }

    syncNestedInstanceRoots(): this {
        const roots: Array<{ __id__: number }> = [];
        const walk = (nodeId: number) => {
            const node = this.objects[nodeId];
            if (!node || node.__type__ !== "cc.Node") {
                return;
            }
            const info = typeof node._prefab?.__id__ === "number" ? this.objects[node._prefab.__id__] : null;
            if (info?.instance) {
                roots.push({ __id__: nodeId });
            }
            for (const child of node._children || []) {
                if (typeof child?.__id__ === "number") {
                    walk(child.__id__);
                }
            }
        };
        walk(this.rootId);
        const root = this.objects[this.rootId];
        const infoId = root?._prefab?.__id__;
        if (typeof infoId === "number" && this.objects[infoId]) {
            this.objects[infoId].nestedPrefabInstanceRoots = roots.length > 0 ? roots.reverse() : null;
        }
        return this;
    }

    save(filePath?: string): string {
        const target = filePath ? path.resolve(filePath) : this.filePath;
        if (!target) {
            throw new Error("No file path. Pass save(path) or create/load with a path.");
        }
        this.syncNestedInstanceRoots();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, JSON.stringify(this.objects, null, 2) + "\n", "utf8");
        this.filePath = target;
        const detected = findProjectRoot(target);
        if (fs.existsSync(path.join(detected, "assets"))) {
            this.projectRoot = detected;
        }
        writePrefabMeta(target, this.root.name);
        return target;
    }
}

export class PrefabNode {
    constructor(readonly doc: PrefabDoc, readonly id: number) {}

    get raw(): PrefabObject {
        const obj = this.doc.objects[this.id];
        if (!obj || obj.__type__ !== "cc.Node") {
            throw new Error(`Object ${this.id} is not a cc.Node`);
        }
        return obj;
    }

    get name(): string {
        if (typeof this.raw._name === "string" && this.raw._name.length > 0) {
            return this.raw._name;
        }
        const overridden = this.instanceOverride("_name");
        if (typeof overridden === "string") {
            return overridden;
        }
        return `node#${this.id}`;
    }

    get isInstance(): boolean {
        const info = this.prefabInfo;
        return !!(info && info.instance);
    }

    get path(): string {
        const names: string[] = [];
        let current: PrefabNode | null = this;
        while (current) {
            names.push(current.name);
            current = current.parent;
        }
        return names.reverse().join("/");
    }

    get parent(): PrefabNode | null {
        const parent = this.raw._parent;
        if (!parent || typeof parent.__id__ !== "number") {
            return null;
        }
        return new PrefabNode(this.doc, parent.__id__);
    }

    get children(): PrefabNode[] {
        const list = (this.raw._children || []) as Array<{ __id__: number }>;
        return list.map((ref) => new PrefabNode(this.doc, ref.__id__));
    }

    componentIds(): number[] {
        return ((this.raw._components || []) as Array<{ __id__: number }>).map((ref) => ref.__id__);
    }

    componentTypes(): string[] {
        return this.componentIds()
            .map((id) => this.doc.objects[id]?.__type__)
            .filter((type): type is string => !!type)
            .map((type) => type.replace(/^cc\./, ""));
    }

    getComponent(type: string): PrefabObject | null {
        const expected = type.startsWith("cc.") ? type : `cc.${type}`;
        for (const id of this.componentIds()) {
            const obj = this.doc.objects[id];
            if (obj?.__type__ === expected) {
                return obj;
            }
        }
        return null;
    }

    ensureComponent(type: string): PrefabObject {
        const normalized = normalizeComponentName(type);
        const existing = this.getComponent(normalized);
        if (existing) {
            return existing;
        }
        if (normalized !== "UITransform" && !this.getComponent("UITransform")) {
            addComponentObject(this.doc.ctx(), this.id, createUITransform());
        }
        const factory = this.makeComponent(normalized);
        addComponentObject(this.doc.ctx(), this.id, factory);
        const created = this.getComponent(normalized);
        if (!created) {
            throw new Error(`Failed to add component ${normalized}`);
        }
        return created;
    }

    addComponent(type: string): PrefabObject {
        return this.ensureComponent(type);
    }

    createChild(name: string, options: CreateChildOptions = {}): PrefabNode {
        if (!this.raw._children) {
            throw new Error(`Cannot createChild on prefab instance ${this.name}`);
        }
        const ctx = this.doc.ctx();
        const nodeId = ctx.objects.length;
        ctx.objects.push(createNodeObject(name, this.id));
        const child = new PrefabNode(this.doc, nodeId);
        this.raw._children.push({ __id__: nodeId });

        const components = (options.components || []).map(normalizeComponentName);
        if (!components.includes("UITransform")) {
            components.unshift("UITransform");
        }
        for (const comp of components) {
            child.ensureComponent(comp);
        }
        attachPrefabInfo(ctx, nodeId);

        if (options.position) {
            child.setPosition(options.position.x, options.position.y, options.position.z);
        }
        if (options.size) {
            child.setSize(options.size.width, options.size.height);
        }
        return child;
    }

    instantiateSample(sampleName: string, options: InstantiateSampleOptions = {}): PrefabNode {
        const nodeId = instantiateSampleImpl(this.doc, this.id, sampleName, options);
        return new PrefabNode(this.doc, nodeId);
    }

    applyRootLayout(): this {
        this.setSize(ROOT_SIZE.width, ROOT_SIZE.height);
        this.setWidget({
            alignFlags: WIDGET_ALIGN_FULL,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
        });
        this.ensureComponent("BlockInputEvents");
        return this;
    }

    setWidget(options: WidgetOptions = {}): this {
        const widget = this.ensureComponent("Widget");
        widget._alignFlags = options.alignFlags ?? WIDGET_ALIGN_FULL;
        widget._left = options.left ?? 0;
        widget._right = options.right ?? 0;
        widget._top = options.top ?? 0;
        widget._bottom = options.bottom ?? 0;
        widget._originalWidth = ROOT_SIZE.width;
        widget._originalHeight = ROOT_SIZE.height;
        return this;
    }

    setPosition(x: number, y: number, z = 0): this {
        const value = { __type__: "cc.Vec3", x, y, z };
        if (this.isInstance) {
            this.writeInstanceOverride("_lpos", value);
            return this;
        }
        this.raw._lpos = value;
        return this;
    }

    setScale(x: number, y: number, z = 1): this {
        const value = { __type__: "cc.Vec3", x, y, z };
        if (this.isInstance) {
            this.writeInstanceOverride("_lscale", value);
            return this;
        }
        this.raw._lscale = value;
        return this;
    }

    setRotation(zDeg: number): this {
        const quat = eulerZToQuat(zDeg);
        this.raw._euler = { __type__: "cc.Vec3", x: 0, y: 0, z: zDeg };
        this.raw._lrot = { __type__: "cc.Quat", ...quat };
        return this;
    }

    setActive(active: boolean): this {
        this.raw._active = active;
        return this;
    }

    setSize(width: number, height: number): this {
        this.doc.markExplicitSize(this.id);
        const sprite = this.getComponent("Sprite");
        if (sprite) {
            sprite._sizeMode = SPRITE_SIZE_CUSTOM;
        }
        return this.writeContentSize(width, height);
    }

    private writeContentSize(width: number, height: number): this {
        const uit = this.ensureComponent("UITransform");
        uit._contentSize = { __type__: "cc.Size", width, height };
        return this;
    }

    setAnchor(x: number, y: number): this {
        const uit = this.ensureComponent("UITransform");
        uit._anchorPoint = { __type__: "cc.Vec2", x, y };
        return this;
    }

    setSprite(uuidOrPath: string): this {
        return this.applySprite(resolveSprite(uuidOrPath, this.doc.projectRoot));
    }

    setSpriteFrame(atlasHint: string, frameName: string): this {
        return this.applySprite(lookupAtlasSprite(this.doc.projectRoot, atlasHint, frameName));
    }

    /**
     * 绑图：未显式 setSize 的节点用 RAW + 关 Trim，contentSize 跟图原始宽高。
     * 已 CUSTOM（setSize / createChild.size）的保持节点尺寸。
     */
    applySprite(ref: SpriteRef): this {
        const sprite = this.ensureComponent("Sprite");
        const filled = this.fillSpriteRawSize(ref);
        sprite._spriteFrame = {
            __uuid__: filled.spriteFrame,
            __expectedType__: "cc.SpriteFrame",
        };
        sprite._atlas = filled.atlas
            ? { __uuid__: filled.atlas, __expectedType__: "cc.SpriteAtlas" }
            : null;
        const keepCustom = this.doc.hasExplicitSize(this.id) || sprite._sizeMode === SPRITE_SIZE_CUSTOM;
        if (keepCustom) {
            sprite._sizeMode = SPRITE_SIZE_CUSTOM;
            return this;
        }
        sprite._sizeMode = SPRITE_SIZE_RAW;
        sprite._isTrimmedMode = false;
        if (filled.rawWidth && filled.rawHeight) {
            this.writeContentSize(filled.rawWidth, filled.rawHeight);
        }
        return this;
    }

    private fillSpriteRawSize(ref: SpriteRef): SpriteRef {
        if (ref.rawWidth && ref.rawHeight) {
            return ref;
        }
        const info = this.doc.assetIndex().frameInfo(ref.spriteFrame);
        if (!info?.rawWidth || !info?.rawHeight) {
            return ref;
        }
        return {
            ...ref,
            atlas: ref.atlas,
            rawWidth: info.rawWidth,
            rawHeight: info.rawHeight,
        };
    }

    setOpacity(alpha: number): this {
        const sprite = this.getComponent("Sprite");
        if (sprite) {
            if (!sprite._color) {
                sprite._color = { __type__: "cc.Color", r: 255, g: 255, b: 255, a: alpha };
            } else {
                sprite._color.a = alpha;
            }
        }
        return this;
    }

    setLabel(text: string): this {
        const label = this.ensureComponent("Label");
        label._string = text;
        return this;
    }

    setLabelSize(fontSize: number, lineHeight?: number): this {
        const label = this.ensureComponent("Label");
        label._fontSize = fontSize;
        label._actualFontSize = fontSize;
        label._lineHeight = lineHeight ?? fontSize + 2;
        return this;
    }

    get position(): { x: number; y: number; z: number } {
        const overridden = this.instanceOverride("_lpos") as { x?: number; y?: number; z?: number } | undefined;
        const p = overridden || this.raw._lpos || { x: 0, y: 0, z: 0 };
        return { x: p.x || 0, y: p.y || 0, z: p.z || 0 };
    }

    get scale(): { x: number; y: number; z: number } {
        const overridden = this.instanceOverride("_lscale") as { x?: number; y?: number; z?: number } | undefined;
        const s = overridden || this.raw._lscale || { x: 1, y: 1, z: 1 };
        return { x: s.x ?? 1, y: s.y ?? 1, z: s.z ?? 1 };
    }

    get anchor(): { x: number; y: number } {
        const uit = this.getComponent("UITransform");
        const a = uit?._anchorPoint;
        return { x: a?.x ?? 0.5, y: a?.y ?? 0.5 };
    }

    get active(): boolean {
        const overridden = this.instanceOverride("_active");
        if (typeof overridden === "boolean") {
            return overridden;
        }
        return this.raw._active !== false;
    }

    instancePrefabUuid(): string | null {
        if (!this.isInstance) {
            return null;
        }
        const uuid = this.prefabInfo?.asset?.__uuid__;
        return typeof uuid === "string" ? uuid : null;
    }

    get rotation(): number {
        return quatToEulerZ(this.raw._lrot, this.raw._euler?.z);
    }

    get size(): { width: number; height: number } | undefined {
        const uit = this.getComponent("UITransform");
        if (!uit?._contentSize) {
            return undefined;
        }
        return { width: uit._contentSize.width, height: uit._contentSize.height };
    }

    dump(): NodeDump {
        const sprite = this.getComponent("Sprite");
        const label = this.getComponent("Label");
        return {
            name: this.name,
            path: this.path,
            id: this.id,
            components: this.componentTypes(),
            position: this.position,
            scale: this.scale,
            rotation: this.rotation,
            size: this.size,
            label: label?._string,
            spriteFrame: sprite?._spriteFrame?.__uuid__,
            children: this.children.map((child) => child.dump()),
        };
    }

    summary(): string {
        const bits = [`[${this.componentTypes().join(", ") || "-"}]`];
        const pos = this.position;
        bits.push(`pos=(${pos.x}, ${pos.y})`);
        if (this.size) {
            bits.push(`size=${this.size.width}x${this.size.height}`);
        }
        const label = this.getComponent("Label")?._string;
        if (typeof label === "string" && label.length > 0) {
            bits.push(`"${label}"`);
        }
        const sprite = this.getComponent("Sprite")?._spriteFrame?.__uuid__;
        if (sprite) {
            bits.push(`sprite=${sprite}`);
        }
        if (this.isInstance) {
            bits.unshift("[sample]");
        }
        return `${this.name}  ${bits.join("  ")}`;
    }

    private get prefabInfo(): PrefabObject | null {
        const id = this.raw._prefab?.__id__;
        return typeof id === "number" ? this.doc.objects[id] : null;
    }

    private instanceOverride(propertyPath: string): unknown {
        const info = this.prefabInfo;
        const instId = info?.instance?.__id__;
        if (typeof instId !== "number") {
            return undefined;
        }
        const instance = this.doc.objects[instId];
        const refs = (instance?.propertyOverrides || []) as Array<{ __id__: number }>;
        for (const ref of refs) {
            const item = this.doc.objects[ref.__id__];
            if (item?.propertyPath?.[0] === propertyPath) {
                return item.value;
            }
        }
        return undefined;
    }

    private writeInstanceOverride(propertyPath: string, value: unknown): void {
        const info = this.prefabInfo;
        const instId = info?.instance?.__id__;
        if (typeof instId !== "number") {
            return;
        }
        const instance = this.doc.objects[instId];
        const refs = (instance?.propertyOverrides || []) as Array<{ __id__: number }>;
        for (const ref of refs) {
            const item = this.doc.objects[ref.__id__];
            if (item?.propertyPath?.[0] === propertyPath) {
                item.value = value;
                return;
            }
        }
        throw new Error(`No instance override for ${propertyPath} on ${this.name}`);
    }

    private makeComponent(type: string): PrefabObject {
        switch (type) {
            case "UITransform":
                return createUITransform();
            case "Sprite":
                return createSprite();
            case "Label":
                return createLabel();
            case "Button":
                return createButton(this.id);
            case "EditBox":
                return createEditBox();
            case "Widget":
                return createWidget();
            case "BlockInputEvents":
                return createBlockInputEvents();
            default:
                throw new Error(`Unsupported component: ${type}`);
        }
    }
}
