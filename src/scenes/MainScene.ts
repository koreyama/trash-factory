import Phaser from 'phaser';
import { Trash } from '../objects/Trash';
import { GameManager, type GadgetType } from '../managers/GameManager';

import { FloatingText } from '../objects/FloatingText';
import { Theme } from '../managers/Theme';
import { SoundManager } from '../managers/SoundManager';
import { Drone } from '../objects/Drone';
import { BlackHole } from '../objects/BlackHole';

export class MainScene extends Phaser.Scene {
    // private moneyText!: Phaser.GameObjects.Text; // Replaced by new HUD Refs

    private drone!: Drone;
    private superDrone: Drone | null = null;
    private blackHole!: BlackHole;
    private blackHoleBtn!: Phaser.GameObjects.Container;

    // Gadget State
    private overclockActive: boolean = false;


    private isDraggingDynamite: boolean = false;
    private dragVisual: Phaser.GameObjects.Image | null = null;
    private dragRange: Phaser.GameObjects.Arc | null = null;

    private overclockTimer: number = 0;

    private magnetActive: boolean = false;
    private magnetTimer: number = 0;

    private autoBotActive: boolean = false;
    private autoBotTimer: number = 0;

    // Laser Grid State
    private laserGridEnabled: boolean = true;
    private laserBtn: Phaser.GameObjects.Container | null = null;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Generate a simple texture for the Trash box if not exists
        if (!this.textures.exists('trash-box')) {
            const graphics = this.make.graphics({ x: 0, y: 0 });
            graphics.fillStyle(0x8B4513, 1); // Brown (Cardboard)
            graphics.fillRect(0, 0, 40, 40);
            graphics.lineStyle(2, 0x654321, 1); // Darker brown border
            graphics.strokeRect(0, 0, 40, 40);
            graphics.generateTexture('trash-box', 40, 40);
        }

