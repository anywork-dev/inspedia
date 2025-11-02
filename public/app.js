// Main Application Logic
import { encode, decode } from './toon-lib.js';
import { callGeminiAPI, fetchHnSources } from './api.js';
import { 
    renderCurrentCard, 
    renderCollection, 
    addChatMessage, 
    addLoadingMessage, 
    removeMessage,
    updateCollectionCount,
    showNotification,
    showScreen,
    escapeHtml
} from './ui.js';

// Application State
class AppState {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.currentCard = null;
        this.pinnedCards = JSON.parse(localStorage.getItem('pinned_cards') || '[]');
        this.selectedCardIds = new Set();
        this.conversationHistory = [];
        this.contextCards = [];
    }

    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
    }

    addPinnedCard(card) {
        this.pinnedCards.push(card);
        localStorage.setItem('pinned_cards', JSON.stringify(this.pinnedCards));
    }

    toggleCardSelection(cardId) {
        if (this.selectedCardIds.has(cardId)) {
            this.selectedCardIds.delete(cardId);
            return false;
        } else {
            this.selectedCardIds.add(cardId);
            return true;
        }
    }

    getSelectedCards() {
        return this.pinnedCards.filter(card => this.selectedCardIds.has(card.id));
    }

    resetBrainstormSession() {
        this.conversationHistory = [];
    }
}

// Main Application Class
export class InspediaApp {
    constructor() {
        this.state = new AppState();
        this.dom = {};
        this.screens = {};
    }

