// Carregamento de Sprites do Player
export const runFrames = [];
export const numRunFrames = 4;
export let runAssetsLoaded = 0;
for (let i = 1; i <= numRunFrames; i++) {
    const img = new Image();
    img.src = `assets/player_run_${i}.png`;
    img.onload = () => { runAssetsLoaded++; };
    runFrames.push(img);
}

export const attackFrames = [];
export const numAttackFrames = 3;
export let attackAssetsLoaded = 0;
for (let i = 1; i <= numAttackFrames; i++) {
    const img = new Image();
    img.src = `assets/player_attack_${i}.png`;
    img.onload = () => { attackAssetsLoaded++; };
    attackFrames.push(img);
}

export const jumpSprite = new Image();
jumpSprite.src = 'assets/player_jump.png';
export let jumpAssetLoaded = false;
jumpSprite.onload = () => { jumpAssetLoaded = true; };

export const flyFrames = [];
export const numFlyFrames = 3;
export let flyAssetsLoaded = 0;
for (let i = 1; i <= numFlyFrames; i++) {
    const img = new Image();
    img.src = `assets/player_fly_${i}.png`;
    img.onload = () => { flyAssetsLoaded++; };
    flyFrames.push(img);
}

// Sprites dos Inimigos
export const runnerFrames = [];
export const numRunnerFrames = 6;
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

// Objeto de Estado Global do Player
// Objeto de Estado Global do Player - Totalmente Proporcional (320x500)
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
    
    // CORRIGIDO: Capacidade máxima aumentada em 10%
    maxFuel: 66,       
    fuel: 66,          
    fuelRegen: 0.15,    
    isFuelLocked: false, 
    flyFrame: 0,
    flyAnimationSpeed: 5,
    coyoteTimer: 0,
    maxCoyoteFrames: 6,
    comboKills: 0,
    comboMultiplier: 1.0
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
    player.fuel = player.maxFuel; // Inicia com o novo tanque cheio (66)
    player.isFuelLocked = false;
    player.coyoteTimer = 0;
    player.comboKills = 0;
    player.comboMultiplier = 1.0;
}

export function updatePlayerState(player, keys, globalTimer, dt, canvasHeight) {
    if (player.fuel <= 0) {
        player.fuel = 0;
        player.isFlying = false;
        player.isFuelLocked = true;
    }
    
    if (player.isFuelLocked && player.fuel >= player.maxFuel * 0.15) {
        player.isFuelLocked = false; 
    }

    if (player.isFlying && keys.jump && !player.isFuelLocked && player.fuel > 0) {
        player.vy = -4.5; 
        player.fuel -= 1 * dt; 
        if (globalTimer % player.flyAnimationSpeed === 0) {
            player.flyFrame = (player.flyFrame + 1) % numFlyFrames;
        }
    } else {
        player.isFlying = false;
        player.vy += player.gravity * dt;
        
        if (player.fuel < player.maxFuel) {
            // Regeneração de combustível mais rápida quando o jogador está no chão, e mais lenta no ar
            const currentRegen = player.isGrounded ? player.fuelRegen : 0.06;
            
            player.fuel = Math.min(player.maxFuel, player.fuel + currentRegen * dt);
        }
    }

    player.y += player.vy * dt;
}