import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';

export type TrashType = 'general' | 'plastic' | 'metal' | 'circuit' | 'bio' | 'battery' | 'medical' | 'nuclear' | 'satellite' | 'quantum';


export class Trash extends Phaser.Physics.Matter.Image {
    public isDestroyed: boolean = false;
    public trashType: TrashType = 'general';

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, type: TrashType = 'general') {
        super(scene.matter.world, x, y, texture);
        this.trashType = type;
        scene.add.existing(this);

        // Set physical properties based on texture/type
        if (texture === 'trash-circle') {
            this.setBody({ type: 'circle', radius: 20 });
            this.setDensity(0.002);
        } else if (texture === 'trash-plastic') {
            this.setBody({ type: 'rectangle', width: 30, height: 50 });
            this.setDensity(0.0015);
        } else if (texture === 'trash-circuit') {
            this.setBody({ type: 'rectangle', width: 32, height: 32 });
            this.setDensity(0.004);
        } else if (texture === 'trash-bio') {
            this.setBody({ type: 'circle', radius: 18 });
            this.setDensity(0.001);
            this.setBounce(0.6); // Bouncy bio waste
        } else if (texture === 'trash-battery') {
            this.setBody({ type: 'rectangle', width: 20, height: 45 });
            this.setDensity(0.006);
        } else if (texture === 'trash-medical') {
            this.setBody({ type: 'rectangle', width: 35, height: 35 });
            this.setDensity(0.002);
            this.setBounce(0.1);
        } else if (texture === 'trash-nuclear') {
            this.setBody({ type: 'circle', radius: 22 });
            this.setDensity(0.008);
        } else if (texture === 'trash-satellite') {
            this.setBody({ type: 'rectangle', width: 50, height: 30 });
            this.setDensity(0.003);
            this.setBounce(0.3);
        } else if (texture === 'trash-quantum') {
            this.setBody({ type: 'rectangle', width: 25, height: 25 });
            this.setDensity(0.01);
            this.setBounce(0.5);
        } else {
            // Box or Metal
            this.setBody({ type: 'rectangle', width: 40, height: 40 });
            if (type === 'metal') this.setDensity(0.005);
            else this.setDensity(0.001);
        }

        if (type === 'general') {
            this.setVelocity(Phaser.Math.Between(-2, 2), Phaser.Math.Between(0, 5));
        }

        this.setFriction(0.005); // Very low surface friction
        this.setFrictionAir(0.0005); // Extremely low air resistance for flinging
        if (type !== 'bio') this.setBounce(0.2);

        this.setInteractive();
        // Use wrapper to prevent Pointer object from being passed as forceCrit
        this.on('pointerdown', () => this.onClicked(false), this);
    }

    public onClicked(forceCrit: boolean = false): void {
        if (this.isDestroyed) return;

        // Manual click is always NOT forceCrit (drones use forceCrit=true)
        // Actually, let's use a more explicit check or just assume clicked = manual
        this.destroyTrash(forceCrit, !forceCrit); // Drones use forceCrit, so !forceCrit is true for manual clicks
    }

    public destroyTrash(forceCrit: boolean = false, isManual: boolean = false): void {
        this.isDestroyed = true;

        const gm = GameManager.getInstance();
        let value = Math.floor(gm.trashValue * gm.marketingMultiplier);

        // Gold Trash Check
        const isGold = this.getData('isGold');
        if (isGold) {
            value *= gm.goldTrashMultiplier; // Apply gold multiplier
        }

        // Rainbow Trash Check (super rare = 50x value)
        const isRainbow = this.getData('isRainbow');
        if (isRainbow) {
            value *= 50;
        }

        // Crit Check (forced for drone)
        let isCrit = forceCrit;
        if (!isCrit && Math.random() < gm.critChance) {
            isCrit = true;
        }
        if (isCrit) {
            value *= 3;
        }

        const calcValue = () => {
            if (this.trashType === 'general') return value;
            if (this.trashType === 'plastic') return Math.floor(value * 1.5);
            if (this.trashType === 'metal') return Math.floor(value * 3.0);
            if (this.trashType === 'circuit') return Math.floor(value * 5.0);
            if (this.trashType === 'bio') return Math.floor(value * 4.0);
            if (this.trashType === 'battery') return Math.floor(value * 6.0);
            if (this.trashType === 'medical') return Math.floor(value * 5.0);
            if (this.trashType === 'nuclear') return Math.floor(value * 8.0);
            if (this.trashType === 'satellite') return Math.floor(value * 10.0);
            if (this.trashType === 'quantum') return Math.floor(value * 15.0);
            return value;
        };

        const finalMoney = calcValue();

        if (isManual) {
            gm.incrementPressCheck(); // Track manual collection
            gm.addMoney(finalMoney);
        } else {
            gm.addMoney(finalMoney);
        }

        if (this.trashType === 'plastic') {
            gm.addResource('plastic', gm.plasticPerTrash);
        } else if (this.trashType === 'metal') {
            gm.addResource('metal', 1);
        } else if (this.trashType === 'circuit') {
            gm.addResource('circuit', 1);
        } else if (this.trashType === 'bio') {
            gm.addResource('bioCell', 1);
        } else if (this.trashType === 'battery') {
            gm.addResource('rareMetal', 1);
        } else if (this.trashType === 'medical') {
            gm.addResource('bioCell', 2);
        } else if (this.trashType === 'nuclear') {
            gm.addResource('radioactive', 1);
        } else if (this.trashType === 'satellite') {
            gm.addResource('darkMatter', 1);
        } else if (this.trashType === 'quantum') {
            gm.addResource('quantumCrystal', 1);
        }

        this.scene.events.emit('trash-destroyed', { x: this.x, y: this.y, amount: value, type: this.trashType, isCrit, isGold, isRainbow });
        this.scene.events.emit('update-money');

        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            scaleY: 0,
            duration: 100,
            onComplete: () => { this.destroy(); }
        });
    }
}
