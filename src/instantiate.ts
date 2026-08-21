import * as fs from "fs";
import * as path from "path";
import { makeFileId } from "./ids";
import type { PrefabDoc } from "./prefab-doc";
import type { InstantiateSampleOptions, PrefabObject } from "./types";

const SAMPLE_DIR = "assets/sample_UI";

export function resolveSamplePath(projectRoot: string, sampleName: string): string {
    const name = sampleName.replace(/\.prefab$/i, "");
    const direct = path.join(projectRoot, SAMPLE_DIR, `${name}.prefab`);
    if (fs.existsSync(direct)) {
        return direct;
    }
    if (fs.existsSync(sampleName)) {
        return path.resolve(sampleName);
    }
    const asRel = path.join(projectRoot, sampleName);
    if (fs.existsSync(asRel)) {
        return asRel;
    }
    throw new Error(`sample_UI prefab not found: ${name} (expected ${direct})`);
}

function readPrefabUuid(prefabPath: string): string {
    const metaPath = prefabPath + ".meta";
    if (!fs.existsSync(metaPath)) {
        throw new Error(`Missing meta: ${metaPath}`);
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (!meta.uuid) {
        throw new Error(`No uuid in ${metaPath}`);
    }
    return meta.uuid;
}

function sourceRootFileId(objects: PrefabObject[]): string {
    const rootId = objects[0]?.data?.__id__;
    const root = objects[rootId];
    const info = objects[root?._prefab?.__id__];
    if (!info || typeof info.fileId !== "string") {
        throw new Error("Sample prefab root missing PrefabInfo.fileId");
    }
    return info.fileId;
}

function sourceRootPose(objects: PrefabObject[]): { x: number; y: number; z: number } {
    const rootId = objects[0]?.data?.__id__;
    const pos = objects[rootId]?._lpos || { x: 0, y: 0, z: 0 };
    return { x: pos.x || 0, y: pos.y || 0, z: pos.z || 0 };
}

function appendOverride(
    objects: PrefabObject[],
    instance: PrefabObject,
    localId: string,
    propertyPath: string[],
    value: unknown
): void {
    const overrideId = objects.length;
    objects.push({
        __type__: "CCPropertyOverrideInfo",
        targetInfo: { __id__: overrideId + 1 },
        propertyPath,
        value,
    });
    objects.push({
        __type__: "cc.TargetInfo",
        localID: [localId],
    });
    instance.propertyOverrides.push({ __id__: overrideId });
}

function registerNestedInstanceRoot(doc: PrefabDoc, nodeId: number): void {
    const root = doc.objects[doc.rootId];
    const infoId = root?._prefab?.__id__;
    if (typeof infoId !== "number") {
        return;
    }
    const info = doc.objects[infoId];
    if (!info) {
        return;
    }
    if (!Array.isArray(info.nestedPrefabInstanceRoots)) {
        info.nestedPrefabInstanceRoots = [];
    }
    const already = info.nestedPrefabInstanceRoots.some((ref: { __id__?: number }) => ref.__id__ === nodeId);
    if (!already) {
        info.nestedPrefabInstanceRoots.unshift({ __id__: nodeId });
    }
}

export function instantiateSample(doc: PrefabDoc, parentId: number, sampleName: string, options: InstantiateSampleOptions = {}): number {
    const parent = doc.objects[parentId];
    if (!parent || parent.__type__ !== "cc.Node") {
        throw new Error(`Parent ${parentId} is not a node`);
    }
    if (!parent._children) {
        throw new Error(`Cannot instantiate under node ${parentId}: missing _children (prefab instance?)`);
    }

    const samplePath = resolveSamplePath(doc.projectRoot, sampleName);
    const uuid = readPrefabUuid(samplePath);
    const sampleObjects = JSON.parse(fs.readFileSync(samplePath, "utf8")) as PrefabObject[];
    const localId = sourceRootFileId(sampleObjects);
    const defaultPos = sourceRootPose(sampleObjects);
    const pos = options.position
        ? { x: options.position.x, y: options.position.y, z: options.position.z ?? 0 }
        : defaultPos;
    const instanceName = options.name || path.basename(samplePath, ".prefab");

    const objects = doc.objects;
    const nodeId = objects.length;
    objects.push({
        __type__: "cc.Node",
        _objFlags: 0,
        _parent: { __id__: parentId },
        _prefab: { __id__: nodeId + 1 },
        __editorExtras__: {},
    });

    const infoId = objects.length;
    objects.push({
        __type__: "cc.PrefabInfo",
        root: { __id__: nodeId },
        asset: {
            __uuid__: uuid,
            __expectedType__: "cc.Prefab",
        },
        fileId: localId,
        instance: { __id__: infoId + 1 },
        targetOverrides: null,
    });

    const instance: PrefabObject = {
        __type__: "cc.PrefabInstance",
        fileId: makeFileId(doc.usedFileIds),
        prefabRootNode: { __id__: doc.rootId },
        mountedChildren: [],
        mountedComponents: [],
        propertyOverrides: [],
        removedComponents: [],
    };
    objects.push(instance);

    appendOverride(objects, instance, localId, ["_name"], instanceName);
    appendOverride(objects, instance, localId, ["_lpos"], { __type__: "cc.Vec3", ...pos });
    appendOverride(objects, instance, localId, ["_lrot"], { __type__: "cc.Quat", x: 0, y: 0, z: 0, w: 1 });
    appendOverride(objects, instance, localId, ["_euler"], { __type__: "cc.Vec3", x: 0, y: 0, z: 0 });
    appendOverride(objects, instance, localId, ["_lscale"], { __type__: "cc.Vec3", x: 1, y: 1, z: 1 });
    appendOverride(objects, instance, localId, ["_active"], true);

    parent._children.push({ __id__: nodeId });
    registerNestedInstanceRoot(doc, nodeId);
    return nodeId;
}
