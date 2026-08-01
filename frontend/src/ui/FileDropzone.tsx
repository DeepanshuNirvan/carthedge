import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { uploadFile } from '@/api/uploads';
import { toast } from '@/store/ui';
import { Spinner } from './Spinner';

type FileDropzoneProps = {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
};

export function FileDropzone({ images, onChange, max = 6 }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files)
          .slice(0, max - images.length)
          .map(uploadFile),
      );
      onChange([...images, ...urls]);
    } catch (e) {
      toast('error', 'Upload failed', e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {images.map((url, i) => (
        <div key={url} className="group relative size-24 overflow-hidden rounded-md hairline">
          <img src={url} alt={`Upload ${i + 1}`} className="size-full object-cover" />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onChange(images.filter((u) => u !== url))}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white transition-opacity duration-micro [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      {images.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            upload(e.dataTransfer.files);
          }}
          className={cn(
            'flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-mid transition-colors duration-micro hover:border-jade-500 hover:text-jade-ink',
            dragging && 'border-jade-500 bg-jade-500/5 text-jade-ink',
          )}
        >
          {uploading ? <Spinner className="size-5" /> : <ImagePlus className="size-5" />}
          {uploading ? 'Uploading…' : 'Add image'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
