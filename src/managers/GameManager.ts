
export type ResourceType = 'plastic' | 'metal' | 'circuit' | 'bioCell';


export interface Upgrade {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    costMultiplier: number;
    maxLevel: number;
    level: number;
    parentId: string | null;
    effect: (gm: GameManager, level: number) => void;
    resourceCost?: { type: ResourceType, amount: number };
    // Position for the visual tree (0,0 is root center)
    // x: negative=left, positive=right
    // y: negative=bottom(old), positive=up(new), but screen coords are y-down.
    // Let's use logical coords: 0,0 = root. y+ = Up. x+ = Right.
    pos: { x: number, y: number };
}

export interface Achievement {
    id: string;
    name: string;
    desc: string;
    unlocked: boolean;
    condition: (gm: GameManager) => boolean;
}

export type GadgetType = 'dynamite' | 'magnet_bomb' | 'midas_gel' | 'overclock' | 'auto_bot';

export interface Gadget {
    id: GadgetType;
    name: string;
    icon: string;
    desc: string;
    cost: { type: ResourceType, amount: number }[];
}

export class GameManager {
    private static instance: GameManager;

    // === SAVE DATA ===
    public money: number = 0;
    public plastic: number = 0;
    public metal: number = 0;
    public circuit: number = 0;
    public bioCell: number = 0;

    public totalMoney: number = 0;
    public totalPlastic: number = 0;
    public totalMetal: number = 0;
    public totalCircuit: number = 0;
    public totalPress: number = 0;

    // Stats
    public trashValue: number = 10;
    public spawnDelay: number = 1000;
    public pressMultiplier: number = 1.5;

    public vacuumPower: number = 0.005;
    public vacuumRange: number = 200;

    public dynamiteRange: number = 150;
    public craftingCostReduction: number = 0.0;

    // Energy System (New)
    public energy: number = 0;
    public maxEnergy: number = 100;
    public energyGeneration: number = 0;

    public laserPower: number = 0; // New mechanic
    public comboMultiplier: number = 1.0; // New mechanic

    public critChance: number = 0;
    public marketingMultiplier: number = 1.0;
    public luckRate: number = 0.0;
    public goldTrashMultiplier: number = 10;

    // Flags
    public trashCapacity: number = 30;
    public droneUnlocked: boolean = false;
    public droneSpeed: number = 100;
    public droneCount: number = 1;
    public droneCapacity: number = 1;

    public plasticPerTrash: number = 1;

    // Lifetime Stats (Restored)
    public pressCount: number = 0;
    public prestigeMultiplier: number = 1.0;

    public upgrades: Upgrade[] = [];
    public achievements: Achievement[] = [];
    public inventory: { [key in GadgetType]?: number } = {};

    private constructor() {
        this.initUpgrades();
        this.initAchievements();
        this.load();
    }

    static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    // --- Resources ---



