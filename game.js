import './menu.js';
import { 
    player, resetPlayer, updatePlayerState, 
    runFrames, runAssetsLoaded, numRunFrames, 
    attackFrames, attackAssetsLoaded, numAttackFrames, 
    jumpSprite, jumpAssetLoaded, 
    flyFrames, flyAssetsLoaded, numFlyFrames,
    runnerFrames, runnerAssetsLoaded, numRunnerFrames,
    shooterLoadedSprite, shooterLoadedAssetLoaded,
    shooterUnloadedSprite, shooterUnloadedAssetLoaded,
    missileFrames, missileAssetsLoaded, numMissileFrames,
    carrierFuelSprite, carrierFuelAssetLoaded,
    carrierHealthSprite, carrierHealthAssetLoaded,
    flyerFrames, flyerAssetsLoaded,
    deathSprite, deathAssetLoaded
} from './player.js';
import { checkCollision, updatePlatformsState, createNewPlatform, generateEnemy, spawnCarrierDrone } from './entities.js';
import { updateUI, drawPause, drawFuelBar } from './ui.js';
import { gameBGM, playAttackSFX, startRocketBootsSFX, stopRocketBootsSFX, playExplosionSFX, playCarrierPickupSFX, playPlayerHurtSFX, playPlayerDeathSFX } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const UW = canvas.width / 100;
const UH = canvas.height / 100;

export let gameSpeed = 5;
const baseSpeed = 5; 
export let score = 0;
export let lives = 3;
export let isGameOver = false;
export let isPaused = false;
export let isFirstStart = true;
export let globalTimer = 0;

export function setFirstStart(val) { isFirstStart = val; }

export function togglePause(forceState) {
    if (typeof forceState !== 'undefined') {
        isPaused = forceState;
    } else {
        isPaused = !isPaused;
    }
}

let lastTime = performance.now();
let dt = 1;
const targetFps = 60;
const frameTime = 1000 / targetFps;

const keys = { jump: false };
let platforms = [];
let entities = []; 
let projectiles = [];

export function init() {
    gameSpeed = baseSpeed;
    score = 0;
    lives = 3;
    isGameOver = false;
    globalTimer = 0;
    lastTime = performance.now(); 

    resetPlayer();

    platforms = [
        { x: 0, y: UH * 75, width: UW * 62.5, height: UH * 25 },
        { x: UW * 75, y: UH * 65, width: UW * 50, height: UH * 35 }
    ];
    entities = [];
    projectiles = [];
    
    updateUI(score, lives);
}

window.addEventListener('keydown', (e) => {
    if (isFirstStart) return;

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
        } else if (player.jumpCount === 2 && player.fuel > 0 && !player.isFuelLocked) {
            if (!player.isFlying) {
                startRocketBootsSFX();
            }
            player.isFlying = true;
        }
        keys.jump = true;
    }
    if (['KeyD', 'KeyX', 'ArrowRight'].includes(e.code)) triggerAttack();
    if (e.code === 'KeyP' && !isGameOver) togglePause();
});

window.addEventListener('keyup', (e) => {
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        keys.jump = false;
        if (player.isFlying) stopRocketBootsSFX();
        player.isFlying = false; 
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (isFirstStart) return;
    if (e.button === 0) triggerAttack();
});

function triggerAttack() {
    if (!player.isAttacking && player.attackCooldownTimer <= 0 && !isGameOver && !isPaused && !isFirstStart) {
        player.isAttacking = true;
        player.attackTimer = player.attackDuration;
        player.currentAttackFrame = 0;
        player.attackCooldownTimer = 30;
        playAttackSFX();
    }
}

