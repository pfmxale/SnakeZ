class OfflineSnakeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.gameState = 'menu';
        this.players = new Map();
        this.food = [];
        this.playerId = 'player1';
        this.selectedColor = '#FF6B6B';
        this.playerName = '';
        this.score = 0;
        this.length = 1;
        this.mouse = { x: 0, y: 0 };
        this.camera = { x: 0, y: 0 };
        this.worldSize = { width: 4000, height: 4000 };
        this.keys = {};
        this.lastUpdate = Date.now();
        this.botPlayers = [];
        this.foodColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F8C471', '#85C1E9'];
        
        this.initializeElements();
        this.setupEventListeners();
        this.generateFood();
        this.createBotPlayers();
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

        this.connectionStatus.textContent = 'Offline-Modus - Bereit zum Spielen!';
        this.connectionStatus.style.color = '#4ECDC4';
        this.playButton.disabled = false;

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
            const name = this.playerNameInput.value.trim() || 'Anonymous';
            this.playerName = name;
            this.startGame();
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

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
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
                
                if (direction) {
                    const player = this.players.get(this.playerId);
                    if (player) {
                        player.direction = direction;
                    }
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    startGame() {
        this.gameState = 'playing';
        this.mainMenu.classList.remove('active');
        this.gameScreen.classList.add('active');
        
        // Create player
        const spawnPos = this.getRandomSpawnPosition();
        const player = new OfflinePlayer(
            this.playerId,
            this.playerName,
            this.selectedColor,
            spawnPos.x,
            spawnPos.y
        );
        
        this.players.set(this.playerId, player);
        this.score = 0;
        this.length = 1;
        
        // Reset bots
        this.createBotPlayers();
        
        this.gameLoop();
    }

    createBotPlayers() {
        this.botPlayers = [];
        const botNames = ['Bot1', 'Bot2', 'Bot3', 'Bot4', 'Bot5'];
        const botColors = ['#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        
        for (let i = 0; i < 5; i++) {
            const spawnPos = this.getRandomSpawnPosition();
            const bot = new OfflineBot(
                `bot${i}`,
                botNames[i],
                botColors[i],
                spawnPos.x,
                spawnPos.y
            );
            this.players.set(`bot${i}`, bot);
            this.botPlayers.push(bot);
        }
    }

    getRandomSpawnPosition() {
        const margin = 200;
        const x = margin + Math.random() * (this.worldSize.width - 2 * margin);
        const y = margin + Math.random() * (this.worldSize.height - 2 * margin);
        return { x, y };
    }

    generateFood() {
        this.food = [];
        const maxFood = 150;
        
        for (let i = 0; i < maxFood; i++) {
            const x = Math.random() * this.worldSize.width;
            const y = Math.random() * this.worldSize.height;
            const size = Math.random() * 8 + 5;
            const color = this.foodColors[Math.floor(Math.random() * this.foodColors.length)];
            
            this.food.push({
                x: x,
                y: y,
                size: size,
                color: color,
                value: Math.floor(size)
            });
        }
    }

    updateMouseDirection() {
        const player = this.players.get(this.playerId);
        if (player && player.body.length > 0) {
            const head = player.body[0];
            const worldMouseX = this.mouse.x + this.camera.x;
            const worldMouseY = this.mouse.y + this.camera.y;
            
            const dx = worldMouseX - head.x;
            const dy = worldMouseY - head.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            
            if (length > 0) {
                player.direction = { x: dx / length, y: dy / length };
            }
        }
    }

    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
            this.render();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    update() {
        this.updateMouseDirection();
        
        // Update all players
        for (const [playerId, player] of this.players) {
            if (player.alive) {
                player.update();
                
                // Check food collision
                player.checkFoodCollision(this.food);
                
                // Check player collision
                const collided = player.checkPlayerCollision(this.players);
                
                if (collided && playerId === this.playerId) {
                    this.handleGameOver();
                    return;
                }
                
                // Update score for main player
                if (playerId === this.playerId) {
                    this.score = player.score;
                    this.length = player.body.length;
                    this.currentScore.textContent = this.score;
                    this.currentLength.textContent = this.length;
                    
                    // Update camera
                    const head = player.body[0];
                    this.camera.x = head.x - this.canvas.width / 2;
                    this.camera.y = head.y - this.canvas.height / 2;
                }
            }
        }

        // Update bots
        this.botPlayers.forEach(bot => {
            if (bot.alive) {
                bot.updateAI(this.food, this.players);
            }
        });

        // Regenerate food
        while (this.food.length < 150) {
            const x = Math.random() * this.worldSize.width;
            const y = Math.random() * this.worldSize.height;
            const size = Math.random() * 8 + 5;
            const color = this.foodColors[Math.floor(Math.random() * this.foodColors.length)];
            
            this.food.push({
                x: x,
                y: y,
                size: size,
                color: color,
                value: Math.floor(size)
            });
        }

        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const leaderboard = Array.from(this.players.values())
            .filter(player => player.alive)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

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

    handleGameOver() {
        this.gameState = 'gameOver';
        this.finalScore.textContent = this.score;
        this.finalLength.textContent = this.length;
        this.gameOverOverlay.style.display = 'flex';
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
            if (player.alive) {
                this.drawPlayer(player);
            }
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
            
            const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
            gradient.addColorStop(0, this.lightenColor(player.color, 20));
            gradient.addColorStop(0.8, player.color);
            gradient.addColorStop(1, this.darkenColor(player.color, 20));
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, size, 0, Math.PI * 2);
            this.ctx.fill();
            
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

class OfflinePlayer {
    constructor(id, name, color, x, y) {
        this.id = id;
        this.name = name.substring(0, 15);
        this.color = color;
        this.body = [{ x, y, size: 18 }];
        this.direction = { x: 0, y: 0 };
        this.speed = 2.5;
        this.score = 0;
        this.alive = true;
        this.lastUpdate = Date.now();
    }

    update() {
        if (!this.alive || (this.direction.x === 0 && this.direction.y === 0)) return;

        const now = Date.now();
        const deltaTime = Math.min(now - this.lastUpdate, 50);
        this.lastUpdate = now;

        const head = this.body[0];
        const newHead = {
            x: head.x + this.direction.x * this.speed * (deltaTime / 16),
            y: head.y + this.direction.y * this.speed * (deltaTime / 16),
            size: Math.max(12, 18 - this.body.length * 0.05)
        };

        // Check world boundaries
        if (newHead.x < 30 || newHead.x > 4000 - 30 ||
            newHead.y < 30 || newHead.y > 4000 - 30) {
            this.alive = false;
            return;
        }

        this.body.unshift(newHead);

        const targetLength = Math.max(4, Math.floor(this.score / 3) + 4);
        
        while (this.body.length > targetLength) {
            this.body.pop();
        }

        for (let i = 1; i < this.body.length; i++) {
            const current = this.body[i];
            const target = this.body[i - 1];
            const distance = Math.sqrt((target.x - current.x) ** 2 + (target.y - current.y) ** 2);
            const segmentDistance = 25;

            if (distance > segmentDistance) {
                const ratio = (distance - segmentDistance) / distance * 0.1;
                current.x += (target.x - current.x) * ratio;
                current.y += (target.y - current.y) * ratio;
            }
            
            current.size = Math.max(10, 18 - i * 0.3);
        }
    }

    checkFoodCollision(food) {
        const head = this.body[0];
        let foodEaten = 0;

        for (let i = food.length - 1; i >= 0; i--) {
            const foodItem = food[i];
            const distance = Math.sqrt((head.x - foodItem.x) ** 2 + (head.y - foodItem.y) ** 2);
            if (distance < head.size + foodItem.size) {
                this.score += foodItem.value;
                food.splice(i, 1);
                foodEaten++;
            }
        }

        return foodEaten;
    }

    checkPlayerCollision(players) {
        const head = this.body[0];

        for (const [playerId, player] of players) {
            if (playerId === this.id || !player.alive) continue;

            for (let i = 0; i < player.body.length; i++) {
                const segment = player.body[i];
                const distance = Math.sqrt((head.x - segment.x) ** 2 + (head.y - segment.y) ** 2);
                
                if (distance < head.size + segment.size - 8) {
                    this.alive = false;
                    return true;
                }
            }
        }

        for (let i = 8; i < this.body.length; i++) {
            const segment = this.body[i];
            const distance = Math.sqrt((head.x - segment.x) ** 2 + (head.y - segment.y) ** 2);
            
            if (distance < head.size + segment.size - 8) {
                this.alive = false;
                return true;
            }
        }

        return false;
    }
}

class OfflineBot extends OfflinePlayer {
    constructor(id, name, color, x, y) {
        super(id, name, color, x, y);
        this.targetFood = null;
        this.avoidanceTarget = null;
        this.changeDirectionTimer = 0;
    }

    updateAI(food, players) {
        if (!this.alive) return;

        this.changeDirectionTimer--;
        
        if (this.changeDirectionTimer <= 0) {
            this.findNearestFood(food);
            this.avoidPlayers(players);
            this.changeDirectionTimer = 30 + Math.random() * 30;
        }

        if (this.avoidanceTarget) {
            this.moveAwayFrom(this.avoidanceTarget);
        } else if (this.targetFood) {
            this.moveTowards(this.targetFood);
        } else {
            this.randomMovement();
        }
    }

    findNearestFood(food) {
        if (food.length === 0) return;
        
        const head = this.body[0];
        let nearest = null;
        let nearestDistance = Infinity;

        food.forEach(foodItem => {
            const distance = Math.sqrt((head.x - foodItem.x) ** 2 + (head.y - foodItem.y) ** 2);
            if (distance < nearestDistance && distance < 200) {
                nearestDistance = distance;
                nearest = foodItem;
            }
        });

        this.targetFood = nearest;
    }

    avoidPlayers(players) {
        const head = this.body[0];
        this.avoidanceTarget = null;

        for (const [playerId, player] of players) {
            if (playerId === this.id || !player.alive) continue;

            const playerHead = player.body[0];
            const distance = Math.sqrt((head.x - playerHead.x) ** 2 + (head.y - playerHead.y) ** 2);
            
            if (distance < 100 && player.body.length > this.body.length) {
                this.avoidanceTarget = playerHead;
                break;
            }
        }
    }

    moveTowards(target) {
        const head = this.body[0];
        const dx = target.x - head.x;
        const dy = target.y - head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.direction = { x: dx / distance, y: dy / distance };
        }
    }

    moveAwayFrom(target) {
        const head = this.body[0];
        const dx = head.x - target.x;
        const dy = head.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.direction = { x: dx / distance, y: dy / distance };
        }
    }

    randomMovement() {
        if (Math.random() < 0.05) {
            const angle = Math.random() * Math.PI * 2;
            this.direction = {
                x: Math.cos(angle),
                y: Math.sin(angle)
            };
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new OfflineSnakeGame();
});