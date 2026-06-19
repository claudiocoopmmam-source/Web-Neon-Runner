// === GAMEMANAGER.JS ===
// Responsabilidade: orquestrador central.
// Mantém o estado global, o loop de jogo e coordena todos os módulos.
// É o único arquivo que importa de todos os outros.

import {
    player, resetPlayer, tryAttack, takeDamage, registerKill, numAttackFrames,
    addRangedChargeProgress, addRangedCharges, spendRangedCharge,
} from './player.js';
import { updatePlayerTimers }                                                          from './player.js';
import { applyPlayerPhysics, applyDeathPhysics }                                      from './physics.js';
import { updatePlatformsState, createNewPlatform, generateEnemy }                     from './entities.js';
import { updateEnemies, updateProjectiles, updateExplosions }                         from './enemy.js';
import { draw }                                                                        from './renderer.js';
import { updateUI, initUI, showPauseScreen, hidePauseScreen, showGameOverScreen, maybeUpdateHighscore } from './ui.js';
import { getAssetProgress, waitForAssets }                                             from './assetmanager.js';
import { WORLD_BOTTOM_Y }                                                               from './world.js';
import {
    createRangedProjectile,
    getRangedAttackDecision,
    updateRangedProjectiles,
} from './rangedattack.js';
import {
    createOverchargeRuntime,
    addOverchargePoints,
    addOverchargeKill,
    tryActivateOvercharge,
    updateOvercharge,
    OVERCHARGE_SPEED_MULTIPLIER,
    OVERCHARGE_READY_SLOWMO_DURATION,
} from './overcharge.js';
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
const overchargeRuntime  = createOverchargeRuntime();

// --- LISTAS DE ENTIDADES ---
let platforms        = [];
let entities         = [];
let projectiles      = [];
let rangedProjectiles = [];
let activeExplosions = [];

// --- INPUT ---
const keys = { jump: false, up: false, down: false };

// --- DELTA TIME ---
let lastTime     = performance.now();
let dt           = 1;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
let animFrameId  = null;

// --- LOADING UI ---
const loadingScreen = document.getElementById('loading-screen');
const loadingBarFill = document.getElementById('loading-bar-fill');
const loadingStatus = document.getElementById('loading-status');

// ============================================================
// INICIALIZAÇÃO
// ============================================================
export function init() {
    gameSpeed            = BASE_SPEED;
    score                = 0;
    lives                = 3;
    isGameOver           = false;
    isPaused             = false;
    isDeathSequence      = false;
    overchargeRuntime.isReady = false;
    overchargeRuntime.readyStart = 0;
    globalTimer          = 0;
    lastTime             = performance.now();

    resetPlayer();
    stopRocketBootsSFX();

    platforms        = [
        { x: 0,       y: UH * 75, width: UW * 62.5, height: WORLD_BOTTOM_Y - (UH * 75) },
        { x: UW * 75, y: UH * 65, width: UW * 50,   height: WORLD_BOTTOM_Y - (UH * 65) },
    ];
    entities         = [];
    projectiles      = [];
    rangedProjectiles = [];
    activeExplosions = [];

    updateUI(score, lives);
}

export function setFirstStart(val) { isFirstStart = val; }

export function togglePause(forceState) {
    isPaused = typeof forceState !== 'undefined' ? forceState : !isPaused;
}

// ============================================================
// INPUT
// ============================================================
window.addEventListener('keydown', (e) => {
    const blocksScroll = ['Space', 'KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code);
    if (blocksScroll) e.preventDefault();
    if (isFirstStart || isGameOver) return;

    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
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
        keys.down = true;
    }

    if (['KeyD', 'KeyX', 'ArrowRight'].includes(e.code)) _triggerAttack();
    if (e.code === 'KeyP' && !isGameOver) togglePause();
    if (e.code === 'KeyF') {
        if (tryActivateOvercharge(player, overchargeRuntime)) {
            if (player.isFlying) stopRocketBootsSFX();
            player.isFlying = false;
            setOverchargeAudio(true);
        }
    }
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
        if (tryActivateOvercharge(player, overchargeRuntime)) {
            if (player.isFlying) stopRocketBootsSFX();
            player.isFlying = false;
            setOverchargeAudio(true);
        }
        return;
    }
    if (e.button === 0) _triggerAttack();
});

