import { NextRequest } from 'next/server';
import { transformDifyStream } from '../../../lib/utils';
import { validate as uuidValidate } from 'uuid';

export const runtime = 'edge';

// 修复：使用完整的URL格式并改为使用环境变量配置
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1/chat-messages';
// 从环境变量获取API密钥
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// 文件输入接口定义
interface FileInput {
    type: string;           // 文件类型：document, image, audio, video
    transfer_method: string; // 传输方法，固定为 local_file
    upload_file_id: string;  // 文件上传后的ID
}

// 请求体接口定义
interface RequestBody {
    query: string;                  // 用户查询内容
    inputs: Record<string, string>; // 可选的输入参数
    response_mode: string;          // 响应模式，streaming 或 blocking
    user: string;                   // 用户ID
    files: FileInput[];             // 文件列表
    conversation_id?: string;       // 可选的会话ID
}

export async function POST(req: NextRequest) {
    try {
        const { messages, conversationId, userId = 'default-user', files = [] } = await req.json();

        // 获取最后一条消息作为查询
        const latestMessage = messages[messages.length - 1];

        // 处理文件列表，确保符合Dify API格式要求
        const validFiles = files
            .filter((file: any) => file && file.upload_file_id)
            .map((file: any) => ({
                type: file.type || 'document', // 确保文件类型有效
                transfer_method: 'local_file',  // 固定使用local_file
                upload_file_id: file.upload_file_id
            }));

        // 构建请求体
        const requestBody: RequestBody = {
            query: latestMessage.content,
            inputs: {},
            response_mode: 'streaming',
            user: userId,
            files: validFiles
        };

        // 检查conversation_id是否为有效的UUID格式
        if (conversationId && typeof conversationId === 'string' && uuidValidate(conversationId)) {
            requestBody.conversation_id = conversationId;
        }

        console.log('发送到Dify的请求:', JSON.stringify(requestBody, null, 2));

        // 检查API URL和Key是否配置正确
        if (!DIFY_API_KEY) {
            throw new Error('缺少DIFY_API_KEY环境变量配置');
        }

        // 调用Dify API
        const response = await fetch(DIFY_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            // 改进错误处理，避免JSON解析错误
            const errorText = await response.text();
            let errorMessage = `Dify API错误 (${response.status}): `;

            try {
                // 尝试解析为JSON，但不强制要求
                const errorData = JSON.parse(errorText);
                errorMessage += JSON.stringify(errorData);
            } catch (e) {
                // 如果不是JSON，直接使用文本内容
                errorMessage += errorText.substring(0, 200); // 限制错误长度
            }

            throw new Error(errorMessage);
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