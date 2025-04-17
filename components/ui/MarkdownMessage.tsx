import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  loading?: boolean; // 加载状态
  error?: boolean;   // 错误状态
}

const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, loading = false, error = false }) => {
  // 如果是加载状态，显示加载动画
  if (loading) {
    return (
      <div className="markdown-message loading-message">
        <div className="loading-dot-container">
          <span className="loading-dot"></span>
          <span className="loading-dot"></span>
          <span className="loading-dot"></span>
        </div>
      </div>
    );
  }

  // 如果是错误消息，使用错误样式
  const messageClass = error ? 'markdown-message error-message' : 'markdown-message';

  return (
    <div className={messageClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // @ts-ignore - 类型错误，但功能正常
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <pre className={`language-${match[1]} code-block`}>
                <code {...props}>
                  {String(children).replace(/\n$/, '')}
                </code>
              </pre>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownMessage;
