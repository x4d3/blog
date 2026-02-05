// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const game = {
    running: true,
    levelComplete: false,
    keys: {},
    touchControls: {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false
    }
};

// Player (La M)
const player = {
    x: 50,
    y: 0,
    width: 48,
    height: 64,
    velocityX: 0,
    velocityY: 0,
    speed: 5.5,
    maxSpeed: 5.5,
    acceleration: 1.2,
    jumpPower: 13,
    grounded: false,
    direction: 1 // 1 = right, -1 = left
};

// Physics
const gravity = 0.5;
const friction = 0.85;
const airResistance = 0.95;

// Camera
const camera = {
    x: 0,
    y: 0
};

// Level Design - Initialize as empty arrays
const platforms = [];
const pipes = [];
const collectibles = [];

// End flag (Le X position)
const endFlag = {
    x: 2600,
    y: 0,
    width: 48,
    height: 64,
    reached: false
};

// Initialize level positions
function initLevel() {
    // Clear and recalculate all level positions based on canvas height
    platforms.length = 0;
    platforms.push(
        // Ground
        { x: 0, y: canvas.height - 50, width: 3000, height: 50 },
        // Floating platforms
        { x: 200, y: canvas.height - 150, width: 150, height: 20 },
        { x: 400, y: canvas.height - 200, width: 150, height: 20 },
        { x: 600, y: canvas.height - 250, width: 150, height: 20 },
        { x: 850, y: canvas.height - 200, width: 150, height: 20 },
        { x: 1100, y: canvas.height - 250, width: 200, height: 20 },
        { x: 1400, y: canvas.height - 180, width: 150, height: 20 },
        { x: 1650, y: canvas.height - 220, width: 150, height: 20 },
        { x: 1900, y: canvas.height - 180, width: 200, height: 20 },
        { x: 2200, y: canvas.height - 150, width: 300, height: 20 }
    );

    pipes.length = 0;
    pipes.push(
        { x: 300, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 700, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 1000, y: canvas.height - 120, width: 50, height: 70, type: 'pipe' },
        { x: 1200, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 1500, y: canvas.height - 140, width: 50, height: 90, type: 'pipe' },
        { x: 1800, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' }
    );

    collectibles.length = 0;
    collectibles.push(
        { x: 250, y: canvas.height - 180, width: 20, height: 30, collected: false },
        { x: 450, y: canvas.height - 230, width: 20, height: 30, collected: false },
        { x: 900, y: canvas.height - 230, width: 20, height: 30, collected: false },
        { x: 1450, y: canvas.height - 210, width: 20, height: 30, collected: false },
        { x: 2000, y: canvas.height - 210, width: 20, height: 30, collected: false }
    );

    endFlag.y = canvas.height - 150;
}

// Set canvas size and handle resize
function resizeCanvas() {
    const oldHeight = canvas.height;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Recalculate positions on resize
    if (oldHeight !== canvas.height) {
        initLevel();
    }
}

// Initial setup
resizeCanvas();
initLevel();
window.addEventListener('resize', resizeCanvas);

// Controls
window.addEventListener('keydown', (e) => {
    game.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    game.keys[e.key] = false;
});

// Touch Controls
function setupTouchControls() {
    const buttons = {
        'btn-left': 'left',
        'btn-right': 'right',
        'btn-up': 'up',
        'btn-down': 'down',
        'jump-btn': 'jump'
    };

    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        const control = buttons[btnId];

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.touchControls[control] = true;
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.touchControls[control] = false;
        });

        btn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            game.touchControls[control] = false;
        });
    });
}

setupTouchControls();