    private initUpgrades() {
        const add = (id: string, name: string, desc: string, cost: number, parent: string | null, maxLv: number, costMult: number, pos: { x: number, y: number }, effect: (gm: GameManager, lv: number) => void, resCost?: { type: ResourceType, amount: number }) => {
            this.upgrades.push({
                id, name, description: desc, baseCost: cost, costMultiplier: costMult,
                level: 0, maxLevel: maxLv, parentId: parent, effect, resourceCost: resCost, pos
            });
        };

        // ROOT (Center Bottom)
        add('root_mining', 'ゴミ処理免許', 'ゴミ処理業を開始する基本許可証。', 0, null, 1, 1, { x: 0, y: 0 }, () => { });

        // === TIER 1 (Basics) ===
        // === TIER 1 (Basics) ===
        // Rebalance: spawn_speed maxLv 20. More impactful per level.
        add('spawn_speed', '搬入速度', 'ゴミ出現頻度UP (-100ms/Lv)', 200, 'root_mining', 20, 1.6, { x: -1, y: 1 }, (gm, lv) => {
            // 1000ms start, min 100ms. Each level = -100ms.
            gm.spawnDelay = Math.max(100, 1000 - (lv * 100));
        });
        add('val_base', '基礎価値', 'ゴミの基本価値UP (+5円/Lv)', 100, 'root_mining', 20, 1.5, { x: 0, y: 1 }, (gm, lv) => {
            gm.trashValue = 10 + (lv * 5);
        });
        add('vacuum_unlock', '吸引装置', '長押しでゴミを吸い寄せる', 300, 'root_mining', 1, 1, { x: 1, y: 1 }, () => { });

        // === TIER 2 (Expansion) ===
        // Rebalance: floor_capacity maxLv 50. More impactful per level.
        add('floor_capacity', '床面積拡張', '最大ゴミ数+30個/Lv', 1500, 'spawn_speed', 50, 1.5, { x: -2, y: 2 }, (gm, lv) => {
            gm.trashCapacity = 30 + (lv * 30);
        });
        add('unlock_plastic', 'プラ回収許可', 'プラスチックゴミが出現', 500, 'spawn_speed', 1, 1, { x: -1, y: 2 }, () => { });

        // Market moved to avoid overlap with unlock_plastic
        // Combo Chip moved from (0,1) collision to (0,3)
        add('combo_chip', 'コンボチップ', 'コンボボーナス倍率UP', 2500, 'marketing', 5, 1.5, { x: 0, y: 3 }, (gm, lv) => {
            gm.comboMultiplier = 1.0 + (lv * 0.2);
        });

        add('marketing', '広告戦略', '全収入倍率+10%/Lv', 2000, 'val_base', 10, 1.5, { x: 0, y: 2 }, (gm, lv) => {
            gm.marketingMultiplier = 1.0 + (lv * 0.1);
        });
        add('vacuum_power', '吸引力強化', '吸引スピードUP', 500, 'vacuum_unlock', 10, 1.5, { x: 1, y: 2 }, (gm, lv) => {
            gm.vacuumPower = 0.005 + (lv * 0.002);
        });
        add('unlock_metal', '金属回収許可', '金属ゴミが出現', 2000, 'vacuum_unlock', 1, 1, { x: 2, y: 2 }, () => { });

        // === TIER 3 (Specialization) ===
        add('black_hole_unlock', 'ブラックホール', 'ゴミを吸い込む特異点を生成', 50000, 'floor_capacity', 1, 1, { x: -3, y: 3 }, () => { }, { type: 'metal', amount: 100 });
        add('spawn_variety', '多様性', '特殊ゴミ出現率UP', 2500, 'unlock_plastic', 5, 1.5, { x: -2, y: 3 }, () => { });

        // Moved from (-1, 2) to (-1, 3) to unhide unlock_plastic
        add('market_manipulation', '相場操作', '一時的に売却額UPスキル', 5000, 'marketing', 1, 1, { x: -1, y: 3 }, () => { });

        // Shifted (0,3) -> (0,4)
        add('click_crit', 'クリティカル', 'クリック時に確率で3倍収入', 500, 'combo_chip', 10, 1.6, { x: 0, y: 4 }, (gm, lv) => {
            gm.critChance = Math.min(0.5, lv * 0.05);
        });
        add('vacuum_range', '吸引範囲', '吸引の有効範囲拡大', 600, 'vacuum_power', 10, 1.5, { x: 1, y: 3 }, (gm, lv) => {
            gm.vacuumRange = 200 + (lv * 50);
        });

        add('unlock_crafting', 'クラフト許可', 'ガジェット製作を解禁', 5000, 'unlock_metal', 1, 1, { x: 2, y: 3 }, () => { });
        add('drone_unlock', '自律ドローン', '自動回収ドローンを配備', 30000, 'unlock_metal', 1, 1, { x: 3, y: 3 }, (gm) => { gm.droneUnlocked = true; });

        // === TIER 4 (Technological Leap) ===
        // Black Hole Branch
        add('hawking_radiation', 'ホーキング放射', '活性化中、エネルギーを少し還元', 200000, 'black_hole_unlock', 1, 1, { x: -4, y: 4 }, () => { });
        add('event_horizon', '事象の地平線', 'ブラックホールの吸引範囲拡大', 3000, 'black_hole_unlock', 5, 1.6, { x: -3, y: 4 }, () => {
            // Logic handled in BlackHole.ts
        });

        add('unlock_circuit', '基板回収', '電子基板ゴミが出現', 10000, 'spawn_variety', 1, 1, { x: -2, y: 4 }, () => { });
        // Shifted (0,4) -> (0,5)
        add('luck_unlock', 'ラッキーゴミ', '金色のゴミが出現', 5000, 'click_crit', 1, 1, { x: 0, y: 5 }, (gm) => { gm.luckRate = 0.05; });

        add('dynamite_spec', '発破技術', 'ダイナマイトの効果範囲拡大', 15000, 'unlock_crafting', 5, 1.5, { x: 1, y: 4 }, (gm, lv) => {
            gm.dynamiteRange = 150 + (lv * 30);
        });

        add('solar_panel', 'ソーラーパネル', '毎秒エネルギー+1/Lv（レーザー用）', 20000, 'unlock_crafting', 10, 1.5, { x: 2, y: 4 }, (gm, lv) => {
            gm.energyGeneration = lv * 1;
        });

        add('drone_spec', 'ドローン性能', '移動速度UP', 80000, 'drone_unlock', 5, 1.8, { x: 4, y: 4 }, (gm, lv) => {
            gm.droneSpeed = 100 + (lv * 50);
        });

        // === TIER 5 (Advanced Infrastructure) ===
        add('singularity_engine', '特異点エンジン', 'ブラックホールの成長速度UP', 150000, 'hawking_radiation', 3, 2.0, { x: -4, y: 5 }, () => { });
        add('recycling_tech', '資源循環', '全資源の獲得量+1', 300000, 'unlock_circuit', 3, 2.0, { x: -2, y: 5 }, (gm, lv) => {
            gm.plasticPerTrash = 1 + lv;
        });

        add('unlock_bio', 'バイオ処理', 'バイオ細胞ゴミが出現', 150000, 'research_lab', 1, 1, { x: -1, y: 6 }, () => { });
        add('research_lab', '研究所', '次世代技術を解禁', 500000, 'unlock_circuit', 1, 1, { x: -1, y: 5 }, () => { });

        // Shifted (0,5) -> (0,6)
        add('rainbow_trash', '虹色ゴミ', '超高額ゴミが出現', 75000, 'luck_unlock', 1, 1, { x: 0, y: 6 }, () => { });

        add('gadget_mastery', 'ガジェット研究', 'クラフトコスト削減', 50000, 'dynamite_spec', 5, 1.5, { x: 1, y: 5 }, (gm, lv) => {
            gm.craftingCostReduction = Math.min(0.5, lv * 0.1);
        });

        add('battery_upgrade', '大容量蓄電池', '最大エネルギー保存量UP', 50000, 'solar_panel', 5, 1.5, { x: 2, y: 5 }, (gm, lv) => {
            gm.maxEnergy = 100 + (lv * 100);
        });

        add('unlock_industry', '産業革命', '自動資源生成・売却系を解禁', 100000, 'drone_spec', 1, 1, { x: 3, y: 5 }, () => { });
        add('drone_ai', 'AI制御', 'ドローンの効率化', 120000, 'drone_spec', 1, 1, { x: 5, y: 5 }, () => { });

        // === TIER 6 (Future Tech) ===
        add('quantum_destabilizer', '量子分解', '爆発で資源を獲得可能に', 800000, 'singularity_engine', 1, 1, { x: -4, y: 6 }, () => { });

        add('incinerator', '廃棄物発電', 'バイオゴミ消却時にエナジー', 100000, 'unlock_bio', 5, 1.6, { x: -1, y: 7 }, () => { });

        // Shifted (0,6) -> (0,7)
        // Parent changed: research_lab -> rainbow_trash (0,6) to avoid crossing Y=6
        add('quantum_core', '量子コア', '全速度倍増', 1000000, 'rainbow_trash', 1, 1, { x: 0, y: 7 }, () => { });

        add('laser_grid', '防衛レーザー', '画面下半分のゴミを自動焦却（エネルギー消費）', 250000, 'battery_upgrade', 5, 2.0, { x: 2, y: 6 }, (gm, lv) => {
            gm.laserPower = lv * 10;
        });

        add('magnet_field', '磁力場', '金属・基板ゴミを画面中央に引き寄せる', 40000, 'gadget_mastery', 1, 1, { x: 1, y: 6 }, () => { });

        add('auto_miner', '自動採掘', '毎秒プラ+金属をLv個ずつ獲得', 200000, 'unlock_industry', 10, 1.3, { x: 4, y: 6 }, () => { });
        add('auto_factory', '自動工場', '毎秒プラ+金属をLv個売却して換金', 500000, 'unlock_industry', 10, 1.4, { x: 5, y: 6 }, () => { });

        // === TIER 7 (Cosmic Tech) ===
        // === TIER 7 (Cosmic Tech) ===
        // Parent changed: quantum_core -> recycling_tech (-2,5) to avoid crossing incinerator (-1,7)
        // Path: (-2,5) -> (-2,7). Crosses (-2,6) which is empty.
        add('gravity_manipulator', '重力制御', 'ゴミの落下速度低下(積みやすい)', 2000000, 'recycling_tech', 3, 1.5, { x: -2, y: 7 }, () => { });
        // REMOVED PRESTIGE UNLOCK
        // add('prestige_unlock', '転生システム', '強くてニューゲーム', 10000000, 'quantum_core', 1, 1, { x: 0, y: 7 }, () => { });
        add('time_machine', 'タイムマシン', '失ったゴミを回収', 25000000, 'quantum_core', 1, 1, { x: 1, y: 7 }, () => { });

        add('auto_sorter', '自動選別機', '特定ゴミを即時換金', 1500000, 'auto_factory', 1, 1, { x: 4, y: 7 }, () => { });
        add('global_mining', '世界展開', '収入効率大幅UP', 800000, 'auto_factory', 1, 1, { x: 6, y: 7 }, () => { });

        // === TIER 8 (Dimensional) ===
        // Black Hole (End of Press Branch)
        // Black Hole (End of Press Branch)
        add('black_hole_storage', '無限圧縮', '床面積上限を9999に拡張', 50000000, 'gravity_manipulator', 1, 1, { x: -2, y: 8 }, (gm) => { gm.trashCapacity = 9999; });

        // REMOVED MULTIVERSE
        // add('multiverse', '多元宇宙', '並行世界から収入を得る', 50000000, 'prestige_unlock', 1, 1, { x: 0, y: 8 }, () => { });

        add('time_warp', '時間跳躍', '時間加速スキル', 75000000, 'time_machine', 1, 1, { x: 2, y: 8 }, () => { });

        add('nanobot_swarm', 'ナノボット', '画面全体のゴミを徐々に分解', 1000000, 'incinerator', 1, 1, { x: -1, y: 8 }, () => { });

        // === TIER 9 (Divine) ===
        // === TIER 9 (Divine) ===
        // Updated parent for buy_planet since multiverse is gone. Using black_hole_storage or similar?
        // Let's link it to black_hole_storage or time_warp.
        add('buy_planet', '地球買収', 'ゲームクリア', 100000000, 'black_hole_storage', 1, 1, { x: 0, y: 9 }, () => { console.log("WIN"); }, { type: 'metal', amount: 5000 });
        add('galactic_fed', '銀河連邦加盟', 'エンディング分岐B', 200000000, 'buy_planet', 1, 1, { x: 1, y: 10 }, () => { }, { type: 'circuit', amount: 9999 });

    }

