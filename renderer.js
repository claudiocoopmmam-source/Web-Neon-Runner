// === RENDERER.JS ===
// Responsabilidade: tudo que toca no ctx — player, inimigos, projéteis,
// plataformas, explosões, fuel bar, câmera e zoom da death sequence.
// Só lê estado, nunca escreve.

import {
    runFrames, runAssetsLoaded, numRunFrames,
    attackFrames, attackAssetsLoaded, numAttackFrames,
    rangedAttackFrames, rangedAttackAssetsLoaded, numRangedAttackFrames,
    jumpSprite, jumpAssetLoaded,
    flyFrames, flyAssetsLoaded, numFlyFrames,
    deathFrames, deathAssetsLoaded, numDeathFrames,
    overchargeFrames, overchargeAssetsLoaded, numOverchargeFrames,
} from './player.js';

import {
    runnerFrames, runnerAssetsLoaded,
    shooterLoadedSprite, shooterLoadedAssetLoaded,
    shooterUnloadedSprite, shooterUnloadedAssetLoaded,
    missileFrames, missileAssetsLoaded, numMissileFrames,
    carrierFuelSprite, carrierFuelAssetLoaded,
    carrierHealthSprite, carrierHealthAssetLoaded,
    flyerFrames, flyerAssetsLoaded,
    explosionVariants, numExplosionFrames,
} from './entities.js';

import {
    drawParallaxBackground,
    drawParallaxForeground,
} from './parallax.js';
import { MAX_CAMERA_DRIFT_Y } from './world.js';

const DEATH_SEQUENCE_DURATION = 2500;

/**
 * Frame de render completo.
 */
export function draw({
    ctx,
    canvas,
    player,
    platforms,
    entities,
    projectiles,
    rangedProjectiles = [],
    activeExplosions,
    globalTimer,
    isGameOver,
    isFirstStart,
    isDeathSequence,
    deathSequenceEndTime,
    isOverchargeReady = false,
    overchargeReadyStart = 0,
    gameSpeed = 5
}) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    let zoomed = false;
    const parallaxScroll = globalTimer * gameSpeed;
    const playerCenterY = player.y + player.height / 2;
    const verticalDistance = canvas.height * 0.42 - playerCenterY;
    const cameraDriftY = Math.max(
        -MAX_CAMERA_DRIFT_Y,
        Math.min(MAX_CAMERA_DRIFT_Y, verticalDistance * 0.055)
    );

    // --- CÂMERA DE MORTE (ZOOM + SLOW-MO VISUAL) ---
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
        const targetCX = canvas.width / 2 + (playerCenterX - canvas.width / 2) * cameraProgress;
        const targetCY = canvas.height / 2 + (playerCenterY - canvas.height / 2) * cameraProgress;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(-targetCX, -targetCY);
    }

    // --- CÂMERA DE OVERCHARGE READY (zoom suave de 1.08x centrado no player) ---
    const OVERCHARGE_READY_DURATION = 2000;
    if (isOverchargeReady && player.overchargeState === 'ready') {
        ctx.save();
        zoomed = true;

        const elapsed      = performance.now() - overchargeReadyStart;
        const progress     = Math.min(1, elapsed / OVERCHARGE_READY_DURATION);
        const eased        = 1 - Math.pow(1 - progress, 2);
        const zoomFactor   = 1.0 + 0.18 * eased;

        const cx = player.x + player.width  / 2;
        const cy = player.y + player.height / 2;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoomFactor, zoomFactor);
        ctx.translate(
            -(canvas.width  / 2 + (cx - canvas.width  / 2) * eased),
            -(canvas.height / 2 + (cy - canvas.height / 2) * eased)
        );
    }

    ctx.translate(0, cameraDriftY);

    drawParallaxBackground(ctx, canvas, parallaxScroll);
    _drawPlatforms(ctx, platforms);
    _drawProjectiles(ctx, projectiles, globalTimer);
    _drawRangedProjectiles(ctx, rangedProjectiles);
    _drawEntities(ctx, entities, player, globalTimer);
    _drawExplosions(ctx, activeExplosions);
    if (player.overchargeState === 'active') {
        _drawSpeedLines(ctx, canvas, globalTimer);
    }
    _drawPlayer(ctx, player, isGameOver, isDeathSequence, deathSequenceEndTime, globalTimer);
    _drawComboMultiplier(ctx, player, isFirstStart, isGameOver);
    drawParallaxForeground(ctx, canvas, parallaxScroll);

    if (zoomed) ctx.restore();
    ctx.restore();

    if (!isFirstStart && !isGameOver) {
        drawFuelBar(ctx, player, globalTimer, gameSpeed);
        drawOverchargeBar(ctx, canvas, player, globalTimer);
        if (player.overchargeState === 'ready') {
            _drawFPrompt(ctx, canvas, globalTimer);
        }
    }
}

