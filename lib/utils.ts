// 解析Dify的SSE响应
export async function* parseDifySSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行分割数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          try {
            // 处理可能的非JSON数据
            const rawData = line.slice(6).trim();
            if (rawData === '[DONE]') {
              // 特殊标记，表示流结束
              yield { event: 'message_end' };
              continue;
            }

            try {
              const data = JSON.parse(rawData);
              yield data;
            } catch (parseError) {
              console.warn('SSE数据不是有效的JSON:', rawData);
              // 如果不是JSON，作为原始文本发送
              yield {
                event: 'message',
                answer: rawData,
                rawContent: true
              };
            }
          } catch (e) {
            console.error('处理SSE数据时出错:', e, 'Raw line:', line);
          }
        }
      }
    }
  } catch (e: unknown) {
    console.error('读取流时发生错误:', e);
    // 将错误作为事件发送出去
    const errorMessage = e instanceof Error ? e.message : '读取流时发生未知错误';
    yield { event: 'error', message: errorMessage };
  } finally {
    reader.releaseLock();
  }
}

// 将Dify的SSE响应转换为标准的AI聊天流格式
export async function transformDifyStream(stream: ReadableStream<Uint8Array>): Promise<ReadableStream<Uint8Array>> {
  const parser = parseDifySSE(stream);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of parser) {
          console.log('收到Dify流数据:', JSON.stringify(chunk));

          if (chunk.event === 'message') {
            // 对于普通文本消息，立即输出每一个token
            if (chunk.answer) {
              controller.enqueue(encoder.encode(chunk.answer));
            } else if (chunk.text) {
              // 兼容不同的API响应格式
              controller.enqueue(encoder.encode(chunk.text));
            } else if (chunk.content) {
              // 又一种可能的格式
              controller.enqueue(encoder.encode(chunk.content));
            }
          } else if (chunk.event === 'message_file') {
            // 对于文件消息，可以添加特殊处理
            console.log('收到文件消息:', chunk);
            // 可以将文件链接作为文本发送
            if (chunk.url) {
              controller.enqueue(encoder.encode(`\n文件: ${chunk.url}\n`));
            }
          } else if (chunk.event === 'error') {
            // 处理错误
            console.error('Dify API流错误:', chunk);
            // 向用户显示错误信息
            controller.enqueue(encoder.encode(`\n错误: ${chunk.message || '未知错误'}\n`));
            // 但不终止流，让它正常完成
          } else if (chunk.event === 'message_end') {
            // 消息结束
            console.log('聊天完成，元数据:', chunk.metadata);
            // 可能的完成原因可以添加到输出中
            if (chunk.finish_reason) {
              controller.enqueue(encoder.encode(`\n(${chunk.finish_reason})\n`));
            }
            controller.close(); // 正确结束流
          } else {
            // 处理其他未知事件或直接显示原始文本
            console.log('未知的事件类型或普通文本:', chunk);
            if (chunk.rawContent && typeof chunk.answer === 'string') {
              controller.enqueue(encoder.encode(chunk.answer));
            }
          }
        }
      } catch (e: unknown) {
        console.error('处理流时出错:', e);
        try {
          // 向用户显示具体错误
          const errorMessage = e instanceof Error ? e.message : '未知错误';
          controller.enqueue(encoder.encode(`\n处理响应时出错: ${errorMessage}\n`));
          controller.close();
        } catch (finalError) {
          controller.error(finalError);
        }
      }
    }
  });
}

// 生成随机的会话ID
export function generateConversationId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 生成随机的用户ID
export function generateUserId() {
  return `user-${Math.random().toString(36).substring(2, 10)}`;
}