"use strict";

/**
 * Creator 会扫描工程 extensions/ 下带 package.json 的目录并加载 main。
 * 本仓库是 Node 脚本库，不是编辑器扩展；这里只提供空的 load/unload，避免缺文件报错。
 */
exports.methods = {};
exports.load = function () {};
exports.unload = function () {};
