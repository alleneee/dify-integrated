# Dify 聊天助手

这是一个使用 Next.js 和 Vercel AI SDK 构建的聊天应用，用于与 Dify API 进行交互。应用支持文件上传和聊天功能。

## 功能特点

- 与 Dify API 进行集成
- 支持文件上传到 Dify
- 流式聊天响应
- 会话管理
- 暗黑模式支持
- 响应式设计

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- Vercel AI SDK
- UUID 生成

## 环境变量设置

在项目根目录创建一个 `.env.local` 文件，并添加以下内容：

```
DIFY_API_KEY=你的_DIFY_API_密钥
DIFY_API_URL=http://115.190.43.2/v1/chat-messages
DIFY_UPLOAD_URL=http://115.190.43.2/v1/files/upload
```

确保使用你自己的 Dify API 密钥。

## 开始使用

1. 克隆这个仓库
2. 安装依赖：

```bash
npm install
```

3. 配置环境变量（见上文）
4. 启动开发服务器：

```bash
npm run dev
```

5. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## API 路由

- `/api/chat`: 处理与 Dify 的聊天请求
- `/api/upload`: 处理文件上传到 Dify

## 使用说明

1. 在聊天输入框中输入消息，按回车或点击发送按钮发送
2. 使用文件按钮上传文件（支持图片和文档）
3. 可以看到上传的文件预览
4. 使用"新会话"按钮开始新的对话

## 注意事项

- 确保 Dify API 已经正确配置和运行
- 上传的文件类型应与 Dify 的配置相匹配
- 大文件上传可能需要更长的时间

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
