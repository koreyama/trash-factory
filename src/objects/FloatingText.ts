import Phaser from 'phaser';
import { Theme } from '../managers/Theme';

export class FloatingText extends Phaser.GameObjects.Text {
    constructor(scene: Phaser.Scene, x: number, y: number, text: string, color: string = '#00ff00') {
        super(scene, x, y, text, {
            ...Theme.styles.textMain,
            color: color,
            fontSize: '24px',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        // ...

        scene.add.existing(this);
        this.setOrigin(0.5);

        // Animation: Float up and fade out
        scene.tweens.add({
            targets: this,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
    }
}
