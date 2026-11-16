# Contacts — 联系人通讯录

软件工程课程项目。应用界面为英语，支持联系人管理、收藏、多种联系方式、搜索分组以及 Excel 导入导出。联系人保存在当前浏览器，演示数据与个人数据分开保存。

| 姓名 | 学号 | 贡献比例 |
|---|---|---:|
| 孙俊 | 832402118 | 50% |
| 曾景康 | 832402101 | 50% |
## 项目地址

- GitHub 仓库：https://github.com/SJA-cobe/address-book
- 编码规范：https://github.com/SJA-cobe/address-book/blob/main/CODE/_STANDARDS.md
- 网页演示：https://sja-cobe.github.io/address-book/
- 云服务器部署：http://60.205.104.32
## 运行

下载或克隆仓库后，在根目录运行：

```powershell
python -m http.server 5173
```

浏览器访问 `http://localhost:5173`。也可直接打开根目录的 `index.html`。字体和 Excel 库均随仓库提供，无需安装 npm 依赖或配置后端。

发布到 GitHub Pages 时，在仓库 Settings → Pages 选择 Deploy from a branch，分支选择 `main`，目录选择 `/(root)`，保存后使用部署页面显示的地址。

## 功能

- 新建、编辑和删除联系人，删除后可撤销。
- 收藏联系人，按关键词、分组和收藏状态组合筛选。
- 为同一人保存多个号码、邮箱及自定义类型的联系方式。
- 导出 `.xlsx` 文件；导入前预览，跳过完全重复的记录并提示错误行。
- 切换列表与卡片视图，适配桌面和手机。

Excel 导出按一行一人保存。隐藏的 `Contact methods JSON` 列用于保留多条联系方式的完整结构。在表格软件中修改可见联系方式列时，请先清空对应行的该隐藏单元格。

## 文件

| 路径 | 用途 |
|---|---|
| `index.html`、`style.css` | 页面与样式 |
| `core.js`、`app.js` | 数据处理、交互与本地保存 |
| `vendor/`、`fonts/`、`icon.svg` | 运行资源及第三方许可证 |
| [设计说明](docs/设计说明.md) | 需求、架构、数据结构及实现方案 |
| [验收报告](docs/验收报告.md)、`TEST/` | 测试结果、范围与测试代码 |
| [编码规范](CODE/_STANDARDS.md)、[协作约定](CONTRIBUTING.md) | 代码与提交约定 |
| `images/` | 运行截图 |
| `examples/` | Excel 空模板和虚构数据示例 |


## 测试

安装 Node.js 18 或更高版本后，在根目录执行：

```powershell
node --test TEST/core.test.cjs
node --check core.js
node --check app.js
```

启动本地 HTTP 服务后，访问 `http://localhost:5173/TEST/browser-tests.html` 运行浏览器验收。测试会临时修改同站点存储，请在独立测试浏览器中运行，不要同时编辑真实联系人。

核心测试 13 项、浏览器验收 19 项均已通过。测试方式与限制见验收报告。

## 数据说明

清除浏览器站点数据会清除通讯录；不同浏览器、设备和站点地址之间不自动同步。请定期导出 Excel 备份。示例联系人均为虚构。

