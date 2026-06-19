// === PARALLAX.JS ===
// Responsabilidade: assets e desenho das camadas de parallax do cenário.
// As imagens são desenhadas em loop horizontal para dar sensação de movimento.

import { createTrackedImage } from './assetmanager.js';
import { PARALLAX_SCALE } from './world.js';

export const parallaxBack = createTrackedImage('assets/bg_parallax_1.webp');
export const parallaxMid = createTrackedImage('assets/bg_parallax_2.webp');
export const parallaxFront = createTrackedImage('assets/bg_parallax_3.webp');
export const parallaxForeground = createTrackedImage('assets/fg_parallax_1.webp');

let parallaxScrollAccumulator = 0;

export function updateParallax(speed) {
    parallaxScrollAccumulator += speed;
}

export function resetParallax() {
    parallaxScrollAccumulator = 0;
}

function _drawLayer(ctx, canvas, img, scrollX, alpha = 1) {
    if (!img || img.naturalWidth === 0) return;

    const drawW = canvas.width * PARALLAX_SCALE;
    const drawH = canvas.height * PARALLAX_SCALE;
    
    let shiftX = scrollX % drawW;
    if (shiftX < 0) shiftX += drawW;
    
    const startX = -shiftX;
    const offsetY = -((drawH - canvas.height) / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, startX, offsetY, drawW, drawH);
    ctx.drawImage(img, startX + drawW, offsetY, drawW, drawH);
    ctx.drawImage(img, startX + drawW * 2, offsetY, drawW, drawH);
    ctx.restore();
}

export function drawParallaxBackground(ctx, canvas) {
    _drawLayer(ctx, canvas, parallaxBack, parallaxScrollAccumulator * 0.12);
    _drawLayer(ctx, canvas, parallaxMid, parallaxScrollAccumulator * 0.28);
    _drawLayer(ctx, canvas, parallaxFront, parallaxScrollAccumulator * 0.46);
}

export function drawParallaxForeground(ctx, canvas) {
    _drawLayer(ctx, canvas, parallaxForeground, parallaxScrollAccumulator * 0.68, 0.95);
}
