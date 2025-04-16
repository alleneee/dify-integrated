"use client";

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateConversationId, generateUserId } from '@/lib/utils';

// 定义消息类型
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
}

// 定义上传文件类型
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  upload_file_id: string;
  transfer_method: string;
}

export default function DifyChat() {
  // 状态管理
  const [userId] = useState<string>(generateUserId());
  const [conversationId, setConversationId] = useState<string>(generateConversationId());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始欢迎消息
  useEffect(() => {
    addMessage({
      id: uuidv4(),
      content: '文档检查助手，您可以上传文件或直接开始聊天',
      role: 'system',
      timestamp: new Date()
    });
  }, []);

  // 添加消息的辅助函数
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
          conversationId,
          userId,
          files: uploadedFiles
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '发送消息时出错');
      }

      // 解析响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let assistantResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          assistantResponse += text;
        }

        // 添加AI响应消息
        const assistantMessage: Message = {
          id: uuidv4(),
          content: assistantResponse,
          role: 'assistant',
          timestamp: new Date()
        };

        addMessage(assistantMessage);
      }

      // 清除上传的文件，为下一次聊天做准备
      setUploadedFiles([]);
    } catch (err) {
      console.error('聊天错误:', err);
      setError(err instanceof Error ? err : new Error('未知错误'));

      // 添加错误消息
      addMessage({
        id: uuidv4(),
        content: `错误: ${err instanceof Error ? err.message : '未知错误'}`,
        role: 'system',
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`上传失败: ${error.message}`);
        }

        const data = await response.json();

        if (data.success) {
          const fileType = file.type.startsWith('image/') ? 'image' : 'document';
          newFiles.push({
            ...data.file,
            type: fileType,
            transfer_method: 'local_file'
          });
        }
      }

      setUploadedFiles(prev => [...prev, ...newFiles]);

      // 添加文件上传成功消息
      if (newFiles.length > 0) {
        const fileNames = newFiles.map(file => file.name).join(', ');
        addMessage({
          id: uuidv4(),
          content: `文件上传成功: ${fileNames}`,
          role: 'system',
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('上传处理错误:', error);

      addMessage({
        id: uuidv4(),
        content: `上传失败: ${(error as Error).message}`,
        role: 'system',
        timestamp: new Date()
      });
    } finally {
      setUploading(false);
      // 清空文件输入，以便可以再次上传相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 启动新会话
  const startNewConversation = () => {
    const newConversationId = generateConversationId();
    setConversationId(newConversationId);
    setMessages([]);
    setUploadedFiles([]);

    // 添加初始消息
    addMessage({
      id: uuidv4(),
      content: '开始新的对话',
      role: 'system',
      timestamp: new Date()
    });
  };

  return (
    <div className="dify-chat-container">
      {/* 侧边栏 */}
      <div className="dify-sidebar">
        <div className="dify-sidebar-header">
          <div className="dify-app-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16Z" fill="#47AEFD" />
              <path d="M7.3 8.35V12.25H8.7V8.35C9.07833 8.16833 9.375 7.9025 9.55 7.64C9.73333 7.37 9.825 7.05 9.825 6.7C9.825 6.5 9.78333 6.30417 9.7 6.1625C9.625 6.02083 9.5 5.9 9.35 5.8C9.2 5.69167 9.02917 5.61667 8.8375 5.55C8.64583 5.48333 8.43333 5.45 8.2 5.45C7.96667 5.45 7.75417 5.48333 7.5625 5.55C7.37083 5.61667 7.2 5.69167 7.05 5.8C6.9 5.9 6.77917 6.02083 6.7 6.1625C6.625 6.30417 6.5875 6.5 6.5875 6.7C6.5875 7.05 6.67917 7.37 6.8625 7.64C7.04583 7.9025 7.3375 8.16833 7.3 8.35ZM8.2 4.6C8.53333 4.6 8.82083 4.5 9.1125 4.3C9.40417 4.1 9.55 3.83333 9.55 3.5C9.55 3.16667 9.40417 2.9 9.1125 2.7C8.82083 2.5 8.53333 2.4 8.2 2.4C7.86667 2.4 7.575 2.5 7.2875 2.7C6.99583 2.9 6.85 3.16667 6.85 3.5C6.85 3.83333 6.99583 4.1 7.2875 4.3C7.575 4.5 7.86667 4.6 8.2 4.6Z" fill="white" />
            </svg>
          </div>
          <span className="font-semibold">文档检查助手</span>
        </div>

        <button className="dify-new-chat-btn" onClick={startNewConversation}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
            <path d="M8 3.33337V12.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.33331 8H12.6666" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          开启新对话
        </button>

        <div className="dify-powered-by">
          POWERED BY
          <svg width="1em" height="1em" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M16 32C24.8365 32 32 24.8365 32 16C32 7.16346 24.8365 0 16 0C7.16344 0 0 7.16346 0 16C0 24.8365 7.16344 32 16 32ZM17.5 20.5H25.5V22H17.5V30.5H16V22H8V20.5H16V12H17.5V20.5Z" fill="white" fillOpacity="0.8" />
          </svg>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="dify-main">
        {/* 聊天消息区域 */}
        <div className="dify-chat-area">
          {messages.length === 0 ? (
            <div className="dify-empty-chat">
              <p className="text-lg font-medium mb-2">开始您的对话</p>
              <p className="text-sm">发送消息或上传文件进行分析</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="dify-chat-message">
                <div className={`dify-message-content ${message.role === 'user'
                    ? 'dify-user-message'
                    : message.role === 'assistant'
                      ? 'dify-ai-message'
                      : 'dify-system-message'
                  }`}>
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="dify-chat-input-container">
          {uploadedFiles.length > 0 && (
            <div className="dify-files-preview">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="dify-file-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(uploadedFiles.filter(f => f.id !== file.id))}
                    aria-label="移除文件"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="dify-input-wrapper">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="上传文件"
            >
              {uploading ? (
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59723 21.9983 8.005 21.9983C6.41277 21.9983 4.88584 21.3658 3.76 20.24C2.63416 19.1142 2.00166 17.5872 2.00166 15.995C2.00166 14.4028 2.63416 12.8758 3.76 11.75L12.33 3.18C13.0806 2.42955 14.0991 2.00066 15.16 2.00066C16.2209 2.00066 17.2394 2.42955 17.99 3.18C18.7405 3.93045 19.1693 4.94895 19.1693 6.00986C19.1693 7.07076 18.7405 8.08926 17.99 8.83971L9.41 17.41C9.03472 17.7853 8.52577 17.9961 7.995 17.9961C7.46423 17.9961 6.95528 17.7853 6.58 17.41C6.20472 17.0347 5.99389 16.5258 5.99389 15.995C5.99389 15.4642 6.20472 14.9553 6.58 14.58L15.07 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              disabled={uploading}
            />
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="和机器人聊天"
              disabled={isLoading}
              className="dify-chat-input"
            />
            <button
              className="dify-send-button"
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              aria-label="发送消息"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-1">{error.message || '发送消息时出错'}</p>
          )}
        </div>
      </div>
    </div>
  );
}