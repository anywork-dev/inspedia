# TODO

- [ ] Set array randomizer to use a number index (don't shuffle the whole array)  
    - Idea: pick random index(es) instead of shuffling.  
    - Example:
    ```js
    // single random element
    const idx = Math.floor(Math.random() * arr.length);
    const item = arr[idx];

    // pick k unique items without full shuffle (partial Fisher‑Yates / reservoir)
    function pickK(arr, k) {
        const res = arr.slice(0, k);
        for (let i = k; i < arr.length; i++) {
            const j = Math.floor(Math.random() * (i + 1));
            if (j < k) res[j] = arr[i];
        }
        return res;
    }
    ```
- [ ] Add topic to config.json and show randomly on the welcome page  
    - config.json example:
    ```json
    {
        "topics": ["JavaScript", "CSS", "React", "Testing"]
    }
    ```
    - Pick and display:
    ```js
    const topics = config.topics || [];
    const topic = topics.length ? topics[Math.floor(Math.random() * topics.length)] : null;
    showWelcomeTopic(topic);
    ```
    
- [ ] Add producthunt content!
- [ ] Retry button on error
- [ ] Only fetch when the card is the last one  
    - Simple check:
    ```js
    if (cardIndex === cards.length - 1) {
        fetchMoreCards();
    }
    ```
    - In UI frameworks: trigger onReachEnd / onVisible for last card and debounce/lock to prevent duplicate fetches.