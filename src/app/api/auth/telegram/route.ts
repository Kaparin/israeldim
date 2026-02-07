import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTelegramData, createToken, setSessionCookie } from "@/lib/auth";
import type { TelegramUser } from "@/types";

export async function POST(request: Request) {
  try {
    const data: TelegramUser = await request.json();

    const isValid = await verifyTelegramData(data);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid Telegram data" },
        { status: 401 }
      );
    }

    // Check auth_date is not too old (allow 1 day)
    const authAge = Math.floor(Date.now() / 1000) - data.auth_date;
    if (authAge > 86400) {
      return NextResponse.json(
        { error: "Auth data is too old" },
        { status: 401 }
      );
    }

    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(data.id) },
      update: {
        firstName: data.first_name,
        lastName: data.last_name || null,
        username: data.username || null,
        photoUrl: data.photo_url || null,
      },
      create: {
        telegramId: BigInt(data.id),
        firstName: data.first_name,
        lastName: data.last_name || null,
        username: data.username || null,
        photoUrl: data.photo_url || null,
      },
    });

    const token = await createToken(user.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set(setSessionCookie(token));
    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
