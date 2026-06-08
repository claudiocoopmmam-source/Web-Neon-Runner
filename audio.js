// === GERENCIADOR DE ÁUDIO DO JOGO ===

export const menuBGM = new Audio('assets/BGM/Cosmic_Shadows_Menu_BGM.opus');
menuBGM.loop = true;
menuBGM.volume = 0.15; // CORRIGIDO: BGM ambiente sutil e ao fundo

const gameTracks = [
    'assets/BGM/Runic_Circuit_BGM.opus', 
    'assets/BGM/Neon_Invasion_BGM.opus'
];

export const gameBGM = new Audio();
gameBGM.volume = 0.15; // CORRIGIDO: BGM ambiente sutil e ao fundo
let currentTrackIndex = 0;
export let isMuted = false;

gameBGM.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % gameTracks.length;
    gameBGM.src = gameTracks[currentTrackIndex];
    if (!isMuted) {
        gameBGM.play().catch(err => console.log("Erro ao rotacionar BGM:", err));
    }
});

export function playMenuMusic() {
    gameBGM.pause();
    menuBGM.muted = isMuted;
    menuBGM.currentTime = 0;
    menuBGM.play().catch(err => console.log("Áudio bloqueado pelo navegador."));
}

export function startGameMusic() {
    menuBGM.pause();
    currentTrackIndex = 0;
    gameBGM.src = gameTracks[currentTrackIndex];
    gameBGM.muted = isMuted;
    gameBGM.play().catch(err => console.log("Erro ao iniciar trilha do jogo:", err));
}

export function toggleMute() {
    isMuted = !isMuted;
    menuBGM.muted = isMuted;
    gameBGM.muted = isMuted;
    rocketBootsSFX.muted = isMuted;
    if (isMuted) rocketBootsSFX.pause();
    return isMuted;
}

// === EFEITOS SONOROS (SFX) ===
const attackVoices = [
    'assets/sfx/player_attack1_sfx.opus',
    'assets/sfx/player_attack2_sfx.opus',
    'assets/sfx/player_attack3_sfx.opus',
    'assets/sfx/player_attack4_sfx.opus',
    'assets/sfx/player_attack5_sfx.opus'
];

const swordStrikes = [
    'assets/sfx/player_swordstrike1_sfx.opus',
    'assets/sfx/player_swordstrike2_sfx.opus',
    'assets/sfx/player_swordstrike3_sfx.opus',
    'assets/sfx/player_swordstrike4_sfx.opus'
];

export function playAttackSFX() {
    if (isMuted) return;

    const randomVoiceSrc = attackVoices[Math.floor(Math.random() * attackVoices.length)];
    const randomStrikeSrc = swordStrikes[Math.floor(Math.random() * swordStrikes.length)];

    const voiceSFX = new Audio(randomVoiceSrc);
    voiceSFX.volume = 0.5; // SFX em evidência, mais alto que a música de fundo
    voiceSFX.play().catch(err => console.log("Erro ao reproduzir voz SFX:", err));

    const strikeSFX = new Audio(randomStrikeSrc);
    strikeSFX.volume = 0.5; // SFX em evidência
    strikeSFX.play().catch(err => console.log("Erro ao reproduzir corte SFX:", err));
}

// Instância persistente para o som contínuo das botas a jato
export const rocketBootsSFX = new Audio('assets/sfx/player_rocketboots_sfx.opus');
rocketBootsSFX.loop = false; // Forçado como false, já que a duração do arquivo é maior que o tanque
rocketBootsSFX.volume = 0.5;

export function startRocketBootsSFX() {
    if (isMuted) return;
    
    // CORRIGIDO: Reseta para o início e toca apenas se o canal estiver pausado, matando o stuttering
    if (rocketBootsSFX.paused) {
        rocketBootsSFX.currentTime = 0;
        rocketBootsSFX.play().catch(err => console.log("Erro ao iniciar som da bota:", err));
    }
}

export function stopRocketBootsSFX() {
    rocketBootsSFX.pause();
}

// Arrays e Funções de Efeitos Sonoros (SFX)

const enemyExplosions = [
    'assets/sfx/enemy_explosion1_sfx.opus',
    'assets/sfx/enemy_explosion2_sfx.opus',
    'assets/sfx/enemy_explosion3_sfx.opus',
    'assets/sfx/enemy_explosion4_sfx.opus',
    'assets/sfx/enemy_explosion5_sfx.opus',
    'assets/sfx/enemy_explosion6_sfx.opus',
    'assets/sfx/enemy_explosion7_sfx.opus',
    'assets/sfx/enemy_explosion8_sfx.opus'
];

export function playExplosionSFX() {
    if (isMuted) return;
    const randomExplosionSrc = enemyExplosions[Math.floor(Math.random() * enemyExplosions.length)];
    const explosionSFX = new Audio(randomExplosionSrc);
    explosionSFX.volume = 0.5; // Destacado e com peso
    explosionSFX.play().catch(err => console.log("Erro ao reproduzir explosão SFX:", err));
}

export function playCarrierPickupSFX() {
    if (isMuted) return;
    const pickupSFX = new Audio('assets/sfx/carrier_pickup_sfx.opus');
    pickupSFX.volume = 0.5; // Feedback claro de coleta
    pickupSFX.play().catch(err => console.log("Erro ao reproduzir coleta do carrier SFX:", err));
}