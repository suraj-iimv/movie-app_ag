document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('movie-search-input');
    const suggestionsDropdown = document.getElementById('suggestions-dropdown');
    const resultsContainer = document.getElementById('results-container');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const movieContent = document.getElementById('movie-content');
    const errorMessage = document.getElementById('error-message');
    const themeToggle = document.getElementById('theme-toggle');
    const moonPath = document.getElementById('moon-path');
    const sunPath = document.getElementById('sun-path');

    let debounceTimer;

    // Theme Toggle Logic
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        moonPath.classList.add('hidden');
        sunPath.classList.remove('hidden');
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        moonPath.classList.toggle('hidden');
        sunPath.classList.toggle('hidden');
    });

    // Handle search input
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;
            hideSuggestions();
            await searchMovie(query);
        }
    });

    // Autocomplete Logic
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 400); // 400ms debounce
    });

    async function fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/suggestions?q=${encodeURIComponent(query)}`);
            const suggestions = await response.json();

            if (suggestions.length > 0) {
                renderSuggestions(suggestions);
            } else {
                hideSuggestions();
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }

    function renderSuggestions(suggestions) {
        suggestionsDropdown.innerHTML = '';
        suggestions.forEach(title => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = title;
            div.onclick = () => {
                searchInput.value = title;
                hideSuggestions();
                searchMovie(title);
            };
            suggestionsDropdown.appendChild(div);
        });
        suggestionsDropdown.classList.remove('hidden');
    }

    function hideSuggestions() {
        suggestionsDropdown.classList.add('hidden');
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
            hideSuggestions();
        }
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    async function searchMovie(query) {
        hideError();
        resultsContainer.classList.remove('hidden');
        loadingSkeleton.classList.remove('hidden');
        movieContent.classList.add('hidden');
        movieContent.classList.remove('fade-in');

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error?.message || 'Failed to fetch movie data');
            }

            const content = data.choices[0].message.content.trim();
            let jsonString = content;
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            const movieData = JSON.parse(jsonString);
            if (movieData.error) {
                showError(movieData.error);
                loadingSkeleton.classList.add('hidden');
                return;
            }

            renderMovieData(movieData);

        } catch (error) {
            console.error('Search error:', error);
            showError(`Error: ${error.message}`);
            loadingSkeleton.classList.add('hidden');
        }
    }

    function renderMovieData(data) {
        document.getElementById('movie-title').textContent = data.title || 'Unknown Title';
        document.getElementById('movie-year').textContent = data.release_year || 'N/A';
        document.getElementById('movie-director').textContent = data.director || 'Unknown Director';
        document.getElementById('movie-rating').textContent = data.ratings || 'No Rating';
        document.getElementById('movie-plot').textContent = data.plot || 'No plot summary available.';

        // Render cast
        const castContainer = document.getElementById('movie-cast-list');
        castContainer.innerHTML = '';
        if (data.cast && Array.isArray(data.cast)) {
            data.cast.forEach(actor => {
                const span = document.createElement('span');
                span.className = 'badge badge-outline bg-opacity-50 bg-gray-800 text-gray-300';
                span.textContent = actor;
                castContainer.appendChild(span);
            });
        }

        // Render similar movies
        const similarContainer = document.getElementById('movie-similar-list');
        similarContainer.innerHTML = '';
        if (data.similar_movies && Array.isArray(data.similar_movies)) {
            data.similar_movies.forEach(movie => {
                const button = document.createElement('button');
                button.className = 'badge badge-accent cursor-pointer hover:scale-105 transition-transform';
                button.textContent = movie;
                button.onclick = () => {
                    searchInput.value = movie;
                    searchMovie(movie);
                };
                similarContainer.appendChild(button);
            });
        }

        loadingSkeleton.classList.add('hidden');
        movieContent.classList.remove('hidden');
        void movieContent.offsetWidth;
        movieContent.classList.add('fade-in');
    }
});
