import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface TelegramUpdate {
  message?: {
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    text?: string;
  };
}

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const from = message.from;

    // Handle /start auth_TOKEN
    if (text.startsWith("/start auth_")) {
      const token = text.replace("/start auth_", "").trim();

      if (!token) {
        await sendMessage(from.id, "Неверная ссылка авторизации. Попробуйте ещё раз на сайте.");
        return NextResponse.json({ ok: true });
      }

      const authToken = await prisma.authToken.findUnique({
        where: { token },
      });

      if (!authToken) {
        await sendMessage(from.id, "Ссылка авторизации не найдена или истекла. Попробуйте ещё раз на сайте.");
        return NextResponse.json({ ok: true });
      }

      if (authToken.confirmed) {
        await sendMessage(from.id, "Вы уже авторизованы!");
        return NextResponse.json({ ok: true });
      }

      if (authToken.expiresAt < new Date()) {
        await sendMessage(from.id, "Ссылка авторизации истекла. Попробуйте ещё раз на сайте.");
        return NextResponse.json({ ok: true });
      }

      // Confirm the token with user data
      await prisma.authToken.update({
        where: { token },
        data: {
          confirmed: true,
          telegramId: BigInt(from.id),
          firstName: from.first_name,
          lastName: from.last_name || null,
          username: from.username || null,
        },
      });

      await sendMessage(from.id, `Авторизация подтверждена! Возвращайтесь на сайт, ${from.first_name}.`);
      return NextResponse.json({ ok: true });
    }

    // Handle plain /start
    if (text === "/start") {
      await sendMessage(
        from.id,
        "Привет! Я бот для авторизации на Quiz Platform.\n\nДля входа нажмите кнопку на сайте — вам придёт ссылка для подтверждения."
      );
      return NextResponse.json({ ok: true });
    }

    // Any other message
    await sendMessage(from.id, "Используйте кнопку авторизации на сайте для входа.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Bot webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}

async function sendMessage(chatId: number, text: string) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) return;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}
