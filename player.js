// === PLAYER.JS ===
// Responsabilidade: estado do player, sprites, takeDamage, ataque, combo.
// Não sabe nada de plataformas, inimigos ou rendering.

import { createTrackedImage } from './assetmanager.js';

// --- SPRITES DO PLAYER ---
export const runFrames = [];
export const numRunFrames = 4;
export let runAssetsLoaded = 0;
for (let i = 1; i <= numRunFrames; i++) {
    runFrames.push(createTrackedImage(`assets/player_run_${i}.webp`, () => { runAssetsLoaded++; }));
}

export const attackFrames = [];
export const numAttackFrames = 3;
export let attackAssetsLoaded = 0;
for (let i = 1; i <= numAttackFrames; i++) {
    attackFrames.push(createTrackedImage(`assets/player_attack_${i}.webp`, () => { attackAssetsLoaded++; }));
}

export const rangedAttackFrames = [];
export const numRangedAttackFrames = 6;
export let rangedAttackAssetsLoaded = 0;
for (let i = 1; i <= numRangedAttackFrames; i++) {
    rangedAttackFrames.push(createTrackedImage(`assets/player_rangedAttack${i}.webp`, () => { rangedAttackAssetsLoaded++; }));
}

export const jumpSprite = createTrackedImage('assets/player_jump.webp', () => { jumpAssetLoaded = true; });
export let jumpAssetLoaded = false;

export const flyFrames = [];
export const numFlyFrames = 3;
export let flyAssetsLoaded = 0;
for (let i = 1; i <= numFlyFrames; i++) {
    flyFrames.push(createTrackedImage(`assets/player_fly_${i}.webp`, () => { flyAssetsLoaded++; }));
}

export const deathFrames = [];
export const numDeathFrames = 6;
export let deathAssetsLoaded = 0;
for (let i = 1; i <= numDeathFrames; i++) {
    deathFrames.push(createTrackedImage(`assets/player_death${i}.webp`, () => { deathAssetsLoaded++; }));
}

// --- SPRITES OVERCHARGE ---
export const overchargeFrames = [];
export const numOverchargeFrames = 4;
export let overchargeAssetsLoaded = 0;
for (let i = 1; i <= numOverchargeFrames; i++) {
    overchargeFrames.push(createTrackedImage(`assets/player_overcharge_flight${i}.webp`, () => { overchargeAssetsLoaded++; }));
}

// --- ESTADO GLOBAL DO PLAYER ---
export const player = {
    x: 120,
    y: 100,
    height: 54,
    width: 54 * (320 / 500),
    vy: 0,
    gravity: 0.6,
    jumpForce: -12.5,
    doubleJumpForce: -9.0,
    isGrounded: false,
    color: '#00ffcc',
    isAttacking: false,
    attackTimer: 0,
    attackDuration: 15,
    attackCooldownTimer: 0,
    attackBox: { x: 0, y: 0, width: 65, height: 54 },
    invulnerableTimer: 0,
    currentFrame: 0,
    currentAttackFrame: 0,
    animationSpeed: 6,
    jumpCount: 0,
    isFlying: false,
    maxFuel: 66,
    fuel: 66,
    fuelRegen: 0.15,
    isFuelLocked: false,
    flyFrame: 0,
    flyAnimationSpeed: 5,
    coyoteTimer: 0,
    maxCoyoteFrames: 6,
    comboKills: 0,
    comboMultiplier: 1.0,
    rangedCharges: 0,
    rangedChargeProgress: 0,
    // --- DEBUG METADATA ---
    currentFuelRegen: 0.15,
    currentFuelDrain: 1.0,
    currentAttackCooldownMax: 30, // <-- ADDED: duração total do CD
    // --- OVERCHARGE ---
    overchargeBar: 0,
    overchargeMax: 15,
    overchargeState: 'idle', // 'idle' | 'ready' | 'active' | 'cooldown'
    overchargeTimer: 0,      // segundos restantes (active) ou cooldown restante
    overchargeTotalDuration: 0, // <-- ADDED: Guarda o total de tempo ativo com base no combo
    overchargePrevMultiplier: 1.0,
    overchargeFrame: 0,
    overchargeFrameTimer: 0,
    overchargeAnimSpeed: 8,
    isOverchargeRecovering: false,
};

