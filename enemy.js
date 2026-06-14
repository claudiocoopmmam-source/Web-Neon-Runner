// === ENEMY.JS ===
// Responsabilidade: comportamento dos inimigos e projéteis a cada frame.
// Recebe o estado do jogo como parâmetros e devolve eventos ocorridos
// (dano ao player, kills, pickups) para o gamemanager processar.

import { checkCollision, spawnCarrierDrone, getRandomExplosionVariant } from './entities.js';

// Threshold de disparo do shooter (73.2% da largura do canvas)
const SHOOTER_FIRE_THRESHOLD_RATIO = 0.732;

/**
 * Atualiza todos os inimigos. Retorna um objeto de eventos:
 * {
 *   damageEvents: number,         // quantas vezes o player levou dano
 *   kills: number,                // inimigos mortos pelo player
 *   scoreGain: number,            // score acumulado neste frame
 *   newProjectiles: [],           // projéteis novos a adicionar
 *   newExplosions: [],            // explosões visuais a adicionar
 *   newCarriers: [],              // carriers a spawnar
 *   livesGain: number,            // vidas ganhas via carrier
 *   fuelGain: number,             // % de fuel ganho via carrier (0 a 1, relativo ao maxFuel)
 *   carrierPickup: bool,          // tocou no carrier (para SFX)
 * }
 */
export function updateEnemies({
    entities,
    player,
    gameSpeed,
    isGameOver,
    globalTimer,
    dt,
    canvasWidth,
    lives,
}) {
    const events = {
        damageEvents: 0,
        kills: 0,
        scoreGain: 0,
        newProjectiles: [],
        newExplosions: [],
        newCarriers: [],
        livesGain: 0,
        fuelGain: 0,
        carrierPickup: false,
    };

    const toRemove = new Set();

    entities.forEach((ent, index) => {
        if (toRemove.has(index)) return;

        // --- MOVIMENTO ---
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

        // --- ANIMAÇÃO DO FLYER ---
        if (ent.type === 'flyer') {
            ent.frameTimer += 1 * dt;
            if (ent.frameTimer >= ent.animationSpeed) {
                ent.currentFrame = (ent.currentFrame + 1) % 2;
                ent.frameTimer = 0;
            }
        }

        // --- DISPARO DO SHOOTER ---
        if (!isGameOver && ent.type === 'shooter' && !ent.hasShot &&
            ent.x < canvasWidth * SHOOTER_FIRE_THRESHOLD_RATIO) {
            const dx = (player.x + player.width / 2) - ent.x;
            const dy = (player.y + player.height / 2) - (ent.y + ent.height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const missileHeight = 14;
            events.newProjectiles.push({
                x: ent.x,
                y: ent.y + ent.height / 2,
                height: missileHeight,
                width: missileHeight * (300 / 100),
                vx: (dx / dist) * (gameSpeed + 5),
                vy: (dy / dist) * (gameSpeed + 5),
                isReflected: false,
                color: '#ffea00',
            });
            ent.hasShot = true;
        }

        if (!isGameOver) {
            // --- ATAQUE DO PLAYER NO INIMIGO ---
            if (player.isAttacking && checkCollision(player.attackBox, ent)) {
                if (ent.type === 'carrier') {
                    _processCarrierPickup(ent, events, lives);
                } else if (ent.type === 'wall') {
                    events.wallHits = (events.wallHits || 0) + 1;
                } else {
                    events.newExplosions.push(_makeExplosion(ent));
                    if (Math.random() <= 0.10) {
                        events.newCarriers.push(spawnCarrierDrone(player.y));
                    }
                    events.kills++;
                    events.scoreGain += 50;
                }
                toRemove.add(index);
                return;
            }

            // --- OVERCHARGE: destrói tudo que tocar (exceto carrier) ---
            if (player.overchargeState === 'active' && checkCollision(player, ent)) {
                if (ent.type === 'carrier') {
                    _processCarrierPickup(ent, events, lives);
                    toRemove.add(index);
                } else if (ent.type !== 'wall') {
                    events.newExplosions.push(_makeExplosion(ent));
                    events.kills++;
                    events.scoreGain += 50;
                    toRemove.add(index);
                } else {
                    // Paredes: apenas remove sem kill
                    toRemove.add(index);
                }
                return;
            }

            // --- COLISÃO PASSIVA DO PLAYER ---
            if (!player.isAttacking && checkCollision(player, ent)) {
                if (ent.type === 'carrier') {
                    _processCarrierPickup(ent, events, lives);
                    events.scoreGain += 25;
                    toRemove.add(index);
                } else if (player.invulnerableTimer <= 0) {
                    if (ent.type !== 'wall') {
                        events.newExplosions.push(_makeExplosion(ent));
                    }
                    events.damageEvents++;
                    toRemove.add(index);
                }
            }
        }
    });

    // Remove em ordem reversa para não quebrar índices
    const sorted = Array.from(toRemove).sort((a, b) => b - a);
    sorted.forEach(i => entities.splice(i, 1));

    return events;
}

/**
 * Atualiza todos os projéteis. Retorna eventos:
 * { damageEvents, kills, scoreGain, newExplosions }
 */
export function updateProjectiles({
    projectiles,
    entities,
    player,
    isGameOver,
    dt,
    canvasWidth,
    canvasHeight,
}) {
    const events = {
        damageEvents: 0,
        kills: 0,
        scoreGain: 0,
        newExplosions: [],
    };

    const toRemove = new Set();

    projectiles.forEach((proj, index) => {
        if (toRemove.has(index)) return;

        // --- TRACKING DE PROJÉTIL REFLETIDO ---
        if (proj.isReflected) {
            if (!proj.target || !entities.includes(proj.target)) {
                let closestEnemy = null, minDist = Infinity;
                entities.forEach(ent => {
                    if (ent.type !== 'wall') {
                        const d = Math.hypot(ent.x - proj.x, ent.y - proj.y);
                        if (d < minDist) { minDist = d; closestEnemy = ent; }
                    }
                });
                proj.target = closestEnemy;
            }
            if (proj.target) {
                const tx = proj.target.x + proj.target.width / 2;
                const ty = proj.target.y + proj.target.height / 2;
                const dx = tx - (proj.x + proj.width / 2);
                const dy = ty - (proj.y + proj.height / 2);
                const dist = Math.hypot(dx, dy);
                if (dist > 0) {
                    proj.vx = (dx / dist) * 16;
                    proj.vy = (dy / dist) * 16;
                }
            } else {
                proj.vx = 16; proj.vy = 0;
            }
        }

        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        if (!proj.isReflected) {
            // Acerta o player (invulnerável durante overcharge — invulnerableTimer=9999)
            if (!isGameOver && checkCollision(proj, player) && player.overchargeState !== 'active') {
                toRemove.add(index);
                events.damageEvents++;
                return;
            }
            // Player rebate
            if (!isGameOver && player.isAttacking && checkCollision(player.attackBox, proj)) {
                proj.isReflected = true;
                proj.color = '#00ff66';
                events.scoreGain += 30;
                // Retarget imediato
                let closestEnemy = null, minDist = Infinity;
                entities.forEach(ent => {
                    if (ent.type !== 'wall') {
                        const d = Math.hypot(ent.x - proj.x, ent.y - proj.y);
                        if (d < minDist) { minDist = d; closestEnemy = ent; }
                    }
                });
                proj.target = closestEnemy;
                if (closestEnemy) {
                    const rDx = closestEnemy.x - proj.x, rDy = closestEnemy.y - proj.y;
                    const rDist = Math.hypot(rDx, rDy);
                    proj.vx = (rDx / rDist) * 16;
                    proj.vy = (rDy / rDist) * 16;
                } else {
                    proj.vx = 16; proj.vy = 0;
                }
            }
        } else {
            // Projétil refletido acerta inimigo
            entities.forEach((ent, eIdx) => {
                if (checkCollision(proj, ent) && ent.type !== 'wall') {
                    events.newExplosions.push(_makeExplosion(ent));
                    entities.splice(eIdx, 1);
                    toRemove.add(index);
                    events.kills++;
                    events.scoreGain += 70;
                }
            });
        }
    });

    // Remove fora de tela e os marcados
    const sorted = Array.from(toRemove).sort((a, b) => b - a);
    sorted.forEach(i => projectiles.splice(i, 1));

    // Limpa fora de tela
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        if (p.x < 0 || p.x > canvasWidth || p.y < 0 || p.y > canvasHeight) {
            projectiles.splice(i, 1);
        }
    }

    return events;
}

