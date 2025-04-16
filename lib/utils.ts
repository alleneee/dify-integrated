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

            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        yield data;
                    } catch (e) {
                        console.error('解析SSE数据时出错:', e);
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
                    if (chunk.event === 'message') {
                        // 对于普通文本消息
                        controller.enqueue(encoder.encode(chunk.answer));
                    } else if (chunk.event === 'message_file') {
                        // 对于文件消息，可以添加特殊处理
                        // 这里我们只是记录有文件被发送
                        console.log('收到文件消息:', chunk);
                    } else if (chunk.event === 'error') {
                        // 处理错误
                        console.error('Dify API错误:', chunk);
                        controller.error(new Error(chunk.message));
                    } else if (chunk.event === 'message_end') {
                        // 消息结束
                        console.log('聊天完成，元数据:', chunk.metadata);
                    }
                }
                controller.close();
            } catch (e) {
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