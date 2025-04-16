import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// 从环境变量获取API密钥和上传URL
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_UPLOAD_URL = process.env.DIFY_UPLOAD_URL || 'http://115.190.43.2/v1/files/upload';

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

        const data = await response.json();
        console.log("上传成功:", data);

        // 返回上传ID和其他必要信息
        return new Response(JSON.stringify({
            success: true,
            file: {
                id: data.id || uuidv4(),
                name: file.name,
                type: file.type,
                size: file.size,
                upload_file_id: data.id,
                user: user,
                // 在这里我们使用local_file作为传输方法，因为我们先上传文件到Dify
                transfer_method: 'local_file'
            }
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