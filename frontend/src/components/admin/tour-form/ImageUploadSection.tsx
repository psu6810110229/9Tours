import React, { useCallback, useRef, useState } from 'react';

interface ImageUploadSectionProps {
  images: string[];
  uploadingImage: boolean;
  onFilesSelected: (files: File[]) => Promise<void>;
  onRemoveImage: (index: number) => void;
  onReorder: (from: number, to: number) => void;
}

interface UploadingSlot {
  id: string;
  name: string;
  progress: 'pending' | 'done' | 'error';
}

export default function ImageUploadSection({
  images,
  uploadingImage,
  onFilesSelected,
  onRemoveImage,
  onReorder,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<UploadingSlot[]>([]);
  const dragSrcIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  // ─── File drag-over zone handlers ────────────────────────────────────────
  const handleZoneDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDraggingOver(true);
  }, []);

  const handleZoneDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false);
  }, []);

  const handleZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type),
    );
    if (files.length === 0) return;
    await onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    await onFilesSelected(files);
  }, [onFilesSelected]);

  // ─── Image card drag-to-reorder handlers ─────────────────────────────────
  const handleCardDragStart = (e: React.DragEvent, index: number) => {
    dragSrcIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  };

  const handleCardDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    document.querySelectorAll('[data-img-card]').forEach((el) => {
      (el as HTMLElement).style.transform = '';
    });
  };

  const handleCardDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndexRef.current = index;
  };

  const handleCardDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIndex = dragSrcIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    dragSrcIndexRef.current = null;
    dragOverIndexRef.current = null;
  };

  const isUploading = uploadingImage || uploadingSlots.some((s) => s.progress === 'pending');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <span>🖼️</span> รูปภาพประกอบ
        </h2>
        <span className="text-sm text-gray-500">
          {images.length} รูป
          {images.length > 0 && (
            <span className="ml-2 text-xs text-gray-400">(ลากเพื่อเรียงลำดับ)</span>
          )}
        </span>
      </div>

      {/* ── Drop Zone ── */}
      <div
        onDragEnter={handleZoneDragEnter}
        onDragLeave={handleZoneDragLeave}
        onDragOver={handleZoneDragOver}
        onDrop={handleZoneDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative mb-4 flex min-h-[7rem] cursor-pointer flex-col items-center justify-center
          gap-2 rounded-2xl border-2 border-dashed px-6 py-6 text-center
          transition-all duration-200 select-none
          ${isDraggingOver
            ? 'border-yellow-400 bg-yellow-50 shadow-inner'
            : 'border-gray-300 bg-gray-50 hover:border-yellow-400 hover:bg-yellow-50/40'}
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        {isUploading ? (
          <>
            <div className="flex h-10 w-10 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-200 border-t-yellow-500" />
            </div>
            <p className="text-sm font-medium text-yellow-700">กำลังอัปโหลดรูปภาพ...</p>
          </>
        ) : isDraggingOver ? (
          <>
            <div className="text-4xl">📸</div>
            <p className="text-base font-semibold text-yellow-700">วางไฟล์ที่นี่</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">
              ☁️
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                ลากและวางรูปภาพ หรือ{' '}
                <span className="text-yellow-600 underline">คลิกเพื่อเลือก</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                รองรับ JPG, PNG, WebP · ไม่จำกัดจำนวน · ขนาดสูงสุด 10MB ต่อรูป
              </p>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />
      </div>

      {/* ── Image Grid ── */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((img, index) => (
            <div
              key={img + index}
              data-img-card
              draggable
              onDragStart={(e) => handleCardDragStart(e, index)}
              onDragEnd={handleCardDragEnd}
              onDragOver={(e) => handleCardDragOver(e, index)}
              onDrop={(e) => handleCardDrop(e, index)}
              className="group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
            >
              {/* Ordering badge */}
              <div className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white">
                {index + 1}
              </div>

              <img
                src={img}
                alt={`รูปที่ ${index + 1}`}
                draggable={false}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20" />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                title="ลบรูปภาพ"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-500 opacity-0 shadow transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Drag hint */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                ⠿ ลากเพื่อเรียง
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !isUploading && (
        <p className="mt-1 text-center text-xs text-gray-400">ยังไม่มีรูปภาพ — ลากหรือคลิกด้านบนเพื่อเพิ่ม</p>
      )}
    </div>
  );
}
