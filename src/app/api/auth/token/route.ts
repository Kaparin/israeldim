import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST() {
  try {
    const token = randomBytes(16).toString("hex");

    await prisma.authToken.create({
      data: {
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    });

    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "israeldim_bot";
    const deepLink = `https://t.me/${botUsername}?start=auth_${token}`;

    return NextResponse.json({ token, deepLink });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
