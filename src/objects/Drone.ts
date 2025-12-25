import Phaser from 'phaser';
import { Trash } from './Trash';
import { GameManager } from '../managers/GameManager';

export class Drone extends Phaser.GameObjects.Container {
    private isBusy: boolean = false;
    private target: Trash | null = null;
    private homeX: number;
    private homeY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.homeX = x;
        this.homeY = y;

        // Visual
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x00ff00, 1);
        g.fillTriangle(0, -10, 10, 10, -10, 10); // Simple Green Triangle
        g.generateTexture('drone_tex', 20, 20);

        const sprite = scene.add.sprite(0, 0, 'drone_tex');
        this.add(sprite);
        scene.add.existing(this);
    }

    update() {
        if (!this.isBusy) {
            this.findTarget();
        }
    }

    private findTarget() {
        const gm = GameManager.getInstance();
        if (!gm.droneUnlocked || !gm.dronesActive) {
            this.setVisible(false);
            return;
        }
        this.setVisible(true);

        // Simple search
        // We need access to MainScene's trash list or physics bodies
        // Hacky way: query world
        // Smart AI: Prioritize high value if upgraded
        // Targeting nearest for maximizing collection efficiency (Manual override as requested)

        let bestTarget: Trash | null = null;
        let maxScore = -Infinity;

        const bodies = this.scene.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.gameObject.isDestroyed) {
                const t = b.gameObject as Trash;
                const dist = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);

                let score = -dist; // Prioritize nearest even for AI (User requested)

                if (score > maxScore) {
                    maxScore = score;
                    bestTarget = t;
                }
            }
        });

        if (bestTarget) {
            this.target = bestTarget;
            this.isBusy = true;
            this.moveToTarget();
        } else {
            // Return home
            if (Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY) > 10) {
                this.scene.tweens.add({
                    targets: this,
                    x: this.homeX,
                    y: this.homeY,
                    duration: 1000,
                    onComplete: () => { }
                });
            }
        }
    }

    private speedMult: number = 1.0;

    public setSpeedMultiplier(m: number) {
        this.speedMult = m;
    }

    private moveToTarget() {
        if (!this.target || this.target.isDestroyed) {
            this.isBusy = false;
            this.target = null;
            return;
        }

        const gm = GameManager.getInstance();
        const speed = gm.droneSpeed * this.speedMult;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        const duration = Math.max(100, (dist / speed) * 1000);

        // Store target reference for callback
        const currentTarget = this.target;

        this.scene.tweens.add({
            targets: this,
            x: currentTarget.x,
            y: currentTarget.y,
            duration: duration,
            onComplete: () => {
                if (!this.scene) return; // Safety check
                // Check if target still exists and is close enough
                if (currentTarget && !currentTarget.isDestroyed) {
                    const finalDist = Phaser.Math.Distance.Between(this.x, this.y, currentTarget.x, currentTarget.y);
                    if (finalDist < 80) {
                        currentTarget.onClicked(true); // Force critical for drone
                    }
                }

                // AI Chain Logic (Level > 0 check)
                const ai = gm.getUpgrade('drone_ai');
                if (ai && ai.level > 0 && gm.dronesActive) {
                    this.isBusy = false; // Reset busy flag to allow finding new target
                    this.target = null;
                    this.findTarget(); // Chain immediately
                } else {
                    this.returnHome();
                }
            }
        });
    }

    private returnHome() {
        if (!this.scene) return; // Safety check

        const gm = GameManager.getInstance();
        const speed = gm.droneSpeed;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY);
        const duration = (dist / speed) * 1000;

        this.scene.tweens.add({
            targets: this,
            x: this.homeX,
            y: this.homeY,
            duration: duration,
            onComplete: () => {
                if (!this.scene) return;
                this.isBusy = false;
                this.target = null;
            }
        });
    }
}
