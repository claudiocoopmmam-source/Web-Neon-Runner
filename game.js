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
    deathFrames, deathAssetsLoaded, numDeathFrames,
    explosionFrames, explosionAssetsLoaded, numExplosionFrames
} from './player.js';
import { checkCollision, updatePlatformsState, createNewPlatform, generateEnemy, spawnCarrierDrone } from './entities.js';
import { updateUI, drawPause, drawFuelBar } from './ui.js';
import { gameBGM, playAttackSFX, startRocketBootsSFX, stopRocketBootsSFX, playExplosionSFX, playCarrierPickupSFX, playPlayerHurtSFX, playPlayerDeathSFX, playGameOverMusic } from './audio.js';

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

// Estados de controle da sequência dramática de morte
let isDeathSequence = false;
let deathSequenceEndTime = 0;
const DEATH_SEQUENCE_DURATION = 2500; // Janela ajustada cirurgicamente para 2.5 segundos (2500ms)

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
let activeExplosions = []; // Controla os efeitos visuais das explosões dos inimigos

export function init() {
    gameSpeed = baseSpeed;
    score = 0;
    lives = 3;
    isGameOver = false;
    isDeathSequence = false; 
    globalTimer = 0;
    lastTime = performance.now(); 

    resetPlayer();

    platforms = [
        { x: 0, y: UH * 75, width: UW * 62.5, height: UH * 25 },
        { x: UW * 75, y: UH * 65, width: UW * 50, height: UH * 35 }
    ];
    entities = [];
    projectiles = [];
    activeExplosions = [];
    updateUI(score, lives);
}

