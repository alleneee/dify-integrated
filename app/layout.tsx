import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cn } from "@/lib/ui/cn";

const inter = Inter({ subsets: ['latin'], variable: "--font-sans" });

export const metadata: Metadata = {
    title: '文档检查助手',
    description: '智能文档检查与分析应用',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <body className={cn("min-h-screen font-sans antialiased", inter.variable)}>
                {children}
            </body>
        </html>
    );
}