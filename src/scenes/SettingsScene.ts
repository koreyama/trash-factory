import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';

export class SettingsScene extends Phaser.Scene {
    private callerScene: string = 'TitleScene';

    constructor() {
        super({ key: 'SettingsScene' });
    }

    init(data: { caller?: string }) {
        this.callerScene = data.caller || 'TitleScene';
    }

    create() {
        const { width, height } = this.scale;

        // Semi-transparent overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        // Panel
        const panelWidth = 700;
        const panelHeight = 600;
        const panelX = width / 2 - panelWidth / 2;
        const panelY = height / 2 - panelHeight / 2;

        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a2e, 1);
        panel.lineStyle(2, 0x0984e3, 1);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 15);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 15);

        // Title
        this.add.text(width / 2, panelY + 50, '⚙️ 設定', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '42px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Settings Section
        let yPos = panelY + 130;
        const leftX = panelX + 50;

        // Section: Game Info
        this.addSectionHeader(leftX, yPos, 'ゲーム情報');
        yPos += 50;

        const gm = GameManager.getInstance();
        this.addInfoRow(leftX, yPos, '累計獲得金額', `¥${gm.totalMoney.toLocaleString()}`);
        yPos += 35;
        this.addInfoRow(leftX, yPos, '累計プラスチック', `${gm.totalPlastic.toLocaleString()}`);
        yPos += 35;
        this.addInfoRow(leftX, yPos, '累計金属', `${gm.totalMetal.toLocaleString()}`);
        yPos += 35;
        this.addInfoRow(leftX, yPos, 'プレス回数', `${gm.pressCount.toLocaleString()}回`);
        yPos += 60;

        // Section: Settings Options
        this.addSectionHeader(leftX, yPos, '設定オプション');
        yPos += 50;

        // Back to Title Button
        this.createButton(width / 2 - 120, yPos, 'タイトルへ戻る', () => {
            SoundManager.getInstance().play('click');
            this.scene.stop('MainScene');
            this.scene.stop();
            this.scene.start('TitleScene');
        }, 0x636e72);

        // Data Reset Button
        this.createButton(width / 2 + 120, yPos, 'データリセット', () => {
            SoundManager.getInstance().play('click');
            this.showConfirmDialog();
        }, 0xe74c3c);

        yPos += 80;

        // Version Info
        this.add.text(width / 2, panelY + panelHeight - 80, 'Cyber Trash Press v1.0.0\n© 2024', {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '14px',
            color: '#666666',
            align: 'center'
        }).setOrigin(0.5);

        // Close Button
        this.createButton(width / 2, panelY + panelHeight - 30, '閉じる', () => {
            SoundManager.getInstance().play('click');
            this.scene.stop();
            if (this.callerScene === 'MainScene') {
                this.scene.resume('MainScene');
            } else {
                this.scene.resume('TitleScene');
            }
        }, 0x0984e3);
    }

    private addSectionHeader(x: number, y: number, text: string) {
        this.add.text(x, y, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '20px',
            color: '#74b9ff',
            fontStyle: 'bold'
        });

        const line = this.add.graphics();
        line.lineStyle(1, 0x74b9ff, 0.5);
        line.beginPath();
        line.moveTo(x, y + 28);
        line.lineTo(x + 600, y + 28);
        line.strokePath();
    }

    private addInfoRow(x: number, y: number, label: string, value: string) {
        this.add.text(x, y, label, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#aaaaaa'
        });
        this.add.text(x + 600, y, value, {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(1, 0);
    }

    private showConfirmDialog() {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        overlay.setDepth(100);
        overlay.setInteractive();

        const dialogWidth = 500;
        const dialogHeight = 280;

        const dialog = this.add.graphics();
        dialog.fillStyle(0x2d3436, 1);
        dialog.lineStyle(3, 0xe74c3c, 1);
        dialog.fillRoundedRect(width / 2 - dialogWidth / 2, height / 2 - dialogHeight / 2, dialogWidth, dialogHeight, 10);
        dialog.strokeRoundedRect(width / 2 - dialogWidth / 2, height / 2 - dialogHeight / 2, dialogWidth, dialogHeight, 10);
        dialog.setDepth(101);

        const warningText = this.add.text(width / 2, height / 2 - 60, '⚠️ 警告 ⚠️', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '32px',
            color: '#ff6b6b',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(102);

        const msgText = this.add.text(width / 2, height / 2, '本当にすべてのデータを\n削除しますか？\nこの操作は取り消せません。', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(102);

        // Confirm Button
        const confirmBtn = this.createSmallButton(width / 2 - 100, height / 2 + 80, 'はい、削除', () => {
            GameManager.getInstance().resetData();
            this.scene.stop('MainScene');
            this.scene.stop();
            this.scene.start('TitleScene');
        }, 0xe74c3c);
        confirmBtn.setDepth(103);

        // Cancel Button  
        const cancelBtn = this.createSmallButton(width / 2 + 100, height / 2 + 80, 'キャンセル', () => {
            overlay.destroy();
            dialog.destroy();
            warningText.destroy();
            msgText.destroy();
            confirmBtn.destroy();
            cancelBtn.destroy();
        }, 0x636e72);
        cancelBtn.setDepth(103);
    }

    private createButton(x: number, y: number, text: string, callback: () => void, color: number) {
        const btnWidth = 200;
        const btnHeight = 50;

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);

        const label = this.add.text(0, 0, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', callback);

        hitArea.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            bg.clear();
            bg.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(20).color, 1);
            bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        });
        hitArea.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(color, 1);
            bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 8);
        });

        container.add([bg, label, hitArea]);
        return container;
    }

    private createSmallButton(x: number, y: number, text: string, callback: () => void, color: number) {
        const btnWidth = 150;
        const btnHeight = 45;

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 6);

        const label = this.add.text(0, 0, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', callback);

        container.add([bg, label, hitArea]);
        return container;
    }
}