function _drawFPrompt(ctx, canvas, globalTimer) {
    const pulse      = 0.55 + 0.45 * Math.sin(globalTimer * 0.15);
    const centerX    = canvas.width  / 2;
    const centerY    = canvas.height / 2 + 80;
    const boxW       = 48;
    const boxH       = 48;
    const boxX       = centerX - boxW / 2;
    const boxY       = centerY - boxH / 2;
    const radius     = 6;

    ctx.save();
    ctx.globalAlpha = pulse;

    // Caixa com borda neon
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxW - radius, boxY);
    ctx.arcTo(boxX + boxW, boxY,         boxX + boxW, boxY + radius,         radius);
    ctx.lineTo(boxX + boxW, boxY + boxH - radius);
    ctx.arcTo(boxX + boxW, boxY + boxH,  boxX + boxW - radius, boxY + boxH,  radius);
    ctx.lineTo(boxX + radius, boxY + boxH);
    ctx.arcTo(boxX, boxY + boxH,         boxX, boxY + boxH - radius,         radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.arcTo(boxX, boxY,                boxX + radius, boxY,                 radius);
    ctx.closePath();

    ctx.fillStyle   = 'rgba(0, 191, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = '#00bfff';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur  = 12;
    ctx.stroke();

    // Letra F
    ctx.fillStyle  = '#00bfff';
    ctx.font       = 'bold 28px Courier New';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F', centerX, centerY);

    ctx.shadowBlur   = 0;
    ctx.globalAlpha  = 1;
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
}

