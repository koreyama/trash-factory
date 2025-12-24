import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';

export class RoguelikeScene extends Phaser.Scene {
    private player!: Phaser.Physics.Matter.Image;
    private cursors: any;
    private enemies: any[] = [];
    private trashItems: any[] = []; // ドロップしたゴミアイテム
    private currentAmmo: string = 'plastic';
    private ammoText!: Phaser.GameObjects.Text;
    private goldText!: Phaser.GameObjects.Text;

    // RPG Stats
    private hp: number = 100;
    private maxHp: number = 100;
    private stamina: number = 100;
    private maxStamina: number = 100;
    private staminaRegen: number = 25;
    private moveSpeed: number = 6;
    private rollSpeed: number = 15;
    private damageMult: number = 1.0;

    // Progression
    private kills: number = 0;
    private bossSpawned: boolean = false;
    private level: number = 1;
    private exp: number = 0;
    private expToNext: number = 100;
    private currentRoom: number = 1;

    // Combat Stats
    private lastAttackTime: number = 0;
    private attackInterval: number = 200; // 基本連射間隔

    // Upgradeable Stats
    private vacuumRange: number = 250;
    private vacuumForce: number = 0.0005;
    private droneFireRateMult: number = 1.0;
    private dropRateMult: number = 1.0;

    // States
    private isRolling: boolean = false;
    private isAttacking: boolean = false;
    private isVacuuming: boolean = false; // 吸引モード
    private canAction: boolean = true;
    private invulnerable: boolean = false;
    private gameOver: boolean = false;
    private isPaused: boolean = false;
    private isTransitioning: boolean = false;
    private walls: any[] = [];
    private obstacles: any[] = [];
    private gate: any = null;
    private isEnemySpawning: boolean = false;

    // Vacuum Specs
    private vacuumAngle: number = 0;
    private vacuumGraphics!: Phaser.GameObjects.Graphics;
    private tank = { plastic: 0, metal: 0, bio: 0, max: 100 }; // タンク容量
    private hpBar!: Phaser.GameObjects.Rectangle;
    private staminaBar!: Phaser.GameObjects.Rectangle;
    private expBar!: Phaser.GameObjects.Rectangle;
    private levelText!: Phaser.GameObjects.Text;
    private bossNameText!: Phaser.GameObjects.Text;
    private bossHpBar!: Phaser.GameObjects.Rectangle;
    private uiContainer!: Phaser.GameObjects.Container;
    private comboText!: Phaser.GameObjects.Text;
    private plasticText!: Phaser.GameObjects.Text;

    private metalText!: Phaser.GameObjects.Text;
    private bioText!: Phaser.GameObjects.Text;
    private plasticBar!: Phaser.GameObjects.Rectangle;
    private metalBar!: Phaser.GameObjects.Rectangle;
    private bioBar!: Phaser.GameObjects.Rectangle;

    private upgradeContainer!: Phaser.GameObjects.Container;
    private craftingUI!: Phaser.GameObjects.Container;
    private drones: any[] = [];
    private turrets: any[] = [];
    private keySpace!: Phaser.Input.Keyboard.Key;

    constructor() {
        super({ key: 'RoguelikeScene' });
    }

    init(data: any) {
        if (data && data.currentRoom) {
            // Restore state from previous room OR Stage Select defaults
            this.currentRoom = data.currentRoom;

            // If coming from Stage Select, these might be undefined. Use defaults.
            this.maxHp = data.maxHp || 100;
            this.hp = data.hp !== undefined ? data.hp : this.maxHp;

            this.maxStamina = data.maxStamina || 100;
            this.stamina = data.stamina !== undefined ? data.stamina : this.maxStamina;

            this.level = data.level || 1;
            this.exp = data.exp || 0;
            this.expToNext = data.expToNext || 100;
            this.kills = data.kills || 0;
            this.currentAmmo = data.currentAmmo || 'normal';
            this.damageMult = data.damageMult || 1.0;

            // Stats & Upgrades
            this.vacuumRange = data.vacuumRange || 250;
            this.vacuumForce = data.vacuumForce || 0.0005;
            this.droneFireRateMult = data.droneFireRateMult || 1.0;
            this.dropRateMult = data.dropRateMult || 1.0;
            this.tank = data.tank || { plastic: 0, metal: 0, bio: 0, max: 100 };

            // Flags
            (this as any).hasExplode = data.hasExplode || false;
            (this as any).hasLifesteal = data.hasLifesteal || false;
            (this as any).expMult = data.expMult || 1.0;
            // Cleanup sound on shutdown
            this.events.on('shutdown', () => {
                try { SoundManager.getInstance().stopLoop('player_vacuum'); } catch (e) { }
            });
            (this as any).startLevel = data.startLevel || 1;

            // Restore Tank (Ammo counts)
            if (data.tank) {
                this.tank = { ...this.tank, ...data.tank };
            }

            // ONLY call resetPlayerProgression if we are NOT in a room transition
            // Wait, actually, if it IS a room transition, we still want to recalculate base stats from GM
            // but we MUST NOT overwrite current session progress like HP or Level.
            this.applyMetaUpgrades(data.revivalCount);
            (this as any).skipReset = true;
        } else {
            (this as any).skipReset = false;
            // Full Run Reset
            this.resetPlayerProgression();
        }
    }

    // New helper to apply GM meta-stats without resetting run state
    applyMetaUpgrades(preservedRevival?: number) {
        const gm = GameManager.getInstance();
        const s = gm.rogueStats;

        // Base Stat Modifiers from Meta-Upgrades
        this.maxHp = 100 * (1.0 + s.maxHp * 0.1);
        this.staminaRegen = 25 * (1.0 + s.cooldown * 0.05);
        this.moveSpeed = 6 * (1.0 + s.moveSpeed * 0.05);
        this.damageMult = 1.0 + (s.might * 0.1);
        this.dropRateMult = 1.0 + (s.luck * 0.1);
        (this as any).expMult = 1.0 + (s.growth * 0.03);
        (this as any).armor = s.armor || 0;
        // Recovery (+0.1 HP/s per level)
        (this as any).recovery = (s.recovery || 0) * 0.1;

        // Cooldown Reduction for attack speed
        this.attackInterval = 200 * (1.0 - (s.cooldown || 0) * 0.05);

        // Area / Magnet
        const areaMult = 1.0 + (s.area * 0.1);
        this.vacuumRange = 250 * areaMult + (s.magnet * 50);

        // Speed (+10% Projectile Speed)
        (this as any).projectileSpeedMult = 1.0 + ((s.speed || 0) * 0.1);

        // Duration (+15% Duration)
        (this as any).durationMult = 1.0 + ((s.duration || 0) * 0.15);

        // Amount Bonus
        (this as any).amountBonus = s.amount || 0;

        // Revival
        if (preservedRevival !== undefined) {
            (this as any).revivalCount = preservedRevival;
        } else {
            (this as any).revivalCount = s.revival || 0;
        }

        console.log("Meta-Upgrades applied from GameManager:", s);
    }

    create() {
        const { width, height } = this.scale;

        try {
            this.resetSceneState();
            // ALWAYS call resetPlayerProgression if we are starting a room for the first time in a RUN
            // But if we are restarting scene (scene.restart), we might want to keep some stats.
            // Actually, resetPlayerProgression pulls from GameManager, which is what we want for run start.
            if (!(this as any).skipReset) {
                this.resetPlayerProgression();
            }

            // Setup World - NO BOUNDS (Enemies need to walk in)
            this.matter.world.setGravity(0, 0);

            // Background
            const startLevel = (this as any).startLevel || 1;
            const bgColors = [0x1e272e, 0x3e2723, 0x145a32, 0x4a235a, 0x641e16];
            const bgColor = bgColors[(startLevel - 1) % bgColors.length] || 0x1e272e;

            this.add.rectangle(0, 0, width, height, bgColor, 1).setOrigin(0);
            this.add.grid(width / 2, height / 2, width, height, 128, 128, undefined, undefined, 0x485460, 0.1);

            // Generate Textures
            this.generateTextures();

            // Player (Trash Box)
            this.player = this.matter.add.image(width / 2, height / 2, 'trash-box');
            this.player.setCircle(16);
            this.player.setFriction(0);
            this.player.setFrictionAir(0.1);
            this.player.setFixedRotation();
            (this.player.body as any).label = 'player';

            if (this.input.keyboard) {
                this.cursors = this.input.keyboard.createCursorKeys();
                this.input.keyboard.addKeys('W,A,S,D');
                this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            }

            this.vacuumGraphics = this.add.graphics({ fillStyle: { color: 0x00ffff, alpha: 0.2 } });
            this.vacuumGraphics.setDepth(5);

            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                if (this.isPaused) return;

                if (pointer.rightButtonDown()) {
                    // 右クリック: 吸引開始
                    this.isVacuuming = true;
                } else if (pointer.leftButtonDown()) {
                    // 左クリック: ショット（今は通常攻撃）
                    this.performAttack(pointer);
                }
            });

