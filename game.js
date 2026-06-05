const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');

// Configurações Globais
let gameSpeed = 5;
let score = 0;
let lives = 3;
let isGameOver = false;
let isPaused = false;
let isFirstStart = true; // Controla o início congelado
let globalTimer = 0;

const keys = { jump: false };

// --- CARREGAMENTO DE ASSETS (ANIMAÇÃO DE CORRIDA) ---
const runFrames = [];
const numRunFrames = 4;
let runAssetsLoaded = 0;

for (let i = 1; i <= numRunFrames; i++) {
    const img = new Image();
    img.src = `assets/player_run_${i}.png`;
    img.onload = () => { runAssetsLoaded++; };
    runFrames.push(img);
}

// --- CARREGAMENTO DE ASSETS (ANIMAÇÃO DE ATAQUE) ---
const attackFrames = [];
const numAttackFrames = 3;
let attackAssetsLoaded = 0;

for (let i = 1; i <= numAttackFrames; i++) {
    const img = new Image();
    img.src = `assets/player_attack_${i}.png`;
    img.onload = () => { attackAssetsLoaded++; };
    attackFrames.push(img);
}

// --- CARREGAMENTO DE ASSETS (PULO E VOO) ---
const jumpSprite = new Image();
jumpSprite.src = 'assets/player_jump.png';
let jumpAssetLoaded = false;
jumpSprite.onload = () => { jumpAssetLoaded = true; };

const flyFrames = [];
const numFlyFrames = 3;
let flyAssetsLoaded = 0;

for (let i = 1; i <= numFlyFrames; i++) {
    const img = new Image();
    img.src = `assets/player_fly_${i}.png`;
    img.onload = () => { flyAssetsLoaded++; };
    flyFrames.push(img);
}

// Objeto do Jogador
const player = {
    x: 120,
    y: 100,
    width: 32,
    height: 48,
    vy: 0,
    gravity: 0.6,
    jumpForce: -12,
    doubleJumpForce: -8.4, 
    isGrounded: false,
    isAttacking: false,
    attackTimer: 0,
    attackDuration: 15,
    attackBox: { x: 0, y: 0, width: 50, height: 48 },
    invulnerableTimer: 0,
    color: '#00ffcc',
    
    currentFrame: 0,
    animationSpeed: 6,
    currentAttackFrame: 0,
    attackCooldownTimer: 0,

    // Controle de Pulo Duplo e Voo
    jumpCount: 0,
    isFlying: false,
    maxStamina: 60,       
    stamina: 60,
    staminaRegen: 0.1,    
    flyFrame: 0,
    flyAnimationSpeed: 5,

    coyoteTimer: 0,
    maxCoyoteFrames: 6,

    // IMPLEMENTADO: Atributos do Sistema de Combo
    comboKills: 0,
    comboMultiplier: 1.0
};

// Arrays de Entidades
let platforms = [];
let entities = []; 
let projectiles = [];
let drops = [];

function init() {
    platforms = [
        { x: 0, y: 300, width: 500, height: 200 },
        { x: 600, y: 260, width: 400, height: 200 }
    ];
    entities = [];
    projectiles = [];
    drops = [];
    score = 0;
    lives = 3;
    gameSpeed = 5;
    isGameOver = false;
    
    player.x = 120;
    player.y = 100;
    player.vy = 0;
    player.invulnerableTimer = 0;
    player.isAttacking = false;
    player.currentFrame = 0;
    player.currentAttackFrame = 0;
    player.attackCooldownTimer = 0;
    
    player.jumpCount = 0;
    player.isFlying = false;
    player.stamina = player.maxStamina;
    player.coyoteTimer = 0;

    // Reseta o combo
    player.comboKills = 0;
    player.comboMultiplier = 1.0;
    
    updateUI();
}

// Inputs (Teclado)
window.addEventListener('keydown', (e) => {
    if (isFirstStart) {
        isFirstStart = false;
        return;
    }

    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        
        if (player.isGrounded || player.coyoteTimer > 0) {
            player.vy = player.jumpForce;
            player.isGrounded = false;
            player.coyoteTimer = 0; 
            player.jumpCount = 1;   
        } else if (player.jumpCount === 1) {
            player.vy = player.doubleJumpForce;
            player.jumpCount = 2;
        } else if (player.jumpCount === 2 && player.stamina > 0) {
            player.isFlying = true;
        }
        
        keys.jump = true;
    }
    if (['KeyD', 'KeyX', 'ArrowRight'].includes(e.code)) triggerAttack();
    if (e.code === 'KeyP' && !isGameOver) isPaused = !isPaused;
    if (e.code === 'Enter' && isGameOver) init();
});

