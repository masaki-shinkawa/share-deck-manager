'use client';

import { useState, useEffect } from 'react';

interface AddStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, color: string) => void;
}

// Predefined color palette for good contrast and visibility
const STORE_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
];

function getRandomColor(): string {
  return STORE_COLORS[Math.floor(Math.random() * STORE_COLORS.length)];
}

export function AddStoreDialog({ open, onOpenChange, onAdd }: AddStoreDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(getRandomColor());

  useEffect(() => {
    if (open) {
      setName('');
      setColor(getRandomColor());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), color);
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">ショップを追加</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ショップ名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ショップ名を入力"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">カラー</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <span className="text-white text-sm">{color}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
