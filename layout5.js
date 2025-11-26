// Layout 5: Dashboard Script
function init() {
    renderStats();
    renderGameDistribution();
    renderPlayerList();
    renderDeckList();
    attachEventListeners();
}

function renderStats() {
    const totalCards = mockDecks.reduce((sum, deck) => sum + deck.cardCount, 0);
    const gameStats = getGameStats();
    
    document.getElementById('totalDecks').textContent = mockDecks.length;
    document.getElementById('totalUsers').textContent = mockUsers.length;
    document.getElementById('totalGames').textContent = Object.keys(gameStats).length;
    document.getElementById('totalCards').textContent = totalCards;
}

function renderGameDistribution() {
    const container = document.getElementById('gameList');
    const stats = getGameStats();
    
    Object.entries(stats).forEach(([game, count]) => {
        const item = document.createElement('div');
        item.className = 'game-item';
        
        item.innerHTML = `
            <span class="game-name">${game}</span>
            <span class="game-count">${count}</span>
        `;
        
        container.appendChild(item);
    });
}

function renderPlayerList() {
    const container = document.getElementById('playerList');
    
    mockUsers.forEach(user => {
        const deckCount = getDecksByUser(user.id).length;
        const item = document.createElement('div');
        item.className = 'player-item';
        
        item.innerHTML = `
            <div class="player-info">
                <div class="player-avatar">${user.avatar}</div>
                <span class="player-name">${user.name}</span>
            </div>
            <span class="player-deck-count">${deckCount}デッキ</span>
        `;
        
        container.appendChild(item);
    });
}

function renderDeckList() {
    const container = document.getElementById('deckList');
    
    mockDecks.forEach(deck => {
        const user = getUserById(deck.userId);
        const item = document.createElement('div');
        item.className = 'deck-item';
        item.style.borderLeftColor = deck.colors[0];
        
        const colorDots = deck.colors.map(color => 
            `<div class="color-dot" style="background: ${color}"></div>`
        ).join('');
        
        item.innerHTML = `
            <div class="deck-header">
                <span class="deck-name">${deck.name}</span>
                <div class="deck-colors">${colorDots}</div>
            </div>
            <div class="deck-meta">
                <span class="meta-text">${deck.game}</span>
                <span class="meta-text">•</span>
                <span class="meta-text">${deck.cardCount}枚</span>
                <span class="meta-text">•</span>
                <span class="meta-text">${deck.format}</span>
            </div>
            <div class="deck-owner">所有: ${user.name}</div>
        `;
        
        container.appendChild(item);
    });
}

function attachEventListeners() {
    document.getElementById('addDeckBtn').addEventListener('click', () => {
        alert('デッキ追加機能（モック）');
    });
}

document.addEventListener('DOMContentLoaded', init);
