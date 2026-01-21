"use client";

import { useRef, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing-client";
import type { OurFileRouter } from "@/lib/uploadthing";

interface ImageUploadProps {
  endpoint: keyof OurFileRouter;
  onUploadComplete: (url: string) => void;
  currentImage?: string;
  className?: string;
}

export function ImageUpload({
  endpoint,
  onUploadComplete,
  currentImage,
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        onUploadComplete(res[0].url);
      }
      setIsUploading(false);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await startUpload([file]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt="Uploaded"
            className="max-h-40 rounded border border-gray-700"
          />
          <button
            type="button"
            onClick={() => onUploadComplete("")}
            className="absolute top-1 right-1 w-6 h-6 bg-red-600 rounded-full text-white text-xs hover:bg-red-500"
          >
            ×
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer hover:border-green-500 transition">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <>
              <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-300">Uploading...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-300">Choose Image</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

export function ImageUploadButton({
  endpoint,
  onUploadComplete,
}: {
  endpoint: keyof OurFileRouter;
  onUploadComplete: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing(endpoint, {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url) {
        onUploadComplete(res[0].url);
      }
      setIsUploading(false);
    },
    onUploadError: (error) => {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await startUpload([file]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm cursor-pointer transition">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />
      {isUploading ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Uploading...</span>
        </>
      ) : (
        <span>Choose Image</span>
      )}
    </label>
  );
}
