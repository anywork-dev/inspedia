// API Configuration and Functions
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Call Gemini API with system prompt, user message, and optional conversation history
 */
export async function callGeminiAPI(apiKey, systemPrompt, userMessage, history = []) {
    // Combine system prompt and user message for single-turn conversation
    const combinedPrompt = `${systemPrompt}\n\n${userMessage}`;
    
    const contents = [];
    
    // Add conversation history with proper roles
    for (const msg of history) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        });
    }
    
    // Add current message as user role
    contents.push({
        role: 'user',
        parts: [{ text: combinedPrompt }]
    });

    const response = await fetch(GEMINI_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
        },
        body: JSON.stringify({ contents })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
}

/**
 * Fetch sources from Hacker News based on a topic
 */
export async function fetchHnSources(topic, count = 3) {
    const response = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story,comment`);
    if (!response.ok) {
        throw new Error('Failed to fetch from Hacker News API');
    }
    const data = await response.json();
    const sources = data.hits.map(hit => ({
        title: hit.title || hit.story_title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`
    })).filter(source => source.title && source.url);

    // Deduplicate and get the desired count
    const uniqueSources = Array.from(new Map(sources.map(s => [s.url, s])).values());
    return uniqueSources.slice(0, count);
}
