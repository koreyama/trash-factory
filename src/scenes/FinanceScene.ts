import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';

export class FinanceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'FinanceScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Overlay BG
        this.add.rectangle(width / 2, height / 2, width, height, 0x111111, 0.95).setInteractive();

        const cx = width / 2;
        const cy = height / 2;

        // Header
        this.add.text(cx, 80, '資産管理ダッシュボード', {
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: '28px', color: '#ecf0f1', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Close
        this.add.text(width - 50, 50, '閉じる', {
            fontFamily: '"Noto Sans JP", sans-serif', fontSize: '18px', color: '#95a5a6'
        }).setInteractive({ useHandCursor: true })
            .setOrigin(0.5)
            .on('pointerdown', () => {
                SoundManager.getInstance().play('click');
                this.scene.stop();
                this.scene.resume('MainScene');
            });

        // 3 Columns Layout
        this.createBankPanel(cx - 500, cy, 400, 600);
        this.createMarketPanel(cx, cy, 500, 600); // Wider for list
        this.createMiningPanel(cx + 500, cy, 400, 600);

        this.updateUI();
    }

    update(_time: number, delta: number) {
        // Fix: Force GameManager update if paused
        // Use fixed delta to prevent NaN or huge jumps matching 60fps
        const gm = GameManager.getInstance();
        gm.update(delta);
        this.updateUI();

        // Real-time unlock check
        if (this.marketLockOverlay) {
            this.marketLockOverlay.setVisible(!gm.futuresUnlocked);
        }
        if (this.miningLockOverlay) {
            this.miningLockOverlay.setVisible(gm.cryptoLevel === 0);
        }
    }

    // ================= BANK =================
    private txtBankBal!: Phaser.GameObjects.Text;
    private txtWallet!: Phaser.GameObjects.Text;

    private createBankPanel(x: number, y: number, w: number, h: number) {
        this.add.rectangle(x, y, w, h, 0x1a1a1a).setStrokeStyle(1, 0x555555);
        this.add.text(x, y - h / 2 + 30, '銀行 (BANK)', { fontFamily: '"Noto Sans JP"', fontSize: '20px', color: '#f1c40f' }).setOrigin(0.5);

        const styleLbl = { fontFamily: '"Noto Sans JP"', fontSize: '14px', color: '#95a5a6' };
        const styleVal = { fontFamily: '"Noto Sans JP"', fontSize: '24px', color: '#fff' };

        this.add.text(x, y - 100, '預金残高', styleLbl).setOrigin(0.5);
        this.txtBankBal = this.add.text(x, y - 70, '¥0', styleVal).setOrigin(0.5);

        this.add.text(x, y - 20, '手持ち現金', styleLbl).setOrigin(0.5);
        this.txtWallet = this.add.text(x, y + 10, '¥0', styleVal).setOrigin(0.5);

        // Actions
        const createBtn = (lx: number, ly: number, lbl: string, col: number, cb: () => void) => {
            const btn = this.add.rectangle(lx, ly, 100, 35, col).setInteractive({ useHandCursor: true });
            this.add.text(lx, ly, lbl, { fontSize: '14px', color: '#fff' }).setOrigin(0.5);
            btn.on('pointerdown', () => { SoundManager.getInstance().play('click'); cb(); });
            btn.on('pointerover', () => btn.setAlpha(0.8));
            btn.on('pointerout', () => btn.setAlpha(1));
        };

        this.add.text(x, y + 60, '預け入れ (Deposit)', styleLbl).setOrigin(0.5);
        createBtn(x - 60, y + 90, '10%', 0x2980b9, () => this.deposit(0.1));
        createBtn(x + 60, y + 90, '全額', 0x2980b9, () => this.deposit(1.0));

        this.add.text(x, y + 140, '引き出し (Withdraw)', styleLbl).setOrigin(0.5);
        createBtn(x - 60, y + 170, '10%', 0x27ae60, () => this.withdraw(0.1));
        createBtn(x + 60, y + 170, '全額', 0x27ae60, () => this.withdraw(1.0));

        this.add.text(x, y + 250, '※利息は毎秒発生します', { fontSize: '12px', color: '#7f8c8d', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
    }

    private deposit(pct: number) {
        const gm = GameManager.getInstance();
        const amt = Math.floor(gm.money * pct);
        if (amt > 0) gm.depositToBank(amt);
    }
    private withdraw(pct: number) {
        const gm = GameManager.getInstance();
        const amt = Math.floor(gm.depositedMoney * pct);
        if (amt > 0) gm.withdrawFromBank(amt);
    }

    // ================= MARKET =================
    private txtIndex!: Phaser.GameObjects.Text;
    private txtTrend!: Phaser.GameObjects.Text;
    private txtAutoSell!: Phaser.GameObjects.Text;
    private txtInventory!: Phaser.GameObjects.Text;

    // Changed types to avoid import issues
    private availableResources: string[] = ['plastic', 'metal', 'circuit', 'bioCell', 'rareMetal', 'radioactive', 'darkMatter', 'quantumCrystal'];
    private selectedResources: Set<string> = new Set(['plastic', 'metal', 'circuit']);
    private marketLockOverlay!: Phaser.GameObjects.Container;
    private miningLockOverlay!: Phaser.GameObjects.Container;

    private createMarketPanel(x: number, y: number, w: number, h: number) {
        const gm = GameManager.getInstance();

        this.add.rectangle(x, y, w, h, 0x1a1a1a).setStrokeStyle(1, 0x555555);
        this.add.text(x, y - h / 2 + 30, '市場 (MARKET)', { fontFamily: '"Noto Sans JP"', fontSize: '20px', color: '#e74c3c' }).setOrigin(0.5);

        // ALWAYS create content
        this.renderMarketContent(x, y);

        // Cover if locked
        this.marketLockOverlay = this.add.container(x, y).setDepth(10);
        const lockBg = this.add.rectangle(0, 0, w, h, 0x000000, 0.85);
        const lockTxt = this.add.text(0, 0, 'LOCKED\n(産業革命が必要)', {
            color: '#e74c3c', fontSize: '24px', align: 'center', fontFamily: '"Noto Sans JP"'
        }).setOrigin(0.5);
        this.marketLockOverlay.add([lockBg, lockTxt]);
        this.marketLockOverlay.setVisible(!gm.futuresUnlocked);
    }

    private renderMarketContent(x: number, y: number) {

        // Info
        this.add.text(x, y - 240, '現在の市場レート', { fontSize: '14px', color: '#95a5a6', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        this.txtIndex = this.add.text(x, y - 210, '100%', { fontSize: '40px', color: '#fff' }).setOrigin(0.5);
        this.txtTrend = this.add.text(x, y - 180, 'STABLE', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Grid Selection
        this.add.text(x, y - 130, '売却素材選択 (Select Resources)', { fontSize: '14px', color: '#95a5a6', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);

        let ry = y - 90;
        let rx = x - 120;
        this.availableResources.forEach((res, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const tx = rx + (col * 240); // Spacing
            const ty = ry + (row * 35);

            // Checkbox
            const bg = this.add.rectangle(tx, ty, 20, 20, 0x333333).setInteractive({ useHandCursor: true });
            this.add.text(tx + 20, ty, res.toUpperCase(), { fontSize: '12px', color: '#bdc3c7', fontFamily: '"Roboto Mono"' }).setOrigin(0, 0.5);
            const check = this.add.text(tx, ty, '✓', { fontSize: '16px', color: '#2ecc71' }).setOrigin(0.5); // Ref

            // Initial State
            const updateState = () => {
                const isSel = this.selectedResources.has(res);
                check.setVisible(isSel);
                bg.setStrokeStyle(isSel ? 1 : 0, 0x2ecc71);
            };
            updateState();

            bg.on('pointerdown', () => {
                if (this.selectedResources.has(res)) this.selectedResources.delete(res);
                else this.selectedResources.add(res);
                updateState();
                this.updateUI();
                SoundManager.getInstance().play('click');
            });
        });


        // Inventory Value
        this.add.text(x, y + 80, '選択分の評価額', { fontSize: '14px', color: '#95a5a6', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        this.txtInventory = this.add.text(x, y + 110, '¥0', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        // Sell Buttons
        const createSellBtn = (lx: number, ly: number, w: number, lbl: string, pct: number) => {
            const btn = this.add.rectangle(lx, ly, w, 35, 0x27ae60).setInteractive({ useHandCursor: true });
            this.add.text(lx, ly, lbl, { fontSize: '14px', color: '#fff', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
            btn.on('pointerdown', () => {
                // Cast string set to any[] for GameManager
                const types = Array.from(this.selectedResources) as any[];
                if (types.length > 0) {
                    const rev = GameManager.getInstance().sellResources(types, pct);
                    if (rev > 0) SoundManager.getInstance().play('success');
                    else SoundManager.getInstance().play('error');
                }
            });
            btn.on('pointerover', () => btn.setAlpha(0.8));
            btn.on('pointerout', () => btn.setAlpha(1));
        };

        const by = y + 150;
        createSellBtn(x - 140, by, 80, '10%', 0.1);
        createSellBtn(x - 50, by, 80, '50%', 0.5);
        createSellBtn(x + 90, by, 180, '100% (ALL)', 1.0);


        // Auto Sell
        this.add.text(x, y + 210, '自動売却しきい値', { fontSize: '14px', color: '#95a5a6', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        this.txtAutoSell = this.add.text(x, y + 240, 'ALWAYS', { fontSize: '20px', color: '#f1c40f' }).setOrigin(0.5);

        const createAdj = (lx: number, txt: string, d: number) => {
            const btn = this.add.rectangle(lx, y + 240, 40, 40, 0x555555).setInteractive({ useHandCursor: true });
            this.add.text(lx, y + 240, txt, { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            btn.on('pointerdown', () => {
                const gm = GameManager.getInstance();
                gm.autoSellThreshold = Math.max(0.0, Math.min(2.0, gm.autoSellThreshold + d));
                gm.save();
                SoundManager.getInstance().play('click');
            });
        };
        createAdj(x - 100, '-', -0.1);
        createAdj(x + 100, '+', 0.1);
    }

    // ================= MINING =================
    private txtHash!: Phaser.GameObjects.Text;
    private txtEnergy!: Phaser.GameObjects.Text;
    private txtRev!: Phaser.GameObjects.Text;
    private txtInt!: Phaser.GameObjects.Text;
    private btnToggle!: Phaser.GameObjects.Rectangle;
    private lblToggle!: Phaser.GameObjects.Text;

    private createMiningPanel(x: number, y: number, w: number, h: number) {
        const gm = GameManager.getInstance();

        this.add.rectangle(x, y, w, h, 0x1a1a1a).setStrokeStyle(1, 0x555555);
        this.add.text(x, y - h / 2 + 30, '採掘 (MINING)', { fontFamily: '"Noto Sans JP"', fontSize: '20px', color: '#9b59b6' }).setOrigin(0.5);

        // ALWAYS create content
        this.renderMiningContent(x, y);

        // Cover if locked
        this.miningLockOverlay = this.add.container(x, y).setDepth(10);
        const lockBg = this.add.rectangle(0, 0, w, h, 0x000000, 0.85);
        const lockTxt = this.add.text(0, 0, 'LOCKED\n(仮想通貨マイニングが必要)', {
            color: '#9b59b6', fontSize: '24px', align: 'center', fontFamily: '"Noto Sans JP"'
        }).setOrigin(0.5);
        this.miningLockOverlay.add([lockBg, lockTxt]);
        this.miningLockOverlay.setVisible(gm.cryptoLevel === 0);
    }

    private renderMiningContent(x: number, y: number) {

        // Stats
        const stY = y - 60;
        this.txtHash = this.add.text(x, stY - 30, 'Hash: 0 MH/s', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        this.txtEnergy = this.add.text(x, stY, 'Energy: 0 /s', { fontSize: '16px', color: '#fff' }).setOrigin(0.5);
        this.txtRev = this.add.text(x, stY + 30, 'Rev: ¥0 /s', { fontSize: '16px', color: '#2ecc71' }).setOrigin(0.5);

        // Control
        this.btnToggle = this.add.rectangle(x, y + 80, 160, 40, 0x34495e).setInteractive({ useHandCursor: true });
        this.lblToggle = this.add.text(x, y + 80, 'START', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        this.btnToggle.on('pointerdown', () => {
            const gm = GameManager.getInstance(); // Fix gm ref
            gm.miningActive = !gm.miningActive;
            SoundManager.getInstance().play('click');
        });

        // Intensity
        this.add.text(x, y + 140, '負荷設定 (Intensity)', { fontSize: '14px', color: '#95a5a6', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        this.txtInt = this.add.text(x, y + 170, '1', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);

        const createAdj = (lx: number, txt: string, d: number) => {
            const btn = this.add.rectangle(lx, y + 170, 40, 40, 0x555555).setInteractive({ useHandCursor: true });
            this.add.text(lx, y + 170, txt, { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
            btn.on('pointerdown', () => {
                const gm = GameManager.getInstance();
                gm.miningIntensity = Math.max(1, Math.min(10, gm.miningIntensity + d));
                gm.save();
                SoundManager.getInstance().play('click');
            });
        };
        createAdj(x - 60, '-', -1);
        createAdj(x + 60, '+', 1);
    }

    private updateUI() {
        const gm = GameManager.getInstance();

        // Bank
        if (this.txtBankBal) {
            this.txtBankBal.setText(`¥${Math.floor(gm.depositedMoney).toLocaleString()}`);
            this.txtWallet.setText(`¥${Math.floor(gm.money).toLocaleString()}`);
        }

        // Market
        if (gm.futuresUnlocked && this.txtIndex) {
            const m = Math.floor(gm.marketMultiplier * 100);
            this.txtIndex.setText(`${m}%`);
            this.txtIndex.setColor(m >= 100 ? '#2ecc71' : '#e74c3c');
            this.txtTrend.setText(gm.marketTrend);

            // Inventory Value
            let totalVal = 0;
            // Valuation for UI: use central price logic
            const getPrice = (t: string) => gm.getResourcePrice(t);

            this.selectedResources.forEach(type => {
                const current = (gm as any)[type] as number;
                if (current > 0) {
                    totalVal += Math.floor(current * getPrice(type) * gm.marketMultiplier);
                }
            });

            if (this.txtInventory) this.txtInventory.setText(`¥${totalVal.toLocaleString()}`);

            if (gm.autoSellThreshold <= 0.05) this.txtAutoSell.setText('無制限 (ALWAYS)');
            else this.txtAutoSell.setText(`${Math.floor(gm.autoSellThreshold * 100)}% 以上`);
        }

        // Mining
        if (gm.cryptoLevel > 0 && this.txtHash) {
            this.txtInt.setText(`${gm.miningIntensity}`);

            if (gm.miningActive) {
                this.btnToggle.setFillStyle(0xe74c3c);
                this.lblToggle.setText("停止 (STOP)");

                const cost = Math.ceil(gm.miningIntensity * 10);
                const rev = Math.floor(gm.cryptoLevel * 100 * gm.marketMultiplier * gm.miningIntensity);
                this.txtHash.setText(`Hash: ${gm.miningIntensity * 10} MH/s`);
                this.txtEnergy.setText(`Energy: -${cost} /s`);
                this.txtRev.setText(`Rev: ¥${rev} /s`);
            } else {
                this.btnToggle.setFillStyle(0x27ae60);
                this.lblToggle.setText("開始 (START)");
                this.txtHash.setText('Hash: 0 MH/s');
                this.txtEnergy.setText('Energy: 0 /s');
                this.txtRev.setText('Rev: ¥0 /s');
            }
        }
    }
}
