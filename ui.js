import { gameSpeed } from './game.js';
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');

export function updateUI(score, lives) {
    scoreDisplay.innerText = `Score: ${Math.floor(score)}`;
    livesDisplay.innerText = 'HP: ' + '❤️'.repeat(Math.max(0, lives));
}

export function drawPause(ctx, canvas) {
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen && pauseScreen.style.display === 'none') {
        pauseScreen.style.display = 'flex';
    }
}

export function drawFuelBar(ctx, player) {
    const hudX = 20;
    const hudY = 20;
    const barWidth = 120;
    const barHeight = 10;

    // Fundo da barra
    ctx.fillStyle = '#2c2e3e';
    ctx.fillRect(hudX, hudY, barWidth, barHeight);

    const fuelPercentage = player.fuel / player.maxFuel;
    const currentBarWidth = barWidth * fuelPercentage;

    // Sistema de Cores Corrigido conforme o comportamento correto
    if (player.isFuelLocked) {
        ctx.fillStyle = '#990022'; // Vermelho: Está regenerando mas ainda bloqueado (abaixo de 15%)
    } else if (fuelPercentage < 0.40) {
        ctx.fillStyle = '#ffaa00'; // Laranja: Combustível acabando (de 0% a 40% em voo livre)
    } else {
        ctx.fillStyle = '#00ffcc'; // Verde/Ciano padrão: Sistema estável e cheio
    }

    // Desenha o preenchimento do combustível
    ctx.fillRect(hudX, hudY, currentBarWidth, barHeight);

    // Borda da barra
    ctx.strokeStyle = '#626a8a';
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX, hudY, barWidth, barHeight);

    // Linha marcadora de segurança de voo (15%)
    const lineX = hudX + (barWidth * 0.15);
    ctx.beginPath();
    ctx.strokeStyle = '#0d0e15'; 
    ctx.lineWidth = 1.5;
    ctx.moveTo(lineX, hudY);
    ctx.lineTo(lineX, hudY + barHeight);
    ctx.stroke();

    // === INDICADOR DE STATUS DO SISTEMA DE VOO ===
    ctx.font = 'bold 11px Courier New';
    ctx.textAlign = 'left';
    
    if (player.isFuelLocked) {
        ctx.fillStyle = '#ff3344'; // Vermelho vivo para alertar o perigo
        ctx.fillText('Status: Superaquecido', hudX, hudY + barHeight + 15);
    } else {
        ctx.fillStyle = '#626a8a'; // Um tom cinza mais discreto para o estado estável
        ctx.fillText('Status: Normal', hudX, hudY + barHeight + 15);
    }
}