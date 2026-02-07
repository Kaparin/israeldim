import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { text, sourceId, type } = (await request.json()) as {
      text: string;
      sourceId: string;
      type: string;
    };

    if (!text || !sourceId || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check cache first
    const cached = await prisma.translation.findUnique({
      where: { sourceId_type: { sourceId, type } },
    });

    if (cached) {
      return NextResponse.json({ translation: cached.translated });
    }

    // Call OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation service not configured" },
        { status: 503 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a translator. Translate the following Hebrew text to Russian. " +
              "This is from an electrician licensing exam in Israel. " +
              "Keep technical terms accurate. Output only the translation, nothing else.",
          },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      console.error("OpenAI error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const translation = data.choices?.[0]?.message?.content?.trim();

    if (!translation) {
      return NextResponse.json(
        { error: "Empty translation" },
        { status: 502 }
      );
    }

    // Cache the translation
    await prisma.translation.upsert({
      where: { sourceId_type: { sourceId, type } },
      create: { sourceId, type, original: text, translated: translation },
      update: { translated: translation },
    });

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Translate error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