function _triggerAttack() {
    if (isGameOver || isPaused || isFirstStart) return;

    const decision = getRangedAttackDecision({
        player,
        entities,
        canvasWidth: canvas.width,
    });
    const mode = decision.shouldUseRanged ? 'ranged' : 'melee';
    const fired = tryAttack(player, mode);
    if (fired && mode === 'ranged' && spendRangedCharge(player)) {
        rangedProjectiles.push(createRangedProjectile(player));
    }
    if (fired) playAttackSFX();
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
        if (overchargeRuntime.isReady) {
            const elapsed = performance.now() - overchargeRuntime.readyStart;
            if (elapsed < OVERCHARGE_READY_SLOWMO_DURATION) {
                const progress     = elapsed / OVERCHARGE_READY_SLOWMO_DURATION;
                const easeIn       = Math.pow(progress, 0.4);
                const slowMoFactor = 0.04 + (0.25 - 0.04) * easeIn; // mais pesado
                dt *= slowMoFactor;
            } else {
                overchargeRuntime.isReady = false;
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

        const rangedEvents = updateRangedProjectiles({
            rangedProjectiles,
            entities,
            dt,
            canvasWidth: canvas.width,
        });
        _processRangedEvents(rangedEvents);

        // Explosões visuais
        updateExplosions(activeExplosions, effectiveGameSpeed, dt);
    }

    const effectiveGameSpeed = player.overchargeState === 'active'
        ? gameSpeed * OVERCHARGE_SPEED_MULTIPLIER
        : gameSpeed;

    // Render
    draw({
        ctx, canvas, player, platforms, entities, projectiles, rangedProjectiles, activeExplosions,
        globalTimer, isGameOver, isFirstStart, isDeathSequence, deathSequenceEndTime,
        isOverchargeReady: overchargeRuntime.isReady,
        overchargeReadyStart: overchargeRuntime.readyStart,
        gameSpeed: effectiveGameSpeed
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
    const overchargeEvents = updateOvercharge(player, overchargeRuntime, dt, performance.now());
    if (overchargeEvents.endedActive) {
        setOverchargeAudio(false);
    }

    updateUI(score, lives);
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
            addOverchargeKill(player, overchargeRuntime);
        }
        if (ev.meleeKills > 0) {
            addRangedChargeProgress(player, ev.meleeKills);
        }
        if (ev.overchargeKills > 0) {
            addRangedCharges(player, ev.overchargeKills);
        }
        score += ev.scoreGain * player.comboMultiplier;
        playExplosionSFX();
    } else if (ev.scoreGain > 0) {
        score += ev.scoreGain * player.comboMultiplier;
    }

    // Paredes atacadas: +0.5 por parede, com cap
    if (ev.wallHits) {
        for (let i = 0; i < ev.wallHits; i++) {
            addOverchargePoints(player, overchargeRuntime, 0.5);
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
            addOverchargeKill(player, overchargeRuntime);
        }
        score += ev.scoreGain * player.comboMultiplier;
        playExplosionSFX();
    } else if (ev.scoreGain > 0) {
        score += ev.scoreGain * player.comboMultiplier;
    }

    activeExplosions.push(...ev.newExplosions);
}

function _processRangedEvents(ev) {
    if (ev.kills > 0) {
        for (let i = 0; i < ev.kills; i++) {
            registerKill(player);
            addOverchargeKill(player, overchargeRuntime);
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
    void boot();
});

function _updateLoadingUI() {
    if (!loadingScreen || !loadingBarFill || !loadingStatus) return;
    const progress = getAssetProgress();
    const done = progress.loaded + progress.failed;
    const total = Math.max(1, progress.total);
    const pct = Math.min(100, Math.round((done / total) * 100));

    loadingBarFill.style.width = `${pct}%`;
    loadingStatus.textContent = progress.total > 0
        ? `Carregando ${done}/${progress.total} assets`
        : 'Preparando assets...';
}

function _hideLoadingScreen() {
    if (!loadingScreen) return;
    loadingScreen.classList.add('hidden');
}

function _startMainLoop() {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(loop);
}

async function boot() {
    _updateLoadingUI();

    const refreshLoading = () => {
        if (!loadingScreen || loadingScreen.classList.contains('hidden')) return;
        _updateLoadingUI();
        requestAnimationFrame(refreshLoading);
    };

    requestAnimationFrame(refreshLoading);
    await waitForAssets();
    _updateLoadingUI();
    _hideLoadingScreen();

    initUI({
        onStartGame:     init,
        onRestartGame:   init,
        onTogglePause:   togglePause,
        onReturnToMenu:  () => {},
        onSetFirstStart: setFirstStart,
    });

    _startMainLoop();
}
