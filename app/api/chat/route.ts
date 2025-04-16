import { NextRequest } from 'next/server';
import { transformDifyStream } from '../../../lib/utils';
import { validate as uuidValidate } from 'uuid';

const DIFY_API_URL = process.env.DIFY_API_URL || 'http://115.190.43.2/v1/chat-messages';
// 从环境变量获取API密钥
const DIFY_API_KEY = process.env.DIFY_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const { messages, conversationId, userId = 'default-user', files = [] } = await req.json();

        // 获取最后一条消息作为查询
        const latestMessage = messages[messages.length - 1];

        // 构建请求体
        let requestBody: any = {
            query: latestMessage.content,
            inputs: {},
            response_mode: 'streaming',
            user: userId,
            files: files.map((file: any) => ({
                type: file.type,
                transfer_method: file.transfer_method,
                url: file.url,
                upload_file_id: file.upload_file_id
            }))
        };
        
        // 检查conversation_id是否为有效的UUID格式
        try {
            if (conversationId && typeof conversationId === 'string' && uuidValidate(conversationId)) {
                requestBody.conversation_id = conversationId;
            }
        } catch (error) {
            console.warn('Invalid conversation_id format, ignoring:', conversationId);
            // 无效的conversation_id将被忽略，不添加到请求中
        }

        // 调用Dify API
        const response = await fetch(DIFY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Dify API错误: ${JSON.stringify(errorData)}`);
        }

        // 转换Dify的流式响应为标准格式
        const transformedStream = await transformDifyStream(response.body as ReadableStream<Uint8Array>);

        // 返回转换后的流式响应
        return new Response(transformedStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8'
            }
        });
    } catch (error) {
        console.error('处理聊天请求时出错:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}