window.addEventListener('keyup', (e) => {
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        keys.jump = false;
        player.isFlying = false; 
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (isFirstStart) {
        isFirstStart = false;
        return;
    }
    if (e.button === 0) triggerAttack();
});

function triggerAttack() {
    if (!player.isAttacking && player.attackCooldownTimer === 0 && !isGameOver && !isPaused && !isFirstStart) {
        player.isAttacking = true;
        player.attackTimer = player.attackDuration;
        player.currentAttackFrame = 0;
        player.attackCooldownTimer = 30;
    }
}

function updateUI() {
    scoreDisplay.innerText = `Score: ${Math.floor(score)}`;
    livesDisplay.innerText = 'HP: ' + '❤️'.repeat(Math.max(0, lives));
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Loop Principal
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isGameOver && !isPaused && !isFirstStart) {
        globalTimer++;
        updatePlayer();
        updatePlatforms();
        updateEntities();
        updateProjectiles();
        updateDrops();
        
        // Multiplica o ganho de score passivo do runner pelo combo atual
        score += 0.1 * player.comboMultiplier;
        
        if (globalTimer % 500 === 0) gameSpeed += 0.5;
        updateUI();
    }

    draw();

    if (isFirstStart) drawFirstStart();
    if (isGameOver) drawGameOver();
    if (isPaused && !isGameOver && !isFirstStart) drawPause();

    requestAnimationFrame(loop);
}

function updatePlayer() {
    if (player.isFlying && keys.jump && player.stamina > 0) {
        player.vy = -3.5; 
        player.stamina--; 
        
        if (globalTimer % player.flyAnimationSpeed === 0) {
            player.flyFrame = (player.flyFrame + 1) % numFlyFrames;
        }

        if (player.stamina <= 0) {
            player.isFlying = false;
        }
    } else {
        player.vy += player.gravity;
        player.isFlying = false;

        if (player.isGrounded && player.stamina < player.maxStamina) {
            player.stamina = Math.min(player.maxStamina, player.stamina + player.staminaRegen);
        }
    }

    player.y += player.vy;
    
    let wasGrounded = player.isGrounded;
    player.isGrounded = false;

    if (player.isAttacking) {
        player.attackTimer--;
        const progress = player.attackDuration - player.attackTimer;
        const frameInterval = player.attackDuration / numAttackFrames;
        player.currentAttackFrame = Math.min(Math.floor(progress / frameInterval), numAttackFrames - 1);

        if (player.attackTimer <= 0) player.isAttacking = false;
    }

    player.attackBox.x = player.x + player.width;
    player.attackBox.y = player.y;

    if (player.invulnerableTimer > 0) player.invulnerableTimer--;
    if (player.attackCooldownTimer > 0) player.attackCooldownTimer--;

    // Colisão com as Plataformas
    platforms.forEach(plat => {
        if (player.x + player.width > plat.x &&
            player.x < plat.x + plat.width &&
            player.y + player.height <= plat.y + 12 &&
            player.y + player.height + player.vy >= plat.y) {
            
            player.vy = 0;
            player.y = plat.y - player.height;
            player.isGrounded = true;
            player.jumpCount = 0; 
            player.coyoteTimer = player.maxCoyoteFrames; 
        }
    });

    if (wasGrounded && !player.isGrounded && player.vy >= 0) {
        player.coyoteTimer = player.maxCoyoteFrames;
        player.jumpCount = 1; 
    } else if (player.coyoteTimer > 0) {
        player.coyoteTimer--;
    }

    if (player.isGrounded) {
        if (globalTimer % player.animationSpeed === 0) {
            player.currentFrame = (player.currentFrame + 1) % numRunFrames;
        }
    }

    if (player.y > canvas.height) takeDamage(3);
}

function updatePlatforms() {
    platforms.forEach(plat => plat.x -= gameSpeed);
    platforms = platforms.filter(plat => plat.x + plat.width > 0);

    if (platforms.length < 5) {
        const lastPlat = platforms[platforms.length - 1];
        
        const minGap = 100, maxGap = 350; 
        const minWidth = 180, maxWidth = 450;
        
        const gap = Math.random() * (maxGap - minGap) + minGap;
        const width = Math.random() * (maxWidth - minWidth) + minWidth;
        const nextX = lastPlat.x + lastPlat.width + gap;
        const nextY = Math.floor(Math.random() * (350 - 120) + 120);

        platforms.push({ x: nextX, y: nextY, width: width, height: 400 - nextY });

        if (Math.random() > 0.3) {
            spawnEntity(nextX + width / 2, nextY);
        }
    }
}

