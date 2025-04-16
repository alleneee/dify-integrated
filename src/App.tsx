import ChatInterface from '../components/ChatInterface';

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-5xl w-full flex flex-col items-center">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Dify聊天助手
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mb-6">
            上传文件并与Dify聊天，智能分析您的内容
          </p>
        </div>

        {/* 聊天界面 */}
        <div className="w-full max-w-4xl mb-8">
          <ChatInterface />
        </div>
        
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Dify Chat Demo. 提供智能文档分析和聊天服务。
        </footer>
      </div>
    </main>
  );
}