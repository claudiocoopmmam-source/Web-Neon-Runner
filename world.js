// === WORLD.JS ===
// Responsabilidade: constantes globais de layout e limites do cenário.

export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;

export const PARALLAX_SCALE = 1.4;
export const PARALLAX_EXTRA_HEIGHT = CANVAS_HEIGHT * (PARALLAX_SCALE - 1) / 2;

// Linha inferior segura do mundo, usada para alinhar plataformas e clamping visual.
export const WORLD_BOTTOM_Y = CANVAS_HEIGHT + PARALLAX_EXTRA_HEIGHT;

// Teto/clamp vertical suave da câmera.
export const MAX_CAMERA_DRIFT_Y = PARALLAX_EXTRA_HEIGHT;
