// Application State
class AppState {
    constructor() {
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
     * Generate a new idea card
     */
    async generateNewIdea(topic = 'innovative startup ideas') {
        try {

            // Get API URL from config
            const apiUrl = window.getApiUrl ? await window.getApiUrl('generateIdea') : '/api/generate-idea';
            const res = await fetch(`${apiUrl}?topic=${encodeURIComponent(topic)}`, {
                method: 'GET'
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server error: ${res.status} ${errText}`);
            }

            const data = await res.json();

            return data.idea;

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
     * Save new idea from brainstorm
     */
    async saveNewIdea() {
            // TODO: Fetch backend API URL from config
            return card;
        } catch (error) {
            console.error('Failed to decode TOON response:', response);
            throw new Error(`Failed to parse AI response: ${error.message}`);
        }
}
