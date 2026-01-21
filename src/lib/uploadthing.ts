import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  // For uploading reference images for games
  referenceImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    console.log("Reference image uploaded:", file.url);
    return { url: file.url };
  }),

  // For uploading game assets (images, etc.)
  gameAsset: f({
    image: { maxFileSize: "4MB", maxFileCount: 4 },
    blob: { maxFileSize: "4MB", maxFileCount: 4 },
  }).onUploadComplete(async ({ file }) => {
    console.log("Asset uploaded:", file.url);
    return { url: file.url };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
