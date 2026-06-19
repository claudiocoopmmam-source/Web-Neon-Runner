// === RANGEDATTACK.JS ===
// Responsabilidade: decisão, criação e colisão dos projéteis ranged do player.

import { checkCollision } from './entities.js';
import { createExplosion } from './enemy.js';

const CLOSE_RANGE_SCREEN_PARTS = 10 / 24;
const RANGED_SPEED = 18;
const RANGED_HEIGHT = 38;
const RANGED_ASPECT = 924 / 422;
const RANGED_ANIM_SPEED = 4;

function _isHostileEntity(ent) {
    return ent.type !== 'carrier';
}

export function getRangedAttackDecision({ player, entities, canvasWidth }) {
    const closeRange = canvasWidth * CLOSE_RANGE_SCREEN_PARTS;
    const playerCenterX = player.x + player.width / 2;
    let hasCloseEnemy = false;
    let hasAwayEnemy = false;

    entities.forEach(ent => {
        if (!_isHostileEntity(ent)) return;

        const entCenterX = ent.x + ent.width / 2;
        const distance = Math.abs(entCenterX - playerCenterX);
        if (distance <= closeRange) {
            hasCloseEnemy = true;
        } else if (entCenterX > playerCenterX) {
            hasAwayEnemy = true;
        }
    });

    return {
        shouldUseRanged: !hasCloseEnemy && hasAwayEnemy && player.rangedCharges > 0,
        hasCloseEnemy,
        hasAwayEnemy,
    };
}

export function createRangedProjectile(player) {
    const height = RANGED_HEIGHT;
    const width = height * RANGED_ASPECT;
    return {
        x: player.x + player.width,
        y: player.y + player.height * 0.5 - height * 0.5,
        width,
        height,
        vx: RANGED_SPEED,
        currentFrame: 0,
        frameTimer: 0,
        animationSpeed: RANGED_ANIM_SPEED,
    };
}

export function updateRangedProjectiles({
    rangedProjectiles,
    entities,
    dt,
    canvasWidth,
}) {
    const events = {
        kills: 0,
        scoreGain: 0,
        newExplosions: [],
    };

    for (let i = rangedProjectiles.length - 1; i >= 0; i--) {
        const proj = rangedProjectiles[i];
        proj.x += proj.vx * dt;
        proj.frameTimer += dt;

        if (proj.frameTimer >= proj.animationSpeed) {
            proj.currentFrame = (proj.currentFrame + 1) % 6;
            proj.frameTimer = 0;
        }

        let hit = false;
        for (let eIdx = 0; eIdx < entities.length; eIdx++) {
            const ent = entities[eIdx];
            if (!_isHostileEntity(ent) || !checkCollision(proj, ent)) continue;

            hit = true;
            if (ent.type !== 'wall') {
                events.newExplosions.push(createExplosion(ent));
                events.kills++;
                events.scoreGain += 60;
            }
            entities.splice(eIdx, 1);
            break;
        }

        if (hit || proj.x > canvasWidth) {
            rangedProjectiles.splice(i, 1);
        }
    }

    return events;
}
