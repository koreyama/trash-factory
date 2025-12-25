import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';

export class FacilitiesScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FacilitiesScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Dim Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
            .setInteractive();

        // Title
        this.add.text(width / 2, 60, '設備管理', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '32px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Close Button
        this.add.text(width - 50, 50, '✕', {
            fontSize: '32px',
            color: '#ffffff'
        })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.stop();
                this.scene.resume('MainScene');
            });

        // Content Container
        const container = this.add.container(width / 2, 120);

        this.createList(container);
    }

    private createList(container: Phaser.GameObjects.Container) {
        const gm = GameManager.getInstance();
        let yPos = 0;
        const gap = 75; // Slightly reduced to fit more

        // Helper to check upgrade level
        const has = (id: string) => {
            const up = gm.getUpgrade(id);
            return up && up.level > 0;
        };

        const addItem = (title: string, desc: string, isOn: boolean, onToggle: () => void) => {
            const bg = this.add.graphics();
            bg.fillStyle(0x333333, 1);
            bg.fillRoundedRect(-250, -35, 500, 70, 10);
            bg.lineStyle(2, isOn ? 0x00ff00 : 0x555555, 1);
            bg.strokeRoundedRect(-250, -35, 500, 70, 10);

            const titleText = this.add.text(-230, -25, title, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '20px',
                color: isOn ? '#ffffff' : '#aaaaaa',
                fontStyle: 'bold'
            });

            const descText = this.add.text(-230, 5, desc, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '14px',
                color: '#888888'
            });

            const statusText = this.add.text(230, 0, isOn ? '稼働中' : '停止中', {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '18px',
                color: isOn ? '#00ff00' : '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);

            // Toggle Button Area
            const hitArea = this.add.rectangle(0, 0, 500, 70, 0xffffff, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    SoundManager.getInstance().play('click');
                    onToggle();
                    // Refresh visuals
                    this.scene.restart(); // Simple refresh
                });

            // Set positions relative to container, not local
            // Reset local positions first? No, default is 0.
            // Actually, we are adding them to 'container'.
            // So we just set their properties.
            const elements = [bg, titleText, descText, statusText, hitArea];
            elements.forEach(el => {
                // Background and hitArea are centered or relative to 0
                // Text is relative to 0
                // We shift them by yPos
                if (el instanceof Phaser.GameObjects.Graphics) {
                    el.y = yPos;
                } else if (el instanceof Phaser.GameObjects.Rectangle) {
                    el.y = yPos;
                } else {
                    // Text objects need offset
                    // titleText was -25, so now yPos - 25
                    // But if I set .y = yPos, it overrides original Y?
                    // Yes. So I should set y properly.
                    if (el === titleText) el.y = yPos - 25;
                    if (el === descText) el.y = yPos + 5;
                    if (el === statusText) el.y = yPos;
                }
            });

            container.add(elements);
            yPos += gap;
        };

        const addSlider = (label: string, value: number, onChange: (v: number) => void) => {
            const bg = this.add.graphics();
            bg.fillStyle(0x333333, 1);
            bg.fillRoundedRect(-250, -35, 500, 70, 10);
            bg.lineStyle(1, 0x00d2d3, 0.5);
            bg.strokeRoundedRect(-250, -35, 500, 70, 10);

            const titleText = this.add.text(-230, -25, label, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '18px',
                color: '#00d2d3',
                fontStyle: 'bold'
            });

            const barWidth = 300;
            const barX = 50; // Offset from center
            const bar = this.add.rectangle(barX, 0, barWidth, 4, 0x555555);

            const handleX = barX - (barWidth / 2) + (value * barWidth);
            const handle = this.add.circle(handleX, 0, 10, 0x00d2d3).setInteractive({ draggable: true, useHandCursor: true });

            const valText = this.add.text(230, 0, `${Math.round(value * 100)}%`, {
                fontFamily: '"Orbitron", monospace',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(1, 0.5);

            this.input.setDraggable(handle);
            handle.on('drag', (_p: any, dragX: number) => {
                const min = barX - barWidth / 2;
                const max = barX + barWidth / 2;
                const clampedX = Phaser.Math.Clamp(dragX, min, max);
                handle.x = clampedX;
                const v = (clampedX - min) / barWidth;
                valText.setText(`${Math.round(v * 100)}%`);
                onChange(v);
            });

            handle.on('dragend', () => {
                SoundManager.getInstance().play('hover');
                gm.save(); // Save preference
            });

            const elements = [bg, titleText, bar, handle, valText];
            elements.forEach(el => {
                if (el instanceof Phaser.GameObjects.Graphics) el.y = yPos;
                else if (el instanceof Phaser.GameObjects.Rectangle) el.y = yPos;
                else if (el instanceof Phaser.GameObjects.Arc) el.y = yPos;
                else if (el === titleText) el.y = yPos - 25;
                else el.y = yPos;
            });

            container.add(elements);
            yPos += gap;
        };

        // 1. Drone System
        if (gm.droneUnlocked) {
            addItem('ドローン配送システム', '自律的にゴミを回収します', gm.dronesActive, () => {
                gm.dronesActive = !gm.dronesActive;
            });
        }

        // 2. Conveyor Belt
        if (gm.conveyorUnlocked) {
            addItem('ベルトコンベア', '自動で精製所へ搬送します', gm.conveyorActive, () => {
                gm.conveyorActive = !gm.conveyorActive;
            });
        }

        // 3. Laser Grid
        if (has('laser_grid')) {
            addItem('防衛レーザーグリッド', 'クリックでゴミを消滅させます', gm.laserActive, () => {
                gm.laserActive = !gm.laserActive;
            });
        }

        // 4. Magnet Field
        if (has('magnet_field')) {
            addItem('磁力フィールド', '金属ゴミを中心に引き寄せます', gm.magnetActive, () => {
                gm.magnetActive = !gm.magnetActive;
            });
        }

        // --- Vacuum Tuning ---
        if (has('vacuum_unlock')) {
            addSlider('吸引装置：出力', gm.vacuumPowerPref, (v) => {
                gm.vacuumPowerPref = v;
            });
            addSlider('吸引装置：範囲', gm.vacuumRangePref, (v) => {
                gm.vacuumRangePref = v;
            });
        }

        // 5. Gravity Control
        if (has('gravity_manipulator')) {
            addItem('重力制御', 'ゴミの落下速度を低下させます', gm.gravityActive, () => {
                gm.gravityActive = !gm.gravityActive;
                // Apply immediately if possible? MainScene updates in loop mostly.
            });
        }

        // 6. Nanobots
        if (has('nanobot_swarm')) {
            addItem('ナノボット', '画面全体のゴミを徐々に分解', gm.nanobotsActive, () => {
                gm.nanobotsActive = !gm.nanobotsActive;
            });
        }

        // 5. Black Hole
        if (has('black_hole_unlock')) {
            // Special logic for Black Hole? Just Toggle.
            // It has stability logic but let's just toggle the "Active" state.
            // Or maybe trigger singular collapse?
            // "Toggle" usually means Enable/Disable automatic behavior or just turn it on/off.
            // In MainScene, button toggled stability/active.
            // Let's assume on/off.
            addItem('人工ブラックホール', '究極のゴミ処理装置', gm.blackHoleActive, () => {
                gm.blackHoleActive = !gm.blackHoleActive;
            });
        }
    }
}
