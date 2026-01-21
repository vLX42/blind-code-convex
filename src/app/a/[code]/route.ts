import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const asset = await convex.query(api.assets.getAssetByShortCode, {
      shortCode: code,
    });

    if (!asset) {
      return new NextResponse("Asset not found", { status: 404 });
    }

    // Redirect to the actual asset URL
    return NextResponse.redirect(asset.url, {
      status: 302,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Asset proxy error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
