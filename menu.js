document.addEventListener('DOMContentLoaded', () => {
    const mainMenu = document.getElementById('main-menu');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    
    const btnRun = document.getElementById('btn-run');
    const btnHighscore = document.getElementById('btn-highscore');
    const btnRestart = document.getElementById('btn-restart');
    const btnToMenu = document.getElementById('btn-to-menu');

    // Iniciar Corrida do Menu Principal
    btnRun.addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameScreen.style.display = 'block';
        gameOverScreen.style.display = 'none';
        
        if (typeof isFirstStart !== 'undefined') {
            isFirstStart = false;
        }
        // Dispara o reset preventivo para garantir o início limpo do motor
        if (typeof init === 'function') init(); 
    });

    // Recomeçar Direto da Tela de Game Over
    btnRestart.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        if (typeof init === 'function') init();
    });

    // Voltar ao Menu Principal a partir do Game Over
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
});