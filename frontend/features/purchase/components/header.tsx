interface HeaderProps {
  cardCount: number;
  selectedCount: number;
}

export function Header({ cardCount, selectedCount }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
      <div className="p-4">
        <h1 className="text-xl font-bold text-white mb-2">カード購入管理</h1>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>カード数: {cardCount}</span>
          <span>選択済み: {selectedCount}</span>
        </div>
      </div>
    </header>
  );
}
