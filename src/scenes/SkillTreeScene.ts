import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { Theme } from '../managers/Theme';
import { SoundManager } from '../managers/SoundManager';

export class SkillTreeScene extends Phaser.Scene {
    private container!: Phaser.GameObjects.Container;
    private isDragging: boolean = false;
    private lastPtrX: number = 0;
    private lastPtrY: number = 0;

    private resourceUIContainer!: Phaser.GameObjects.Container;
    private resourceUIMap: Map<string, { bg: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text }> = new Map();
    private tooltipUI!: Phaser.GameObjects.Container;
    private nodeVisuals: Map<string, Phaser.GameObjects.Container> = new Map();
    private lineGraphics!: Phaser.GameObjects.Graphics;

    private cursorDot!: Phaser.GameObjects.Arc;

    constructor() {
        super({ key: 'SkillTreeScene' });
    }

    create() {
        this.input.setDefaultCursor('none');
        this.cameras.main.setBackgroundColor(Theme.colors.bg);

        const { width, height } = this.scale;
        const grid = this.add.grid(0, 0, 8000, 8000, 100, 100, undefined, undefined, 0xffffff, 0.05);

        this.container = this.add.container(width / 2, height / 2);
        this.container.add(grid);

        const gm = GameManager.getInstance();
        const upgrades = gm.getAllUpgrades();

        // Draw Lines First
        this.lineGraphics = this.add.graphics();
        this.container.add(this.lineGraphics);

        // Calculate positions based on GM data
        const GRID_X = 180; // Widened grid (140 -> 180) to allow more space
        const GRID_Y = 150; // Slightly taller (140 -> 150)

        upgrades.forEach(u => {
            const px = u.pos.x * GRID_X;
            const py = -u.pos.y * GRID_Y; // Flip Y because screen Y is down, but logical Y is up

            if (u.parentId) {
                const parent = gm.getUpgrade(u.parentId);
                if (parent) {
                    const pPx = parent.pos.x * GRID_X;
                    const pPy = -parent.pos.y * GRID_Y;

                    const isUnlocked = parent.level > 0;
                    this.lineGraphics.lineStyle(4, isUnlocked ? 0x00ccff : 0x444444, 1);
                    this.lineGraphics.beginPath();

                    // Standard "Circuit Board" routing (Vertical -> Horizontal -> Vertical)
                    // No offset gimmicks, just clean lines.
                    const midY = (pPy + py) / 2;

                    this.lineGraphics.moveTo(pPx, pPy);
                    this.lineGraphics.lineTo(pPx, midY); // Down from Parent
                    this.lineGraphics.lineTo(px, midY);  // Across to Child Col
                    this.lineGraphics.lineTo(px, py);    // Down to Child

                    this.lineGraphics.strokePath();
                }
            }
        });

        // Draw Nodes
        this.nodeVisuals.clear();
        upgrades.forEach(u => {
            const px = u.pos.x * GRID_X;
            const py = -u.pos.y * GRID_Y;
            const node = this.createNode(u, px, py);
            this.container.add(node);
        });

        // Center on Root (0,0) at the middle of the screen
        this.container.setPosition(width / 2, height / 2);

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

        this.createResourceUI();
        this.updateHUD();
        this.createTooltipUI();

        this.cursorDot = this.add.circle(0, 0, 5, 0x00ff00);
        this.cursorDot.setStrokeStyle(1, 0x000000);
        this.cursorDot.setDepth(9999);
        this.cursorDot.setScrollFactor(0);
    }

