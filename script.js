document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const livesDisplay = document.getElementById('lives');
    const finalScoreDisplay = document.getElementById('final-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const restartButton = document.getElementById('restart-button');

    // Game dimensions
    canvas.width = 320; // Standard mobile portrait width
    canvas.height = 480; // Standard mobile portrait height

    // Game variables
    let score = 0;
    let lives = 3;
    const initialLives = 3;
    let gameSpeed = 3; // Speed at which obstacles and ground move
    let gameStarted = false;
    let gameOver = false;
    let frame = 0;

    // Ground
    const groundHeight = 50;
    // Recalculate groundY as it's dependent on canvas.height which is now changed
    // This needs to be done *after* canvas.height is set.
    // For now, I'll ensure it's defined. It will be correctly calculated in startGame and initial draw.
    let groundY = canvas.height - groundHeight;

    // Pig properties
    const pig = {
        x: 80, // Fixed x position
        y: canvas.height - groundHeight - 30, // Ensure pig starts on the new groundY
        width: 40,
        height: 30,
        velocityY: 0,
        gravity: 0.6,
        jumpStrength: -12, // How high the pig jumps
        isOnGround: true,
        emoji: '🐷',
        originalEmoji: '🐷', // To revert after car mode
        carEmoji: '🏎️',   // Racing car emoji, typically faces right
        size: 30, // For emoji font size
        inCar: false,
        invincibleTimer: 0, // For car invincibility
        invincibleDuration: 300, // 5 seconds for car
        isInvincibleAfterHit: false, // New: For post-hit invincibility
        invincibilityAfterHitTimer: 0, // New: Timer for post-hit
        invincibilityAfterHitDuration: 180 // New: 3 seconds at 60fps
    };

    // Obstacle properties
    const obstacles = [];
    const obstacleTypes = [
        { width: 30, height: 30, emoji: '🌵', size: 30 }, // Cactus
        { width: 25, height: 50, emoji: '🌲', size: 40 }, // Small Tree
        { width: 40, height: 20, emoji: '🪨', size: 25}  // Rock
    ];
    let minObstacleInterval = 80; // Min frames between obstacles
    let maxObstacleInterval = 150; // Max frames
    let nextObstacleFrame = getRandomInt(minObstacleInterval, maxObstacleInterval);

    // Apple properties
    const apples = [];
    const appleEmoji = '🍎';
    const appleSize = 25; // For emoji font size and hitbox
    const appleValue = 5; // Points per apple
    let minAppleInterval = 100; // Min frames between apples
    let maxAppleInterval = 200; // Max frames
    let nextAppleFrame = getRandomInt(minAppleInterval, maxAppleInterval) + 50; // Start apples a bit after obstacles

    // Car Power-up properties
    const cars = [];
    const carCollectEmoji = '🔑'; // Key to collect for the car
    const carCollectSize = 25;
    const carValue = 0; // No direct points for car, effect is invincibility
    let minCarInterval = 400; // Cars are rarer
    let maxCarInterval = 800;
    let nextCarFrame = getRandomInt(minCarInterval, maxCarInterval) + 150; // Start cars later

    // Corn properties
    const corns = [];
    const cornEmoji = '🌽';
    const cornSize = 25;
    const cornValue = 3; // Corn might be worth slightly less than apples
    let minCornInterval = 120;
    let maxCornInterval = 220;
    let nextCornFrame = getRandomInt(minCornInterval, maxCornInterval) + 80; // Start corn a bit after apples/obstacles


    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function drawGround() {
        ctx.fillStyle = '#8B4513'; // SaddleBrown
        ctx.fillRect(0, groundY, canvas.width, groundHeight);
        // Add some detail to the ground (optional)
        ctx.fillStyle = '#A0522D'; // Sienna
        for (let i = 0; i < canvas.width; i += 20) {
            if ((frame + i) % 40 < 20) { // Simple pattern based on frame
                 ctx.fillRect(i, groundY + 5, 10, 5);
            }
        }
    }

    function drawPig() {
        ctx.save(); // Save current context state
        if (pig.isInvincibleAfterHit) {
            // Blink effect: change alpha every 10 frames
            ctx.globalAlpha = (Math.floor(frame / 10) % 2 === 0) ? 0.5 : 1;
        }

        let currentEmoji = pig.inCar ? pig.carEmoji : pig.emoji;
        let currentSize = pig.inCar ? pig.size + 10 : pig.size; // Car is slightly bigger
        let pigDrawY = pig.inCar ? groundY - currentSize / 2 + 5 : pig.y - pig.height / 2 + currentSize / 2;

        ctx.font = `${currentSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (pig.inCar) {
            // Flip the car emoji horizontally
            ctx.translate(pig.x, pigDrawY); // Move origin to where emoji will be drawn
            ctx.scale(-1, 1); // Flip horizontally
            ctx.fillText(currentEmoji, 0, 0); // Draw at new origin (0,0)
            ctx.scale(-1, 1); // Flip back
            ctx.translate(-pig.x, -pigDrawY); // Move origin back
        } else {
            ctx.fillText(currentEmoji, pig.x, pigDrawY);
        }
        ctx.restore(); // Restore context state (especially globalAlpha and transformations)
    }

    function updatePig() {
        if (!gameStarted) return;

        if (pig.inCar) {
            pig.invincibleTimer--;
            pig.y = groundY - (pig.size + 10) / 2; // Keep car on ground
            pig.velocityY = 0;
            pig.isOnGround = true;
            if (pig.invincibleTimer <= 0) {
                pig.inCar = false;
                pig.emoji = pig.originalEmoji;
                // Pig might be in the air when car mode ends, let gravity take over
            }
        } else if (pig.isInvincibleAfterHit) {
            pig.invincibilityAfterHitTimer--;
            if (pig.invincibilityAfterHitTimer <= 0) {
                pig.isInvincibleAfterHit = false;
            }
            // Normal movement continues during post-hit invincibility
            pig.velocityY += pig.gravity;
            pig.y += pig.velocityY;
            if (pig.y >= groundY - pig.height / 2) {
                pig.y = groundY - pig.height / 2;
                pig.velocityY = 0;
                pig.isOnGround = true;
            } else {
                pig.isOnGround = false;
            }

        } else { // Normal pig movement
            pig.velocityY += pig.gravity;
            pig.y += pig.velocityY;

            if (pig.y >= groundY - pig.height / 2) {
                pig.y = groundY - pig.height / 2;
                pig.velocityY = 0;
                pig.isOnGround = true;
            } else {
                pig.isOnGround = false;
            }
        }
    }

    function jump() {
        if (gameOver) return;
        if (!gameStarted) {
            startGame();
            return;
        }
        // Allow jump only if not in car and on ground
        if (!pig.inCar && pig.isOnGround) {
            pig.velocityY = pig.jumpStrength;
            pig.isOnGround = false;
        }
    }

    function drawObstacles() {
        obstacles.forEach(obstacle => {
            ctx.font = `${obstacle.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Adjust y for emoji baseline to sit on ground
            ctx.fillText(obstacle.emoji, obstacle.x + obstacle.width / 2, groundY - obstacle.height / 2 + obstacle.size/2 -5);
            // For debugging hitboxes:
            // ctx.strokeStyle = 'red';
            // ctx.strokeRect(obstacle.x, groundY - obstacle.height, obstacle.width, obstacle.height);
        });
    }

    function drawApples() {
        apples.forEach(apple => {
            ctx.font = `${appleSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(appleEmoji, apple.x + appleSize / 2, apple.y + appleSize / 2);
        });
    }

    function drawCars() {
        cars.forEach(carKey => {
            ctx.font = `${carCollectSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(carCollectEmoji, carKey.x + carCollectSize / 2, carKey.y + carCollectSize / 2);
        });
    }

    function drawCorns() {
        corns.forEach(corn => {
            ctx.font = `${cornSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cornEmoji, corn.x + cornSize / 2, corn.y + cornSize / 2);
        });
    }

    function updateObstacles() {
        if (!gameStarted || gameOver) return;

        // Spawn new obstacles
        if (frame >= nextObstacleFrame) {
            const type = obstacleTypes[getRandomInt(0, obstacleTypes.length - 1)];
            obstacles.push({
                x: canvas.width,
                width: type.width,
                height: type.height,
                emoji: type.emoji,
                size: type.size,
                passed: false
            });
            nextObstacleFrame = frame + getRandomInt(minObstacleInterval, maxObstacleInterval);
        }

        // Move obstacles and check for collision/scoring
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameSpeed;

            // Collision detection (simple AABB)
            // Pig's bounding box (approximate for emoji)
            const pigLeft = pig.x - pig.width / 2;
            const pigRight = pig.x + pig.width / 2;
            const pigTop = pig.y - pig.height; // y is pig's bottom for this calculation
            const pigBottom = pig.y;

            const obsLeft = obs.x;
            const obsRight = obs.x + obs.width;
            const obsTop = groundY - obs.height;
            const obsBottom = groundY;

            if (pigRight > obsLeft && pigLeft < obsRight && pigBottom > obsTop && pigTop < obsBottom) {
                if (pig.inCar) {
                    obstacles.splice(i, 1);
                    score += 2;
                    updateScoreDisplay();
                } else if (!pig.isInvincibleAfterHit) { // Only handle hit if not invincible from a previous hit
                    handleHit();
                    return;
                }
                // If pig.isInvincibleAfterHit is true, pig passes through without losing another life
            }

            // Score
            if (!obs.passed && obs.x + obs.width < pig.x - pig.width / 2) {
                score++;
                updateScoreDisplay();
                obs.passed = true;
            }

            // Remove off-screen obstacles
            if (obs.x + obs.width < 0) {
                obstacles.splice(i, 1);
            }
        }
    }

    function updateApples() {
        if (!gameStarted || gameOver) return;

        // Spawn new apples
        if (frame >= nextAppleFrame) {
            const appleY = groundY - appleSize - getRandomInt(0, pig.height * 2); // Spawn on ground or slightly above
            apples.push({
                x: canvas.width,
                y: Math.max(appleY, appleSize), // Ensure it's not too high or below ground
                width: appleSize, // Hitbox width
                height: appleSize, // Hitbox height
            });
            nextAppleFrame = frame + getRandomInt(minAppleInterval, maxAppleInterval);
        }

        // Move apples and check for collection
        for (let i = apples.length - 1; i >= 0; i--) {
            const apple = apples[i];
            apple.x -= gameSpeed; // Apples move at the same speed as obstacles

            // Collision detection with pig
            const pigLeft = pig.x - pig.width / 2;
            const pigRight = pig.x + pig.width / 2;
            const pigTop = pig.y - pig.height;
            const pigBottom = pig.y;

            const appleLeft = apple.x;
            const appleRight = apple.x + apple.width;
            const appleTop = apple.y;
            const appleBottom = apple.y + apple.height;

            if (pigRight > appleLeft && pigLeft < appleRight && pigBottom > appleTop && pigTop < appleBottom) {
                score += appleValue;
                updateScoreDisplay();
                apples.splice(i, 1); // Remove collected apple
                // Optional: Add a sound effect for collection
            } else if (apple.x + apple.width < 0) {
                // Remove off-screen apples
                apples.splice(i, 1);
            }
        }
    }

    function updateCars() {
        if (!gameStarted || gameOver) return;

        // Spawn new car keys
        if (frame >= nextCarFrame) {
            const carKeyY = groundY - carCollectSize - getRandomInt(0, pig.height); // Spawn on ground or slightly above
            cars.push({
                x: canvas.width,
                y: Math.max(carKeyY, carCollectSize),
                width: carCollectSize,
                height: carCollectSize,
            });
            nextCarFrame = frame + getRandomInt(minCarInterval, maxCarInterval);
        }

        // Move car keys and check for collection
        for (let i = cars.length - 1; i >= 0; i--) {
            const carKey = cars[i];
            carKey.x -= gameSpeed;

            const pigLeft = pig.x - pig.width / 2;
            const pigRight = pig.x + pig.width / 2;
            const pigTop = pig.y - pig.height;
            const pigBottom = pig.y;

            const carKeyLeft = carKey.x;
            const carKeyRight = carKey.x + carKey.width;
            const carKeyTop = carKey.y;
            const carKeyBottom = carKey.y + carKey.height;

            if (pigRight > carKeyLeft && pigLeft < carKeyRight && pigBottom > carKeyTop && pigTop < carKeyBottom) {
                if (!pig.inCar) { // Can only collect if not already in car
                    pig.inCar = true;
                    pig.invincibleTimer = pig.invincibleDuration;
                    pig.emoji = pig.carEmoji; // Change to car
                    // Pig y position will be handled by updatePig to keep car on ground
                }
                cars.splice(i, 1); // Remove collected car key
            } else if (carKey.x + carKey.width < 0) {
                cars.splice(i, 1);
            }
        }
    }

    function updateCorns() {
        if (!gameStarted || gameOver) return;

        // Spawn new corns
        if (frame >= nextCornFrame) {
            const cornY = groundY - cornSize - getRandomInt(0, pig.height); // Spawn on ground or slightly above
            corns.push({
                x: canvas.width,
                y: Math.max(cornY, cornSize),
                width: cornSize,
                height: cornSize,
            });
            nextCornFrame = frame + getRandomInt(minCornInterval, maxCornInterval);
        }

        // Move corns and check for collection
        for (let i = corns.length - 1; i >= 0; i--) {
            const corn = corns[i];
            corn.x -= gameSpeed;

            const pigLeft = pig.x - pig.width / 2;
            const pigRight = pig.x + pig.width / 2;
            const pigTop = pig.y - pig.height;
            const pigBottom = pig.y;

            const cornLeft = corn.x;
            const cornRight = corn.x + corn.width;
            const cornTop = corn.y;
            const cornBottom = corn.y + corn.height;

            if (pigRight > cornLeft && pigLeft < cornRight && pigBottom > cornTop && pigTop < cornBottom) {
                score += cornValue;
                updateScoreDisplay();
                corns.splice(i, 1);
            } else if (corn.x + corn.width < 0) {
                corns.splice(i, 1);
            }
        }
    }
    
    function updateScoreDisplay() {
        scoreDisplay.textContent = score;
    }

    function updateLivesDisplay() {
        livesDisplay.textContent = '❤️'.repeat(Math.max(0, lives));
    }

    function handleHit() {
        // This function is called when pig (not in car, not already invincible from a hit) hits an obstacle
        if (gameOver || pig.inCar || pig.isInvincibleAfterHit) return;
        lives--;
        updateLivesDisplay();

        // Simple visual feedback for hit
        canvas.style.filter = 'brightness(0.5)';
        setTimeout(() => canvas.style.filter = 'none', 100);

        if (lives <= 0) {
            setGameOver();
        } else {
            // Activate post-hit invincibility
            pig.isInvincibleAfterHit = true;
            pig.invincibilityAfterHitTimer = pig.invincibilityAfterHitDuration;
            // The visual feedback (screen flash) is still good here.
            // The pig will continue moving and can pass through obstacles during this time.
        }
    }

    function gameLoop() {
        if (gameOver) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear entire canvas

        // Draw Sky (optional, can be CSS background too)
        ctx.fillStyle = '#70c5ce'; // Lighter sky
        ctx.fillRect(0, 0, canvas.width, canvas.height - groundHeight);

        drawGround();
        
        if (gameStarted) {
            updatePig();
            updateObstacles();
            updateApples();
            updateCars();
            updateCorns(); // New
        }
        
        drawPig();
        drawObstacles();
        drawApples();
        drawCars();
        drawCorns(); // New

        frame++;
        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        gameStarted = true;
        gameOver = false;
        score = 0;
        lives = initialLives;
        frame = 0;
        // Update groundY here as canvas dimensions are set
        groundY = canvas.height - groundHeight;
        pig.y = groundY - pig.height / 2;
        pig.velocityY = 0;
        pig.isOnGround = true;
        pig.inCar = false;
        pig.invincibleTimer = 0;
        pig.isInvincibleAfterHit = false; // Reset post-hit invincibility
        pig.invincibilityAfterHitTimer = 0;
        pig.emoji = pig.originalEmoji;
        obstacles.length = 0;
        apples.length = 0;
        cars.length = 0;
        corns.length = 0; // New: Clear corns on restart
        nextObstacleFrame = getRandomInt(minObstacleInterval, maxObstacleInterval);
        nextAppleFrame = frame + getRandomInt(minAppleInterval, maxAppleInterval) + 50;
        nextCarFrame = frame + getRandomInt(minCarInterval, maxCarInterval) + 150;
        nextCornFrame = frame + getRandomInt(minCornInterval, maxCornInterval) + 80; // Reset corn spawn timer


        updateScoreDisplay();
        updateLivesDisplay();
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
        if (!requestAnimationFrame(gameLoop)) { // Ensure loop starts if it was stopped
             requestAnimationFrame(gameLoop);
        }
    }

    function setGameOver() {
        if (gameOver) return;
        gameOver = true;
        gameStarted = false;
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'flex';
    }

    // Event Listeners
    document.addEventListener('click', jump);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            jump();
        }
    });
    restartButton.addEventListener('click', startGame);

    // Initial setup
    updateScoreDisplay();
    updateLivesDisplay();
    // Draw initial state before game starts
    ctx.fillStyle = '#70c5ce';
    // Update groundY here for initial draw as well
    groundY = canvas.height - groundHeight;
    ctx.fillRect(0, 0, canvas.width, canvas.height - groundHeight);
    drawGround();
    drawPig(); // Show pig on start screen
});