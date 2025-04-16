"use client";

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateConversationId, generateUserId } from '@/lib/utils';

// 导入React Chat Elements组件
import {
  Input,
  Button,
  MessageList,
  Navbar
} from 'react-chat-elements';

// 导入样式
import 'react-chat-elements/dist/main.css';

// 定义消息类型
interface Message {
  position: 'left' | 'right';
  type: string;
  title: string;
  text: string;
  date: Date;
  id: string;
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

// 输入框引用类型
interface InputRef {
  clear: () => void;
  focus: () => void;
}

export default function ChatInterface() {
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
  const inputRef = useRef<InputRef>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始欢迎消息
  useEffect(() => {
    addSystemMessage('文档检查助手，您可以上传文件或直接开始聊天');
  }, []);

  // 添加用户消息
  const addUserMessage = (text: string) => {
    const newMessage: Message = {
      position: 'right',
      type: 'text',
      title: '我',
      text: text,
      date: new Date(),
      id: uuidv4(),
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // 添加系统消息
  const addSystemMessage = (text: string) => {
    const newMessage: Message = {
      position: 'left',
      type: 'text',
      title: '系统',
      text: text,
      date: new Date(),
      id: uuidv4(),
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // 添加AI消息
  const addAIMessage = (text: string) => {
    const newMessage: Message = {
      position: 'left',
      type: 'text',
      title: 'AI助手',
      text: text,
      date: new Date(),
      id: uuidv4(),
    };

    setMessages(prev => [...prev, newMessage]);
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // 添加用户消息
    addUserMessage(input);

    const userInput = input;
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
          messages: [{ role: 'user', content: userInput }],
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
        addAIMessage(assistantResponse);
      }

      // 清除上传的文件，为下一次聊天做准备
      setUploadedFiles([]);
    } catch (err) {
      console.error('聊天错误:', err);
      setError(err instanceof Error ? err : new Error('未知错误'));

      // 添加错误消息
      addSystemMessage(`错误: ${err instanceof Error ? err.message : '未知错误'}`);
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
        addSystemMessage(`文件上传成功: ${fileNames}`);
      }
    } catch (error) {
      console.error('上传处理错误:', error);

      addSystemMessage(`上传失败: ${(error as Error).message}`);
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
    addSystemMessage('开始新的对话');
  };

  return (
    <div className="flex flex-col h-[700px] border overflow-hidden rounded-xl shadow-md">
      {/* 导航栏 */}
      <Navbar
        left={<span className="font-semibold text-lg">文档检查助手</span>}
        right={
          <button
            onClick={startNewConversation}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition"
          >
            新会话
          </button>
        }
        className="border-b"
      />

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="text-gray-500">
              <p className="text-lg font-medium">开始您的对话</p>
              <p className="text-sm">发送消息或上传文件进行分析</p>
            </div>
          </div>
        ) : (
          <MessageList
            className="message-list"
            lockable={false}
            toBottomHeight="100%"
            dataSource={messages}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 已上传文件预览 */}
      {uploadedFiles.length > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">已上传文件:</p>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="text-xs bg-white px-3 py-1.5 rounded-full flex items-center shadow-sm border"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-gray-600">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate max-w-[120px]">{file.name}</span>
                <button
                  onClick={() => setUploadedFiles(uploadedFiles.filter(f => f.id !== file.id))}
                  className="ml-1.5 hover:text-red-500 transition-colors"
                  aria-label="移除文件"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            disabled={uploading}
            aria-label="上传文件"
          >
            {uploading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
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

          <Input
            placeholder="输入消息..."
            multiline={false}
            value={input}
            onChange={handleInputChange}
            rightButtons={
              <Button
                color="blue"
                text={isLoading ? "发送中..." : "发送"}
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
              />
            }
            ref={inputRef}
            className="flex-1 rounded-lg border"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error.message || '发送消息时出错'}</p>
        )}
      </div>
    </div>
  );
}