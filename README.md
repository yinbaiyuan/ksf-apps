# KSF 公用应用源

商店入口：[index.json](https://yinbaiyuan.github.io/ksf-apps/index.json)。需要使用最新 KSF Core；目录采用 `ksf-store-catalog-v2`，不提供旧目录兼容入口。

每个应用版本只有一个 `.ksfapp` 权威安装包，程序、商店文案、图标和截图共同参与完整性校验。应用源码固定在 `store/listing.json` 定义商店内容，并将图片放在同一 `store/` 目录中。发布不再维护独立的图片仓库或全量声明索引。

发布输入在 `releases/<完整应用ID>/<版本>.json`，只引用完整包。CI 从包内声明生成分片目录、详情、分页历史和字符索引。`npm run build && npm test && npm run check` 可在本地复验，生成结果位于 `dist/`。

历史安装包原文件保留于 `store/packages/`，没有重写既有版本。当前目录仅发布统一包版本；旧索引仅在Git历史中留存，不再作为商店入口。

应用及素材保留各自上游许可；公开可见不代表统一授予开源许可。第三方材料以包内声明和许可为准。