// Update Game Logic
function update() {
    if (!game.running) return;

    // Handle input
    const moveLeft = game.keys['ArrowLeft'] || game.keys['a'] || game.touchControls.left;
    const moveRight = game.keys['ArrowRight'] || game.keys['d'] || game.touchControls.right;
    const jump = game.keys[' '] || game.keys['ArrowUp'] || game.keys['w'] || game.touchControls.jump;

    // Horizontal movement - Mario-style acceleration
    if (moveLeft) {
        if (player.velocityX > -player.maxSpeed) {
            player.velocityX -= player.acceleration;
        }
        if (player.velocityX < -player.maxSpeed) {
            player.velocityX = -player.maxSpeed;
        }
        player.direction = -1;
    } else if (moveRight) {
        if (player.velocityX < player.maxSpeed) {
            player.velocityX += player.acceleration;
        }
        if (player.velocityX > player.maxSpeed) {
            player.velocityX = player.maxSpeed;
        }
        player.direction = 1;
    } else {
        // Apply friction when no input
        if (player.grounded) {
            player.velocityX *= friction;
        } else {
            player.velocityX *= airResistance;
        }
        // Stop completely if moving very slowly
        if (Math.abs(player.velocityX) < 0.1) {
            player.velocityX = 0;
        }
    }

    // Jumping
    if (jump && player.grounded) {
        player.velocityY = -player.jumpPower;
        player.grounded = false;
    }

    // Apply gravity
    player.velocityY += gravity;

    // Terminal velocity
    if (player.velocityY > 15) {
        player.velocityY = 15;
    }

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Collision detection with platforms and pipes
    player.grounded = false;
    const allPlatforms = [...platforms, ...pipes];

    allPlatforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            // Calculate overlap on each side
            const overlapLeft = (player.x + player.width) - platform.x;
            const overlapRight = (platform.x + platform.width) - player.x;
            const overlapTop = (player.y + player.height) - platform.y;
            const overlapBottom = (platform.y + platform.height) - player.y;

            // Find the smallest overlap
            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            // Top collision (landing on platform)
            if (minOverlap === overlapTop && player.velocityY > 0) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.grounded = true;
            }
            // Bottom collision (hitting head)
            else if (minOverlap === overlapBottom && player.velocityY < 0) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Left collision
            else if (minOverlap === overlapLeft) {
                player.x = platform.x - player.width;
                player.velocityX = 0;
            }
            // Right collision
            else if (minOverlap === overlapRight) {
                player.x = platform.x + platform.width;
                player.velocityX = 0;
            }
        }
    });

    // Collect TARDIS boxes
    collectibles.forEach(item => {
        if (!item.collected && checkCollision(player, item)) {
            item.collected = true;
        }
    });

    // Check if reached end flag
    if (checkCollision(player, endFlag) && !endFlag.reached) {
        endFlag.reached = true;
        game.running = false;
        showValentineScene();
    }

    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.y > canvas.height) {
        player.y = 0;
        player.x = 50;
        player.velocityY = 0;
    }

    // Update camera to follow player
    camera.x = player.x - canvas.width / 3;
    if (camera.x < 0) camera.x = 0;
}

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Draw Functions
function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds (retro style)
    drawClouds();

    // Save context for camera
    ctx.save();
    ctx.translate(-camera.x, 0);

    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = '#8B4513'; // Brown
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

        // Add brick pattern
        for (let i = 0; i < platform.width; i += 40) {
            ctx.strokeRect(platform.x + i, platform.y, 40, platform.height);
        }
    });

    // Draw pipes
    pipes.forEach(pipe => {
        // Pipe body
        ctx.fillStyle = '#228B22'; // Green
        ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);

        // Pipe rim (top)
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(pipe.x - 5, pipe.y - 5, pipe.width + 10, 10);
        ctx.strokeStyle = '#006400';
        ctx.strokeRect(pipe.x - 5, pipe.y - 5, pipe.width + 10, 10);

        // Pipe details (vertical lines)
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pipe.x + pipe.width / 3, pipe.y);
        ctx.lineTo(pipe.x + pipe.width / 3, pipe.y + pipe.height);
        ctx.moveTo(pipe.x + (pipe.width * 2 / 3), pipe.y);
        ctx.lineTo(pipe.x + (pipe.width * 2 / 3), pipe.y + pipe.height);
        ctx.stroke();
    });

    // Draw collectibles (TARDIS boxes)
    collectibles.forEach(item => {
        if (!item.collected) {
            ctx.fillStyle = '#003B6F'; // TARDIS blue
            ctx.fillRect(item.x, item.y, item.width, item.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(item.x, item.y, item.width, item.height);

            // TARDIS window
            ctx.fillStyle = '#FFF';
            ctx.fillRect(item.x + 5, item.y + 5, item.width - 10, 8);
        }
    });

    // Draw end flag (Le X)
    if (!endFlag.reached) {
        drawLeX(endFlag.x, endFlag.y);
    }

    // Draw player (La M)
    drawLaM(player.x, player.y, player.direction);

    ctx.restore();

    // Draw score
    const collected = collectibles.filter(c => c.collected).length;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 20px Courier New';
    ctx.fillText(`TARDIS: ${collected}/${collectibles.length}`, 10, 30);
}