        // Trash Circle Texture
        if (!this.textures.exists('trash-circle')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xe67e22, 1); // Rust Orange
            g.fillCircle(20, 20, 20);
            g.lineStyle(2, 0xd35400, 1);
            g.strokeCircle(20, 20, 20);
            g.generateTexture('trash-circle', 40, 40);
        }

        // Texture for Press Plate
        if (!this.textures.exists('press-plate')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xc0392b, 1); // Industrial Red
            g.fillRect(0, 0, 100, 100);
            g.generateTexture('press-plate', 100, 100);
        }

        // Trash Plastic (Blue Bottle-ish)
        if (!this.textures.exists('trash-plastic')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x3498db, 1); // Blue
            g.fillRect(0, 0, 30, 50);
            g.lineStyle(2, 0x2980b9, 1);
            g.strokeRect(0, 0, 30, 50);
            g.generateTexture('trash-plastic', 30, 50);
        }

        // Trash Metal (Scrap)
        if (!this.textures.exists('trash-metal')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x95a5a6, 1); // Grey Metal
            g.fillTriangle(0, 40, 20, 0, 40, 40);
            g.lineStyle(2, 0x7f8c8d, 1);
            g.strokeTriangle(0, 40, 20, 0, 40, 40);
            g.generateTexture('trash-metal', 40, 40);
        }

        // Trash Circuit (E-Waste)
        if (!this.textures.exists('trash-circuit')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x2ecc71, 1); // Green Board
            g.fillRect(0, 0, 32, 32);
            g.lineStyle(2, 0x27ae60, 1);
            g.strokeRect(0, 0, 32, 32);
            // Draw some "circuit lines"
            g.lineStyle(1, 0xecf0f1, 0.8);
            g.beginPath();
            g.moveTo(5, 5); g.lineTo(25, 5); g.lineTo(25, 10);
            g.moveTo(5, 20); g.lineTo(15, 20); g.lineTo(15, 28);
            g.strokePath();
            g.generateTexture('trash-circuit', 32, 32);
        }

        // Trash Bio (Bio-Waste)
        if (!this.textures.exists('trash-bio')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x8e44ad, 1); // Purple
            g.fillCircle(18, 18, 18);
            g.lineStyle(2, 0x9b59b6, 1);
            g.strokeCircle(18, 18, 18);

            // Bubbles
            g.fillStyle(0x2ecc71, 0.8); // Toxic Green spots
            g.fillCircle(10, 10, 4);
            g.fillCircle(25, 20, 3);
            g.generateTexture('trash-bio', 36, 36);
        }

        // --- Gadget Textures ---

        // Dynamite
        if (!this.textures.exists('gadget-dynamite')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Sticks
            g.fillStyle(0xe74c3c, 1); // Red
            g.fillRect(10, 10, 10, 40);
            g.fillRect(22, 10, 10, 40);
            g.fillRect(34, 10, 10, 40);
            // Band
            g.fillStyle(0x2c3e50, 1);
            g.fillRect(8, 20, 38, 5);
            g.fillRect(8, 40, 38, 5);
            // Fuse
            g.lineStyle(2, 0xf1c40f, 1);
            g.beginPath();
            g.moveTo(27, 10); g.lineTo(27, 2); g.lineTo(35, 2);
            g.strokePath();
            g.generateTexture('gadget-dynamite', 54, 54);
        }

        // Magnet Bomb
        if (!this.textures.exists('gadget-magnet')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x95a5a6, 1); // Silver
            g.fillCircle(25, 25, 20);
            // U-shape
            g.lineStyle(8, 0xe74c3c, 1); // Red
            g.beginPath();
            g.arc(25, 25, 12, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(0), false);
            g.strokePath();
            g.lineStyle(8, 0xffffff, 1); // Tips
            g.beginPath();
            g.moveTo(13, 25); g.lineTo(13, 35);
            g.moveTo(37, 25); g.lineTo(37, 35);
            g.strokePath();
            g.generateTexture('gadget-magnet', 50, 50);
        }

        // Midas Gel
        if (!this.textures.exists('gadget-midas')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Pot
            g.fillStyle(0xf1c40f, 1); // Gold
            g.fillCircle(25, 30, 15);
            g.fillRect(15, 10, 20, 10);
            // Glint
            g.fillStyle(0xffffff, 0.8);
            g.fillCircle(30, 25, 4);
            g.generateTexture('gadget-midas', 50, 50);
        }

        // Overclock
        if (!this.textures.exists('gadget-overclock')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Chip
            g.fillStyle(0x34495e, 1);
            g.fillRect(10, 10, 30, 30);
            // Lightning
            g.fillStyle(0xf1c40f, 1);
            g.beginPath();
            g.moveTo(25, 5); g.lineTo(15, 25); g.lineTo(25, 25);
            g.lineTo(20, 45); g.lineTo(35, 20); g.lineTo(25, 20);
            g.closePath();
            g.fillPath();
            g.generateTexture('gadget-overclock', 50, 50);
        }

        // Auto Bot
        if (!this.textures.exists('gadget-bot')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Head
            g.fillStyle(0x3498db, 1); // Blue
            g.fillRoundedRect(10, 10, 30, 30, 5);
            // Eyes
            g.fillStyle(0x00ff00, 1); // Green
            g.fillRect(15, 20, 8, 8);
            g.fillRect(27, 20, 8, 8);
            // Antenna
            g.lineStyle(2, 0x95a5a6, 1);
            g.beginPath();
            g.moveTo(25, 10); g.lineTo(25, 0);
            g.strokePath();
            g.fillStyle(0xe74c3c, 1);
            g.fillCircle(25, 0, 3);
            g.generateTexture('gadget-bot', 50, 50);
        }

        // Particle
        if (!this.textures.exists('particle')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillRect(0, 0, 4, 4);
            g.generateTexture('particle', 4, 4);
        }
    }

    create() {
        // 0. Background - explicit grey background
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x9b9b9b).setDepth(-100);

        // 1. Scene Setup: Walls & Floor
        const wallThickness = 60; // Make them thick so fast objects don't tunnel

        // Floor
        this.matter.add.rectangle(width / 2, height + wallThickness / 2 - 20, width, wallThickness, { isStatic: true });

        // Left Wall
        this.matter.add.rectangle(0 - wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });

        // Right Wall
        this.matter.add.rectangle(width + wallThickness / 2, height / 2, wallThickness, height * 2, { isStatic: true });

        // 1.5 Black Hole (Center Background)
        this.blackHole = new BlackHole(this, width / 2, height / 2);
        this.blackHole.setDepth(-50); // Behind trash but in front of background




        // Sensor listeners removed - using periodic check instead for better stability

        // 2. Trash Spawner
        this.scheduleNextSpawn();

        // 3. UI Display
        this.createUI();
        this.createBlackHoleButton();
        this.createSkillTreeButton();

        // Event listener for money updates
        this.events.on('update-money', this.updateUI, this);

        // Event listener for visuals
        this.events.on('trash-destroyed', this.onTrashDestroyed, this);

        // DRONE
        this.drone = new Drone(this, width / 2, height / 2);

        // 4. Inventory Bar
        this.createInventoryBar();
    }

    update(_time: number, delta: number) {
        // Gadget Timers
        if (this.overclockActive) {
            this.overclockTimer -= delta;
            if (this.overclockTimer <= 0) {
                this.overclockActive = false;
                if (this.drone) this.drone.setSpeedMultiplier(1.0);
            } else {
                if (this.drone) this.drone.setSpeedMultiplier(2.0);
            }
        }

        if (this.magnetActive) {
            this.magnetTimer -= delta;
            this.applyMagnetEffect(delta);
            if (this.magnetTimer <= 0) {
                this.magnetActive = false;
            }
        }

        if (this.autoBotActive) {
            this.autoBotTimer -= delta;
            if (this.superDrone) this.superDrone.update();
            if (this.autoBotTimer <= 0) {
                this.autoBotActive = false;
                if (this.superDrone) {
                    this.superDrone.destroy();
                    this.superDrone = null;
                }
            }
        }

        // Dynamite Drag visuals & Vacuum Logic
        const gm = GameManager.getInstance();
        const pointer = this.input.activePointer;

        if (this.isDraggingDynamite) {
            if (this.dragVisual) {
                this.dragVisual.x = pointer.x;
                this.dragVisual.y = pointer.y;
            }
            if (this.dragRange) {
                this.dragRange.x = pointer.x;
                this.dragRange.y = pointer.y;
            }
        } else {
            // Vacuum Logic
            const vacUp = gm.getUpgrade('vacuum_unlock');
            if (pointer.isDown && vacUp && vacUp.level > 0) {
                this.handleVacuum(pointer);
            }
        }

        // Auto Press Logic (Throttled)
        this.checkAutoPress(delta);
        this.checkLaserGrid(delta);

        if (this.drone) this.drone.update();
        if (this.superDrone) this.superDrone.update();
        if (this.blackHole) this.blackHole.update(delta);

        // Passive Magnet Field (Upgrade)
        const magnetUp = gm.getUpgrade('magnet_field');
        if (magnetUp && magnetUp.level > 0 && !this.magnetActive) {
            // Apply weak force to METAL only
            const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
            this.matter.world.getAllBodies().forEach((b: any) => {
                if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                    const t = b.gameObject as Trash;
                    if (t.trashType === 'metal' || t.trashType === 'circuit') { // Magnet affects metal/circuit
                        const dist = Phaser.Math.Distance.Between(b.position.x, b.position.y, center.x, center.y);
                        if (dist < 400) { // Range check
                            const angle = Phaser.Math.Angle.Between(b.position.x, b.position.y, center.x, center.y);
                            this.matter.body.applyForce(b, b.position, {
                                x: Math.cos(angle) * 0.0005, // Weak force
                                y: Math.sin(angle) * 0.0005
                            });
                        }
                    }
                }
            });
        }
        this.handlePassiveIncome(delta);
    }

    private passiveTimer: number = 0;

    private handlePassiveIncome(delta: number) {
        this.passiveTimer += delta;
        if (this.passiveTimer >= 1000) { // Every 1 second
            this.passiveTimer = 0;
            const gm = GameManager.getInstance();

            // Energy Generation
            if (gm.energyGeneration > 0) {
                gm.addEnergy(gm.energyGeneration);
                this.updateUI();
            }

            // Auto Miner
            const miner = gm.getUpgrade('auto_miner');
            if (miner && miner.level > 0) {
                const amount = miner.level; // 1 per level
                gm.addResource('plastic', amount);
                gm.addResource('metal', amount);
                // Maybe show floating text? Too cluttered?
            }

            // Auto Factory
            const factory = gm.getUpgrade('auto_factory');
            if (factory && factory.level > 0) {
                // Sell 1 Plastic & 1 Metal per level
                const amount = factory.level;
                let sold = 0;

                if (gm.plastic >= amount) {
                    gm.addResource('plastic', -amount);
                    sold += amount;
                }
                if (gm.metal >= amount) {
                    gm.addResource('metal', -amount);
                    sold += amount;
                }

                if (sold > 0) {
                    // Bonus value for processed goods?
                    const earnings = sold * gm.trashValue * 2;
                    gm.addMoney(earnings);
                    this.updateUI(); // Ensure UI reflects passive income
                    this.checkAch(); // Check achievements
                }
            }
        }
    }

    private showAchievementToast(name: string) {
        const container = this.add.container(this.scale.width / 2, -50);
        const bg = this.add.rectangle(0, 0, 400, 60, 0xFFD700, 1).setStrokeStyle(2, 0xffffff);
        const text = this.add.text(0, 0, `実績解除: ${name}`, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setDepth(2000);

        this.tweens.add({
            targets: container,
            y: 80,
            duration: 500,
            ease: 'Back.out',
            hold: 2000,
            yoyo: true,
            onComplete: () => container.destroy()
        });
    }

    private checkAch() {
        const gm = GameManager.getInstance();
        const unlocked = gm.checkAchievements();
        if (unlocked) {
            this.showAchievementToast(unlocked);
        }
    }

    private handleVacuum(pointer: Phaser.Input.Pointer) {
        const gm = GameManager.getInstance();
        // Base stats from GM
        let radius = gm.vacuumRange;
        let force = gm.vacuumPower;

        // Visual Feedback (physics only for now)
        const bodies = this.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic) {
                const trash = b.gameObject;
                const dist = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, trash.x, trash.y);

                if (dist < radius) {
                    const angle = Phaser.Math.Angle.Between(trash.x, trash.y, pointer.worldX, pointer.worldY);

                    // Apply force towards mouse
                    this.matter.body.applyForce(b, b.position, {
                        x: Math.cos(angle) * force,
                        y: Math.sin(angle) * force
                    });
                }
            }
        });
    }

    private scheduleNextSpawn() {
        const gm = GameManager.getInstance();
        let delay = gm.spawnDelay;
        if (this.overclockActive) delay = Math.max(50, delay / 2);

        this.time.delayedCall(delay, () => {
            if (this.scene.isActive()) { // Safety check
                this.spawnTrash();
                this.scheduleNextSpawn();
            }
        });
    }

    private onTrashDestroyed(data: { x: number, y: number, amount: number, isCrit?: boolean }) {
        // Floating Text
        const color = data.isCrit ? '#ff0000' : '#ffffff';
        const gm = GameManager.getInstance();

        // Marketing Multiplier
        let finalAmount = data.amount;
        if (gm.marketingMultiplier > 1) {
            const bonus = Math.floor(data.amount * (gm.marketingMultiplier - 1));
            finalAmount += bonus;
        }

        SoundManager.getInstance().play('destroy');

        const text = data.isCrit ? `CRIT! +¥${finalAmount}` : `+¥${finalAmount}`;
        const scale = data.isCrit ? 1.5 : 1.0;

        new FloatingText(this, data.x, data.y, text, color).setScale(scale);
        this.createExplosion(data.x, data.y);

        this.checkAch();
    }

    private createExplosion(x: number, y: number) {
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            quantity: 10,
            blendMode: 'ADD'
        });

        this.time.delayedCall(500, () => {
            emitter.destroy();
        });
    }

    private spawnTrash() {
        const { width } = this.scale;
        const gm = GameManager.getInstance();

        // Check Capacity
        const currentTrashCount = this.getTrashCount();
        if (currentTrashCount >= gm.trashCapacity) {
            return; // Don't spawn if at capacity
        }

        const x = Phaser.Math.Between(100, width - 100);
        const y = -50;

        let texture = 'trash-box';
        let type: 'general' | 'plastic' | 'metal' | 'circuit' | 'bio' = 'general';

        const roll = Math.random();

        const metalUp = gm.getUpgrade('unlock_metal');
        const plasticUp = gm.getUpgrade('unlock_plastic');

        // New unlock conditions (mapped to existing high-tier upgrades)
        const circuitUp = gm.getUpgrade('unlock_circuit');
        const bioUp = gm.getUpgrade('unlock_bio');

        const spawnVariety = gm.getUpgrade('spawn_variety');

        // Base rates
        const varietyBonus = spawnVariety ? spawnVariety.level * 0.05 : 0;

        // Probability Thresholds (High to Low rarity)
        // Bio (Research Lab) - 5% + variety
        const bioChance = (bioUp && bioUp.level > 0) ? (0.05 + varietyBonus / 2) : 0;

        // Circuit (Industry) - 10% + variety
        const circuitChance = (circuitUp && circuitUp.level > 0) ? (0.10 + varietyBonus / 2) : 0;

        // Metal - 15% + variety
        const metalChance = (metalUp && metalUp.level > 0) ? (0.15 + varietyBonus) : 0;

        // Plastic - 25% + variety
        const plasticChance = (plasticUp && plasticUp.level > 0) ? (0.25 + varietyBonus) : 0;

        // Roll logic: check rarest first
        if (roll < bioChance) {
            type = 'bio';
            texture = 'trash-bio';
        } else if (roll < bioChance + circuitChance) {
            type = 'circuit';
            texture = 'trash-circuit';
        } else if (roll < bioChance + circuitChance + metalChance) {
            type = 'metal';
            texture = 'trash-metal';
        } else if (roll < bioChance + circuitChance + metalChance + plasticChance) {
            type = 'plastic';
            texture = 'trash-plastic';
        } else {
            type = 'general';
            texture = 'trash-box';
        }

        const trash = new Trash(this, x, y, texture, type);

        // Gold trash check (luck rate)
        if (gm.luckRate > 0 && Math.random() < gm.luckRate) {
            trash.setTint(0xFFD700); // Gold tint
            trash.setData('isGold', true);
        }

        // Rainbow trash check
        const rainbowUp = gm.getUpgrade('rainbow_trash');
        if (rainbowUp && rainbowUp.level > 0 && Math.random() < 0.01) {
            trash.setTint(0xFF00FF); // Rainbow-ish magenta
            trash.setData('isRainbow', true);
        }
    }

    private getTrashCount(): number {
        let count = 0;
        this.matter.world.getAllBodies().forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                count++;
            }
        });
        return count;
    }

    private createUI() {
        this.createHUD();
    }

    // UI Containers
    private hudContainer!: Phaser.GameObjects.Container;
    private moneyTextRef!: Phaser.GameObjects.Text;
    private plasticTextRef!: Phaser.GameObjects.Text;
    private metalTextRef!: Phaser.GameObjects.Text;
    private circuitTextRef!: Phaser.GameObjects.Text;
    private bioTextRef!: Phaser.GameObjects.Text;
    private energyTextRef!: Phaser.GameObjects.Text;

    private createHUD() {
        this.hudContainer = this.add.container(20, 20);

        // Update UI when returning from other scenes (Settings, SkillTree, etc.)
        this.events.on('resume', () => {
            this.updateUI();
        });

        // HUD Background Frame
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.lineStyle(2, Number(Theme.colors.accent.replace('#', '0x')), 1);

        // Main Panel: 320x330 (Tighter fit)
        bg.fillRoundedRect(0, 0, 320, 330, 10);
        bg.strokeRoundedRect(0, 0, 320, 330, 10);

        // Header Line
        bg.lineStyle(1, 0x555555);
        bg.beginPath();
        bg.moveTo(10, 40);
        bg.lineTo(310, 40);
        bg.strokePath();

        // Labels
        this.hudContainer.add(bg);

        // Resource List Container (Top Left)
        const startX = 20;
        let startY = 20;
        const gapY = 50; // Slightly tighter spacing (55 -> 50)

        // Helper to create resource row
        const createRow = (label: string, color: string, icon: string) => {
            // Icon/Label
            this.hudContainer.add(this.add.text(startX, startY, `${icon} ${label}`, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '16px',
                color: '#bdc3c7',
                fontStyle: 'bold'
            }));

            // Value - Right Aligned at 300 (Frame ends at 320)
            const valText = this.add.text(300, startY, '0', {
                fontFamily: '"Orbitron", monospace',
                fontSize: '20px',
                color: color
            }).setOrigin(1, 0);
            this.hudContainer.add(valText);

            startY += gapY;
            return valText;
        };

        this.moneyTextRef = createRow('資金', '#f1c40f', '¥');
        this.plasticTextRef = createRow('プラスチック', '#3498db', '♻️');
        this.metalTextRef = createRow('金属', '#95a5a6', '⚙️');
        this.circuitTextRef = createRow('電子基板', '#2ecc71', '🔌');
        this.bioTextRef = createRow('バイオ細胞', '#9b59b6', '🧬');
        this.energyTextRef = createRow('エネルギー', '#e67e22', '⚡');

        this.hudContainer.setScrollFactor(0);
        this.hudContainer.setDepth(1000); // Ensure HUD is above trash

        // Crafting Button (Gated)
        const gm = GameManager.getInstance();
        if (gm.getUpgrade('unlock_crafting')?.level ?? 0 > 0) {
            this.createCraftingButton();
        }

        this.updateUI();
    }

    private createCraftingButton() {
        if (this.craftButton) return; // Already created
        const { width } = this.scale;
        this.craftButton = this.add.container(width - 40, 160); // Below inventory

        // Button Graphics
        const bg = this.add.circle(0, 0, 25, 0x444444);
        bg.setInteractive({ useHandCursor: true });

        const icon = this.add.text(0, 0, '⚒️', { fontSize: '24px' }).setOrigin(0.5);

        this.craftButton.add([bg, icon]);
        this.craftButton.setDepth(2000);
        this.craftButton.setScrollFactor(0);

        bg.on('pointerdown', () => {
            this.scene.launch('CraftingScene');
            this.scene.pause();
        });
    }

    // Stubs to fix type errors if button logic was elsewhere
    private craftButton: Phaser.GameObjects.Container | undefined;


    private updateUI() {
        const gm = GameManager.getInstance();
        if (this.moneyTextRef) this.moneyTextRef.setText(`¥${gm.getMoney().toLocaleString()}`);
        if (this.plasticTextRef) this.plasticTextRef.setText(`${gm.plastic.toLocaleString()}`);
        if (this.metalTextRef) this.metalTextRef.setText(`${gm.metal.toLocaleString()}`);
        if (this.circuitTextRef) this.circuitTextRef.setText(`${gm.circuit.toLocaleString()}`);
        if (this.bioTextRef) this.bioTextRef.setText(`${gm.bioCell.toLocaleString()}`);
        if (this.energyTextRef) this.energyTextRef.setText(`${Math.floor(gm.energy)} / ${gm.maxEnergy}`);

        const win = gm.getUpgrade('buy_planet');
        if (win && win.level > 0 && !this.victoryShown) {
            this.showVictoryParams();
        }

        // Create inventory bar if crafting is unlocked but bar doesn't exist yet
        const craftingUp = gm.getUpgrade('unlock_crafting');
        if (craftingUp && craftingUp.level > 0 && !this.inventoryContainer) {
            this.createInventoryBar();
        }

        this.updateInventoryBar();

        if (this.blackHoleBtn) {
            const unlocked = gm.getUpgrade('black_hole_unlock');
            this.blackHoleBtn.setVisible(!!unlocked && unlocked.level > 0);
        }
    }

    private victoryShown = false;
    private showVictoryParams() {
        this.victoryShown = true;
        const { width, height } = this.scale;

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        const text = this.add.text(width / 2, height / 2, '地球買収 完了\n\nGame Cleared!', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '64px',
            color: '#ffd700',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            scale: { from: 0, to: 1 },
            duration: 1000,
            ease: 'Back.out'
        });
    }

    private blackHoleBg!: Phaser.GameObjects.Graphics;
    private blackHoleText!: Phaser.GameObjects.Text;

    private createBlackHoleButton() {
        const { width } = this.scale;
        // Position: Top Right, but lower than before to avoid overlap
        this.blackHoleBtn = this.add.container(width - 300, 60);

        const btnWidth = 150;
        const btnHeight = 40;
        const radius = 8;

        this.blackHoleBg = this.add.graphics();
        this.blackHoleBg.fillStyle(0x555555, 1); // Start as OFF (grey)
        this.blackHoleBg.fillRoundedRect(0, 0, btnWidth, btnHeight, radius);
        this.blackHoleBg.lineStyle(2, 0xffffff, 0.5);
        this.blackHoleBg.strokeRoundedRect(0, 0, btnWidth, btnHeight, radius);

        const hitArea = this.add.rectangle(btnWidth / 2, btnHeight / 2, btnWidth, btnHeight, 0x000000, 0);

        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
            SoundManager.getInstance().play('click');
            if (!this.blackHole.isStable()) {
                this.blackHole.triggerBigBang();
            } else {
                this.blackHole.toggle();
            }
            this.updateBlackHoleButton();
        });

        // Hover effect
        hitArea.on('pointerover', () => this.tweens.add({ targets: this.blackHoleBg, alpha: 0.8, duration: 100 }));
        hitArea.on('pointerout', () => this.tweens.add({ targets: this.blackHoleBg, alpha: 1.0, duration: 100 }));

        this.blackHoleText = this.add.text(btnWidth / 2, btnHeight / 2, 'B.HOLE OFF', {
            ...Theme.styles.buttonText,
            fontSize: '14px'
        });
        this.blackHoleText.setOrigin(0.5);

        this.blackHoleBtn.add([this.blackHoleBg, this.blackHoleText, hitArea]);
        this.blackHoleBtn.setDepth(1000);
        // Initial visibility check?
        const gm = GameManager.getInstance();
        if (!gm.getUpgrade('black_hole_unlock') || gm.getUpgrade('black_hole_unlock')?.level === 0) {
            this.blackHoleBtn.setVisible(false);
        }
    }

    private updateBlackHoleButton() {
        if (!this.blackHoleBg || !this.blackHoleText) return;

        const isActive = this.blackHole.isActive();
        const isUnstable = !this.blackHole.isStable();

        const btnWidth = 150;
        const btnHeight = 40;
        const radius = 8;

        this.blackHoleBg.clear();
        if (isUnstable) {
            this.blackHoleBg.fillStyle(0xff00ff, 1); // Magenta for unstable
            this.blackHoleText.setText('BIG BANG!');
        } else if (isActive) {
            this.blackHoleBg.fillStyle(0x8e44ad, 1); // Purple for ON
            this.blackHoleText.setText('B.HOLE ON');
        } else {
            this.blackHoleBg.fillStyle(0x555555, 1); // Grey for OFF
            this.blackHoleText.setText('B.HOLE OFF');
        }
        this.blackHoleBg.fillRoundedRect(0, 0, btnWidth, btnHeight, radius);
        this.blackHoleBg.lineStyle(2, 0xffffff, 0.5);
        this.blackHoleBg.strokeRoundedRect(0, 0, btnWidth, btnHeight, radius);
    }



    private createSkillTreeButton() {
        // Skill Tree
        const btn = this.add.text(350, 20, '設備強化 >', Theme.styles.buttonText)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.pause();
                this.scene.launch('SkillTreeScene');
            });

        btn.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            btn.setColor(Theme.colors.accent);
        });
        btn.on('pointerout', () => btn.setColor(Theme.colors.text));

        // Achievement Button
        const achBtn = this.add.text(350, 70, '実績リスト >', Theme.styles.buttonText)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.pause();
                this.scene.launch('AchievementScene');
            });

        achBtn.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            achBtn.setColor(Theme.colors.accent);
        });
        achBtn.on('pointerout', () => achBtn.setColor(Theme.colors.text));

        // Crafting Button
        const craftBtn = this.add.text(350, 120, 'クラフト >', Theme.styles.buttonText)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.pause();
                this.scene.launch('CraftingScene');
            });

        craftBtn.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            craftBtn.setColor(Theme.colors.accent);
        });
        craftBtn.on('pointerout', () => craftBtn.setColor(Theme.colors.text));

        // Settings Button
        const settingsBtn = this.add.text(350, 170, '設定 >', Theme.styles.buttonText)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.launch('SettingsScene', { caller: 'MainScene' });
                this.scene.pause();
            });

        settingsBtn.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            settingsBtn.setColor(Theme.colors.accent);
        });
        settingsBtn.on('pointerout', () => settingsBtn.setColor(Theme.colors.text));
    }









    // Improved Press Logic
    // private autoPressTimer = 0;
    private laserTimer = 0;
    // private pressCooldown = 0;

    private checkAutoPress(_delta: number) {
        // Removed
    }



    // === INVENTORY SYSTEM ===

    private checkLaserGrid(delta: number) {
        const gm = GameManager.getInstance();
        const laserUp = gm.getUpgrade('laser_grid');
        if (!laserUp || laserUp.level === 0) return;

        // Update laser button visibility
        this.updateLaserButton();

        // Check if laser is enabled
        if (!this.laserGridEnabled) return;

        this.laserTimer += delta;
        if (this.laserTimer < 300) return; // ~3.3Hz
        this.laserTimer = 0;

        const energyCost = 3;
        if (gm.energy < energyCost) return;

        // Horizontal penetrating laser from left to right at random Y
        const { width, height } = this.scale;
        const laserY = Phaser.Math.Between(height * 0.4, height * 0.85);

        // Find all trash that the laser passes through
        const bodies = this.matter.world.getAllBodies();
        const hitTrash: Trash[] = [];
        const laserThickness = 20; // How thick the laser "hitbox" is

        for (const b of bodies) {
            if ((b as any).gameObject && (b as any).gameObject instanceof Trash && !(b as any).gameObject.isDestroyed && !(b as any).isStatic) {
                const t = (b as any).gameObject as Trash;
                // Check if trash is within laser Y range
                if (Math.abs(t.y - laserY) < laserThickness + 20) {
                    hitTrash.push(t);
                }
            }
        }

        if (hitTrash.length === 0) return;

        // Consume energy
        gm.addEnergy(-energyCost);

        // Visual: Horizontal penetrating laser beam
        const line = this.add.line(0, 0, 0, laserY, width, laserY, 0xff0000).setOrigin(0);
        line.setLineWidth(4);
        line.setAlpha(0.8);

        // Glow effect
        const glow = this.add.line(0, 0, 0, laserY, width, laserY, 0xff6666).setOrigin(0);
        glow.setLineWidth(8);
        glow.setAlpha(0.3);

        this.tweens.add({
            targets: [line, glow],
            alpha: 0,
            duration: 150,
            onComplete: () => {
                line.destroy();
                glow.destroy();
            }
        });

        // Destroy all hit trash
        for (const t of hitTrash) {
            t.destroyTrash();
            new FloatingText(this, t.x, t.y, "ZAP!", "#ff0000");
        }
    }

    private updateLaserButton() {
        const gm = GameManager.getInstance();
        const laserUp = gm.getUpgrade('laser_grid');

        // Create button if unlocked but not yet created
        if (laserUp && laserUp.level > 0 && !this.laserBtn) {
            this.createLaserButton();
        }

        // Update visibility
        if (this.laserBtn) {
            this.laserBtn.setVisible(!!laserUp && laserUp.level > 0);
        }
    }

    private createLaserButton() {
        const { width } = this.scale;
        // Position next to black hole button
        this.laserBtn = this.add.container(width - 140, 60);

        const btnWidth = 120;
        const btnHeight = 40;
        const radius = 8;

        const bg = this.add.graphics();
        bg.fillStyle(this.laserGridEnabled ? 0xe74c3c : 0x555555, 1);
        bg.fillRoundedRect(0, 0, btnWidth, btnHeight, radius);
        bg.lineStyle(2, 0xffffff, 0.5);
        bg.strokeRoundedRect(0, 0, btnWidth, btnHeight, radius);

        const hitArea = this.add.rectangle(btnWidth / 2, btnHeight / 2, btnWidth, btnHeight, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });

        const text = this.add.text(btnWidth / 2, btnHeight / 2, this.laserGridEnabled ? 'LASER ON' : 'LASER OFF', {
            ...Theme.styles.buttonText,
            fontSize: '14px'
        }).setOrigin(0.5);

        hitArea.on('pointerdown', () => {
            SoundManager.getInstance().play('click');
            this.laserGridEnabled = !this.laserGridEnabled;

            // Update visuals
            bg.clear();
            bg.fillStyle(this.laserGridEnabled ? 0xe74c3c : 0x555555, 1);
            bg.fillRoundedRect(0, 0, btnWidth, btnHeight, radius);
            bg.lineStyle(2, 0xffffff, 0.5);
            bg.strokeRoundedRect(0, 0, btnWidth, btnHeight, radius);

            text.setText(this.laserGridEnabled ? 'LASER ON' : 'LASER OFF');
        });

        this.laserBtn.add([bg, text, hitArea]);
        this.laserBtn.setDepth(1000);
    }

    // === INVENTORY SYSTEM ===

    private inventoryContainer!: Phaser.GameObjects.Container;
    private inventorySlots: { [key in GadgetType]?: Phaser.GameObjects.Container } = {};

    private createInventoryBar() {
        // Gated by crafting unlock
        const gm = GameManager.getInstance();
        if ((gm.getUpgrade('unlock_crafting')?.level ?? 0) === 0) return;

        const { width } = this.scale;

        if (this.inventoryContainer) {
            this.inventoryContainer.destroy();
        }
        // Move to Top-Right
        this.inventoryContainer = this.add.container(width - 40, 60);
        this.inventoryContainer.setDepth(2000);

        // Background (Vertical strip)
        const bg = this.add.rectangle(0, 160, 70, 380, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x555555);
        this.inventoryContainer.add(bg);

        // Slots
        const gadgets: { id: GadgetType, icon: string }[] = [
            { id: 'dynamite', icon: 'gadget-dynamite' },
            { id: 'magnet_bomb', icon: 'gadget-magnet' },
            { id: 'midas_gel', icon: 'gadget-midas' },
            { id: 'overclock', icon: 'gadget-overclock' },
            { id: 'auto_bot', icon: 'gadget-bot' }
        ];

        const spacing = 70;
        // Start from top
        const startY = 20;

        gadgets.forEach((g, i) => {
            const y = startY + i * spacing;
            const slot = this.add.container(0, y);

            // Slot BG
            const slotBg = this.add.rectangle(0, 0, 60, 60, 0x222222, 1);
            slotBg.setStrokeStyle(1, 0x888888);

            // Icon (Image now)
            // const icon = this.add.text(0, -5, g.icon, { fontSize: '30px' }).setOrigin(0.5);
            const icon = this.add.image(0, 0, g.icon).setScale(0.8);

            // Count
            const countText = this.add.text(20, 20, '0', {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(1);

            // Click Handler
            slotBg.setInteractive({ useHandCursor: true });
            if (g.id === 'dynamite') {
                this.input.setDraggable(slotBg);
                slotBg.on('dragstart', () => {
                    // Visual feedback for dragging
                    this.isDraggingDynamite = true;

                    const ptr = this.input.activePointer;
                    // Create ghost icon
                    this.dragVisual = this.add.image(ptr.x, ptr.y, 'gadget-dynamite').setScale(0.8).setDepth(5000).setAlpha(0.8);

                    // Create range indicator
                    const gm = GameManager.getInstance();
                    this.dragRange = this.add.circle(ptr.x, ptr.y, gm.dynamiteRange, 0xff0000, 0.3).setDepth(4999);

                    this.events.emit('drag-dynamite-start', slotBg);
                });
                slotBg.on('drag', (_pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => {
                    // Handled in update loop to follow global pointer
                });
                slotBg.on('dragend', (pointer: Phaser.Input.Pointer) => {
                    this.isDraggingDynamite = false;
                    if (this.dragVisual) { this.dragVisual.destroy(); this.dragVisual = null; }
                    if (this.dragRange) { this.dragRange.destroy(); this.dragRange = null; }

                    // Check if dropped in world
                    this.useGadget('dynamite', pointer);
                });
            } else {
                slotBg.on('pointerdown', () => this.useGadget(g.id));
            }

            slot.add([slotBg, icon, countText]);
            this.inventoryContainer.add(slot);

            // Store ref (store entire container but we specifically need to update text)
            slot.setData('countText', countText);
            slot.setData('bg', slotBg);

            this.inventorySlots[g.id] = slot;
        });

        this.updateInventoryBar();
    }

    private updateInventoryBar() {
        const gm = GameManager.getInstance();

        for (const key in this.inventorySlots) {
            const type = key as GadgetType;
            const slot = this.inventorySlots[type];
            if (!slot) continue;

            const count = gm.getGadgetCount(type);
            const countText = slot.getData('countText') as Phaser.GameObjects.Text;
            const bg = slot.getData('bg') as Phaser.GameObjects.Rectangle;

            if (countText) countText.setText(count.toString());

            if (count > 0) {
                slot.setAlpha(1);
                bg.setInteractive();
            } else {
                slot.setAlpha(0.5);
                bg.disableInteractive();
            }
        }
    }

    private useGadget(type: GadgetType, pointer?: Phaser.Input.Pointer) {
        const gm = GameManager.getInstance();
        if (gm.getGadgetCount(type) <= 0) return;

        // Effect Logic
        switch (type) {
            case 'dynamite':
                // Require pointer for location
                if (!pointer) return;
                gm.useGadget(type);
                this.explodeAt(pointer.worldX, pointer.worldY);
                break;
            case 'magnet_bomb':
                gm.useGadget(type);
                this.magnetActive = true;
                this.magnetTimer = 5000;
                new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "GRAVITY WELL!", "#00ffff");
                break;
            case 'midas_gel':
                gm.useGadget(type);
                this.applyMidasEffect();
                break;
            case 'overclock':
                gm.useGadget(type);
                this.overclockActive = true;
                this.overclockTimer = 30000;
                new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "OVERCLOCK!", "#ffff00");
                break;
            case 'auto_bot':
                gm.useGadget(type);
                this.spawnSuperDrone();
                break;
        }

        this.updateInventoryBar();
    }

    private explodeAt(x: number, y: number) {
        this.cameras.main.shake(200, 0.02);
        this.createExplosion(x, y); // Visual

        // AoE Logic
        const gm = GameManager.getInstance();
        const range = gm.dynamiteRange; // Radius
        const bodies = this.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                const dist = Phaser.Math.Distance.Between(x, y, b.gameObject.x, b.gameObject.y);
                if (dist < range) {
                    b.gameObject.destroyTrash();
                    this.createExplosion(b.gameObject.x, b.gameObject.y); // Mini explosion
                }
            }
        });

        // sfx hint
        new FloatingText(this, x, y, "BOOM!", "#ff0000").setScale(1.5);
    }

    // private explodeAllTrash() {
    //     // Deprecated version, kept just in case or remove if unused.
    //     // Actually, let's remove it to avoid confusion or keep as fallback
    // }

    private applyMagnetEffect(delta: number) {
        const center = { x: this.scale.width / 2, y: this.scale.height / 2 };
        const force = 0.02 * (delta / 16); // Normalize force

        const bodies = this.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const angle = Phaser.Math.Angle.Between(b.position.x, b.position.y, center.x, center.y);
                this.matter.body.applyForce(b, b.position, {
                    x: Math.cos(angle) * force,
                    y: Math.sin(angle) * force
                });
            }
        });

        // Partice effect at center?
        if (Math.random() < 0.1) {
            this.createExplosion(center.x + Phaser.Math.Between(-50, 50), center.y + Phaser.Math.Between(-50, 50));
        }
    }

    private applyMidasEffect() {
        const bodies = this.matter.world.getAllBodies();
        let count = 0;
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                const t = b.gameObject as Trash;
                t.setTint(0xFFD700);
                t.setData('isGold', true);
                count++;
                // Sparkle effect
                this.createExplosion(t.x, t.y);
            }
        });

        new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "MIDAS TOUCH!", "#ffd700");
    }

    private spawnSuperDrone() {
        if (this.superDrone) this.superDrone.destroy();

        this.autoBotActive = true;
        this.autoBotTimer = 30000;

        this.superDrone = new Drone(this, this.scale.width / 2, this.scale.height / 2);
        this.superDrone.setSpeedMultiplier(3.0); // Very fast
        // Tint it to look differnet
        (this.superDrone.list[0] as Phaser.GameObjects.Sprite).setTint(0x00ffff);

        new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "AUTO-BOT DEPLOYED!", "#00ffff");
    }
}
