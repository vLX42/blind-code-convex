import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        new URL(`/?error=${tokenData.error}`, request.url)
      );
    }

    // Get user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const githubUser = await userResponse.json();

    // Get user email
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const emails = await emailsResponse.json();
    const primaryEmail = emails.find((e: { primary: boolean }) => e.primary)?.email;

    // Create or update user in Convex
    const userId = await convex.mutation(api.auth.upsertUser, {
      githubId: String(githubUser.id),
      username: githubUser.login,
      name: githubUser.name || undefined,
      avatarUrl: githubUser.avatar_url || undefined,
      email: primaryEmail || undefined,
    });

    // Create a session response
    const userData = {
      id: userId,
      githubId: String(githubUser.id),
      username: githubUser.login,
      name: githubUser.name,
      avatarUrl: githubUser.avatar_url,
    };

    // Redirect to home with user data in URL (will be stored in localStorage by client)
    const userParam = encodeURIComponent(JSON.stringify(userData));
    return NextResponse.redirect(
      new URL(`/?auth_success=true&user=${userParam}`, request.url)
    );
  } catch (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(new URL("/?error=auth_failed", request.url));
  }
}
