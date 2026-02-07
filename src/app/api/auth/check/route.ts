import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const authToken = await prisma.authToken.findUnique({
      where: { token },
    });

    if (!authToken) {
      return NextResponse.json({ confirmed: false, error: "not_found" });
    }

    if (authToken.expiresAt < new Date()) {
      return NextResponse.json({ confirmed: false, error: "expired" });
    }

    if (!authToken.confirmed || !authToken.telegramId) {
      return NextResponse.json({ confirmed: false });
    }

    // Token is confirmed — create/update user and set session
    const user = await prisma.user.upsert({
      where: { telegramId: authToken.telegramId },
      update: {
        firstName: authToken.firstName || "User",
        lastName: authToken.lastName,
        username: authToken.username,
      },
      create: {
        telegramId: authToken.telegramId,
        firstName: authToken.firstName || "User",
        lastName: authToken.lastName,
        username: authToken.username,
      },
    });

    const jwt = await createToken(user.id);

    // Clean up used token
    await prisma.authToken.delete({ where: { token } });

    const response = NextResponse.json({ confirmed: true });
    response.cookies.set(setSessionCookie(jwt));
    return response;
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
