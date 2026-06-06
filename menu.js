document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverTip = document.getElementById('game-over-tip');
    
    const btnRun = document.getElementById('btn-run');
    const btnHighscore = document.getElementById('btn-highscore');
    const btnRestart = document.getElementById('btn-restart');
    const btnToMenu = document.getElementById('btn-to-menu');

    // Lista com as dicas do jogo
    const tips = [
        "Dica: Sua estamina só recupera quando você está pisando no chão.",
        "Dica: Ataque os projéteis amarelos no tempo certo para rebatê-los contra os inimigos.",
        "Dica: Você fica invulnerável por alguns momentos após receber dano.",
        "Dica: Derrotar inimigos dá 10% de chance de dropar uma vida extra (❤️).",
        "Dica: O segundo pulo no ar tem apenas 70% da força do primeiro pulo.",
        "Dica: Manter o combo de eliminação ativo aumenta passivamente a velocidade de ganho de Score!",
        "Dica: Correr para fora da plataforma te dá algulm tempo de tolerância para pular."
    ];

    // Função para escolher e exibir uma dica aleatória
    function showRandomTip() {
        if (gameOverTip) {
            const randomIndex = Math.floor(Math.random() * tips.length);
            gameOverTip.innerText = tips[randomIndex];
        }
    }

    // Iniciar Corrida do Menu Principal
    btnRun.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameScreen.style.display = 'block';
        gameOverScreen.style.display = 'none';
        
        if (typeof isFirstStart !== 'undefined') {
            isFirstStart = false;
        }
        if (typeof init === 'function') init(); 
    });

    // Recomeçar Direto da Tela de Game Over
    btnRestart.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        if (typeof init === 'function') init();
    });

    // Voltar ao Menu Principal
    btnToMenu.addEventListener('click', () => {
        gameScreen.style.display = 'none';
        mainMenu.style.display = 'flex';
        gameOverScreen.style.display = 'none';
        
        if (typeof isFirstStart !== 'undefined') {
            isFirstStart = true;
        }
    });

    btnHighscore.addEventListener('click', () => {
        console.log("Highscore clicado!");
    });

    // Observador técnico: Roda a dica sempre que a engine do jogo mudar o display da tela de Game Over para flex
    const observer = new MutationObserver(() => {
        if (gameOverScreen.style.display === 'flex') {
            showRandomTip();
        }
    });
    observer.observe(gameOverScreen, { attributes: true, attributeFilter: ['style'] });
});