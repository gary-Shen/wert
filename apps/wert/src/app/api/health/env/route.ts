import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/env
 * 检查关键环境变量是否配置（不显示完整值，只显示是否存在）
 */
export async function GET() {
  const checkEnv = (name: string) => {
    const value = process.env[name];
    if (!value) return { exists: false, preview: null };
    // 只显示前4个字符
    return {
      exists: true,
      preview: value.substring(0, 4) + '***',
      length: value.length,
    };
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      GITHUB_CLIENT_ID: checkEnv('GITHUB_CLIENT_ID'),
      GITHUB_CLIENT_SECRET: checkEnv('GITHUB_CLIENT_SECRET'),
      POSTGRES_URL: checkEnv('POSTGRES_URL'),
      DATABASE_URL: checkEnv('DATABASE_URL'),
      NEXT_PUBLIC_BASE_URL: checkEnv('NEXT_PUBLIC_BASE_URL'),
      BETTER_AUTH_URL: checkEnv('BETTER_AUTH_URL'),
      BETTER_AUTH_SECRET: checkEnv('BETTER_AUTH_SECRET'),
    },
  });
}
