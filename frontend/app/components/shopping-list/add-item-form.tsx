'use client';

import { useState } from 'react';

interface AddItemFormProps {
  onAdd: (name: string, quantity: number) => void;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), quantity);
      setName('');
      setQuantity(1);
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        + カードを追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-sm text-gray-400 mb-1">カード名</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="カード名を入力"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">数量</label>
        <input
          type="number"
          min="1"
          max="10"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
