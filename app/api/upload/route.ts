import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// 设置为Node.js运行时
export const runtime = 'nodejs';

// 从环境变量获取API密钥和上传URL
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_UPLOAD_URL = process.env.DIFY_UPLOAD_URL || 'https://api.dify.ai/v1/files/upload';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        // 从请求中获取user，或者生成一个随机的用户ID
        const user = formData.get('user') as string || `user-${uuidv4()}`;

        if (!file) {
            return new Response(JSON.stringify({ error: '没有找到文件' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!DIFY_API_KEY) {
            return new Response(JSON.stringify({ error: 'API密钥未配置' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 准备发送到Dify的表单数据
        const difyFormData = new FormData();
        difyFormData.append('file', file);
        difyFormData.append('user', user);

        // 发送文件到Dify
        const response = await fetch(DIFY_UPLOAD_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`
            },
            body: difyFormData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`上传失败: ${response.status} ${response.statusText}`, errorText);

            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`文件上传失败: ${JSON.stringify(errorData)}`);
            } catch {
                throw new Error(`文件上传失败: ${response.status} ${response.statusText}`);
            }
        }

        // 获取上传接口响应的数据
        const responseData = await response.json();
        console.log("上传成功:", responseData);

        // 根据Dify API响应格式，返回数据
        return new Response(JSON.stringify({
            id: responseData.id,
            name: responseData.name,
            size: responseData.size,
            extension: responseData.extension,
            mime_type: responseData.mime_type,
            created_by: responseData.created_by,
            created_at: responseData.created_at,
            upload_file_id: responseData.id,
            transfer_method: 'local_file'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('处理文件上传时出错:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}