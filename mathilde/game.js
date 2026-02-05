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
    width: 52,  // Adjusted to better match visual width (26*2)
    height: 104, // Adjusted to match visual height (52*2 scale)
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    maxSpeed: 6,
    walkAcceleration: 0.6,
    runAcceleration: 1.2,
    deceleration: 0.5,
    skidDeceleration: 1.5,
    jumpPower: 14,
    jumpHoldBonus: 0.15,
    grounded: false,
    jumping: false,
    direction: 1 // 1 = right, -1 = left
};

// Physics - Super Mario Bros inspired
const gravity = 0.6;
const maxFallSpeed = 10;
const groundFriction = 0.85;
const airFriction = 0.98;

// Camera
const camera = {
    x: 0,
    y: 0
};

// Level Design - Initialize as empty arrays
const platforms = [];
const pipes = [];
const collectibles = [];

// End flag (Le X position) - moved further
const endFlag = {
    x: 4200,
    y: 0,
    width: 52,
    height: 104,
    reached: false
};

// Initialize level positions
function initLevel() {
    // Clear and recalculate all level positions based on canvas height
    platforms.length = 0;
    platforms.push(
        // Ground - extended
        { x: 0, y: canvas.height - 50, width: 5000, height: 50 },
        // Floating platforms
        { x: 200, y: canvas.height - 150, width: 150, height: 20 },
        { x: 400, y: canvas.height - 200, width: 150, height: 20 },
        { x: 600, y: canvas.height - 250, width: 150, height: 20 },
        { x: 850, y: canvas.height - 200, width: 150, height: 20 },
        { x: 1100, y: canvas.height - 250, width: 200, height: 20 },
        { x: 1400, y: canvas.height - 180, width: 150, height: 20 },
        { x: 1650, y: canvas.height - 220, width: 150, height: 20 },
        { x: 1900, y: canvas.height - 180, width: 200, height: 20 },
        { x: 2200, y: canvas.height - 150, width: 300, height: 20 },
        // Extended section
        { x: 2600, y: canvas.height - 200, width: 150, height: 20 },
        { x: 2850, y: canvas.height - 170, width: 200, height: 20 },
        { x: 3150, y: canvas.height - 220, width: 150, height: 20 },
        { x: 3400, y: canvas.height - 190, width: 200, height: 20 },
        { x: 3700, y: canvas.height - 160, width: 250, height: 20 }
    );

    pipes.length = 0;
    pipes.push(
        { x: 300, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 700, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 1000, y: canvas.height - 120, width: 50, height: 70, type: 'pipe' },
        { x: 1200, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 1500, y: canvas.height - 140, width: 50, height: 90, type: 'pipe' },
        { x: 1800, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 2300, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 2700, y: canvas.height - 120, width: 50, height: 70, type: 'pipe' },
        { x: 3200, y: canvas.height - 100, width: 50, height: 50, type: 'pipe' },
        { x: 3600, y: canvas.height - 110, width: 50, height: 60, type: 'pipe' }
    );

    collectibles.length = 0;
    collectibles.push(
        { x: 250, y: canvas.height - 200, width: 32, height: 48, collected: false },
        { x: 450, y: canvas.height - 250, width: 32, height: 48, collected: false },
        { x: 900, y: canvas.height - 250, width: 32, height: 48, collected: false },
        { x: 1450, y: canvas.height - 230, width: 32, height: 48, collected: false },
        { x: 2000, y: canvas.height - 230, width: 32, height: 48, collected: false },
        { x: 2700, y: canvas.height - 250, width: 32, height: 48, collected: false },
        { x: 3250, y: canvas.height - 270, width: 32, height: 48, collected: false },
        { x: 3800, y: canvas.height - 210, width: 32, height: 48, collected: false }
    );

    // Le X is on the ground at the end
    endFlag.y = canvas.height - 50 - 104; // Ground level minus character height
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

// Handle orientation change for Safari mobile
window.addEventListener('orientationchange', () => {
    // Delay to allow Safari to update viewport
    setTimeout(() => {
        resizeCanvas();
    }, 100);
});

// Handle Safari mobile viewport changes (tab bar showing/hiding)
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        resizeCanvas();
    });
}

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
    const jumpPressed = game.keys[' '] || game.keys['ArrowUp'] || game.keys['w'] || game.touchControls.jump;

    // Horizontal movement - Super Mario Bros physics
    if (moveLeft) {
        // Change direction
        if (player.velocityX > 0) {
            // Skidding when changing direction
            player.velocityX -= player.skidDeceleration;
        } else {
            // Accelerate left
            player.velocityX -= player.walkAcceleration;
            if (player.velocityX < -player.maxSpeed) {
                player.velocityX = -player.maxSpeed;
            }
        }
        player.direction = -1;
    } else if (moveRight) {
        // Change direction
        if (player.velocityX < 0) {
            // Skidding when changing direction
            player.velocityX += player.skidDeceleration;
        } else {
            // Accelerate right
            player.velocityX += player.walkAcceleration;
            if (player.velocityX > player.maxSpeed) {
                player.velocityX = player.maxSpeed;
            }
        }
        player.direction = 1;
    } else {
        // Deceleration when no input
        if (player.grounded) {
            if (player.velocityX > 0) {
                player.velocityX -= player.deceleration;
                if (player.velocityX < 0) player.velocityX = 0;
            } else if (player.velocityX < 0) {
                player.velocityX += player.deceleration;
                if (player.velocityX > 0) player.velocityX = 0;
            }
        } else {
            // Air resistance (minimal)
            player.velocityX *= airFriction;
        }
    }

    // Variable height jumping - Mario style
    if (jumpPressed && player.grounded && !player.jumping) {
        player.velocityY = -player.jumpPower;
        player.grounded = false;
        player.jumping = true;
    }

    // Release jump button = reduced upward velocity (shorter jump)
    if (!jumpPressed && player.jumping && player.velocityY < 0) {
        player.velocityY *= 0.5; // Cut jump short
        player.jumping = false;
    }

    // Reset jumping flag when grounded
    if (player.grounded) {
        player.jumping = false;
    }

    // Apply gravity
    if (!player.grounded) {
        player.velocityY += gravity;
    }

    // Terminal velocity
    if (player.velocityY > maxFallSpeed) {
        player.velocityY = maxFallSpeed;
    }

    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;

    // Collision detection with platforms and pipes
    player.grounded = false;
    const allPlatforms = [...platforms, ...pipes];

    allPlatforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            // Previous position (before this frame's movement)
            const prevX = player.x - player.velocityX;
            const prevY = player.y - player.velocityY;

            // Calculate overlaps
            const overlapLeft = (player.x + player.width) - platform.x;
            const overlapRight = (platform.x + platform.width) - player.x;
            const overlapTop = (player.y + player.height) - platform.y;
            const overlapBottom = (platform.y + platform.height) - player.y;

            // Determine collision direction based on velocity and position
            const wasAbove = prevY + player.height <= platform.y + 5;
            const wasBelow = prevY >= platform.y + platform.height - 5;
            const wasLeft = prevX + player.width <= platform.x + 5;
            const wasRight = prevX >= platform.x + platform.width - 5;

            // Top collision (landing on platform)
            if (wasAbove && player.velocityY > 0) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.grounded = true;
            }
            // Bottom collision (hitting head)
            else if (wasBelow && player.velocityY < 0) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Left collision
            else if (wasLeft && player.velocityX > 0) {
                player.x = platform.x - player.width;
                player.velocityX = 0;
            }
            // Right collision
            else if (wasRight && player.velocityX < 0) {
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
            // Main TARDIS body
            ctx.fillStyle = '#003B6F'; // TARDIS blue
            ctx.fillRect(item.x, item.y, item.width, item.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeRect(item.x, item.y, item.width, item.height);

            // TARDIS light on top
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(item.x + item.width/2 - 4, item.y - 6, 8, 6);

            // TARDIS windows (grid)
            ctx.fillStyle = '#FFF';
            ctx.fillRect(item.x + 4, item.y + 6, item.width - 8, 10);
            ctx.fillRect(item.x + 4, item.y + 20, item.width - 8, 10);

            // Window panes
            ctx.strokeStyle = '#003B6F';
            ctx.lineWidth = 2;
            // Top window grid
            ctx.strokeRect(item.x + 8, item.y + 6, item.width/2 - 8, 10);
            ctx.strokeRect(item.x + item.width/2, item.y + 6, item.width/2 - 8, 10);
            // Bottom window grid
            ctx.strokeRect(item.x + 8, item.y + 20, item.width/2 - 8, 10);
            ctx.strokeRect(item.x + item.width/2, item.y + 20, item.width/2 - 8, 10);

            // TARDIS sign
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('POLICE', item.x + 2, item.y + 40);
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
    const scale = 2;

    // Brown hair (styled for adult woman - shoulder length)
    ctx.fillStyle = '#8B4513';
    // Top of hair
    ctx.beginPath();
    ctx.arc(x + 16*scale, y + 8*scale, 11*scale, 0, Math.PI * 2);
    ctx.fill();
    // Hair sides (longer, shoulder-length)
    ctx.fillRect(x + 5*scale, y + 8*scale, 8*scale, 18*scale);
    ctx.fillRect(x + 19*scale, y + 8*scale, 8*scale, 18*scale);
    // Bottom of hair (rounded ends)
    ctx.beginPath();
    ctx.arc(x + 9*scale, y + 26*scale, 4*scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 23*scale, y + 26*scale, 4*scale, 0, Math.PI * 2);
    ctx.fill();

    // Hair highlights (for shine/dimension)
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.arc(x + 14*scale, y + 6*scale, 3*scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 20*scale, y + 7*scale, 2.5*scale, 0, Math.PI * 2);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#FFD5A3';
    ctx.fillRect(x + 13*scale, y + 18*scale, 6*scale, 5*scale);

    // Face (adult proportions - slightly oval)
    ctx.fillStyle = '#FFD5A3';
    ctx.beginPath();
    ctx.ellipse(x + 16*scale, y + 13*scale, 8*scale, 9*scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows (more defined for adult look)
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 10*scale, y + 10*scale, 5*scale, 1*scale);
    ctx.fillRect(x + 17*scale, y + 10*scale, 5*scale, 1*scale);

    // Eyes (more almond-shaped, adult-looking)
    ctx.fillStyle = '#000';
    // Left eye
    ctx.beginPath();
    ctx.ellipse(x + 12*scale, y + 12*scale, 2*scale, 2.5*scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.ellipse(x + 20*scale, y + 12*scale, 2*scale, 2.5*scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights (for life)
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + 11.5*scale, y + 11*scale, 1*scale, 1.5*scale);
    ctx.fillRect(x + 19.5*scale, y + 11*scale, 1*scale, 1.5*scale);

    // Glasses (stylish adult frames)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    // Left lens (larger, rounder)
    ctx.beginPath();
    ctx.arc(x + 12*scale, y + 12.5*scale, 3.5*scale, 0, Math.PI * 2);
    ctx.stroke();
    // Right lens
    ctx.beginPath();
    ctx.arc(x + 20*scale, y + 12.5*scale, 3.5*scale, 0, Math.PI * 2);
    ctx.stroke();
    // Bridge
    ctx.beginPath();
    ctx.moveTo(x + 15.5*scale, y + 12.5*scale);
    ctx.lineTo(x + 16.5*scale, y + 12.5*scale);
    ctx.stroke();
    // Temples (extending to ears)
    ctx.beginPath();
    ctx.moveTo(x + 8.5*scale, y + 12.5*scale);
    ctx.lineTo(x + 6*scale, y + 12.5*scale);
    ctx.moveTo(x + 23.5*scale, y + 12.5*scale);
    ctx.lineTo(x + 26*scale, y + 12.5*scale);
    ctx.stroke();

    // Nose (subtle)
    ctx.strokeStyle = '#D4A574';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 16*scale, y + 14*scale);
    ctx.lineTo(x + 16*scale, y + 16*scale);
    ctx.stroke();

    // Lips (defined smile)
    ctx.strokeStyle = '#D98880';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 16*scale, y + 17*scale, 3*scale, 0, Math.PI);
    ctx.stroke();
    // Upper lip detail
    ctx.strokeStyle = '#C85450';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 14*scale, y + 17*scale);
    ctx.lineTo(x + 18*scale, y + 17*scale);
    ctx.stroke();

    // Pink jumper (fitted adult proportions)
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(x + 8*scale, y + 23*scale, 16*scale, 20*scale);

    // Arms (proportional)
    ctx.fillStyle = '#FFB6C1';
    ctx.fillRect(x + 3*scale, y + 25*scale, 6*scale, 16*scale);
    ctx.fillRect(x + 23*scale, y + 25*scale, 6*scale, 16*scale);

    // Hands (more defined)
    ctx.fillStyle = '#FFD5A3';
    ctx.beginPath();
    ctx.arc(x + 6*scale, y + 40*scale, 3*scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 26*scale, y + 40*scale, 3*scale, 0, Math.PI * 2);
    ctx.fill();

    // Legs (slim fit trousers)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10*scale, y + 43*scale, 5*scale, 9*scale);
    ctx.fillRect(x + 17*scale, y + 43*scale, 5*scale, 9*scale);

    // Shoes (ankle boots)
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 9*scale, y + 50*scale, 6*scale, 4*scale);
    ctx.fillRect(x + 17*scale, y + 50*scale, 6*scale, 4*scale);
    // Heel detail
    ctx.fillStyle = '#4A2511';
    ctx.fillRect(x + 13*scale, y + 52*scale, 2*scale, 2*scale);
    ctx.fillRect(x + 21*scale, y + 52*scale, 2*scale, 2*scale);

    // Oboe (more detailed, professional instrument)
    if (direction === 1) {
        ctx.fillStyle = '#654321';
        ctx.fillRect(x + 27*scale, y + 28*scale, 3*scale, 18*scale);
        // Gold keys (more detailed)
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 27*scale, y + 30*scale, 4*scale, 2*scale);
        ctx.fillRect(x + 27*scale, y + 35*scale, 4*scale, 2*scale);
        ctx.fillRect(x + 27*scale, y + 40*scale, 4*scale, 2*scale);
        // Additional key details
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(x + 28*scale, y + 32*scale, 2*scale, 1*scale);
        ctx.fillRect(x + 28*scale, y + 37*scale, 2*scale, 1*scale);
        // Reed
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(x + 28.5*scale, y + 26*scale, 1*scale, 3*scale);
    } else {
        ctx.fillStyle = '#654321';
        ctx.fillRect(x + 2*scale, y + 28*scale, 3*scale, 18*scale);
        // Gold keys
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 1*scale, y + 30*scale, 4*scale, 2*scale);
        ctx.fillRect(x + 1*scale, y + 35*scale, 4*scale, 2*scale);
        ctx.fillRect(x + 1*scale, y + 40*scale, 4*scale, 2*scale);
        // Additional key details
        ctx.fillStyle = '#B8860B';
        ctx.fillRect(x + 2*scale, y + 32*scale, 2*scale, 1*scale);
        ctx.fillRect(x + 2*scale, y + 37*scale, 2*scale, 1*scale);
        // Reed
        ctx.fillStyle = '#DEB887';
        ctx.fillRect(x + 2.5*scale, y + 26*scale, 1*scale, 3*scale);
    }
}