    /**
     * Initialize the application
     */
    init() {
        this.cacheDOMElements();
        this.setupEventListeners();
        this.initializeUI();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheDOMElements() {
        // Modals
        this.dom.apiKeyModal = document.getElementById('apiKeyModal');
        this.dom.apiKeyInput = document.getElementById('apiKeyInput');
        this.dom.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.dom.apiKeyError = document.getElementById('apiKeyError');

        // Navigation
        this.dom.navDeck = document.getElementById('navDeck');
        this.dom.navCollection = document.getElementById('navCollection');
        this.dom.collectionCount = document.getElementById('collectionCount');

        // Screens
        this.screens.deck = document.getElementById('deckScreen');
        this.screens.collection = document.getElementById('collectionScreen');
        this.screens.workbench = document.getElementById('workbenchScreen');

        // The Deck
        this.dom.cardContent = document.getElementById('cardContent');
        this.dom.nextCardBtn = document.getElementById('nextCardBtn');
        this.dom.pinCardBtn = document.getElementById('pinCardBtn');

        // The Collection
        this.dom.collectionGrid = document.getElementById('collectionGrid');
        this.dom.brainstormBtn = document.getElementById('brainstormBtn');

        // The Workbench
        this.dom.chatMessages = document.getElementById('chatMessages');
        this.dom.chatForm = document.getElementById('chatForm');
        this.dom.userInput = document.getElementById('userInput');
        this.dom.sendBtn = document.getElementById('sendBtn');
        this.dom.saveNewIdeaBtn = document.getElementById('saveNewIdeaBtn');
        this.dom.exitWorkbenchBtn = document.getElementById('exitWorkbenchBtn');
        this.dom.contextCardsDiv = document.getElementById('contextCards');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // API Key Modal
        this.dom.saveApiKeyBtn.addEventListener('click', () => this.handleSaveApiKey());

        // Navigation
        this.dom.navDeck.addEventListener('click', () => this.navigateTo('deck'));
        this.dom.navCollection.addEventListener('click', () => this.navigateTo('collection'));
        this.dom.exitWorkbenchBtn.addEventListener('click', () => this.navigateTo('collection'));

        // The Deck
        this.dom.nextCardBtn.addEventListener('click', () => this.handleNextCard());
        this.dom.pinCardBtn.addEventListener('click', () => this.handlePinCard());

        // The Collection
        this.dom.brainstormBtn.addEventListener('click', () => this.handleBrainstorm());

        // The Workbench
        this.dom.chatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));
        this.dom.saveNewIdeaBtn.addEventListener('click', () => this.handleSaveNewIdea());
    }

    /**
     * Initialize UI state
     */
    initializeUI() {
        if (this.state.apiKey) {
            this.dom.apiKeyModal.style.display = 'none';
        }
        updateCollectionCount(this.dom.collectionCount, this.state.pinnedCards.length);
    }

    /**
     * Handle API key save
     */
    handleSaveApiKey() {
        const key = this.dom.apiKeyInput.value.trim();
        if (key) {
            this.state.saveApiKey(key);
            this.dom.apiKeyModal.style.display = 'none';
            this.dom.apiKeyError.classList.add('hidden');
        } else {
            this.dom.apiKeyError.classList.remove('hidden');
        }
    }

    /**
     * Navigate to a screen
     */
    navigateTo(screen) {
        showScreen(screen, this.screens);
        if (screen === 'collection') {
            this.renderCollectionScreen();
        }
    }

    /**
     * Handle next card button
     */
    async handleNextCard() {
        if (!this.state.apiKey) {
            this.dom.apiKeyModal.style.display = 'flex';
            return;
        }

        this.dom.nextCardBtn.disabled = true;
        this.dom.pinCardBtn.disabled = true;

        try {
            const card = await this.generateNewIdea();
            this.state.currentCard = card;
            renderCurrentCard(this.dom.cardContent, card);
            this.dom.pinCardBtn.disabled = false;
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            this.dom.nextCardBtn.disabled = false;
        }
    }

    /**
     * Load next card automatically (for continuous feed)
     */
    async loadNextCardAutomatically() {
        // Delay slightly for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.handleNextCard();
    }

    /**
     * Handle pin card button
     */
    handlePinCard() {
        if (this.state.currentCard) {
            this.state.addPinnedCard(this.state.currentCard);
            updateCollectionCount(this.dom.collectionCount, this.state.pinnedCards.length);
            showNotification('Idea pinned to collection! 📌');
            this.dom.pinCardBtn.disabled = true;
            
            // Auto-load next card for continuous discovery
            this.loadNextCardAutomatically();
        }
    }

    /**
     * Handle brainstorm button
     */
    handleBrainstorm() {
        if (this.state.selectedCardIds.size > 0) {
            const cards = this.state.getSelectedCards();
            this.startBrainstormSession(cards);
        }
    }

    /**
     * Handle chat form submission
     */
    async handleChatSubmit(e) {
        e.preventDefault();

        if (!this.state.apiKey) {
            this.dom.apiKeyModal.style.display = 'flex';
            return;
        }

        const message = this.dom.userInput.value.trim();
        if (!message) return;

        this.dom.userInput.disabled = true;
        this.dom.sendBtn.disabled = true;
        this.dom.saveNewIdeaBtn.disabled = true;

        addChatMessage(this.dom.chatMessages, message, 'user');
        this.dom.userInput.value = '';

        const loadingId = addLoadingMessage(this.dom.chatMessages);

        try {
            const response = await this.sendBrainstormMessage(message);
            removeMessage(this.dom.chatMessages, loadingId);
            addChatMessage(this.dom.chatMessages, response, 'ai');
        } catch (error) {
            removeMessage(this.dom.chatMessages, loadingId);
            addChatMessage(this.dom.chatMessages, `❌ Error: ${error.message}`, 'error');
        } finally {
            this.dom.userInput.disabled = false;
            this.dom.sendBtn.disabled = false;
            this.dom.saveNewIdeaBtn.disabled = false;
            this.dom.userInput.focus();
        }
    }

    /**
     * Handle save new idea
     */
    async handleSaveNewIdea() {
        if (!this.state.apiKey) {
            this.dom.apiKeyModal.style.display = 'flex';
            return;
        }

        this.dom.saveNewIdeaBtn.disabled = true;
        this.dom.sendBtn.disabled = true;
        this.dom.userInput.disabled = true;

        const loadingId = addLoadingMessage(this.dom.chatMessages);

        try {
            const newCard = await this.saveNewIdea();
            removeMessage(this.dom.chatMessages, loadingId);

            this.state.addPinnedCard(newCard);
            updateCollectionCount(this.dom.collectionCount, this.state.pinnedCards.length);

            addChatMessage(this.dom.chatMessages, `✅ Success! Your new idea "${newCard.title}" has been saved to your collection.`, 'success');

            setTimeout(() => {
                this.navigateTo('collection');
            }, 2000);
        } catch (error) {
            removeMessage(this.dom.chatMessages, loadingId);
            addChatMessage(this.dom.chatMessages, `❌ Error: ${error.message}`, 'error');
            this.dom.saveNewIdeaBtn.disabled = false;
            this.dom.sendBtn.disabled = false;
            this.dom.userInput.disabled = false;
        }
    }

    /**
     * Generate a new idea card
     */
    async generateNewIdea(topic = 'innovative startup ideas') {
        try {
            // Fetch Hacker News sources first
            const hnSources = await fetchHnSources(topic);
            const hackerNewsContext = hnSources.map(s => `Title: ${s.title}\nURL: ${s.url}`).join('\n\n');

            // Build the system prompt
            const systemPrompt = `You are an expert venture analyst and idea synthesizer. Your task is to generate a single, novel business idea based on the provided Hacker News context about the topic: "${topic}".

Follow these rules strictly:
1. Your response MUST be in valid TOON format with 2-space indentation
2. Use comma-separated values in a single row, NOT line-by-line key:value pairs
3. Include these 8 fields in order: id|name|jargon|problem|market|how|impact|valuation|sources
4. Sources must be a JSON array string: [{"title":"...","url":"..."}]
5. Use this exact header: ideas[1|]{id|name|jargon|problem|market|how|impact|valuation|sources}:

CRITICAL FORMAT (2-space indent, pipe-delimited row):

ideas[1|]{id|name|jargon|problem|market|how|impact|valuation|sources}:
  ${this.generateUUID()}|StartupName|One-line tagline|Problem description here|Target market description|How it works description|Impact and benefits|\$50M-\$100M|[{"title":"Source Title","url":"https://example.com"}]

IMPORTANT:
- Single data row with PIPE (|) delimiter between fields
- 2-space indentation before the data row
- Use pipe character (|) as delimiter, NOT commas
- Keep each field concise but informative (single sentence or short phrase)
- Include at least 3 sources from the Hacker News context
- Format: uuid|name|jargon|problem|market|how|impact|valuation|json-array

Begin your response with the TOON header followed by ONE indented pipe-delimited data row.`;

            // User message with the actual context
            const userMessage = `Here are the Hacker News sources about "${topic}":\n\n${hackerNewsContext}\n\nGenerate ONE business idea in TOON format. Remember: header line, then ONE indented comma-separated data row.`;

            // Call Gemini API
            const response = await callGeminiAPI(this.state.apiKey, systemPrompt, userMessage, []);

            console.log('Gemini API Response:', response);

            // Try to decode the TOON response
            const decoded = decode(response);

            // Handle both array and object responses
            let card;
            if (Array.isArray(decoded) && decoded.length > 0) {
                card = decoded[0];
            } else if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
                card = decoded.ideas[0];
            } else {
                throw new Error('Invalid card format received from AI');
            }

            // Ensure all required fields exist
            if (!card.id) {
                card.id = this.generateUUID();
            }
            if (!card.name) {
                throw new Error('Missing required field: name');
            }
            
            // Add timestamp
            card.createdAt = new Date().toISOString();

            // Ensure sources is an array
            if (typeof card.sources === 'string') {
                try {
                    card.sources = JSON.parse(card.sources);
                } catch (e) {
                    card.sources = hnSources.slice(0, 3); // Fallback to HN sources
                }
            }
            if (!Array.isArray(card.sources)) {
                card.sources = hnSources.slice(0, 3);
            }

            console.log('Generated card:', card);
            return card;

        } catch (error) {
            console.error('Error in generateNewIdea:', error);
            console.error('Error details:', error.message);
            throw new Error(`Failed to generate idea: ${error.message}`);
        }
    }

    /**
     * Generate a UUID for idea cards
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Start a brainstorm session
     */
    startBrainstormSession(cards) {
        this.state.resetBrainstormSession();
        this.state.contextCards = cards;

        // Reset chat
        this.dom.chatMessages.innerHTML = '';

        // Display context cards with improved clarity
        const contextTitle = cards.map(c => `"${escapeHtml(c.title)}"`).join(' + ');
        this.dom.contextCardsDiv.innerHTML = `
            <div class="flex items-center justify-center gap-2 mt-2">
                <span class="text-gray-400">Synthesizing:</span>
                <span class="font-semibold text-gray-700">${contextTitle}</span>
            </div>
        `;

        // Add initial AI message with synthesis prompt
        const toonContext = encode(cards);
        const welcomeMessage = `I'm analyzing your selected ideas to create something new:\n\n${cards.map((c, i) => `${i + 1}. **${c.title}**: ${c.summary}`).join('\n\n')}\n\nLet me synthesize these into a unified concept. What aspects would you like me to focus on?`;
        addChatMessage(this.dom.chatMessages, welcomeMessage, 'ai');

        // Store context in conversation history
        this.state.conversationHistory.push({
            role: 'user',
            content: `Context (TOON format): ${toonContext}`
        });
        this.state.conversationHistory.push({
            role: 'assistant',
            content: welcomeMessage
        });

        this.navigateTo('workbench');
    }

    /**
     * Send a message in brainstorm session
     */
    async sendBrainstormMessage(message) {
        this.state.conversationHistory.push({ role: 'user', content: message });

        const toonContext = encode(this.state.contextCards);
        const systemPrompt = `You are a venture strategist and creative synthesizer. The user has provided these ideas in TOON format: ${toonContext}. Your primary goal is to help them synthesize these concepts into a single, novel, and cohesive business or technical idea. Present insights clearly and ask focused questions to refine the concept. You can use the command [HN_SEARCH: {topic}] to search Hacker News for additional context when needed. Use plain conversational text, not TOON format, during the discussion.`;

        let response = await callGeminiAPI(this.state.apiKey, systemPrompt, message, this.state.conversationHistory.slice(1));

        const hnSearchMatch = response.match(/\[HN_SEARCH:\s*(.*?)\]/);
        if (hnSearchMatch) {
            const topic = hnSearchMatch[1];
            addChatMessage(this.dom.chatMessages, `Searching Hacker News for "${topic}"...`, 'ai');
            const sources = await fetchHnSources(topic);
            const sourcesText = sources.map(s => `Title: ${s.title}\nURL: ${s.url}`).join('\n\n');

            this.state.conversationHistory.push({ role: 'assistant', content: response });
            this.state.conversationHistory.push({ role: 'user', content: `Here are the Hacker News search results:\n${sourcesText}` });

            response = await callGeminiAPI(this.state.apiKey, systemPrompt, `Here are the Hacker News search results:\n${sourcesText}`, this.state.conversationHistory.slice(1));
        }

        this.state.conversationHistory.push({ role: 'assistant', content: response });
        return response;
    }

    /**
     * Save new idea from brainstorm
     */
    async saveNewIdea() {
        const systemPrompt = `Now synthesize our entire discussion into a final, refined idea. You MUST respond with ONLY a TOON-formatted string for the new card. Use this exact header: cards[1]{id,title,summary,tags,source,sources}: 

Requirements:
- Set the source field to "From Brainstorm"
- The sources field must be an empty array []
- Include ALL required fields: id, title, summary, tags, source, sources
- Make the idea clear, actionable, and well-structured`;

        const message = 'Please create the final synthesized idea card based on our discussion. Remember to use TOON format with all required fields.';

        const response = await callGeminiAPI(this.state.apiKey, systemPrompt, message, this.state.conversationHistory);

        try {
            const decoded = decode(response);

            // Handle both array and object responses
            let card;
            if (Array.isArray(decoded) && decoded.length > 0) {
                card = decoded[0];
            } else if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
                card = decoded;
            } else {
                throw new Error('Invalid card format received from AI');
            }

            // Add timestamp and ensure ID exists
            if (!card.id) {
                card.id = this.generateUUID();
            }
            card.createdAt = new Date().toISOString();
            card.source = 'From Brainstorm';

            return card;
        } catch (error) {
            console.error('Failed to decode TOON response:', response);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
    }

    /**
     * Render the collection screen
     */
    renderCollectionScreen() {
        // Sort pinned cards by createdAt (newest first)
        const sortedCards = [...this.state.pinnedCards].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        renderCollection(
            this.dom.collectionGrid,
            sortedCards,
            this.state.selectedCardIds,
            (cardEl) => this.handleCardClick(cardEl)
        );
        this.dom.brainstormBtn.disabled = this.state.selectedCardIds.size === 0;
    }

    /**
     * Handle card click in collection
     */
    handleCardClick(cardEl) {
        const cardId = cardEl.dataset.cardId;
        const isSelected = this.state.toggleCardSelection(cardId);

        if (isSelected) {
            cardEl.classList.add('border-sky-500', 'bg-sky-50');
            cardEl.classList.remove('border-transparent');
        } else {
            cardEl.classList.remove('border-sky-500', 'bg-sky-50');
            cardEl.classList.add('border-transparent');
        }

        this.dom.brainstormBtn.disabled = this.state.selectedCardIds.size === 0;
    }
}
