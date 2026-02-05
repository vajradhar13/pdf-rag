"use client";

import { Upload, FileText } from "lucide-react";
import { useState, useCallback, useRef } from "react";

interface WelcomeScreenProps {
  onDocumentUpload?: (fileName: string) => void;
  onError?: (error: string) => void;
}

export function WelcomeScreen({
  onDocumentUpload,
  onError,
}: WelcomeScreenProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Validate PDF
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        const msg = "Please upload a PDF file";
        setError(msg);
        onError?.(msg);
        return;
      }

      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload/pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        setUploadedFile(file.name);
        onDocumentUpload?.(file.name);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Upload failed";
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [onDocumentUpload, onError],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleUpload(files[0]);
      }
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUpload(e.target.files[0]);
      }
    },
    [handleUpload],
  );

  if (uploadedFile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-gray-900 via-gray-900 to-black px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Document Ready</h2>
          <p className="text-gray-400">
            <span className="font-medium text-white">{uploadedFile}</span> has
            been added to your knowledge base.
          </p>
          <p className="text-sm text-gray-500">
            Start asking questions below to get insights from your document.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-gray-900 via-gray-900 to-black px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mt-4">
            Document Assistant
          </h1>
          <p className="text-gray-400">
            Upload a PDF to start asking questions
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-xl p-8 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-200 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-3">
            {isUploading ? (
              <>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-lg bg-gray-800 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">
                    Drag and drop your PDF
                  </p>
                  <p className="text-gray-500 text-sm">or click to browse</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>PDF files only • Max 4MB</p>
          <p>Your data is processed securely</p>
        </div>
      </div>
    </div>
  );
}
