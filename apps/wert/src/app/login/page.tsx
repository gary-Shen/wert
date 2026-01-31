'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // 已登录用户重定向到首页
  useEffect(() => {
    if (!isPending && session) {
      router.replace('/');
    }
  }, [session, isPending, router]);

  const handleLogin = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  // 加载中或已登录时显示加载状态
  if (isPending || session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">SnapWorth</CardTitle>
          <CardDescription>
            登录以访问您的资产快照
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" variant="outline" onClick={handleLogin}>
            通过 GitHub 登录
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

