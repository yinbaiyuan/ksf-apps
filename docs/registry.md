# 应用源分发规范

索引以 UTF-8 JSON 发布，大小不超过 2 MiB，最多 500 个版本与平台条目。顶层 `protocol` 固定为 `ksf-app-registry-v1`，`apps` 是数组，`name` 可选。

每条包含完整 `manifest` 和 `package: {url, size, sha256}`，可选 `listing`。manifest 采用当前 SDK 的 v1/v2 格式；包内声明必须与索引完全一致。`size` 为文件字节数，`sha256` 是小写十六进制摘要。相同 ID、版本、target、nodeAbi 不能重复。

本公共源采用比宿主更窄的发布范围：包必须是 `packages/` 下的相对 `.ksfapp` 路径，图片必须是 `media/<摘要>.png|jpg|webp`，不允许外链、查询参数、编码路径、符号链接或路径越界。包不超过 32 MiB，展开不超过 96 MiB；每图不超过 8 MiB，最多 8 张截图。

`listing` 可含 `subtitle`（120 字符）、`description`（12000）、`releaseNotes`（8000）、`icon` 和 `screenshots[]`。每张图片为 `{url, sha256, size, alt?}`，截图的 `alt` 必须非空且最多 200 字符。图片名摘要与内容摘要一致，仅支持 PNG、JPEG、WebP。

示意结构（占位值不能直接提交）：

```json
{
  "protocol": "ksf-app-registry-v1",
  "apps": [{
    "manifest": {"schemaVersion": 1, "sdkVersion": 1, "minCoreVersion": "0.3.3", "dataStores": [], "id": "com.yourname.example", "version": "1.0.0", "name": "示例", "description": "应用说明", "permissions": [], "window": {"entry": "frontend/index.js"}},
    "package": {"url": "packages/yourname.example-1.0.0-any-SHA256.ksfapp", "size": 1234, "sha256": "由构建工具生成的64位摘要"}
  }]
}
```

检查器校验分发路径、包及文件摘要、声明一致性和入口存在，不执行应用、安装依赖或代替 SDK 完整构建检查。通过检查不意味着应用有发布资格，人工审查仍必须完成。

发布目录与包更新分开：相同版本内容不得重写，listing 可以独立更新。索引变更经 CI 全量检查后随目录一起部署，避免先发布索引再上传资源。应用本地原安装源失效时不自动换源；更新保持旧窗口与任务租约的原有机制。
