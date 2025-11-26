// Layout 1: Card Grid Script
let currentFilter = 'all';

function init() {
    renderUserFilters();
    renderGameStats();
    renderDecks();
    attachEventListeners();
}

function renderUserFilters() {
    const container = document.getElementById('userFilters');
    
    mockUsers.forEach(user => {
        const button = document.createElement('button');
        button.className = 'user-filter';
        button.dataset.userId = user.id;
        button.innerHTML = `
            <span class="user-avatar">${user.avatar}</span>
            <span class="user-name">${user.name}</span>
        `;
        container.appendChild(button);
    });
}

function renderGameStats() {
    const container = document.getElementById('gameStats');
    const stats = getGameStats();
    
    Object.entries(stats).forEach(([game, count]) => {
        const item = document.createElement('div');
        item.className = 'game-stat-item';
        item.innerHTML = `
            <span class="game-stat-name">${game}</span>
            <span class="game-stat-count">${count}</span>
        `;
        container.appendChild(item);
    });
}

function renderDecks() {
    const container = document.getElementById('deckGrid');
    container.innerHTML = '';
    
    const filteredDecks = currentFilter === 'all' 
        ? mockDecks 
        : mockDecks.filter(d => d.userId == currentFilter);
    
    filteredDecks.forEach(deck => {
        const user = getUserById(deck.userId);
        const card = document.createElement('div');
        card.className = 'deck-card';
        card.style.setProperty('--color-1', deck.colors[0]);
        card.style.setProperty('--color-2', deck.colors[1] || deck.colors[0]);
        
        card.innerHTML = `
            <div class="deck-card-header">
                <div>
                    <h3 class="deck-name">${deck.name}</h3>
                    <p class="deck-game">${deck.game}</p>
                </div>
                <div class="deck-colors">
                    ${deck.colors.map(color => `<div class="color-dot" style="background: ${color}"></div>`).join('')}
                </div>
            </div>
            <div class="deck-info">
                <div class="info-item">
                    <span class="info-label">枚数</span>
                    <span class="info-value">${deck.cardCount}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">フォーマット</span>
                    <span class="info-value">${deck.format}</span>
                </div>
            </div>
            <div class="deck-owner">
                <span class="owner-avatar">${user.avatar}</span>
                <span class="owner-name">${user.name}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

function attachEventListeners() {
    // User filter buttons
    document.querySelectorAll('.user-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.user-filter').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.userId;
            renderDecks();
        });
    });
    
    // Add deck button
    document.getElementById('addDeckBtn').addEventListener('click', () => {
        alert('デッキ追加機能（モック）');
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