    public addMoney(amount: number) {
        this.money += amount;
        this.totalMoney += amount;
        this.save();
    }

    public addResource(type: ResourceType, amount: number) {
        if (type === 'plastic') {
            this.plastic += amount;
            this.totalPlastic += amount;
        } else if (type === 'metal') {
            this.metal += amount;
            this.totalMetal += amount;
        } else if (type === 'circuit') {
            this.circuit += amount;
            this.totalCircuit += amount;
        } else if (type === 'bioCell') {
            this.bioCell += amount;
        }
        this.save();
    }

    public addEnergy(amount: number) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
        this.save();
    }

    public spendResource(type: ResourceType, amount: number): boolean {
        if (type === 'plastic' && this.plastic >= amount) {
            this.plastic -= amount;
            this.save();
            return true;
        } else if (type === 'metal' && this.metal >= amount) {
            this.metal -= amount;
            this.save();
            return true;
        } else if (type === 'circuit' && this.circuit >= amount) {
            this.circuit -= amount;
            this.save();
            return true;
        } else if (type === 'bioCell' && this.bioCell >= amount) {
            this.bioCell -= amount;
            this.save();
            return true;
        }
        return false;
    }

    // --- Inventory ---

    public addGadget(type: GadgetType, amount: number = 1) {
        if (!this.inventory[type]) {
            this.inventory[type] = 0;
        }
        this.inventory[type]! += amount;
        this.save();
    }

    public useGadget(type: GadgetType): boolean {
        if (this.inventory[type] && this.inventory[type]! > 0) {
            this.inventory[type]!--;
            this.save();
            return true;
        }
        return false;
    }

    public getGadgetCount(type: GadgetType): number {
        return this.inventory[type] || 0;
    }

    private initAchievements() {
        if (this.achievements.length > 0) return;

        const addAch = (id: string, name: string, desc: string, condition: (gm: GameManager) => boolean) => {
            this.achievements.push({ id, name, desc, unlocked: false, condition });
        };

        // Linear Sorted Achievements
        // Format: ID, Name, Desc, Condition

        // Helper to generate tiers
        const genTiers = (baseId: string, name: string, desc: string, unit: string, thresholds: number[], check: (gm: GameManager) => number) => {
            thresholds.forEach((th, i) => {
                const tier = i + 1;
                const formatted = th.toLocaleString();
                addAch(`${baseId}_${tier}`, `${name} Lv.${tier}`, `${desc} (${formatted}${unit})`, (gm) => check(gm) >= th);
            });
        };

        // Money Tiers
        genTiers('ach_money', '資産家', '累計獲得資金', '円',
            [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000, 10000000, 50000000, 100000000, 1000000000],
            (gm) => gm.totalMoney);

        // Resource Tiers
        genTiers('ach_plastic', 'プラ回収', '累計プラスチック', '個',
            [50, 100, 500, 1000, 5000, 10000, 50000],
            (gm) => gm.totalPlastic);

        genTiers('ach_metal', '金属回収', '累計金属', '個',
            [10, 50, 100, 500, 1000, 5000, 10000],
            (gm) => gm.totalMetal);

        genTiers('ach_circuit', '基板回収', '累計電子基板', '個',
            [10, 50, 100, 500, 1000, 5000],
            (gm) => gm.totalCircuit);

        // Press Tiers REMOVED (Legacy)

        // Upgrade Count Tiers
        genTiers('ach_ups', '技術革新', 'アップグレード購入数', '回',
            [1, 5, 10, 20, 30, 50, 75, 100, 150],
            (gm) => gm.getAllUpgrades().reduce((sum, u) => sum + u.level, 0));

        // Specific Upgrades
        addAch('ach_craft', 'DIY', 'クラフト解禁', (gm) => (gm.getUpgrade('unlock_crafting')?.level ?? 0) > 0);
        addAch('ach_drone', 'オートメーション', 'ドローン解禁', (gm) => gm.droneUnlocked);
        addAch('ach_bh', '特異点', 'ブラックホール解禁', (gm) => (gm.getUpgrade('black_hole_unlock')?.level ?? 0) > 0);
        addAch('ach_lab', '研究者', '研究所建設', (gm) => (gm.getUpgrade('research_lab')?.level ?? 0) > 0);
        addAch('ach_planet', '地球買収', '地球を買収', (gm) => (gm.getUpgrade('buy_planet')?.level ?? 0) > 0);

        // Max Level Milestones
        addAch('ach_max_speed', '最速の搬入', '搬入速度MAX', (gm) => {
            const u = gm.getUpgrade('spawn_speed');
            return !!u && u.level >= u.maxLevel;
        });
        addAch('ach_max_cap', '無限の倉庫', '床面積MAX', (gm) => {
            const u = gm.getUpgrade('floor_capacity');
            return !!u && u.level >= u.maxLevel;
        });

        addAch('ach_finish', 'THE END', '全実績解除', (gm) => {
            const total = gm.achievements.length;
            const unlocked = gm.achievements.filter(a => a.unlocked && a.id !== 'ach_finish').length;
            return unlocked >= total - 1;
        });

        // === COMPLEX ACHIEVEMENTS ===

        // 1. Hoarder: Have 1000 Plastic AND Metal AND Circuit
        addAch('ach_hoarder', '収集家', 'プラ・金属・基板を各1000個所持', (gm) => {
            return gm.plastic >= 1000 && gm.metal >= 1000 && gm.circuit >= 1000;
        });

        // 2. Speed Demon: Spawn Delay < 200 ms
        addAch('ach_speed_demon', 'スピード狂', '搬入間隔200ms以下', (gm) => {
            return gm.spawnDelay <= 200;
        });

        // 3. Tech Tycoon: >10 Upgrades AND >1M Money (simultaneous)
        addAch('ach_tech_tycoon', 'ハイテク長者', 'UG数10以上かつ所持金100万', (gm) => {
            const upCount = gm.getAllUpgrades().reduce((sum, u) => sum + u.level, 0);
            return upCount >= 10 && gm.money >= 1000000;
        });

        // 4. Energy Efficiency: Max Energy
        addAch('ach_battery_king', 'エネルギータンク', 'エネルギー最大値500到達', (gm) => {
            return gm.maxEnergy >= 500;
        });

        // 5. Gadget Master: Have 5 of each gadget type
        addAch('ach_gadget_fan', 'ガジェットファン', '全ガジェットを5個ずつ所持', (gm) => {
            const types: GadgetType[] = ['dynamite', 'magnet_bomb', 'midas_gel', 'overclock', 'auto_bot'];
            return types.every(t => (gm.inventory[t] || 0) >= 5);
        });
    }


    public checkAchievements(): string | null {
        for (const ach of this.achievements) {
            if (!ach.unlocked && ach.condition(this)) {
                ach.unlocked = true;
                this.save();
                return ach.name;
            }
        }
        return null;
    }



    getUpgrade(id: string) {
        return this.upgrades.find(u => u.id === id);
    }

    getAllUpgrades() {
        return this.upgrades;
    }

    getCost(up: Upgrade): number {
        if (up.level >= up.maxLevel) return Infinity;
        return Math.floor(up.baseCost * Math.pow(up.costMultiplier, up.level));
    }

    getCraftingCostMultiplier(): number {
        return Math.max(0.1, 1.0 - this.craftingCostReduction);
    }

    canUnlock(id: string): boolean {
        const up = this.getUpgrade(id);
        if (!up) return false;
        if (up.level >= up.maxLevel) return false;

        const cost = this.getCost(up);
        if (this.money < cost) return false;

        if (up.resourceCost && up.level === 0) {
            if (up.resourceCost.type === 'plastic' && this.plastic < up.resourceCost.amount) return false;
            if (up.resourceCost.type === 'metal' && this.metal < up.resourceCost.amount) return false;
            if (up.resourceCost.type === 'circuit' && this.circuit < up.resourceCost.amount) return false;
            if (up.resourceCost.type === 'bioCell' && this.bioCell < up.resourceCost.amount) return false;
        }

        if (up.parentId) {
            const parent = this.getUpgrade(up.parentId);
            if (!parent || parent.level === 0) return false;
        }
        return true;
    }

    unlock(id: string): boolean {
        if (this.canUnlock(id)) {
            const up = this.getUpgrade(id)!;
            const cost = this.getCost(up);

            this.money -= cost;

            if (up.resourceCost && up.level === 0) {
                this.spendResource(up.resourceCost.type, up.resourceCost.amount);
            }

            up.level++;
            up.effect(this, up.level);
            this.save();
            return true;
        }
        return false;
    }

    public incrementPressCheck() {
        this.pressCount++;
        this.save();
    }

    public resetData() {
        // Clear localStorage
        localStorage.removeItem('cyber_trash_save_v4');

        // Reset instance
        this.money = 0;
        this.plastic = 0;
        this.metal = 0;
        this.circuit = 0;
        this.bioCell = 0;

        this.totalMoney = 0;
        this.totalPlastic = 0;
        this.totalMetal = 0;
        this.pressCount = 0;
        this.prestigeMultiplier = 1.0;
        this.trashCapacity = 30;
        this.inventory = {};

        // Reset stats
        this.trashValue = 10;
        this.spawnDelay = 1000;
        this.pressMultiplier = 1.5;
        this.vacuumPower = 0.005;
        this.vacuumRange = 200;
        this.critChance = 0;
        this.plasticPerTrash = 1;
        this.luckRate = 0;
        this.goldTrashMultiplier = 10;
        this.droneUnlocked = false;
        this.droneSpeed = 100;
        this.droneCapacity = 1;
        this.droneCount = 0;
        this.marketingMultiplier = 1.0;

        // Reset upgrades
        this.upgrades = [];
        this.initUpgrades();

        // Reset achievements
        this.achievements = [];
        this.initAchievements();

        console.log('Game data reset complete.');
    }

    getMoney() {
        return this.money;
    }

    save() {
        const data = {
            money: this.money,
            plastic: this.plastic,
            metal: this.metal,
            circuit: this.circuit,
            bioCell: this.bioCell,

            // Lifetime
            totalMoney: this.totalMoney,
            totalPlastic: this.totalPlastic,
            totalMetal: this.totalMetal,
            totalCircuit: this.totalCircuit,
            pressCount: this.pressCount,
            prestigeMultiplier: this.prestigeMultiplier,
            inventory: this.inventory,

            stats: {
                vacuumPower: this.vacuumPower,
                vacuumRange: this.vacuumRange,
                critChance: this.critChance,
                plasticPerTrash: this.plasticPerTrash,
                spawnDelay: this.spawnDelay,
                trashValue: this.trashValue,

                dynamiteRange: this.dynamiteRange,
                craftingCostReduction: this.craftingCostReduction,

                luckRate: this.luckRate,
                droneUnlocked: this.droneUnlocked,
                droneSpeed: this.droneSpeed,
                marketingMultiplier: this.marketingMultiplier
            },
            upgrades: this.upgrades.map(u => ({ id: u.id, level: u.level })),
            achievements: this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked }))
        };
        localStorage.setItem('cyber_trash_save_v4', JSON.stringify(data));
    }

    load() {
        const raw = localStorage.getItem('cyber_trash_save_v4');
        if (raw) {
            const data = JSON.parse(raw);
            this.money = data.money || 0;
            this.plastic = data.plastic || 0;
            this.metal = data.metal || 0;
            this.circuit = data.circuit || 0;
            this.bioCell = data.bioCell || 0;

            this.totalMoney = data.totalMoney || this.money;
            this.totalPlastic = data.totalPlastic || this.plastic;
            this.totalMetal = data.totalMetal || this.metal;
            this.totalCircuit = data.totalCircuit || this.circuit;
            this.pressCount = data.pressCount || 0;
            this.prestigeMultiplier = data.prestigeMultiplier || 1.0;
            this.inventory = data.inventory || {};

            // Restore stats
            if (data.stats) {
                this.vacuumPower = data.stats.vacuumPower ?? 0.005;
                this.vacuumRange = data.stats.vacuumRange ?? 200;
                this.critChance = data.stats.critChance ?? 0;
                this.plasticPerTrash = data.stats.plasticPerTrash ?? 1;
                this.spawnDelay = data.stats.spawnDelay ?? 1000;
                this.trashValue = data.stats.trashValue ?? 10;

                this.dynamiteRange = data.stats.dynamiteRange ?? 150;
                this.craftingCostReduction = data.stats.craftingCostReduction ?? 0.0;

                this.luckRate = data.stats.luckRate ?? 0;
                this.droneUnlocked = data.stats.droneUnlocked ?? false;
                this.droneSpeed = data.stats.droneSpeed ?? 100;
                this.marketingMultiplier = data.stats.marketingMultiplier ?? 1.0;
            }

            if (this.upgrades.length === 0) this.initUpgrades();
            if (this.achievements.length === 0) this.initAchievements();

            data.upgrades.forEach((saved: any) => {
                const up = this.getUpgrade(saved.id);
                if (up) {
                    up.level = saved.level;
                    if (up.level > 0) up.effect(this, up.level);
                }
            });

            if (data.achievements) {
                data.achievements.forEach((saved: any) => {
                    const ach = this.achievements.find(a => a.id === saved.id);
                    if (ach) ach.unlocked = saved.unlocked;
                });
            }
        }
    }
}
