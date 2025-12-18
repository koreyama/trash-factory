
import Phaser from 'phaser';
import { GameManager, type Gadget } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';

export class CraftingScene extends Phaser.Scene {

    private gadgetList: Gadget[] = [
        {
            id: 'dynamite',
            name: 'ダイナマイト',
            icon: 'gadget-dynamite',
            desc: '広範囲のゴミを爆破処理する', // Now draggable (logic in MainScene)
            cost: [{ type: 'plastic', amount: 50 }, { type: 'metal', amount: 10 }]
        },
        {
            id: 'magnet_bomb',
            name: 'マグネットボム',
            icon: 'gadget-magnet',
            desc: '強力な磁場を発生させゴミを一箇所に集める',
            cost: [{ type: 'metal', amount: 50 }, { type: 'circuit', amount: 10 }]
        },
        {
            id: 'midas_gel',
            name: 'ミダスジェル',
            icon: 'gadget-midas',
            desc: '範囲内のゴミを金（高価値）に変える',
            cost: [{ type: 'plastic', amount: 100 }, { type: 'bioCell', amount: 20 }]
        },
        {
            id: 'overclock',
            name: 'オーバークロック',
            icon: 'gadget-overclock',
            desc: '30秒間、搬入速度とドローン速度が倍増',
            cost: [{ type: 'circuit', amount: 30 }, { type: 'bioCell', amount: 10 }]
        },
        {
            id: 'auto_bot',
            name: 'サポートボット',
            icon: 'gadget-bot',
            desc: '30秒間、強力な収集ボットを追加召喚',
            cost: [{ type: 'metal', amount: 50 }, { type: 'circuit', amount: 20 }, { type: 'bioCell', amount: 5 }]
        },
        {
            id: 'chain_lightning',
            name: 'チェーンライトニング',
            icon: 'gadget-lightning',
            desc: 'クリックで電撃が連鎖（最大10体）',
            cost: [{ type: 'radioactive', amount: 20 }, { type: 'circuit', amount: 50 }]
        },
        {
            id: 'gravity_lasso',
            name: 'グラビティラッソ',
            icon: 'gadget-lasso',
            desc: 'ドラッグでゴミを巻き込む重力の投げ縄',
            cost: [{ type: 'darkMatter', amount: 30 }, { type: 'rareMetal', amount: 20 }]
        },
        {
            id: 'quantum_sling',
            name: '量子スリング',
            icon: 'gadget-sling',
            desc: 'ゴミを引っ張って発射、連鎖爆発',
            cost: [{ type: 'quantumCrystal', amount: 15 }, { type: 'darkMatter', amount: 20 }]
        }
    ];