// --- LINHAS DE VELOCIDADE (OVERCHARGE) ---
function _drawSpeedLines(ctx, canvas, globalTimer) {
    const NUM_LINES = 7;
    const STRIP_H   = 70; // altura das faixas no topo/rodapé
    const speed     = 22; // velocidade horizontal dos riscos

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
    ctx.lineCap = 'round';

    for (let strip = 0; strip < 2; strip++) {
        const baseY = strip === 0 ? 0 : canvas.height - STRIP_H;

        for (let i = 0; i < NUM_LINES; i++) {
            const seed   = i * 137 + strip * 911;
            const y      = baseY + ((seed * 53) % STRIP_H);
            const len    = 60 + ((seed * 31) % 120);
            const offset = (globalTimer * speed + seed * 40) % (canvas.width + len);
            const x      = canvas.width - offset;

            const flicker = 0.3 + 0.5 * Math.abs(Math.sin(globalTimer * 0.07 + i));
            ctx.globalAlpha = flicker;
            ctx.lineWidth   = 1.5 + (i % 3);

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - len, y);
            ctx.stroke();
        }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// --- PLATAFORMAS ---
function _drawPlatforms(ctx, platforms) {
    platforms.forEach(plat => {
        ctx.fillStyle = '#2c2e3e';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });
}

// --- PROJÉTEIS ---
function _drawProjectiles(ctx, projectiles, globalTimer) {
    projectiles.forEach(proj => {
        if (missileAssetsLoaded === numMissileFrames) {
            const frame = Math.floor(globalTimer / 6) % numMissileFrames;
            ctx.save();
            ctx.translate(proj.x + proj.width / 2, proj.y + proj.height / 2);
            ctx.rotate(Math.atan2(proj.vy, proj.vx));
            if (proj.vx < 0) ctx.scale(1, -1);
            ctx.drawImage(missileFrames[frame], -proj.width / 2, -proj.height / 2, proj.width, proj.height);
            ctx.restore();
        } else {
            ctx.fillStyle = proj.color;
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });
}

function _drawRangedProjectiles(ctx, rangedProjectiles) {
    rangedProjectiles.forEach(proj => {
        if (rangedAttackAssetsLoaded === numRangedAttackFrames) {
            const frame = proj.currentFrame % numRangedAttackFrames;
            ctx.drawImage(rangedAttackFrames[frame], proj.x, proj.y, proj.width, proj.height);
        } else {
            ctx.fillStyle = '#00bfff';
            ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        }
    });
}

// --- INIMIGOS ---
function _drawEntities(ctx, entities, player, globalTimer) {
    entities.forEach(ent => {
        if (ent.type === 'runner' && runnerAssetsLoaded >= 2) {
            const frame = Math.floor(globalTimer / 8) % 2;
            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (ent.baseVx < 0) ctx.scale(-1, 1);
            ctx.drawImage(runnerFrames[frame], -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();

        } else if (ent.type === 'flyer' && flyerAssetsLoaded === 2) {
            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1);
            ctx.drawImage(flyerFrames[ent.currentFrame], -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();

        } else if (ent.type === 'shooter' && shooterLoadedAssetLoaded && shooterUnloadedAssetLoaded) {
            const sprite = ent.hasShot ? shooterUnloadedSprite : shooterLoadedSprite;
            ctx.save();
            ctx.translate(ent.x + ent.width / 2, ent.y + ent.height / 2);
            if (player.x < ent.x) ctx.scale(-1, 1);
            ctx.drawImage(sprite, -ent.width / 2, -ent.height / 2, ent.width, ent.height);
            ctx.restore();

        } else if (ent.type === 'carrier') {
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

        } else {
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
        }
    });
}

// --- EXPLOSÕES ---
function _drawExplosions(ctx, activeExplosions) {
    activeExplosions.forEach(exp => {
        const frames = exp.variant || explosionVariants[0];
        if (exp.currentFrame >= frames.length) return;
        const img = frames[exp.currentFrame];
        if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, exp.x, exp.y, exp.width, exp.height);
        }
    });
}

// --- PLAYER ---
function _drawPlayer(ctx, player, isGameOver, isDeathSequence, deathSequenceEndTime, globalTimer) {
    // --- OVERCHARGE SPRITE ---
    if (player.overchargeState === 'active' && overchargeAssetsLoaded === numOverchargeFrames) {
        const img = overchargeFrames[player.overchargeFrame];
        if (img.complete && img.naturalWidth > 0) {
            // Proporção real do sprite: 500x272
            const OVERCHARGE_ASPECT = 500 / 272;
            const drawH = player.height * 1.5; //alterado de 1.6
            const drawW = drawH * OVERCHARGE_ASPECT;
            const drawX = player.x + player.width  / 2 - drawW / 2;
            const drawY = player.y + player.height / 2 - drawH / 2;
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }
        return;
    }

    if (isGameOver && deathAssetsLoaded === numDeathFrames && deathFrames[0]?.naturalWidth > 0) {
        const startTime = deathSequenceEndTime - DEATH_SEQUENCE_DURATION;
        const elapsed = performance.now() - startTime;
        const frameDuration = DEATH_SEQUENCE_DURATION / numDeathFrames;
        let frame = Math.floor(elapsed / frameDuration);
        if (frame >= numDeathFrames) frame = numDeathFrames - 1;
        const deathVisualWidth = player.height * (498 / 455);
        ctx.drawImage(deathFrames[frame], player.x, player.y, deathVisualWidth, player.height);
        return;
    }

    // Pisca durante invulnerabilidade (exceto na recarga pós-overcharge)
    if (player.invulnerableTimer > 0 && !player.isOverchargeRecovering) {
        if (Math.floor(player.invulnerableTimer) % 4 >= 2) return;
    }

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
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

// --- COMBO ---
function _drawComboMultiplier(ctx, player, isFirstStart, isGameOver) {
    if (isFirstStart || isGameOver || player.comboMultiplier <= 1.0) return;

    const isOvercharge = player.overchargeState === 'active';

    if (isOvercharge) {
        // Maior, bold, e mais distante da cabeça do player (overcharge sprite é maior)
        ctx.fillStyle   = '#00bfff';
        ctx.font        = 'bold 22px Courier New';
        ctx.textAlign   = 'left';
        ctx.shadowColor = '#00bfff';
        ctx.shadowBlur  = 10;
        ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, player.x + player.width + 40, player.y - 20);
        ctx.shadowBlur  = 0;
    } else {
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`x${player.comboMultiplier.toFixed(1)}`, player.x + player.width + 6, player.y + 4);
    }
}

