import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { TelegramLogin } from "@/components/telegram-login";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    const session = await verifyToken(token);
    if (session) redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Quiz Platform</h1>
          <p className="text-muted-foreground">
            Войдите через Telegram, чтобы начать тестирование
          </p>
        </div>
        <TelegramLogin />
      </div>
    </main>
  );
}
