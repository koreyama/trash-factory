import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import type { UpgradeCategory } from '../managers/GameManager';

import { Theme } from '../managers/Theme';
import { SoundManager } from '../managers/SoundManager';

// Tab definitions
const TABS: { category: UpgradeCategory; label: string; icon: string }[] = [
    { category: 'processing', label: '処理', icon: '🗑️' },
    { category: 'automation', label: '自動化', icon: '⚙️' },
    { category: 'research', label: '研究', icon: '🔬' },
    { category: 'space', label: '宇宙', icon: '🚀' },
    { category: 'endgame', label: '終局', icon: '🌌' }
];

export class SkillTreeScene extends Phaser.Scene {
    private container!: Phaser.GameObjects.Container;
    private isDragging: boolean = false;
    private lastPtrX: number = 0;
    private lastPtrY: number = 0;

    private tooltipUI!: Phaser.GameObjects.Container;
    private nodeVisuals: Map<string, Phaser.GameObjects.Container> = new Map();
    private lineGraphics!: Phaser.GameObjects.Graphics;

    private moneyLabel!: Phaser.GameObjects.Text;
    private cursorDot!: Phaser.GameObjects.Arc;

    // Tab UI
    private currentCategory: UpgradeCategory = 'processing';
    private tabContainer!: Phaser.GameObjects.Container;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    create() {
        this.input.setDefaultCursor('none');
        this.cameras.main.setBackgroundColor(Theme.colors.bg);

        const { width, height } = this.scale;

        // Create Tab Bar first
        this.createTabBar();

        const grid = this.add.grid(0, 0, 8000, 8000, 100, 100, undefined, undefined, 0xffffff, 0.05);

        this.container = this.add.container(width / 2, height / 2);
        this.container.add(grid);

        // Draw tree for current category
        this.drawTree();

        // Center on Root initially
        this.container.setPosition(width / 2, height - 100);


        // Center on Root initially (0,0) with some offset usually
        this.container.setPosition(width / 2, height - 150);

        // Zoom Setup (Container Scale)
        this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
            const oldScale = this.container.scaleX;
            const zoomFactor = deltaY > 0 ? 0.9 : 1.1;
            const newScale = Phaser.Math.Clamp(oldScale * zoomFactor, 0.3, 2.0);
            this.container.setScale(newScale);
        });

        // Pan
        this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
            this.isDragging = true;
            this.lastPtrX = ptr.x;
            this.lastPtrY = ptr.y;
        });
        this.input.on('pointerup', () => this.isDragging = false);
        this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
            if (this.isDragging) {
                this.container.x += (ptr.x - this.lastPtrX);
                this.container.y += (ptr.y - this.lastPtrY);
                this.lastPtrX = ptr.x;
                this.lastPtrY = ptr.y;
            }
            if (this.cursorDot) this.cursorDot.setPosition(ptr.x, ptr.y);
            if (this.tooltipUI?.visible) this.tooltipUI.setPosition(ptr.x + 20, ptr.y + 20);
        });

        this.add.text(50, 50, '< 戻る', Theme.styles.buttonText)
            .setColor(Theme.colors.text)
            .setBackgroundColor(Theme.colors.accent)
            .setPadding(10)
            .setScrollFactor(0)
            .setInteractive()
            .on('pointerdown', () => {
                this.input.setDefaultCursor('default');
                this.scene.stop();
                this.scene.resume('MainScene');
            });

        this.moneyLabel = this.add.text(width - 30, 50, '', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '24px',
            color: Theme.colors.text,
            align: 'right'
        }).setOrigin(1, 0).setScrollFactor(0);

        this.updateHUD();
        this.createTooltipUI();

        this.cursorDot = this.add.circle(0, 0, 5, 0x00ff00);
        this.cursorDot.setStrokeStyle(1, 0x000000);
        this.cursorDot.setDepth(9999);
        this.cursorDot.setScrollFactor(0);
    }

    private createTabBar() {
        const { width } = this.scale;
        const gm = GameManager.getInstance();

        this.tabContainer = this.add.container(width / 2, 25);
        this.tabContainer.setScrollFactor(0);
        this.tabContainer.setDepth(2000);

        const tabWidth = 150;
        const tabHeight = 45;
        const spacing = 10;
        const totalWidth = TABS.length * tabWidth + (TABS.length - 1) * spacing;
        const startX = -totalWidth / 2;

        TABS.forEach((tab, index) => {
            const x = startX + index * (tabWidth + spacing) + tabWidth / 2;
            const isUnlocked = gm.isTabUnlocked(tab.category);
            const isActive = this.currentCategory === tab.category;

            // Tab background
            const bg = this.add.graphics();
            if (isActive) {
                bg.fillStyle(0x00ccff, 1);
            } else if (isUnlocked) {
                bg.fillStyle(0x333333, 1);
            } else {
                bg.fillStyle(0x1a1a1a, 0.8);
            }
            bg.fillRoundedRect(-tabWidth / 2, -tabHeight / 2, tabWidth, tabHeight, 8);
            bg.setPosition(x, 0);

            // Tab text
            const label = this.add.text(x, 0, `${tab.icon} ${tab.label}`, {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '16px',
                color: isUnlocked ? (isActive ? '#000000' : '#ffffff') : '#666666',
                fontStyle: isActive ? 'bold' : 'normal'
            }).setOrigin(0.5);

            // Make unlocked tabs interactive
            if (isUnlocked) {
                const hitArea = this.add.rectangle(x, 0, tabWidth, tabHeight, 0x000000, 0)
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => {
                        if (this.currentCategory !== tab.category) {
                            this.currentCategory = tab.category;
                            this.refreshTree();
                        }
                    })
                    .on('pointerover', () => {
                        if (!isActive) label.setColor('#00ccff');
                    })
                    .on('pointerout', () => {
                        label.setColor(isActive ? '#000000' : '#ffffff');
                    });
                this.tabContainer.add(hitArea);
            } else {
                // Show lock hint on hover for locked tabs
                const hitArea = this.add.rectangle(x, 0, tabWidth, tabHeight, 0x000000, 0)
                    .setInteractive()
                    .on('pointerover', () => {
                        const hint = gm.getTabUnlockHint(tab.category);
                        label.setText(`🔒 ${hint}`);
                        label.setFontSize('12px');
                    })
                    .on('pointerout', () => {
                        label.setText(`${tab.icon} ${tab.label}`);
                        label.setFontSize('16px');
                    });
                this.tabContainer.add(hitArea);
            }

            this.tabContainer.add([bg, label]);
        });
    }

    private drawTree() {
        const gm = GameManager.getInstance();
        // Get upgrades for current category only
        const upgrades = gm.getUpgradesByCategory(this.currentCategory);

        // Clear existing if any
        if (this.lineGraphics) {
            this.lineGraphics.clear();
        } else {
            this.lineGraphics = this.add.graphics();
            this.container.add(this.lineGraphics);
        }

        // Clear existing nodes
        this.nodeVisuals.forEach(node => node.destroy());
        this.nodeVisuals.clear();

        const GRID_X = 180;
        const GRID_Y = 150;

        // Draw Lines
        upgrades.forEach(u => {
            const px = u.pos.x * GRID_X;
            const py = -u.pos.y * GRID_Y;

            if (u.parentId) {
                const parent = gm.getUpgrade(u.parentId);
                // Only draw line if parent is in same category
                if (parent && parent.category === this.currentCategory) {
                    const pPx = parent.pos.x * GRID_X;
                    const pPy = -parent.pos.y * GRID_Y;

                    const isUnlocked = parent.level > 0;
                    this.lineGraphics.lineStyle(4, isUnlocked ? 0x00ccff : 0x444444, 1);
                    this.lineGraphics.beginPath();

                    const midY = (pPy + py) / 2;
                    this.lineGraphics.moveTo(pPx, pPy);
                    this.lineGraphics.lineTo(pPx, midY);
                    this.lineGraphics.lineTo(px, midY);
                    this.lineGraphics.lineTo(px, py);

                    this.lineGraphics.strokePath();
                }
            }
        });

        // Draw Nodes
        upgrades.forEach(u => {
            const px = u.pos.x * GRID_X;
            const py = -u.pos.y * GRID_Y;
            const node = this.createNode(u, px, py);
            this.container.add(node);
        });
    }

    private refreshTree() {
        // Destroy old tab container and recreate
        if (this.tabContainer) this.tabContainer.destroy();
        this.createTabBar();
        this.drawTree();

        // Reset container position
        const { width, height } = this.scale;
        this.container.setPosition(width / 2, height - 100);
    }

    private updateHUD() {
        const gm = GameManager.getInstance();
        this.moneyLabel.setText(`¥${gm.getMoney().toLocaleString()} | プラ: ${gm.plastic} | 金属: ${gm.metal}`);
    }


    private createNode(upgrade: any, x: number, y: number): Phaser.GameObjects.Container {
        const gm = GameManager.getInstance();
        const container = this.add.container(x, y);
        const isUnlocked = upgrade.level > 0;
        const canUnlock = gm.canUnlock(upgrade.id);

        const size = 55;
        const bg = this.add.graphics();

        if (isUnlocked) {
            bg.fillStyle(0x00b894, 1);
        } else if (canUnlock) {
            bg.fillStyle(0x0984e3, 1);
        } else {
            bg.fillStyle(0x636e72, 1);
        }
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, 8);
        bg.lineStyle(2, 0xffffff, isUnlocked ? 0.8 : 0.3);
        bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 8);

        const label = this.add.text(0, 0, upgrade.name.substring(0, 2), {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const lvl = this.add.text(0, size / 2 + 12, `Lv.${upgrade.level}`, {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '12px',
            color: '#cccccc'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 0, size + 10, size + 10, 0x000000, 0);
        hitArea.setInteractive();

        hitArea.on('pointerdown', () => {
            if (gm.unlock(upgrade.id)) {
                SoundManager.getInstance().play('click');
                this.refreshAllNodes(); // Update ALL nodes (unlocks children, updates affordability colors)
                this.updateHUD();
            } else {
                SoundManager.getInstance().play('error');
            }
        });
        hitArea.on('pointerover', () => this.showTooltip(upgrade));
        hitArea.on('pointerout', () => this.hideTooltip());

        container.add([bg, label, lvl, hitArea]);
        this.nodeVisuals.set(upgrade.id, container);
        return container;
    }

    private refreshAllNodes() {
        const gm = GameManager.getInstance();
        const upgrades = gm.getAllUpgrades();
        upgrades.forEach(u => this.updateNodeVisual(u.id));

        // Also redraw lines to update unlock status colors
        this.redrawLines();
    }

    private redrawLines() {
        const gm = GameManager.getInstance();
        const upgrades = gm.getAllUpgrades();
        const GRID_X = 180;
        const GRID_Y = 150;

        this.lineGraphics.clear();

        upgrades.forEach(u => {
            const px = u.pos.x * GRID_X;
            const py = -u.pos.y * GRID_Y;

            if (u.parentId) {
                const parent = gm.getUpgrade(u.parentId);
                if (parent) {
                    const pPx = parent.pos.x * GRID_X;
                    const pPy = -parent.pos.y * GRID_Y;

                    const isUnlocked = parent.level > 0;
                    this.lineGraphics.lineStyle(4, isUnlocked ? 0x00ccff : 0x444444, 1);
                    this.lineGraphics.beginPath();

                    // Standard "Circuit Board" routing
                    const midY = (pPy + py) / 2;

                    this.lineGraphics.moveTo(pPx, pPy);
                    this.lineGraphics.lineTo(pPx, midY);
                    this.lineGraphics.lineTo(px, midY);
                    this.lineGraphics.lineTo(px, py);

                    this.lineGraphics.strokePath();
                }
            }
        });
    }

    private updateNodeVisual(id: string) {
        const container = this.nodeVisuals.get(id);
        if (!container) return;

        const gm = GameManager.getInstance();
        const upgrade = gm.getUpgrade(id);
        if (!upgrade) return;

        // Rebuild node
        const pos = { x: container.x, y: container.y };
        container.destroy();
        const newNode = this.createNode(upgrade, pos.x, pos.y);
        this.container.add(newNode);
    }

    private createTooltipUI() {
        this.tooltipUI = this.add.container(0, 0);
        this.tooltipUI.setVisible(false);
        this.tooltipUI.setDepth(1000);
        this.tooltipUI.setScrollFactor(0);
    }

    private showTooltip(upgrade: any) {
        this.tooltipUI.removeAll(true);
        const gm = GameManager.getInstance();

        const tooltipWidth = 350;

        const title = this.add.text(10, 10, upgrade.name, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '18px',
            color: '#ffd700',
            fontStyle: 'bold'
        });

        const desc = this.add.text(10, 40, upgrade.description, {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            wordWrap: { width: tooltipWidth - 20 }
        });

        const cost = gm.getCost(upgrade);
        const maxLvText = upgrade.maxLevel >= 999 ? '∞' : upgrade.maxLevel;
        const lvText = `Lv.${upgrade.level} / ${maxLvText}`;
        const costText = cost === Infinity ? 'MAX' : `¥${cost.toLocaleString()}`;

        // Dynamic height based on description
        const descHeight = desc.height;
        const infoY = 50 + descHeight;
        const tooltipHeight = infoY + 35;

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.95);
        bg.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
        bg.lineStyle(1, 0x74b9ff, 0.5);
        bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);

        const info = this.add.text(10, infoY, `${lvText}  |  ${costText}`, {
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '14px',
            color: '#74b9ff'
        });

        this.tooltipUI.add([bg, title, desc, info]);
        this.tooltipUI.setVisible(true);
    }

    private hideTooltip() {
        this.tooltipUI.setVisible(false);
    }
}