/**
 * Atualiza animações e posição das explosões visuais.
 */
export function updateExplosions(activeExplosions, gameSpeed, dt) {
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
        const exp = activeExplosions[i];
        exp.x -= gameSpeed * dt;
        exp.frameTimer += 1 * dt;
        if (exp.frameTimer >= exp.animationSpeed) {
            exp.currentFrame++;
            exp.frameTimer = 0;
            const totalFrames = exp.variant ? exp.variant.length : 5;
            if (exp.currentFrame >= totalFrames) {
                activeExplosions.splice(i, 1);
            }
        }
    }
}

// --- HELPERS PRIVADOS ---
function _makeExplosion(ent) {
    // Dimensões calculadas pela proporção real do sprite (498x455)
    const EXPLOSION_ASPECT = 498 / 455;
    const expHeight = Math.max(ent.width, ent.height) * 1.2;
    const expWidth  = expHeight * EXPLOSION_ASPECT;
    return {
        x: ent.x + ent.width  / 2 - expWidth  / 2,
        y: ent.y + ent.height / 2 - expHeight / 2,
        width:  expWidth,
        height: expHeight,
        currentFrame: 0,
        frameTimer: 0,
        animationSpeed: 6,
        variant: getRandomExplosionVariant(),
    };
}

function _processCarrierPickup(ent, events, currentLives) {
    if (ent.loot === 'life' && currentLives < 3) {
        events.livesGain++;
    } else if (ent.loot === 'fuel') {
        events.fuelGain += 1.0; // 100% do maxFuel, o caller aplica
    }
    events.carrierPickup = true;
}