export function resetPlayer() {
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
    player.fuel = player.maxFuel;
    player.isFuelLocked = false;
    player.coyoteTimer = 0;
    player.comboKills = 0;
    player.comboMultiplier = 1.0;
    player.rangedCharges = 0;
    player.rangedChargeProgress = 0;
    player.overchargeBar = 0;
    player.overchargeState = 'idle';
    player.overchargeTimer = 0;
    player.overchargeTotalDuration = 0;
    player.overchargePrevMultiplier = 1.0;
    player.overchargeFrame = 0;
    player.overchargeFrameTimer = 0;
    
    player.currentFuelRegen = 0.15;
    player.currentFuelDrain = 1.0;
    player.currentAttackCooldownMax = 30;
    player.isOverchargeRecovering = false;
}

/**
 * Atualiza hitbox de ataque e timers de ataque/invulnerabilidade.
 * Chamado pelo gamemanager a cada frame.
 */
export function updatePlayerTimers(player, dt, numAttackFrames) {
    // Hitbox de ataque
    if (player.isAttacking) {
        const attackVisualWidth = player.height * (925 / 470);
        player.attackBox.x = player.x;
        player.attackBox.y = player.y;
        player.attackBox.width = attackVisualWidth;
        player.attackBox.height = player.height;

        player.attackTimer -= 1 * dt;
        const progress = player.attackDuration - player.attackTimer;
        const frameInterval = player.attackDuration / numAttackFrames;
        player.currentAttackFrame = Math.min(
            Math.floor(progress / frameInterval),
            numAttackFrames - 1
        );
        if (player.attackTimer <= 0) {
            player.isAttacking = false;
            player.attackTimer = 0;
        }
    } else {
        player.attackBox.x = player.x;
        player.attackBox.y = player.y;
        player.attackBox.width = player.width;
        player.attackBox.height = player.height;
    }

    // Invulnerabilidade
    if (player.invulnerableTimer > 0) {
        player.invulnerableTimer -= 1 * dt;
        if (player.invulnerableTimer <= 0) {
            player.invulnerableTimer = 0;
            player.isOverchargeRecovering = false;
        }
    }

    // Cooldown de ataque
    if (player.attackCooldownTimer > 0) {
        player.attackCooldownTimer -= 1 * dt;
        if (player.attackCooldownTimer < 0) player.attackCooldownTimer = 0;
    }
}

/**
 * Aplica dano ao player. Retorna { died: bool, hurt: bool }.
 * O caller decide o que fazer com o resultado (tocar som, game over, etc).
 */
export function takeDamage(player, amount) {
    if (player.invulnerableTimer > 0) return { died: false, hurt: false };

    player.invulnerableTimer = 45;
    player.isOverchargeRecovering = false;
    player.comboKills = 0;
    player.comboMultiplier = 1.0;

    const newLives = -amount; // retorna delta, o caller soma em lives
    return { died: false, hurt: true, delta: amount };
}

/**
 * Tenta disparar um ataque. Retorna true se o ataque foi iniciado.
 */
export function tryAttack(player, mode = 'melee') {
    if (!player.isAttacking && player.attackCooldownTimer <= 0) {
        if (mode === 'ranged') {
            player.attackCooldownTimer = player.currentAttackCooldownMax;
            return true;
        }

        player.isAttacking = true;
        player.attackTimer = player.attackDuration;
        player.currentAttackFrame = 0;
        // Puxa o máximo dinâmico já calculado no loop de física
        player.attackCooldownTimer = player.currentAttackCooldownMax; 
        return true;
    }
    return false;
}

export function addRangedChargeProgress(player, amount = 1) {
    player.rangedChargeProgress += amount;
    while (player.rangedChargeProgress >= 2) {
        player.rangedCharges++;
        player.rangedChargeProgress -= 2;
    }
}

export function addRangedCharges(player, amount = 1) {
    player.rangedCharges += amount;
}

export function spendRangedCharge(player) {
    if (player.rangedCharges <= 0) return false;
    player.rangedCharges--;
    return true;
}

/**
 * Registra um kill no combo do player.
 */
export function registerKill(player) {
    if (player.overchargeState === 'active') {
        // Durante o overcharge o multiplicador fica fixo em 5x
        player.comboKills++;
        return;
    }
    player.comboKills++;
    if (player.comboKills % 2 === 0) {
        player.comboMultiplier += 0.1;
    }
}
