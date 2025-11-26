// Layout 2: Table View Script
let currentFilter = 'all';
let searchTerm = '';

function init() {
    renderFilterTabs();
    renderTable();
    attachEventListeners();
}

function renderFilterTabs() {
    const container = document.getElementById('filterTabs');
    
    mockUsers.forEach(user => {
        const button = document.createElement('button');
        button.className = 'filter-tab';
        button.dataset.userId = user.id;
        button.textContent = user.name;
        container.appendChild(button);
    });
}

function renderTable() {
    const tbody = document.getElementById('deckTableBody');
    tbody.innerHTML = '';
    
    let filteredDecks = currentFilter === 'all' 
        ? mockDecks 
        : mockDecks.filter(d => d.userId == currentFilter);
    
    if (searchTerm) {
        filteredDecks = filteredDecks.filter(d => 
            d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.game.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    filteredDecks.forEach(deck => {
        const user = getUserById(deck.userId);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="deck-name-cell">${deck.name}</td>
            <td class="game-cell">${deck.game}</td>
            <td>
                <div class="owner-cell">
                    <span class="owner-avatar">${user.avatar}</span>
                    <span class="owner-name">${user.name}</span>
                </div>
            </td>
            <td class="card-count-cell">${deck.cardCount}</td>
            <td>
                <span class="format-badge">${deck.format}</span>
            </td>
            <td>
                <div class="color-indicators">
                    ${deck.colors.map(color => `<div class="color-indicator" style="background: ${color}"></div>`).join('')}
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update count
    document.getElementById('deckCount').textContent = `${filteredDecks.length} デッキ`;
}

function attachEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.userId;
            renderTable();
        });
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderTable();
    });
    
    // Add deck button
    document.getElementById('addDeckBtn').addEventListener('click', () => {
        alert('デッキ追加機能（モック）');
    });
}

document.addEventListener('DOMContentLoaded', init);
