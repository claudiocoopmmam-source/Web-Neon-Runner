// === ENTITIES.JS ===
// Responsabilidade: fábricas de spawn — plataformas, inimigos, carrier.
// Sem comportamento, sem colisão, sem lógica de update.
// Só cria e devolve objetos prontos para o enemy.js e physics.js usarem.

// --- SPRITES DE INIMIGOS ---
export const runnerFrames = [];
export const numRunnerFrames = 2;
export let runnerAssetsLoaded = 0;
for (let i = 1; i <= numRunnerFrames; i++) {
    const img = new Image();
    img.src = `assets/enemy_runner_walk_${i}.webp`;
    img.onload = () => { runnerAssetsLoaded++; };
    runnerFrames.push(img);
}

export const shooterLoadedSprite = new Image();
shooterLoadedSprite.src = 'assets/enemy_shooter_loaded.webp';
export let shooterLoadedAssetLoaded = false;
shooterLoadedSprite.onload = () => { shooterLoadedAssetLoaded = true; };

export const shooterUnloadedSprite = new Image();
shooterUnloadedSprite.src = 'assets/enemy_shooter_unloaded.webp';
export let shooterUnloadedAssetLoaded = false;
shooterUnloadedSprite.onload = () => { shooterUnloadedAssetLoaded = true; };

export const missileFrames = [];
export const numMissileFrames = 3;
export let missileAssetsLoaded = 0;
for (let i = 1; i <= numMissileFrames; i++) {
    const img = new Image();
    img.src = `assets/missile_${i}.webp`;
    img.onload = () => { missileAssetsLoaded++; };
    missileFrames.push(img);
}

export const carrierFuelSprite = new Image();
carrierFuelSprite.src = 'assets/enemy_carrier_fuel.webp';
export let carrierFuelAssetLoaded = false;
carrierFuelSprite.onload = () => { carrierFuelAssetLoaded = true; };

export const carrierHealthSprite = new Image();
carrierHealthSprite.src = 'assets/enemy_carrier_health.webp';
export let carrierHealthAssetLoaded = false;
carrierHealthSprite.onload = () => { carrierHealthAssetLoaded = true; };

export const flyerFrames = [];
export const numFlyerFrames = 2;
export let flyerAssetsLoaded = 0;
for (let i = 1; i <= numFlyerFrames; i++) {
    const img = new Image();
    img.src = `assets/enemy_flyer_walk${i}.webp`;
    img.onload = () => { flyerAssetsLoaded++; };
    flyerFrames.push(img);
}

export const numExplosionFrames = 5;

// Variação 1 (original), 2 e 3 — cada uma com 5 frames
const _explosionVariantDefs = [
    { srcFn: (i) => `assets/enemy_explosion${i}.webp`,       count: 5 },
    { srcFn: (i) => `assets/enemy_explosion_var2_${i}.webp`, count: 5 },
    { srcFn: (i) => `assets/enemy_explosion_var3_${i}.webp`, count: 5 },
];

export const explosionVariants = _explosionVariantDefs.map(({ srcFn, count }) => {
    const frames = [];
    for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = srcFn(i);
        frames.push(img);
    }
    return frames;
});

export function getRandomExplosionVariant() {
    return explosionVariants[Math.floor(Math.random() * explosionVariants.length)];
}

// --- COLISÃO GENÉRICA ---
export function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

// --- FÁBRICA DE PLATAFORMAS ---
export function updatePlatformsState(platforms, gameSpeed, dt) {
    platforms.forEach(plat => (plat.x -= gameSpeed * dt));
    return platforms.filter(plat => plat.x + plat.width > 0);
}

export function createNewPlatform(lastPlat, gameSpeed) {
    const baseSpeed = 5;
    const maxTargetSpeed = 7.5;

    let scalingFactor = (gameSpeed - baseSpeed) / (maxTargetSpeed - baseSpeed);
    scalingFactor = Math.max(0, Math.min(1, scalingFactor));

    const minGap = 120 + 120 * 0.5 * scalingFactor;
    const maxGap = 480 + 480 * 0.5 * scalingFactor;
    const minWidth = 180, maxWidth = 450;

    const gap = Math.random() * (maxGap - minGap) + minGap;
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    const nextX = lastPlat.x + lastPlat.width + gap;
    const nextY = Math.floor(Math.random() * (500 - 180) + 180);

    return { x: nextX, y: nextY, width, height: 576 - nextY };
}

// --- FÁBRICAS DE INIMIGOS ---
export function generateEnemy(spawnX, platY, gameSpeed, plat) {
    const types = ['runner_enemy', 'flyer_enemy', 'shooter_enemy', 'wall'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'runner_enemy') {
        const targetHeight = 50;
        const targetWidth = targetHeight * (480 / 310);
        return {
            type: 'runner',
            x: spawnX,
            y: platY - targetHeight,
            height: targetHeight,
            width: targetWidth,
            baseVx: -2,
            vy: 0,
            platFloorY: platY,
            platLeft: plat.x,
            platRight: plat.x + plat.width,
            color: '#ff0055',
        };
    } else if (type === 'flyer_enemy') {
        const targetHeight = 45;
        return {
            type: 'flyer',
            x: spawnX,
            y: Math.random() * (platY - 140) + 40,
            height: targetHeight,
            width: targetHeight * (523 / 351),
            baseVx: 0,
            vy: 0,
            platFloorY: platY,
            color: '#d600ff',
            currentFrame: 0,
            frameTimer: 0,
            animationSpeed: 6,
        };
    } else if (type === 'shooter_enemy') {
        const targetHeight = 45;
        return {
            type: 'shooter',
            x: spawnX,
            y: Math.random() * (platY - 140) + 40,
            height: targetHeight,
            width: targetHeight * (260 / 220),
            baseVx: 0,
            vy: 0,
            hasShot: false,
            platFloorY: platY,
            color: '#00bfff',
        };
    } else {
        return {
            type: 'wall',
            x: spawnX,
            y: 0,
            width: 30,
            height: platY,
            baseVx: 0,
            vy: 0,
            platFloorY: platY,
            color: '#ffaa00',
        };
    }
}

export function spawnCarrierDrone(playerY) {
    const lootTypes = ['fuel', 'life'];
    const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
    const targetHeight = 65;

    return {
        type: 'carrier',
        x: 1050,
        y: Math.max(40, Math.min(480, playerY - Math.random() * 80)),
        height: targetHeight,
        width: targetHeight * (192 / 270),
        baseVx: -1.5,
        vy: 0,
        loot: lootType,
        color: '#ffaa00',
    };
}