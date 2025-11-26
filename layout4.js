// Layout 4: Sidebar Navigation Script
let currentFilter = 'all';
let viewMode = 'grid';

function init() {
    renderUserNav();
    renderDecks();
    attachEventListeners();
}

function renderUserNav() {
    const nav = document.getElementById('userNav');
    
    mockUsers.forEach(user => {
        const userDecks = getDecksByUser(user.id);
        const item = document.createElement('li');
        item.className = 'nav-item';
        item.dataset.userId = user.id;
        
        item.innerHTML = `
            <span class="nav-icon">${user.avatar}</span>
            <span class="nav-label">${user.name}</span>
            <span class="nav-badge">${userDecks.length}</span>
        `;
        
        nav.appendChild(item);
    });
}

function renderDecks() {
    const container = document.getElementById('deckDisplay');
    container.innerHTML = '';
    container.className = viewMode === 'grid' ? 'deck-display' : 'deck-display list-view';
    
    const filteredDecks = currentFilter === 'all' 
        ? mockDecks 
        : mockDecks.filter(d => d.userId == currentFilter);
    
    filteredDecks.forEach(deck => {
        const user = getUserById(deck.userId);
        const item = document.createElement('div');
        item.className = 'deck-item';
        item.dataset.deckId = deck.id;
        item.style.setProperty('--color-1', deck.colors[0]);
        item.style.setProperty('--color-2', deck.colors[1] || deck.colors[0]);
        
        item.innerHTML = `
            <h3 class="deck-item-name">${deck.name}</h3>
            <p class="deck-item-game">${deck.game}</p>
            <div class="deck-item-stats">
                <div class="stat">
                    <span class="stat-label">枚数</span>
                    <span class="stat-value">${deck.cardCount}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">フォーマット</span>
                    <span class="stat-value">${deck.format}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">所有者</span>
                    <span class="stat-value">${user.name}</span>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    updateHeader(filteredDecks.length);
}

function updateHeader(count) {
    const title = currentFilter === 'all' ? 'すべてのデッキ' : getUserById(parseInt(currentFilter)).name;
    document.getElementById('contentTitle').textContent = title;
    document.getElementById('contentSubtitle').textContent = `${count}個のデッキ`;
    document.getElementById('allCount').textContent = mockDecks.length;
}

function attachEventListeners() {
    // Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.userId;
            renderDecks();
        });
    });
    
    // View toggle
    document.getElementById('gridView').addEventListener('click', () => {
        viewMode = 'grid';
        document.getElementById('gridView').classList.add('active');
        document.getElementById('listView').classList.remove('active');
        renderDecks();
    });
    
    document.getElementById('listView').addEventListener('click', () => {
        viewMode = 'list';
        document.getElementById('listView').classList.add('active');
        document.getElementById('gridView').classList.remove('active');
        renderDecks();
    });
    
    // Add deck button
    document.getElementById('addDeckBtn').addEventListener('click', () => {
        alert('デッキ追加機能（モック）');
    });
    
    // Close panel
    document.getElementById('closePanel').addEventListener('click', () => {
        document.getElementById('rightPanel').classList.remove('open');
    });
}

document.addEventListener('DOMContentLoaded', init);
