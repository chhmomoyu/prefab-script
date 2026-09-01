export type PrefabObject = Record<string, any> & {
    __type__: string;
};

export type IdRef = { __id__: number };

export type UuidRef = {
    __uuid__: string;
    __expectedType__?: string;
};

export type Vec2 = { __type__: "cc.Vec2"; x: number; y: number };
export type Vec3 = { __type__: "cc.Vec3"; x: number; y: number; z: number };
export type Size = { __type__: "cc.Size"; width: number; height: number };
export type Color = { __type__: "cc.Color"; r: number; g: number; b: number; a: number };
export type Quat = { __type__: "cc.Quat"; x: number; y: number; z: number; w: number };

export type ComponentName =
    | "UITransform"
    | "Sprite"
    | "Label"
    | "Button"
    | "EditBox"
    | "Widget"
    | "BlockInputEvents";

export interface CreateChildOptions {
    parent?: string;
    components?: Array<ComponentName | string>;
    position?: { x: number; y: number; z?: number };
    size?: { width: number; height: number };
}

export interface InstantiateSampleOptions {
    parent?: string;
    name?: string;
    position?: { x: number; y: number; z?: number };
}

export interface WidgetOptions {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    alignFlags?: number;
}

export interface SpriteRef {
    spriteFrame: string;
    atlas?: string;
    rawWidth?: number;
    rawHeight?: number;
}

export interface NodeDump {
    name: string;
    path: string;
    id: number;
    components: string[];
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    rotation: number;
    size?: { width: number; height: number };
    label?: string;
    spriteFrame?: string;
    children: NodeDump[];
}
