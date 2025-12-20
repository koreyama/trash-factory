import { GameManager } from '../managers/GameManager';
import { Theme } from '../managers/Theme';
import { SoundManager } from '../managers/SoundManager';

export class AchievementScene extends Phaser.Scene {
    private scrollContainer!: Phaser.GameObjects.Container;
    private scrollY: number = 0;
    private maxScrollY: number = 0;
    private isDragging: boolean = false;
    private lastPointerY: number = 0;

    constructor() {
        super({ key: 'AchievementScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, Number(Theme.colors.bg.replace('#', '0x')), 1).setOrigin(0);

        // Header (fixed)
        this.add.text(width / 2, 60, 'ACHIEVEMENTS', {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '52px',
            color: '#ff9f43',
            fontStyle: 'bold',
            stroke: '#d35400',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Close Button (fixed)
        this.add.text(width - 50, 40, '✕', {
            fontSize: '32px',
            color: '#ffffff'
        })
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.stop();
                this.scene.resume('MainScene');
            });

        // Create scrollable container
        this.scrollContainer = this.add.container(0, 130);
        this.createList();

        // Scroll mask
        const maskGraphics = this.make.graphics({});
        maskGraphics.fillRect(0, 130, width, height - 130);
        const mask = maskGraphics.createGeometryMask();
        this.scrollContainer.setMask(mask);

        // Scroll input
        this.input.on('wheel', (_pointer: any, _go: any, _dx: number, dy: number) => {
            this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScrollY);
            this.scrollContainer.y = 130 - this.scrollY;
        });

        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            if (ptr.y > 130) {
                this.isDragging = true;
                this.lastPointerY = ptr.y;
            }
        });
        this.input.on('pointerup', () => this.isDragging = false);
        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
            if (this.isDragging) {
                const delta = this.lastPointerY - ptr.y;
                this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScrollY);
                this.scrollContainer.y = 130 - this.scrollY;
                this.lastPointerY = ptr.y;
            }
        });

        // Total count display  
        const gm = GameManager.getInstance();
        const unlocked = gm.achievements.filter(a => a.unlocked).length;

        const total = gm.achievements.length;
        this.add.text(width - 50, 60, `${unlocked} / ${total}`, {
            fontFamily: '"Orbitron", monospace',
            fontSize: '32px',
            color: '#e67e22',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(1, 0.5);
    }

    private createList() {
        const gm = GameManager.getInstance();
        const gap = 85;
        const width = this.scale.width;

        gm.achievements.forEach((ach, index) => {
            const y = index * gap + 50;
            const isUnlocked = ach.unlocked;

            const row = this.add.container(0, y);

            // Card Background
            const bg = this.add.graphics();
            // Darker BG for locked, slightly lighter for unlocked
            const bgColor = isUnlocked ? 0x222f3e : 0x0f0f15;
            const strokeColor = isUnlocked ? 0xe67e22 : 0x333333; // Orange unlock, Grey lock

            bg.fillStyle(bgColor, 1);
            bg.fillRoundedRect(width / 2 - 400, 0, 800, 75, 8);
            bg.lineStyle(2, strokeColor, 1);
            bg.strokeRoundedRect(width / 2 - 400, 0, 800, 75, 8);

            // Icon (Circle)
            const iconColor = isUnlocked ? 0xff9f43 : 0x2d3436;
            const icon = this.add.circle(width / 2 - 350, 37.5, 25, iconColor);
            const iconText = this.add.text(width / 2 - 350, 37.5, isUnlocked ? '★' : '?', { fontSize: '24px', color: '#000' }).setOrigin(0.5);

            // Achievement Title
            const titleColor = isUnlocked ? '#feca57' : '#636e72';
            const title = this.add.text(width / 2 - 300, 15, ach.name, {
                fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
                fontSize: '22px',
                color: titleColor,
                fontStyle: 'bold'
            });

            // Description
            const descColor = isUnlocked ? '#c8d6e5' : '#444';
            const desc = this.add.text(width / 2 - 300, 45, ach.desc, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '14px',
                color: descColor
            });

            // Status Label
            const statusText = isUnlocked ? 'UNLOCKED' : 'LOCKED';
            const statusColor = isUnlocked ? '#e67e22' : '#57606f';
            const status = this.add.text(width / 2 + 380, 37.5, statusText, {
                fontFamily: '"Orbitron", sans-serif',
                fontSize: '18px',
                color: statusColor,
                fontStyle: 'bold'
            }).setOrigin(1, 0.5);

            // Hidden Trigger for Roguelike Mode
            if (ach.id === 'ach_start') {
                const hiddenTrigger = this.add.rectangle(width / 2, 37.5, 800, 75, 0x000000, 0)
                    .setInteractive({ useHandCursor: true });

                let clicks = 0;
                hiddenTrigger.on('pointerdown', () => {
                    clicks++;
                    if (clicks === 10) {
                        try {
                            SoundManager.getInstance().play('success');
                        } catch (e) { /* ignore */ }

                        console.log('HIDDEN MODE ACTIVATED');
                        const gm = GameManager.getInstance();
                        if (!gm.secretModeDiscovered) {
                            gm.secretModeDiscovered = true;
                            gm.save();
                        }
                        this.scene.start('StageSelectScene');
                    }
                });
                row.add(hiddenTrigger);
            }

            row.add([bg, icon, iconText, title, desc, status]);
            this.scrollContainer.add(row);
        });

        // Calculate max scroll
        const totalHeight = gm.achievements.length * gap;
        const viewHeight = this.scale.height - 130;
        this.maxScrollY = Math.max(0, totalHeight - viewHeight + 50);
    }
}
