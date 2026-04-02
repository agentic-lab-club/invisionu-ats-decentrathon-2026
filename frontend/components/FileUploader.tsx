// components/FileUploader.tsx
'use client';

import { useState } from 'react';
import { Upload, CheckCircle2, Loader2, X } from 'lucide-react';
import { getAccessToken } from '@/lib/auth';

interface FileUploaderProps {
  fileType: string;
  label: string;
  onFileIdReceived: (fileId: string) => void;
  existingFileId?: string;
  accept?: string;
  hint?: string;
}

export function FileUploader({ 
  fileType, 
  label, 
  onFileIdReceived, 
  existingFileId, 
  accept = '*/*',
  hint 
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileId, setFileId] = useState(existingFileId || '');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const token = getAccessToken();
    if (!token) {
      setError('You are not logged in.');
      setUploading(false);
      return;
    }

    // Используем проксированный путь вместо прямого URL
    const url = '/api/backend/assets';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setFileId(data.file_id);
      onFileIdReceived(data.file_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFileId('');
    onFileIdReceived('');
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id={`file-${fileType}`}
        />
        <label
          htmlFor={`file-${fileType}`}
          className={`flex items-center gap-3 w-full border border-dashed rounded-lg py-4 px-4 cursor-pointer transition-all bg-white group ${
            uploading ? 'opacity-50 cursor-wait' : 'hover:border-[#b5e220] hover:bg-[#b5e220]/5'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : fileId ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Upload className="w-5 h-5 text-gray-300 group-hover:text-[#8aaa18]" />
          )}
          <div className="flex-1">
            <p className="text-sm">
              {fileId ? (
                <span className="text-emerald-600 font-medium">File uploaded: {fileId.slice(0, 8)}...</span>
              ) : uploading ? (
                <span className="text-gray-500">Uploading...</span>
              ) : (
                <span className="text-gray-400">Click to upload or drag and drop</span>
              )}
            </p>
            {hint && <p className="text-xs text-gray-300 mt-0.5">{hint}</p>}
          </div>
          {fileId && !uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}