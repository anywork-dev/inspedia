
    /**
     * Fetch sources from Hacker News (via hn.algolia.com) based on a topic.
     * Returns items with title, url and any HN-provided content (story/comment text).
     * Caches results per-topic for 24 hours (in-memory).
     */
    const HN_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const hnCache = new Map<string, { expires: number; sources: any[] }>();

    async function fetchHnSources(topic: string, count = 3) {
        const key = (topic ?? '').toLowerCase();

        // Return cached results if still valid
        const cached = hnCache.get(key);
        if (cached && cached.expires > Date.now()) {
            // Return a slice so callers asking for a smaller count still work
            return cached.sources.slice(0, count);
        }

        const endpointsMap: Record<string, string> = {
            top: 'topstories',
            new: 'newstories',
            best: 'beststories',
            ask: 'askstories',
            show: 'showstories',
            job: 'jobstories',
        };
        const listEndpoint = endpointsMap[key] ?? 'topstories';
        const base = 'https://hacker-news.firebaseio.com/v0';

        // fetch list of story IDs
        const idsResp = await fetch(`${base}/${listEndpoint}.json`);
        if (!idsResp.ok) {
            throw new Error(`Failed to fetch story IDs from HN Firebase API: ${idsResp.status} ${idsResp.statusText}`);
        }
        const ids = await idsResp.json();
        if (!Array.isArray(ids)) {
            throw new Error('Unexpected IDs response from HN Firebase API');
        }

        // limit to up to 500 IDs (HN top/new lists can be up to ~500)
        const idsSlice = ids.slice(0, 500);

        // fetch item details in parallel (gracefully ignore failures)
        const itemPromises = idsSlice.map((id: number) =>
            fetch(`${base}/item/${id}.json`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
        );
        const items = (await Promise.all(itemPromises)).filter(Boolean);

        // normalize to an Algolia-like shape so the rest of the function can reuse existing mapping
        const hits = items.map((it: any) => ({
            title: it.title ?? null,
            url: it.url ?? null,
            text: it.text ?? null,
            story_title: it.title ?? null,
            story_url: it.url ?? null,
            story_text: it.text ?? null,
            comment_text: it.text ?? null,
            author: it.by ?? null,
            created_at: it.time ? new Date(it.time * 1000).toISOString() : null,
            objectID: it.id ?? null,
        }));

        // build a response-like object expected by the existing code
        const response = {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: async () => ({ hits }),
        };
        if (!response.ok) {
            throw new Error(`Failed to fetch from Hacker News API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data.hits)) {
            throw new Error('Unexpected response shape from Hacker News API');
        }

        console.log('Hacker News API Data:', data);

        const sources = data.hits.map((hit: any) => {
            const title: string | null = hit.title ?? hit.story_title ?? null;
            const url: string = hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;
            // Algolia returns the item text in different fields depending on type
            const content: string | null = hit.text ?? hit.story_text ?? hit.comment_text ?? null;
            return {
                title,
                url,
                content,
                author: hit.author ?? null,
                created_at: hit.created_at ?? null,
            };
        }).filter((s: any) => s.title && s.url);

        // Deduplicate by URL while preserving order
        const uniqueByUrl = Array.from(new Map(sources.map((s: any) => [s.url, s])).values());

        // Cache the full result for TTL and return requested slice
        hnCache.set(key, { expires: Date.now() + HN_CACHE_TTL_MS, sources: uniqueByUrl });

        return uniqueByUrl.slice(0, count);
    }


fetchHnSources('startup').then(sources => {
    console.log(
        'Fetched Hacker News Sources:\n' +
            sources
                .map((s, i) => {
                    const created = s.created_at ? new Date(s.created_at).toLocaleString() : 'unknown';
                    const author = s.author ?? 'unknown';
                    const content = (s.content ?? '').toString().replace(/\s+/g, ' ').trim();
                    const snippet = content ? `\n    ${content.slice(0, 300)}${content.length > 300 ? '…' : ''}` : '';
                    return `${i + 1}. ${s.title}\n    url: ${s.url}\n    author: ${author}\n    created: ${created}${snippet}`;
                })
                .join('\n\n')
    );
}).catch(error => {
    console.error('Error fetching Hacker News sources:', error);
})