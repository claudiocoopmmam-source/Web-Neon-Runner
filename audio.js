// === GERENCIADOR DE ÁUDIO DO JOGO ===

export const menuBGM = new Audio('assets/BGM/Cosmic_Shadows_Menu_BGM.opus');
menuBGM.loop = true;
menuBGM.volume = 0.15; // Valor inicial correspondente ao slider BGM

const gameTracks = [
    'assets/BGM/Runic_Circuit_BGM.opus', 
    'assets/BGM/Neon_Invasion_BGM.opus'
];

export const gameBGM = new Audio();
gameBGM.volume = 0.15; // Valor inicial correspondente ao slider BGM
let currentTrackIndex = 0;

// Variável para repassar dinamicamente o volume atual do slider de SFX para novos áudios instanciados
export let currentSFXVolume = 0.50; 

gameBGM.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % gameTracks.length;
    gameBGM.src = gameTracks[currentTrackIndex];
    gameBGM.play().catch(err => console.log("Erro ao rotacionar BGM:", err));
});

export function playMenuMusic() {
    gameBGM.pause();
    menuBGM.muted = false;
    //  Só dá play do início se ela não estiver tocando atualmente
    if (menuBGM.paused) {
        menuBGM.currentTime = 0;
        menuBGM.play().catch(err => console.log("Áudio bloqueado pelo navegador."));
    }
}

export function startGameMusic() {
    menuBGM.pause();
    currentTrackIndex = 0;
    gameBGM.src = gameTracks[currentTrackIndex];
    // Garante que o áudio volte despausado caso o jogo tenha sido mutado/alterado nas opções
    gameBGM.muted = false; 
    gameBGM.play().catch(err => console.log("Erro ao iniciar trilha do jogo:", err));
}

// NOVAS: Atualizações em tempo real disparadas pelos inputs do menu de opções
export function updateBGMVolume(volume) {
    menuBGM.volume = volume;
    gameBGM.volume = volume;
}

export function updateSFXVolume(volume) {
    currentSFXVolume = volume;
    rocketBootsSFX.volume = volume; // Atualiza a bota jato que já está instanciada
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
    if (currentSFXVolume <= 0) return; // Se o volume for zero, não inicializa áudio à toa

    const randomVoiceSrc = attackVoices[Math.floor(Math.random() * attackVoices.length)];
    const randomStrikeSrc = swordStrikes[Math.floor(Math.random() * swordStrikes.length)];

    const voiceSFX = new Audio(randomVoiceSrc);
    voiceSFX.volume = currentSFXVolume;
    voiceSFX.play().catch(err => console.log("Erro ao reproduzir voz SFX:", err));

    const strikeSFX = new Audio(randomStrikeSrc);
    strikeSFX.volume = currentSFXVolume;
    strikeSFX.play().catch(err => console.log("Erro ao reproduzir corte SFX:", err));
}

// Instância persistente para o som contínuo das botas a jato
export const rocketBootsSFX = new Audio('assets/sfx/player_rocketboots_sfx.opus');
rocketBootsSFX.loop = false; 
rocketBootsSFX.volume = 0.50; // Inicializa casado com o slider de SFX

export function startRocketBootsSFX() {
    if (currentSFXVolume <= 0) return;
    
    if (rocketBootsSFX.paused) {
        rocketBootsSFX.currentTime = 0;
        rocketBootsSFX.play().catch(err => console.log("Erro ao iniciar som da bota:", err));
    }
}

export function stopRocketBootsSFX() {
    rocketBootsSFX.pause();
}

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
    if (currentSFXVolume <= 0) return;
    const randomExplosionSrc = enemyExplosions[Math.floor(Math.random() * enemyExplosions.length)];
    const explosionSFX = new Audio(randomExplosionSrc);
    explosionSFX.volume = currentSFXVolume;
    explosionSFX.play().catch(err => console.log("Erro ao reproduzir explosão SFX:", err));
}

export function playCarrierPickupSFX() {
    if (currentSFXVolume <= 0) return;
    const pickupSFX = new Audio('assets/sfx/carrier_pickup_sfx.opus');
    pickupSFX.volume = currentSFXVolume;
    pickupSFX.play().catch(err => console.log("Erro ao reproduzir coleta do carrier SFX:", err));
}

// === VOZES DE DANO E MORTE DO PLAYER ===

const playerHurtVoices = [
    'assets/sfx/player_hurt1_sfx.opus',
    'assets/sfx/player_hurt2_sfx.opus',
    'assets/sfx/player_hurt3_sfx.opus'
];

const playerDeathVoices = [
    'assets/sfx/player_death1_sfx.opus',
    'assets/sfx/player_death2_sfx.opus',
    'assets/sfx/player_death3_sfx.opus',
    'assets/sfx/player_death4_sfx.opus'
];

export function playPlayerHurtSFX() {
    if (currentSFXVolume <= 0) return; // Não inicializa áudio se o slider estiver zerado
    const randomHurtSrc = playerHurtVoices[Math.floor(Math.random() * playerHurtVoices.length)];
    const hurtSFX = new Audio(randomHurtSrc);
    hurtSFX.volume = currentSFXVolume; // Sincronizado com as configurações de opções
    hurtSFX.play().catch(err => console.log("Erro ao reproduzir voz de dano SFX:", err));
}

export function playPlayerDeathSFX() {
    if (currentSFXVolume <= 0) return;
    const randomDeathSrc = playerDeathVoices[Math.floor(Math.random() * playerDeathVoices.length)];
    const deathSFX = new Audio(randomDeathSrc);
    deathSFX.volume = currentSFXVolume;
    deathSFX.play().catch(err => console.log("Erro ao reproduzir voz de morte SFX:", err));
}