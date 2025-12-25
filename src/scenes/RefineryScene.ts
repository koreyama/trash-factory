import Phaser from 'phaser';
import { GameManager, type ResourceType } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';
import { FloatingText } from '../objects/FloatingText';
import { Trash } from '../objects/Trash';

export class RefineryScene extends Phaser.Scene {
    private resourceUIs: Map<string, { bg: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text }> = new Map();
    private trashInScene: Set<Trash> = new Set();
    private backPressed: boolean = false;

    // Hazards
    private activeHazards: Set<string> = new Set();
    private lavaPool: any = null;
    private lavaGraphics: Phaser.GameObjects.Graphics | null = null;
    private shredderLeft: any = null;
    private shredderRight: any = null;
    private shredderGraphics: Phaser.GameObjects.Graphics | null = null;

    // Data
    // Data
    // private inventoryCounts: Map<string, number> = new Map(); // REMOVED: Using GameManager.refineryInventory
    private trayButtons: Map<string, Phaser.GameObjects.Container> = new Map();
    private spawnTimer: Phaser.Time.TimerEvent | null = null;

    private collideHandler?: (event: any) => void;

    constructor() {
        super({ key: 'RefineryScene' });
    }

    create() {
        const { width, height } = this.scale;
        this.backPressed = false;

        // 1. Background - Industrial Grey
        this.add.rectangle(width / 2, height / 2, width, height, 0x9b9b9b).setDepth(-10);

        // 2. Pit Geography: STEEP Frictionless Slopes
        this.createSlipperyPit();

        // 3. UI - Return & Stats
        this.createReturnButton();
        this.createResourceDisplay();

        // 4. Spawning Tray
        this.createInventoryTray();

        // 5. Hazard Controls (Toggle Buttons)
        this.createHazardToggles();

        // 6. Collision & Stability
        this.collideHandler = (event: any) => this.handleCollision(event);
        this.matter.world.on('collidestart', this.collideHandler);

        this.events.once('shutdown', () => {
            this.forceCleanup();
        });

        // 7. Interaction
        this.setupDragAndDrop();

        // Initial setup
        this.syncBuffer();
        this.updateHUD(); // STARTUP SYNC
    }

    private createSlipperyPit() {
        const { width, height } = this.scale;
        const slopeWidth = width * 0.45;
        const slopeThickness = 40;
        const angle = 35; // STEEP
        const rad = Phaser.Math.DegToRad(angle);

        // Physics Bodies (Invisible but active)
        const leftX = width * 0.15;
        const rightX = width * 0.85;
        const slopeY = height - 300;

        this.matter.add.rectangle(leftX, slopeY, slopeWidth, slopeThickness, {
            isStatic: true, angle: rad, friction: 0, frictionStatic: 0, label: 'slope'
        });

        this.matter.add.rectangle(rightX, slopeY, slopeWidth, slopeThickness, {
            isStatic: true, angle: -rad, friction: 0, frictionStatic: 0, label: 'slope'
        });

        this.matter.world.setBounds(0, 0, width, height, 32, true, true, false, true);

        // Visuals: 3D Industrial Ramps
        const drawRamp = (x: number, y: number, w: number, rotation: number) => {
            const g = this.add.graphics().setDepth(1);
            g.scene.tweens.addCounter({
                from: 0, to: 1, duration: 1, onComplete: () => {
                    g.clear();
                    // Main Metallic Surface
                    g.fillStyle(0x95a5a6, 1);
                    g.fillRect(-w / 2, -20, w, 40);

                    // Depth Side (Darker)
                    g.fillStyle(0x7f8c8d, 1);
                    g.fillRect(-w / 2, 20, w, 10);

                    // Caution Stripes (Black/Yellow) on top edge
                    g.fillStyle(0xf1c40f, 1);
                    g.fillRect(-w / 2, -25, w, 5);
                    g.fillStyle(0x2c3e50, 1);
                    for (let i = 0; i < w; i += 40) {
                        g.beginPath();
                        g.moveTo(-w / 2 + i, -25);
                        g.lineTo(-w / 2 + i + 20, -25);
                        g.lineTo(-w / 2 + i + 10, -20);
                        g.lineTo(-w / 2 + i - 10, -20);
                        g.closePath();
                        g.fill();
                    }
                }
            });
            // Hacky rotation application
            const container = this.add.container(x, y);
            container.add(g);
            container.setRotation(rotation);
        };

        drawRamp(leftX, slopeY, slopeWidth, rad);
        drawRamp(rightX, slopeY, slopeWidth, -rad);
    }

