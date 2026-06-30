import { useRef, useState } from 'react';
import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.taplab.in';

interface ImageUploadHelperProps {
  slug: string;
}

export default function ImageUploadHelper({ slug }: ImageUploadHelperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    setUploadedUrl(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/dev/jobs/${slug}/upload-media`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? 'Upload failed');
        return;
      }

      const { url } = await res.json();
      setUploadedUrl(url);
    } catch {
      setError('Network error — try again');
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl() {
    if (!uploadedUrl) return;
    await navigator.clipboard.writeText(uploadedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload image to R2</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Uploading…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
        {uploadedUrl && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <code className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate flex-1">
              {uploadedUrl}
            </code>
            <button
              onClick={copyUrl}
              className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-[#2087e6] dark:text-blue-400 rounded font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
