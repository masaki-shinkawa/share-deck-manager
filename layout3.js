// Layout 3: Kanban Board Script
let groupBy = 'user'; // 'user' or 'game'

function init() {
    renderKanban();
    attachEventListeners();
}

function renderKanban() {
    const container = document.getElementById('kanbanBoard');
    container.innerHTML = '';
    
    if (groupBy === 'user') {
        renderByUser(container);
    } else {
        renderByGame(container);
    }
}

function renderByUser(container) {
    mockUsers.forEach(user => {
        const userDecks = getDecksByUser(user.id);
        const column = createColumn(user.name, user.avatar, userDecks);
        container.appendChild(column);
    });
}

function renderByGame(container) {
    const games = [...new Set(mockDecks.map(d => d.game))];
    
    games.forEach(game => {
        const gameDecks = mockDecks.filter(d => d.game === game);
        const column = createColumn(game, '🎮', gameDecks);
        container.appendChild(column);
    });
}

function createColumn(title, avatar, decks) {
    const column = document.createElement('div');
    column.className = 'kanban-column';
    
    const cardsHtml = decks.map(deck => createDeckCardHtml(deck)).join('');
    
    column.innerHTML = `
        <div class="column-header">
            <div class="column-title-wrapper">
                <div class="column-avatar">${avatar}</div>
                <h2 class="column-title">${title}</h2>
            </div>
            <div class="column-count">${decks.length}</div>
        </div>
        <div class="column-cards">
            ${cardsHtml}
        </div>
        <button class="add-card-btn">+ デッキを追加</button>
    `;
    
    return column;
}

function createDeckCardHtml(deck) {
    const user = getUserById(deck.userId);
    const colorDots = deck.colors.map(color => 
        `<div class="color-dot" style="background: ${color}"></div>`
    ).join('');
    
    return `
        <div class="deck-card" style="--color-1: ${deck.colors[0]}; --color-2: ${deck.colors[1] || deck.colors[0]}">
            <div class="deck-header">
                <h3 class="deck-name">${deck.name}</h3>
                <p class="deck-game">${deck.game}</p>
            </div>
            <div class="deck-meta">
                <div class="meta-item">
                    <span class="meta-label">枚数</span>
                    <span class="meta-value">${deck.cardCount}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">フォーマット</span>
                    <span class="meta-value">${deck.format}</span>
                </div>
            </div>
            <div class="deck-colors">
                ${colorDots}
            </div>
        </div>
    `;
}

function attachEventListeners() {
    document.getElementById('groupByUser').addEventListener('click', () => {
        groupBy = 'user';
        document.getElementById('groupByUser').classList.add('active');
        document.getElementById('groupByGame').classList.remove('active');
        renderKanban();
    });
    
    document.getElementById('groupByGame').addEventListener('click', () => {
        groupBy = 'game';
        document.getElementById('groupByGame').classList.add('active');
        document.getElementById('groupByUser').classList.remove('active');
        renderKanban();
    });
}

document.addEventListener('DOMContentLoaded', init);
