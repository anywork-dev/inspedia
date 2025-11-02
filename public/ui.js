// UI Rendering and DOM Manipulation Functions

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format response text with markdown-like formatting
 */
export function formatResponse(text) {
    text = escapeHtml(text);
    text = text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^\*<>]+)\*/g, (match, content) => {
        if (content.includes('<strong>') || content.includes('</strong>')) {
            return match;
        }
        return '<em>' + content + '</em>';
    });
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-sky-600 underline">$1</a>');
    return text;
}

/**
 * Render the current card in The Deck
 */
export function renderCurrentCard(cardContent, card) {
    cardContent.innerHTML = `
        <h2 class="text-xl font-bold text-gray-800 mb-4">${escapeHtml(card.title)}</h2>
        <p class="text-gray-700 mb-4">${escapeHtml(card.summary)}</p>
        <div class="flex flex-wrap gap-2 mb-2">
            ${card.tags ? card.tags.map(tag => 
                `<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">${escapeHtml(tag)}</span>`
            ).join('') : ''}
        </div>
        <div class="text-xs text-gray-500 mt-4">Source: ${escapeHtml(card.source || 'Unknown')}</div>
        ${card.sources && card.sources.length > 0 ? `
            <div class="mt-4">
                <h3 class="text-sm font-semibold text-gray-800 mb-2">Sources</h3>
                <ul class="space-y-1">
                    ${card.sources.map(source => `
                        <li>
                            <a href="${source.url}" target="_blank" class="text-sky-600 underline text-sm">${escapeHtml(source.title)}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
    `;
    cardContent.classList.add('fade-in');
}

/**
 * Render the collection grid
 */
export function renderCollection(collectionGrid, pinnedCards, selectedCardIds, onCardClick) {
    if (pinnedCards.length === 0) {
        collectionGrid.innerHTML = `
            <div class="text-center text-gray-500 py-12">
                <div class="mb-4">
                    <svg class="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">No Ideas Yet</h3>
                <p class="text-gray-600 mb-4">Your saved ideas will appear here.</p>
                <a href="#" id="goToDeckLink" class="inline-block px-6 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition">
                    ✨ Discover Ideas
                </a>
            </div>
        `;
        
        // Add click handler for the link
        const goToDeckLink = document.getElementById('goToDeckLink');
        if (goToDeckLink) {
            goToDeckLink.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('navDeck').click();
            });
        }
        return;
    }

    collectionGrid.innerHTML = pinnedCards.map(card => `
        <div class="card bg-white rounded-lg shadow-md p-4 cursor-pointer border-2 ${selectedCardIds.has(card.id) ? 'border-sky-500 bg-sky-50' : 'border-transparent'}"
             data-card-id="${card.id}">
            <h3 class="text-lg font-bold text-gray-800 mb-2">${escapeHtml(card.title)}</h3>
            <p class="text-gray-700 text-sm mb-3">${escapeHtml(card.summary)}</p>
            <div class="flex flex-wrap gap-1 mb-2">
                ${card.tags ? card.tags.slice(0, 3).map(tag =>
                    `<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">${escapeHtml(tag)}</span>`
                ).join('') : ''}
            </div>
            <div class="text-xs text-gray-400">Source: ${escapeHtml(card.source || 'Unknown')}</div>
            ${card.sources && card.sources.length > 0 ? `<div class="text-xs text-gray-400 mt-1">${card.sources.length} sources</div>` : ''}
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('[data-card-id]').forEach(cardEl => {
        cardEl.addEventListener('click', () => onCardClick(cardEl));
    });
}

/**
 * Add a chat message to the chat interface
 */
export function addChatMessage(chatMessages, content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3 fade-in';
    messageDiv.dataset.messageId = Date.now();

    if (type === 'user') {
        messageDiv.classList.add('flex-row-reverse', 'space-x-reverse');
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                U
            </div>
            <div class="bg-blue-500 text-white rounded-lg p-4 max-w-3xl">
                ${escapeHtml(content)}
            </div>
        `;
    } else if (type === 'error') {
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                !
            </div>
            <div class="bg-red-100 border border-red-400 text-red-700 rounded-lg p-4 max-w-3xl">
                ${escapeHtml(content)}
            </div>
        `;
    } else if (type === 'success') {
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                ✓
            </div>
            <div class="bg-green-100 border border-green-400 text-green-700 rounded-lg p-4 max-w-3xl">
                ${escapeHtml(content)}
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                AI
            </div>
            <div class="bg-gray-50 rounded-lg p-4 max-w-3xl">
                ${formatResponse(content)}
            </div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv.dataset.messageId;
}

/**
 * Add a loading message indicator
 */
export function addLoadingMessage(chatMessages) {
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.dataset.messageId = loadingId;
    loadingDiv.className = 'flex items-start space-x-3';
    loadingDiv.innerHTML = `
        <div class="flex-shrink-0 w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            AI
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center space-x-2">
                <div class="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <span class="text-gray-700">Thinking...</span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return loadingId;
}

/**
 * Remove a message by ID
 */
export function removeMessage(chatMessages, messageId) {
    const message = chatMessages.querySelector(`[data-message-id="${messageId}"]`);
    if (message) {
        message.remove();
    }
}

/**
 * Update the collection count badge
 */
export function updateCollectionCount(collectionCount, count) {
    collectionCount.textContent = count;
}

/**
 * Show a notification toast
 */
export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const icon = type === 'success' ? '' : '❌ ';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in`;
    notification.textContent = icon + message;
    document.body.appendChild(notification);
    const duration = type === 'success' ? 3000 : 5000;
    setTimeout(() => notification.remove(), duration);
}

/**
 * Show screen and hide others
 */
export function showScreen(screen, screens) {
    Object.values(screens).forEach(el => el.classList.add('hidden'));
    screens[screen].classList.remove('hidden');
}
