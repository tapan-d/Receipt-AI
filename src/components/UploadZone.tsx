'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadZone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const upload = useCallback(async (file: File) => {
    setStatus('uploading');
    setMessage('Extracting receipt data...');
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/receipts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStatus('done');
      setMessage(`Receipt saved! Redirecting...`);
      setTimeout(() => router.push(`/receipts/${data.id}`), 1200);
    } catch (err) {
      setStatus('error');
      setMessage(String(err));
    }
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-blue-200">
        <div className="animate-spin text-4xl mb-3">⏳</div>
        <p className="text-blue-600 font-medium">{message}</p>
        <p className="text-sm text-gray-400 mt-1">This may take a few seconds...</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-green-50 rounded-xl border-2 border-green-200">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-green-700 font-medium">{message}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-xl border-2 border-red-200">
        <div className="text-4xl mb-3">❌</div>
        <p className="text-red-700 font-medium">Upload failed</p>
        <p className="text-sm text-red-500 mt-1">{message}</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
        isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50'
      }`}
    >
      <div className="text-4xl mb-3">📷</div>
      <p className="font-medium text-gray-700">Drop a receipt image here</p>
      <p className="text-sm text-gray-400 mt-1">or click to browse</p>
      <label className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm cursor-pointer">
        Choose File
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </label>
      <p className="text-xs text-gray-400 mt-3">Supports JPG, PNG, WebP</p>
    </div>
  );
}
