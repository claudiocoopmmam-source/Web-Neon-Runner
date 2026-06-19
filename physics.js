// === PHYSICS.JS ===
// Responsabilidade: gravidade, colisão com plataformas, coyote time.
// Não conhece score, lives, ou qualquer outro estado global.
// Recebe dados como parâmetros, devolve estado atualizado.

import { numFlyFrames, numOverchargeFrames } from './player.js';
import { WORLD_BOTTOM_Y } from './world.js';

/**
 * Atualiza a posição e estado físico do player a cada frame.
 * @param {object} player - Estado mutável do player
 * @param {object} keys - Estado das teclas { jump: bool }
 * @param {number} globalTimer - Timer global para animações
 * @param {number} dt - Delta time normalizado
 * @param {Array}  platforms - Lista de plataformas ativas
 */
export function applyPlayerPhysics(player, keys, globalTimer, dt, platforms) {
    // --- MODO OVERCHARGE: voo livre, ignora gravidade e plataformas ---
    if (player.overchargeState === 'active') {
        const flySpeed = 5.5;
        if (keys.up)   player.vy = -flySpeed;
        else if (keys.down) player.vy = flySpeed;
        else player.vy = 0;

        player.y += player.vy * dt;
        player.y = Math.max(0, Math.min(player.y, 520 - player.height));

        // Animação overcharge
        player.overchargeFrameTimer += dt;
        if (player.overchargeFrameTimer >= player.overchargeAnimSpeed) {
            player.overchargeFrame = (player.overchargeFrame + 1) % numOverchargeFrames;
            player.overchargeFrameTimer = 0;
        }

        // Fuel não drena — pulsa visualmente no renderer
        player.isGrounded = false;
        return;
    }

    // --- SISTEMA DE COMBUSTÍVEL E VOO ---
    if (player.fuel <= 0) {
        player.fuel = 0;
        player.isFlying = false;
        player.isFuelLocked = true;
    }

    if (player.isFuelLocked && player.fuel >= player.maxFuel * 0.15) {
        player.isFuelLocked = false;
    }

    // Razão da barra de overcharge (0 a 1) — usada para escalar regen/consumo e CD
    const overchargeRatio = player.overchargeBar / player.overchargeMax;
    player.currentFuelDrain = 1 * (1 - 0.5 * overchargeRatio);
    player.currentAttackCooldownMax = 30 * (1 - 0.5 * overchargeRatio); // <-- ADDED
    
    const baseRegen = player.isGrounded ? player.fuelRegen : 0.06;
    player.currentFuelRegen = baseRegen * (1 + overchargeRatio);

    if (player.isFlying && keys.jump && !player.isFuelLocked && player.fuel > 0) {
        player.vy = -4.5;
        player.fuel -= player.currentFuelDrain * dt;
        if (globalTimer % player.flyAnimationSpeed === 0) {
            player.flyFrame = (player.flyFrame + 1) % numFlyFrames;
        }
    } else {
        player.isFlying = false;
        player.vy += player.gravity * dt;

        if (player.fuel < player.maxFuel) {
            player.fuel = Math.min(player.maxFuel, player.fuel + player.currentFuelRegen * dt);
        }
    }

    player.y += player.vy * dt;

    // --- COLISÃO COM PLATAFORMAS ---
    const wasGrounded = player.isGrounded;
    player.isGrounded = false;

    platforms.forEach(plat => {
        if (
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.width &&
            player.y + player.height <= plat.y + 12 &&
            player.y + player.height + player.vy * dt >= plat.y
        ) {
            player.vy = 0;
            player.y = plat.y - player.height;
            player.isGrounded = true;
            player.jumpCount = 0;
            player.coyoteTimer = player.maxCoyoteFrames;
        }
    });

    // --- COYOTE TIME ---
    if (wasGrounded && !player.isGrounded && player.vy >= 0) {
        player.coyoteTimer = player.maxCoyoteFrames;
        player.jumpCount = 1;
    } else if (player.coyoteTimer > 0) {
        player.coyoteTimer -= 1 * dt;
    }
}

/**
 * Aplica física de queda livre (pós-morte do player).
 */
export function applyDeathPhysics(player, dt) {
    player.vy += player.gravity * dt;
    player.y += player.vy * dt;

    const groundY = WORLD_BOTTOM_Y - player.height;
    if (player.y >= groundY) {
        player.y = groundY;
        player.vy = 0;
    }
}
