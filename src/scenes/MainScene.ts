import Phaser from 'phaser';
import { Trash } from '../objects/Trash';
import { GameManager, type GadgetType, type ResourceType } from '../managers/GameManager';

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
    private vacuumGraphics!: Phaser.GameObjects.Graphics;

    // Gadget State
    private gadgetCooldown: number = 0;
    private overclockActive: boolean = false;


    private isDraggingDynamite: boolean = false;
    private dragVisual: Phaser.GameObjects.Image | null = null;
    private dragRange: Phaser.GameObjects.Arc | null = null;

    private overclockTimer: number = 0;

    private magnetActive: boolean = false;
    private magnetTimer: number = 0;

    private autoBotActive: boolean = false;
    private autoBotTimer: number = 0;

    // Facility State
    // Facility State
    private conveyorBelt: Phaser.GameObjects.Rectangle | null = null;
    private conveyorStripeGraphics: Phaser.GameObjects.Graphics | null = null;
    private conveyorStripeOffset: number = 0;

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

        // === NEW TRASH TEXTURES ===

        // Trash Battery (Yellow Cylinder)
        if (!this.textures.exists('trash-battery')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xf1c40f, 1); // Yellow
            g.fillRect(5, 0, 20, 45);
            // Terminal
            g.fillStyle(0x2c3e50, 1);
            g.fillRect(8, 0, 14, 5);
            g.fillRect(8, 40, 14, 5);
            // + Symbol
            g.fillStyle(0x000000, 1);
            g.fillRect(12, 15, 6, 2);
            g.fillRect(14, 13, 2, 6);
            g.generateTexture('trash-battery', 30, 45);
        }

        // Trash Medical (Red Bag with Plus)
        if (!this.textures.exists('trash-medical')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xe74c3c, 1); // Red
            g.fillRect(0, 0, 35, 35);
            g.lineStyle(2, 0xc0392b, 1);
            g.strokeRect(0, 0, 35, 35);
            // White Cross
            g.fillStyle(0xffffff, 1);
            g.fillRect(14, 8, 7, 19);
            g.fillRect(8, 14, 19, 7);
            g.generateTexture('trash-medical', 35, 35);
        }

        // Trash Nuclear (Green Barrel)
        if (!this.textures.exists('trash-nuclear')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x27ae60, 1); // Green
            g.fillCircle(22, 22, 22);
            g.lineStyle(3, 0x1e8449, 1);
            g.strokeCircle(22, 22, 22);
            // Radiation Symbol
            g.fillStyle(0xf1c40f, 1);
            g.beginPath();
            g.arc(22, 22, 8, 0, Math.PI * 2, false);
            g.closePath();
            g.fillPath();
            g.generateTexture('trash-nuclear', 44, 44);
        }

        // Trash Satellite (Silver Panel)
        if (!this.textures.exists('trash-satellite')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xbdc3c7, 1); // Silver
            g.fillRect(0, 5, 50, 20);
            // Solar Panels
            g.fillStyle(0x3498db, 1);
            g.fillRect(0, 0, 15, 30);
            g.fillRect(35, 0, 15, 30);
            // Grid lines
            g.lineStyle(1, 0x2980b9, 0.5);
            for (let i = 0; i < 5; i++) {
                g.moveTo(i * 3, 0); g.lineTo(i * 3, 30);
                g.moveTo(35 + i * 3, 0); g.lineTo(35 + i * 3, 30);
            }
            g.strokePath();
            g.generateTexture('trash-satellite', 50, 30);
        }

        // Trash Quantum (Purple Cube)
        if (!this.textures.exists('trash-quantum')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x9b59b6, 1); // Purple
            g.fillRect(0, 0, 25, 25);
            g.lineStyle(2, 0x8e44ad, 1);
            g.strokeRect(0, 0, 25, 25);
            // Glowing effect
            g.fillStyle(0x00ffff, 0.5);
            g.fillCircle(12, 12, 6);
            g.generateTexture('trash-quantum', 25, 25);
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

        // Chain Lightning
        if (!this.textures.exists('gadget-lightning')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Lightning bolt
            g.fillStyle(0x00ffff, 1); // Cyan
            g.beginPath();
            g.moveTo(30, 5); g.lineTo(15, 22); g.lineTo(25, 22);
            g.lineTo(10, 45); g.lineTo(35, 22); g.lineTo(25, 22);
            g.lineTo(35, 5);
            g.closePath();
            g.fillPath();
            // Glow
            g.fillStyle(0xffffff, 0.3);
            g.fillCircle(25, 25, 18);
            g.generateTexture('gadget-lightning', 50, 50);
        }

        // Gravity Lasso
        if (!this.textures.exists('gadget-lasso')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Spiral rope
            g.lineStyle(4, 0xff00ff, 1); // Purple
            g.beginPath();
            g.arc(25, 25, 18, 0, Math.PI * 1.5);
            g.strokePath();
            g.lineStyle(4, 0xff00ff, 0.7);
            g.beginPath();
            g.arc(25, 25, 12, Math.PI * 0.5, Math.PI * 2);
            g.strokePath();
            // Center
            g.fillStyle(0x9b59b6, 1);
            g.fillCircle(25, 25, 6);
            g.generateTexture('gadget-lasso', 50, 50);
        }

        // Quantum Sling
        if (!this.textures.exists('gadget-sling')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            // Slingshot Y shape
            g.lineStyle(5, 0x8b4513, 1); // Brown
            g.beginPath();
            g.moveTo(10, 10); g.lineTo(25, 30);
            g.moveTo(40, 10); g.lineTo(25, 30);
            g.moveTo(25, 30); g.lineTo(25, 45);
            g.strokePath();
            // Rubber band
            g.lineStyle(3, 0x9b59b6, 1);
            g.beginPath();
            g.moveTo(10, 10); g.lineTo(25, 20); g.lineTo(40, 10);
            g.strokePath();
            // Projectile
            g.fillStyle(0xe74c3c, 1);
            g.fillCircle(25, 18, 5);
            g.generateTexture('gadget-sling', 50, 50);
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
        this.createSideButtons();

        // Event listener for money updates
        this.events.on('update-money', this.updateUI, this);

        // Event listener for visuals
        this.events.on('trash-destroyed', this.onTrashDestroyed, this);

        // DRONE
        if (this.drone) {
            // Already setup in constructor/properties, but maybe init here?
        }

        // Listen for Resume to refresh UI (unlocks)
        this.events.on('resume', () => {
            this.checkForUnlocks();
        });
        this.drone = new Drone(this, width / 2, height / 2);

        // 4. Inventory Bar
        this.createInventoryBar();


    }

    update(_time: number, delta: number) {
        // Track Playtime
        GameManager.getInstance().playTime += delta;

        // Gadget Cooldown
        if (this.gadgetCooldown > 0) {
            this.gadgetCooldown -= delta;
        }

        const gm = GameManager.getInstance();

        // Facilities Check
        // 1. Gravity
        if (gm.gravityActive && gm.getUpgrade('gravity_manipulator')) {
            this.matter.world.setGravity(0, 0.5); // Reduced gravity (was 1.0)
        } else {
            this.matter.world.setGravity(0, 1.5); // Standard gravity (was 2.5) - slower
        }

        // 2. Conveyor Visibility
        if (gm.conveyorUnlocked && !this.conveyorBelt) {
            this.createConveyorBelt();
        }

        if (this.conveyorGraphics) {
            const conveyorOn = gm.conveyorActive && gm.conveyorUnlocked;
            this.conveyorGraphics.forEach(g => g.setVisible(conveyorOn));
        }

        // 3. Magnet (Facility) - Handled by Passive Logic (below) with flag check

        // 4. Black Hole Visibility
        if (this.blackHole) {
            this.blackHole.setVisible(gm.blackHoleActive);
            // Also enable/disable physics/update if needed, but setVisible handles the visual
            this.blackHole.setActive(gm.blackHoleActive);
        }
        // if (!this.magnetActive && gm.magnetActive && gm.getUpgrade('magnet_field')) {
        //     this.applyMagnetEffect(delta);
        // }

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
                    this.tweens.killTweensOf(this.superDrone);
                    this.superDrone.destroy();
                    this.superDrone = null;
                }
            }
        }

        // Dynamite Drag visuals & Vacuum Logic
        // const gm = GameManager.getInstance(); // Moved up

        // Financial Checks
        const finance = gm.update(delta);
        if (finance.interestPaid > 0) {
            new FloatingText(this, 200, 60, `+¥${Math.floor(finance.interestPaid)} (Interest)`, '#f1c40f');
        }
        if (finance.marketChanged) {
            const trend = gm.marketTrend === 'BULL' ? '↑' : (gm.marketTrend === 'BEAR' ? '↓' : '-');
            const color = gm.marketTrend === 'BULL' ? '#2ecc71' : (gm.marketTrend === 'BEAR' ? '#e74c3c' : '#ffffff');
            new FloatingText(this, 120, 100, `Market: ${trend} (${Math.floor(gm.marketMultiplier * 100)}%)`, color);
        }

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
            // Vacuum Logic (Right Click ONLY)
            const vacUp = gm.getUpgrade('vacuum_unlock');
            if (pointer.rightButtonDown() && vacUp && vacUp.level > 0) {
                this.handleVacuum(pointer);
            } else {
                if (this.vacuumGraphics) this.vacuumGraphics.clear();
            }
        }

        // Auto Press Logic (Throttled)
        this.checkAutoPress(delta);
        this.checkLaserGrid(delta);
        // this.updateFacilities(); // Obsolete

        if (this.drone) this.drone.update();
        if (this.superDrone) this.superDrone.update();
        if (this.blackHole) {
            this.blackHole.update(delta);
            this.updateBlackHoleButton(); // Keep button state in sync
        }

        // Passive Magnet Field (Upgrade) -> Now Facility Logic
        const magnetUp = gm.getUpgrade('magnet_field');
        if (magnetUp && magnetUp.level > 0 && !this.magnetActive && gm.magnetActive) {
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
        this.updateConveyorLogic(delta);

        // Nanobots
        this.checkNanobots(delta);
        // Auto Sorter
        // Auto Sorter
        this.checkAutoSorter(delta);
    }

    private updateConveyorLogic(delta: number) {
        const gm = GameManager.getInstance();
        if (!gm.conveyorUnlocked || !gm.conveyorActive) return;

        // 1. Scroll Visuals
        if (this.conveyorStripeGraphics) {
            this.conveyorStripeOffset += delta * 0.1; // Speed
            const { width } = this.scale;
            this.conveyorStripeGraphics.clear();
            this.conveyorStripeGraphics.lineStyle(2, 0x2c3e50, 1);
            for (let x = -30; x < width + 30; x += 30) {
                const drawX = x + (this.conveyorStripeOffset % 30);
                this.conveyorStripeGraphics.moveTo(drawX, 0);
                this.conveyorStripeGraphics.lineTo(drawX + 10, 40);
            }
            this.conveyorStripeGraphics.strokePath();
        }

        // 2. Apply Physical Force & Check Shipping
        const bodies = this.matter.world.getAllBodies();
        const { width, height } = this.scale;
        const beltY = height - 20;

        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const trash = b.gameObject as Trash;

                // Guaranteed Shipping Check: If on right edge area of the belt
                // Extended range slightly to ensure collection
                if (trash.x > width - 100 && trash.y > height - 120) {
                    this.shipTrash(trash);
                    return;
                }

                // Apply belt force
                if (Math.abs(trash.y - beltY) < 60) {
                    this.matter.body.applyForce(b, b.position, { x: 0.003, y: 0 }); // Constant push to right
                }
            }
        });
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
            }

            // Nuclear/Fusion Reactor (Passive Energy)
            // (Handled by gm.energyGeneration update in GameManager effect, so line 580 covers it)

            // Orbital Station, Moon Base, Mars Colony (Dark Matter)
            const orbital = gm.getUpgrade('orbital_station');
            const moon = gm.getUpgrade('moon_base');
            const mars = gm.getUpgrade('mars_colony');

            let darkMatterGen = 0;
            if (orbital && orbital.level > 0) darkMatterGen += orbital.level; // 1 per level
            if (moon && moon.level > 0) darkMatterGen += moon.level * 2; // 2 per level
            if (mars && mars.level > 0) darkMatterGen += mars.level * 10; // 10 per level

            if (darkMatterGen > 0) {
                // Quantum Core multiplier
                if (gm.getUpgrade('quantum_core')?.level ?? 0 > 0) darkMatterGen *= 2;
                gm.addResource('darkMatter', darkMatterGen);
            }

            // Time Machine (Recover Lost Trash - Randomized Resources)
            const timeMachine = gm.getUpgrade('time_machine');
            if (timeMachine && timeMachine.level > 0) {
                const amount = timeMachine.level;
                // Randomly gain basic resources
                if (Math.random() < 0.5) gm.addResource('plastic', amount);
                if (Math.random() < 0.3) gm.addResource('metal', amount);
                if (Math.random() < 0.1) gm.addResource('circuit', amount);
            }

            // Auto Miner
            const miner = gm.getUpgrade('auto_miner');
            if (miner && miner.level > 0) {
                let amount = miner.level; // 1 per level

                // Global Mining (Multiplier)
                const global = gm.getUpgrade('global_mining');
                if (global && global.level > 0) {
                    amount *= 2; // Simple 2x for now
                }
                // Quantum Core (Speed x2 -> Amount x2)
                if (gm.getUpgrade('quantum_core')?.level ?? 0 > 0) {
                    amount *= 2;
                }

                gm.addResource('plastic', amount);
                gm.addResource('metal', amount);
            }

            this.updateUI();

            // Auto Factory
            const factory = gm.getUpgrade('auto_factory');
            const shouldSell = gm.marketMultiplier >= (gm.autoSellThreshold || 0);

            if (factory && factory.level > 0 && shouldSell) {
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
                    const earnings = Math.floor(sold * gm.trashValue * 2 * gm.marketMultiplier);
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
        let radius = gm.vacuumRange * gm.vacuumRangePref;
        let force = gm.vacuumPower * 1.5 * gm.vacuumPowerPref; // Boosted force

        // Visual Feedback: Draw Range
        if (!this.vacuumGraphics) {
            this.vacuumGraphics = this.add.graphics();
            this.vacuumGraphics.setDepth(2000);
        }
        this.vacuumGraphics.clear();
        this.vacuumGraphics.lineStyle(2, 0x00ccff, 0.5);
        this.vacuumGraphics.strokeCircle(pointer.worldX, pointer.worldY, radius);
        this.vacuumGraphics.fillStyle(0x00ccff, 0.1);
        this.vacuumGraphics.fillCircle(pointer.worldX, pointer.worldY, radius);

        // Physics
        const bodies = this.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
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

        // Incinerator (Bio -> Energy)
        if (data.isCrit === false) { // Don't double dip signal?
            // Actually implementation detail: destroyTrash calls this.
            // We need to know the type. MainScene doesn't track type in onTrashDestroyed arg easily without extending.
            // Wait, this method receives `data: { x, y, amount, isCrit }`. It doesn't know the TYPE.
            // I need to change how onTrashDestroyed is called or simply checking type before emit.
            // Let's modify destroyTrash in Trash.ts instead?
            // Or better: Pass type in data.
        }
    }

    private createExplosion(x: number, y: number) {
        if (!GameManager.getInstance().settings.particles) return;

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
        let type: 'general' | 'plastic' | 'metal' | 'circuit' | 'bio' | 'battery' | 'medical' | 'nuclear' | 'satellite' | 'quantum' = 'general';

        const roll = Math.random();

        const metalUp = gm.getUpgrade('unlock_metal');
        const plasticUp = gm.getUpgrade('unlock_plastic');

        // New unlock conditions (mapped to existing high-tier upgrades)
        const circuitUp = gm.getUpgrade('unlock_circuit');
        const bioUp = gm.getUpgrade('unlock_bio');

        // NEW: Extended content unlocks
        const batteryUp = gm.getUpgrade('unlock_battery');
        const medicalUp = gm.getUpgrade('unlock_medical');
        const nuclearUp = gm.getUpgrade('unlock_nuclear');
        const satelliteUp = gm.getUpgrade('unlock_satellite');
        const quantumUp = gm.getUpgrade('unlock_quantum');

        const spawnVariety = gm.getUpgrade('spawn_variety');

        // Base rates
        const varietyBonus = spawnVariety ? spawnVariety.level * 0.05 : 0;

        // Space Debris Bonus
        const spaceDebris = gm.getUpgrade('space_debris');
        const debrisBonus = (spaceDebris && spaceDebris.level > 0) ? (spaceDebris.level * 0.05) : 0; // +5% per level

        // Probability Thresholds (High to Low rarity)
        // NEW: Quantum (rarest) - 1%
        const quantumChance = (quantumUp && quantumUp.level > 0) ? 0.01 : 0;

        // NEW: Satellite - 2% + Debris Bonus
        const satelliteChance = (satelliteUp && satelliteUp.level > 0) ? (0.02 + debrisBonus) : 0;

        // NEW: Nuclear - 3%
        const nuclearChance = (nuclearUp && nuclearUp.level > 0) ? 0.03 : 0;

        // NEW: Battery - 5%
        const batteryChance = (batteryUp && batteryUp.level > 0) ? 0.05 : 0;

        // NEW: Medical - 5%
        const medicalChance = (medicalUp && medicalUp.level > 0) ? 0.05 : 0;

        // Bio (Research Lab) - 5% + variety
        const bioChance = (bioUp && bioUp.level > 0) ? (0.05 + varietyBonus / 2) : 0;

        // Circuit (Industry) - 10% + variety
        const circuitChance = (circuitUp && circuitUp.level > 0) ? (0.10 + varietyBonus / 2) : 0;

        // Metal - 15% + variety
        const metalChance = (metalUp && metalUp.level > 0) ? (0.15 + varietyBonus) : 0;

        // Plastic - 25% + variety
        const plasticChance = (plasticUp && plasticUp.level > 0) ? (0.25 + varietyBonus) : 0;

        // Roll logic: check rarest first
        let threshold = 0;

        if (roll < (threshold += quantumChance)) {
            type = 'quantum';
            texture = 'trash-quantum';
        } else if (roll < (threshold += satelliteChance)) {
            type = 'satellite';
            texture = 'trash-satellite';
        } else if (roll < (threshold += nuclearChance)) {
            type = 'nuclear';
            texture = 'trash-nuclear';
        } else if (roll < (threshold += batteryChance)) {
            type = 'battery';
            texture = 'trash-battery';
        } else if (roll < (threshold += medicalChance)) {
            type = 'medical';
            texture = 'trash-medical';
        } else if (roll < (threshold += bioChance)) {
            type = 'bio';
            texture = 'trash-bio';
        } else if (roll < (threshold += circuitChance)) {
            type = 'circuit';
            texture = 'trash-circuit';
        } else if (roll < (threshold += metalChance)) {
            type = 'metal';
            texture = 'trash-metal';
        } else if (roll < (threshold += plasticChance)) {
            type = 'plastic';
            texture = 'trash-plastic';
        } else {
            type = 'general';
            texture = 'trash-box';
        }

        const trash = new Trash(this, x, y, texture, type);
        // Initial velocity for everything (Force start)
        trash.setVelocity(Phaser.Math.Between(-2, 2), Phaser.Math.Between(2, 5));

        // Gravity Manipulator
        const gravUp = gm.getUpgrade('gravity_manipulator');
        if (gravUp && gravUp.level > 0) {
            // Lower gravity scale or increase air friction
            // Lower gravity scale or increase air friction
            // REMOVED high friction to preserve inertia as requested. 
            // Global gravity toggle handles the slow-fall effect now.
            trash.setMass(0.5); // Lighter allows easier flinging without killing speed
            // trash.setFrictionAir(0.001); // Optional: slightly more than 0.0005 but not 0.05
            trash.setMass(0.5); // Lighter
            // Or use scale
            // (trash.body as MatterJS.BodyType).gravityScale = 0.5; // Phaser Matter wrapper might not expose gravityScale easily on body creation vs world.
            // setFrictionAir is good enough to simulate "Slow fall / easy stack".
        }

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
    // NEW: Extended resources
    private rareMetalTextRef!: Phaser.GameObjects.Text;
    private radioactiveTextRef!: Phaser.GameObjects.Text;
    private darkMatterTextRef!: Phaser.GameObjects.Text;
    private quantumCrystalTextRef!: Phaser.GameObjects.Text;

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

        // Main Panel: 320x530 (Extended for new resources)
        bg.fillRoundedRect(0, 0, 320, 530, 10);
        bg.strokeRoundedRect(0, 0, 320, 530, 10);

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
        // NEW: Extended resources
        this.rareMetalTextRef = createRow('レアメタル', '#3498db', '💎');
        this.radioactiveTextRef = createRow('放射性物質', '#27ae60', '☢️');
        this.darkMatterTextRef = createRow('ダークマター', '#9b59b6', '🌑');
        this.quantumCrystalTextRef = createRow('量子結晶', '#00ffff', '💠');

        this.hudContainer.setScrollFactor(0);
        this.hudContainer.setDepth(1000); // Ensure HUD is above trash


        this.updateUI();
    }


    private updateUI() {
        const gm = GameManager.getInstance();
        if (this.moneyTextRef) this.moneyTextRef.setText(`¥${gm.getMoney().toLocaleString()}`);
        if (this.plasticTextRef) this.plasticTextRef.setText(`${gm.plastic.toLocaleString()}`);
        if (this.metalTextRef) this.metalTextRef.setText(`${gm.metal.toLocaleString()}`);
        if (this.circuitTextRef) this.circuitTextRef.setText(`${gm.circuit.toLocaleString()}`);
        if (this.bioTextRef) this.bioTextRef.setText(`${gm.bioCell.toLocaleString()}`);
        if (this.energyTextRef) this.energyTextRef.setText(`${Math.floor(gm.energy)} / ${gm.maxEnergy}`);
        // NEW: Extended resources
        if (this.rareMetalTextRef) this.rareMetalTextRef.setText(`${gm.rareMetal.toLocaleString()}`);
        if (this.radioactiveTextRef) this.radioactiveTextRef.setText(`${gm.radioactive.toLocaleString()}`);
        if (this.darkMatterTextRef) this.darkMatterTextRef.setText(`${gm.darkMatter.toLocaleString()}`);
        if (this.quantumCrystalTextRef) this.quantumCrystalTextRef.setText(`${gm.quantumCrystal.toLocaleString()}`);

        const win = gm.getUpgrade('buy_planet');
        if (win && win.level > 0 && !this.victoryShown) {
            this.showVictoryToast(); // Changed to toast instead of permanent overlay
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
    private showVictoryToast() {
        this.victoryShown = true;
        const { width } = this.scale;

        // Create temporary toast notification instead of permanent overlay
        const container = this.add.container(width / 2, -100);
        const bg = this.add.rectangle(0, 0, 600, 100, 0x000000, 0.9).setStrokeStyle(3, 0xffd700);
        const text = this.add.text(0, 0, '🎉 地球買収 完了! ゲームは続きます', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '32px',
            color: '#ffd700',
            align: 'center',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setDepth(3000);

        // Slide in, hold, slide out
        this.tweens.add({
            targets: container,
            y: 100,
            duration: 500,
            ease: 'Back.out',
            hold: 4000,
            yoyo: true,
            onComplete: () => container.destroy()
        });
    }

    private blackHoleBg!: Phaser.GameObjects.Graphics;
    private blackHoleText!: Phaser.GameObjects.Text;







    private updateBlackHoleButton() {
        if (!this.blackHoleBg || !this.blackHoleText) return;

        const isActive = this.blackHole.isActive();
        const isUnstable = !this.blackHole.isStable();

        const btnWidth = 140; // Updated Width
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



    // UI Logic for Scene Resume
    private checkForUnlocks() {
        this.refreshSideButtons();
    }

    private sideButtons: Phaser.GameObjects.Text[] = [];

    private refreshSideButtons() {
        // Clear existing
        this.sideButtons.forEach(b => {
            if (b && b.active) b.destroy();
        });
        this.sideButtons = [];

        // Re-create all side buttons
        this.createSideButtons();
    }

    private createSideButtons() {
        let currentY = 20;
        const gap = 50;
        const x = 350;

        // 1. Skill Tree - Always there
        const btn = this.add.text(x, currentY, '設備強化 >', Theme.styles.buttonText)
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
        this.sideButtons.push(btn);
        currentY += gap;

        // 2. Achievement - Always there
        const achBtn = this.add.text(x, currentY, '実績リスト >', Theme.styles.buttonText)
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
        this.sideButtons.push(achBtn);
        currentY += gap;

        // 3. Settings - Always there
        const settingsBtn = this.add.text(x, currentY, '設定 >', Theme.styles.buttonText)
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
        this.sideButtons.push(settingsBtn);
        currentY += gap;

        // 4. Facilities Manager - Requested 4th
        const facilitiesBtn = this.add.text(x, currentY, '設備管理 >', Theme.styles.buttonText)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.pause();
                this.scene.launch('FacilitiesScene');
            });

        facilitiesBtn.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            facilitiesBtn.setColor(Theme.colors.accent);
        });
        facilitiesBtn.on('pointerout', () => facilitiesBtn.setColor(Theme.colors.text));
        this.sideButtons.push(facilitiesBtn);
        currentY += gap;

        const gm = GameManager.getInstance();

        // 5. Crafting - Requested 5th
        const craftingUp = gm.getUpgrade('unlock_crafting');
        if (craftingUp && craftingUp.level > 0) {
            const craftBtn = this.add.text(x, currentY, 'クラフト >', Theme.styles.buttonText)
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
            this.sideButtons.push(craftBtn);
            currentY += gap;
        }

        // 6. Refinery Scene - Requested 6th
        if (gm.conveyorUnlocked) {
            const refineryBtn = this.add.text(x, currentY, '処理施設へ >', Theme.styles.buttonText)
                .setInteractive({ useHandCursor: true })
                .setDepth(1000)
                .on('pointerdown', () => {
                    SoundManager.getInstance().play('click');
                    this.scene.pause();
                    this.scene.launch('RefineryScene');
                });

            refineryBtn.on('pointerover', () => {
                SoundManager.getInstance().play('hover');
                refineryBtn.setColor(Theme.colors.accent);
            });
            refineryBtn.on('pointerout', () => refineryBtn.setColor(Theme.colors.text));
            this.sideButtons.push(refineryBtn);
            currentY += gap;
        }

        // 7. Finance - Requested 7th
        const financeUp = gm.getUpgrade('compound_interest');
        if (financeUp && financeUp.level > 0) {
            const financeBtn = this.add.text(x, currentY, '資産運用 >', Theme.styles.buttonText)
                .setInteractive({ useHandCursor: true })
                .setDepth(1000)
                .on('pointerdown', () => {
                    SoundManager.getInstance().play('click');
                    this.scene.pause();
                    this.scene.launch('FinanceScene');
                });

            financeBtn.on('pointerover', () => {
                SoundManager.getInstance().play('hover');
                financeBtn.setColor(Theme.colors.accent);
            });
            financeBtn.on('pointerout', () => financeBtn.setColor(Theme.colors.text));
            this.sideButtons.push(financeBtn);
            currentY += gap;
        }
    }









    // Improved Press Logic
    // private autoPressTimer = 0;
    private laserTimer = 0;
    // private pressCooldown = 0;

    // Conveyor Graphics Reference
    private conveyorGraphics: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Shape)[] = [];

    private checkAutoPress(_delta: number) {
        // Removed
    }



    // === INVENTORY SYSTEM ===

    private checkLaserGrid(delta: number) {
        const gm = GameManager.getInstance();
        const laserUp = gm.getUpgrade('laser_grid');
        if (!laserUp || laserUp.level === 0) return;


        // Check if laser is enabled
        if (!gm.laserActive) return;

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

    private nanobotTimer: number = 0;
    private checkNanobots(delta: number) {
        const gm = GameManager.getInstance();
        const nano = gm.getUpgrade('nanobot_swarm');
        // Check active flag
        if (!nano || nano.level === 0 || !gm.nanobotsActive) return;

        this.nanobotTimer += delta;
        if (this.nanobotTimer > 2000 / nano.level) { // Faster with levels
            this.nanobotTimer = 0;
            const bodies = this.matter.world.getAllBodies();
            // Find one random trash
            const candidates: Trash[] = [];
            bodies.forEach((b: any) => {
                if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                    candidates.push(b.gameObject);
                }
            });

            if (candidates.length > 0) {
                const t = candidates[Math.floor(Math.random() * candidates.length)];
                t.destroyTrash();
                // Visual
                if (GameManager.getInstance().settings.particles) {
                    const e = this.add.particles(t.x, t.y, 'particle', {
                        tint: 0x00ff00, speed: 50, lifespan: 300, quantity: 5
                    });
                    this.time.delayedCall(300, () => e.destroy());
                }
            }
        }
    }

    private autoSorterTimer: number = 0;
    private checkAutoSorter(delta: number) {
        const gm = GameManager.getInstance();
        const sorter = gm.getUpgrade('auto_sorter');
        if (!sorter || sorter.level === 0) return;

        this.autoSorterTimer += delta;
        if (this.autoSorterTimer > 3000) { // Every 3s
            this.autoSorterTimer = 0;
            const bodies = this.matter.world.getAllBodies();
            // Find trash to sell (Plastic/Metal/Circuit only?)
            bodies.forEach((b: any) => {
                if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                    const t = b.gameObject as Trash;
                    if (['plastic', 'metal', 'circuit'].includes(t.trashType)) {
                        // 10% chance per tick to instant sell?
                        if (Math.random() < 0.3) {
                            t.isDestroyed = true; // Prevent internal logic
                            // Manual sell logic
                            // 1. Add resource
                            gm.addResource(t.trashType as ResourceType, 1);
                            // 2. Sell immediately? Auto Factory handles selling.
                            // "Instant Exchange" implementation:
                            // Actually, let's just destroy it and give MONEY directly, claiming it sorted & sold.
                            const val = gm.trashValue * gm.marketMultiplier * 1.5; // Bonus
                            gm.addMoney(val);

                            new FloatingText(this, t.x, t.y, `¥${Math.floor(val)}`, '#00d2d3');
                            t.destroy();
                        }
                    }
                }
            });
        }
    }
    private createConveyorBelt() {
        const gm = GameManager.getInstance();
        if (!gm.conveyorUnlocked) return;

        const { width, height } = this.scale;

        // 1. Belt Background
        this.conveyorBelt = this.add.rectangle(width / 2, height - 20, width, 40, 0x34495e).setOrigin(0.5);
        this.conveyorBelt.setDepth(5);

        // 2. Scrolling Stripes
        this.conveyorStripeGraphics = this.add.graphics({ x: 0, y: height - 40 });
        this.conveyorStripeGraphics.setDepth(6);

        // 3. Shipping Port Visual (A dark hatch at the right end)
        const hatchBg = this.add.rectangle(width - 40, height - 20, 80, 50, 0x1a1a1a).setDepth(7);
        const hatchFrame = this.add.graphics();
        hatchFrame.lineStyle(4, 0x00d2d3, 0.8);
        hatchFrame.strokeRect(width - 80, height - 45, 80, 50);
        hatchFrame.setDepth(8);

        // Track graphics for visibility toggling
        this.conveyorGraphics = [this.conveyorBelt, this.conveyorStripeGraphics, hatchBg, hatchFrame];

        // Apply initial state
        this.conveyorGraphics.forEach(g => g.setVisible(gm.conveyorActive));
    }
    private shipTrash(trash: Trash) {
        if (trash.isDestroyed) return;
        const gm = GameManager.getInstance();

        // Normalize type for capacity check
        let type = trash.trashType === 'bio' ? 'bioCell' : trash.trashType;
        if (trash.trashType === 'general') type = 'plastic';

        // Check Capacity per type (Buffer + Inventory)
        const isFull = gm.getTypeOccupancy(type) >= gm.refineryCapacity;

        if (isFull) {
            // "Discard" logic: play FX but don't add to buffer
            new FloatingText(this, trash.x, trash.y, "容量不足: 廃棄!", "#e74c3c");
        } else {
            gm.shippedTrashBuffer.push({ type, x: trash.x });
            new FloatingText(this, trash.x, trash.y, "SHIPPED!", "#00d2d3");
        }

        trash.isDestroyed = true; // Mark immediately

        // Animate suck into hatch
        this.tweens.add({
            targets: trash,
            x: this.scale.width - 20,
            y: this.scale.height - 20,
            scale: 0,
            alpha: 0,
            rotation: 5,
            duration: 250,
            onComplete: () => {
                trash.destroy();
            }
        });

        // Disable physics so it doesn't bounce or trigger more collisions
        this.matter.body.setStatic(trash.body as MatterJS.BodyType, true);
        trash.setVisible(true); // Ensure visible during tween
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
        // Move to Top-Right, below buttons (y=110 to avoid overlap)
        this.inventoryContainer = this.add.container(width - 40, 110);
        this.inventoryContainer.setDepth(2000);

        // Background (Vertical strip)
        const bg = this.add.rectangle(0, 240, 70, 590, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x555555);
        this.inventoryContainer.add(bg);

        // Slots
        const gadgets: { id: GadgetType, icon: string }[] = [
            { id: 'dynamite', icon: 'gadget-dynamite' },
            { id: 'magnet_bomb', icon: 'gadget-magnet' },
            { id: 'midas_gel', icon: 'gadget-midas' },
            { id: 'overclock', icon: 'gadget-overclock' },
            { id: 'auto_bot', icon: 'gadget-bot' },
            { id: 'chain_lightning', icon: 'gadget-lightning' },
            { id: 'gravity_lasso', icon: 'gadget-lasso' },
            { id: 'quantum_sling', icon: 'gadget-sling' }
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
        if (this.gadgetCooldown > 0) return;

        const gm = GameManager.getInstance();
        if (gm.getGadgetCount(type) <= 0) return;

        // Set cooldown (Quantum Swing needs more?)
        this.gadgetCooldown = 500;

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
            case 'chain_lightning':
                gm.useGadget(type);
                this.chainLightning();
                break;
            case 'gravity_lasso':
                gm.useGadget(type);
                this.activateGravityLasso();
                break;
            case 'quantum_sling':
                gm.useGadget(type);
                this.activateQuantumSling();
                break;
        }

        this.updateInventoryBar();
    }

    private explodeAt(x: number, y: number) {
        if (GameManager.getInstance().settings.screenShake) {
            this.cameras.main.shake(200, 0.02);
        }
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
        // Properly cleanup existing super drone before creating new one
        if (this.superDrone) {
            try {
                // Stop all tweens on this object
                this.tweens.killTweensOf(this.superDrone);
                this.superDrone.destroy();
            } catch (e) {
                // Ignore errors if already destroyed
            }
            this.superDrone = null;
        }

        this.autoBotActive = true;
        this.autoBotTimer = 30000;

        this.superDrone = new Drone(this, this.scale.width / 2, this.scale.height / 2);
        this.superDrone.setSpeedMultiplier(3.0); // Very fast

        // Safely tint the drone
        if (this.superDrone.list && this.superDrone.list[0]) {
            (this.superDrone.list[0] as Phaser.GameObjects.Sprite).setTint(0x00ffff);
        }

        new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "AUTO-BOT DEPLOYED!", "#00ffff");
    }
    // === CHAIN LIGHTNING ===
    // Recursive Branching Lightning
    private chainLightning() {
        const trashGroup = this.children.getAll().filter(child =>
            child instanceof Trash && !(child as Trash).isDestroyed
        ) as Trash[];

        if (trashGroup.length === 0) return;

        const startTrash = trashGroup[Math.floor(Math.random() * trashGroup.length)];
        const affected: Trash[] = [];
        const graphics = this.add.graphics().setDepth(5000);

        const branch = (source: { x: number, y: number }, depth: number, maxDepth: number) => {
            if (depth >= maxDepth) return;

            // Find nearest un-affected targets
            const targets = trashGroup
                .filter(t => !affected.includes(t) && !t.isDestroyed)
                .sort((a, b) => Phaser.Math.Distance.Between(source.x, source.y, a.x, a.y) -
                    Phaser.Math.Distance.Between(source.x, source.y, b.x, b.y))
                .slice(0, depth === 0 ? 3 : 2); // Branch factor

            targets.forEach(t => {
                affected.push(t);

                // Draw bolt
                graphics.lineStyle(6 - depth * 1.5, 0x00ffff, 1);
                graphics.beginPath();
                graphics.moveTo(source.x, source.y);
                graphics.lineTo(t.x, t.y);
                graphics.strokePath();

                // Recurse
                this.time.delayedCall(100, () => branch(t, depth + 1, maxDepth));

                // Destroy with shock effect
                this.time.delayedCall(200 + depth * 100, () => {
                    if (!t.isDestroyed) {
                        this.createExplosion(t.x, t.y);
                        t.destroyTrash(true);
                    }
                });
            });
        };

        branch({ x: startTrash.x, y: startTrash.y - 1000 }, 0, 3);

        if (GameManager.getInstance().settings.screenShake) {
            this.cameras.main.shake(300, 0.01);
        }
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 800,
            onComplete: () => graphics.destroy()
        });

        new FloatingText(this, startTrash.x, startTrash.y - 50, "⚡ ION STORM!", "#00ffff");
        SoundManager.getInstance().play('click');
    }

    // === GRAVITY LASSO ===
    // Sucks all on-screen trash to center and crunches
    private activateGravityLasso() {
        const trashGroup = this.children.getAll().filter(child =>
            child instanceof Trash && !(child as Trash).isDestroyed
        ) as Trash[];

        if (trashGroup.length === 0) return;

        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        const graphics = this.add.graphics().setDepth(5000);
        new FloatingText(this, centerX, centerY - 100, "🪢 EVENT HORIZON!", "#ff00ff");

        trashGroup.forEach(t => {
            if (t.isDestroyed) return;

            // Draw tether line
            graphics.lineStyle(2, 0xff00ff, 0.5);
            graphics.lineBetween(centerX, centerY, t.x, t.y);

            // Physics pull
            const angle = Phaser.Math.Angle.Between(t.x, t.y, centerX, centerY);
            t.setVelocity(Math.cos(angle) * 30, Math.sin(angle) * 30);

            // Delayed collapse
            this.time.delayedCall(1500, () => {
                if (!t.isDestroyed && Phaser.Math.Distance.Between(t.x, t.y, centerX, centerY) < 300) {
                    t.destroyTrash(true);
                }
            });
        });

        this.time.delayedCall(1500, () => {
            this.createExplosion(centerX, centerY);
            if (GameManager.getInstance().settings.screenShake) {
                this.cameras.main.shake(400, 0.03);
            }
            graphics.destroy();
        });

        SoundManager.getInstance().play('click');
    }

    // === QUANTUM SWING (Ex Sling) ===
    // Marks targets then collapses them in space
    private activateQuantumSling() {
        const trashGroup = this.children.getAll().filter(child =>
            child instanceof Trash && !(child as Trash).isDestroyed
        ) as Trash[];

        if (trashGroup.length === 0) return;

        const max = Math.min(15, trashGroup.length);
        const targets = Phaser.Utils.Array.Shuffle(trashGroup).slice(0, max);

        new FloatingText(this, this.scale.width / 2, this.scale.height / 2, "🌀 QUANTUM SWING!", "#a29bfe");

        targets.forEach((t, i) => {
            // Draw marker
            this.time.delayedCall(i * 50, () => {
                if (t.isDestroyed) return;
                const circle = this.add.circle(t.x, t.y, 40, 0x00d2d3, 0.3).setDepth(4999);
                this.tweens.add({
                    targets: circle,
                    scale: 1.5,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => circle.destroy()
                });
            });

            // Collapse after delay
            this.time.delayedCall(1200, () => {
                if (!t.isDestroyed) {
                    const rift = this.add.star(t.x, t.y, 5, 10, 30, 0x00d2d3).setDepth(5001);
                    this.tweens.add({
                        targets: rift,
                        rotation: Math.PI,
                        scale: 0,
                        duration: 300,
                        onComplete: () => {
                            rift.destroy();
                            t.destroyTrash(true);
                        }
                    });
                }
            });
        });

        if (GameManager.getInstance().settings.screenShake) {
            this.cameras.main.shake(200, 0.02);
        }
        SoundManager.getInstance().play('click');
    }
}
