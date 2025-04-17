"use client";

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { generateConversationId, generateUserId } from '@/lib/utils';
import MarkdownMessage from './ui/MarkdownMessage';
import { MessageRenderer } from './MessageRenderer';

// 定义消息类型
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  loading?: boolean;
  error?: boolean;
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
      content: '我是您的文档检查助手，你可以上传文件让我帮您检查',
      role: 'system',
      timestamp: new Date()
    });
  }, []);

  // 添加消息的辅助函数
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // 更新消息的辅助函数
  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(message => message.id === id ? { ...message, ...updates } : message));
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

  // 发送消息处理
  const handleSendMessage = async () => {
    await sendMessage(input);
  };

  // 发送消息函数
  const sendMessage = async (content: string) => {
    if (!content.trim() && uploadedFiles.length === 0) return;
    
    setIsLoading(true);
    setError(null);

    // 生成新消息ID
    const messageId = uuidv4();
    
    // 添加用户消息到聊天列表
    const userMessage: Message = {
      id: messageId,
      content: content,
      role: 'user',
      timestamp: new Date()
    };
    addMessage(userMessage);
    
    // 重置输入框
    setInput('');
    
    // 添加占位AI回复消息
    const aiMessageId = uuidv4();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      loading: true
    };
    addMessage(aiMessage);
    
    try {
      // 准备请求体
      const requestBody = {
        messages: [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        conversationId,
        userId,
        files: uploadedFiles
      };
      
      // 清空当前上传的文件列表，因为它们已经包含在请求中
      setUploadedFiles([]);
      
      // 发送流式请求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }
      
      // 获取响应流
      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');
      
      // 用于存储流式响应的内容
      let accumulatedContent = '';
      const decoder = new TextDecoder();
      
      // 读取流式响应
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解码二进制数据为文本
        const chunk = decoder.decode(value, { stream: true });
        console.log('收到流式数据:', chunk);
        
        // 累加内容
        accumulatedContent += chunk;
        
        // 实时更新AI回复内容
        updateMessage(aiMessageId, { 
          content: accumulatedContent,
          loading: false // 收到回复内容后就停止加载状态
        });
      }
      
      // 如果没有获得任何响应内容，设置错误消息
      if (!accumulatedContent) {
        updateMessage(aiMessageId, { 
          content: '抱歉，未能获取到回答，请稍后再试。',
          error: true
        });
      }
      
      // 如果是第一次对话，保存会话ID
      if (!conversationId && accumulatedContent) {
        const newConversationId = uuidv4();
        setConversationId(newConversationId);
      }
      
    } catch (err) {
      console.error('发送消息错误:', err);
      
      // 更新AI消息显示错误
      updateMessage(aiMessageId, { 
        content: `错误: ${err instanceof Error ? err.message : '未知错误'}`,
        error: true,
        loading: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user', userId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '上传文件时出错');
        }

        const fileData = await response.json();
        
        // 构造上传文件对象，包含Dify API所需的字段
        return {
          id: fileData.id,
          name: fileData.name,
          size: fileData.size,
          type: fileData.mime_type.startsWith('image/') ? 'image' : 'document', // 简化类型为image或document
          upload_file_id: fileData.id,
          transfer_method: 'local_file'
        };
      });

      const uploadedFileResults = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFileResults]);

      // 将上传成功消息添加到聊天中
      const fileNames = uploadedFileResults.map(file => file.name).join(', ');
      addMessage({
        id: uuidv4(),
        content: `文件上传成功: ${fileNames}`,
        role: 'system',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('上传错误:', err);
      setError(err instanceof Error ? err : new Error('未知错误'));

      // 将错误消息添加到聊天中
      addMessage({
        id: uuidv4(),
        content: `上传错误: ${err instanceof Error ? err.message : '未知错误'}`,
        role: 'system',
        timestamp: new Date()
      });
    } finally {
      setUploading(false);
      // 清除文件输入，以便用户可以再次上传相同的文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 启动新会话
  const startNewConversation = () => {
    setConversationId(generateConversationId());
    setMessages([{
      id: uuidv4(),
      content: '开始新的对话',
      role: 'system',
      timestamp: new Date()
    }]);
    setUploadedFiles([]);
    setError(null);
  };

  return (
    <div className="dify-layout">
      {/* 侧边栏 */}
      <div className="dify-sidebar" style={{ backgroundColor: '#2D7BEE', color: 'white' }}>
        <div className="dify-sidebar-header">
          <div className="dify-logo">
            文档检查助手
          </div>
        </div>
        <button 
          className="dify-new-chat-button"
          onClick={startNewConversation}
        >
          开启新对话
        </button>
      </div>
      
      {/* 主内容区域 */}
      <div className="dify-main">
        <div className="dify-chat-interface">
          {uploadedFiles.length > 0 && (
            <div className="dify-file-upload-info">
              <span>文件上传成功: <span className="dify-file-name">{uploadedFiles[0]?.name}</span></span>
              <button className="dify-details-button">查看文件详情</button>
            </div>
          )}
          <div className="dify-messages" ref={messagesEndRef}>
            {messages.map((message) => (
              <div key={message.id} className="dify-chat-message">
                <MessageRenderer message={message} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        
          <div className="dify-input-area">
            {uploadedFiles.length > 0 && (
              <div className="dify-files-preview">
                {uploadedFiles.map(file => (
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
                className="dify-attach-button"
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
                placeholder="输入您的问题..."
                disabled={isLoading}
                className="dify-chat-input"
              />
              <button
                className={`dify-send-button ${(!input.trim() || isLoading) ? 'disabled' : ''}`}
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
              <p className="dify-error-message">{error.message || '发送消息时出错'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}