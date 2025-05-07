document.addEventListener('DOMContentLoaded', () => {
    const gameArea = document.getElementById('game-area');
    const scoreDisplay = document.getElementById('score');
    const timeLeftDisplay = document.getElementById('time-left');
    const healthDisplay = document.getElementById('health'); // New
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalScoreDisplay = document.getElementById('final-score');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');

    const gameDuration = 30; // seconds
    const numberOfHoles = 12; // 3 columns x 4 rows
    const initialHealth = 5; // New
    let score = 0;
    let health = initialHealth; // New
    let timeLeft = gameDuration;
    let gameIntervalId;
    let characterTimeoutId; // Renamed from pigTimeoutId
    let holes = [];
    let lastHole;
    let gameActive = false; // To prevent actions after game over

    function createHoles() {
        gameArea.innerHTML = ''; // Clear previous holes if any
        holes = [];
        for (let i = 0; i < numberOfHoles; i++) {
            const hole = document.createElement('div');
            hole.classList.add('hole');
            hole.dataset.type = 'empty'; // Track what's in the hole
            const character = document.createElement('div');
            character.classList.add('character'); // Generic character class
            hole.appendChild(character);
            gameArea.appendChild(hole);
            holes.push(hole);

            hole.addEventListener('click', () => {
                if (!gameActive) return; // Ignore clicks if game isn't active

                if (hole.classList.contains('up')) {
                    // --- Logic for hitting an UP character ---
                    const characterType = hole.dataset.type;
                    hole.classList.remove('up'); // Hide character immediately

                    if (characterType === 'pig' || characterType === 'chicken') {
                        score += (characterType === 'pig' ? 1 : 2);
                        scoreDisplay.textContent = score;
                        hole.classList.add('hit');
                        setTimeout(() => hole.classList.remove('hit'), 300);
                    } else if (characterType === 'wolf') {
                        health--;
                        updateHealthDisplay();
                        if (health <= 0) endGame();
                    } else if (characterType === 'bomb') {
                        health -= 2;
                        updateHealthDisplay();
                        hole.classList.add('hit'); // Use hit animation
                        setTimeout(() => hole.classList.remove('hit'), 300);
                        if (health <= 0) endGame();
                    }
                    // Clear type after hit
                    hole.dataset.type = 'empty';
                    const charElement = hole.querySelector('.character');
                    charElement.className = 'character'; // Reset character class

                } else {
                    // --- Logic for hitting an EMPTY hole ---
                    health--; // Penalty for missing
                    updateHealthDisplay();
                    // Optional: Add a miss sound/visual effect
                    if (health <= 0) {
                        endGame();
                    }
                }
            });
        }
    }

    function updateHealthDisplay() {
        healthDisplay.textContent = '❤️'.repeat(Math.max(0, health));
    }

    function randomTime(min, max) {
        return Math.round(Math.random() * (max - min) + min);
    }

    function randomHole() {
        const idx = Math.floor(Math.random() * holes.length);
        const hole = holes[idx];
        if (hole === lastHole) {
            return randomHole(); // Try again if it's the same as the last one
        }
        lastHole = hole;
        return hole;
    }

    function peep() {
        if (!gameActive) return; // Stop peeping if game ended

        const time = randomTime(400, 900); // How long character stays up (slightly faster?)
        const hole = randomHole();
        const characterElement = hole.querySelector('.character');

        // Reset classes and type before showing new character
        hole.classList.remove('up', 'hit');
        characterElement.className = 'character'; // Remove pig/wolf class

        // Decide character type (e.g., 50% pig, 25% chicken, 15% wolf, 10% bomb)
        const rand = Math.random();
        let characterType;
        let characterClass;

        if (rand < 0.50) {
            characterType = 'pig';
            characterClass = 'pig';
        } else if (rand < 0.75) {
            characterType = 'chicken';
            characterClass = 'chicken';
        } else if (rand < 0.90) {
            characterType = 'wolf';
            characterClass = 'wolf';
        } else {
            characterType = 'bomb';
            characterClass = 'bomb';
        }

        hole.dataset.type = characterType;
        characterElement.classList.add(characterClass);
        hole.classList.add('up');

        characterTimeoutId = setTimeout(() => {
            if (hole.classList.contains('up')) { // Only remove if not already hit
                hole.classList.remove('up');
                hole.dataset.type = 'empty';
                characterElement.className = 'character';
            }
            if (gameActive) peep(); // Continue peeping if game is still active
        }, time);
    }

    function startGame() {
        score = 0;
        health = initialHealth; // Reset health
        timeLeft = gameDuration;
        scoreDisplay.textContent = score;
        timeLeftDisplay.textContent = timeLeft;
        updateHealthDisplay(); // Update health display
        lastHole = null;
        gameActive = true; // Set game state to active

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameArea.style.pointerEvents = 'auto';

        createHoles(); // Recreate holes to clear any old state
        peep();

        gameIntervalId = setInterval(() => {
            if (!gameActive) return; // Stop timer if game ended early (e.g., health)
            timeLeft--;
            timeLeftDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function endGame() {
        if (!gameActive) return; // Prevent multiple calls
        gameActive = false; // Set game state to inactive
        clearInterval(gameIntervalId);
        clearTimeout(characterTimeoutId);
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
        gameArea.style.pointerEvents = 'none';
        holes.forEach(hole => {
            hole.classList.remove('up', 'hit');
            hole.dataset.type = 'empty';
            const charElement = hole.querySelector('.character');
            if (charElement) {
                 charElement.className = 'character';
            }
        });
    }

    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);

    // Initial setup
    updateHealthDisplay(); // Show initial health
    createHoles();
    gameArea.style.pointerEvents = 'none';
});