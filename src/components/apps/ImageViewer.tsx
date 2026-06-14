'use client';

import React, { useState, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface ImageItem {
  id: number;
  gradient: string;
  label: string;
}

const SAMPLE_IMAGES: ImageItem[] = [
  { id: 1, gradient: 'from-rose-500 to-orange-400', label: 'Sunset' },
  { id: 2, gradient: 'from-violet-600 to-indigo-500', label: 'Twilight' },
  { id: 3, gradient: 'from-emerald-500 to-teal-400', label: 'Forest' },
  { id: 4, gradient: 'from-cyan-500 to-blue-500', label: 'Ocean' },
  { id: 5, gradient: 'from-amber-400 to-yellow-300', label: 'Desert' },
  { id: 6, gradient: 'from-pink-500 to-rose-400', label: 'Blossom' },
  { id: 7, gradient: 'from-slate-600 to-zinc-800', label: 'Storm' },
  { id: 8, gradient: 'from-lime-500 to-green-600', label: 'Meadow' },
  { id: 9, gradient: 'from-fuchsia-600 to-purple-600', label: 'Aurora' },
  { id: 10, gradient: 'from-sky-400 to-cyan-300', label: 'Clear Sky' },
  { id: 11, gradient: 'from-orange-600 to-red-500', label: 'Ember' },
  { id: 12, gradient: 'from-teal-600 to-emerald-700', label: 'Depths' },
];

export default function ImageViewer() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleOpen = useCallback((index: number) => {
    setSelectedIndex(index);
    setZoom(1);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
    setZoom(1);
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) =>
      prev !== null ? (prev - 1 + SAMPLE_IMAGES.length) % SAMPLE_IMAGES.length : null
    );
    setZoom(1);
  }, []);

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) =>
      prev !== null ? (prev + 1) % SAMPLE_IMAGES.length : null
    );
    setZoom(1);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const isOpen = selectedIndex !== null;
  const currentImage = isOpen ? SAMPLE_IMAGES[selectedIndex!] : null;

  return (
    <div className="bg-zinc-900 text-white h-full select-none flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-sm font-medium">Photos</span>
        <span className="text-xs text-white/40">{SAMPLE_IMAGES.length} items</span>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_IMAGES.map((img, index) => (
            <div
              key={img.id}
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-amber-500 transition-all"
              onClick={() => handleOpen(index)}
            >
              <div
                className={`w-full h-full bg-gradient-to-br ${img.gradient} flex items-end justify-start p-2`}
              >
                <span className="text-[10px] font-medium text-white/80 drop-shadow-md">
                  {img.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full View Overlay */}
      {isOpen && currentImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={handleClose}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev arrow */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next arrow */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Image */}
          <div
            className="max-w-[80vw] max-h-[80vh] transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-[60vw] h-[60vh] max-w-[600px] max-h-[500px] bg-gradient-to-br ${currentImage.gradient} rounded-2xl flex items-end justify-start p-6 shadow-2xl`}
            >
              <div>
                <div className="text-xl font-semibold drop-shadow-md">{currentImage.label}</div>
                <div className="text-xs text-white/60 mt-1">
                  {selectedIndex! + 1} / {SAMPLE_IMAGES.length}
                </div>
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 rounded-full px-3 py-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
