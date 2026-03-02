'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';

interface ImageUploaderProps {
  value?: { url: string; key: string };
  onChange: (value: { url: string; key: string } | undefined) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }
        const data = await res.json();
        onChange({ url: data.url, key: data.key });
        showToast('Image uploaded', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  if (value) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value.url} alt="Upload preview" className="max-h-60 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 rounded-full p-1.5 shadow"
          aria-label="Remove image"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive ? 'border-reddit-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300',
        uploading && 'pointer-events-none opacity-60'
      )}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Uploading...</p>
        </div>
      ) : (
        <>
          <div className="text-3xl mb-2">🖼️</div>
          <p className="text-sm text-gray-600 font-medium">
            {isDragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP · Max 20 MB</p>
        </>
      )}
    </div>
  );
}
