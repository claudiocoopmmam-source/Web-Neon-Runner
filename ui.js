import { gameSpeed } from './game.js';
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');

export function updateUI(score, lives) {
    scoreDisplay.innerText = `Score: ${Math.floor(score)}`;
    livesDisplay.innerText = 'HP: ' + '❤️'.repeat(Math.max(0, lives));
}

export function drawPause(ctx, canvas) {
    ctx.fillStyle = 'rgba(13, 14, 21, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 30px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 60);
    
    ctx.fillStyle = '#fff';
    ctx.font = '14px Courier New';
    ctx.fillText('C O M A N D O S', canvas.width / 2, canvas.height / 2 - 10);
    
    ctx.fillStyle = '#626a8a';
    ctx.fillText('------------------------------------------------', canvas.width / 2, canvas.height / 2 + 5);
    
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('W / ESPAÇO / ↑ :', canvas.width / 2 - 100, canvas.height / 2 + 25);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('Pulo / Pulo Duplo / Voar (Segurar)', canvas.width / 2 - 30, canvas.height / 2 + 25);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('D / X / CLIQUE  :', canvas.width / 2 - 100, canvas.height / 2 + 50);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText('Ataque Melee (Corta & Rebate Projéteis)', canvas.width / 2 - 30, canvas.height / 2 + 50);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('Pressione [P] para despausar e continuar', canvas.width / 2, canvas.height / 2 + 95);
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