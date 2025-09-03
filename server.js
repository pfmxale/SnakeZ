const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state
const gameState = {
    players: new Map(),
    food: [],
    worldSize: { width: 4000, height: 4000 },
    maxFood: 150,
    foodColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#F8C471', '#85C1E9']
};

class Player {
    constructor(id, name, color, x, y) {
        this.id = id;
        this.name = name.substring(0, 15);
        this.color = color;
        this.body = [{ x, y, size: 15 }];
        this.direction = { x: 0, y: 0 };
        this.speed = 2;
        this.score = 0;
        this.alive = true;
        this.lastUpdate = Date.now();
    }

    update() {
        if (!this.alive || (this.direction.x === 0 && this.direction.y === 0)) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        // Move head
        const head = this.body[0];
        const newHead = {
            x: head.x + this.direction.x * this.speed * (deltaTime / 16),
            y: head.y + this.direction.y * this.speed * (deltaTime / 16),
            size: Math.max(10, 15 - this.body.length * 0.1)
        };

        // Check world boundaries with margin
        if (newHead.x < 30 || newHead.x > gameState.worldSize.width - 30 ||
            newHead.y < 30 || newHead.y > gameState.worldSize.height - 30) {
            this.alive = false;
            return;
        }

        // Add new head
        this.body.unshift(newHead);

        // Calculate body length based on score
        const targetLength = Math.max(3, Math.floor(this.score / 5) + 3);
        
        // Remove tail segments if too long
        while (this.body.length > targetLength) {
            this.body.pop();
        }

        // Update segment sizes and positions
        for (let i = 1; i < this.body.length; i++) {
            const current = this.body[i];
            const target = this.body[i - 1];
            const distance = Math.sqrt((target.x - current.x) ** 2 + (target.y - current.y) ** 2);
            const segmentDistance = 25; // Increased distance between segments

            if (distance > segmentDistance) {
                const ratio = (distance - segmentDistance) / distance * 0.1; // Smoother following
                current.x += (target.x - current.x) * ratio;
                current.y += (target.y - current.y) * ratio;
            }
            
            current.size = Math.max(10, 18 - i * 0.3);
        }
    }

    checkFoodCollision() {
        const head = this.body[0];
        let foodEaten = 0;

        gameState.food = gameState.food.filter(food => {
            const distance = Math.sqrt((head.x - food.x) ** 2 + (head.y - food.y) ** 2);
            if (distance < head.size + food.size) {
                this.score += food.value;
                foodEaten++;
                return false;
            }
            return true;
        });

        return foodEaten;
    }

    checkPlayerCollision(otherPlayers) {
        const head = this.body[0];

        for (const [playerId, player] of otherPlayers) {
            if (playerId === this.id || !player.alive) continue;

            // Check collision with other player's body
            for (let i = 0; i < player.body.length; i++) {
                const segment = player.body[i];
                const distance = Math.sqrt((head.x - segment.x) ** 2 + (head.y - segment.y) ** 2);
                
                if (distance < head.size + segment.size - 8) {
                    this.alive = false;
                    return true;
                }
            }
        }

        // Check self collision (skip more segments from head to prevent false positives)
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

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 5;
        this.color = gameState.foodColors[Math.floor(Math.random() * gameState.foodColors.length)];
        this.value = Math.floor(this.size);
    }
}

// Generate initial food
function generateFood() {
    while (gameState.food.length < gameState.maxFood) {
        const x = Math.random() * gameState.worldSize.width;
        const y = Math.random() * gameState.worldSize.height;
        gameState.food.push(new Food(x, y));
    }
}

// Generate random spawn position
function getRandomSpawnPosition() {
    const margin = 200;
    const x = margin + Math.random() * (gameState.worldSize.width - 2 * margin);
    const y = margin + Math.random() * (gameState.worldSize.height - 2 * margin);
    return { x, y };
}

// Get leaderboard
function getLeaderboard() {
    return Array.from(gameState.players.values())
        .filter(player => player.alive)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(player => ({
            id: player.id,
            name: player.name,
            score: player.score,
            length: player.body.length
        }));
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('joinGame', (data) => {
        const spawnPos = getRandomSpawnPosition();
        const player = new Player(
            socket.id,
            data.name || 'Anonymous',
            data.color || '#FF6B6B',
            spawnPos.x,
            spawnPos.y
        );
        
        gameState.players.set(socket.id, player);
        
        // Send initial game state to the new player
        socket.emit('gameState', {
            players: Object.fromEntries(gameState.players),
            food: gameState.food,
            playerId: socket.id
        });

        // Notify other players
        socket.broadcast.emit('playerJoined', {
            id: player.id,
            name: player.name,
            color: player.color
        });

        console.log(`${data.name} joined the game`);
    });

    socket.on('updateDirection', (direction) => {
        const player = gameState.players.get(socket.id);
        if (player && player.alive) {
            // Normalize direction
            const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
            if (length > 0) {
                player.direction = {
                    x: direction.x / length,
                    y: direction.y / length
                };
            }
        }
    });

    socket.on('changeDirection', (direction) => {
        const player = gameState.players.get(socket.id);
        if (player && player.alive) {
            player.direction = direction;
        }
    });

    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`${player.name} left the game`);
        }
        gameState.players.delete(socket.id);
        socket.broadcast.emit('playerLeft', socket.id);
    });
});

// Game loop
function gameLoop() {
    // Update all players
    for (const [playerId, player] of gameState.players) {
        if (player.alive) {
            player.update();
            
            // Check collisions
            const foodEaten = player.checkFoodCollision();
            const collided = player.checkPlayerCollision(gameState.players);
            
            if (collided) {
                // Player died
                io.to(playerId).emit('gameOver', {
                    score: player.score,
                    length: player.body.length
                });
            }
        }
    }

    // Generate new food
    generateFood();

    // Send game state to all players
    const gameData = {
        players: Object.fromEntries(gameState.players),
        food: gameState.food
    };

    for (const [playerId, player] of gameState.players) {
        if (player.alive) {
            io.to(playerId).emit('gameState', {
                ...gameData,
                playerId: playerId
            });
        }
    }

    // Send leaderboard
    const leaderboard = getLeaderboard();
    io.emit('leaderboard', leaderboard);

    // Clean up dead players after a delay
    setTimeout(() => {
        for (const [playerId, player] of gameState.players) {
            if (!player.alive) {
                gameState.players.delete(playerId);
            }
        }
    }, 5000);
}

// Initialize game
generateFood();

// Start game loop
setInterval(gameLoop, 1000 / 60); // 60 FPS

// Start server
server.listen(PORT, () => {
    console.log(`SnakeZ.io server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});