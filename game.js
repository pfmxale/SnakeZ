class SnakeGame {
    constructor() {
        this.socket = null;
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'menu';
        this.players = new Map();
        this.food = [];
        this.playerId = null;
        this.selectedColor = '#FF6B6B';
        this.playerName = '';
        this.score = 0;
        this.length = 1;
        this.mouse = { x: 0, y: 0 };
        this.camera = { x: 0, y: 0 };
        this.worldSize = { width: 4000, height: 4000 };
        
        this.initializeElements();
        this.setupEventListeners();
        this.connectToServer();
    }

    initializeElements() {
        this.mainMenu = document.getElementById('mainMenu');
        this.gameScreen = document.getElementById('gameScreen');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.playerNameInput = document.getElementById('playerName');
        this.playButton = document.getElementById('playButton');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.currentScore = document.getElementById('currentScore');
        this.currentLength = document.getElementById('currentLength');
        this.leaderboardList = document.getElementById('leaderboardList');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.playAgainButton = document.getElementById('playAgainButton');
        this.finalScore = document.getElementById('finalScore');
        this.finalLength = document.getElementById('finalLength');

        this.resizeCanvas();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Character selection
        document.querySelectorAll('.character-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelector('.character-option.active').classList.remove('active');
                option.classList.add('active');
                this.selectedColor = option.dataset.color;
            });
        });

        // Play button
        this.playButton.addEventListener('click', () => {
            const name = this.playerNameInput.value.trim();
            if (name && this.socket && this.socket.connected) {
                this.playerName = name;
                this.startGame();
            }
        });

        // Play again button
        this.playAgainButton.addEventListener('click', () => {
            this.gameOverOverlay.style.display = 'none';
            this.startGame();
        });

        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });

        // Keyboard controls for mobile/alternative input
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'playing') {
                const key = e.key.toLowerCase();
                let direction = null;
                
                switch (key) {
                    case 'w':
                    case 'arrowup':
                        direction = { x: 0, y: -1 };
                        break;
                    case 's':
                    case 'arrowdown':
                        direction = { x: 0, y: 1 };
                        break;
                    case 'a':
                    case 'arrowleft':
                        direction = { x: -1, y: 0 };
                        break;
                    case 'd':
                    case 'arrowright':
                        direction = { x: 1, y: 0 };
                        break;
                }
                
                if (direction && this.socket) {
                    this.socket.emit('changeDirection', direction);
                }
            }
        });
    }

    connectToServer() {
        this.connectionStatus.textContent = 'Verbinde zum Server...';
        this.socket = io();

        this.socket.on('connect', () => {
            this.connectionStatus.textContent = 'Verbunden! Bereit zum Spielen.';
            this.connectionStatus.style.color = '#4ECDC4';
            this.playButton.disabled = false;
        });

        this.socket.on('disconnect', () => {
            this.connectionStatus.textContent = 'Verbindung verloren. Versuche zu reconnecten...';
            this.connectionStatus.style.color = '#FF6B6B';
            this.playButton.disabled = true;
        });

        this.socket.on('gameState', (gameData) => {
            this.updateGameState(gameData);
        });

        this.socket.on('playerJoined', (player) => {
            this.players.set(player.id, player);
        });

        this.socket.on('playerLeft', (playerId) => {
            this.players.delete(playerId);
        });

        this.socket.on('gameOver', (data) => {
            this.handleGameOver(data);
        });

        this.socket.on('leaderboard', (leaderboard) => {
            this.updateLeaderboard(leaderboard);
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.mainMenu.classList.remove('active');
        this.gameScreen.classList.add('active');
        
        this.socket.emit('joinGame', {
            name: this.playerName,
            color: this.selectedColor
        });

        this.gameLoop();
        this.sendMousePosition();
    }

    updateGameState(gameData) {
        this.players = new Map(Object.entries(gameData.players));
        this.food = gameData.food || [];
        this.playerId = gameData.playerId;
        
        if (this.players.has(this.playerId)) {
            const player = this.players.get(this.playerId);
            this.score = player.score;
            this.length = player.body.length;
            this.currentScore.textContent = this.score;
            this.currentLength.textContent = this.length;
            
            // Update camera to follow player
            if (player.body.length > 0) {
                const head = player.body[0];
                this.camera.x = head.x - this.canvas.width / 2;
                this.camera.y = head.y - this.canvas.height / 2;
            }
        }
    }

    updateLeaderboard(leaderboard) {
        this.leaderboardList.innerHTML = '';
        leaderboard.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            if (player.id === this.playerId) {
                entry.classList.add('current-player');
            }
            
            entry.innerHTML = `
                <span>${index + 1}. ${player.name}</span>
                <span>${player.score}</span>
            `;
            this.leaderboardList.appendChild(entry);
        });
    }

    handleGameOver(data) {
        this.gameState = 'gameOver';
        this.finalScore.textContent = data.score;
        this.finalLength.textContent = data.length;
        this.gameOverOverlay.style.display = 'flex';
    }

    sendMousePosition() {
        if (this.gameState === 'playing' && this.socket) {
            const player = this.players.get(this.playerId);
            if (player && player.body.length > 0) {
                const head = player.body[0];
                const worldMouseX = this.mouse.x + this.camera.x;
                const worldMouseY = this.mouse.y + this.camera.y;
                
                const dx = worldMouseX - head.x;
                const dy = worldMouseY - head.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                if (length > 0) {
                    const direction = { x: dx / length, y: dy / length };
                    this.socket.emit('updateDirection', direction);
                }
            }
            
            setTimeout(() => this.sendMousePosition(), 50);
        }
    }

    gameLoop() {
        if (this.gameState === 'playing') {
            this.render();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw food
        this.food.forEach(food => {
            this.drawFood(food);
        });

        // Draw players
        this.players.forEach(player => {
            this.drawPlayer(player);
        });

        // Draw border
        this.drawWorldBorder();
    }

    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        const endX = this.camera.x + this.canvas.width;
        const endY = this.camera.y + this.canvas.height;

        for (let x = startX; x < endX; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x - this.camera.x, 0);
            this.ctx.lineTo(x - this.camera.x, this.canvas.height);
            this.ctx.stroke();
        }

        for (let y = startY; y < endY; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y - this.camera.y);
            this.ctx.lineTo(this.canvas.width, y - this.camera.y);
            this.ctx.stroke();
        }
    }

    drawFood(food) {
        const x = food.x - this.camera.x;
        const y = food.y - this.camera.y;

        if (x < -20 || x > this.canvas.width + 20 || y < -20 || y > this.canvas.height + 20) {
            return;
        }

        this.ctx.save();
        this.ctx.translate(x, y);
        
        // Draw food with glow effect
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, food.size);
        gradient.addColorStop(0, food.color);
        gradient.addColorStop(0.7, food.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, food.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawPlayer(player) {
        if (!player.body || player.body.length === 0) return;

        const isCurrentPlayer = player.id === this.playerId;
        
        // Draw body segments
        for (let i = player.body.length - 1; i >= 0; i--) {
            const segment = player.body[i];
            const x = segment.x - this.camera.x;
            const y = segment.y - this.camera.y;

            if (x < -50 || x > this.canvas.width + 50 || y < -50 || y > this.canvas.height + 50) {
                continue;
            }

            const size = i === 0 ? segment.size * 1.2 : segment.size;
            const opacity = i === 0 ? 1 : 0.8;
            
            this.ctx.save();
            this.ctx.globalAlpha = opacity;
            this.ctx.translate(x, y);
            
            // Create gradient for each segment
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
            gradient.addColorStop(0, this.lightenColor(player.color, 20));
            gradient.addColorStop(0.8, player.color);
            gradient.addColorStop(1, this.darkenColor(player.color, 20));
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add border for current player
            if (isCurrentPlayer) {
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }

        // Draw player name
        const head = player.body[0];
        const nameX = head.x - this.camera.x;
        const nameY = head.y - this.camera.y - head.size - 15;
        
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(player.name, nameX, nameY);
        this.ctx.fillText(player.name, nameX, nameY);
    }

    drawWorldBorder() {
        this.ctx.strokeStyle = '#FF6B6B';
        this.ctx.lineWidth = 5;
        this.ctx.setLineDash([20, 20]);
        
        const borderX = 0 - this.camera.x;
        const borderY = 0 - this.camera.y;
        const borderWidth = this.worldSize.width;
        const borderHeight = this.worldSize.height;
        
        this.ctx.strokeRect(borderX, borderY, borderWidth, borderHeight);
        this.ctx.setLineDash([]);
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});