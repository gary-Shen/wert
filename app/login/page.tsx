
import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
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
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/" })
            }}
          >
            <Button className="w-full" type="submit">
              通过 Google 登录
            </Button>
          </form>
          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/" })
            }}
          >
            <Button className="w-full" variant="outline" type="submit">
              通过 GitHub 登录
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
