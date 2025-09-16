class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.score = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.gameRunning = false;
        this.gameStarted = false;
        this.highScore = localStorage.getItem('aircraftGameHighScore') || 0;
        
        this.keys = {};
        this.particles = [];
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.stars = [];
        this.powerUps = [];
        this.shakeAmount = 0;
        this.shakeTime = 0;
        
        this.lastEnemySpawn = 0;
        this.enemySpawnRate = 2000;
        this.lastPowerUpSpawn = 0;
        this.powerUpSpawnRate = 15000;
        
        this.playerPowerUps = {
            rapidFire: 0,
            shield: 0,
            multiShot: 0
        };
        
        this.weapons = [
            {
                name: 'Basic Laser',
                shootCooldown: 150,
                bulletSpeed: 8,
                bulletSize: { width: 4, height: 15 },
                damage: 25,
                color: '#00ffff',
                pattern: 'single'
            },
            {
                name: 'Plasma Cannon',
                shootCooldown: 300,
                bulletSpeed: 6,
                bulletSize: { width: 8, height: 20 },
                damage: 50,
                color: '#ff6600',
                pattern: 'plasma'
            },
            {
                name: 'Spread Shot',
                shootCooldown: 200,
                bulletSpeed: 7,
                bulletSize: { width: 3, height: 12 },
                damage: 20,
                color: '#ffff00',
                pattern: 'spread'
            }
        ];
        
        this.currentWeapon = 0;
        
        this.initPlayer();
        this.initStars();
        this.bindEvents();
        this.gameLoop();
    }
    
    initPlayer() {
        this.player = {
            x: this.width / 2,
            y: this.height - 80,
            width: 40,
            height: 60,
            speed: 5,
            lastShot: 0,
            shootCooldown: 150,
            invulnerable: 0,
            trail: []
        };
    }
    
    initStars() {
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1,
                opacity: Math.random() * 0.8 + 0.2
            });
        }
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if ((e.code === 'Space' || e.code === 'Enter') && !this.gameStarted) {
                this.startGame();
            }
            
            // Weapon switching
            if (e.code === 'Digit1') {
                this.currentWeapon = 0;
            } else if (e.code === 'Digit2') {
                this.currentWeapon = 1;
            } else if (e.code === 'Digit3') {
                this.currentWeapon = 2;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            }
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restartGame();
        });
    }
    
    startGame() {
        this.gameStarted = true;
        this.gameRunning = true;
        document.getElementById('instructions').style.display = 'none';
    }
    
    restartGame() {
        this.score = 0;
        this.health = 100;
        this.gameRunning = true;
        this.bullets = [];
        this.enemies = [];
        this.explosions = [];
        this.particles = [];
        this.initPlayer();
        document.getElementById('gameOver').style.display = 'none';
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('health').textContent = `Health: ${this.health}`;
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
        document.getElementById('currentWeapon').textContent = `Weapon: ${this.weapons[this.currentWeapon].name}`;
        
        // Update power-up indicators
        const powerUpIndicators = document.getElementById('powerUpIndicators');
        powerUpIndicators.innerHTML = '';
        
        Object.keys(this.playerPowerUps).forEach(key => {
            if (this.playerPowerUps[key] > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'powerup-indicator';
                indicator.textContent = key.charAt(0).toUpperCase() + key.slice(1);
                indicator.style.background = this.getPowerUpColor(key);
                powerUpIndicators.appendChild(indicator);
            }
        });
    }
    
    getPowerUpColor(type) {
        const colors = {
            rapidFire: '#ffff00',
            shield: '#00ffff',
            multiShot: '#ff00ff'
        };
        return colors[type] || '#ffffff';
    }
    
    handleInput() {
        if (!this.gameRunning) return;
        
        // Movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x = Math.min(this.width - this.player.width, this.player.x + this.player.speed);
        }
        if (this.keys['ArrowUp'] || this.keys['KeyW']) {
            this.player.y = Math.max(0, this.player.y - this.player.speed);
        }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) {
            this.player.y = Math.min(this.height - this.player.height, this.player.y + this.player.speed);
        }
        
        // Shooting
        const weapon = this.weapons[this.currentWeapon];
        const effectiveCooldown = this.playerPowerUps.rapidFire > 0 ? weapon.shootCooldown * 0.5 : weapon.shootCooldown;
        
        if (this.keys['Space'] && Date.now() - this.player.lastShot > effectiveCooldown) {
            this.shoot();
            this.player.lastShot = Date.now();
        }
    }
    
    shoot() {
        const centerX = this.player.x + this.player.width / 2;
        const weapon = this.weapons[this.currentWeapon];
        
        if (this.playerPowerUps.multiShot > 0) {
            // Multi-shot with current weapon
            this.bullets.push({
                x: centerX - weapon.bulletSize.width / 2,
                y: this.player.y,
                width: weapon.bulletSize.width,
                height: weapon.bulletSize.height,
                speed: weapon.bulletSpeed,
                damage: weapon.damage,
                color: weapon.color,
                vx: 0,
                weaponType: weapon.pattern
            });
            this.bullets.push({
                x: centerX - 12,
                y: this.player.y,
                width: weapon.bulletSize.width,
                height: weapon.bulletSize.height,
                speed: weapon.bulletSpeed,
                damage: weapon.damage,
                color: weapon.color,
                vx: -1,
                weaponType: weapon.pattern
            });
            this.bullets.push({
                x: centerX + 8,
                y: this.player.y,
                width: weapon.bulletSize.width,
                height: weapon.bulletSize.height,
                speed: weapon.bulletSpeed,
                damage: weapon.damage,
                color: weapon.color,
                vx: 1,
                weaponType: weapon.pattern
            });
        } else {
            // Weapon-specific shooting patterns
            if (weapon.pattern === 'single') {
                this.bullets.push({
                    x: centerX - weapon.bulletSize.width / 2,
                    y: this.player.y,
                    width: weapon.bulletSize.width,
                    height: weapon.bulletSize.height,
                    speed: weapon.bulletSpeed,
                    damage: weapon.damage,
                    color: weapon.color,
                    vx: 0,
                    weaponType: weapon.pattern
                });
            } else if (weapon.pattern === 'plasma') {
                this.bullets.push({
                    x: centerX - weapon.bulletSize.width / 2,
                    y: this.player.y,
                    width: weapon.bulletSize.width,
                    height: weapon.bulletSize.height,
                    speed: weapon.bulletSpeed,
                    damage: weapon.damage,
                    color: weapon.color,
                    vx: 0,
                    weaponType: weapon.pattern,
                    plasma: true
                });
            } else if (weapon.pattern === 'spread') {
                // Spread shot creates 3 bullets in a spread pattern
                for (let i = -1; i <= 1; i++) {
                    this.bullets.push({
                        x: centerX - weapon.bulletSize.width / 2,
                        y: this.player.y,
                        width: weapon.bulletSize.width,
                        height: weapon.bulletSize.height,
                        speed: weapon.bulletSpeed,
                        damage: weapon.damage,
                        color: weapon.color,
                        vx: i * 1.5,
                        weaponType: weapon.pattern
                    });
                }
            }
        }
        
        // Enhanced muzzle flash particles based on weapon
        const particleCount = weapon.pattern === 'plasma' ? 15 : 8;
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: centerX,
                y: this.player.y,
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * -4,
                life: weapon.pattern === 'plasma' ? 35 : 25,
                maxLife: weapon.pattern === 'plasma' ? 35 : 25,
                color: weapon.color,
                size: Math.random() * 3 + 2
            });
        }
    }
    
    spawnEnemy() {
        if (Date.now() - this.lastEnemySpawn < this.enemySpawnRate) return;
        
        const enemyTypes = [
            { width: 30, height: 40, speed: 2, health: 50, color: '#ff4444', points: 10, type: 'basic' },
            { width: 40, height: 50, speed: 1.5, health: 100, color: '#ff8844', points: 25, type: 'heavy' },
            { width: 25, height: 35, speed: 3, health: 25, color: '#ff44ff', points: 15, type: 'fast' },
            { width: 35, height: 45, speed: 1.8, health: 75, color: '#44ff44', points: 20, type: 'zigzag' }
        ];
        
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        
        this.enemies.push({
            x: Math.random() * (this.width - type.width),
            y: -type.height,
            ...type,
            maxHealth: type.health,
            movePattern: 0,
            direction: Math.random() > 0.5 ? 1 : -1
        });
        
        this.lastEnemySpawn = Date.now();
        
        // Increase difficulty over time
        if (this.enemySpawnRate > 800) {
            this.enemySpawnRate -= 10;
        }
    }
    
    spawnPowerUp() {
        if (Date.now() - this.lastPowerUpSpawn < this.powerUpSpawnRate) return;
        
        const powerUpTypes = [
            { type: 'rapidFire', color: '#ffff00', duration: 5000 },
            { type: 'shield', color: '#00ffff', duration: 8000 },
            { type: 'multiShot', color: '#ff00ff', duration: 6000 },
            { type: 'health', color: '#00ff00', duration: 0 }
        ];
        
        const powerUp = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        this.powerUps.push({
            x: Math.random() * (this.width - 20),
            y: -20,
            width: 20,
            height: 20,
            speed: 2,
            ...powerUp,
            pulse: 0
        });
        
        this.lastPowerUpSpawn = Date.now();
    }
    
    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            bullet.x += bullet.vx || 0;
            
            // Add bullet trail particles based on weapon type
            const trailChance = bullet.weaponType === 'plasma' ? 0.5 : 0.3;
            if (Math.random() < trailChance) {
                this.particles.push({
                    x: bullet.x + bullet.width / 2,
                    y: bullet.y + bullet.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 2,
                    life: bullet.weaponType === 'plasma' ? 25 : 15,
                    maxLife: bullet.weaponType === 'plasma' ? 25 : 15,
                    color: bullet.color,
                    size: bullet.weaponType === 'plasma' ? 2 : 1
                });
            }
            
            return bullet.y > -bullet.height && bullet.x > -bullet.width && bullet.x < this.width;
        });
    }
    
    updateEnemies() {
        this.enemies = this.enemies.filter(enemy => {
            // Enhanced AI movement patterns
            if (enemy.type === 'zigzag') {
                enemy.movePattern += 0.1;
                enemy.x += Math.sin(enemy.movePattern) * 2 * enemy.direction;
            } else if (enemy.type === 'fast') {
                // Fast enemies try to follow player horizontally
                const playerCenter = this.player.x + this.player.width / 2;
                const enemyCenter = enemy.x + enemy.width / 2;
                if (playerCenter > enemyCenter) {
                    enemy.x += 0.5;
                } else {
                    enemy.x -= 0.5;
                }
            }
            
            enemy.y += enemy.speed;
            
            // Keep enemies in bounds
            enemy.x = Math.max(0, Math.min(this.width - enemy.width, enemy.x));
            
            // Check collision with player (if not invulnerable and no shield)
            if (this.checkCollision(enemy, this.player) && this.player.invulnerable <= 0 && this.playerPowerUps.shield <= 0) {
                this.health -= 20;
                this.player.invulnerable = 60; // 1 second of invulnerability
                this.shakeScreen(10, 30);
                this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0000');
                if (this.health <= 0) {
                    this.gameOver();
                }
                return false;
            }
            
            return enemy.y < this.height + enemy.height;
        });
    }
    
    updatePowerUps() {
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.y += powerUp.speed;
            powerUp.pulse += 0.2;
            
            // Check collision with player
            if (this.checkCollision(powerUp, this.player)) {
                this.collectPowerUp(powerUp);
                return false;
            }
            
            return powerUp.y < this.height + powerUp.height;
        });
    }
    
    collectPowerUp(powerUp) {
        // Screen flash effect
        this.shakeScreen(5, 15);
        
        // Power-up collection particles
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: powerUp.x + powerUp.width / 2,
                y: powerUp.y + powerUp.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 40,
                maxLife: 40,
                color: powerUp.color,
                size: Math.random() * 4 + 2
            });
        }
        
        if (powerUp.type === 'health') {
            this.health = Math.min(this.maxHealth, this.health + 25);
        } else {
            this.playerPowerUps[powerUp.type] = powerUp.duration;
        }
        
        this.score += 50;
    }
    
    shakeScreen(amount, duration) {
        this.shakeAmount = amount;
        this.shakeTime = duration;
    }
    
    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // gravity effect
            particle.life--;
            return particle.life > 0;
        });
    }
    
    updatePlayerTrail() {
        // Add current position to trail
        this.player.trail.push({
            x: this.player.x + this.player.width / 2,
            y: this.player.y + this.player.height,
            life: 20
        });
        
        // Update trail
        this.player.trail = this.player.trail.filter(point => {
            point.life--;
            return point.life > 0;
        });
        
        // Limit trail length
        if (this.player.trail.length > 10) {
            this.player.trail.shift();
        }
    }
    
    updatePowerUpTimers() {
        Object.keys(this.playerPowerUps).forEach(key => {
            if (this.playerPowerUps[key] > 0) {
                this.playerPowerUps[key] -= 16; // Assuming 60 FPS
                if (this.playerPowerUps[key] <= 0) {
                    this.playerPowerUps[key] = 0;
                }
            }
        });
        
        if (this.player.invulnerable > 0) {
            this.player.invulnerable--;
        }
        
        if (this.shakeTime > 0) {
            this.shakeTime--;
            if (this.shakeTime <= 0) {
                this.shakeAmount = 0;
            }
        }
    }
    
    updateExplosions() {
        this.explosions = this.explosions.filter(explosion => {
            explosion.time++;
            return explosion.time < explosion.maxTime;
        });
    }
    
    updateStars() {
        this.stars.forEach(star => {
            star.y += star.speed;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        });
    }
    
    checkCollisions() {
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    enemy.health -= bullet.damage;
                    this.bullets.splice(bulletIndex, 1);
                    
                    // Enhanced hit particles
                    for (let i = 0; i < 12; i++) {
                        this.particles.push({
                            x: bullet.x + bullet.width / 2,
                            y: bullet.y + bullet.height / 2,
                            vx: (Math.random() - 0.5) * 8,
                            vy: (Math.random() - 0.5) * 8,
                            life: 35,
                            maxLife: 35,
                            color: `hsl(${Math.random() * 60 + 10}, 100%, 70%)`,
                            size: Math.random() * 3 + 1
                        });
                    }
                    
                    // Screen shake on hit
                    this.shakeScreen(2, 5);
                    
                    if (enemy.health <= 0) {
                        this.score += enemy.points;
                        this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
                        this.enemies.splice(enemyIndex, 1);
                        
                        // Check for high score
                        if (this.score > this.highScore) {
                            this.highScore = this.score;
                            localStorage.setItem('aircraftGameHighScore', this.highScore);
                        }
                    }
                }
            });
        });
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosion(x, y, color) {
        this.explosions.push({
            x: x,
            y: y,
            time: 0,
            maxTime: 40,
            color: color,
            rings: []
        });
        
        // Create multiple explosion rings
        for (let ring = 0; ring < 3; ring++) {
            this.explosions[this.explosions.length - 1].rings.push({
                radius: 0,
                maxRadius: 25 + ring * 15,
                delay: ring * 5
            });
        }
        
        // Enhanced explosion particles
        for (let i = 0; i < 25; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 80,
                maxLife: 80,
                color: i < 15 ? color : '#ffffff',
                size: Math.random() * 4 + 2
            });
        }
        
        // Screen shake for explosions
        this.shakeScreen(8, 20);
    }
    
    gameOver() {
        this.gameRunning = false;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }
    
    draw() {
        // Apply screen shake
        this.ctx.save();
        if (this.shakeAmount > 0) {
            const shakeX = (Math.random() - 0.5) * this.shakeAmount;
            const shakeY = (Math.random() - 0.5) * this.shakeAmount;
            this.ctx.translate(shakeX, shakeY);
        }
        
        // Clear canvas with enhanced gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#000033');
        gradient.addColorStop(0.3, '#000055');
        gradient.addColorStop(0.7, '#000077');
        gradient.addColorStop(1, '#000099');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw enhanced stars with twinkling
        this.stars.forEach(star => {
            this.ctx.globalAlpha = star.opacity * (0.5 + 0.5 * Math.sin(Date.now() * 0.005 + star.x));
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        this.ctx.globalAlpha = 1;
        
        if (!this.gameStarted) {
            this.drawStartScreen();
            this.ctx.restore();
            return;
        }
        
        // Draw player trail
        this.drawPlayerTrail();
        
        // Draw player
        this.drawPlayer();
        
        // Draw enhanced bullets
        this.bullets.forEach(bullet => {
            // Weapon-specific bullet rendering
            this.ctx.shadowColor = bullet.color;
            this.ctx.shadowBlur = bullet.weaponType === 'plasma' ? 15 : 10;
            this.ctx.fillStyle = bullet.color;
            
            if (bullet.weaponType === 'plasma') {
                // Plasma bullets are larger and pulsing
                const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
                const size = {
                    width: bullet.width * pulse,
                    height: bullet.height * pulse
                };
                this.ctx.fillRect(
                    bullet.x + (bullet.width - size.width) / 2,
                    bullet.y + (bullet.height - size.height) / 2,
                    size.width,
                    size.height
                );
                
                // Plasma core
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(
                    bullet.x + bullet.width * 0.25,
                    bullet.y + bullet.height * 0.25,
                    bullet.width * 0.5,
                    bullet.height * 0.5
                );
            } else {
                this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            }
            this.ctx.shadowBlur = 0;
            
            // Enhanced bullet trail
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = bullet.color;
            for (let i = 1; i <= 3; i++) {
                this.ctx.fillRect(bullet.x, bullet.y + bullet.height * i, bullet.width, bullet.height);
                this.ctx.globalAlpha *= 0.7;
            }
            this.ctx.globalAlpha = 1;
        });
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.drawEnemy(enemy);
        });
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => {
            this.drawPowerUp(powerUp);
        });
        
        // Draw enhanced particles
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = particle.color;
            const size = (particle.size || 3) * (0.5 + 0.5 * alpha);
            this.ctx.fillRect(particle.x - size/2, particle.y - size/2, size, size);
        });
        this.ctx.globalAlpha = 1;
        
        // Draw enhanced explosions
        this.explosions.forEach(explosion => {
            this.drawExplosion(explosion);
        });
        
        // Draw shield effect
        if (this.playerPowerUps.shield > 0) {
            this.drawShield();
        }
        
        this.ctx.restore();
    }
    
    drawStartScreen() {
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('AIRCRAFT GAME', this.width / 2, this.height / 2 - 50);
        
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText('Click or Press SPACE to Start!', this.width / 2, this.height / 2 + 20);
    }
    
    drawPlayer() {
        const player = this.player;
        
        // Flash effect when invulnerable
        if (player.invulnerable > 0 && Math.floor(player.invulnerable / 5) % 2) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Draw player aircraft with enhanced gradient
        const gradient = this.ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
        gradient.addColorStop(0, '#00ffff');
        gradient.addColorStop(0.3, '#0088ff');
        gradient.addColorStop(0.7, '#0044aa');
        gradient.addColorStop(1, '#002266');
        
        // Add glow effect
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = gradient;
        
        // Draw aircraft body
        this.ctx.fillRect(player.x + 15, player.y + 10, 10, 40);
        
        // Draw wings
        this.ctx.fillRect(player.x + 5, player.y + 20, 30, 15);
        
        // Draw cockpit
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(player.x + 17, player.y + 15, 6, 10);
        
        // Enhanced engine glow
        this.ctx.shadowColor = '#ff8800';
        this.ctx.shadowBlur = 20;
        this.ctx.fillStyle = '#ff8800';
        this.ctx.fillRect(player.x + 16, player.y + 50, 8, 10);
        this.ctx.shadowBlur = 0;
        
        // Enhanced thruster particles
        if (this.gameRunning) {
            for (let i = 0; i < 5; i++) {
                this.particles.push({
                    x: player.x + 18 + Math.random() * 4,
                    y: player.y + player.height,
                    vx: (Math.random() - 0.5) * 3,
                    vy: Math.random() * 4 + 3,
                    life: 25,
                    maxLife: 25,
                    color: `hsl(${20 + Math.random() * 40}, 100%, 70%)`,
                    size: Math.random() * 2 + 1
                });
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    drawPlayerTrail() {
        this.player.trail.forEach((point, index) => {
            const alpha = point.life / 20 * 0.3;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#00ffff';
            const size = 2 * alpha;
            this.ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
        });
        this.ctx.globalAlpha = 1;
    }
    
    drawPowerUp(powerUp) {
        const pulse = 0.8 + 0.2 * Math.sin(powerUp.pulse);
        const size = powerUp.width * pulse;
        
        // Glow effect
        this.ctx.shadowColor = powerUp.color;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = powerUp.color;
        this.ctx.fillRect(
            powerUp.x + (powerUp.width - size) / 2,
            powerUp.y + (powerUp.height - size) / 2,
            size,
            size
        );
        
        // Icon inside
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            powerUp.type.charAt(0).toUpperCase(),
            powerUp.x + powerUp.width / 2,
            powerUp.y + powerUp.height / 2 + 4
        );
    }
    
    drawShield() {
        const player = this.player;
        const time = Date.now() * 0.01;
        
        this.ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time);
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            player.width + 10,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    drawEnemy(enemy) {
        // Health bar
        const healthBarWidth = enemy.width;
        const healthBarHeight = 4;
        const healthPercent = enemy.health / enemy.maxHealth;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth, healthBarHeight);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth * healthPercent, healthBarHeight);
        
        // Enhanced enemy designs based on type
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const time = Date.now() * 0.01;
        
        // Enhanced glow effect
        this.ctx.shadowColor = enemy.color;
        this.ctx.shadowBlur = 15;
        
        if (enemy.type === 'basic') {
            // Basic enemy - triangular fighter
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, enemy.y);
            this.ctx.lineTo(enemy.x, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Wings
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(enemy.x + 5, enemy.y + enemy.height * 0.6, 5, 8);
            this.ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + enemy.height * 0.6, 5, 8);
            
            // Cockpit
            this.ctx.fillStyle = '#ffff00';
            this.ctx.beginPath();
            this.ctx.arc(centerX, enemy.y + enemy.height * 0.3, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
        } else if (enemy.type === 'heavy') {
            // Heavy enemy - bulky hexagonal design
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, enemy.y);
            this.ctx.lineTo(enemy.x + enemy.width * 0.8, enemy.y + enemy.height * 0.3);
            this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.7);
            this.ctx.lineTo(centerX, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.7);
            this.ctx.lineTo(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.3);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Armor plating
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.4, enemy.width * 0.6, 4);
            this.ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.6, enemy.width * 0.4, 3);
            
            // Thrusters with animation
            this.ctx.fillStyle = `hsl(${30 + Math.sin(time * 3) * 20}, 100%, 70%)`;
            this.ctx.fillRect(enemy.x + enemy.width * 0.1, enemy.y + enemy.height - 8, 6, 8);
            this.ctx.fillRect(enemy.x + enemy.width * 0.8, enemy.y + enemy.height - 8, 6, 8);
            
        } else if (enemy.type === 'fast') {
            // Fast enemy - sleek diamond design
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, enemy.y);
            this.ctx.lineTo(enemy.x + enemy.width * 0.7, centerY);
            this.ctx.lineTo(centerX, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x + enemy.width * 0.3, centerY);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Speed trails
            this.ctx.globalAlpha = 0.6;
            for (let i = 1; i <= 3; i++) {
                this.ctx.fillStyle = enemy.color;
                this.ctx.fillRect(enemy.x + enemy.width * 0.1, centerY - 2, enemy.width * 0.8 * (1 - i * 0.2), 4);
                this.ctx.globalAlpha *= 0.7;
            }
            this.ctx.globalAlpha = 1;
            
            // Pulsing core
            const pulseSize = 3 + Math.sin(time * 4) * 2;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
            this.ctx.fill();
            
        } else if (enemy.type === 'zigzag') {
            // Zigzag enemy - angular design with animated elements
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, enemy.y);
            this.ctx.lineTo(enemy.x + enemy.width * 0.8, enemy.y + enemy.height * 0.2);
            this.ctx.lineTo(enemy.x + enemy.width * 0.6, enemy.y + enemy.height * 0.4);
            this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.6);
            this.ctx.lineTo(enemy.x + enemy.width * 0.7, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x + enemy.width * 0.3, enemy.y + enemy.height);
            this.ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.6);
            this.ctx.lineTo(enemy.x + enemy.width * 0.4, enemy.y + enemy.height * 0.4);
            this.ctx.lineTo(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.2);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Animated zigzag pattern
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.globalAlpha = 0.8 + 0.2 * Math.sin(time * 2);
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.x + enemy.width * 0.2, enemy.y + enemy.height * 0.3);
            this.ctx.lineTo(enemy.x + enemy.width * 0.8, enemy.y + enemy.height * 0.5);
            this.ctx.lineTo(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.7);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
            
            // Side weapons
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillRect(enemy.x - 2, enemy.y + enemy.height * 0.4, 4, 8);
            this.ctx.fillRect(enemy.x + enemy.width - 2, enemy.y + enemy.height * 0.4, 4, 8);
        }
        
        // Enhanced thruster particles for all types
        if (Math.random() < 0.3) {
            for (let i = 0; i < 2; i++) {
                this.particles.push({
                    x: centerX + (Math.random() - 0.5) * enemy.width * 0.5,
                    y: enemy.y + enemy.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: Math.random() * 3 + 1,
                    life: 20,
                    maxLife: 20,
                    color: enemy.color,
                    size: Math.random() * 2 + 1
                });
            }
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    drawExplosion(explosion) {
        const progress = explosion.time / explosion.maxTime;
        
        // Draw multiple rings
        explosion.rings.forEach(ring => {
            if (explosion.time > ring.delay) {
                const ringProgress = (explosion.time - ring.delay) / (explosion.maxTime - ring.delay);
                ring.radius = ring.maxRadius * ringProgress;
                
                const alpha = 1 - ringProgress;
                this.ctx.globalAlpha = alpha;
                
                // Outer ring
                this.ctx.strokeStyle = explosion.color;
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, ring.radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Inner glow
                this.ctx.fillStyle = explosion.color;
                this.ctx.globalAlpha = alpha * 0.3;
                this.ctx.beginPath();
                this.ctx.arc(explosion.x, explosion.y, ring.radius * 0.7, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Central flash
        this.ctx.globalAlpha = Math.max(0, 1 - progress * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(explosion.x, explosion.y, 15 * (1 - progress), 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
    }
    
    update() {
        if (!this.gameRunning) return;
        
        this.handleInput();
        this.spawnEnemy();
        this.spawnPowerUp();
        this.updateBullets();
        this.updateEnemies();
        this.updatePowerUps();
        this.updateParticles();
        this.updateExplosions();
        this.updateStars();
        this.updatePlayerTrail();
        this.updatePowerUpTimers();
        this.checkCollisions();
        this.updateUI();
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new Game();
});
