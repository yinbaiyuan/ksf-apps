# 发布结构

`index.json` 限制 8 KiB，包含源身份、目录修订号、数量、目录树及搜索树引用。叶片最多40条摘要，按完整对象ID前缀继续拆分；详情与历史版本按对象、按页读取。资源引用包含URL、大小与SHA-256。

搜索按NFKC规范化并转小写，单字符和字符二元组建立倒排索引。客户端求候选交集后复核摘要并分页，不下载全部声明。

应用发布以一个统一的 `ksf-app-package-v2` 包为准。源码内 `store/listing.json` 定义subtitle、description、releaseNotes、icon和screenshots；图片path相对store/目录，截图必须带alt。生成包固定包含store/listing.json和必要图片。图片不在包外单独发布。

每个版本创建独立的 `releases/<id>/<version>.json`，引用store/packages/中的不可变包。CI解析包生成公开目录，不人工修改大型index。介绍材料变化也须递增版本并重打包。同版本摘要变化由CI和Core安装保护拒绝。
