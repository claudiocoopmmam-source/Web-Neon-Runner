// === GAMEMANAGER.JS ===
// Responsabilidade: orquestrador central.
// Mantém o estado global, o loop de jogo e coordena todos os módulos.
// É o único arquivo que importa de todos os outros.

import { player, resetPlayer, tryAttack, takeDamage, registerKill, numAttackFrames } from './player.js';
import { updatePlayerTimers }                                                          from './player.js';
import { applyPlayerPhysics, applyDeathPhysics }                                      from './physics.js';
import { checkCollision, updatePlatformsState, createNewPlatform, generateEnemy }     from './entities.js';
import { updateEnemies, updateProjectiles, updateExplosions }                         from './enemy.js';
import { draw }                                                                        from './renderer.js';
import { updateUI, initUI, showPauseScreen, hidePauseScreen, showGameOverScreen, maybeUpdateHighscore } from './ui.js';
import {
    startRocketBootsSFX, stopRocketBootsSFX,
    playAttackSFX, playExplosionSFX, playCarrierPickupSFX,
    playPlayerHurtSFX, playPlayerDeathSFX, playGameOverMusic,
    setOverchargeAudio,
} from './audiomanager.js';

// --- CONSTANTES ---
const BASE_SPEED              = 5;
const DEATH_SEQUENCE_DURATION = 2500; // ms
const SPEED_INCREMENT_INTERVAL = 500; // globalTimer ticks
const SPEED_INCREMENT_AMOUNT   = 0.5;
const ENEMY_SPAWN_CHANCE        = 0.30; // prob de NÃO spawnar
const OVERCHARGE_DURATION       = 6.0;  // segundos
const OVERCHARGE_COOLDOWN       = 5.0;  // segundos
const OVERCHARGE_KILL_GAIN      = 1.8;
const OVERCHARGE_SPEED_MULTIPLIER = 1.8; // acelera o scroll durante o overcharge

// --- CANVAS ---
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const UW     = canvas.width  / 100;
const UH     = canvas.height / 100;

// --- ESTADO GLOBAL ---
let gameSpeed            = BASE_SPEED;
let score                = 0;
let lives                = 3;
let isGameOver           = false;
let isPaused             = false;
let isFirstStart         = true;
let globalTimer          = 0;
let isDeathSequence      = false;
let deathSequenceEndTime = 0;
let isOverchargeReady    = false;   // slow-mo ativo ao encher a barra
let overchargeReadyStart   = 0;     // timestamp do início do slow-mo
const OVERCHARGE_READY_SLOWMO_DURATION = 2000; // ms

// --- LISTAS DE ENTIDADES ---
let platforms        = [];
let entities         = [];
let projectiles      = [];
let activeExplosions = [];

// --- INPUT ---
const keys = { jump: false, up: false, down: false };

// --- DELTA TIME ---
let lastTime     = performance.now();
let dt           = 1;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
let animFrameId  = null;

// ============================================================
// INICIALIZAÇÃO
// ============================================================
export function init() {
    gameSpeed            = BASE_SPEED;
    score                = 0;
    lives                = 3;
    isGameOver           = false;
    isDeathSequence      = false;
    isOverchargeReady      = false;
    overchargeReadyStart   = 0;
    globalTimer          = 0;
    lastTime             = performance.now();

    resetPlayer();

    platforms        = [
        { x: 0,       y: UH * 75, width: UW * 62.5, height: UH * 25 },
        { x: UW * 75, y: UH * 65, width: UW * 50,   height: UH * 35 },
    ];
    entities         = [];
    projectiles      = [];
    activeExplosions = [];

    updateUI(score, lives);

    if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame((ts) => { lastTime = ts; loop(ts); });
}

export function setFirstStart(val) { isFirstStart = val; }

export function togglePause(forceState) {
    isPaused = typeof forceState !== 'undefined' ? forceState : !isPaused;
}