    constructor() {
        super({ key: 'CraftingScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x111111, 0.95);

        // Header
        this.add.text(width / 2, 40, 'WORKSHOP', {
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '48px',
            color: '#e67e22',
            fontStyle: 'bold',
            stroke: '#d35400',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Close Button
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

        // Resources Monitor
        this.createResourceMonitor(width);

        // Gadget List
        this.createGadgetList(width);
    }

    private resourceTextRefs: { [key: string]: Phaser.GameObjects.Text } = {};

    private createResourceMonitor(width: number) {
        const gm = GameManager.getInstance();
        const startX = width / 2 - 300;
        const y = 140; // Moved down (was 80?) to clear title
        const spacing = 180; // Widen spacing

        const createRes = (idx: number, label: string, color: string, key: string, value: number) => {
            const x = startX + idx * spacing;
            const txt = this.add.text(x, y, `${label}\n${value.toLocaleString()}`, {
                fontFamily: '"Orbitron", monospace',
                fontSize: '18px',
                color: color,
                align: 'center',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            this.resourceTextRefs[key] = txt;
        };

        createRes(0, 'プラスチック', '#3498db', 'plastic', gm.plastic);
        createRes(1, '金属', '#95a5a6', 'metal', gm.metal);
        createRes(2, '電子基板', '#2ecc71', 'circuit', gm.circuit);
        createRes(3, 'バイオ細胞', '#9b59b6', 'bioCell', gm.bioCell);
    }

    private updateResources() {
        const gm = GameManager.getInstance();
        if (this.resourceTextRefs['plastic']) this.resourceTextRefs['plastic'].setText(gm.plastic.toLocaleString());
        if (this.resourceTextRefs['metal']) this.resourceTextRefs['metal'].setText(gm.metal.toLocaleString());
        if (this.resourceTextRefs['circuit']) this.resourceTextRefs['circuit'].setText(gm.circuit.toLocaleString());
        if (this.resourceTextRefs['bioCell']) this.resourceTextRefs['bioCell'].setText(gm.bioCell.toLocaleString());
    }


    private createGadgetList(width: number) {
        const startY = 230; // Moved further down (was 200, header+resources take up to ~150)
        const itemHeight = 100;

        this.gadgetList.forEach((gadget, index) => {
            const y = startY + index * itemHeight;
            this.createGadgetItem(width / 2, y, gadget);
        });
    }

    private createGadgetItem(x: number, y: number, gadget: Gadget) {
        // ... (BG code is same)
        const w = 500;
        const h = 80;

        const bg = this.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        bg.lineStyle(1, 0x444444);
        bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);

        // Icon
        this.add.image(x - w / 2 + 35, y, gadget.icon).setScale(0.8);

        // Name & Desc
        this.add.text(x - w / 2 + 70, y - 18, gadget.name, {
            fontSize: '20px',
            color: '#f1c40f',
            fontStyle: 'bold',
            fontFamily: '"Noto Sans JP"'
        }).setOrigin(0, 0.5);

        this.add.text(x - w / 2 + 70, y + 12, gadget.desc, {
            fontSize: '12px',
            color: '#bdc3c7',
            fontFamily: '"Noto Sans JP"'
        }).setOrigin(0, 0.5);

        // Cost Display
        const gm = GameManager.getInstance();
        const discount = gm.getCraftingCostMultiplier();
        let costText = '';

        gadget.cost.forEach(c => {
            const finalAmount = Math.floor(c.amount * discount);
            let label = '';
            if (c.type === 'plastic') { label = 'プラ'; }
            if (c.type === 'metal') { label = '金属'; }
            if (c.type === 'circuit') { label = '基板'; }
            if (c.type === 'bioCell') { label = 'バイオ'; }
            costText += `${label}:${finalAmount} `;
        });

        this.add.text(x + 50, y, costText, {
            fontSize: '12px',
            color: discount < 1.0 ? '#00ff00' : '#ffcc00',
            align: 'right',
            fontFamily: '"Noto Sans JP"'
        }).setOrigin(0.5);

        // Inventory Count
        const count = gm.getGadgetCount(gadget.id);
        const countText = this.add.text(x + 140, y - 25, `Stock: ${count}`, {
            fontSize: '14px',
            color: '#ecf0f1',
            fontFamily: '"Orbitron", monospace'
        }).setOrigin(0.5);

        // Craft Button
        const btn = this.add.container(x + 200, y);
        const btnBg = this.add.rectangle(0, 0, 80, 40, 0x007aff).setInteractive({ useHandCursor: true });
        const btnTxt = this.add.text(0, 0, '作成', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        btn.add([btnBg, btnTxt]);

        btnBg.on('pointerdown', () => {
            SoundManager.getInstance().play('click');
            this.tryCraft(gadget, countText, btnBg);
        });

        btnBg.on('pointerover', () => {
            if (btnBg.input?.enabled) SoundManager.getInstance().play('hover');
        });

        // Check affordable
        this.updateButtonState(btnBg, gadget);
    }

    private updateButtonState(btn: Phaser.GameObjects.Rectangle, gadget: Gadget) {
        const gm = GameManager.getInstance();
        const discount = gm.getCraftingCostMultiplier();
        let canAfford = true;

        for (const c of gadget.cost) {
            const cost = Math.floor(c.amount * discount);
            if (c.type === 'plastic' && gm.plastic < cost) canAfford = false;
            if (c.type === 'metal' && gm.metal < cost) canAfford = false;
            if (c.type === 'circuit' && gm.circuit < cost) canAfford = false;
            if (c.type === 'bioCell' && gm.bioCell < cost) canAfford = false;
        }

        if (canAfford) {
            btn.setFillStyle(0x007aff, 1);
            btn.setInteractive();
        } else {
            btn.setFillStyle(0x555555, 1);
            btn.disableInteractive();
        }
    }

    private tryCraft(gadget: Gadget, countText: Phaser.GameObjects.Text, btn: Phaser.GameObjects.Rectangle) {
        const gm = GameManager.getInstance();
        const discount = gm.getCraftingCostMultiplier();

        // Double check affordability
        let canAfford = true;
        const finalCosts: { type: string, amount: number }[] = [];

        for (const c of gadget.cost) {
            const cost = Math.floor(c.amount * discount);
            finalCosts.push({ type: c.type, amount: cost });

            if (c.type === 'plastic' && gm.plastic < cost) canAfford = false;
            if (c.type === 'metal' && gm.metal < cost) canAfford = false;
            if (c.type === 'circuit' && gm.circuit < cost) canAfford = false;
            if (c.type === 'bioCell' && gm.bioCell < cost) canAfford = false;
        }

        if (!canAfford) return;

        // Deduct resources
        for (const c of finalCosts) {
            gm.spendResource(c.type as any, c.amount);
        }

        // Add item
        gm.addGadget(gadget.id, 1);

        // Update UI
        this.updateResources();
        countText.setText(`所持: ${gm.getGadgetCount(gadget.id)}`);

        // Re-evaluate button state
        this.updateButtonState(btn, gadget);

        // Add particle effect or something?
        this.tweens.add({
            targets: btn,
            scale: { from: 1.2, to: 1 },
            duration: 100,
            yoyo: true
        });
    }
}
