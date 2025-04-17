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
                        const data = JSON.parse(line.slice(6));
                        yield data;
                    } catch (e) {
                        console.error('解析SSE数据时出错:', e, 'Raw data:', line.slice(6));
                    }
                }
            }
        }
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
                }
              } else if (chunk.event === 'message_file') {
                // 对于文件消息，可以添加特殊处理
                console.log('收到文件消息:', chunk);
              } else if (chunk.event === 'error') {
                // 处理错误
                console.error('Dify API流错误:', chunk);
                controller.error(new Error(chunk.message || '未知流错误'));
              } else if (chunk.event === 'message_end') {
                // 消息结束
                console.log('聊天完成，元数据:', chunk.metadata);
                controller.close(); // 在接收到message_end事件时正确结束流
              } else {
                // 处理其他未知事件
                console.log('未知的事件类型:', chunk.event, chunk);
              }
            }
          } catch (e) {
            console.error('处理流时出错:', e);
            controller.error(e);
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