// ============================================================
// INPUT
// ============================================================
window.addEventListener('keydown', (e) => {
    if (isFirstStart || isGameOver) return;

    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        if (player.overchargeState === 'active') {
            keys.up = true;
        } else if (player.isGrounded || player.coyoteTimer > 0) {
            player.vy         = player.jumpForce;
            player.isGrounded = false;
            player.coyoteTimer = 0;
            player.jumpCount   = 1;
        } else if (player.jumpCount === 1) {
            player.vy        = player.doubleJumpForce;
            player.jumpCount = 2;
        } else if (player.jumpCount === 2 && player.fuel > 0 && !player.isFuelLocked) {
            if (!player.isFlying) startRocketBootsSFX();
            player.isFlying = true;
        }
        keys.jump = true;
    }

    if (['KeyS', 'ArrowDown'].includes(e.code) && player.overchargeState === 'active') {
        e.preventDefault();
        keys.down = true;
    }

    if (['KeyD', 'KeyX', 'ArrowRight'].includes(e.code)) _triggerAttack();
    if (e.code === 'KeyP' && !isGameOver) togglePause();
    if (e.code === 'KeyF') _tryActivateOvercharge();
});

window.addEventListener('keyup', (e) => {
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        keys.jump = false;
        keys.up   = false;
        if (player.isFlying) stopRocketBootsSFX();
        player.isFlying = false;
    }
    if (['KeyS', 'ArrowDown'].includes(e.code)) keys.down = false;
});

canvas.addEventListener('mousedown', (e) => {
    if (isFirstStart || isGameOver) return;
    // Clique na barra de overcharge (bottom strip, y > 555)
    if (e.button === 0 && e.offsetY > 555) {
        _tryActivateOvercharge();
        return;
    }
    if (e.button === 0) _triggerAttack();
});

function _triggerAttack() {
    if (isGameOver || isPaused || isFirstStart) return;
    const fired = tryAttack(player);
    if (fired) playAttackSFX();
}

function _addOverchargePoints(amount) {
    if (player.overchargeState !== 'idle') return;
    player.overchargeBar = Math.min(player.overchargeMax, player.overchargeBar + amount);
    if (player.overchargeBar >= player.overchargeMax) {
        player.overchargeBar   = player.overchargeMax; // hard cap
        player.overchargeState = 'ready';
        isOverchargeReady    = true;
        overchargeReadyStart = performance.now();
    }
}

function _addOverchargeKill() {
    _addOverchargePoints(OVERCHARGE_KILL_GAIN);
}

function _tryActivateOvercharge() {
    if (isGameOver || isPaused || isFirstStart) return;
    if (player.overchargeState !== 'ready') return;
    player.overchargeState           = 'active';
    player.overchargePrevMultiplier  = player.comboMultiplier;
    // Duração escala com o multiplicador no momento da ativação
    player.overchargeTotalDuration   = OVERCHARGE_DURATION * player.comboMultiplier; // <-- ADDED
    player.overchargeTimer           = player.overchargeTotalDuration;
    isOverchargeReady                = false;
    player.comboMultiplier           = 5.0;
    player.invulnerableTimer         = 9999; // invulnerável durante overcharge
    if (player.isFlying) stopRocketBootsSFX();
    player.isFlying = false;
    setOverchargeAudio(true); // crossfade para a trilha agressiva
}