// --- FUEL BAR (HUD) ---
export function drawFuelBar(ctx, player, globalTimer = 0, gameSpeed = 5) {
    const hudX = 20;
    const hudY = 20;
    const barWidth = 120;
    const barHeight = 10;

    const isOvercharge = player.overchargeState === 'active';

    ctx.fillStyle = '#2c2e3e';
    ctx.fillRect(hudX, hudY, barWidth, barHeight);

    const fuelPct = player.fuel / player.maxFuel;

    if (isOvercharge) {
        // Pulsa azul neon durante overcharge
        const pulse = 0.6 + 0.4 * Math.sin(globalTimer * 0.18);
        ctx.fillStyle = `rgba(0, 191, 255, ${pulse})`;
    } else if (player.isFuelLocked) {
        ctx.fillStyle = '#990022';
    } else if (fuelPct < 0.40) {
        ctx.fillStyle = '#ffaa00';
    } else {
        ctx.fillStyle = '#00ffcc';
    }
    ctx.fillRect(hudX, hudY, barWidth * (isOvercharge ? 1 : fuelPct), barHeight);

    ctx.strokeStyle = '#626a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX, hudY, barWidth, barHeight);

    if (!isOvercharge) {
        // Marcador de 15%
        const lineX = hudX + barWidth * 0.15;
        ctx.beginPath();
        ctx.strokeStyle = '#0d0e15';
        ctx.lineWidth = 1.5;
        ctx.moveTo(lineX, hudY);
        ctx.lineTo(lineX, hudY + barHeight);
        ctx.stroke();
    }

    ctx.font = 'bold 8px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // PENDENTE VERIFICAR: conferir legibilidade do status dentro da barra de fuel.
    if (isOvercharge) {
        const pulse = 0.7 + 0.3 * Math.sin(globalTimer * 0.18);
        ctx.fillStyle = `rgba(0, 191, 255, ${pulse})`;
        ctx.fillText('OVERCHARGED', hudX + barWidth / 2, hudY + barHeight / 2);
    } else if (player.isFuelLocked) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('SUPERAQUECIDO', hudX + barWidth / 2, hudY + barHeight / 2);
    } else {
        ctx.fillStyle = '#0d0e15';
        ctx.fillText('NORMAL', hudX + barWidth / 2, hudY + barHeight / 2);
    }
    ctx.textBaseline = 'alphabetic';

    _drawRangedChargeBar(ctx, player, hudX, hudY + barHeight + 8);

    // --- DEBUG INFO ---
    let debugY = hudY + barHeight + 48;
    ctx.fillStyle = '#00ffcc';
    ctx.font = '11px Courier New';
    ctx.textAlign = 'left';

    ctx.fillText(`Game Speed: ${gameSpeed.toFixed(2)}`, hudX, debugY); debugY += 14;

    const ocPct = ((player.overchargeBar / player.overchargeMax) * 100).toFixed(1);
    const ocCur = player.overchargeBar.toFixed(1);
    ctx.fillText(`Overcharge: ${ocPct}% [${ocCur}/${player.overchargeMax}]`, hudX, debugY); debugY += 14;

    ctx.fillText(`isGrounded: ${player.isGrounded}`, hudX, debugY); debugY += 14;

    const regen = player.currentFuelRegen || 0;
    ctx.fillText(`Fuel Regen: ${regen.toFixed(3)}/f`, hudX, debugY); debugY += 14;

    const drain = player.currentFuelDrain || 0;
    ctx.fillText(`Fuel Drain: ${drain.toFixed(3)}/f`, hudX, debugY); debugY += 14;

    const curCd = Math.max(0, player.attackCooldownTimer);
    const maxCd = player.currentAttackCooldownMax || 30;
    ctx.fillText(`Attack CD:  ${curCd.toFixed(1)} / ${maxCd.toFixed(1)}f`, hudX, debugY); debugY += 14;

    const ocDuration = Math.max(0, player.overchargeTimer);
    ctx.fillText(`OC Timer:   ${ocDuration.toFixed(2)}s`, hudX, debugY); debugY += 14;
}