function spawnEntity(spawnX, platY) {
    const types = ['runner_enemy', 'flyer_enemy', 'shooter_enemy', 'wall'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'runner_enemy') {
        entities.push({
            type: 'runner', x: spawnX, y: platY - 36, width: 30, height: 36,
            vx: -(gameSpeed + 2), vy: 0, platFloorY: platY, color: '#ff0055'
        });
    } else if (type === 'flyer_enemy') {
        entities.push({
            type: 'flyer', x: spawnX, y: Math.random() * (platY - 100) + 40, width: 28, height: 28,
            vx: -gameSpeed, vy: 0, hasShot: false, platFloorY: platY, color: '#d600ff'
        });
    } else if (type === 'shooter_enemy') {
        entities.push({
            type: 'shooter', x: spawnX, y: Math.random() * (platY - 120) + 40, width: 32, height: 32,
            vx: -gameSpeed, vy: 0, isTracking: true, platFloorY: platY, color: '#00bfff'
        });
    } else {
        entities.push({
            type: 'wall', x: spawnX, y: 0, width: 30, height: platY,
            vx: -gameSpeed, vy: 0, platFloorY: platY, color: '#ffaa00'
        });
    }
}

// Função auxiliar para gerenciar a adição de combo
function addCombo() {
    player.comboKills++;
    if (player.comboKills % 2 === 0) {
        player.comboMultiplier = parseFloat((player.comboMultiplier + 0.1).toFixed(1));
    }
}

function updateEntities() {
    entities.forEach((ent, index) => {
        if (ent.type === 'shooter' && ent.isTracking) {
            const dx = player.x - ent.x;
            const dy = player.y - ent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = gameSpeed + 3.5;

            if (dist > 5) {
                ent.vx = (dx / dist) * speed;
                ent.vy = (dy / dist) * speed;
            }
        }

        ent.x += ent.vx;
        ent.y += ent.vy;

        if (ent.type === 'flyer' && !ent.hasShot && ent.x < 750) {
            const projX = ent.x;
            const projY = ent.y + ent.height / 2;
            const dx = (player.x + player.width / 2) - projX;
            const dy = (player.y + player.height / 2) - projY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const projSpeed = gameSpeed + 5;

            projectiles.push({
                x: projX, y: projY, width: 14, height: 8,
                vx: (dx / dist) * projSpeed, vy: (dy / dist) * projSpeed,
                isReflected: false, color: '#ffea00'
            });
            ent.hasShot = true;
        }

        if (player.isAttacking && checkCollision(player.attackBox, ent)) {
            checkDrop(ent.x, ent.platFloorY); 
            entities.splice(index, 1);
            
            // IMPLEMENTADO: Ganha combo ao matar inimigo corpo a corpo
            addCombo();
            score += 50 * player.comboMultiplier;
            return;
        }

        if (checkCollision(player, ent)) {
            if (player.invulnerableTimer === 0) {
                takeDamage(1);
                entities.splice(index, 1); 
            }
        }
    });

    entities = entities.filter(ent => ent.x + ent.width > 0);
}

function updateProjectiles() {
    projectiles.forEach((proj, index) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        if (!proj.isReflected) {
            if (checkCollision(proj, player)) {
                projectiles.splice(index, 1);
                takeDamage(1);
                return;
            }

            if (player.isAttacking && checkCollision(player.attackBox, proj)) {
                proj.isReflected = true;
                proj.color = '#00ff66';
                score += 30 * player.comboMultiplier;

                let closestEnemy = null;
                let minDist = Infinity;

                entities.forEach(ent => {
                    if (ent.type !== 'wall') {
                        const dist = Math.sqrt(Math.pow(ent.x - proj.x, 2) + Math.pow(ent.y - proj.y, 2));
                        if (dist < minDist) {
                            minDist = dist;
                            closestEnemy = ent;
                        }
                    }
                });

                if (closestEnemy) {
                    const rDx = closestEnemy.x - proj.x;
                    const rDy = closestEnemy.y - proj.y;
                    const rDist = Math.sqrt(rDx * rDx + rDy * rDy);
                    proj.vx = (rDx / rDist) * 14; 
                    proj.vy = (rDy / rDist) * 14;
                } else {
                    proj.vx = 14;
                    proj.vy = 0;
                }
                return;
            }
        } else {
            entities.forEach((ent, eIdx) => {
                if (checkCollision(proj, ent) && ent.type !== 'wall') {
                    checkDrop(ent.x, ent.platFloorY);
                    entities.splice(eIdx, 1);
                    projectiles.splice(index, 1);
                    
                    // IMPLEMENTADO: Ganha combo ao matar inimigo com tiro rebatido
                    addCombo();
                    score += 70 * player.comboMultiplier;
                    return;
                }
            });
        }
    });

    projectiles = projectiles.filter(p => p.x > 0 && p.x < canvas.width && p.y > 0 && p.y < canvas.height);
}