// ============================================================
// LOOP PRINCIPAL
// ============================================================
function loop(currentTime) {
    dt = (currentTime - lastTime) / FRAME_TIME;
    lastTime = currentTime;
    if (dt > 4) dt = 1;

    if (!isPaused && !isFirstStart) {
        globalTimer++;

        // Slow-motion da death sequence
        if (isDeathSequence) {
            const startTime = deathSequenceEndTime - DEATH_SEQUENCE_DURATION;
            const elapsed   = performance.now() - startTime;
            const progress  = Math.min(1, Math.max(0, elapsed / DEATH_SEQUENCE_DURATION));

            if (performance.now() < deathSequenceEndTime) {
                const easeProgress = Math.pow(progress, 2.5);
                const slowMoFactor = 0.01 + (0.30 - 0.01) * easeProgress;
                dt *= slowMoFactor;
            } else {
                isDeathSequence = false;
            }
        }

        // Slow-motion ao encher/terminar a barra de overcharge
        if (isOverchargeReady) {
            const elapsed = performance.now() - overchargeReadyStart;
            if (elapsed < OVERCHARGE_READY_SLOWMO_DURATION) {
                const progress     = elapsed / OVERCHARGE_READY_SLOWMO_DURATION;
                const easeIn       = Math.pow(progress, 0.4);
                const slowMoFactor = 0.04 + (0.25 - 0.04) * easeIn; // mais pesado
                dt *= slowMoFactor;
            } else {
                isOverchargeReady = false;
            }
        }

        if (!isGameOver) {
            _updateGame();
        } else {
            applyDeathPhysics(player, dt);
        }

        // Velocidade efetiva: acelera durante o overcharge ativo
        const effectiveGameSpeed = player.overchargeState === 'active'
            ? gameSpeed * OVERCHARGE_SPEED_MULTIPLIER
            : gameSpeed;

        // Scroll e spawn de plataformas
        platforms = updatePlatformsState(platforms, effectiveGameSpeed, dt);
        if (platforms.length < 5) {
            const lastPlat = platforms[platforms.length - 1];
            platforms.push(createNewPlatform(lastPlat, gameSpeed));

            if (!isGameOver && Math.random() > ENEMY_SPAWN_CHANCE) {
                const p = platforms[platforms.length - 1];
                entities.push(generateEnemy(p.x + p.width / 2, p.y, gameSpeed, p));
            }
        }

        // Inimigos
        const enemyEvents = updateEnemies({
            entities, player, gameSpeed: effectiveGameSpeed, isGameOver, globalTimer, dt,
            canvasWidth: canvas.width, lives,
        });
        _processEnemyEvents(enemyEvents);

        // Projéteis
        const projEvents = updateProjectiles({
            projectiles, entities, player, isGameOver, dt,
            canvasWidth: canvas.width, canvasHeight: canvas.height,
        });
        _processProjEvents(projEvents);

        // Explosões visuais
        updateExplosions(activeExplosions, effectiveGameSpeed, dt);
    }

    const effectiveGameSpeed = player.overchargeState === 'active'
        ? gameSpeed * OVERCHARGE_SPEED_MULTIPLIER
        : gameSpeed;

    // Render
    draw({
        ctx, canvas, player, platforms, entities, projectiles, activeExplosions,
        globalTimer, isGameOver, isFirstStart, isDeathSequence, deathSequenceEndTime,
        isOverchargeReady, overchargeReadyStart, gameSpeed: effectiveGameSpeed
    });

    // Pause UI
    if (isPaused && !isGameOver && !isFirstStart) showPauseScreen();
    else hidePauseScreen();

    // Game Over UI (após sequência dramática)
    if (isGameOver && !isDeathSequence) {
        maybeUpdateHighscore(score);
        showGameOverScreen();
    }

    animFrameId = requestAnimationFrame(loop);
}

// ============================================================
// UPDATE (só enquanto vivo)
// ============================================================
function _updateGame() {
    const wasFlying = player.isFlying;

    applyPlayerPhysics(player, keys, globalTimer, dt, platforms);
    updatePlayerTimers(player, dt, numAttackFrames);

    if (wasFlying && !player.isFlying) stopRocketBootsSFX();

    // Animação de corrida
    if (player.isGrounded && globalTimer % player.animationSpeed === 0) {
        player.currentFrame = (player.currentFrame + 1) % 4;
    }

    // Caiu fora da tela
    if (player.y > canvas.height + 50) {
        player.invulnerableTimer = 0;
        _applyDamage(3);
    }

    // Score e aceleração
    score += 0.1 * player.comboMultiplier * dt;
    if (globalTimer % SPEED_INCREMENT_INTERVAL === 0) gameSpeed += SPEED_INCREMENT_AMOUNT;

    // Overcharge state machine
    _updateOvercharge();

    updateUI(score, lives);
}

