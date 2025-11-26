// モックデータ
const mockUsers = [
    { id: 1, name: "田中太郎", avatar: "👤" },
    { id: 2, name: "佐藤花子", avatar: "👤" },
    { id: 3, name: "鈴木一郎", avatar: "👤" },
    { id: 4, name: "高橋美咲", avatar: "👤" }
];

const mockDecks = [
    { id: 1, name: "青白コントロール", game: "マジック:ザ・ギャザリング", userId: 1, cardCount: 60, format: "スタンダード", colors: ["#4A90E2", "#FFFFFF"] },
    { id: 2, name: "赤単アグロ", game: "マジック:ザ・ギャザリング", userId: 1, cardCount: 60, format: "スタンダード", colors: ["#E74C3C"] },
    { id: 3, name: "ピカチュウVMAX", game: "ポケモンカード", userId: 2, cardCount: 60, format: "スタンダード", colors: ["#F4D03F"] },
    { id: 4, name: "ドラゴンリンク", game: "遊戯王", userId: 2, cardCount: 40, format: "メイン", colors: ["#8E44AD", "#E74C3C"] },
    { id: 5, name: "緑単ランプ", game: "マジック:ザ・ギャザリング", userId: 3, cardCount: 60, format: "モダン", colors: ["#27AE60"] },
    { id: 6, name: "ミュウツーEX", game: "ポケモンカード", userId: 3, cardCount: 60, format: "エクストラ", colors: ["#9B59B6"] },
    { id: 7, name: "エルドリッチ", game: "遊戯王", userId: 4, cardCount: 40, format: "メイン", colors: ["#F39C12", "#34495E"] },
    { id: 8, name: "黒緑ミッドレンジ", game: "マジック:ザ・ギャザリング", userId: 4, cardCount: 60, format: "モダン", colors: ["#2C3E50", "#27AE60"] },
    { id: 9, name: "ロストボックス", game: "ポケモンカード", userId: 1, cardCount: 60, format: "スタンダード", colors: ["#E74C3C", "#3498DB"] },
    { id: 10, name: "烙印デスピア", game: "遊戯王", userId: 3, cardCount: 40, format: "エクストラ", colors: ["#E74C3C", "#FFFFFF"] }
];

// ユーティリティ関数
function getUserById(userId) {
    return mockUsers.find(u => u.id === userId);
}

function getDecksByUser(userId) {
    return mockDecks.filter(d => d.userId === userId);
}

function getGameStats() {
    const stats = {};
    mockDecks.forEach(deck => {
        stats[deck.game] = (stats[deck.game] || 0) + 1;
    });
    return stats;
}
