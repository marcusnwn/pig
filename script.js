document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives'); // New
    const finalScoreDisplay = document.getElementById('final-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const restartButton = document.getElementById('restart-button');

    // Game dimensions (can be adjusted)
    canvas.width = 320;
    canvas.height = 480;

    // Game variables
    let score = 0;
    let lives = 3; // New
    const initialLives = 3; // New
    let gameStarted = false;
    let gameOver = false;
    let frame = 0; // For controlling pipe generation and animation speed
    let pigHit = false; // To manage brief invulnerability or reset state

    // Pig properties
    const pig = {
        x: 50,
        y: canvas.height / 2,
        size: 30, // Diameter for emoji
        velocityY: 0,
        gravity: 0.25, // Reduced from 0.3
        flapStrength: -6, // Negative for upward movement
        emoji: '🐷',
        invulnerable: false, // For brief period after hit
        invulnerableTime: 60 // frames (1 second at 60fps)
    };

    // Pipe properties
    const pipes = [];
    const pipeWidth = 50;
    const pipeGap = 140; // Increased from 120
    const pipeSpeed = 2;
    const pipeSpawnInterval = 120; // Frames between new pipes

    function drawPig() {
        ctx.font = `${pig.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pig.emoji, pig.x, pig.y);
    }

    function updateLivesDisplay() {
        livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives));
    }

    function updatePig() {
        if (!gameStarted || pigHit) return; // Don't update if pig was just hit and resetting

        pig.velocityY += pig.gravity;
        pig.y += pig.velocityY;

        if (pig.invulnerable) {
            pig.invulnerableTime--;
            if (pig.invulnerableTime <= 0) {
                pig.invulnerable = false;
            }
        }

        // Collision with top/bottom boundaries
        if (pig.y + pig.size / 2 > canvas.height || pig.y - pig.size / 2 < 0) {
            if (!pig.invulnerable) handleCollision();
        }
    }

    function flap() {
        if (gameOver) return;
        if (!gameStarted) {
            startGame();
        }
        pig.velocityY = pig.flapStrength;
    }

    function drawPipes() {
        pipes.forEach(pipePair => {
            ctx.fillStyle = '#2E8B57'; // SeaGreen for pipes
            // Top pipe
            ctx.fillRect(pipePair.x, 0, pipeWidth, pipePair.topPipeHeight);
            // Bottom pipe
            ctx.fillRect(pipePair.x, pipePair.topPipeHeight + pipeGap, pipeWidth, canvas.height - pipePair.topPipeHeight - pipeGap);
        });
    }

    function updatePipes() {
        if (!gameStarted || gameOver) return;

        // Spawn new pipes
        if (frame % pipeSpawnInterval === 0) {
            const topPipeHeight = Math.random() * (canvas.height / 2 - pipeGap / 2) + pipeGap / 4; // Ensure some min height
            pipes.push({
                x: canvas.width,
                topPipeHeight: topPipeHeight,
                passed: false
            });
        }

        // Move pipes and check for collision/scoring
        for (let i = pipes.length - 1; i >= 0; i--) {
            pipes[i].x -= pipeSpeed;

            // Collision detection
            if (!pig.invulnerable) {
                // Check x-axis overlap
                if (pig.x + pig.size / 2 > pipes[i].x && pig.x - pig.size / 2 < pipes[i].x + pipeWidth) {
                    // Check y-axis overlap (collision)
                    if (pig.y - pig.size / 2 < pipes[i].topPipeHeight || pig.y + pig.size / 2 > pipes[i].topPipeHeight + pipeGap) {
                        handleCollision();
                        return; // Stop further pipe processing for this frame if collision handled
                    }
                }
            }

            // Score
            if (!pipes[i].passed && pipes[i].x + pipeWidth < pig.x - pig.size / 2) {
                score++;
                scoreDisplay.textContent = score;
                pipes[i].passed = true;
            }

            // Remove off-screen pipes
            if (pipes[i].x + pipeWidth < 0) {
                pipes.splice(i, 1);
            }
        }
    }

    function gameLoop() {
        if (gameOver) return; // This check is now mainly for when lives run out

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        updatePig(); // Updates pig position and checks boundary collision
        drawPig();   // Draws pig

        if (gameStarted && !pigHit) { // Only update/draw pipes if game is active and pig not resetting
            updatePipes(); // Updates pipe positions and checks pig/pipe collision
        }
        drawPipes();   // Always draw pipes so they don't vanish during reset

        frame++;
        requestAnimationFrame(gameLoop);
    }


    function handleCollision() {
        if (pig.invulnerable) return; // Already hit and invulnerable

        lives--;
        updateLivesDisplay();
        pigHit = true; // Signal that a hit occurred for gameLoop logic
        pig.invulnerable = true;
        pig.invulnerableTime = 60; // 1 second invulnerability

        // Flash screen briefly (optional visual cue)
        canvas.style.backgroundColor = 'rgba(255,0,0,0.3)';
        setTimeout(() => {
            canvas.style.backgroundColor = '#70c5ce'; // Reset to original
        }, 100);


        if (lives <= 0) {
            setGameOver();
        } else {
            // Reset pig position and velocity, allow game to continue
            setTimeout(() => { // Delay reset slightly to show hit
                pig.y = canvas.height / 2;
                pig.velocityY = 0;
                // Optional: Move pig slightly back if desired, or clear nearby pipes
                // For simplicity, just reset position and velocity.
                pigHit = false; // Allow pig updates again
            }, 200); // Short delay before pig is active again
        }
    }

    function startGame() {
        gameStarted = true;
        gameOver = false;
        pigHit = false;
        score = 0;
        lives = initialLives; // Reset lives
        frame = 0;
        pig.y = canvas.height / 2;
        pig.velocityY = 0;
        pig.invulnerable = false;
        pipes.length = 0;

        scoreDisplay.textContent = score;
        updateLivesDisplay(); // Update lives display
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        if (!requestAnimationFrame(gameLoop)) { // Ensure loop starts if it was stopped
             requestAnimationFrame(gameLoop);
        }
    }

    function setGameOver() {
        if (gameOver) return;
        gameOver = true;
        gameStarted = false; // Stop game logic like pipe spawning
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
    }

    // Event Listeners
    canvas.addEventListener('click', flap);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent page scroll
            flap();
        }
    });
    startScreen.addEventListener('click', flap); // Also start game on start screen click
    restartButton.addEventListener('click', startGame);

    // Initial setup - show start screen
    scoreDisplay.textContent = score;
    updateLivesDisplay(); // Initialize lives display
});