import React from 'react';
import MarkdownMessage from './ui/MarkdownMessage';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  loading?: boolean;
  error?: boolean;
}

interface MessageRendererProps {
  message: Message;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  // 根据消息角色确定样式类
  const getMessageClassName = () => {
    switch (message.role) {
      case 'user':
        return 'message-user';
      case 'assistant':
        return 'message-assistant';
      case 'system':
        return 'message-system';
      default:
        return '';
    }
  };

  // 获取角色头像和名称
  const getAvatarContent = () => {
    switch (message.role) {
      case 'user':
        return { letter: '用户', name: '您' };
      case 'assistant':
        return { letter: 'AI', name: 'AI助手' };
      case 'system':
        return { letter: 'S', name: '系统' };
      default:
        return { letter: '?', name: '未知' };
    }
  };

  const avatar = getAvatarContent();

  return (
    <div className={`dify-message ${getMessageClassName()}`}>
      <div className="dify-message-container">
        <div className="dify-message-avatar">
          <div className={`avatar ${message.role}`}>
            {avatar.letter}
          </div>
          <div className="avatar-name">{avatar.name}</div>
        </div>
        
        <div className="dify-message-content">
          {message.role === 'assistant' ? (
            <MarkdownMessage content={message.content} loading={message.loading} error={message.error} />
          ) : (
            <div className="plain-text">{message.content}</div>
          )}
          <div className="dify-message-meta">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
}
