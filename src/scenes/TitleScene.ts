import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        this.add.text(width / 2, height * 0.3, 'TRASH FACTORY', {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '80px',
            color: '#e67e22', // Industrial Orange
            fontStyle: 'bold',
            stroke: '#d35400',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height * 0.4, 'トラッシュファクトリー', {
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            fontSize: '32px',
            color: '#bdc3c7'
        }).setOrigin(0.5);

        // Start Button
        this.createButton(width / 2, height * 0.55, 'ゲーム開始', () => {
            this.scene.start('MainScene');
        });

        // Settings Button
        this.createButton(width / 2, height * 0.65, '設定', () => {
            this.scene.launch('SettingsScene');
            this.scene.pause();
        });

        // Version
        this.add.text(width - 30, height - 30, 'v1.0.0', {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '16px',
            color: '#666666'
        }).setOrigin(1);
    }

    private createButton(x: number, y: number, text: string, callback: () => void) {
        const btnWidth = 300;
        const btnHeight = 60;

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x0984e3, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);

        const label = this.add.text(0, 0, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });

        hitArea.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x74b9ff, 1);
            bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
        });

        hitArea.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x0984e3, 1);
            bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 10);
        });

        hitArea.on('pointerdown', callback);

        container.add([bg, label, hitArea]);
        return container;
    }
}
