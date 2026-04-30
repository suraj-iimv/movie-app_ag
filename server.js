require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

app.post('/api/search', async (req, res) => {
    const { query } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'your_key_here') {
        return res.status(500).json({ error: { message: 'OpenRouter API Key is missing on the server. Please check your .env file.' } });
    }

    const systemPrompt = `You are a movie database API. Respond ONLY with a valid JSON object. No markdown formatting, no code blocks, no additional text. 
The user will provide a movie name. Find the most relevant popular movie and return the following JSON structure:
{
    "title": "Exact Movie Title",
    "release_year": "YYYY",
    "director": "Director Name",
    "cast": ["Actor 1", "Actor 2", "Actor 3", "Actor 4", "Actor 5"],
    "ratings": "e.g., 8.8/10 IMDb",
    "plot": "A short, engaging 2-3 sentence plot summary.",
    "similar_movies": ["Movie 1", "Movie 2", "Movie 3"]
}
If the movie cannot be found, return a JSON object with an "error" key: {"error": "Movie not found"}.`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Movie AI Proxy'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Find information for the movie: "${query}"` }
                ],
                temperature: 0.2
            })
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).json({ error: { message: 'Internal Server Error while communicating with OpenRouter.' } });
    }
});

app.get('/api/suggestions', async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!q || q.length < 2) return res.json([]);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free', // Reverted to free model as requested
                messages: [
                    { role: 'system', content: 'You are a movie suggestion engine. Return ONLY a comma-separated list of the 5 most popular movie titles that match the user query. No other text.' },
                    { role: 'user', content: q }
                ],
                max_tokens: 50,
                temperature: 0
            })
        });

        const data = await response.json();
        const text = data.choices[0].message.content.trim();
        const suggestions = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
        res.json(suggestions);

    } catch (error) {
        console.error('Suggestions Error:', error);
        res.json([]);
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
        console.log(`Make sure to add your API key to the .env file!`);
    });
}

module.exports = app;
