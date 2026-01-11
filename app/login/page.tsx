
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
            Login to access your asset snapshots
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
              Sign in with Google
            </Button>
          </form>
          <form
            action={async () => {
              "use server"
              await signIn("github", { redirectTo: "/" })
            }}
          >
            <Button className="w-full" variant="outline" type="submit">
              Sign in with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