function _drawRangedChargeBar(ctx, player, x, y) {
    const barWidth = 60;
    const barHeight = 5;
    const hasCharge = player.rangedCharges > 0;
    const partialPct = Math.min(1, player.rangedChargeProgress / 2);

    ctx.save();
    ctx.strokeStyle = '#00bfff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    if (hasCharge) {
        ctx.fillStyle = '#00bfff';
        ctx.fillRect(x, y, barWidth, barHeight);
        if (partialPct > 0) {
            ctx.fillStyle = '#006a8f';
            ctx.fillRect(x, y, barWidth * partialPct, barHeight);
        }
    } else if (partialPct > 0) {
        ctx.fillStyle = '#00bfff';
        ctx.fillRect(x, y, barWidth * partialPct, barHeight);
    }

    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00bfff';
    ctx.fillText(`x ${player.rangedCharges}`, x + barWidth + 8, y + barHeight + 2);
    ctx.restore();
}

// --- OVERCHARGE BAR ---
export function drawOverchargeBar(ctx, canvas, player, globalTimer) {
    const barW    = canvas.width * 0.88;
    const barH    = 14;
    const barX    = (canvas.width - barW) / 2;
    const barY    = canvas.height - 22;
    const pct     = player.overchargeBar / player.overchargeMax;
    const state   = player.overchargeState;

    ctx.save(); // Salva estado do contexto para manipular a opacidade com segurança

    if (state === 'cooldown') {
        // globalTimer passa 60 vezes por segundo, floor / 30 alterna a cada ~0.5 seg
        const isBlinkOn = Math.floor(globalTimer / 30) % 2 === 0;
        ctx.globalAlpha = isBlinkOn ? 1.0 : 0.1;
    }

    // Fundo metálico base
    const bgGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    bgGrad.addColorStop(0, '#3a3d4a');
    bgGrad.addColorStop(0.5, '#52566b');
    bgGrad.addColorStop(1, '#3a3d4a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(barX, barY, barW, barH);

    if (state === 'cooldown') {
        // Cinza escuro com texto "RESFRIANDO"
        ctx.fillStyle = '#2c2e3e';
        ctx.fillRect(barX, barY, barW, barH);
        
        ctx.font = 'bold 9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#626a8a';
        ctx.fillText('RESFRIANDO', canvas.width / 2, barY + barH / 2 + 3);

        // Fina borda azul neon no lugar da metálica
        ctx.strokeStyle = '#00bfff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);

    } else if (state === 'active' || state === 'ready') {
        // Pulsa azul neon, preenchimento drena visualmente no active usando o pct
        const pulse = 0.65 + 0.35 * Math.sin(globalTimer * 0.20);
        ctx.fillStyle = `rgba(0, 191, 255, ${pulse})`;
        ctx.fillRect(barX, barY, barW * pct, barH); 

        // Brilho exterior (seguindo o tamanho ativo)
        ctx.shadowColor = '#00bfff';
        ctx.shadowBlur  = 10 * pulse;
        ctx.strokeStyle = `rgba(0, 191, 255, ${pulse})`;
        ctx.lineWidth   = 1;
        ctx.strokeRect(barX, barY, barW * pct, barH);
        ctx.shadowBlur  = 0;

        if (state === 'active') {
            ctx.font = 'bold 9px Courier New';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff'; // Letra branca e brilhante pra destacar no fundo quando encolhe
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 2;
            ctx.fillText('OVERCHARGE', canvas.width / 2, barY + barH / 2 + 3);
            ctx.shadowBlur = 0;
        }
    } else {
        // Preenchimento laranja proporcional
        if (pct > 0) {
            const fillGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
            fillGrad.addColorStop(0, '#ffcc44');
            fillGrad.addColorStop(0.5, '#ff8800');
            fillGrad.addColorStop(1, '#ff6600');
            ctx.fillStyle = fillGrad;
            ctx.fillRect(barX, barY, barW * pct, barH);
        }
    }

    // Borda metálica limite (apenas se não estiver resfriando, para não misturar com a borda azul neon)
    if (state !== 'cooldown') {
        const borderGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        borderGrad.addColorStop(0, '#8a8fa8');
        borderGrad.addColorStop(0.4, '#c8cdd8');
        borderGrad.addColorStop(1, '#6a6f82');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
    }

    ctx.restore(); // Desfaz a mudança de alpha para não interferir nos demais objetos da tela
}
