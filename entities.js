export function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

export function updatePlatformsState(platforms, gameSpeed, dt) {
    platforms.forEach(plat => plat.x -= gameSpeed * dt);
    return platforms.filter(plat => plat.x + plat.width > 0);
}

export function createNewPlatform(lastPlat, gameSpeed) {
    const baseSpeed = 5;
    const maxTargetSpeed = 7.5;
    
    let scalingFactor = (gameSpeed - baseSpeed) / (maxTargetSpeed - baseSpeed);
    scalingFactor = Math.max(0, Math.min(1, scalingFactor));

    const minGap = 120 + (120 * 0.5 * scalingFactor);
    const maxGap = 480 + (480 * 0.5 * scalingFactor);
    const minWidth = 180, maxWidth = 450;
    
    const gap = Math.random() * (maxGap - minGap) + minGap;
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    const nextX = lastPlat.x + lastPlat.width + gap;
    const nextY = Math.floor(Math.random() * (500 - 180) + 180);

    return { x: nextX, y: nextY, width: width, height: 576 - nextY };
}

export function generateEnemy(spawnX, platY, gameSpeed, plat) {
    const types = ['runner_enemy', 'flyer_enemy', 'shooter_enemy', 'wall'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'runner_enemy') {
        const targetHeight = 50; // Altura base do robô com rodas
        const targetWidth = targetHeight * (480 / 310); // Largura proporcional (~77.4px)
        
        return { 
            type: 'runner', 
            x: spawnX, 
            y: platY - targetHeight, // Alinha perfeitamente no chão da plataforma
            height: targetHeight,
            width: targetWidth, 
            baseVx: -2, // Velocidade de patrulha
            vy: 0, 
            platFloorY: platY,
            platLeft: plat.x, // Limite esquerdo salvo
            platRight: plat.x + plat.width, // Limite direito salvo
            color: '#ff0055' 
        };
    } else if (type === 'flyer_enemy') {
        const targetHeight = 45;
        return { 
            type: 'flyer', 
            x: spawnX, 
            y: Math.random() * (platY - 140) + 40, 
            height: targetHeight,
            width: targetHeight * (260 / 220), // Proporção (~53.1px)
            baseVx: 0, 
            vy: 0, 
            hasShot: false, 
            platFloorY: platY, 
            color: '#d600ff' 
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
            isTracking: true, 
            hasShot: false, 
            platFloorY: platY, 
            color: '#00bfff' 
        };
    } else {
        return { type: 'wall', x: spawnX, y: 0, width: 30, height: platY, baseVx: 0, vy: 0, platFloorY: platY, color: '#ffaa00' };
    }
}

export function spawnCarrierDrone(spawnX, playerY) {
    const lootTypes = ['fuel', 'life'];
    const lootType = lootTypes[Math.floor(Math.random() * lootTypes.length)];
    const targetHeight = 65; 

    return {
        type: 'carrier',
        x: 1050, // CORRIGIDO: Nasce a 1050px (logo após a borda do canvas de 1024px) para entrar voando suavemente
        y: Math.max(40, Math.min(480, playerY - Math.random() * 80)),
        height: targetHeight,
        width: targetHeight * (192 / 270), 
        baseVx: -1.5, 
        vy: 0,
        loot: lootType,
        color: '#ffaa00'
    };
}