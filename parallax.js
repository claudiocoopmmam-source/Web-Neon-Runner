// === PARALLAX.JS ===
// Responsabilidade: assets e desenho das camadas de parallax do cenário.
// As imagens são desenhadas em loop horizontal para dar sensação de movimento.

import { createTrackedImage } from './assetmanager.js';
import { PARALLAX_SCALE } from './world.js';

export const parallaxBack = createTrackedImage('assets/bg_parallax_1.webp');
export const parallaxMid = createTrackedImage('assets/bg_parallax_2.webp');
export const parallaxFront = createTrackedImage('assets/bg_parallax_3.webp');
export const parallaxForeground = createTrackedImage('assets/fg_parallax_1.webp');

function _drawLayer(ctx, canvas, img, scrollX, alpha = 1) {
    if (!img || img.naturalWidth === 0) return;

    const drawW = canvas.width * PARALLAX_SCALE;
    const drawH = canvas.height * PARALLAX_SCALE;
    const offsetX = -((scrollX % drawW) + drawW) % drawW - ((drawW - canvas.width) / 2);
    const offsetY = -((drawH - canvas.height) / 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    ctx.drawImage(img, offsetX + drawW, offsetY, drawW, drawH);
    ctx.restore();
}

export function drawParallaxBackground(ctx, canvas, scrollValue = 0) {
    _drawLayer(ctx, canvas, parallaxBack, scrollValue * 0.12);
    _drawLayer(ctx, canvas, parallaxMid, scrollValue * 0.28);
    _drawLayer(ctx, canvas, parallaxFront, scrollValue * 0.46);
}

export function drawParallaxForeground(ctx, canvas, scrollValue = 0) {
    _drawLayer(ctx, canvas, parallaxForeground, scrollValue * 0.68, 0.95);
}
