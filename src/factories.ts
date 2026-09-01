import type { Color, PrefabObject, Size, Vec2, Vec3 } from "./types";
import { eulerZToQuat, makeFileId } from "./ids";

const UI_2D_LAYER = 33554432;

export interface FactoryContext {
    objects: PrefabObject[];
    usedFileIds: Set<string>;
    rootNodeId: number;
}

export function append(ctx: FactoryContext, obj: PrefabObject): number {
    const id = ctx.objects.length;
    ctx.objects.push(obj);
    return id;
}

function vec2(x: number, y: number): Vec2 {
    return { __type__: "cc.Vec2", x, y };
}

function vec3(x: number, y: number, z: number): Vec3 {
    return { __type__: "cc.Vec3", x, y, z };
}

function size(width: number, height: number): Size {
    return { __type__: "cc.Size", width, height };
}

function color(r = 255, g = 255, b = 255, a = 255): Color {
    return { __type__: "cc.Color", r, g, b, a };
}

export function createPrefabAsset(name: string): PrefabObject {
    return {
        __type__: "cc.Prefab",
        _name: name,
        _objFlags: 0,
        __editorExtras__: {},
        _native: "",
        data: { __id__: 1 },
        optimizationPolicy: 0,
        persistent: false,
    };
}

export function createNodeObject(name: string, parentId: number | null): PrefabObject {
    const quat = eulerZToQuat(0);
    return {
        __type__: "cc.Node",
        _name: name,
        _objFlags: 0,
        __editorExtras__: {},
        _parent: parentId === null ? null : { __id__: parentId },
        _children: [],
        _active: true,
        _components: [],
        _prefab: null,
        _lpos: vec3(0, 0, 0),
        _lrot: { __type__: "cc.Quat", ...quat },
        _lscale: vec3(1, 1, 1),
        _mobility: 0,
        _layer: UI_2D_LAYER,
        _euler: vec3(0, 0, 0),
        _id: "",
    };
}

export function createPrefabInfo(ctx: FactoryContext): number {
    return append(ctx, {
        __type__: "cc.PrefabInfo",
        root: { __id__: ctx.rootNodeId },
        asset: { __id__: 0 },
        fileId: makeFileId(ctx.usedFileIds),
        instance: null,
        targetOverrides: null,
        nestedPrefabInstanceRoots: null,
    });
}

export function createCompPrefabInfo(ctx: FactoryContext): number {
    return append(ctx, {
        __type__: "cc.CompPrefabInfo",
        fileId: makeFileId(ctx.usedFileIds),
    });
}

export function attachPrefabInfo(ctx: FactoryContext, nodeId: number): void {
    const infoId = createPrefabInfo(ctx);
    ctx.objects[nodeId]._prefab = { __id__: infoId };
}

export function addComponentObject(ctx: FactoryContext, nodeId: number, component: PrefabObject): number {
    const compId = append(ctx, component);
    const infoId = createCompPrefabInfo(ctx);
    component.__prefab = { __id__: infoId };
    component.node = { __id__: nodeId };
    ctx.objects[nodeId]._components.push({ __id__: compId });
    return compId;
}

export function createUITransform(width = 100, height = 100): PrefabObject {
    return {
        __type__: "cc.UITransform",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        _contentSize: size(width, height),
        _anchorPoint: vec2(0.5, 0.5),
        _id: "",
    };
}

export function createSprite(): PrefabObject {
    return {
        __type__: "cc.Sprite",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        _customMaterial: null,
        _srcBlendFactor: 2,
        _dstBlendFactor: 4,
        _color: color(),
        _spriteFrame: null,
        _type: 0,
        _fillType: 0,
        _sizeMode: 1,
        _fillCenter: vec2(0, 0),
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: true,
        _useGrayscale: false,
        _atlas: null,
        _id: "",
    };
}

