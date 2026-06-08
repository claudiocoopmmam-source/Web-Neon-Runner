import { init, setFirstStart } from './game.js';
import { playMenuMusic, startGameMusic } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverTip = document.getElementById('game-over-tip');
    
    const btnRun = document.getElementById('btn-run');
    const btnHighscore = document.getElementById('btn-highscore');
    const btnRestart = document.getElementById('btn-restart');
    const btnToMenu = document.getElementById('btn-to-menu');

    const tips = [
        "Dica: Sua estamina só recupera quando você está pisando no chão.",
        "Dica: Ataque os projéteis amarelos no tempo certo para rebatê-los contra os inimigos.",
        "Dica: Você fica invulnerável por alguns momentos após receber dano.",
        "Dica: Derrotar inimigos dá 10% de chance de dropar uma vida extra (❤️).",
        "Dica: O segundo pulo no ar tem apenas 70% da força do primeiro pulo.",
        "Dica: Manter o combo de eliminação ativo aumenta passivamente a velocidade de ganho de Score!",
        "Dica: Correr para fora da plataforma te dá um pouco de tolerância para pular."
    ];

    function showRandomTip() {
        if (gameOverTip) {
            const randomIndex = Math.floor(Math.random() * tips.length);
            gameOverTip.innerText = tips[randomIndex];
        }
    }

    // CORRIGIDO: Desbloqueia o áudio apenas se clicar no fundo do menu (evita conflito com o btn-run)
    const unlockAudio = (e) => {
        if (e.target !== btnRun) {
            playMenuMusic();
        }
        document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);

    btnRun.addEventListener('click', () => {
        // Se foi o primeiro clique direto no botão, remove o listener global para não duplicar canais
        document.removeEventListener('click', unlockAudio);
        
        mainMenu.style.display = 'none';
        gameScreen.style.display = 'block';
        gameOverScreen.style.display = 'none';
        setFirstStart(false); 
        
        startGameMusic(); 
        init(); 
    });

    btnRestart.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startGameMusic(); 
        init();
    });

    btnToMenu.addEventListener('click', () => {
        gameScreen.style.display = 'none';
        mainMenu.style.display = 'flex';
        gameOverScreen.style.display = 'none';
        setFirstStart(true);
        
        playMenuMusic(); 
    });

    btnHighscore.addEventListener('click', () => {
        console.log("Highscore clicado!");
    });

    const observer = new MutationObserver(() => {
        if (gameOverScreen.style.display === 'flex') {
            showRandomTip();
        }
    });
    observer.observe(gameOverScreen, { attributes: true, attributeFilter: ['style'] });
});