            this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
                if (pointer.rightButtonReleased()) {
                    // 右クリック離す: 吸引終了
                    this.isVacuuming = false;
                    this.vacuumGraphics.clear();
                }
            });

            this.input.keyboard?.on('keydown-Q', () => this.switchAmmo(-1));
            this.input.keyboard?.on('keydown-E', () => this.switchAmmo(1));
            this.input.keyboard?.on('keydown-ONE', () => this.performCraft('drone'));
            this.input.keyboard?.on('keydown-TWO', () => this.performCraft('turret'));
            this.input.keyboard?.on('keydown-THREE', () => this.performCraft('stimpack'));

            this.createHUD();

            // 初回ルーム生成
            this.setupArena();
            if (this.currentRoom % 10 === 0) {
                this.spawnBoss();
            } else {
                this.startRoom();
            }

            this.matter.world.on('collisionstart', (event: any) => {
                try {
                    event.pairs.forEach((pair: any) => {
                        this.handleCollision(pair.bodyA, pair.bodyB);
                    });
                } catch (e) { this.logError(e); }
            });


            // Close Button
            this.add.text(width - 50, 40, '✕', {
                fontSize: '40px', color: '#fff', fontStyle: 'bold'
            })
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.quitGame());



            // Disable context menu
            this.input.mouse?.disableContextMenu();

            // Spawn initial enemies only if NOT boss stage
            if (this.currentRoom % 10 !== 0) {
                this.spawnEnemy(true);
                this.spawnEnemy();
                this.spawnEnemy();
            }

        } catch (err: any) {
            this.logError(err);
        }
    }

    logError(err: any) {
        console.error(err);
        const str = `ERROR: ${err?.message || err}\n${err?.stack || ''}`.substring(0, 400);

        this.add.rectangle(0, 0, 1280, 720, 0x000000, 0.9).setOrigin(0).setScrollFactor(0).setDepth(9999);
        this.add.text(50, 50, str, {
            fontSize: '16px', color: '#ff0000', wordWrap: { width: 1100 }
        }).setScrollFactor(0).setDepth(10000);

        this.add.text(50, 600, 'Click to Exit', { fontSize: '24px', color: '#fff' })
            .setInteractive().on('pointerdown', () => this.quitGame())
            .setScrollFactor(0).setDepth(10000);

        this.isPaused = true;
    }

    generateTextures() {
        // Set World Bounds to prevent items from flying off
        const { width, height } = this.scale;
        this.matter.world.setBounds(0, 0, width, height);

        if (!this.textures.exists('trash-box')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x8B4513, 1);
            g.fillRect(0, 0, 40, 40);
            g.generateTexture('trash-box', 40, 40);
            g.destroy();
        }
        if (!this.textures.exists('trash-triangle')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xf1c40f, 1);
            g.fillTriangle(0, 40, 20, 0, 40, 40);
            g.generateTexture('trash-triangle', 40, 40);
            g.destroy();
        }
        if (!this.textures.exists('trash-plastic')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x3498db, 1);
            g.fillCircle(20, 20, 20);
            g.generateTexture('trash-plastic', 40, 40);
            g.destroy();
        }
        if (!this.textures.exists('trash-metal')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x95a5a6, 1);
            g.fillRect(10, 10, 20, 20);
            g.generateTexture('trash-metal', 40, 40);
            g.destroy();
        }
        if (!this.textures.exists('trash-bio')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0x2ecc71, 1);
            g.fillCircle(20, 20, 15);
            g.generateTexture('trash-bio', 40, 40);
            g.destroy();
        }
        if (!this.textures.exists('trash-gold')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xf1c40f, 1);
            g.fillCircle(20, 20, 12);
            g.lineStyle(4, 0xffeb3b); // Shine border
            g.strokeCircle(20, 20, 12);
            g.generateTexture('trash-gold', 40, 40);
            g.destroy();
        }
    }

    resetSceneState() {
        this.enemies = [];
        this.trashItems = [];
        this.drones = [];
        this.turrets = [];
        this.walls = [];
        this.obstacles = [];
        this.gate = null;
        this.gameOver = false;
        this.isPaused = false;
        this.isTransitioning = false;
        this.isEnemySpawning = false;
        this.bossSpawned = false;

        // Clear any existing physics bodies that might linger
        if (this.matter && this.matter.world) {
            // Matter.js world clear is handled by scene restart usually, 
            // but ensuring arrays are empty is critical.
        }
    }

    resetPlayerProgression() {
        this.applyMetaUpgrades();

        // RUN START INITIALIZATION
        this.hp = this.maxHp;
        this.stamina = this.maxStamina;
        this.level = 1;
        this.exp = 0;
        this.expToNext = 100;
        this.kills = 0;
        this.tank = { plastic: 0, metal: 0, bio: 0, max: 100 };
        this.currentAmmo = 'plastic';
        this.droneFireRateMult = 1.0;

        (this as any).hasExplode = false;
        (this as any).hasLifesteal = false;

        // Start regen timer if not exists
        if (!(this as any).regenTimer) {
            (this as any).regenTimer = this.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => {
                    const rec = (this as any).recovery || 0;
                    if (rec > 0 && this.hp < this.maxHp && !this.gameOver) {
                        this.hp = Math.min(this.hp + rec, this.maxHp);
                    }
                }
            });
        }
    }

    createHUD() {
        const { width, height } = this.scale;
        this.uiContainer = this.add.container(0, 0);

        const startX = 50;
        const startY = 40;

        this.levelText = this.add.text(startX, startY - 25, 'Lv.1', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#ffffff'
        }).setOrigin(0, 0.5);
        this.uiContainer.add(this.levelText);

        const roomInFloor = ((this.currentRoom - 1) % 10) + 1;
        const waveTxt = this.add.text(width / 2, startY - 25, `ROOM ${roomInFloor}/10`, {
            fontFamily: '"Orbitron", sans-serif', fontSize: '24px', color: '#f1c40f', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.uiContainer.add(waveTxt);
        (this as any).waveText = waveTxt;

        const expBg = this.add.rectangle(startX + 60, startY - 25, 180, 8, 0x222222).setOrigin(0, 0.5);
        this.expBar = this.add.rectangle(startX + 60, startY - 25, 0, 8, 0x9b59b6).setOrigin(0, 0.5);
        this.uiContainer.add([expBg, this.expBar]);

        this.add.text(startX, startY, 'HP', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '20px', color: '#e74c3c', fontStyle: 'bold'
        }).setOrigin(0, 0.5).addToDisplayList();
        this.add.rectangle(startX + 40, startY, 200, 16, 0x333333).setOrigin(0, 0.5).addToDisplayList();
        this.hpBar = this.add.rectangle(startX + 40, startY, 200, 16, 0xe74c3c).setOrigin(0, 0.5);
        this.uiContainer.add(this.hpBar);

        const stamY = startY + 25;
        this.add.text(startX, stamY, 'ST', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '20px', color: '#2ecc71', fontStyle: 'bold'
        }).setOrigin(0, 0.5).addToDisplayList();
        this.add.rectangle(startX + 40, stamY, 200, 16, 0x333333).setOrigin(0, 0.5).addToDisplayList();
        this.staminaBar = this.add.rectangle(startX + 40, stamY, 200, 16, 0x2ecc71).setOrigin(0, 0.5);
        this.uiContainer.add(this.staminaBar);

        // Ammo UI
        this.add.text(20, 620, 'AMMO:', { fontSize: '20px', color: '#ffffff' }).setScrollFactor(0).setDepth(100);
        this.ammoText = this.add.text(100, 620, 'PLASTIC', { fontSize: '24px', color: '#3498db', fontStyle: 'bold' }).setScrollFactor(0).setDepth(100);
        this.uiContainer.add(this.ammoText);

        // Gold UI
        const gm = GameManager.getInstance();
        this.add.text(20, 660, 'GOLD:', { fontSize: '20px', color: '#ffffff' }).setScrollFactor(0).setDepth(100);
        this.goldText = this.add.text(100, 660, `${gm.rogueGold}`, { fontSize: '24px', color: '#f1c40f', fontStyle: 'bold' }).setScrollFactor(0).setDepth(100);
        this.uiContainer.add(this.goldText);

        // Tank UI
        const tankY = height - 60;
        const barWidth = 100;
        const barHeight = 20;
        const gap = 150;
        const centerX = width / 2;

        // Plastic
        this.add.text(centerX - gap, tankY - 20, 'PLASTIC', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '14px', color: '#3498db'
        }).setOrigin(0.5).addToDisplayList();
        this.add.rectangle(centerX - gap, tankY, barWidth, barHeight, 0x333333).setOrigin(0.5).addToDisplayList();
        this.plasticBar = this.add.rectangle(centerX - gap - barWidth / 2, tankY - barHeight / 2, 0, barHeight, 0x3498db).setOrigin(0);
        this.plasticText = this.add.text(centerX - gap, tankY + 20, '0/100', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

        // Metal
        this.add.text(centerX, tankY - 20, 'METAL', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '14px', color: '#95a5a6'
        }).setOrigin(0.5).addToDisplayList();
        this.add.rectangle(centerX, tankY, barWidth, barHeight, 0x333333).setOrigin(0.5).addToDisplayList();
        this.metalBar = this.add.rectangle(centerX - barWidth / 2, tankY - barHeight / 2, 0, barHeight, 0x95a5a6).setOrigin(0);
        this.metalText = this.add.text(centerX, tankY + 20, '0/100', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

        // Bio
        this.add.text(centerX + gap, tankY - 20, 'BIO', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '14px', color: '#2ecc71'
        }).setOrigin(0.5).addToDisplayList();
        this.add.rectangle(centerX + gap, tankY, barWidth, barHeight, 0x333333).setOrigin(0.5).addToDisplayList();
        this.bioBar = this.add.rectangle(centerX + gap - barWidth / 2, tankY - barHeight / 2, 0, barHeight, 0x2ecc71).setOrigin(0);
        this.bioText = this.add.text(centerX + gap, tankY + 20, '0/100', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

        this.uiContainer.add([
            this.plasticBar, this.plasticText,
            this.metalBar, this.metalText,
            this.bioBar, this.bioText
        ]);

        this.comboText = this.add.text(width / 2, height / 2 - 100, '', {
            fontFamily: '"Orbitron", sans-serif', fontSize: '32px', color: '#f1c40f', fontStyle: 'italic', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);
        this.uiContainer.add(this.comboText);

        this.bossNameText = this.add.text(width / 2, 50, 'TRASH GOLEM', {
            fontSize: '24px', color: '#c0392b', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setVisible(false);
        this.bossHpBar = this.add.rectangle(width / 2, 80, 400, 20, 0xc0392b).setOrigin(0.5).setVisible(false);
        this.uiContainer.add([this.bossNameText, this.bossHpBar]);

        this.uiContainer.setScrollFactor(0).setDepth(100);
        this.updateResourceUI();

        this.upgradeContainer = this.add.container(0, 0).setDepth(200).setVisible(false);
        this.upgradeContainer.setScrollFactor(0);

        // Crafting UI
        this.createCraftingUI();
    }

    createCraftingUI() {
        const { width, height } = this.scale;
        // 右側に配置、サイズを大きく
        this.craftingUI = this.add.container(width - 300, height - 250).setScrollFactor(0).setDepth(100);

        const recipes = [
            { id: 'drone', name: 'DRONE', cost: { plastic: 30, metal: 10 }, key: '1' },
            { id: 'turret', name: 'TURRET', cost: { metal: 50 }, key: '2' },
            { id: 'stimpack', name: 'STIMPACK', cost: { bio: 20 }, key: '3' }
        ];

        recipes.forEach((r: any, i) => {
            const slot = this.add.container(0, i * 75); // 間隔を広げる

            const bg = this.add.rectangle(0, 0, 260, 65, 0x000000, 0.7)
                .setOrigin(0)
                .setStrokeStyle(2, 0x444444);

            const keyLabel = this.add.text(10, 10, `[${r.key}]`, {
                fontSize: '22px', color: '#f1c40f', fontStyle: 'bold'
            });

            const name = this.add.text(50, 10, r.name, {
                fontSize: '22px', color: '#ffffff', fontStyle: 'bold'
            });

            // コスト表示を動的に生成するためのテキスト
            let costStr = "";
            if (r.cost.plastic) costStr += `P:${r.cost.plastic} `;
            if (r.cost.metal) costStr += `M:${r.cost.metal} `;
            if (r.cost.bio) costStr += `B:${r.cost.bio} `;

            const costText = this.add.text(10, 38, costStr, {
                fontSize: '18px', color: '#aaaaaa'
            });

            slot.add([bg, keyLabel, name, costText]);
            this.craftingUI.add(slot);

            r.ui = { bg, keyLabel, name, costText };
        });

        (this as any).recipes = recipes;
    }

    updateResourceUI() {
        // Deprecated
    }

    updateGUI() {
        if (!this.hpBar || !this.staminaBar) return;

        const hpPct = Math.max(0, this.hp / this.maxHp);
        this.hpBar.width = 200 * hpPct;

        const stPct = Math.max(0, this.stamina / this.maxStamina);
        this.staminaBar.width = 200 * stPct;

        const expPct = Math.max(0, Math.min(1, this.exp / this.expToNext));
        this.expBar.width = 180 * expPct;
        this.levelText.setText(`Lv.${this.level}`);

        // Tank UI Update
        if (this.plasticBar) {
            const pPct = this.tank.plastic / this.tank.max;
            this.plasticBar.width = 100 * pPct;
            this.plasticText.setText(`${this.tank.plastic}/${this.tank.max}`);
        }
        if (this.metalBar) {
            const mPct = this.tank.metal / this.tank.max;
            this.metalBar.width = 100 * mPct;
            this.metalText.setText(`${this.tank.metal}/${this.tank.max}`);
        }
        if (this.bioBar) {
            const bPct = this.tank.bio / this.tank.max;
            this.bioBar.width = 100 * bPct;
            this.bioText.setText(`${this.tank.bio}/${this.tank.max}`);
        }

        // Ammo UI Update
        if (this.ammoText) {
            this.ammoText.setText(this.currentAmmo.toUpperCase());
            if (this.currentAmmo === 'plastic') this.ammoText.setColor('#3498db');
            else if (this.currentAmmo === 'metal') this.ammoText.setColor('#95a5a6');
            else if (this.currentAmmo === 'bio') this.ammoText.setColor('#2ecc71');
        }

        const boss = this.enemies.find(e => e.aiType === 'boss');
        if (boss && boss.sprite.active) {
            this.bossNameText.setVisible(true);
            this.bossHpBar.setVisible(true);
            const bossPct = Math.max(0, boss.hp / boss.maxHp);
            this.bossHpBar.width = 400 * bossPct;
        } else {
            this.bossNameText.setVisible(false);
            this.bossHpBar.setVisible(false);
        }

        // Crafting UI Real-time update
        const recipes = (this as any).recipes;
        if (recipes) {
            recipes.forEach((r: any) => {
                const canAfford =
                    (!r.cost.plastic || this.tank.plastic >= r.cost.plastic) &&
                    (!r.cost.metal || this.tank.metal >= r.cost.metal) &&
                    (!r.cost.bio || this.tank.bio >= r.cost.bio);

                if (r.ui) {
                    r.ui.bg.setStrokeStyle(2, canAfford ? 0x00ff00 : 0x444444);
                    r.ui.bg.setFillStyle(0x000000, canAfford ? 0.8 : 0.5);
                    r.ui.name.setColor(canAfford ? '#ffffff' : '#666666');
                    r.ui.keyLabel.setColor(canAfford ? '#f1c40f' : '#666666');
                }
            });
        }
    }

    update(time: number, delta: number) {
        try {
            this.updateTrashBounds(delta); // Keep items on screen
            if (this.gameOver || this.isPaused) return;

            this.updateDrones(time);
            this.updateTurrets(time);

            if (!this.player || !this.player.body) return;

            this.player.setAwake();

            const { width, height } = this.scale;
            if (this.player.x < 16) this.player.setPosition(16, this.player.y);
            if (this.player.x > width - 16) this.player.setPosition(width - 16, this.player.y);
            if (this.player.y < 16) this.player.setPosition(this.player.x, 16);
            if (this.player.y > height - 16) this.player.setPosition(this.player.x, height - 16);

            if (!this.isRolling && !this.isAttacking && this.stamina < this.maxStamina) {
                this.stamina += (this.staminaRegen * delta) / 1000;
                if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
            }

            // 吸引処理
            if (this.isVacuuming) {
                // Play persistent vacuum loop
                try { SoundManager.getInstance().startLoop('player_vacuum', 'vacuum'); } catch (e) { }

                const pointer = this.input.activePointer;
                this.vacuumAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);

                // 吸引エフェクト描画
                this.vacuumGraphics.clear();
                this.vacuumGraphics.slice(this.player.x, this.player.y, this.vacuumRange, this.vacuumAngle - 0.5, this.vacuumAngle + 0.5, false);
                this.vacuumGraphics.fillPath();

                // ゴミアイテムの引き寄せ計算
                this.trashItems.forEach(trash => {
                    const sprite = trash.sprite;
                    if (sprite && sprite.active && sprite.body) {
                        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, sprite.x, sprite.y);

                        // 範囲内かチェック
                        if (dist < this.vacuumRange) {
                            const angleToTrash = Phaser.Math.Angle.Between(this.player.x, this.player.y, sprite.x, sprite.y);
                            let diff = angleToTrash - this.vacuumAngle;
                            while (diff > Math.PI) diff -= Math.PI * 2;
                            while (diff < -Math.PI) diff += Math.PI * 2;

                            if (Math.abs(diff) < 0.6) { // 扇形の中
                                // 引き寄せ力
                                const force = (150 / (dist + 10)) * this.vacuumForce;
                                const fx = Math.cos(angleToTrash + Math.PI) * force;
                                const fy = Math.sin(angleToTrash + Math.PI) * force;

                                sprite.applyForce({ x: fx, y: fy });

                                // 吸い込み成功判定
                                if (dist < 50) {
                                    this.suckTrash(trash);
                                }
                            }
                        }
                    }
                });
            } else {
                this.vacuumGraphics.clear();
                try { SoundManager.getInstance().stopLoop('player_vacuum'); } catch (e) { }
            }

            // リジェネ効果 (applyMetaUpgradesで定義されたrecovery)
            const rec = (this as any).recovery || 0;
            if (rec > 0 && this.hp < this.maxHp && !this.gameOver) {
                this.hp = Math.min(this.hp + (rec * delta) / 1000, this.maxHp);
            }

            // 磁力効果（敵を引き寄せ）
            if ((this as any).hasMagnet) {
                this.enemies.forEach(item => {
                    if (item.sprite && item.sprite.active) {
                        const dist = Phaser.Math.Distance.Between(
                            item.sprite.x, item.sprite.y, this.player.x, this.player.y
                        );
                        if (dist < 300 && dist > 50) {
                            const angle = Phaser.Math.Angle.Between(
                                item.sprite.x, item.sprite.y, this.player.x, this.player.y
                            );
                            item.sprite.x += Math.cos(angle) * 0.5;
                            item.sprite.y += Math.sin(angle) * 0.5;
                        }
                    }
                });
            }

            if (this.isRolling) {
            } else if (this.isAttacking) {
            } else {
                this.handleInput(delta);

                // Continuous Fire Logic
                const pointer = this.input.activePointer;
                if (pointer.leftButtonDown()) {
                    this.performAttack(pointer);
                }
            }

            this.updateEnemies(time, delta);

            // ルーム管理
            if (!this.bossSpawned) {
                if (this.enemies.length === 0 && !this.isTransitioning && !this.isEnemySpawning) {
                    this.completeRoom();
                }
            } else {
                // ボス戦中、ボスを倒したらクリア (ボス戦開始時もisEnemySpawningで保護可能)
                const boss = this.enemies.find(e => e.aiType === 'boss');
                if (!boss && !this.isTransitioning && !this.isEnemySpawning) {
                    this.completeRoom();
                }
            }

            this.updateGUI();

            if (this.hp <= 0) {
                try { SoundManager.getInstance().stopLoop('player_vacuum'); } catch (e) { }
                const riv = (this as any).revivalCount || 0;
                if (riv > 0) {
                    (this as any).revivalCount = riv - 1;
                    this.hp = this.maxHp * 0.5; // 50% HP Restoration
                    this.invulnerable = true;
                    this.player.setTint(0xffffff);
                    this.cameras.main.flash(500, 255, 255, 255);
                    this.time.delayedCall(2000, () => {
                        this.invulnerable = false;
                        if (this.player && this.player.active) this.player.clearTint();
                    });
                    console.log(`Revived! Remaining: ${(this as any).revivalCount}`);
                } else {
                    this.gameOverSequence(false);
                }
            }
        } catch (e) {
            this.logError(e);
        }
    }

    handleInput(_delta: number) {
        if (!this.canAction) return;

        let vx = 0;
        let vy = 0;
        if (!this.input.keyboard) return;
        const keys = this.input.keyboard.addKeys('W,A,S,D') as any;

        const left = this.cursors.left.isDown || keys.A.isDown;
        const right = this.cursors.right.isDown || keys.D.isDown;
        const up = this.cursors.up.isDown || keys.W.isDown;
        const down = this.cursors.down.isDown || keys.S.isDown;

        if (left) vx = -1;
        else if (right) vx = 1;
        if (up) vy = -1;
        else if (down) vy = 1;

        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            if (this.stamina >= 20) {
                this.performRoll(vx, vy);
                return;
            } else {
                this.cameras.main.shake(50, 0.005);
            }
        }

        if (vx !== 0 || vy !== 0) {
            const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(this.moveSpeed);
            this.player.setVelocity(vec.x, vec.y);
        } else {
            this.player.setVelocity(0, 0);
        }
    }

    performRoll(vx: number, vy: number) {
        this.isRolling = true;
        this.canAction = false;
        this.invulnerable = true;
        this.stamina -= 20;

        if (vx === 0 && vy === 0) {
            const pointer = this.input.activePointer;
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
            vx = Math.cos(angle);
            vy = Math.sin(angle);
        }

        const vec = new Phaser.Math.Vector2(vx, vy).normalize().scale(this.rollSpeed);
        this.player.setVelocity(vec.x, vec.y);
        this.player.setTint(0x888888);

        this.time.delayedCall(300, () => {
            if (!this.scene.isActive()) return;
            this.isRolling = false;
            this.canAction = true;
            this.invulnerable = false;
            if (this.player && this.player.body) {
                this.player.clearTint();
                this.player.setVelocity(0, 0);
            }
        });
    }

    performAttack(pointer: Phaser.Input.Pointer) {
        if (!this.canAction) return;

        // 攻撃間隔チェック
        const now = this.time.now;
        if (now - this.lastAttackTime < this.attackInterval) return;
        this.lastAttackTime = now;

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);

        let bulletType = 'none';

        if (this.currentAmmo === 'plastic' && (this.tank as any).plastic > 0) {
            bulletType = 'plastic';
            (this.tank as any).plastic--;
        } else if (this.currentAmmo === 'metal' && (this.tank as any).metal > 0) {
            bulletType = 'metal';
            (this.tank as any).metal--;
        } else if (this.currentAmmo === 'bio' && (this.tank as any).bio > 0) {
            bulletType = 'bio';
            (this.tank as any).bio--;
        }

        if (bulletType !== 'none') {
            const bonus = (this as any).amountBonus || 0;
            const count = 1 + bonus;

            for (let i = 0; i < count; i++) {
                // 発射段数（Amount）に応じた扇状の射撃
                const offset = (i - (count - 1) / 2) * 0.2; // 0.2 rad spread
                this.fireBullet(bulletType, angle + offset);
            }
        } else {
            this.performMeleeAttack(angle);
        }
    }

    fireBullet(type: string, angle: number, startX: number = this.player.x, startY: number = this.player.y) {
        const speedMult = (this as any).projectileSpeedMult || 1.0;
        const durationMult = (this as any).durationMult || 1.0;

        let speed = 15 * speedMult;
        let damage = 20 * this.damageMult;
        let color = 0xffffff;
        let size = 10;
        let range = 1000 * durationMult;

        if (type === 'plastic') {
            speed = 18;
            damage = 15 * this.damageMult;
            color = 0x3498db;
            size = 8;
        } else if (type === 'metal') {
            speed = 12;
            damage = 40 * this.damageMult;
            color = 0x95a5a6;
            size = 12;
        } else if (type === 'bio') {
            speed = 14 * speedMult;
            damage = 25 * this.damageMult; // Increased slightly for utility
            color = 0x2ecc71;
            size = 10;
        }

        const bullet = this.matter.add.circle(startX, startY, size, { isSensor: true, label: 'player_attack' });
        (bullet as any).attackData = {
            damage: damage,
            knockback: type === 'metal' ? 2 : 5,
            type: type,
            isPiercing: type === 'metal',
            isLifesteal: type === 'bio'
        };

        const visual = this.add.circle(startX, startY, size, color);
        (bullet as any).gameObject = visual;

        bullet.friction = 0;
        bullet.frictionAir = 0;
        this.matter.body.setVelocity(bullet as any, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });

        this.tweens.add({
            targets: visual,
            x: visual.x + Math.cos(angle) * range, // 簡易計算
            y: visual.y + Math.sin(angle) * range,
            duration: (range / speed) * 16.6,
            onUpdate: () => {
                this.matter.body.setPosition(bullet as any, { x: visual.x, y: visual.y });
            },
            onComplete: () => {
                if (visual.active) visual.destroy();
                try { this.matter.world.remove(bullet); } catch (e) { }
            }
        });

        try { SoundManager.getInstance().play('click'); } catch (e) { }
    }

    performMeleeAttack(angle: number) {
        const reach = 50;
        const damage = 10 * this.damageMult;

        const hitX = this.player.x + Math.cos(angle) * reach;
        const hitY = this.player.y + Math.sin(angle) * reach;

        const punch = this.add.circle(hitX, hitY, 20, 0xffffff, 0.5);
        this.tweens.add({ targets: punch, scale: 0, duration: 200, onComplete: () => punch.destroy() });

        const hitbox = this.matter.add.circle(hitX, hitY, 20, { isSensor: true, label: 'player_attack' });
        (hitbox as any).attackData = { damage: damage, knockback: 10 };

        this.time.delayedCall(100, () => {
            try { this.matter.world.remove(hitbox); } catch (e) { }
        });
    }



    updateEnemies(time: number, delta: number) {
        this.enemies.forEach(item => {
            const enemy = item.sprite;
            if (!enemy.active || !enemy.body) return;

            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            (enemy as any).setAwake();

            if (item.aiType === 'boss') {
                if (!item.patternTimer) item.patternTimer = 0;
                item.patternTimer += delta;
                item.angleOffset = (item.angleOffset || 0) + 0.05;

                // Pattern Switching (every 5 seconds)
                if (item.patternTimer > 5000) {
                    item.pattern = (item.pattern + 1) % 3;
                    item.patternTimer = 0;
                    // Pattern Change Effect
                    this.cameras.main.shake(100, 0.005);
                    const color = item.pattern === 0 ? 0xff0000 : (item.pattern === 1 ? 0x00ff00 : 0x0000ff);
                    enemy.setTint(color);
                }

                const fireRate = 100; // Fast fire
                if (time > item.lastFire + fireRate) {
                    item.lastFire = time;
                    const { x, y } = enemy;

                    if (item.pattern === 0) {
                        // Pattern 0: Spiral
                        // Uses angleOffset to rotate the stream
                        const spiralAngle = item.angleOffset;
                        // Fire 2 streams
                        this.spawnEnemyBullet(x, y, Math.cos(spiralAngle) * 5, Math.sin(spiralAngle) * 5, 0xff0000);
                        this.spawnEnemyBullet(x, y, Math.cos(spiralAngle + Math.PI) * 5, Math.sin(spiralAngle + Math.PI) * 5, 0xff0000);
                    } else if (item.pattern === 1) {
                        // Pattern 1: Circle Expansion (Pulse)
                        // Fire every 500ms instead of 100ms
                        if (time % 500 < 50) {
                            const count = 12;
                            for (let i = 0; i < count; i++) {
                                const angle = (Math.PI * 2 / count) * i + item.angleOffset;
                                this.spawnEnemyBullet(x, y, Math.cos(angle) * 4, Math.sin(angle) * 4, 0x00ff00);
                            }
                        }
                    } else if (item.pattern === 2) {
                        // Pattern 2: Rapid Player Aim + Random
                        // Aim at player with random spread
                        const baseAngle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
                        const spread = (Math.random() - 0.5) * 0.5;
                        const finalAngle = baseAngle + spread;
                        const speed = 6 + Math.random() * 2;
                        this.spawnEnemyBullet(x, y, Math.cos(finalAngle) * speed, Math.sin(finalAngle) * speed, 0x0000ff);
                    }
                }
            } else if (item.aiType === 'shooter') {
                // 射撃敵：常にプレイヤーに近づく（近すぎると逃げない、攻撃しやすく）
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

                if (dist > 150) {
                    // 150より遠ければ近づく
                    const speed = dist > 400 ? 3 : 2;
                    enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
                } else {
                    // 近距離では少し遅く動く（逃げない）
                    enemy.setVelocity(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5);
                }

                // 射程内なら撃つ
                if (time > item.lastFire + item.fireRate && dist < 300) {
                    this.enemyShoot(item);
                    item.lastFire = time;
                }
            } else {
                // 近接敵：常にプレイヤーに向かって移動（距離制限なし）
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
                const speed = item.speed || 2;
                // 遠い場合は少し速く移動
                const speedMult = dist > 300 ? 1.5 : 1.0;
                enemy.setVelocity(Math.cos(angle) * speed * speedMult, Math.sin(angle) * speed * speedMult);
            }
        });
    }

    spawnEnemyBullet(x: number, y: number, vx: number, vy: number, color: number) {
        if (!this.textures.exists('enemy_bullet')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(5, 5, 5);
            g.generateTexture('enemy_bullet', 10, 10);
        }

        const bullet = this.matter.add.image(x, y, 'enemy_bullet');
        bullet.setCircle(5);
        bullet.setFriction(0);
        bullet.setFrictionAir(0);
        bullet.setTint(color);
        (bullet.body as any).label = 'enemy_bullet';

        bullet.setVelocity(vx, vy);

        this.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
    }

    enemyShoot(enemyData: any) {
        if (!enemyData.sprite.active) return;
        const { x, y } = enemyData.sprite;
        const angle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
        const speed = 7;
        this.spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0xff00ff);
    }

    spawnBoss() {
        this.bossSpawned = true;
        const { width } = this.scale;

        if (!this.textures.exists('trash-boss')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xc0392b, 1);
            g.fillRect(0, 0, 80, 80);
            g.generateTexture('trash-boss', 80, 80);
        }

        const enemy = this.matter.add.sprite(width / 2, 150, 'trash-boss');
        enemy.setCircle(40);
        enemy.setStatic(true); // 固定砲台化
        (enemy.body as any).label = 'enemy';

        // ボススケーリング
        const bossHp = 5000 + (Math.floor(this.currentRoom / 10) * 500);

        const enemyData = {
            sprite: enemy,
            hp: bossHp,
            maxHp: bossHp,
            type: 'boss',
            speed: 0,
            aiType: 'boss',
            lastFire: 0,
            fireRate: 0,
            exp: 1000 + (this.currentRoom * 10),
            // Boss AI Props
            pattern: 0, // 0: Spiral, 1: Circle, 2: Random
            patternTimer: 0,
            angleOffset: 0
        };

        (enemy.body as any).gameObject = enemy;
        (enemy as any).rpgData = enemyData;

        this.enemies.push(enemyData);

        this.cameras.main.shake(1000, 0.02);
        this.cameras.main.shake(1000, 0.02);
    }

    spawnEnemy(forceOnScreen: boolean = false) {
        try {
            const { width, height } = this.scale;

            let ex, ey;
            if (forceOnScreen) {
                // Fixed position but safer distance (400px to right)
                ex = width / 2 + 400;
                ey = height / 2;
                // Clamp to screen bounds
                if (ex > width - 50) ex = width - 50;
            } else {
                // 壁の内側（100px〜）かつプレイヤーから離れた位置
                let attempts = 0;
                do {
                    ex = Phaser.Math.Between(100, width - 100);
                    ey = Phaser.Math.Between(100, height - 100);
                    attempts++;
                } while (
                    attempts < 30 &&
                    Phaser.Math.Distance.Between(ex, ey, this.player.x, this.player.y) < 400
                );
            }

            const isShooter = Math.random() < 0.4;
            const isElite = !forceOnScreen && this.currentRoom >= 3 && Math.random() < 0.15; // 3ルーム目から低確率でエリート

            let tex;
            if (isElite) {
                tex = 'trash-metal'; // エリートはメタル系で固定など
            } else if (isShooter) {
                tex = 'trash-triangle';
            } else {
                const textures = ['trash-plastic', 'trash-metal', 'trash-bio'];
                tex = Phaser.Math.RND.pick(textures);
            }

            const enemy = this.matter.add.sprite(ex, ey, tex);
            const radius = isElite ? 30 : 15;
            enemy.setCircle(radius);
            if (isElite) {
                enemy.setDisplaySize(60, 60);
                enemy.setTint(0xff8888); // 威圧感のある色
            }
            enemy.setFriction(0);
            enemy.setFrictionAir(0.05);
            (enemy.body as any).label = 'enemy';

            // 難易度スケーリング
            const hpMult = (1 + (this.currentRoom - 1) * 0.1) * (isElite ? 3 : 1);
            const speedMult = (1 + (this.currentRoom - 1) * 0.05) * (isElite ? 0.7 : 1); // エリートは少し遅いが硬い

            const enemyData = {
                sprite: enemy,
                hp: Math.floor((isShooter ? 25 : 60) * hpMult),
                maxHp: Math.floor((isShooter ? 25 : 60) * hpMult),
                type: tex,
                speed: (2 + Math.random()) * speedMult,
                aiType: isShooter ? 'shooter' : 'melee',
                lastFire: 0,
                fireRate: isShooter ? Math.max(1000, 3000 - (this.currentRoom * 100)) : 2000,
                exp: ((isShooter ? 30 : 20) + (this.currentRoom * 2)) * (isElite ? 5 : 1)
            };

            (enemy.body as any).gameObject = enemy;
            (enemy as any).rpgData = enemyData;

            this.enemies.push(enemyData);
        } catch (e) { this.logError(e); }
    }

    handleCollision(bodyA: any, bodyB: any) {
        // 早期リターン：ボディが無効な場合
        if (!bodyA || !bodyB || !bodyA.label || !bodyB.label) return;

        const labels = [bodyA.label, bodyB.label];

        if (labels.includes('player') && labels.includes('gate')) {
            this.nextRoom();
            return;
        }

        if ((labels.includes('player_attack') || labels.includes('player_knife')) && labels.includes('enemy')) {
            const attackBody = (bodyA.label === 'player_attack' || bodyA.label === 'player_knife') ? bodyA : bodyB;
            const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;

            const enemySprite = (enemyBody as any).gameObject;
            const attackData = (attackBody as any).attackData || { damage: 30, knockback: 8 };

            // スプライトが有効かチェック
            if (enemySprite && enemySprite.active && enemySprite.rpgData && enemySprite.rpgData.hp > 0) {
                // ヒットエフェクトを先に作成（座標を保存）
                const hitX = enemySprite.x;
                const hitY = enemySprite.y;

                this.damageEnemy(enemySprite.rpgData, attackData.damage);

                // 敵がまだ生きている場合のみノックバックを適用
                if (enemySprite.active && enemySprite.body) {
                    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemySprite.x, enemySprite.y);
                    const force = enemySprite.rpgData.aiType === 'boss' ? 2 : attackData.knockback;
                    enemySprite.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
                }

                this.createHitEffect(hitX, hitY);

                // Lifesteal effect
                if (attackData.isLifesteal) {
                    const heal = Math.max(1, Math.floor(attackData.damage * 0.1));
                    this.hp = Math.min(this.hp + heal, this.maxHp);
                    this.createSparks(this.player.x, this.player.y, 0x2ecc71, 5);
                }

                // Piercing logic: only destroy if NOT piercing
                if (attackBody.label === 'player_attack' && !attackData.isPiercing) {
                    const visual = (attackBody as any).gameObject;
                    if (visual && visual.active) visual.destroy();
                    try { this.matter.world.remove(attackBody); } catch (e) { }
                }

                // Knife logic
                if (attackBody.label === 'player_knife') {
                    const knife = (attackBody as any).gameObject;
                    if (knife && knife.active) knife.destroy();
                }

                // チェーン（雷撃）効果
                // チェーン（雷撃）効果
                if (attackData.chain && !attackData.isChainDamage) {
                    let chainCount = 0;
                    this.enemies.forEach(other => {
                        if (chainCount >= 3) return; // 最大3体まで
                        if (other.sprite && other.sprite.active && other.sprite !== enemySprite && other.hp > 0) {
                            const d = Phaser.Math.Distance.Between(hitX, hitY, other.sprite.x, other.sprite.y);
                            if (d < 150) {
                                chainCount++;
                                // 連鎖ダメージ（再連鎖しないようにフラグなど考慮できるが、今回は直接damageEnemyを呼ぶだけなので無限ループはしない）
                                this.damageEnemy(other, attackData.damage * 0.7);

                                // 電撃エフェクト
                                try {
                                    const lightning = this.add.graphics();
                                    lightning.lineStyle(2, 0x00ffff, 1);
                                    lightning.lineBetween(hitX, hitY, other.sprite.x, other.sprite.y);
                                    this.tweens.add({ targets: lightning, alpha: 0, duration: 200, onComplete: () => lightning.destroy() });
                                } catch (e) { }
                            }
                        }
                    });
                }
            }
        }
        else if ((labels.includes('player') && labels.includes('enemy')) ||
            (labels.includes('player') && labels.includes('enemy_bullet'))) {

            if (this.invulnerable) return;
            if (!this.player || !this.player.active) return;

            const isBullet = labels.includes('enemy_bullet');
            const otherBody = bodyA.label === 'player' ? bodyB : bodyA;

            // otherBodyが有効かチェック
            if (!otherBody) return;

            let dmg = isBullet ? 15 : 10;
            if (!isBullet) {
                const enemyBody = bodyA.label === 'player' ? bodyB : bodyA;
                const enemyObj = (enemyBody as any).gameObject;
                if (enemyObj?.active && enemyObj?.rpgData?.aiType === 'boss') dmg = 40;
            }

            this.takeDamage(dmg);

            if (isBullet) {
                const bulletObj = (otherBody as any).gameObject;
                if (bulletObj && bulletObj.active) bulletObj.destroy();
            } else {
                if (otherBody && otherBody.position) {
                    const angle = Phaser.Math.Angle.Between(otherBody.position.x, otherBody.position.y, this.player.x, this.player.y);
                    if (this.player.active && this.player.body) {
                        this.player.setVelocity(Math.cos(angle) * 10, Math.sin(angle) * 10);
                    }
                }
            }

            this.invulnerable = true;
            if (this.player.active) this.player.setAlpha(0.5);
            this.time.delayedCall(500, () => {
                this.invulnerable = false;
                if (this.player && this.player.active) this.player.setAlpha(1);
            });
        }
    }

    damageEnemy(enemyData: any, dmg: number) {
        // 既に死んでいる場合は処理しない
        if (!enemyData || enemyData.hp <= 0) return;
        if (!enemyData.sprite || !enemyData.sprite.active) return;

        enemyData.hp -= dmg;

        if (enemyData.sprite.active) {
            enemyData.sprite.setTint(0xffffff);
            this.time.delayedCall(100, () => {
                if (enemyData.sprite && enemyData.sprite.active) enemyData.sprite.clearTint();
            });
        }

        if (enemyData.hp <= 0) {
            this.killEnemy(enemyData);
        } else {
            this.shakeCamera(0.005, 50);
            try { SoundManager.getInstance().play('click'); } catch (e) { }
        }
    }

    takeDamage(damage: number) {
        if (this.invulnerable || this.gameOver) return;

        const armor = (this as any).armor || 0;
        const actualDmg = Math.max(1, Math.floor(damage - armor));

        this.hp -= actualDmg;
        this.shakeCamera(0.02, 200);

        if (this.hp <= 0) {
            // Revive logic is already in update loop but could move here for cleaner flow
        } else {
            try { SoundManager.getInstance().play('error'); } catch (e) { }
        }
    }

    killEnemy(enemyData: any) {
        // 既に処理済みの場合は何もしない
        if (!enemyData) return;
        if (!enemyData.sprite || !enemyData.sprite.active) {
            // 既にenemiesリストから削除されている可能性があるので確認して削除
            this.enemies = this.enemies.filter(e => e !== enemyData);
            return;
        }

        const type = enemyData.type;

        // スプライトの座標を先に保存（破壊前に）
        const dropX = enemyData.sprite.x;
        const dropY = enemyData.sprite.y;

        // 爆発効果（敵死亡時）
        if ((this as any).hasExplode) {
            const explode = this.add.circle(dropX, dropY, 60, 0xffaa00, 0.6);
            this.tweens.add({ targets: explode, scale: 1.5, alpha: 0, duration: 300, onComplete: () => explode.destroy() });

            // 周囲の敵にダメージ
            this.enemies.forEach(other => {
                if (other !== enemyData && other.sprite && other.sprite.active) {
                    const d = Phaser.Math.Distance.Between(dropX, dropY, other.sprite.x, other.sprite.y);
                    if (d < 80) {
                        this.damageEnemy(other, 20 * this.damageMult);
                    }
                }
            });
        }

        if (type === 'boss') {
            this.showClearRewardUI();
            if (enemyData.sprite && enemyData.sprite.active) enemyData.sprite.destroy();
            this.enemies = this.enemies.filter(e => e !== enemyData);
            return;
        }

        let resource = 'plastic';
        if (type.includes('metal') || type.includes('triangle')) resource = 'metal';
        else if (type.includes('bio')) resource = 'bio';

        // Drop Gold
        const gm = GameManager.getInstance();
        const baseGoldChance = 0.3; // 30% base
        const luck = gm.rogueStats.luck || 0;
        const greed = gm.rogueStats.greed || 0;
        const chance = baseGoldChance + (luck * 0.1);

        if (Math.random() < chance) {
            const baseAmount = 10; // Base gold
            const amount = Math.floor(baseAmount * (1 + (greed * 0.1)));
            this.spawnGold(dropX, dropY, amount);
        }

        this.spawnTrash(dropX, dropY, resource as any);

        // リサイクル技術（確率で追加ドロップ）
        if (Math.random() < this.dropRateMult - 1.0) {
            this.spawnTrash(dropX + 10, dropY + 10, resource as any);
        }

        // 経験値増加効果
        const expMult = (this as any).expMult || 1.0;
        this.exp += Math.floor((enemyData.exp || 20) * expMult);
        this.kills++;

        // 吸血効果
        const lifesteal = (this as any).hasLifesteal || 0;
        if (lifesteal > 0) {
            this.hp = Math.min(this.hp + lifesteal, this.maxHp);
        }

        if (this.exp >= this.expToNext) {
            this.levelUp();
        }

        if (enemyData.sprite && enemyData.sprite.active) enemyData.sprite.destroy();
        this.enemies = this.enemies.filter(e => e !== enemyData);

        try { SoundManager.getInstance().play('destroy'); } catch (e) { }
    }

    levelUp() {
        this.level++;
        this.exp -= this.expToNext;
        this.expToNext = Math.floor(this.expToNext * 1.5);

        this.isTransitioning = true;
        this.isPaused = true;
        this.matter.world.pause();

        this.showUpgradeMenu();

        try { SoundManager.getInstance().play('success'); } catch (e) { }
    }

    completeRoom() {
        if (this.gate || this.isTransitioning) return;

        const { width, height } = this.scale;

        // サイバーポータルの生成（テクスチャがなければ生成）
        if (!this.textures.exists('portal-ring')) {
            const g = this.make.graphics({ x: 0, y: 0 });
            g.lineStyle(4, 0x00ffff, 1);
            g.strokeCircle(40, 40, 35);
            g.lineStyle(2, 0x00ffff, 0.5);
            g.strokeCircle(40, 40, 25);
            g.generateTexture('portal-ring', 80, 80);
            g.destroy();
        }

        this.gate = this.matter.add.sprite(width / 2, height / 2, 'portal-ring');
        this.gate.setTint(0x00ffff);
        this.gate.setDisplaySize(80, 80);
        this.gate.setSensor(true);
        this.gate.setStatic(true);
        this.gate.setDepth(10);
        (this.gate.body as any).label = 'gate';

        // 回転・脈動アニメーション
        this.tweens.add({
            targets: this.gate,
            angle: 360,
            duration: 3000,
            repeat: -1
        });
        this.tweens.add({
            targets: this.gate,
            scale: 1.2,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const txt = this.add.text(width / 2, height / 2 - 80, 'PORTAL ACTIVE', {
            fontSize: '32px', color: '#00ffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({ targets: txt, alpha: 0, duration: 2000, onComplete: () => txt.destroy() });

        try { SoundManager.getInstance().play('success'); } catch (e) { }

        // ゲート出現時のパーティクル
        this.createSparks(width / 2, height / 2, 0x00ffff, 20);
    }

    setupArena() {
        try {
            // 既存の壁・障害物・床を削除
            if (this.walls && this.walls.length > 0) {
                const wallsToRemove = [...this.walls];
                this.walls = []; // 先にクリア
                wallsToRemove.forEach(w => {
                    try {
                        if (!w) return;
                        if (w.destroy) {
                            w.destroy();
                        } else if (this.matter && this.matter.world) {
                            this.matter.world.remove(w);
                        }
                    } catch (e) {
                        console.error("Error removing wall:", e);
                    }
                });
            }

            if (this.obstacles && this.obstacles.length > 0) {
                this.obstacles.forEach(o => {
                    if (o && o.destroy) o.destroy();
                });
                this.obstacles = [];
            }

            if ((this as any).floorGrid) {
                (this as any).floorGrid.destroy();
                (this as any).floorGrid = null;
            }

            const { width, height } = this.scale;

            // サイバーグリッド床の描画
            const grid = this.add.graphics().setDepth(-10);
            grid.lineStyle(1, 0x00ffff, 0.2);
            for (let x = 0; x <= width; x += 40) {
                grid.lineBetween(x, 0, x, height);
            }
            for (let y = 0; y <= height; y += 40) {
                grid.lineBetween(0, y, width, y);
            }
            (this as any).floorGrid = grid;

            const thickness = 64;

            // 外壁の生成
            const wallOptions = { isStatic: true, label: 'wall' };
            this.walls.push(this.matter.add.rectangle(width / 2, -thickness / 2, width, thickness, wallOptions)); // Top
            this.walls.push(this.matter.add.rectangle(width / 2, height + thickness / 2, width, thickness, wallOptions)); // Bottom
            this.walls.push(this.matter.add.rectangle(-thickness / 2, height / 2, thickness, height, wallOptions)); // Left
            this.walls.push(this.matter.add.rectangle(width + thickness / 2, height / 2, thickness, height, wallOptions)); // Right

            // 障害物の生成（ルーム数に応じて密度変化）
            // ボス部屋 (Stage 10, 20...) では障害物を生成しない
            if (this.currentRoom % 10 !== 0) {
                const obstacleCount = 2 + Math.floor(Math.random() * 4);
                for (let i = 0; i < obstacleCount; i++) {
                    const ox = 200 + Math.random() * (width - 400);
                    const oy = 200 + Math.random() * (height - 400);

                    // プレイヤー初期位置(中央付近)を避ける
                    if (Phaser.Math.Distance.Between(ox, oy, width / 2, height / 2) < 150) continue;

                    const obs = this.matter.add.image(ox, oy, 'trash-metal');
                    obs.setStatic(true);
                    obs.setDisplaySize(50 + Math.random() * 50, 50 + Math.random() * 50);
                    obs.setTint(0x444444);
                    (obs.body as any).label = 'wall';
                    this.obstacles.push(obs);
                }
            }
        } catch (e) {
            console.error("setupArena error:", e);
        }
    }

    nextRoom() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        console.log('Starting nextRoom transition (Scene Restart)');

        // Check for Boss Stage Completion
        if (this.currentRoom % 10 === 0) {
            this.showClearRewardUI();
            return;
        }

        try { SoundManager.getInstance().play('click'); } catch (e) { }

        // フェイルセーフ付き遷移処理
        const nextRoomData = {
            currentRoom: this.currentRoom + 1,
            hp: this.hp,
            maxHp: this.maxHp,
            stamina: this.stamina,
            maxStamina: this.maxStamina,
            level: this.level,
            exp: this.exp,
            expToNext: this.expToNext,
            kills: this.kills,
            currentAmmo: this.currentAmmo,
            damageMult: this.damageMult,
            vacuumRange: this.vacuumRange,
            vacuumForce: this.vacuumForce,
            droneFireRateMult: this.droneFireRateMult,
            dropRateMult: this.dropRateMult,
            tank: { ...this.tank }, // PASS TANK DATA
            hasExplode: (this as any).hasExplode,
            hasLifesteal: (this as any).hasLifesteal,
            expMult: (this as any).expMult,
            startLevel: (this as any).startLevel,
            revivalCount: (this as any).revivalCount
        };



        // シンプルなフェードアウトのみ実行し、完了後にシーン再起動
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.time.delayedCall(600, () => {
            // シーンを完全にリスタート（新しい部屋として初期化）
            this.scene.restart(nextRoomData);
        });
    }

    showClearRewardUI() {
        // Boss Clear & Reward Selection
        const { width, height } = this.scale;

        // Remove UI container
        if (this.uiContainer) this.uiContainer.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(2000));

        // Disable physics
        this.matter.world.pause();
        this.gameOver = true;

        // Clear Text
        this.add.text(width / 2, 100, "BOSS DEFEATED!", {
            fontFamily: '"Orbitron"', fontSize: '64px', color: '#f1c40f', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(2001);

        this.add.text(width / 2, 180, "報酬を選択してください:", {
            fontFamily: '"Orbitron"', fontSize: '32px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(2001);

        // Stage-based Scaling
        const startLevel = (this as any).startLevel || 1;
        const multiplier = Math.pow(1.5, startLevel - 1);

        const rewards = [
            { id: 'money', name: "資金調達", desc: `ゴールド +¥${(1000000 * multiplier).toLocaleString()}`, color: 0xf1c40f, amount: 1000000 * multiplier },
            { id: 'resource', name: "資源物資", desc: `プラ +${Math.floor(5000 * multiplier)}, 金属 +${Math.floor(2500 * multiplier)}`, color: 0x3498db, plastic: 5000 * multiplier, metal: 2500 * multiplier },
            { id: 'rare', name: "システム拡張", desc: `レアメタル +${Math.floor(500 * multiplier)}`, color: 0xe74c3c, rareMetal: 500 * multiplier }
        ];

        rewards.forEach((r, index) => {
            const x = width / 2;
            const y = 300 + (index * 120);

            const bg = this.add.rectangle(x, y, 600, 100, 0x333333)
                .setInteractive({ useHandCursor: true })
                .setDepth(2001);

            // Hover effect
            bg.on('pointerover', () => bg.setFillStyle(0x555555));
            bg.on('pointerout', () => bg.setFillStyle(0x333333));
            bg.on('pointerdown', () => {
                const gm = GameManager.getInstance();
                if (r.id === 'money') {
                    gm.addMoney(r.amount!); // Changed from rogueGold to real Money
                } else if (r.id === 'resource') {
                    gm.addResource('plastic', r.plastic!);
                    gm.addResource('metal', r.metal!);
                } else if (r.id === 'rare') {
                    gm.addResource('rareMetal', r.rareMetal!);
                }

                gm.save();

                this.cameras.main.fadeOut(1000, 0, 0, 0);
                this.time.delayedCall(1000, () => {
                    this.scene.start('StageSelectScene'); // Return to Stage Select
                });
            });

            this.add.text(x, y - 20, r.name, {
                fontFamily: '"Orbitron"', fontSize: '28px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5).setDepth(2002);

            this.add.text(x, y + 20, r.desc, {
                fontFamily: '"Orbitron"', fontSize: '18px', color: '#aaaaaa'
            }).setOrigin(0.5).setDepth(2002);

            // Icon placeholder
            this.add.circle(x - 250, y, 30, r.color).setDepth(2002);
        });
    }



    startRoom() {
        // ルーム開始演出
        const { width, height } = this.scale;
        const roomInFloor = ((this.currentRoom - 1) % 10) + 1;
        const msg = `START ROOM ${roomInFloor}`;
        const txt = this.add.text(width / 2, height / 2, msg, {
            fontSize: '48px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000).setAlpha(0);

        this.tweens.add({
            targets: txt,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 400,
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    this.tweens.add({
                        targets: txt,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => txt.destroy()
                    });
                });
            }
        });

        this.isEnemySpawning = true;
        // 敵の数と強さをスケーリング
        const count = 3 + Math.floor(this.currentRoom * 1.5);
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 500 + 1000, () => {
                this.spawnEnemy();
                if (i === count - 1) {
                    this.isEnemySpawning = false; // 最後の1体がスポーンしたら解除
                }
            });
        }
    }

    showUpgradeMenu() {
        const { width, height } = this.scale;
        this.upgradeContainer.removeAll(true);
        this.upgradeContainer.setVisible(true);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        this.upgradeContainer.add(bg);

        const title = this.add.text(width / 2, 80, 'レベルアップ！', {
            fontSize: '40px', color: '#f1c40f', fontStyle: 'bold', fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        this.upgradeContainer.add(title);

        const levelText = this.add.text(width / 2, 130, `Lv.${this.level}`, {
            fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);
        this.upgradeContainer.add(levelText);

        const options = [
            { name: '🧲 強力吸引', desc: '吸引範囲 +20% & 吸引力アップ', key: 'vacuum', color: '#00ffff' },
            { name: '📦 タンク拡張', desc: '各素材の最大容量 +50', key: 'tank', color: '#3498db' },
            { name: '⚡ 高速装填', desc: 'ショットの連射間隔を短縮', key: 'fastloader', color: '#f1c40f' },
            { name: '🚁 ドローン調整', desc: 'ドローンの攻撃速度 x1.5', key: 'dronetuning', color: '#00ff00' },
            { name: '♻️ リサイクル技術', desc: '素材のドロップ率アップ', key: 'recycle', color: '#2ecc71' },
            { name: '❤️ 緊急リペア', desc: '最大HP +20 & 全回復', key: 'repair', color: '#e74c3c' },
            { name: '💨 高速移動', desc: '移動速度 +15%', key: 'agi', color: '#9b59b6' },
            { name: '🔋 スタミナ強化', desc: '最大スタミナ +30', key: 'end', color: '#3498db' }
        ];

        const picks = Phaser.Utils.Array.Shuffle(options).slice(0, 3);

        picks.forEach((opt, idx) => {
            const x = width / 2;
            const y = 220 + (idx * 110);

            const btn = this.add.rectangle(x, y, 450, 90, 0x333333)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xffffff);

            const name = this.add.text(x, y - 18, opt.name, {
                fontSize: '26px', color: opt.color, fontStyle: 'bold', fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            const desc = this.add.text(x, y + 18, opt.desc, {
                fontSize: '18px', color: '#cccccc', fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);

            btn.on('pointerover', () => btn.setFillStyle(0x555555));
            btn.on('pointerout', () => btn.setFillStyle(0x333333));
            btn.on('pointerdown', () => this.applyUpgrade(opt.key));

            this.upgradeContainer.add([btn, name, desc]);
        });
    }

    applyUpgrade(key: string) {
        switch (key) {
            case 'vacuum':
                this.vacuumRange += 50;
                this.vacuumForce *= 1.3;
                break;
            case 'tank':
                this.tank.max += 50;
                break;
            case 'fastloader':
                this.attackInterval *= 0.8;
                break;
            case 'dronetuning':
                this.droneFireRateMult *= 1.5;
                break;
            case 'recycle':
                this.dropRateMult += 0.2;
                break;
            case 'repair':
                this.maxHp += 20;
                this.hp = this.maxHp;
                break;
            case 'agi':
                this.moveSpeed *= 1.15;
                break;
            case 'end':
                this.maxStamina += 30;
                this.stamina = this.maxStamina;
                break;
        }

        this.upgradeContainer.setVisible(false);
        this.isPaused = false;
        this.isTransitioning = false;
        this.matter.world.resume();
    }

    dropResource(_x: number, _y: number, _resKey: string) {
        // Obsolete
    }

    createHitEffect(x: number, y: number) {
        const circle = this.add.circle(x, y, 20, 0xffffff);
        this.tweens.add({ targets: circle, scale: 1.5, alpha: 0, duration: 100, onComplete: () => circle.destroy() });
    }



    gameOverSequence(win: boolean) {
        // Boss Complete Handled separately
        if (win && this.currentRoom % 10 === 0) return;

        this.gameOver = true;
        this.isPaused = false;

        if (this.player && this.player.active) {
            this.player.setTint(win ? 0xffd700 : 0x555555);
        }

        // 物理演算のみ停止
        this.matter.world.pause();

        const { width, height } = this.scale;
        const msg = win ? 'ゴミ制覇！' : 'ゲームオーバー';
        const clr = win ? '#f1c40f' : '#c0392b';

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
            .setDepth(500)
            .setScrollFactor(0);

        this.add.text(width / 2, height / 2 - 50, msg, {
            fontSize: '64px', color: clr, fontStyle: 'bold', fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5).setDepth(501).setScrollFactor(0);

        if (win) {
            GameManager.getInstance().addMoney(1000);
            GameManager.getInstance().addResource('plastic' as any, 50);
            GameManager.getInstance().addResource('metal' as any, 50);

            this.add.text(width / 2, height / 2 + 30, 'ボーナス: +1000円, +50 資源', {
                fontSize: '24px', color: '#fff'
            }).setOrigin(0.5).setDepth(501).setScrollFactor(0);
        } else {
            this.add.text(width / 2, height / 2 + 30, `倒した敵: ${this.kills}匹  到達レベル: ${this.level}`, {
                fontSize: '20px', color: '#aaa'
            }).setOrigin(0.5).setDepth(501).setScrollFactor(0);
        }

        // HTML DOMボタンの作成（Phaserの入力系トラブルを回避）
        const button = document.createElement('button');
        button.innerText = 'ステージ選択に戻る'; // Changed from 'メインメニューに戻る'
        button.style.position = 'absolute';
        button.style.left = '50%';
        button.style.top = '65%';
        button.style.transform = 'translate(-50%, -50%)';
        button.style.padding = '15px 30px';
        button.style.fontSize = '20px';
        button.style.fontWeight = 'bold';
        button.style.color = '#ffffff';
        button.style.backgroundColor = '#c0392b'; // Red for Game Over
        button.style.border = '2px solid #ffffff';
        button.style.borderRadius = '8px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '10000'; // 最前面
        button.style.fontFamily = '"Noto Sans JP", sans-serif';

        button.onmouseover = () => button.style.backgroundColor = '#e74c3c';
        button.onmouseout = () => button.style.backgroundColor = '#c0392b';

        button.onclick = () => {
            document.body.removeChild(button);
            // Go back to Stage Select
            this.scene.start('StageSelectScene');
        };

        document.body.appendChild(button);
    }

    quitGame() {
        // DOMボタンが残っている場合は削除（安全対策）
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerText === 'メインメニューに戻る') {
                document.body.removeChild(btn);
            }
        });

        // 確実にメインメニュー（初期状態）に戻すためページリロード
        window.location.reload();
    }

    spawnTrash(x: number, y: number, type: 'plastic' | 'metal' | 'bio' | 'gold', value: number = 10) {
        let color = 0xffffff;
        let radius = 8;

        if (type === 'plastic') {
            color = 0x3498db; // Blue
            radius = 6;
        } else if (type === 'metal') {
            color = 0x95a5a6; // Grey
            radius = 8;
        } else if (type === 'bio') {
            color = 0x2ecc71; // Green
            radius = 7;
        } else if (type === 'gold') {
            color = 0xf1c40f; // Gold
            radius = 12; // Larger
        }

        let texture = 'trash-triangle';
        if (type === 'gold') texture = 'trash-gold';
        else if (type === 'plastic') texture = 'trash-plastic';
        else if (type === 'metal') texture = 'trash-metal';
        else if (type === 'bio') texture = 'trash-bio';

        const trash = this.matter.add.image(x, y, texture);
        trash.setDisplaySize(radius * 2, radius * 2);
        trash.setCircle(radius);
        trash.setFriction(0.05);
        trash.setFrictionAir(0.02);
        trash.setBounce(0.5);
        trash.setTint(color);
        trash.setSensor(true);

        // ランダムな方向に散らばる
        trash.setVelocity((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);

        const trashData = {
            sprite: trash,
            type: type,
            value: value // 使用
        };
        (trash as any).trashData = trashData;

        this.trashItems.push(trashData);
    }

    spawnGold(x: number, y: number, amount: number) {
        // Gold behaves like trash but with 'gold' type.
        // spawnTrash(x, y, type, value) - check definition
        this.spawnTrash(x, y, 'gold' as any, amount);
    }

    suckTrash(trashData: any) {
        if (!trashData || !trashData.sprite || !trashData.sprite.active) return;

        const type = trashData.type;
        const amount = trashData.value || 10;

        // Custom handling for GOLD
        if (type === 'gold') {
            // UI Update
            GameManager.getInstance().rogueGold += amount;
            GameManager.getInstance().save();
            if (this.goldText) this.goldText.setText(`${GameManager.getInstance().rogueGold}`);

            this.createSparks(trashData.sprite.x, trashData.sprite.y, 0xf1c40f, 5);
            const floatingText = this.add.text(this.player.x, this.player.y - 40, `+${amount} G`, {
                fontSize: '20px', color: '#f1c40f', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.tweens.add({ targets: floatingText, y: this.player.y - 80, alpha: 0, duration: 800, onComplete: () => floatingText.destroy() });

            try { SoundManager.getInstance().play('success'); } catch (e) { }

            // Destroy
            if (trashData.sprite) trashData.sprite.destroy();
            this.trashItems = this.trashItems.filter(t => t !== trashData);
            return;
        }

        // タンクがいっぱいなら吸えない
        // anyキャストでアクセス
        if ((this.tank as any)[type] >= (this.tank as any).max) return;

        // リソース加算
        (this.tank as any)[type] = Math.min((this.tank as any)[type] + amount, (this.tank as any).max);

        // UI更新（簡易エフェクト）
        this.createSparks(trashData.sprite.x, trashData.sprite.y, 0x00ffff, 5);
        const floatingText = this.add.text(this.player.x, this.player.y - 40, `+${amount} ${type.toUpperCase()}`, {
            fontSize: '16px', color: '#00ffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.tweens.add({ targets: floatingText, y: this.player.y - 80, alpha: 0, duration: 500, onComplete: () => floatingText.destroy() });

        try { SoundManager.getInstance().play('click'); } catch (e) { }

        // 消滅処理
        if (trashData.sprite) trashData.sprite.destroy();
        this.trashItems = this.trashItems.filter(t => t !== trashData);
    }
    switchAmmo(dir: number) {
        const types = ['plastic', 'metal', 'bio'];
        let idx = types.indexOf(this.currentAmmo);
        if (idx === -1) idx = 0;

        idx += dir;
        if (idx < 0) idx = types.length - 1;
        if (idx >= types.length) idx = 0;

        this.currentAmmo = types[idx];

        // 簡易フィードバック
        try { SoundManager.getInstance().play('click'); } catch (e) { }
    }

    performCraft(id: string) {
        if (!this.canAction || this.gameOver) return;

        const recipes = (this as any).recipes;
        const recipe = recipes.find((r: any) => r.id === id);
        if (!recipe) return;

        const tank = this.tank as any;
        const cost = recipe.cost;

        // チェック
        const canAfford =
            (!cost.plastic || tank.plastic >= cost.plastic) &&
            (!cost.metal || tank.metal >= cost.metal) &&
            (!cost.bio || tank.bio >= cost.bio);

        if (!canAfford) return;

        // 消費
        if (cost.plastic) tank.plastic -= cost.plastic;
        if (cost.metal) tank.metal -= cost.metal;
        if (cost.bio) tank.bio -= cost.bio;

        // 実行
        if (id === 'drone') this.spawnDrone();
        else if (id === 'turret') this.spawnTurret();
        else if (id === 'stimpack') this.hp = Math.min(this.hp + 20, this.maxHp);

        try { SoundManager.getInstance().play('click'); } catch (e) { }
        this.createSparks(this.player.x, this.player.y, 0x00ff00);
        const txt = this.add.text(this.player.x, this.player.y - 50, 'CRAFTED!', { color: '#00ff00', fontStyle: '#bold' }).setOrigin(0.5);
        this.tweens.add({ targets: txt, y: '-=30', alpha: 0, duration: 800, onComplete: () => txt.destroy() });
    }

    spawnDrone() {
        const drone = this.add.circle(this.player.x, this.player.y, 10, 0x00ffff);
        this.drones.push({
            sprite: drone,
            lastShoot: 0,
            angle: Math.random() * Math.PI * 2
        });
    }

    spawnTurret() {
        const turret = this.add.rectangle(this.player.x, this.player.y, 30, 30, 0x95a5a6);
        this.turrets.push({
            sprite: turret,
            lastShoot: 0,
            hp: 50
        });
    }

    updateDrones(time: number) {
        this.drones = this.drones.filter(d => d.sprite.active);
        this.drones.forEach((d) => {
            d.angle += 0.05;
            const targetX = this.player.x + Math.cos(d.angle) * 60;
            const targetY = this.player.y + Math.sin(d.angle) * 60;
            d.sprite.x += (targetX - d.sprite.x) * 0.1;
            d.sprite.y += (targetY - d.sprite.y) * 0.1;

            if (time - d.lastShoot > 1000 / this.droneFireRateMult) {
                const nearest = this.getNearestEnemy(d.sprite.x, d.sprite.y, 300) as any;
                if (nearest) {
                    const angle = Phaser.Math.Angle.Between(d.sprite.x, d.sprite.y, nearest.sprite.x, nearest.sprite.y);
                    this.fireBullet('plastic', angle, d.sprite.x, d.sprite.y); // Drone uses plastic bullets for visual consistency
                    d.lastShoot = time;
                }
            }
        });
    }

    updateTurrets(time: number) {
        this.turrets = this.turrets.filter(t => t.sprite.active);
        this.turrets.forEach(t => {
            if (time - t.lastShoot > 2000) {
                const nearest = this.getNearestEnemy(t.sprite.x, t.sprite.y, 400) as any;
                if (nearest) {
                    const angle = Phaser.Math.Angle.Between(t.sprite.x, t.sprite.y, nearest.sprite.x, nearest.sprite.y);
                    this.fireBullet('metal', angle, t.sprite.x, t.sprite.y); // Turret uses metal bullets
                    t.lastShoot = time;
                }
            }
        });
    }

    getNearestEnemy(x: number, y: number, range: number) {
        let nearest = null;
        let minDist = range;
        this.enemies.forEach(e => {
            if (e.sprite && e.sprite.active) {
                const d = Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y);
                if (d < minDist) {
                    minDist = d;
                    nearest = e;
                }
            }
        });
        return nearest;
    }

    createSparks(x: number, y: number, color: number = 0xffffff, count: number = 10) {
        for (let i = 0; i < count; i++) {
            const spark = this.add.circle(x, y, 2, color);
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 40;
            this.tweens.add({
                targets: spark,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                scale: 0,
                alpha: 0,
                duration: 400 + Math.random() * 400,
                onComplete: () => spark.destroy()
            });
        }
    }

    shakeCamera(intensity: number = 0.01, duration: number = 100) {
        this.cameras.main.shake(duration, intensity);
    }

    updateTrashBounds(_delta: number) {
        const { width, height } = this.scale;
        const padding = 20;

        this.trashItems.forEach(item => {
            if (!item.sprite || !item.sprite.active) return;
            const s = item.sprite;
            let vel = s.body.velocity;

            // Bounce X
            if (s.x < padding) {
                s.setPosition(padding, s.y);
                if (vel.x < 0) s.setVelocityX(Math.abs(vel.x * 0.8));
            } else if (s.x > width - padding) {
                s.setPosition(width - padding, s.y);
                if (vel.x > 0) s.setVelocityX(-Math.abs(vel.x * 0.8));
            }

            // Bounce Y
            if (s.y < padding) {
                s.setPosition(s.x, padding);
                if (vel.y < 0) s.setVelocityY(Math.abs(vel.y * 0.8));
            } else if (s.y > height - padding) {
                s.setPosition(s.x, height - padding);
                if (vel.y > 0) s.setVelocityY(-Math.abs(vel.y * 0.8));
            }
        });
    }
}