export function createLabel(text = ""): PrefabObject {
    return {
        __type__: "cc.Label",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        _customMaterial: null,
        _srcBlendFactor: 2,
        _dstBlendFactor: 4,
        _color: color(),
        _string: text,
        _horizontalAlign: 1,
        _verticalAlign: 1,
        _actualFontSize: 20,
        _fontSize: 20,
        _fontFamily: "Arial",
        _lineHeight: 22,
        _overflow: 0,
        _enableWrapText: true,
        _font: null,
        _isSystemFontUsed: true,
        _spacingX: 0,
        _isItalic: false,
        _isBold: false,
        _isUnderline: false,
        _underlineHeight: 2,
        _cacheMode: 0,
        _enableOutline: false,
        _outlineColor: color(0, 0, 0, 255),
        _outlineWidth: 2,
        _enableShadow: false,
        _shadowColor: color(0, 0, 0, 255),
        _shadowOffset: vec2(2, 2),
        _shadowBlur: 2,
        _id: "",
    };
}

export function createButton(nodeId: number): PrefabObject {
    return {
        __type__: "cc.Button",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: nodeId },
        _enabled: true,
        __prefab: null,
        clickEvents: [],
        _interactable: true,
        _transition: 3,
        _normalColor: color(214, 214, 214),
        _hoverColor: color(211, 211, 211),
        _pressedColor: color(255, 255, 255),
        _disabledColor: color(124, 124, 124),
        _normalSprite: null,
        _hoverSprite: null,
        _pressedSprite: null,
        _disabledSprite: null,
        _duration: 0.1,
        _zoomScale: 1.2,
        _target: { __id__: nodeId },
        _id: "",
    };
}

export function createEditBox(): PrefabObject {
    return {
        __type__: "cc.EditBox",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        editingDidBegan: [],
        textChanged: [],
        editingDidEnded: [],
        editingReturn: [],
        _textLabel: null,
        _placeholderLabel: null,
        _returnType: 0,
        _string: "",
        _tabIndex: 0,
        _backgroundImage: null,
        _inputFlag: 5,
        _inputMode: 0,
        _maxLength: 20,
        _id: "",
    };
}

/** LEFT | RIGHT | TOP | BOTTOM，四边对齐父节点 */
export const WIDGET_ALIGN_FULL = 1 + 4 + 8 + 32;

export const ROOT_SIZE = { width: 1080, height: 1920 };

/** cc.Sprite._sizeMode */
export const SPRITE_SIZE_CUSTOM = 0;
export const SPRITE_SIZE_TRIMMED = 1;
export const SPRITE_SIZE_RAW = 2;

export function createWidget(): PrefabObject {
    return {
        __type__: "cc.Widget",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        _alignFlags: 0,
        _target: null,
        _left: 0,
        _right: 0,
        _top: 0,
        _bottom: 0,
        _horizontalCenter: 0,
        _verticalCenter: 0,
        _isAbsLeft: true,
        _isAbsRight: true,
        _isAbsTop: true,
        _isAbsBottom: true,
        _isAbsHorizontalCenter: true,
        _isAbsVerticalCenter: true,
        _originalWidth: 100,
        _originalHeight: 100,
        _alignMode: 2,
        _lockFlags: 0,
        _id: "",
    };
}

export function createBlockInputEvents(): PrefabObject {
    return {
        __type__: "cc.BlockInputEvents",
        _name: "",
        _objFlags: 0,
        __editorExtras__: {},
        node: { __id__: 0 },
        _enabled: true,
        __prefab: null,
        _id: "",
    };
}

export function normalizeComponentName(name: string): string {
    const key = name.replace(/^cc\./, "").replace(/[-_\s]/g, "").toLowerCase();
    switch (key) {
        case "uitransform":
        case "uitrans":
        case "transform":
            return "UITransform";
        case "sprite":
            return "Sprite";
        case "label":
            return "Label";
        case "button":
        case "btn":
            return "Button";
        case "editbox":
        case "edit":
            return "EditBox";
        case "widget":
            return "Widget";
        case "blockinputevents":
        case "blockinput":
            return "BlockInputEvents";
        default:
            throw new Error(`Unsupported component: ${name}`);
    }
}
