import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';


export class SettingsScene extends Phaser.Scene {
    private callerScene: string = 'TitleScene';
    private activeTab: 'config' | 'stats' | 'system' = 'config';
    private contentContainer!: Phaser.GameObjects.Container;
    private tabButtons: any[] = [];
    private timeText: Phaser.GameObjects.Text | null = null;

    constructor() {
        super({ key: 'SettingsScene' });
    }

    init(data: { caller?: string }) {
        this.callerScene = data.caller || 'TitleScene';
    }

    create() {
        this.tabButtons = [];
        this.timeText = null;

        const { width, height } = this.scale;

        // Dark Overlay
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        // Main Panel (Cyberpunk Style)
        const panelWidth = 800;
        const panelHeight = 600;
        const panelX = width / 2 - panelWidth / 2;
        const panelY = height / 2 - panelHeight / 2;

        const panel = this.add.graphics();
        panel.fillStyle(0x0f0f1a, 1);
        panel.lineStyle(2, 0x00d2d3, 1);
        panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

        // Sidebar Background
        const sidebarWidth = 200;
        const sidebar = this.add.graphics();
        sidebar.fillStyle(0x1a1a2e, 1);
        sidebar.fillRect(panelX, panelY, sidebarWidth, panelHeight);

        // Sidebar Border Line
        const line = this.add.graphics();
        line.lineStyle(1, 0x00d2d3, 0.5);
        line.lineBetween(panelX + sidebarWidth, panelY, panelX + sidebarWidth, panelY + panelHeight);

        // Title
        this.add.text(panelX + 20, panelY + 30, 'SETTINGS', {
            fontFamily: '"Orbitron", monospace',
            fontSize: '32px',
            color: '#00d2d3',
            fontStyle: 'bold'
        });

        // Tabs
        this.createTabButton(panelX, panelY + 100, '設定 (Config)', 'config');
        this.createTabButton(panelX, panelY + 160, '統計 (Stats)', 'stats');
        this.createTabButton(panelX, panelY + 220, 'システム (System)', 'system');

        // Content Area
        this.contentContainer = this.add.container(panelX + sidebarWidth + 20, panelY + 20);

        // Close Button (X) - Top Right
        const closeBtn = this.add.text(panelX + panelWidth - 20, panelY + 20, '×', {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#ff6b6b',
            fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            SoundManager.getInstance().play('click');
            this.handleClose();
        });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ff9f9f'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ff6b6b'));

        // Initial Render
        this.switchTab('config');

        // Ensure volume is synced
        SoundManager.getInstance().setVolume(GameManager.getInstance().settings.volume);
    }

    update(_time: number, delta: number) {
        // Track time while in settings (since MainScene is paused)
        const gm = GameManager.getInstance();
        gm.playTime += delta;

        // Update Clock UI if visible
        if (this.activeTab === 'stats' && this.timeText) {
            this.timeText.setText(this.formatTime(gm.playTime));
        }
    }

    private formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    private createTabButton(x: number, y: number, label: string, key: 'config' | 'stats' | 'system') {
        const width = 200;
        const height = 50;

        const container = this.add.container(x, y);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        // Selection Indicator (Left Bar)
        const bar = this.add.rectangle(0, height / 2, 4, height, 0x00d2d3).setOrigin(0, 0.5).setVisible(false);

        const text = this.add.text(20, height / 2, label, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '16px',
            color: '#888888'
        }).setOrigin(0, 0.5);

        bg.on('pointerdown', () => {
            SoundManager.getInstance().play('click');
            this.switchTab(key);
        });

        bg.on('pointerover', () => {
            text.setColor('#ffffff');
            SoundManager.getInstance().play('hover');
        });

        bg.on('pointerout', () => {
            if (this.activeTab !== key) text.setColor('#888888');
        });

        container.add([bg, bar, text]);

        this.tabButtons.push({ key, container, bg, bar, text });
    }

    private switchTab(key: 'config' | 'stats' | 'system') {
        this.activeTab = key;

        // Update Sidebar UI
        this.tabButtons.forEach(btn => {
            const isActive = btn.key === key;
            btn.bar.setVisible(isActive);
            btn.text.setColor(isActive ? '#00d2d3' : '#888888');
            btn.bg.setFillStyle(isActive ? 0x2d3436 : 0x000000, isActive ? 0.3 : 0);
        });

        this.contentContainer.removeAll(true);
        this.timeText = null; // Clear reference

        switch (key) {
            case 'config':
                this.renderConfig();
                break;
            case 'stats':
                this.renderStats();
                break;
            case 'system':
                this.renderSystem();
                break;
        }
    }

    private renderConfig() {
        const gm = GameManager.getInstance();
        let yPos = 20;

        this.addHeader('オーディオ設定', yPos);
        yPos += 50;

        this.createSlider(0, yPos, '音量 (Master)', gm.settings.volume, (val) => {
            gm.settings.volume = val;
            SoundManager.getInstance().setVolume(val);
            gm.save();
        });
        yPos += 50;

        this.createSlider(0, yPos, 'BGM音量', gm.settings.bgmVolume, (val) => {
            gm.settings.bgmVolume = val;
            SoundManager.getInstance().setBgmVolume(val);
            gm.save();
        });
        yPos += 50;

        this.createSlider(0, yPos, '効果音音量', gm.settings.sfxVolume, (val) => {
            gm.settings.sfxVolume = val;
            SoundManager.getInstance().setSfxVolume(val);
            gm.save();
        });
        yPos += 70;

        this.addHeader('グラフィック & ゲーム', yPos);
        yPos += 50;

        this.createCheckbox(0, yPos, '画面揺れ (Screen Shake)', gm.settings.screenShake, (val) => {
            gm.settings.screenShake = val;
            gm.save();
        });
        yPos += 45;

        this.createCheckbox(0, yPos, 'パーティクル表示 (軽量化)', gm.settings.particles, (val) => {
            gm.settings.particles = val;
            gm.save();
        });
        yPos += 45;

        this.createCheckbox(0, yPos, 'オートセーブ 有効', true, (_val) => {
            // Placeholder for now
            gm.save();
        });
    }

    private renderStats() {
        const gm = GameManager.getInstance();
        let yPos = 20;

        this.addHeader('プレイ統計', yPos);
        yPos += 60;

        const addStat = (label: string, value: string) => {
            this.contentContainer.add(this.add.text(0, yPos, label, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '18px',
                color: '#aaaaaa'
            }));
            const valText = this.add.text(500, yPos, value, {
                fontFamily: '"Orbitron", monospace',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(1, 0);
            this.contentContainer.add(valText);
            yPos += 35; // Tighter spacing to fit 9 items + time
            return valText;
        };

        // Realtime Clock
        this.contentContainer.add(this.add.text(0, yPos, 'プレイ時間', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#00d2d3'
        }));
        this.timeText = this.add.text(500, yPos, this.formatTime(gm.playTime), {
            fontFamily: '"Orbitron", monospace',
            fontSize: '18px',
            color: '#00d2d3'
        }).setOrigin(1, 0);
        this.contentContainer.add(this.timeText);
        yPos += 50;

        const stats = [
            { label: '累計獲得金額', val: `¥${gm.totalMoney.toLocaleString()}` },
            { label: '累計プラスチック', val: gm.totalPlastic.toLocaleString() },
            { label: '累計金属', val: gm.totalMetal.toLocaleString() },
            { label: '累計電子基板', val: gm.totalCircuit.toLocaleString() },
            { label: '累計バイオセル', val: gm.totalBioCell.toLocaleString() },
            { label: '累計レアメタル', val: gm.totalRareMetal.toLocaleString() },
            { label: '累計放射性物質', val: gm.totalRadioactive.toLocaleString() },
            { label: '累計ダークマター', val: gm.totalDarkMatter.toLocaleString() },
            { label: '累計量子結晶', val: gm.totalQuantumCrystal.toLocaleString() },
        ];

        stats.forEach(s => addStat(s.label, s.val));
    }

    private renderSystem() {
        let yPos = 20;
        this.addHeader('システムメニュー', yPos);
        yPos += 80;

        // Back to Title
        this.createButton(150, yPos, 'タイトルへ戻る', () => {
            SoundManager.getInstance().play('click');
            // Complete reload ensures all singletons are fresh and prevents transition freezes
            window.location.reload();
        }, 0x636e72);

        yPos += 70;

        // Reset Data
        this.createButton(150, yPos, 'セーブデータ削除', () => {
            SoundManager.getInstance().play('click');
            this.showConfirmDialog();
        }, 0xe74c3c);
    }

    private handleClose() {
        this.scene.stop();
        if (this.callerScene === 'MainScene') {
            this.scene.resume('MainScene');
        } else {
            this.scene.resume('TitleScene');
        }
    }

    private addHeader(text: string, y: number) {
        const header = this.add.text(0, y, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '22px',
            color: '#00d2d3',
            fontStyle: 'bold'
        });
        const line = this.add.graphics();
        line.lineStyle(2, 0x00d2d3, 0.5);
        line.lineBetween(0, y + 35, 550, y + 35);

        this.contentContainer.add([header, line]);
    }

    private createCheckbox(x: number, y: number, label: string, initial: boolean, onChange: (val: boolean) => void) {
        const labelText = this.add.text(x, y, label, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#dddddd'
        }).setOrigin(0, 0.5);

        const box = this.add.rectangle(x + 450, y, 30, 30).setStrokeStyle(2, 0xffffff);
        const check = this.add.text(x + 450, y, '✔', {
            fontSize: '24px',
            color: '#00ff00'
        }).setOrigin(0.5).setVisible(initial);

        box.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                const newVal = !check.visible;
                check.setVisible(newVal);
                onChange(newVal);
            });

        this.contentContainer.add([labelText, box, check]);
    }

    private createSlider(x: number, y: number, label: string, initial: number, onChange: (val: number) => void) {
        const labelText = this.add.text(x, y, label, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#dddddd'
        }).setOrigin(0, 0.5);

        const barWidth = 200;
        const barX = x + 450;

        const bar = this.add.rectangle(barX, y, barWidth, 4, 0x555555);

        const handleX = barX - (barWidth / 2) + (initial * barWidth);
        const handle = this.add.circle(handleX, y, 10, 0x3498db).setInteractive({ draggable: true, useHandCursor: true });

        this.input.setDraggable(handle);

        handle.on('drag', (_pointer: any, dragX: number, _dragY: number) => {
            const min = barX - barWidth / 2;
            const max = barX + barWidth / 2;
            const clampedX = Phaser.Math.Clamp(dragX, min, max);
            handle.x = clampedX;

            const val = (clampedX - min) / barWidth;
            onChange(val);
        });

        handle.on('dragend', () => {
            SoundManager.getInstance().play('hover');
        });

        this.contentContainer.add([labelText, bar, handle]);
    }

    private createButton(x: number, y: number, text: string, callback: () => void, color: number) {
        const btnWidth = 200;
        const btnHeight = 50;

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);

        const label = this.add.text(btnWidth / 2, btnHeight / 2, text, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(btnWidth / 2, btnHeight / 2, btnWidth, btnHeight, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', callback);

        hitArea.on('pointerover', () => {
            SoundManager.getInstance().play('hover');
            bg.clear();
            bg.fillStyle(Phaser.Display.Color.ValueToColor(color).darken(20).color, 1);
            bg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
        });
        hitArea.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(color, 1);
            bg.fillRoundedRect(0, 0, btnWidth, btnHeight, 8);
        });

        container.add([bg, label, hitArea]);
        this.contentContainer.add(container);
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
        const createDialogButton = (x: number, y: number, txt: string, col: number, cb: () => void) => {
            const btn = this.add.container(x, y).setDepth(103);
            const b = this.add.graphics();
            b.fillStyle(col, 1);
            b.fillRoundedRect(-75, -22, 150, 45, 6);
            const t = this.add.text(0, 0, txt, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
            const h = this.add.rectangle(0, 0, 150, 45, 0, 0).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
            btn.add([b, t, h]);
            return btn;
        };

        const confirmBtn = createDialogButton(width / 2 - 100, height / 2 + 80, 'はい、削除', 0xe74c3c, () => {
            SoundManager.getInstance().play('click');
            GameManager.getInstance().resetData();
            // Definitive fix for singleton freeze: Complete Page Reload
            window.location.reload();
        });

        const cancelBtn = createDialogButton(width / 2 + 100, height / 2 + 80, 'キャンセル', 0x636e72, () => {
            SoundManager.getInstance().play('click');
            overlay.destroy();
            dialog.destroy();
            warningText.destroy();
            msgText.destroy();
            confirmBtn.destroy();
            cancelBtn.destroy();
        });
    }

}
