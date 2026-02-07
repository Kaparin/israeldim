import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import { LandingClient } from "@/components/landing-client";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    const session = await verifyToken(token);
    if (session) redirect("/dashboard");
  }

  return <LandingClient />;
}
