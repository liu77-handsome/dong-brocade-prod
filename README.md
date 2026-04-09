# Dong Brocade Pattern Generator

一个基于 React + Vite 的侗锦纹样交互与生成项目。

当前项目包含三个独立页面：

- `/`：图元选择页。用户选择 3 个图元并点击开始生成。
- `/result`：结果页。独立接收选择页的生成消息，播放动画并显示最终纹样、文化属性与二维码下载。
- `/download`：下载页。二维码会指向这个稳定入口，再跳转到对应最终图片。

## 当前功能

- 支持 3 个图元选择与再次生成。
- 结果页与选择页独立存在，不强制页面跳转。
- 生成动画从纯黑背景开始，自上而下逐步生成最终纹样。
- 最终纹样从 `纹样打标/` 目录自动匹配：
  - 每个子目录代表一个综合纹样方案。
  - 子目录中的 `TYxxx` 文件夹表示该综合纹样包含的图元。
  - 子目录中的“最终效果”图片作为输出结果。
  - 用户选择 3 个图元后，按命中数量计分。
  - 得分最高者输出；若并列，则稳定随机输出其中一个。
- 文化属性说明支持中英文双语展示。
- 最终效果图按需懒加载，减少主包体积。
- 每张最终图片都有独立二维码下载链接。

## 项目结构

```text
src/
  App.tsx
  components/
    DongBrocadeHero.tsx             # 图元选择页
    DongBrocadeResultGallery.tsx    # 结果页
    DongBrocadeDownloadPage.tsx     # 二维码下载落地页
    MatrixRevealImage.tsx           # 生成动画
  data/
    dongBrocadeCards.ts
    connotationMap.json             # 文化属性数据
  lib/
    resultAssets.ts                 # 纹样打标匹配、资源索引、稳定下载 ID
    resultChannel.ts                # 选择页与结果页消息同步
纹样打标/
  DJxxx/
    TYxxx/
    最终效果/
```

## 本地开发

### 依赖

- Node.js 18+

### 安装

```bash
npm install
```

### 启动

```bash
npm run dev
```

默认地址：

- 选择页：http://localhost:3000/
- 结果页：http://localhost:3000/result

## 使用方式

1. 启动项目。
2. 打开选择页 `/`。
3. 再单独打开结果页 `/result`。
4. 在选择页选满 3 个图元。
5. 点击“开始生成”。
6. 结果页会独立收到消息并开始生成动画。
7. 生成完成后，可扫码进入下载页并保存图片。

## 二维码下载机制

二维码不会直接指向构建后的静态图片文件名，而是指向一个稳定下载页：

```text
/download?asset=DJxxx__文件名&lang=zh
```

这样做的好处：

- 每张最终纹样都有固定的分享入口。
- 即使重新构建，静态资源 hash 变化，二维码仍然有效。
- 结果页可以稳定生成公网二维码下载链接。

## 环境变量

参考 `.env.example`：

```env
VITE_PUBLIC_BASE_URL="https://brocade.example.com"
```

其中：

- `VITE_PUBLIC_BASE_URL`：二维码生成时使用的公网站点根地址。

规则：

- 本地调试时可以填局域网地址，例如 `http://192.168.1.20:3000`
- 公网部署时必须填你的正式域名，例如 `https://your-domain.com`

## 如何配置公网域名

要让手机在公网扫描二维码后可以下载，必须同时满足下面 4 个条件：

1. 项目已经部署到公网服务器或静态托管平台。
2. 站点绑定了公网域名。
3. `VITE_PUBLIC_BASE_URL` 配置成这个公网域名。
4. 托管平台支持 SPA 路由回退，否则 `/result` 和 `/download` 会 404。

### 标准配置流程

1. 先把项目部署到一个可公网访问的平台。

可选方式：

- Vercel
- Netlify
- Cloudflare Pages
- 自己的 Nginx 服务器

2. 在域名服务商处购买或使用已有域名。

例如：

- `your-domain.com`
- `brocade.your-domain.com`

3. 在部署平台绑定域名。

常见情况：

- 根域名一般配置 `A` 记录或 `ALIAS / ANAME`
- 子域名一般配置 `CNAME`

具体记录值以你的托管平台提供的目标地址为准。

4. 在部署平台配置环境变量：

```env
VITE_PUBLIC_BASE_URL=https://your-domain.com
```

注意：

- 必须带 `https://`
- 不要在结尾加 `/`

5. 重新部署项目。

6. 部署完成后验证以下地址：

- `https://your-domain.com/`
- `https://your-domain.com/result`
- `https://your-domain.com/download?asset=某个实际ID`

### 重要：SPA 路由回退

本项目是单页应用，`/result` 和 `/download` 都需要回退到 `index.html`。

如果不配置回退，浏览器直接访问这些地址时会 404。

你需要在托管平台配置类似规则：

- 所有未命中的路径都返回 `index.html`

例如：

- Vercel：在项目设置或 `vercel.json` 中配置 rewrites
- Netlify：在 `_redirects` 中配置 `/* /index.html 200`
- Nginx：使用 `try_files $uri /index.html;`

## 推荐部署方式

### Vercel

适合最快上线。

基本步骤：

1. 将代码推到 GitHub。
2. 在 Vercel 导入仓库。
3. 添加环境变量：

```env
VITE_PUBLIC_BASE_URL=https://your-domain.com
```

4. 在 Vercel 项目设置中绑定域名。
5. 按提示在域名服务商处添加 DNS 记录。
6. 等待 HTTPS 生效后重新部署。

### Netlify

也适合静态站点部署。

基本步骤：

1. 将代码推到 GitHub。
2. 在 Netlify 导入仓库。
3. 构建命令填写：

```bash
npm run build
```

4. 发布目录填写：

```text
dist
```

5. 配置环境变量：

```env
VITE_PUBLIC_BASE_URL=https://your-domain.com
```

6. 绑定自定义域名。
7. 配置 SPA 回退。

## 验证公网下载是否成功

部署完成后，建议按这个顺序验证：

1. 在公网域名打开选择页与结果页。
2. 生成任意一张综合纹样。
3. 用手机扫描结果页二维码。
4. 确认手机进入的是：

```text
https://your-domain.com/download?asset=...
```

5. 确认页面随后能打开最终图片。
6. 确认手机可以长按保存或直接下载。

## 常见问题

### 1. 手机扫码后打不开

通常是以下原因之一：

- 站点还在本地 `localhost`
- `VITE_PUBLIC_BASE_URL` 没改成公网域名
- 域名 DNS 还没生效
- HTTPS 证书还没生效

### 2. 直接访问 `/result` 或 `/download` 返回 404

原因：

- 没有配置 SPA 路由回退

### 3. 二维码能打开，但不是最终图片

原因通常是：

- 部署版本和当前代码不一致
- `纹样打标` 目录缺少最终效果图
- `asset` 稳定 ID 没有对应到实际图片

## 脚本

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## 备注

- 当前二维码下载链路已经按公网部署场景设计完成。
- 真正公网可用的关键不在前端逻辑，而在部署、域名、HTTPS 和路由回退配置是否完整。