function _updateOvercharge() {
    const p   = player;
    const sec = dt / 60; // converte ticks para segundos

    if (p.overchargeState === 'active') {
        p.overchargeTimer -= sec;
        
        // Drenagem sincronizada com a duração efetiva
        const drainRate = p.overchargeMax / p.overchargeTotalDuration;
        p.overchargeBar = Math.max(0, p.overchargeBar - drainRate * sec);

        if (p.overchargeTimer <= 0) {
            // Fim do overcharge — slow-mo de saída + impulso pra cima (sem dano)
            p.overchargeState    = 'cooldown';
            p.overchargeTimer    = OVERCHARGE_COOLDOWN;
            p.overchargeBar      = 0;
            p.comboMultiplier    = p.overchargePrevMultiplier;
            p.invulnerableTimer  = 90; // proteção breve enquanto retoma o controle
            p.isOverchargeRecovering = true; // Flag para não piscar a tela como dano
            p.fuel               = p.maxFuel;
            p.isFlying           = false;
            // Impulso para cima (força do double jump) — apenas estético
            p.vy                 = p.doubleJumpForce;
            p.isGrounded         = false;
            // Slow-mo de saída (reutiliza o sistema de overcharge ready)
            isOverchargeReady    = true;
            overchargeReadyStart = performance.now();
            setOverchargeAudio(false); // crossfade de volta para a trilha normal
        }
    } else if (p.overchargeState === 'cooldown') {
        p.overchargeTimer -= sec;
        if (p.overchargeTimer <= 0) {
            p.overchargeState = 'idle';
            p.overchargeTimer = 0;
        }
    }
}

// ============================================================
// DANO
// ============================================================
function _applyDamage(amount) {
    if (player.invulnerableTimer > 0 || isGameOver) return;

    const result = takeDamage(player, amount);
    if (!result.hurt) return;

    // Drena 1 ponto fixo da barra de overcharge ao tomar dano
    if (player.overchargeState === 'idle' || player.overchargeState === 'ready') {
        player.overchargeBar = Math.max(0, player.overchargeBar - 1);
        if (player.overchargeState === 'ready' && player.overchargeBar < player.overchargeMax) {
            player.overchargeState = 'idle';
        }
    }

    lives -= result.delta;
    updateUI(score, lives);

    if (lives <= 0) {
        lives                = 0;
        isGameOver           = true;
        isDeathSequence      = true;
        deathSequenceEndTime = performance.now() + DEATH_SEQUENCE_DURATION;
        updateUI(score, lives);
        playGameOverMusic();
        playPlayerDeathSFX();
    } else {
        playPlayerHurtSFX();
    }
}

// ============================================================
// PROCESSAR EVENTOS
// ============================================================
function _processEnemyEvents(ev) {
    for (let i = 0; i < ev.damageEvents; i++) _applyDamage(1);

    if (ev.kills > 0) {
        for (let i = 0; i < ev.kills; i++) {
            registerKill(player);
            _addOverchargeKill();
        }
        score += ev.scoreGain * player.comboMultiplier;
        playExplosionSFX();
    } else if (ev.scoreGain > 0) {
        score += ev.scoreGain * player.comboMultiplier;
    }

    // Paredes atacadas: +0.5 por parede, com cap
    if (ev.wallHits) {
        for (let i = 0; i < ev.wallHits; i++) {
            _addOverchargePoints(0.5);
        }
    }

    activeExplosions.push(...ev.newExplosions);
    projectiles.push(...ev.newProjectiles);
    entities.push(...ev.newCarriers);

    if (ev.carrierPickup) {
        playCarrierPickupSFX();
        if (ev.livesGain > 0) {
            lives = Math.min(3, lives + ev.livesGain);
            updateUI(score, lives);
        }
        if (ev.fuelGain > 0) {
            player.fuel = Math.min(player.maxFuel, player.fuel + player.maxFuel * ev.fuelGain);
        }
    }
}

function _processProjEvents(ev) {
    for (let i = 0; i < ev.damageEvents; i++) _applyDamage(1);

    if (ev.kills > 0) {
        for (let i = 0; i < ev.kills; i++) {
            registerKill(player);
            _addOverchargeKill();
        }
        score += ev.scoreGain * player.comboMultiplier;
        playExplosionSFX();
    } else if (ev.scoreGain > 0) {
        score += ev.scoreGain * player.comboMultiplier;
    }

    activeExplosions.push(...ev.newExplosions);
}

// ============================================================
// BOOTSTRAP
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initUI({
        onStartGame:     init,
        onRestartGame:   init,
        onTogglePause:   togglePause,
        onReturnToMenu:  () => {},
        onSetFirstStart: setFirstStart,
    });

    animFrameId = requestAnimationFrame((ts) => { lastTime = ts; loop(ts); });
});