function checkDrop(x, platFloorY) {
    if (Math.random() <= 0.10) {
        drops.push({ x: x, y: platFloorY - 20, width: 20, height: 20, color: '#ff0055' });
    }
}

function updateDrops() {
    drops.forEach((drop, index) => {
        drop.x -= gameSpeed;

        if (checkCollision(player, drop)) {
            if (lives < 3) {
                lives++;
                updateUI();
            }
            drops.splice(index, 1);
            return;
        }
    });
    drops = drops.filter(d => d.x + d.width > 0);
}

function takeDamage(amount) {
    if (player.invulnerableTimer === 0 && !isGameOver) {
        lives -= amount;
        player.invulnerableTimer = 45;
        
        // IMPLEMENTADO: Perde todo o combo imediatamente ao ser atingido
        player.comboKills = 0;
        player.comboMultiplier = 1.0;

        updateUI();
        if (lives <= 0) isGameOver = true;
    }
}

function draw() {
    // Desenha Plataformas
    ctx.fillStyle = '#2c2e3e';
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
        ctx.fillStyle = '#2c2e3e';
    });

    // Desenha Drops
    drops.forEach(drop => {
        ctx.fillStyle = drop.color;
        ctx.font = '16px Courier New';
        ctx.fillText('❤️', drop.x, drop.y + 14);
    });

    // Desenha Projéteis
    projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
    });

    // Desenha Inimigos
    entities.forEach(ent => {
        ctx.fillStyle = ent.color;
        ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
        
        if (ent.type === 'wall') {
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            for (let i = 20; i < ent.height; i += 20) {
                ctx.beginPath();
                ctx.moveTo(ent.x, i);
                ctx.lineTo(ent.x + ent.width, i);
                ctx.stroke();
            }
        }
    });

    // Desenha Player
    if (player.invulnerableTimer % 4 < 2) {
        if (player.isAttacking && attackAssetsLoaded === numAttackFrames) {
            const attackVisualWidth = player.width + player.attackBox.width;
            ctx.drawImage(attackFrames[player.currentAttackFrame], player.x, player.y, attackVisualWidth, player.height);
        } else if (player.isFlying && flyAssetsLoaded === numFlyFrames) {
            ctx.drawImage(flyFrames[player.flyFrame], player.x, player.y, player.width, player.height);
        } else if (!player.isGrounded && jumpAssetLoaded) {
            ctx.drawImage(jumpSprite, player.x, player.y, player.width, player.height);
        } else if (player.isGrounded && runAssetsLoaded === numRunFrames) {
            ctx.drawImage(runFrames[player.currentFrame], player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = player.isAttacking ? '#ffff00' : player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    // IMPLEMENTADO: Desenha o texto sutil de combo "x 1.1" ao lado superior direito da cabeça do player
    if (!isFirstStart && !isGameOver && player.comboMultiplier > 1.0) {
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'left';
        // X: Posição do boneco + a largura dele + 6px de folga | Y: Altura da cabeça + 4px
        ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, player.x + player.width + 6, player.y + 4);
    }

    // AJUSTADO: Desenha a HUD da Barra de Estamina sem o texto estático poluindo
    if (!isFirstStart && !isGameOver) {
        const hudX = 20;
        const hudY = 50; // Alinhada e compacta no canto superior esquerdo
        const hudWidth = 150;
        const hudHeight = 8;

        ctx.fillStyle = 'rgba(44, 46, 62, 0.8)';
        ctx.fillRect(hudX, hudY, hudWidth, hudHeight);
        ctx.strokeStyle = '#626a8a';
        ctx.strokeRect(hudX, hudY, hudWidth, hudHeight);

        const currentProgressWidth = (player.stamina / player.maxStamina) * hudWidth;
        ctx.fillStyle = player.stamina < 15 ? '#ff0055' : '#00ffcc'; 
        ctx.fillRect(hudX, hudY, currentProgressWidth, hudHeight);
    }
}

function drawFirstStart() {
    ctx.fillStyle = 'rgba(13, 14, 21, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ffcc';
    ctx.font = '24px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('RUNNER', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Courier New';
    ctx.fillText('Pressione qualquer tecla para iniciar', canvas.width / 2, canvas.height / 2 + 20);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(13, 14, 21, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff0055';
    ctx.font = '30px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Courier New';
    ctx.fillText('Pressione ENTER para Recomeçar', canvas.width / 2, canvas.height / 2 + 20);
}

function drawPause() {
    ctx.fillStyle = 'rgba(13, 14, 21, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ffcc';
    ctx.font = '30px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    loop();
});