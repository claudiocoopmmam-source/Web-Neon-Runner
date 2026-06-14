// === AUDIOMANAGER.JS ===
// Responsabilidade: toda a lógica de áudio do jogo.
// BGM (menu, jogo, game over) + SFX.
// Exporta funções de alto nível; nenhum outro módulo mexe em objetos Audio diretamente.

// --- BGM ---
export const menuBGM = new Audio('assets/BGM/Cosmic_Shadows_Menu_BGM.opus');
menuBGM.loop = true;
menuBGM.volume = 0.50;

// Apenas uma faixa para o gameplay (Runic Circuit removido)
const GAME_TRACK             = 'assets/BGM/Neon_Invasion_BGM.opus';
const GAME_TRACK_OVERCHARGED = 'assets/BGM/Neon_Invasion_overcharged_BGM.opus';

export const gameBGM = new Audio(GAME_TRACK);
gameBGM.loop = true;
gameBGM.volume = 0.50;

// Versão "agressiva" da mesma faixa — toca em paralelo, silenciada,
// e é trazida ao primeiro plano durante o overcharge.
export const gameBGMOvercharged = new Audio(GAME_TRACK_OVERCHARGED);
gameBGMOvercharged.loop = true;
gameBGMOvercharged.volume = 0;

export const gameOverBGM = new Audio('assets/BGM/Last Signal_BGM.opus');
gameOverBGM.loop = true;
gameOverBGM.volume = 0.50;

export let currentSFXVolume = 0.50;
let currentBGMVolume = 0.50;
let overchargeAudioActive = false;

export function playMenuMusic() {
    gameBGM.pause();
    gameBGMOvercharged.pause();
    gameOverBGM.pause();
    menuBGM.muted = false;
    if (menuBGM.paused) {
        menuBGM.currentTime = 0;
        menuBGM.play().catch(err => console.log('Áudio bloqueado pelo navegador.'));
    }
}

export function startGameMusic() {
    menuBGM.pause();
    gameOverBGM.pause();

    gameBGM.currentTime = 0;
    gameBGM.muted = false;
    gameBGM.volume = currentBGMVolume;
    gameBGM.play().catch(err => console.log('Erro ao iniciar trilha do jogo:', err));

    // Toca em paralelo, silenciada, mantendo sincronia para o crossfade do overcharge
    gameBGMOvercharged.currentTime = 0;
    gameBGMOvercharged.muted = false;
    gameBGMOvercharged.volume = 0;
    gameBGMOvercharged.play().catch(err => console.log('Erro ao iniciar trilha overcharge:', err));

    overchargeAudioActive = false;
}

export function playGameOverMusic() {
    gameBGM.pause();
    gameBGMOvercharged.pause();
    menuBGM.pause();
    gameOverBGM.muted = false;
    gameOverBGM.currentTime = 0;
    gameOverBGM.play().catch(err => console.log('Erro ao tocar música de Game Over:', err));
}

/**
 * Alterna o crossfade entre a trilha normal e a versão overcharged.
 * Ambas tocam em paralelo e ficam sincronizadas no currentTime.
 */
export function setOverchargeAudio(active) {
    if (active === overchargeAudioActive) return;
    overchargeAudioActive = active;

    if (active) {
        gameBGMOvercharged.currentTime = gameBGM.currentTime;
        gameBGM.volume = 0;
        gameBGMOvercharged.volume = currentBGMVolume;
    } else {
        gameBGM.currentTime = gameBGMOvercharged.currentTime;
        gameBGM.volume = currentBGMVolume;
        gameBGMOvercharged.volume = 0;
    }
}

export function updateBGMVolume(volume) {
    currentBGMVolume = volume;
    menuBGM.volume = volume;
    gameOverBGM.volume = volume;
    if (overchargeAudioActive) {
        gameBGMOvercharged.volume = volume;
        gameBGM.volume = 0;
    } else {
        gameBGM.volume = volume;
        gameBGMOvercharged.volume = 0;
    }
}

export function updateSFXVolume(volume) {
    currentSFXVolume = volume;
    rocketBootsSFX.volume = volume;
}

// --- SFX ---
const attackVoices = [
    'assets/sfx/player_attack1_sfx.opus',
    'assets/sfx/player_attack2_sfx.opus',
    'assets/sfx/player_attack3_sfx.opus',
    'assets/sfx/player_attack4_sfx.opus',
    'assets/sfx/player_attack5_sfx.opus',
];

const swordStrikes = [
    'assets/sfx/player_swordstrike1_sfx.opus',
    'assets/sfx/player_swordstrike2_sfx.opus',
    'assets/sfx/player_swordstrike3_sfx.opus',
    'assets/sfx/player_swordstrike4_sfx.opus',
];

export function playAttackSFX() {
    if (currentSFXVolume <= 0) return;
    const voiceSFX = new Audio(attackVoices[Math.floor(Math.random() * attackVoices.length)]);
    voiceSFX.volume = currentSFXVolume;
    voiceSFX.play().catch(() => {});

    const strikeSFX = new Audio(swordStrikes[Math.floor(Math.random() * swordStrikes.length)]);
    strikeSFX.volume = currentSFXVolume;
    strikeSFX.play().catch(() => {});
}

export const rocketBootsSFX = new Audio('assets/sfx/player_rocketboots_sfx.opus');
rocketBootsSFX.loop = false;
rocketBootsSFX.volume = 0.50;

export function startRocketBootsSFX() {
    if (currentSFXVolume <= 0) return;
    if (rocketBootsSFX.paused) {
        rocketBootsSFX.currentTime = 0;
        rocketBootsSFX.play().catch(() => {});
    }
}

export function stopRocketBootsSFX() {
    rocketBootsSFX.pause();
}

const enemyExplosions = Array.from({ length: 8 }, (_, i) =>
    `assets/sfx/enemy_explosion${i + 1}_sfx.opus`
);

export function playExplosionSFX() {
    if (currentSFXVolume <= 0) return;
    const sfx = new Audio(enemyExplosions[Math.floor(Math.random() * enemyExplosions.length)]);
    sfx.volume = currentSFXVolume;
    sfx.play().catch(() => {});
}

export function playCarrierPickupSFX() {
    if (currentSFXVolume <= 0) return;
    const sfx = new Audio('assets/sfx/carrier_pickup_sfx.opus');
    sfx.volume = currentSFXVolume;
    sfx.play().catch(() => {});
}

const playerHurtVoices = [
    'assets/sfx/player_hurt1_sfx.opus',
    'assets/sfx/player_hurt2_sfx.opus',
    'assets/sfx/player_hurt3_sfx.opus',
];

const playerDeathVoices = [
    'assets/sfx/player_death1_sfx.opus',
    'assets/sfx/player_death2_sfx.opus',
    'assets/sfx/player_death3_sfx.opus',
    'assets/sfx/player_death4_sfx.opus',
];

export function playPlayerHurtSFX() {
    if (currentSFXVolume <= 0) return;
    const sfx = new Audio(playerHurtVoices[Math.floor(Math.random() * playerHurtVoices.length)]);
    sfx.volume = currentSFXVolume;
    sfx.play().catch(() => {});
}

export function playPlayerDeathSFX() {
    if (currentSFXVolume <= 0) return;
    const sfx = new Audio(playerDeathVoices[Math.floor(Math.random() * playerDeathVoices.length)]);
    sfx.volume = currentSFXVolume;
    sfx.play().catch(() => {});
}
