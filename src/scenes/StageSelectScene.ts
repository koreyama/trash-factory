import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';

export class StageSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StageSelectScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(0, 0, width, height, 0x1a1a2e, 1).setOrigin(0);
        this.add.grid(width / 2, height / 2, width, height, 64, 64, undefined, undefined, 0x16213e, 0.2);

        // Title
        this.add.text(width / 2, 80, "隠しモード", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '60px', color: '#e74c3c', fontStyle: 'bold', stroke: '#c0392b', strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(width / 2, 140, "- ステージを選択してください -", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '24px', color: '#fff'
        }).setOrigin(0.5);

        // Stage Buttons
        const stages = [
            { id: 1, name: "ステージ1: 廃棄場", color: 0x95a5a6 },
            { id: 2, name: "ステージ2: 工場", color: 0xe67e22 },
            { id: 3, name: "ステージ3: バイオ研究所", color: 0x2ecc71 },
            { id: 4, name: "ステージ4: コア", color: 0x9b59b6 },
            { id: 5, name: "ステージ5: 深淵", color: 0xe74c3c }
        ];

        stages.forEach((s, i) => {
            const y = 250 + (i * 80);

            // Container for button
            const container = this.add.container(width / 2, y);

            const bg = this.add.rectangle(0, 0, 500, 60, s.color)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(0, 0, s.name, {
                fontSize: '24px', color: '#ffffff', fontStyle: 'bold', fontFamily: '"Orbitron", "Noto Sans JP"'
            }).setOrigin(0.5);

            container.add([bg, text]);

            bg.on('pointerover', () => { bg.setAlpha(0.8); container.setScale(1.05); });
            bg.on('pointerout', () => { bg.setAlpha(1); container.setScale(1); });
            bg.on('pointerdown', () => {
                this.scene.start('RoguelikeScene', {
                    currentRoom: (s.id - 1) * 10 + 1,
                    startLevel: s.id
                });
            });
        });

        // Close Button
        const closeBtn = this.add.text(width / 2, height - 50, "[ 通常ゲームに戻る ]", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '20px', color: '#7f8c8d'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#7f8c8d'));
        closeBtn.on('pointerdown', () => {
            // FIX: Resume MainScene instead of restarting it (avoids freeze)
            this.scene.stop();
            this.scene.resume('MainScene');
        });
        // Upgrade Button
        const upgradeBtn = this.add.text(width / 2, height - 120, "[ 能力強化 (ショップ) ]", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '28px', color: '#f1c40f', fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        upgradeBtn.on('pointerover', () => upgradeBtn.setColor('#ffffff'));
        upgradeBtn.on('pointerout', () => upgradeBtn.setColor('#f1c40f'));
        upgradeBtn.on('pointerdown', () => {
            this.openUpgradeMenu();
        });
    }

    openUpgradeMenu() {
        const { width, height } = this.scale;
        const gm = GameManager.getInstance();

        // Overlay
        const overlay = this.add.container(0, 0);
        overlay.setDepth(100);

        const bg = this.add.rectangle(width / 2, height / 2, width * 0.9, height * 0.9, 0x000000, 0.95)
            .setInteractive(); // Block clicks
        overlay.add(bg);

        const title = this.add.text(width / 2, 100, "システム強化", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '40px', color: '#f1c40f'
        }).setOrigin(0.5);
        overlay.add(title);

        const moneyText = this.add.text(width - 40, 100, `所持ゴールド: ${gm.rogueGold.toLocaleString()}`, {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '30px', color: '#f1c40f' // Gold Color
        }).setOrigin(1, 0.5);
        overlay.add(moneyText);

        // Refund Button
        const refundBtn = this.add.text(width - 430, 100, "[ 全額返金 (リセット) ]", {
            fontFamily: '"Orbitron", "Noto Sans JP"', fontSize: '24px', color: '#e74c3c', fontStyle: 'bold'
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        refundBtn.on('pointerdown', () => {
            if (window.confirm("全ての強化をリセットしてゴールドを返金しますか？")) {
                gm.refundAllRogueStats();
                overlay.destroy();
                this.openUpgradeMenu();
            }
        });
        overlay.add(refundBtn);


        const stats = [
            { key: 'might', name: '攻撃力', desc: 'ダメージ +10%' },
            { key: 'armor', name: '防御力', desc: '被ダメージ -1' },
            { key: 'maxHp', name: '最大HP', desc: 'HP +10%' },
            { key: 'recovery', name: '自動回復', desc: '0.1 HP/秒' },
            { key: 'cooldown', name: 'クールダウン', desc: 'CT -2.5%' },
            { key: 'area', name: '攻撃範囲', desc: 'サイズ +10%' },
            { key: 'speed', name: '弾速', desc: '速度 +10%' },
            { key: 'duration', name: '持続時間', desc: '効果時間 +15%' },
            { key: 'amount', name: '発射数', desc: '発射数 +1' },
            { key: 'moveSpeed', name: '移動速度', desc: '速度 +5%' },
            { key: 'magnet', name: '吸引範囲', desc: '回収範囲 +25%' },
            { key: 'luck', name: '運気', desc: 'ドロップ率 +10%' },
            { key: 'greed', name: '強欲', desc: '獲得ゴールド +10%' },
            { key: 'growth', name: '成長', desc: '獲得経験値 +3%' },
            { key: 'revival', name: '復活', desc: '復活回数 +1' }
        ];

        // 2 Columns
        const col1X = 100;
        const col2X = width / 2 + 50;
        let currentX = col1X;
        let currentY = 180;

        stats.forEach((s, i) => {
            if (i === 8) { // Switch column after 8 items
                currentX = col2X;
                currentY = 180;
            }

            const key = s.key as keyof typeof gm.rogueStats;
            const info = gm.getRogueStatInfo(key);
            const level = gm.rogueStats[key];
            const isMax = level >= info.max;

            // Label
            const labelColor = isMax ? '#f1c40f' : '#ffffff';
            const label = this.add.text(currentX, currentY, `${s.name} [Lv.${level}/${info.max}]`, {
                fontSize: '20px', color: labelColor, fontFamily: '"Orbitron", "Noto Sans JP"'
            }).setOrigin(0, 0.5);

            // Desc
            const desc = this.add.text(currentX, currentY + 25, s.desc, {
                fontSize: '14px', color: '#aaa', fontFamily: '"Noto Sans JP"'
            }).setOrigin(0, 0.5);

            // Button
            const btnX = currentX + 300;
            const costText = isMax ? "MAX" : `${info.cost} G`;
            const canBuy = !isMax && gm.rogueGold >= info.cost;
            const btnColor = isMax ? 0x7f8c8d : (canBuy ? 0x27ae60 : 0xc0392b);

            const btn = this.add.rectangle(btnX, currentY + 10, 140, 40, btnColor)
                .setInteractive({ useHandCursor: canBuy });

            const btnLabel = this.add.text(btnX, currentY + 10, costText, {
                fontSize: '18px', color: '#fff', fontFamily: '"Orbitron"'
            }).setOrigin(0.5);

            if (canBuy) {
                btn.on('pointerdown', () => {
                    if (gm.upgradeRogueStat(key)) {
                        overlay.destroy();
                        this.openUpgradeMenu();
                    }
                });
            }

            overlay.add([label, desc, btn, btnLabel]);

            currentY += 60;
        });

        const closeBtn = this.add.text(width / 2, height - 100, "[ 閉じる ]", {
            fontSize: '30px', color: '#fff', fontFamily: '"Orbitron", "Noto Sans JP"'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => {
            overlay.destroy();
        });
        overlay.add(closeBtn);
    }
}

