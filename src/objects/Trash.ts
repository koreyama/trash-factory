import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';

export type TrashType = 'general' | 'plastic' | 'metal' | 'circuit' | 'bio';


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
        } else {
            // Box or Metal
            this.setBody({ type: 'rectangle', width: 40, height: 40 });
            if (type === 'metal') this.setDensity(0.005);
            else this.setDensity(0.001);
        }

        if (type === 'general') {
            this.setVelocity(Phaser.Math.Between(-2, 2), Phaser.Math.Between(0, 5));
        }

        this.setFriction(0.5);
        if (type !== 'bio') this.setBounce(0.2);

        this.setInteractive();
        // Use wrapper to prevent Pointer object from being passed as forceCrit
        this.on('pointerdown', () => this.onClicked(false), this);
    }

    public onClicked(forceCrit: boolean = false): void {
        if (this.isDestroyed) return;

        this.destroyTrash(forceCrit);
    }

    public destroyTrash(forceCrit: boolean = false): void {
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

        if (this.trashType === 'general') {
            gm.addMoney(value);
        } else if (this.trashType === 'plastic') {
            gm.addResource('plastic', gm.plasticPerTrash);
            gm.addMoney(Math.floor(value * 1.5));
        } else if (this.trashType === 'metal') {
            gm.addResource('metal', 1);
            gm.addMoney(Math.floor(value * 3.0));
        } else if (this.trashType === 'circuit') {
            gm.addResource('circuit', 1);
            gm.addMoney(Math.floor(value * 5.0));
        } else if (this.trashType === 'bio') {
            gm.addResource('bioCell', 1);
            gm.addMoney(Math.floor(value * 4.0));
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