function drawClouds() {
    ctx.fillStyle = '#FFF';
    const cloudPositions = [
        { x: 100 - (camera.x * 0.2) % 1000, y: 50 },
        { x: 400 - (camera.x * 0.2) % 1000, y: 80 },
        { x: 700 - (camera.x * 0.2) % 1000, y: 60 },
    ];

    cloudPositions.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 20, 0, Math.PI * 2);
        ctx.arc(cloud.x + 20, cloud.y, 25, 0, Math.PI * 2);
        ctx.arc(cloud.x + 40, cloud.y, 20, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawLaM(x, y, direction) {
    const scale = 1.5;

    // Pink jumper
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(x + 8*scale, y + 20*scale, 16*scale, 20*scale);

    // Brown hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 8*scale, y, 16*scale, 12*scale);

    // Face
    ctx.fillStyle = '#FFD5A3';
    ctx.fillRect(x + 10*scale, y + 8*scale, 12*scale, 12*scale);

    // Glasses
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 10*scale, y + 12*scale, 5*scale, 5*scale);
    ctx.strokeRect(x + 17*scale, y + 12*scale, 5*scale, 5*scale);
    ctx.beginPath();
    ctx.moveTo(x + 15*scale, y + 14*scale);
    ctx.lineTo(x + 17*scale, y + 14*scale);
    ctx.stroke();

    // Arms
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(x + 4*scale, y + 22*scale, 5*scale, 14*scale);
    ctx.fillRect(x + 23*scale, y + 22*scale, 5*scale, 14*scale);

    // Legs (black)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10*scale, y + 40*scale, 6*scale, 8*scale);
    ctx.fillRect(x + 18*scale, y + 40*scale, 6*scale, 8*scale);

    // Oboe (in hand)
    if (direction === 1) {
        ctx.fillStyle = '#654321';
        ctx.fillRect(x + 28*scale, y + 24*scale, 3*scale, 18*scale);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 28*scale, y + 27*scale, 3*scale, 3*scale);
        ctx.fillRect(x + 28*scale, y + 34*scale, 3*scale, 3*scale);
    } else {
        ctx.fillStyle = '#654321';
        ctx.fillRect(x + 1*scale, y + 24*scale, 3*scale, 18*scale);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 1*scale, y + 27*scale, 3*scale, 3*scale);
        ctx.fillRect(x + 1*scale, y + 34*scale, 3*scale, 3*scale);
    }

    // Outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 8*scale, y, 16*scale, 48*scale);
}

function drawLeX(x, y) {
    const scale = 1.5;

    // Blue shirt
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 8*scale, y + 20*scale, 16*scale, 20*scale);

    // Brown hair
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 8*scale, y, 16*scale, 12*scale);

    // Face
    ctx.fillStyle = '#FFD5A3';
    ctx.fillRect(x + 10*scale, y + 8*scale, 12*scale, 12*scale);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 12*scale, y + 12*scale, 3*scale, 3*scale);
    ctx.fillRect(x + 18*scale, y + 12*scale, 3*scale, 3*scale);

    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 16*scale, y + 16*scale, 4*scale, 0, Math.PI);
    ctx.stroke();

    // Arms
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 4*scale, y + 22*scale, 5*scale, 14*scale);
    ctx.fillRect(x + 23*scale, y + 22*scale, 5*scale, 14*scale);

    // Legs (black)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10*scale, y + 40*scale, 6*scale, 8*scale);
    ctx.fillRect(x + 18*scale, y + 40*scale, 6*scale, 8*scale);

    // French Horn
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + 28*scale, y + 30*scale, 10*scale, 0, Math.PI * 1.5);
    ctx.stroke();

    // Heart above head
    ctx.fillStyle = '#FF69B4';
    ctx.font = '28px Arial';
    ctx.fillText('❤', x + 12*scale, y - 10);

    // Outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 8*scale, y, 16*scale, 48*scale);
}

// Valentine Scene
function showValentineScene() {
    setTimeout(() => {
        document.getElementById('valentine-scene').classList.remove('hidden');
        setupValentineButtons();
    }, 500);
}

function setupValentineButtons() {
    const yesBtn = document.getElementById('yes-btn');
    const noBtn = document.getElementById('no-btn');
    let noAttempts = 0;

    noBtn.addEventListener('click', () => {
        noAttempts++;

        if (noAttempts === 1) {
            noBtn.classList.add('run-away');
            yesBtn.classList.add('grow');
        }

        setTimeout(() => {
            if (noAttempts >= 1) {
                noBtn.style.display = 'none';
                yesBtn.style.transform = 'scale(1.5)';
                yesBtn.style.padding = '25px 60px';
            }
        }, 500);
    });

    noBtn.addEventListener('mouseover', () => {
        if (noAttempts > 0) {
            const randomX = Math.random() * 200 - 100;
            const randomY = Math.random() * 200 - 100;
            noBtn.style.transform = `translate(${randomX}px, ${randomY}px)`;
        }
    });

    yesBtn.addEventListener('click', () => {
        document.querySelector('.dialogue-text').textContent = '💕 Happy Valentine\'s Day! 💕';
        yesBtn.style.display = 'none';
        noBtn.style.display = 'none';

        // Create celebration
        createHearts();
    });
}

function createHearts() {
    const container = document.querySelector('.scene-content');
    for (let i = 0; i < 20; i++) {
        const heart = document.createElement('div');
        heart.textContent = '❤️';
        heart.style.position = 'absolute';
        heart.style.left = Math.random() * 100 + '%';
        heart.style.top = Math.random() * 100 + '%';
        heart.style.fontSize = (Math.random() * 30 + 20) + 'px';
        heart.style.animation = `heartFloat ${Math.random() * 2 + 2}s ease-in-out infinite`;
        container.appendChild(heart);
    }

    // Add float animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes heartFloat {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(10deg); }
        }
    `;
    document.head.appendChild(style);
}

// Game Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