window.addEventListener('keydown', (e) => {
    if (isFirstStart || isGameOver) return; 

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
    if (isFirstStart || isGameOver) return;
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

    if (!isPaused && !isFirstStart) {
        globalTimer++;

        // === SLOW MOTION EXPONENCIAL / CURVADO (QUASE PAUSADO NO INÍCIO) ===
        if (isDeathSequence) {
            const startTime = deathSequenceEndTime - DEATH_SEQUENCE_DURATION;
            const elapsed = performance.now() - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / DEATH_SEQUENCE_DURATION));

            if (performance.now() < deathSequenceEndTime) {
                const easeProgress = Math.pow(progress, 2.5);
                const slowMoFactor = 0.01 + (0.30 - 0.01) * easeProgress;
                dt *= slowMoFactor;
            } else {
                isDeathSequence = false; 
            }
        }

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
            
            if (player.isAttacking) {
                const attackVisualWidth = player.height * (925 / 470);
                player.attackBox.x = player.x; 
                player.attackBox.y = player.y;
                player.attackBox.width = attackVisualWidth;
                player.attackBox.height = player.height;
            } else {
                player.attackBox.x = player.x;
                player.attackBox.y = player.y;
                player.attackBox.width = player.width;
                player.attackBox.height = player.height;
            }

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
            // === COMPORTAMENTO DE QUEDA APÓS MORTE ===
            player.vy += player.gravity * dt;
            player.y += player.vy * dt;
        }

        // === ROLAGEM DO CENÁRIO E ELEMENTOS ===
        platforms = updatePlatformsState(platforms, gameSpeed, dt);
        if (platforms.length < 5) {
            const lastPlat = platforms[platforms.length - 1];
            const nextPlat = createNewPlatform(lastPlat, gameSpeed, UW, UH);
            platforms.push(nextPlat);
            
            if (!isGameOver && Math.random() > 0.3) {
                entities.push(generateEnemy(nextPlat.x + nextPlat.width / 2, nextPlat.y, gameSpeed, nextPlat));
            }
        }

        updateEntitiesLoop();
        updateProjectilesLoop();

        // Atualiza o ciclo de vida das partículas de explosão rodando no cenário
        activeExplosions.forEach((exp, index) => {
            exp.x -= gameSpeed * dt; 
            exp.frameTimer += 1 * dt;
            if (exp.frameTimer >= exp.animationSpeed) {
                exp.currentFrame++;
                exp.frameTimer = 0;
                if (exp.currentFrame >= numExplosionFrames) {
                    activeExplosions.splice(index, 1); 
                }
            }
        });
    }

    draw();

    if (isGameOver && !isDeathSequence) drawGameOver();
    
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

        if (!isGameOver) {
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
                    activeExplosions.push({ x: ent.x, y: ent.y, width: ent.width, height: ent.height, currentFrame: 0, frameTimer: 0, animationSpeed: 6 });
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

            if (!player.isAttacking && checkCollision(player, ent)) {
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
                } else if (player.invulnerableTimer <= 0 && !isGameOver) {
                    if (ent.type !== 'wall') { 
                        playExplosionSFX(); 
                        activeExplosions.push({ x: ent.x, y: ent.y, width: ent.width, height: ent.height, currentFrame: 0, frameTimer: 0, animationSpeed: 6 });
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
        if (proj.isReflected) {
            if (!proj.target || !entities.includes(proj.target)) {
                let closestEnemy = null, minDist = Infinity;
                entities.forEach(ent => {
                    if (ent.type !== 'wall') {
                        const d = Math.sqrt(Math.pow(ent.x - proj.x, 2) + Math.pow(ent.y - proj.y, 2));
                        if (d < minDist) { minDist = d; closestEnemy = ent; }
                    }
                });
                proj.target = closestEnemy;
            }

            if (proj.target) {
                const targetCenterX = proj.target.x + proj.target.width / 2;
                const targetCenterY = proj.target.y + proj.target.height / 2;
                const projCenterX = proj.x + proj.width / 2;
                const projCenterY = proj.y + proj.height / 2;
                const dx = targetCenterX - projCenterX;
                const dy = targetCenterY - projCenterY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const speed = 16; 
                    proj.vx = (dx / dist) * speed;
                    proj.vy = (dy / dist) * speed;
                }
            } else {
                proj.vx = 16; proj.vy = 0;
            }
        }

        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (!proj.isReflected) {
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
                    proj.target = closestEnemy; 
                    const rDx = closestEnemy.x - proj.x, rDy = closestEnemy.y - proj.y, rDist = Math.sqrt(rDx * rDx + rDy * rDy);
                    proj.vx = (rDx / rDist) * 16; proj.vy = (rDy / rDist) * 16;
                } else { proj.target = null; proj.vx = 16; proj.vy = 0; }
            }
        } else {
            entities.forEach((ent, eIdx) => {
                if (checkCollision(proj, ent) && ent.type !== 'wall') {
                    playExplosionSFX(); 
                    activeExplosions.push({ x: ent.x, y: ent.y, width: ent.width, height: ent.height, currentFrame: 0, frameTimer: 0, animationSpeed: 6 });
                    entities.splice(eIdx, 1); projectiles.splice(index, 1);
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
            isDeathSequence = true; 
            deathSequenceEndTime = performance.now() + DEATH_SEQUENCE_DURATION; 
            lives = 0; 
            playGameOverMusic(); 
            playPlayerDeathSFX(); 
            updateUI(score, lives); 
        } else {
            playPlayerHurtSFX(); 
        }
    }
}

function draw() {
    let zoomed = false;

    // === SISTEMA DE CÂMERA DINÂMICA LERP SNEAK-ZOOM (CINEMACHINE STYLE) ===
    if (isDeathSequence) {
        ctx.save();
        zoomed = true;
        
        const startTime = deathSequenceEndTime - DEATH_SEQUENCE_DURATION;
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / DEATH_SEQUENCE_DURATION));

        const cameraProgress = 1 - Math.pow(1 - progress, 3);
        const zoomFactor = 1.0 + (1.6 - 1.0) * cameraProgress; 
        
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const targetCX = (canvas.width / 2) + (playerCenterX - canvas.width / 2) * cameraProgress;
        const targetCY = (canvas.height / 2) + (playerCenterY - canvas.height / 2) * cameraProgress;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-targetCX, -targetCY);
    }

    platforms.forEach(plat => { 
        ctx.fillStyle = '#2c2e3e'; ctx.fillRect(plat.x, plat.y, plat.width, plat.height); 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(plat.x, plat.y, plat.width, 4); 
    });

    projectiles.forEach(proj => {
        if (typeof missileAssetsLoaded !== 'undefined' && missileAssetsLoaded === numMissileFrames) {
            const currentMissileFrame = Math.floor(globalTimer / 6) % numMissileFrames;
            const sprite = missileFrames[currentMissileFrame];
            ctx.save();
            ctx.translate(proj.x + proj.width / 2, proj.y + proj.height / 2);
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.rotate(angle);
            if (proj.vx < 0) ctx.scale(1, -1);
            ctx.drawImage(sprite, -proj.width / 2, -proj.height / 2, proj.width, proj.height);
            ctx.restore();
        } else {
            ctx.fillStyle = proj.color; ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });

    entities.forEach(ent => {
        if (ent.type === 'runner' && typeof runnerAssetsLoaded !== 'undefined' && runnerAssetsLoaded >= 2) {
            const currentRunnerFrame = Math.floor(globalTimer / 8) % 2; 
            const sprite = runnerFrames[currentRunnerFrame];
            ctx.save(); ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (ent.baseVx < 0) ctx.scale(-1, 1);
            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height); ctx.restore();
        }
        else if (ent.type === 'flyer' && typeof flyerAssetsLoaded !== 'undefined' && flyerAssetsLoaded === 2) {
            const sprite = flyerFrames[ent.currentFrame];
            ctx.save(); ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1); 
            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height); ctx.restore();
        } 
        else if (ent.type === 'shooter' && typeof shooterLoadedAssetLoaded !== 'undefined' && shooterLoadedAssetLoaded && shooterUnloadedAssetLoaded) {
            const sprite = ent.hasShot ? shooterUnloadedSprite : shooterLoadedSprite;
            ctx.save(); ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1);
            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height); ctx.restore();
        } 
        else if (ent.type === 'carrier') {
            let sprite = null;
            if (ent.loot === 'fuel' && carrierFuelAssetLoaded) sprite = carrierFuelSprite;
            if (ent.loot === 'life' && carrierHealthAssetLoaded) sprite = carrierHealthSprite;
            if (sprite) {
                ctx.save(); ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2); ctx.scale(-1, 1);
                ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height); ctx.restore();
            } else {
                ctx.fillStyle = ent.color; ctx.fillRect(ent.x, ent.y, ent.width, ent.height);
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

    // RENDERIZAÇÃO DAS PARTÍCULAS NEON DE EXPLOSÃO DOS INIMIGOS
    activeExplosions.forEach(exp => {
        if (explosionAssetsLoaded === numExplosionFrames) {
            ctx.drawImage(explosionFrames[exp.currentFrame], exp.x, exp.y, exp.width, exp.height);
        }
    });

    // === DESENHA PLAYER ===
    if (isGameOver && deathAssetsLoaded === numDeathFrames) {
        const startTime = deathSequenceEndTime - DEATH_SEQUENCE_DURATION;
        const elapsed = performance.now() - startTime;
        
        // Renderiza as 4 frames de animação de morte travando no último índice
        let currentDeathFrame = Math.floor(elapsed / 85); 
        if (currentDeathFrame >= numDeathFrames) currentDeathFrame = numDeathFrames - 1;

        const deathVisualWidth = player.height * (498 / 455); // Aspect ratio perfeito (498x455)
        ctx.drawImage(deathFrames[currentDeathFrame], player.x, player.y, deathVisualWidth, player.height);
    } 
    else if (player.invulnerableTimer % 4 < 2) {
        if (player.isAttacking && attackAssetsLoaded === numAttackFrames) {
            const attackVisualWidth = player.height * (925 / 470);
            ctx.drawImage(attackFrames[player.currentAttackFrame], player.x, player.y, attackVisualWidth, player.height);
            
            // CORRIGIDO: Removido o quadrado amarelo de debug da renderização ativa.
            // A hitbox continua calculando o dano de forma 100% precisa em segundo plano.
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

    if (!isFirstStart && !isGameOver && player.comboMultiplier > 1.0) {
        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 12px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, player.x + player.width + 6, player.y + 4);
    }

    if (!isFirstStart && !isGameOver) drawFuelBar(ctx, player);

    if (zoomed) { ctx.restore(); }
}

function drawGameOver() {
    const gameOverScreen = document.getElementById('game-over-screen');
    if (gameOverScreen && gameOverScreen.style.display === 'none') gameOverScreen.style.display = 'flex';
}

init();
requestAnimationFrame((timestamp) => { lastTime = timestamp; loop(timestamp); });