import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// Extract file key from UploadThing URL
function extractFileKey(url: string): string | null {
  try {
    // UploadThing URLs typically look like:
    // https://utfs.io/f/<fileKey>
    // or https://<appId>.ufs.sh/f/<fileKey>
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const fIndex = pathParts.indexOf("f");
    const key = pathParts[fIndex + 1];
    if (fIndex !== -1 && key) {
      return key;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "urls array is required" },
        { status: 400 },
      );
    }

    // Extract file keys from URLs
    const fileKeys = urls
      .map(extractFileKey)
      .filter((key): key is string => key !== null);

    if (fileKeys.length === 0) {
      return NextResponse.json({
        deleted: 0,
        message: "No valid file keys found",
      });
    }

    // Delete files from UploadThing
    const result = await utapi.deleteFiles(fileKeys);

    return NextResponse.json({
      deleted: fileKeys.length,
      result,
    });
  } catch (error) {
    console.error("Failed to delete files:", error);
    return NextResponse.json(
      { error: "Failed to delete files" },
      { status: 500 },
    );
  }
}
