# ksf-apps

KSF 工作台的公共默认应用源。仓库维护可下载的 `.ksfapp`、商店展示资料和 `ksf-app-registry-v1` 索引，通过 GitHub Pages 发布。

应用源地址：**https://yinbaiyuan.github.io/ksf-apps/index.json**

工作台将此源固定启用，不能编辑、停用或移除；用户仍可添加自建源。安装和更新需要确认来源与能力声明。已有应用继续跟随原安装源更新，不会因新增默认源而切换来源。

首版索引为空，未发布任何私人业务应用或工作区数据。随附官方应用继续由 KSF 随附应用源提供。

## 开发与检查

需要 Node.js 24 或更新版本，无第三方运行依赖：

```sh
npm ci
npm test
npm run check
```

- `store/`：唯一发布目录，包含索引、应用包和商店图片。
- `scripts/check.mjs`：不执行应用代码的分发完整性检查。
- `tests/`：虚构数据回归，不在公共目录发布测试应用。
- `.github/workflows/registry.yml`：PR 校验；main 通过后部署 Pages。

完整贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，字段、大小和更新规则见 [应用源规范](docs/registry.md)。应用开发使用当前 KSF 开发工具包，入口为工作区中的 `.agents/core/docs/app-development/README.md`。本仓库不是 SDK 的替代品。

## 发布

向 main 合并经过审查的变更后，工作流先执行测试与目录检查，再上传 `store/` 并部署。PR 不部署、不持有发布权限。初次需在仓库设置中启用 Pages 的 GitHub Actions 发布。

只修改商店资料不改变应用包；已发布的相同版本和平台包不得替换内容。Pages 上的包与图片使用直接地址，不能依赖下载跳转。

## 许可

公开可读不等于授予开源许可。当前仓库尚未指定开源许可证；应用贡献者须明确其代码、图片、字体及分发授权，仓库不重新授权第三方作品。