    private hazardButtons: Map<string, Phaser.GameObjects.Rectangle> = new Map();

    private createHazardToggles() {
        const { width } = this.scale;
        const topY = 200;

        const options = [
            { name: 'INCINERATOR', label: '焚却（溶岩）', key: 'lava', color: 0xe74c3c, x: width / 2 - 180 },
            { name: 'SHREDDER', label: '粉砕（歯車）', key: 'shredder', color: 0x95a5a6, x: width / 2 + 180 }
        ];

        options.forEach(opt => {
            const btn = this.add.container(opt.x, topY).setDepth(200);

            // Glassmorphism Button
            const bg = this.add.rectangle(0, 0, 300, 60, 0x2c3e50, 0.6)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xecf0f1, 0.3);

            const nameText = this.add.text(0, -10, opt.name, { fontSize: '24px', color: '#fff', fontFamily: 'Orbitron', fontStyle: 'bold' }).setOrigin(0.5);
            const subText = this.add.text(0, 15, opt.label, { fontSize: '14px', color: '#bdc3c7', fontFamily: 'Noto Sans JP' }).setOrigin(0.5);

            btn.add([bg, nameText, subText]);

            this.hazardButtons.set(opt.key, bg); // Store ref

            bg.on('pointerdown', () => this.toggleHazard(opt.key, bg, opt.color));

            // Hover
            bg.on('pointerover', () => { if (!this.activeHazards.has(opt.key)) bg.setStrokeStyle(2, opt.color, 0.8); });
            bg.on('pointerout', () => { if (!this.activeHazards.has(opt.key)) bg.setStrokeStyle(2, 0xecf0f1, 0.3); });
        });
    }

    private toggleHazard(key: string, bg: Phaser.GameObjects.Rectangle, color: number) {
        // Exclusive Toggle Logic
        if (this.activeHazards.has(key)) {
            // If clicking active, turn it off
            this.activeHazards.delete(key);
            bg.setStrokeStyle(2, 0xecf0f1, 0.3); // Reset style
            this.destroyHazard(key);
            SoundManager.getInstance().stopLoop('hazard'); // STOP AUDIO
        } else {
            // Turn off others first
            this.activeHazards.forEach(otherKey => {
                if (otherKey !== key) {
                    this.activeHazards.delete(otherKey);
                    this.destroyHazard(otherKey);
                    const otherBtn = this.hazardButtons.get(otherKey);
                    if (otherBtn) otherBtn.setStrokeStyle(2, 0xecf0f1, 0.3);
                }
            });
            SoundManager.getInstance().stopLoop('hazard'); // Stop previous

            // Activate new
            this.activeHazards.add(key);
            bg.setStrokeStyle(4, color, 1); // Active style
            this.initHazard(key);

            // START AUDIO
            if (key === 'lava') SoundManager.getInstance().startLoop('hazard', 'lava');
            if (key === 'shredder') SoundManager.getInstance().startLoop('hazard', 'shredder');
        }
        SoundManager.getInstance().play('click');
    }

    private initHazard(key: string) {
        const { width, height } = this.scale;
        const centerX = width / 2;
        const bottomY = height - 50;

        if (key === 'lava') {
            const w = 700;
            const h = 180;
            this.lavaPool = this.matter.add.rectangle(centerX, bottomY - 30, w, h, { isSensor: true, isStatic: true, label: 'lava' });
            this.lavaGraphics = this.add.graphics().setDepth(5);
        } else if (key === 'shredder') {
            const gearY = height - 150;
            const r = 130;
            this.shredderLeft = this.matter.add.circle(centerX - 80, gearY, r, { isStatic: true, label: 'shredder_left' });
            this.shredderRight = this.matter.add.circle(centerX + 80, gearY, r, { isStatic: true, label: 'shredder_right' });
            this.shredderGraphics = this.add.graphics().setDepth(10);
            this.matter.add.rectangle(centerX, gearY + 50, 200, 150, { isSensor: true, isStatic: true, label: 'shredder_core' });

            // NO HOPPER - Removed as requested
        }
    }

    private destroyHazard(key: string) {
        if (key === 'lava') {
            if (this.lavaPool) this.matter.world.remove(this.lavaPool);
            if (this.lavaGraphics) this.lavaGraphics.destroy();
            this.lavaPool = null;
            this.lavaGraphics = null;
        } else if (key === 'shredder') {
            if (this.shredderLeft) this.matter.world.remove(this.shredderLeft);
            if (this.shredderRight) this.matter.world.remove(this.shredderRight);
            if (this.shredderGraphics) this.shredderGraphics.destroy();
            this.shredderLeft = this.shredderRight = this.shredderGraphics = null;
        }
    }

    private handleCollision(event: any) {
        if (this.backPressed) return;

        // V3: More robust collision check using pair iteration
        event.pairs.forEach((pair: any) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Identify sensor
            let sensor = null;
            let other = null;

            if (bodyA.label === 'lava' || bodyA.label === 'shredder_core') {
                sensor = bodyA;
                other = bodyB;
            } else if (bodyB.label === 'lava' || bodyB.label === 'shredder_core') {
                sensor = bodyB;
                other = bodyA;
            }

            if (sensor && other) {
                // Find Trash GameObject in hierarchy (Body -> GameObject or Body -> Parent -> GameObject)
                let trashGO = other.gameObject;
                if (!trashGO && other.parent && other.parent.gameObject) {
                    trashGO = other.parent.gameObject;
                }

                if (trashGO instanceof Trash) {
                    this.process(trashGO as Trash, sensor.label);
                }
            }
        });
    }

    private process(trash: Trash, station: string) {
        if (trash.isDestroyed || this.backPressed) return;
        trash.isDestroyed = true;
        this.trashInScene.delete(trash);

        const gm = GameManager.getInstance();
        const tType = trash.trashType;
        let resType: ResourceType = 'plastic';
        let mult = 1;

        // Expanded Mapping Logic
        switch (tType) {
            case 'general': resType = 'plastic'; mult = 1; break;
            case 'plastic': resType = 'plastic'; mult = 2; break;
            case 'metal': resType = 'metal'; mult = 2; break;
            case 'circuit': resType = 'circuit'; mult = 3; break;
            case 'bio': resType = 'bioCell'; mult = 3; break;
            case 'battery': resType = 'rareMetal'; mult = 5; break;
            case 'medical': resType = 'bioCell'; mult = 8; break;
            case 'nuclear': resType = 'radioactive'; mult = 12; break;
            case 'satellite': resType = 'darkMatter'; mult = 20; break;
            case 'quantum': resType = 'quantumCrystal'; mult = 50; break;
            default: resType = 'plastic'; mult = 1; break;
        }

        gm.addResource(resType, Math.floor((gm.plasticPerTrash || 1) * mult));

        if (gm.futuresUnlocked && gm.marketMultiplier !== 1.0) {
            // Maybe show extra feedback?
            new FloatingText(this, trash.x, trash.y - 60, `x${gm.marketMultiplier.toFixed(2)}`, '#f1c40f');
        }


        if (station === 'lava') {
            this.tweens.add({ targets: trash, alpha: 0, scale: 2, tint: 0xff0000, duration: 250, onComplete: () => trash.destroy() });
        } else {
            // Shredded FX
            this.tweens.add({ targets: trash, scaleY: 0.1, scaleX: 3, alpha: 0, duration: 100, onComplete: () => trash.destroy() });
            this.cameras.main.shake(150, 0.015);
        }

        new FloatingText(this, trash.x, trash.y - 40, station === 'lava' ? 'VAPORIZED!' : 'SHREDDED!', '#3ae374');
        SoundManager.getInstance().play('destroy');
        this.updateHUD();
    }

    private syncBuffer() {
        const gm = GameManager.getInstance();
        gm.shippedTrashBuffer.forEach(item => {
            const current = gm.refineryInventory[item.type] || 0;
            gm.refineryInventory[item.type] = current + 1;
        });
        gm.shippedTrashBuffer = [];
        gm.save(); // Save immediately after import
        this.updateTrayUI();
    }

    private createInventoryTray() {
        const { width, height } = this.scale;
        const trayWidth = 200;
        const x = width - trayWidth / 2;
        this.add.rectangle(x, height / 2, trayWidth, height, 0x000000, 0.3).setDepth(0);
        this.add.text(x, 40, 'INVENTORY', { fontFamily: 'Orbitron', fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // All 9 Types
        const types = [
            'plastic', 'metal', 'circuit', 'bioCell',
            'battery', 'medical', 'nuclear', 'satellite', 'quantum'
        ];

        // CLEANUP: Destroy old buttons to prevent ghosting
        this.trayButtons.forEach(btn => btn.destroy());
        this.trayButtons.clear();

        // Compact layout for 9 items
        types.forEach((type, i) => {
            const btn = this.add.container(x, 80 + (i * 60)).setDepth(1);
            // Glassmorphism Button
            const bg = this.add.rectangle(0, 0, 180, 55, 0x2c3e50, 0.6)
                .setInteractive({ useHandCursor: true })
                .setStrokeStyle(2, 0xecf0f1, 0.3);

            const label = this.add.text(-80, -18, type.toUpperCase(), {
                fontSize: '12px', color: '#bdc3c7', fontFamily: 'Orbitron'
            }).setOrigin(0, 0);

            // CHANGED: Initialize with empty or 0, but ensure no duplication
            const count = this.add.text(80, 5, '0', {
                fontSize: '24px', color: '#fff', fontStyle: 'bold', fontFamily: 'Roboto'
            }).setOrigin(1, 0.5); // Right align number

            btn.add([bg, label, count]);

            // Long Press Logic
            bg.on('pointerdown', () => {
                this.trySpawn(type); // Immediate spawn
                // Start repeating
                this.spawnTimer = this.time.addEvent({
                    delay: 150,
                    callback: () => this.trySpawn(type),
                    loop: true
                });
            });

            const stopSpawn = () => {
                if (this.spawnTimer) {
                    this.spawnTimer.remove();
                    this.spawnTimer = null;
                }
            };

            bg.on('pointerup', stopSpawn);
            bg.on('pointerout', stopSpawn);

            this.trayButtons.set(type, btn);
        });
    }

    private updateTrayUI() {
        const gm = GameManager.getInstance();
        this.trayButtons.forEach((btn, type) => {
            const countText = btn.list[2] as Phaser.GameObjects.Text;
            const count = gm.refineryInventory[type] || 0;
            countText.setText(count.toLocaleString());
            btn.setAlpha(count > 0 ? 1 : 0.4);
        });
    }

    private trySpawn(type: string) {
        const gm = GameManager.getInstance();
        const current = gm.refineryInventory[type] || 0;
        if (current <= 0 || this.backPressed) return;

        gm.refineryInventory[type] = current - 1;
        gm.save(); // Save on spawn? Maybe too frequent, but safe for now.
        this.updateTrayUI();

        // Spawn high above slopes
        const x = Math.random() < 0.5 ? Phaser.Math.Between(50, 150) : Phaser.Math.Between(this.scale.width - 450, this.scale.width - 350);
        const trash = new Trash(this, x, 0, this.getTexture(type), type === 'bioCell' ? 'bio' : type as any);

        // FORCE 0 friction on trash itself
        trash.setFriction(0);
        trash.setFrictionAir(0.01);
        trash.setBounce(0.2);

        this.trashInScene.add(trash);
        this.input.setDraggable(trash);
    }

    private setupDragAndDrop() {
        this.input.on('drag', (_p: any, obj: any, dx: number, dy: number) => {
            if (obj instanceof Trash && !this.backPressed) {
                obj.setPosition(dx, dy);
                obj.setStatic(true);
            }
        });
        this.input.on('dragend', (_p: any, obj: any) => {
            if (obj instanceof Trash && !this.backPressed) {
                obj.setStatic(false);
                obj.setVelocity(0, 5);
                obj.setFriction(0); // Ensure it stays slippery
            }
        });
    }

    private forceCleanup() {
        this.backPressed = true;
        if (this.spawnTimer) { this.spawnTimer.remove(); this.spawnTimer = null; }
        this.scene.stop();
        this.time.removeAllEvents();
        this.tweens.killAll();
        SoundManager.getInstance().stopLoop('hazard'); // STOP AUDIO
        if (this.collideHandler) this.matter.world.off('collidestart', this.collideHandler);
        // this.matter.world.pause(); // Dont pause if we want wake to work? No, local pause is fine since we destroy.
        this.trashInScene.forEach(t => { if (t?.active) t.destroy(); });
        this.trashInScene.clear();
    }

    private createReturnButton() {
        // Position: Top Left
        // Clean recreation as requested
        const btn = this.add.container(40, 40).setDepth(300); // Shifted

        const circle = this.add.circle(0, 0, 22, 0x341f97) // Smaller (was 45)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(0, 0, "←", {
            fontSize: '24px', // Smaller (was 40)
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        btn.add([circle, text]);

        circle.on('pointerdown', () => {
            // Immediate feedback
            circle.setFillStyle(0x5f27cd);
            SoundManager.getInstance().play('click');

            // Execute Return Logic immediately
            this.handleReturn();
        });

        circle.on('pointerup', () => circle.setFillStyle(0x341f97));
    }

    private handleReturn() {
        if (this.backPressed) return;
        this.backPressed = true;

        // Critical: Complete stop and resume of main scene
        this.events.off('shutdown'); // prevent double cleanup if any
        this.forceCleanup();
        this.scene.stop();
        this.scene.resume('MainScene');
    }

    private createResourceDisplay() {
        // All 8 resources + Money implicit via HUD? No, just resources for now.
        const types: ResourceType[] = [
            'plastic', 'metal', 'circuit', 'bioCell',
            'rareMetal', 'radioactive', 'darkMatter', 'quantumCrystal'
        ];
        const colors = [
            '#3498db', '#95a5a6', '#2ecc71', '#9b59b6', // Basic
            '#f1c40f', '#27ae60', '#a29bfe', '#00cec9'  // Advanced (Dark Matter brightened)
        ];

        // CLEANUP: Destroy old UIs to prevent ghosting
        this.resourceUIs.forEach(ui => {
            ui.bg.destroy();
            ui.text.destroy();
        });
        this.resourceUIs.clear();

        // Background Panel (Glassmorphism)
        const { width } = this.scale;
        const panelWidth = 720;
        const panelHeight = 110;
        this.add.rectangle(width / 2, 80, panelWidth, panelHeight, 0x000000, 0.5).setDepth(-1);

        // 2 Rows of 4
        const colWidth = panelWidth / 4;
        const startX = (width / 2) - (panelWidth / 2) + (colWidth / 2); // Center items in col

        types.forEach((type, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;

            // Center in column
            const x = startX + (col * colWidth);
            const y = 55 + (row * 50); // Increased spacing

            // Resource Icon/Label (Left of number)
            this.add.text(x - 50, y, type.substring(0, 3).toUpperCase(), {
                fontFamily: 'Roboto Condensed', fontSize: '14px', color: '#bdc3c7'
            }).setOrigin(0, 0.5);

            // Number (Right of Label)
            const text = this.add.text(x, y, `0`, {
                fontFamily: 'Orbitron', fontSize: '24px', color: colors[i], fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            this.resourceUIs.set(type, { bg: this.add.graphics(), text });
        });
    }

    private updateHUD() {
        const gm = GameManager.getInstance();
        this.resourceUIs.forEach((obj, key) => {
            if (obj.text.active) obj.text.setText(((gm as any)[key] || 0).toLocaleString());
        });
    }

    private getTexture(type: string) {
        switch (type) {
            case 'plastic': return 'trash-plastic';
            case 'metal': return 'trash-metal';
            case 'circuit': return 'trash-circuit';
            case 'bioCell': return 'trash-bio';
            case 'battery': return 'trash-battery';
            case 'medical': return 'trash-medical';
            case 'nuclear': return 'trash-nuclear';
            case 'satellite': return 'trash-satellite';
            case 'quantum': return 'trash-quantum';
            default: return 'trash-box';
        }
    }

    update(_time: number, delta: number) {
        if (this.backPressed) return;

        const gm = GameManager.getInstance();
        const finance = gm.update(delta);
        if (finance.interestPaid > 0) {
            new FloatingText(this, 100, 150, `+¥${Math.floor(finance.interestPaid)}`, '#f1c40f');
        }

        // Lava
        if (this.lavaGraphics && this.lavaPool) {
            this.lavaGraphics.clear();
            const { x, y } = this.lavaPool.position; // Center
            const w = 700;
            const h = 180;

            this.lavaGraphics.fillStyle(0xee5253, 0.9);
            this.lavaGraphics.fillRect(x - w / 2, y - h / 2, w, h);
            this.lavaGraphics.fillStyle(0xff9f43, 0.6);
            for (let i = 0; i < 15; i++) {
                const bx = x - w / 2 + Phaser.Math.Between(0, w);
                const by = y - h / 2 + (this.time.now * 0.1 + i * 30) % h;
                this.lavaGraphics.fillCircle(bx, by, 8 + Math.sin(this.time.now * 0.01 + i) * 12);
            }
        }

        // Industrial Shredder
        if (this.shredderGraphics && this.shredderLeft && this.shredderRight) {
            this.shredderGraphics.clear();
            const angle = this.time.now * 0.008; // Faster
            [this.shredderLeft, this.shredderRight].forEach((gear, i) => {
                const { x, y } = gear.position;
                const dir = i === 0 ? 1 : -1;
                this.shredderGraphics!.lineStyle(6, 0x2c3e50, 1);
                this.shredderGraphics!.strokeCircle(x, y, 130);

                // Giant Teeth
                this.shredderGraphics!.fillStyle(0x576574, 1);
                for (let j = 0; j < 16; j++) {
                    const toothAngle = angle * dir + (j * Math.PI * 2 / 16);
                    const tx = x + Math.cos(toothAngle) * 140;
                    const ty = y + Math.sin(toothAngle) * 140;
                    this.shredderGraphics!.fillCircle(tx, ty, 25);
                }
                // Center Hub
                this.shredderGraphics!.fillStyle(0x000000, 0.6);
                this.shredderGraphics!.fillCircle(x, y, 40);

                // Rotational indicator
                this.shredderGraphics!.lineStyle(4, 0xffffff, 0.5);
                this.shredderGraphics!.beginPath();
                this.shredderGraphics!.moveTo(x, y);
                this.shredderGraphics!.lineTo(x + Math.cos(angle * dir) * 130, y + Math.sin(angle * dir) * 130);
                this.shredderGraphics!.strokePath();
            });
        }

        // V4: Explicit Overlap Check (Brute Force)
        // Guaranteed processing if trash enters the zone coordinates
        if (this.trashInScene.size > 0 && (this.lavaPool || this.shredderGraphics)) {
            const trashArray = Array.from(this.trashInScene);
            const { width, height } = this.scale;
            const bottomThreshold = height - 150; // Generic threshold for both pits

            trashArray.forEach(trash => {
                if (trash.active && trash.y > bottomThreshold && !trash.isDestroyed) {
                    // Center Zone Check
                    if (trash.x > width / 2 - 350 && trash.x < width / 2 + 350) {
                        if (this.activeHazards.has('lava')) {
                            this.process(trash, 'lava');
                        } else if (this.activeHazards.has('shredder') && trash.y > height - 120) {
                            // Shredder is slightly lower conceptually
                            this.process(trash, 'shredder');
                        }
                    }
                }
            });
        }
    }
}