function drawLeX(x, y) {
    const scale = 2;

    // Brown hair (fuller)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 6*scale, y, 20*scale, 14*scale);
    // Hair highlights
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(x + 8*scale, y + 2*scale, 4*scale, 8*scale);

    // Face (larger)
    ctx.fillStyle = '#FFD5A3';
    ctx.fillRect(x + 8*scale, y + 8*scale, 16*scale, 14*scale);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 11*scale, y + 13*scale, 3*scale, 3*scale);
    ctx.fillRect(x + 18*scale, y + 13*scale, 3*scale, 3*scale);

    // Eyebrows
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 10*scale, y + 11*scale, 4*scale, 1*scale);
    ctx.fillRect(x + 18*scale, y + 11*scale, 4*scale, 1*scale);

    // Big smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 16*scale, y + 17*scale, 4*scale, 0, Math.PI);
    ctx.stroke();

    // Blue shirt
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 6*scale, y + 22*scale, 20*scale, 18*scale);

    // Arms
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 2*scale, y + 24*scale, 6*scale, 14*scale);
    ctx.fillRect(x + 24*scale, y + 24*scale, 6*scale, 14*scale);
    // Hands
    ctx.fillStyle = '#FFD5A3';
    ctx.fillRect(x + 2*scale, y + 36*scale, 6*scale, 4*scale);
    ctx.fillRect(x + 24*scale, y + 36*scale, 6*scale, 4*scale);

    // Legs (black trousers)
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 9*scale, y + 40*scale, 6*scale, 10*scale);
    ctx.fillRect(x + 17*scale, y + 40*scale, 6*scale, 10*scale);

    // Shoes
    ctx.fillStyle = '#654321';
    ctx.fillRect(x + 8*scale, y + 48*scale, 7*scale, 4*scale);
    ctx.fillRect(x + 17*scale, y + 48*scale, 7*scale, 4*scale);

    // French Horn (more detailed)
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x + 28*scale, y + 32*scale, 12*scale, 0, Math.PI * 1.5);
    ctx.stroke();
    // Horn tubing
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 26*scale, y + 30*scale, 8*scale, 0, Math.PI * 1.3);
    ctx.stroke();
    // Bell
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x + 40*scale, y + 28*scale, 4*scale, 0, Math.PI * 2);
    ctx.fill();

    // Heart above head (bigger)
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('❤', x + 10*scale, y - 5);
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
    let isProcessing = false;

    // Handle NO button click/touch
    const handleNoClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isProcessing) return;
        isProcessing = true;

        noAttempts++;

        // Visual feedback
        noBtn.classList.add('pressed');
        setTimeout(() => {
            noBtn.classList.remove('pressed');
        }, 150);

        if (noAttempts === 1) {
            setTimeout(() => {
                noBtn.classList.add('run-away');
                yesBtn.classList.add('grow');
            }, 100);
        }

        setTimeout(() => {
            if (noAttempts >= 1) {
                noBtn.style.display = 'none';
                yesBtn.style.transform = 'scale(1.2)';
            }
            isProcessing = false;
        }, 600);
    };

    // Make NO button run away on hover/touch
    const makeNoButtonEscape = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (noAttempts > 0) {
            const containerRect = document.querySelector('.button-container').getBoundingClientRect();
            const maxMoveX = Math.min(containerRect.width * 0.3, 80);
            const maxMoveY = Math.min(containerRect.height * 0.4, 40);
            const randomX = (Math.random() * maxMoveX * 2) - maxMoveX;
            const randomY = (Math.random() * maxMoveY * 2) - maxMoveY;
            noBtn.style.transform = `translate(${randomX}px, ${randomY}px)`;
            noBtn.style.transition = 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }
    };

    // Handle YES button click/touch
    const handleYesClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isProcessing) return;
        isProcessing = true;

        // Visual feedback
        yesBtn.classList.add('pressed');

        setTimeout(() => {
            document.querySelector('.dialogue-text').textContent = '💕 Happy Valentine\'s Day! 💕';
            yesBtn.style.display = 'none';
            noBtn.style.display = 'none';
            createHearts();
        }, 200);
    };

    // NO Button - use click for better Safari support
    let noTouchStartTime = 0;

    noBtn.addEventListener('touchstart', (e) => {
        noTouchStartTime = Date.now();
        makeNoButtonEscape(e);
    }, { passive: false });

    noBtn.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - noTouchStartTime;
        if (touchDuration < 300) { // Quick tap
            handleNoClick(e);
        }
    }, { passive: false });

    noBtn.addEventListener('click', handleNoClick);
    noBtn.addEventListener('mouseover', makeNoButtonEscape);

    // YES Button - use click for better Safari support
    let yesTouchStartTime = 0;

    yesBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        yesTouchStartTime = Date.now();
        yesBtn.classList.add('pressed');
    }, { passive: false });

    yesBtn.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - yesTouchStartTime;
        if (touchDuration < 300) { // Quick tap
            handleYesClick(e);
        } else {
            yesBtn.classList.remove('pressed');
            isProcessing = false;
        }
    }, { passive: false });

    yesBtn.addEventListener('click', handleYesClick);

    // Prevent context menu on long press (Safari)
    [yesBtn, noBtn].forEach(btn => {
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
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