function loop(currentTime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dt = (currentTime - lastTime) / frameTime;
    lastTime = currentTime;

    if (dt > 4) dt = 1; 

    // Ajustado: O mundo continua vivo se não estiver pausado e nem no menu inicial
    if (!isPaused && !isFirstStart) {
        globalTimer++;

        if (!isGameOver) {
            // === JOGABILIDADE ATIVA NORMAL ===
            let wasFlyingBeforeUpdate = player.isFlying;

            updatePlayerState(player, keys, globalTimer, dt, canvas.height);
            
            if (wasFlyingBeforeUpdate && !player.isFlying) {
                stopRocketBootsSFX();
            }
            
            if (player.isAttacking) {
                player.attackTimer -= 1 * dt;
                const progress = player.attackDuration - player.attackTimer;
                const frameInterval = player.attackDuration / numAttackFrames;
                player.currentAttackFrame = Math.min(Math.floor(progress / frameInterval), numAttackFrames - 1);
                if (player.attackTimer <= 0) {
                    player.isAttacking = false;
                    player.attackTimer = 0;
                }
            }
            player.attackBox.x = player.x + player.width;
            player.attackBox.y = player.y;

            if (player.invulnerableTimer > 0) {
                player.invulnerableTimer -= 1 * dt;
                if (player.invulnerableTimer < 0) player.invulnerableTimer = 0;
            }
            if (player.attackCooldownTimer > 0) {
                player.attackCooldownTimer -= 1 * dt;
                if (player.attackCooldownTimer < 0) player.attackCooldownTimer = 0;
            }

            let wasGrounded = player.isGrounded;
            player.isGrounded = false;
            platforms.forEach(plat => {
                if (player.x + player.width > plat.x &&
                    player.x < plat.x + plat.width &&
                    player.y + player.height <= plat.y + 12 &&
                    player.y + player.height + (player.vy * dt) >= plat.y) {
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
                player.coyoteTimer -= 1 * dt;
            }

            if (player.isGrounded && globalTimer % player.animationSpeed === 0) {
                player.currentFrame = (player.currentFrame + 1) % numRunFrames;
            }

            if (player.y > canvas.height + 50) {
                player.invulnerableTimer = 0;
                takeDamage(3);
            }

            score += 0.1 * player.comboMultiplier * dt;
            if (globalTimer % 500 === 0) gameSpeed += 0.5;
            updateUI(score, lives);

        } else {
            // === COMPORTAMENTO DE GAME OVER CORRIGIDO ===
            // Mantém a gravidade agindo para o corpo cair atravessando tudo de forma curva
            player.vy += player.gravity * dt;
            player.y += player.vy * dt;
        }

        // === ROLAGEM DO MUNDO (Executa sempre, mesmo no Game Over!) ===
        platforms = updatePlatformsState(platforms, gameSpeed, dt);
        if (platforms.length < 5) {
            const lastPlat = platforms[platforms.length - 1];
            const nextPlat = createNewPlatform(lastPlat, gameSpeed, UW, UH);
            platforms.push(nextPlat);
            
            // MODIFICADO: Só gera novos inimigos se NÃO for Game Over, limpando a pista pós-morte
            if (!isGameOver && Math.random() > 0.3) {
                entities.push(generateEnemy(nextPlat.x + nextPlat.width / 2, nextPlat.y, gameSpeed, nextPlat));
            }
        }

        // Atualiza movimentações de robôs e tiros em segundo plano
        updateEntitiesLoop();
        updateProjectilesLoop();
    }

    draw();

    if (isGameOver) drawGameOver();
    
    const pauseScreenEl = document.getElementById('pause-screen');
    if (pauseScreenEl) {
        if (isPaused && !isGameOver && !isFirstStart) {
            drawPause(ctx, canvas);
        } else {
            pauseScreenEl.style.display = 'none'; 
        }
    }

    requestAnimationFrame(loop);
}

function updateEntitiesLoop() {
    entities.forEach((ent, index) => {
        if (ent.type === 'flyer') {
            // CORRIGIDO: Se for Game Over, a Dragonfly para de mirar para baixo e voa reto em linha horizontal
            const targetX = isGameOver ? ent.x - 100 : player.x;
            const targetY = isGameOver ? ent.y : player.y;
            const dx = targetX - ent.x;
            const dy = targetY - ent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
                ent.x += ((dx / dist) * 3.5 - gameSpeed) * dt;
                ent.y += ((dy / dist) * 3.5) * dt;
            } else { 
                ent.x -= gameSpeed * dt; 
            }
        } else {
            if (ent.type === 'runner') {
                ent.platLeft -= gameSpeed * dt;
                ent.platRight -= gameSpeed * dt;
                
                if (ent.x <= ent.platLeft && ent.baseVx < 0) {
                    ent.baseVx = Math.abs(ent.baseVx); 
                } else if (ent.x + ent.width >= ent.platRight && ent.baseVx > 0) {
                    ent.baseVx = -Math.abs(ent.baseVx); 
                }
            }
            ent.x += (-gameSpeed + (ent.baseVx || 0)) * dt;
            ent.y += ent.vy * dt;
        }

        if (ent.type === 'flyer') {
            ent.frameTimer += 1 * dt;
            if (ent.frameTimer >= ent.animationSpeed) {
                ent.currentFrame = (ent.currentFrame + 1) % 2;
                ent.frameTimer = 0;
            }
        }

        // CORRIGIDO: O atirador só gera mísseis novos se o jogo ainda estiver rolando
        if (!isGameOver && ent.type === 'shooter' && !ent.hasShot && ent.x < (UW * 73.2)) {
            const dx = (player.x + player.width / 2) - ent.x;
            const dy = (player.y + player.height / 2) - (ent.y + ent.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const missileHeight = 14; 
            
            projectiles.push({ 
                x: ent.x, 
                y: ent.y + ent.height / 2, 
                height: missileHeight,
                width: missileHeight * (300 / 100), 
                vx: (dx / dist) * (gameSpeed + 5), 
                vy: (dy / dist) * (gameSpeed + 5), 
                isReflected: false, 
                color: '#ffea00' 
            });
            ent.hasShot = true;
        }

        // CORRIGIDO: Bloqueia qualquer colisão ou iteração física caso o player já esteja morto
        if (!isGameOver) {
            // 1. COLISÃO DO ATAQUE MELEE (ESPADA) COM INIMIGOS
            if (player.isAttacking && checkCollision(player.attackBox, ent)) {
                if (ent.type === 'carrier') {
                    if (ent.loot === 'life' && lives < 3) {
                        lives++;
                    } else if (ent.loot === 'fuel') {
                        player.fuel = Math.min(player.maxFuel, player.fuel + (player.maxFuel * 0.5));
                    }
                    playCarrierPickupSFX(); 
                    updateUI(score, lives);
                } 
                else if (ent.type !== 'wall') {
                    playExplosionSFX(); 
                    if (Math.random() <= 0.10) {
                        entities.push(spawnCarrierDrone(ent.x, player.y));
                    }
                }

                entities.splice(index, 1);
                player.comboKills++;
                if (player.comboKills % 2 === 0) player.comboMultiplier += 0.1;
                score += 50 * player.comboMultiplier;
                return; 
            }

            // 2. COLISÃO DIRETA DO CORPO DO PLAYER COM INIMIGOS
            if (checkCollision(player, ent)) {
                if (ent.type === 'carrier') {
                    if (ent.loot === 'life' && lives < 3) {
                        lives++;
                    } else if (ent.loot === 'fuel') {
                        player.fuel = Math.min(player.maxFuel, player.fuel + (player.maxFuel * 0.5));
                    }
                    playCarrierPickupSFX(); 
                    updateUI(score, lives);
                    
                    entities.splice(index, 1);
                    score += 25 * player.comboMultiplier;
                } else if (player.invulnerableTimer <= 0) {
                    if (ent.type !== 'wall') {
                        playExplosionSFX(); 
                    }
                    takeDamage(1);
                    entities.splice(index, 1); 
                }
            }
        }
    });

    entities = entities.filter(ent => ent.x + ent.width > 0);
}

function updateProjectilesLoop() {
    projectiles.forEach((proj, index) => {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (!proj.isReflected) {
            // CORRIGIDO: Mísseis ativos ignoram o player morto se for Game Over
            if (!isGameOver && checkCollision(proj, player)) { projectiles.splice(index, 1); takeDamage(1); return; }
            if (!isGameOver && player.isAttacking && checkCollision(player.attackBox, proj)) {
                proj.isReflected = true; proj.color = '#00ff66'; score += 30 * player.comboMultiplier;
                let closestEnemy = null, minDist = Infinity;
                entities.forEach(ent => {
                    if (ent.type !== 'wall') {
                        const d = Math.sqrt(Math.pow(ent.x - proj.x, 2) + Math.pow(ent.y - proj.y, 2));
                        if (d < minDist) { minDist = d; closestEnemy = ent; }
                    }
                });
                if (closestEnemy) {
                    const rDx = closestEnemy.x - proj.x, rDy = closestEnemy.y - proj.y, rDist = Math.sqrt(rDx * rDx + rDy * rDy);
                    proj.vx = (rDx / rDist) * 14; proj.vy = (rDy / rDist) * 14;
                } else { proj.vx = 14; proj.vy = 0; }
            }
        } else {
            entities.forEach((ent, eIdx) => {
                if (checkCollision(proj, ent) && ent.type !== 'wall') {
                    playExplosionSFX(); 
                    
                    entities.splice(eIdx, 1); 
                    projectiles.splice(index, 1);
                    player.comboKills++;
                    if (player.comboKills % 2 === 0) player.comboMultiplier += 0.1;
                    score += 70 * player.comboMultiplier;
                }
            });
        }
    });
    projectiles = projectiles.filter(p => p.x > 0 && p.x < canvas.width && p.y > 0 && p.y < canvas.height);
}

function takeDamage(amount) {
    if (player.invulnerableTimer <= 0 && !isGameOver) {
        lives -= amount;
        player.invulnerableTimer = 45;
        player.comboKills = 0;
        player.comboMultiplier = 1.0;
        updateUI(score, lives);
        
        if (lives <= 0) { 
            isGameOver = true; 
            lives = 0; 
            gameBGM.pause(); 
            playPlayerDeathSFX(); 
            updateUI(score, lives); 
        } else {
            playPlayerHurtSFX(); 
        }
    }
}

function draw() {
    // Desenha Plataformas
    platforms.forEach(plat => { 
        ctx.fillStyle = '#2c2e3e'; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(plat.x, plat.y, plat.width, 4); 
    });

    // Desenha Projéteis (Mísseis)
    projectiles.forEach(proj => {
        if (typeof missileAssetsLoaded !== 'undefined' && missileAssetsLoaded === numMissileFrames) {
            const currentMissileFrame = Math.floor(globalTimer / 6) % numMissileFrames;
            const sprite = missileFrames[currentMissileFrame];

            ctx.save();
            ctx.translate(proj.x + proj.width / 2, proj.y + proj.height / 2);
            
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.rotate(angle);

            if (proj.vx < 0) {
                ctx.scale(1, -1);
            }

            ctx.drawImage(sprite, -proj.width / 2, -proj.height / 2, proj.width, proj.height);
            ctx.restore();
        } else {
            ctx.fillStyle = proj.color;
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });

    // Desenha Inimigos (Runner, Flyer/Dragonfly, Shooter, Carrier)
    entities.forEach(ent => {
        if (ent.type === 'runner' && typeof runnerAssetsLoaded !== 'undefined' && runnerAssetsLoaded >= 2) {
            const currentRunnerFrame = Math.floor(globalTimer / 8) % 2; 
            const sprite = runnerFrames[currentRunnerFrame];

            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (ent.baseVx < 0) ctx.scale(-1, 1);
            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();
        }
        else if (ent.type === 'flyer' && typeof flyerAssetsLoaded !== 'undefined' && flyerAssetsLoaded === 2) {
            const sprite = flyerFrames[ent.currentFrame];

            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1); 

            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();
        } 
        else if (ent.type === 'shooter' && typeof shooterLoadedAssetLoaded !== 'undefined' && shooterLoadedAssetLoaded && shooterUnloadedAssetLoaded) {
            const sprite = ent.hasShot ? shooterUnloadedSprite : shooterLoadedSprite;

            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1);

            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();
        } 
        else if (ent.type === 'carrier') {
            let sprite = null;
            if (ent.loot === 'fuel' && carrierFuelAssetLoaded) sprite = carrierFuelSprite;
            if (ent.loot === 'life' && carrierHealthAssetLoaded) sprite = carrierHealthSprite;

            if (sprite) {
                ctx.save();
                ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
                ctx.restore();
            } else {
                ctx.fillStyle = ent.color;
                ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
            }
        }
        else {
            ctx.fillStyle = ent.color; ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
            if (ent.type === 'wall') {
                ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
                for (let i = 20; i < ent.height; i += 20) { ctx.beginPath(); ctx.moveTo(ent.x, i); ctx.lineTo(ent.x + ent.width, i); ctx.stroke(); }
            }
        }
    });

    // === DESENHA PLAYER (PROPORÇÃO E MORTE CONFIGURADAS) ===
    if (isGameOver && typeof deathAssetLoaded !== 'undefined' && deathAssetLoaded) {
        // CORRIGIDO: Força o desenho da sprite de morte continuamente ao perder a run
        ctx.drawImage(deathSprite, player.x, player.y, player.width, player.height);
    } 
    else if (player.invulnerableTimer % 4 < 2) {
        if (player.isAttacking && attackAssetsLoaded === numAttackFrames) {
            const attackVisualWidth = player.height * (925 / 470);
            ctx.drawImage(attackFrames[player.currentAttackFrame], player.x, player.y, attackVisualWidth, player.height);
        } else if (player.isFlying && flyAssetsLoaded === numFlyFrames) {
            ctx.drawImage(flyFrames[player.flyFrame], player.x, player.y, player.width, player.height);
        } else if (!player.isGrounded && jumpAssetLoaded) {
            ctx.drawImage(jumpSprite, player.x, player.y, player.width, player.height);
        } else if (player.isGrounded && runAssetsLoaded === numRunFrames) {
            ctx.drawImage(runFrames[player.currentFrame], player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    // Indicador numérico do Combo Multiplier
    if (!isFirstStart && !isGameOver && player.comboMultiplier > 1.0) {
        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, player.x + player.width + 6, player.y + 4);
    }

    // HUD da barra de combustível
    if (!isFirstStart && !isGameOver) drawFuelBar(ctx, player);
}

function drawGameOver() {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen && gameOverScreen.style.display === 'none') gameOverScreen.style.display = 'flex';
}

init();
requestAnimationFrame((timestamp) => { lastTime = timestamp; loop(timestamp); });