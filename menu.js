import { init, setFirstStart, togglePause } from './game.js';
import { playMenuMusic, startGameMusic, updateBGMVolume, updateSFXVolume, menuBGM } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverTip = document.getElementById('game-over-tip');
    
    const btnRun = document.getElementById('btn-run');
    const btnHighscore = document.getElementById('btn-highscore');
    const btnRestart = document.getElementById('btn-restart');
    const btnToMenu = document.getElementById('btn-to-menu');

    const btnOptions = document.getElementById('btn-options');
    const optionsMenu = document.getElementById('options-menu');
    const btnCloseOptions = document.getElementById('btn-close-options');
    
    const sliderBGM = document.getElementById('slider-bgm');
    const sliderSFX = document.getElementById('slider-sfx');
    const iconBGM = document.getElementById('icon-bgm');
    const iconSFX = document.getElementById('icon-sfx');

    const subtitlesContainer = document.getElementById('subtitles-container');

    const pauseScreen = document.getElementById('pause-screen');
    const btnResume = document.getElementById('btn-resume');
    const btnPauseOptions = document.getElementById('btn-pause-options');
    const btnPauseToMenu = document.getElementById('btn-pause-to-menu');

    // NOVOS: Mapeamento das setas do carrossel de dicas
    const btnPrevTip = document.getElementById('btn-prev-tip');
    const btnNextTip = document.getElementById('btn-next-tip');

    let openedFromPause = false;

    const tips = [
        "Dica: Seu combustível regenera mais devagar quando você esta no ar!",
        "Dica: Seu combustível regenera mais rápido quando você esta no chão!",
        "Dica: Ataque os projéteis no tempo certo para rebatê-los contra os inimigos.",
        "Dica: Você fica invulnerável por alguns momentos após receber dano.",
        "Dica: Coletar ou atacar o carrier vermelho te da uma vida extra (❤️).",
        "Dica: Coletar ou atacar o carrier azul aumenta 50% da sua barra de combustível.",
        "Dica: O segundo pulo no ar tem apenas 70% da força do primeiro pulo.",
        "Dica: Manter o combo de eliminação ativo aumenta passivamente a velocidade de ganho de Score!",
        "Dica: Correr para fora da plataforma te dá um pouco de tolerância para pular.",
        "Dica: Aperte o botão de pulo três vezes seguidas e segure para acionar os propulsores de voo!",
        "Dica: Derrotar qualquer inimigo da uma chance de fazer surgir um Drone de Suprimentos!",
        "Dica: Os robôs Atiradores esvaziam o pente após o primeiro disparo. Aproveite a brecha para atacar!",
        "Dica: Receber dano reseta seu multiplicador de Score."
    ];

    // NOVO: Controla a posição atual do índice da lista de dicas
    let currentTipIndex = 0;

    // NOVO: Renderiza a dica baseada no índice com rotação infinita segura
    function showTip(index) {
        if (gameOverTip && tips.length > 0) {
            currentTipIndex = (index + tips.length) % tips.length;
            gameOverTip.innerText = tips[currentTipIndex];
        }
    }

    const subtitleData = [
        { start: 10.02, end: 12.44, text: "The void calls out with a chilling tone," },
        { start: 12.44, end: 15.12, text: "A red eclipse where no sun is shown." },
        { start: 15.12, end: 17.26, text: "Metal skies screech like they're alive," },
        { start: 17.26, end: 19.92, text: "In shadows deep, can we survive?" },
        { start: 19.92, end: 22.32, text: "Neon whispers through the jagged haze," },
        { start: 22.32, end: 24.46, text: "Fleeing lights trapped in their maze." },
        { start: 24.46, end: 27.12, text: "They came for a Earth cold and gray," },
        { start: 27.12, end: 29.18, text: "Our hope fades fast, slipping away." },
        { start: 29.18, end: 34.04, text: "Under their ships, the world cracks wide," },
        { start: 34.04, end: 38.82, text: "A wave of fear we cannot hide." },
        { start: 38.82, end: 43.62, text: "Our steps are slow, yet hearts defy," },
        { start: 43.62, end: 50.62, text: "Will we endure, or let dreams die?" },
        { start: 58.30, end: 60.70, text: "Laser lights cut the silent expanse," }, 
        { start: 60.70, end: 63.14, text: "No time for rest, no second chance." },
        { start: 63.14, end: 65.48, text: "Circuits hum like a heartbeat's cry," },
        { start: 65.48, end: 67.98, text: "The question lingers, fight or comply?" },
        { start: 67.98, end: 70.36, text: "Echoes pulse across the scorched terrain," },
        { start: 70.36, end: 72.48, text: "Every move feels laced with pain." },
        { start: 72.48, end: 75.10, text: "Yet in the dark, there's still a spark," },
        { start: 75.10, end: 77.22, text: "A small rebellion in the endless dark." },
        { start: 77.22, end: 82.06, text: "Under their ships, the world cracks wide," },
        { start: 82.06, end: 86.82, text: "A wave of fear we cannot hide." },
        { start: 86.82, end: 91.62, text: "Our steps are slow, yet hearts defy," },
        { start: 91.62, end: 98.62, text: "Will we endure, or let dreams die?" },
        { start: 105.42, end: 110.32, text: "Under their ships, the world cracks wide," }, 
        { start: 110.32, end: 115.04, text: "A wave of fear we cannot hide." },
        { start: 115.04, end: 120.12, text: "Our steps are slow, yet hearts defy," },
        { start: 120.12, end: 123.98, text: "Will we endure, or let dreams die?" }
    ];

    let currentSubtitleIndex = -1;
    let wordTimers = [];

    function clearSubtitles(immediate = false) {
        wordTimers.forEach(timer => clearTimeout(timer));
        wordTimers = [];
        if (subtitlesContainer) {
            if (immediate) {
                subtitlesContainer.innerHTML = '';
            } else {
                const activeLines = subtitlesContainer.querySelectorAll('.subtitle-line');
                activeLines.forEach(line => {
                    const words = line.querySelectorAll('.word');
                    words.forEach(w => w.classList.remove('active')); 
                    setTimeout(() => line.remove(), 600); 
                });
            }
        }
        currentSubtitleIndex = -1;
    }

    function displaySubtitleLine(text) {
        if (!subtitlesContainer) return;
        const activeLines = subtitlesContainer.querySelectorAll('.subtitle-line');
        activeLines.forEach(line => {
            const words = line.querySelectorAll('.word');
            words.forEach(w => w.classList.remove('active'));
            setTimeout(() => line.remove(), 600);
        });
        wordTimers.forEach(timer => clearTimeout(timer));
        wordTimers = [];

        const lineDiv = document.createElement('div');
        lineDiv.className = 'subtitle-line';
        const words = text.split(' ');
        words.forEach((wordText, index) => {
            const span = document.createElement('span');
            span.classList.add('word');
            span.innerText = wordText;
            lineDiv.appendChild(span);
            const timer = setTimeout(() => { span.classList.add('active'); }, index * 160); 
            wordTimers.push(timer);
        });
        subtitlesContainer.appendChild(lineDiv);
    }

    menuBGM.addEventListener('timeupdate', () => {
        if (mainMenu.style.display === 'none' && optionsMenu.style.display === 'none') {
            clearSubtitles(true); 
            return;
        }
        const currentTime = menuBGM.currentTime;
        let foundLine = null;
        let foundIndex = -1;
        for (let i = 0; i < subtitleData.length; i++) {
            if (currentTime >= subtitleData[i].start && currentTime <= subtitleData[i].end) {
                foundLine = subtitleData[i]; foundIndex = i; break;
            }
        }
        if (foundIndex !== currentSubtitleIndex) {
            currentSubtitleIndex = foundIndex;
            if (foundLine) { displaySubtitleLine(foundLine.text); } else { clearSubtitles(false); }
        }
    });

    const audioUnlocker = document.getElementById('audio-unlocker');
    const unlockAudio = (e) => {
        if (!e.target.closest('#btn-run') && !e.target.closest('#btn-options')) {
            if (menuBGM.paused) playMenuMusic();
            if (audioUnlocker) audioUnlocker.style.display = 'none';
            document.removeEventListener('click', unlockAudio);
        }
    };
    document.addEventListener('click', unlockAudio);

    sliderBGM.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value); updateBGMVolume(val);
        iconBGM.src = val === 0 ? 'assets/ui/sound_off.webp' : 'assets/ui/sound_on.webp';
    });

    sliderSFX.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value); updateSFXVolume(val);
        iconSFX.src = val === 0 ? 'assets/ui/sound_off.webp' : 'assets/ui/sound_on.webp';
    });

    btnOptions.addEventListener('click', () => {
        document.removeEventListener('click', unlockAudio);
        if (audioUnlocker) audioUnlocker.style.display = 'none';
        openedFromPause = false; 
        if (menuBGM.paused) playMenuMusic();
        optionsMenu.style.display = 'flex';
    });

    btnPauseOptions.addEventListener('click', () => {
        openedFromPause = true; optionsMenu.style.display = 'flex';
    });

    btnCloseOptions.addEventListener('click', () => {
        optionsMenu.style.display = 'none'; btnCloseOptions.blur(); 
        if (!openedFromPause && menuBGM.paused) playMenuMusic();
    });

    btnResume.addEventListener('click', () => { togglePause(false); btnResume.blur(); });

    btnPauseToMenu.addEventListener('click', () => {
        togglePause(false);
        pauseScreen.style.display = 'none'; gameScreen.style.display = 'none';
        mainMenu.style.display = 'flex'; gameOverScreen.style.display = 'none';
        setFirstStart(true); playMenuMusic();
    });

    // === OUVINTES DAS SETAS DE DICAS DE GAME OVER ===
    if (btnPrevTip && btnNextTip) {
        btnPrevTip.addEventListener('click', () => { showTip(currentTipIndex - 1); });
        btnNextTip.addEventListener('click', () => { showTip(currentTipIndex + 1); });
    }

    btnRun.addEventListener('click', () => {
        document.removeEventListener('click', unlockAudio);
        if (audioUnlocker) audioUnlocker.style.display = 'none';
        clearSubtitles(true); 
        mainMenu.style.display = 'none'; gameScreen.style.display = 'block';
        gameOverScreen.style.display = 'none'; setFirstStart(false); 
        startGameMusic(); init(); 
    });

    btnRestart.addEventListener('click', () => {
        gameOverScreen.style.display = 'none'; startGameMusic(); init();
    });

    btnToMenu.addEventListener('click', () => {
        gameScreen.style.display = 'none'; mainMenu.style.display = 'flex';
        gameOverScreen.style.display = 'none'; setFirstStart(true); playMenuMusic(); 
    });

    btnHighscore.addEventListener('click', () => { console.log("Highscore clicado!"); });

    let tipCharged = false;
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                const isFlex = gameOverScreen.style.display === 'flex';
                
                if (isFlex && !tipCharged) {
                    // ATUALIZADO: Sorteia a dica inicial da tela, permitindo ciclar a partir dela
                    const randomIndex = Math.floor(Math.random() * tips.length);
                    showTip(randomIndex);
                    tipCharged = true;
                } else if (!isFlex) {
                    tipCharged = false;
                }
            }
        });
    });
    observer.observe(gameOverScreen, { attributes: true, attributeFilter: ['style'] });
});