    private createResourceUI() {
        const { width } = this.scale;
        this.resourceUIContainer = this.add.container(width - 20, 20).setScrollFactor(0);

        const resources = [
            { key: 'money', label: '資金', color: '#ffd700', icon: 'trash-circle' },
            { key: 'plastic', label: 'プラ', color: '#3498db', icon: 'trash-plastic' },
            { key: 'metal', label: '金属', color: '#95a5a6', icon: 'trash-metal' },
            { key: 'circuit', label: '基板', color: '#2ecc71', icon: 'trash-circuit' },
            { key: 'bioCell', label: 'バイオ', color: '#9b59b6', icon: 'trash-bio' },
            { key: 'rareMetal', label: 'レアM', color: '#f1c40f', icon: 'trash-battery' },
            { key: 'radioactive', label: '放射能', color: '#27ae60', icon: 'trash-nuclear' },
            { key: 'darkMatter', label: 'DM', color: '#a29bfe', icon: 'trash-satellite' },
            { key: 'quantumCrystal', label: 'QC', color: '#00d2d3', icon: 'trash-quantum' }
        ];

        const pillWidth = 160;
        const pillHeight = 40;
        const spacingX = 170;
        const spacingY = 50;

        resources.forEach((res, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const x = -(col + 1) * spacingX + 150;
            const y = row * spacingY;

            const bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.6);
            bg.fillRoundedRect(x - pillWidth + 10, y, pillWidth, pillHeight, 20);
            bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(res.color).color, 0.8);
            bg.strokeRoundedRect(x - pillWidth + 10, y, pillWidth, pillHeight, 20);

            const icon = this.add.image(x - pillWidth + 30, y + pillHeight / 2, res.icon).setScale(0.4);

            const text = this.add.text(x - pillWidth + 50, y + pillHeight / 2, '0', {
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            this.resourceUIContainer.add([bg, icon, text]);
            this.resourceUIMap.set(res.key, { bg, text });
        });
    }

    private updateHUD() {
        const gm = GameManager.getInstance();
        this.resourceUIMap.forEach((obj, key) => {
            let val = 0;
            if (key === 'money') val = gm.getMoney();
            else val = (gm as any)[key] || 0;

            if (key === 'money') {
                obj.text.setText(`¥${val.toLocaleString()}`);
            } else {
                obj.text.setText(val.toLocaleString());
            }
        });
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

                if (upgrade.id === 'mars_colony') {
                    this.hideTooltip(); // Hide tooltip to prevent overlap
                    this.showDiscoveryDialog();
                }
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

        let resourceText = '';
        const resCost = gm.getResourceCost(upgrade);
        if (resCost) {
            const rName = this.getResourceName(resCost.type);
            resourceText = `\n必要: ${rName} ${resCost.amount.toLocaleString()}個`;
        }

        // Dynamic height based on description
        const descHeight = desc.height;
        const infoY = 50 + descHeight;
        const tooltipHeight = infoY + 35 + (resourceText ? 25 : 0);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.95);
        bg.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
        bg.lineStyle(1, 0x74b9ff, 0.5);
        bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);

        const info = this.add.text(10, infoY, `${lvText}  |  ${costText}${resourceText}`, {
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

    private getResourceName(type: string): string {
        switch (type) {
            case 'money': return '資金';
            case 'plastic': return 'プラ';
            case 'metal': return '金属';
            case 'circuit': return '基板';
            case 'bioCell': return 'バイオ';
            case 'rareMetal': return 'レアM';
            case 'radioactive': return '放射能';
            case 'darkMatter': return 'DM';
            case 'quantumCrystal': return 'QC';
            default: return type;
        }
    }

    private showDiscoveryDialog() {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(2000).setInteractive();
        const dialog = this.add.container(width / 2, height / 2).setDepth(2001);

        const bg = this.add.graphics();
        bg.fillStyle(0x0f0f1a, 1);
        bg.lineStyle(2, 0x00d2d3, 1);
        bg.fillRoundedRect(-350, -250, 700, 500, 15);
        bg.strokeRoundedRect(-350, -250, 700, 500, 15);

        const title = this.add.text(0, -180, '!! 隠しモード発見 !!', {
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            fontSize: '36px',
            color: '#ffd700',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const msg = this.add.text(0, 0, '火星への到達により、世界の真理が明かされました。\n\n【アクセス方法】\n「実績リスト」を開き、一番上の実績（一歩目）を\n10回連続でクリックしてください。\n禁断の「ハックモード」が起動します。', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 16,
            wordWrap: { width: 600 }
        }).setOrigin(0.5);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x00d2d3, 1);
        btnBg.fillRoundedRect(-120, 150, 240, 60, 10);

        const btnText = this.add.text(0, 180, '了解', {
            fontFamily: '"Noto Sans JP", sans-serif',
            fontSize: '24px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(0, 180, 240, 60, 0, 0).setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
            overlay.destroy();
            dialog.destroy();
        });

        dialog.add([bg, title, msg, btnBg, btnText, hitArea]);
    }
}
