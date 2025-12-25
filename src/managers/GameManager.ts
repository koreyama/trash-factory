
export type ResourceType = 'plastic' | 'metal' | 'circuit' | 'bioCell' | 'rareMetal' | 'radioactive' | 'darkMatter' | 'quantumCrystal';

// Tab categories for skill tree
export type UpgradeCategory = 'processing' | 'automation' | 'research' | 'space' | 'endgame';

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
    pos: { x: number, y: number };
    // Category for tab-based organization (optional for backward compatibility)
    category?: UpgradeCategory;
}

export interface Achievement {
    id: string;
    name: string;
    desc: string;
    unlocked: boolean;
    condition: (gm: GameManager) => boolean;
}

// Extended gadget types (Merged)
export type GadgetType = 'dynamite' | 'magnet_bomb' | 'midas_gel' | 'overclock' | 'auto_bot' | 'nuclear_battery' | 'satellite_laser' | 'quantum_duplicator' | 'chain_lightning' | 'gravity_lasso' | 'quantum_sling';

export interface Gadget {
    id: GadgetType;
    name: string;
    icon: string;
    desc: string;
    cost: { type: ResourceType, amount: number }[];
}


export interface GameSettings {
    volume: number;
    bgmVolume: number;
    sfxVolume: number;
    particles: boolean;
    floatingText: boolean;
    screenShake: boolean;
    autoSaveInterval: number; // minutes
}

export class GameManager {
    private static instance: GameManager;

    // === SAVE DATA ===
    public money: number = 0;
    public plastic: number = 0;
    public metal: number = 0;
    public circuit: number = 0;
    public bioCell: number = 0;

    // New Resources (Tier 6+)
    public rareMetal: number = 0;
    public radioactive: number = 0;
    public darkMatter: number = 0;
    public quantumCrystal: number = 0;

    public totalMoney: number = 0;
    public totalPlastic: number = 0;
    public totalMetal: number = 0;
    public totalCircuit: number = 0;
    public totalBioCell: number = 0;
    public totalRareMetal: number = 0;
    public totalRadioactive: number = 0;
    public totalDarkMatter: number = 0;
    public totalQuantumCrystal: number = 0;
    public totalPress: number = 0;
    public playTime: number = 0; // Milliseconds

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
    public get maxEnergy(): number {
        let base = 100;
        const battery = this.getUpgrade('battery_upgrade');
        if (battery) base += battery.level * 100;
        const fusion = this.getUpgrade('fusion_reactor');
        if (fusion) base += fusion.level * 1000;
        return base;
    }
    public get energyGeneration(): number {
        let gen = 0;
        const solar = this.getUpgrade('solar_panel');
        if (solar) gen += solar.level * 1;
        const nuclear = this.getUpgrade('nuclear_reactor');
        if (nuclear) gen += nuclear.level * 10;
        return gen;
    }

    public laserPower: number = 0; // New mechanic
    public comboMultiplier: number = 1.0; // New mechanic

    // Vacuum Preferences (Adjustable via Sliders)
    public vacuumPowerPref: number = 1.0; // 0.0 to 1.0
    public vacuumRangePref: number = 1.0;  // 0.0 to 1.0

    public critChance: number = 0;
    public marketingMultiplier: number = 1.0;
    public luckRate: number = 0.0;
    public goldTrashMultiplier: number = 10;

    // Flags
    public trashCapacity: number = 30;
    public droneUnlocked: boolean = false;
    public dronesActive: boolean = false; // Default OFF
    public droneSpeed: number = 100;
    public droneCount: number = 1;
    public droneCapacity: number = 1;
    public secretModeDiscovered: boolean = false;

    public settings: GameSettings = {
        volume: 0.5,
        bgmVolume: 0.5,
        sfxVolume: 0.5,
        particles: true,
        floatingText: true,
        screenShake: true,
        autoSaveInterval: 5
    };

    // Financial Tech
    public interestRate: number = 0;
    public interestTimer: number = 0;
    public interestCap: number = 10000;
    public futuresUnlocked: boolean = false;
    public marketMultiplier: number = 1.0;
    public marketTimer: number = 0;
    public marketTrend: string = 'STABLE'; // 'BULL', 'BEAR', 'STABLE'
    public cryptoLevel: number = 0;
    public cryptoTimer: number = 0;
    public miningActive: boolean = false; // Added
    public miningIntensity: number = 1;   // Added
    public depositedMoney: number = 0; // Bank
    public autoSellThreshold: number = 0.0; // 0.0 = Trigger Always.

    public conveyorUnlocked: boolean = false; // New: Conveyor facility
    public conveyorActive: boolean = false; // Default OFF
    public shippedTrashBuffer: any[] = []; // New: Stores trash between main and refinery
    public refineryCapacity: number = 100; // NEW: Cap for shippedTrashBuffer (increased to 100)
    public refineryInventory: Record<string, number> = {}; // PERSISTENT

    public getTypeOccupancy(type: string): number {
        // Normalize types to match refineryInventory
        let targetType = type;
        if (type === 'general') targetType = 'plastic';
        if (type === 'bio') targetType = 'bioCell';

        // Count in buffer
        let count = this.shippedTrashBuffer.filter(item => item.type === targetType).length;

        // Count in stored refinery inventory
        count += this.refineryInventory[targetType] || 0;

        return count;
    }

    // Facility State (Centralized)

    public magnetActive: boolean = false;
    public laserActive: boolean = false;
    public blackHoleActive: boolean = false;
    public nanobotsActive: boolean = false; // Default OFF
    public gravityActive: boolean = false; // Default OFF


    public plasticPerTrash: number = 1;

    // Lifetime Stats (Restored)
    public pressCount: number = 0;
    public prestigeMultiplier: number = 1.0;

    public upgrades: Upgrade[] = [];
    public achievements: Achievement[] = [];

    public inventory: { [key in GadgetType]?: number } = {};

    // Roguelike Persistent Stats
    public rogueGold: number = 0;
    public rogueStats = {
        might: 0,       // Damage
        armor: 0,       // Defense
        maxHp: 0,       // Health
        recovery: 0,    // Regen
        cooldown: 0,    // Cooldown Reduction
        area: 0,        // Attack Size
        speed: 0,       // Projectile Speed
        duration: 0,    // Effect Duration
        amount: 0,      // Projectile Count
        moveSpeed: 0,   // Movement Speed
        magnet: 0,      // Pickup Range
        luck: 0,        // Crit/Drop
        greed: 0,       // Gold Gain
        growth: 0,      // Exp Gain
        revival: 0      // Extra Lives
    };

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

        // === ROOT ===
        add('root_mining', 'ゴミ処理免許', 'ゴミ処理業を開始する基本許可証。', 0, null, 1, 1, { x: 0, y: 0 }, () => { });

        // =================================================================================
        // === NORTH BRANCH (Up, Y+): MATERIALS & RESEARCH ===
        // Plastic -> Metal -> Circuit -> Bio -> Research -> Space -> Quantum
        // =================================================================================

        // Tier 1
        add('unlock_plastic', 'プラ回収許可', 'プラスチックゴミが出現', 500, 'root_mining', 1, 1, { x: 0, y: 1 }, () => { });

        // Tier 2
        add('unlock_metal', '金属回収許可', '金属ゴミが出現', 2000, 'unlock_plastic', 1, 1, { x: 0, y: 2 }, () => { }, { type: 'plastic', amount: 500 });

        // Tier 3
        add('unlock_crafting', 'クラフト許可', 'ガジェット製作を解禁', 5000, 'unlock_metal', 1, 1, { x: 1, y: 2 }, () => { }, { type: 'metal', amount: 500 });
        add('unlock_circuit', '基板回収', '電子基板ゴミが出現', 10000, 'unlock_metal', 1, 1, { x: 0, y: 3 }, () => { }, { type: 'metal', amount: 1000 });

        // Tier 4
        add('recycling_tech', '資源循環', '全資源の獲得量+1', 300000, 'unlock_circuit', 3, 2.0, { x: 1, y: 3 }, (gm, lv) => {
            gm.plasticPerTrash = 1 + lv;
        }, { type: 'circuit', amount: 300 });

        // Tier 5
        add('research_lab', '研究所', '次世代技術を解禁', 500000, 'unlock_circuit', 1, 1, { x: 0, y: 4 }, () => { }, { type: 'circuit', amount: 500 });
        add('unlock_bio', 'バイオ処理', 'バイオ細胞ゴミが出現', 150000, 'research_lab', 1, 1, { x: -1, y: 4 }, () => { }, { type: 'circuit', amount: 1000 });

        // Tier 6 (Space)
        add('unlock_satellite', '衛星回収許可', '人工衛星パーツが出現', 5000000, 'research_lab', 1, 1, { x: 0, y: 5 }, () => { }, { type: 'bioCell', amount: 1000 });
        add('space_debris', '宇宙デブリ処理', '衛星パーツ出現率UP', 8000000, 'unlock_satellite', 5, 1.5, { x: 1, y: 5 }, () => { }, { type: 'bioCell', amount: 2000 });
        add('orbital_station', '軌道ステーション', 'パッシブでダークマター獲得', 20000000, 'unlock_satellite', 3, 2.0, { x: 0, y: 6 }, () => { }, { type: 'rareMetal', amount: 1000 });
        add('moon_base', '月面基地', 'ダークマター生成速度2倍', 50000000, 'orbital_station', 1, 1, { x: 0, y: 7 }, () => { }, { type: 'darkMatter', amount: 500 });

        // Tier 7 (Mars)
        add('mars_colony', '火星コロニー', '真のエンディング解放', 500000000, 'moon_base', 1, 1, { x: 0, y: 8 }, () => {
            console.log("MARS WIN");
        }, { type: 'darkMatter', amount: 5000 });


        // =================================================================================
        // === SOUTH BRANCH (Down, Y-): LOGISTICS & UTILITY ===
        // Spawn Speed -> Capacity -> Drones -> Incinerator -> Auto-Sorting
        // =================================================================================

        // Tier 1
        add('spawn_speed', '搬入速度', 'ゴミ出現頻度UP (-100ms/Lv)', 200, 'root_mining', 20, 1.6, { x: 0, y: -1 }, (gm, lv) => {
            gm.spawnDelay = Math.max(100, 1000 - (lv * 100));
        }, { type: 'plastic', amount: 100 });

        // Tier 2
        add('floor_capacity', '床面積拡張', '最大ゴミ数+30個/Lv', 1500, 'spawn_speed', 50, 1.2, { x: 0, y: -2 }, (gm, lv) => {
            gm.trashCapacity = 30 + (lv * 30);
        }, { type: 'metal', amount: 200 });
        add('spawn_variety', '多様性', '特殊ゴミ出現率UP', 2500, 'spawn_speed', 5, 1.5, { x: 1, y: -2 }, () => { }, { type: 'plastic', amount: 300 });

        // Tier 3
        add('drone_unlock', '自律ドローン', '自動回収ドローンを配備', 30000, 'floor_capacity', 1, 1, { x: 0, y: -3 }, (gm) => { gm.droneUnlocked = true; }, { type: 'circuit', amount: 200 });
        add('drone_spec', 'ドローン性能', '移動速度UP', 80000, 'drone_unlock', 5, 1.8, { x: 1, y: -3 }, (gm, lv) => {
            gm.droneSpeed = 150 + (lv * 100);
        }, { type: 'circuit', amount: 500 });
        add('drone_ai', 'AI制御', 'ドローンの効率化', 120000, 'drone_unlock', 1, 1, { x: -1, y: -3 }, () => { }, { type: 'circuit', amount: 1000 });

        // Tier 4
        add('unlock_conveyor', 'ベルトコンベア', 'ゴミを精製所へ送り自動処理する', 50000, 'floor_capacity', 1, 1, { x: 0, y: -4 }, (gm) => { gm.conveyorUnlocked = true; }, { type: 'metal', amount: 200 });
        add('refinery_capacity', '精製所容量拡張', '各素材の最大保管数UP (+100/Lv)', 30000, 'unlock_conveyor', 10, 2.0, { x: 1, y: -4 }, (gm, lv) => {
            gm.refineryCapacity = 100 + (lv * 100);
        }, { type: 'metal', amount: 500 });

        // Tier 5
        add('incinerator', '廃棄物発電', 'バイオゴミ消却時にエナジー', 100000, 'unlock_conveyor', 5, 1.6, { x: 0, y: -5 }, () => { }, { type: 'bioCell', amount: 500 });
        add('unlock_medical', '医療廃棄物処理', '医療廃棄物が出現', 800000, 'incinerator', 1, 1, { x: 1, y: -5 }, () => { }, { type: 'bioCell', amount: 2000 });

        // Tier 6
        add('unlock_nuclear', '核廃棄物処理', '核廃棄物が出現', 3000000, 'incinerator', 1, 1, { x: -1, y: -5 }, () => { }, { type: 'rareMetal', amount: 1000 });
        add('nuclear_reactor', '原子炉', 'エネルギー生成+10/秒', 10000000, 'unlock_nuclear', 5, 1.5, { x: -1, y: -6 }, () => { }, { type: 'radioactive', amount: 500 });
        add('fusion_reactor', '核融合炉', 'エネルギー最大値+1000', 100000000, 'nuclear_reactor', 1, 1, { x: -1, y: -7 }, () => { }, { type: 'radioactive', amount: 1000 });

        // Tier 7
        add('nanobot_swarm', 'ナノボット', '画面全体のゴミを徐々に分解', 1000000, 'incinerator', 1, 1, { x: 0, y: -6 }, () => { }, { type: 'circuit', amount: 5000 });
        add('black_hole_storage', '無限圧縮', '床面積上限を9999に拡張', 50000000, 'nanobot_swarm', 1, 1, { x: 0, y: -7 }, (gm) => { gm.trashCapacity = 9999; }, { type: 'darkMatter', amount: 1000 });


        // =================================================================================
        // === EAST BRANCH (Right, X+): ECONOMY & INDUSTRY ===
        // Value -> Marketing -> Interest -> Factory -> Crypto -> Buy Planet
        // =================================================================================

        // Tier 1
        add('val_base', '基礎価値', 'ゴミの基本価値UP (+5円/Lv)', 100, 'root_mining', 20, 1.5, { x: 1, y: 0 }, (gm, lv) => {
            gm.trashValue = 10 + (lv * 5);
        });

        // Tier 2
        add('marketing', '広告戦略', '全収入倍率+10%/Lv', 2000, 'val_base', 10, 1.5, { x: 2, y: 0 }, (gm, lv) => {
            gm.marketingMultiplier = 1.0 + (lv * 0.1);
        }, { type: 'plastic', amount: 500 });
        add('combo_chip', 'コンボチップ', 'コンボボーナス倍率UP', 2500, 'val_base', 5, 1.5, { x: 2, y: 1 }, (gm, lv) => {
            gm.comboMultiplier = 1.0 + (lv * 0.2);
        }, { type: 'circuit', amount: 300 });
        add('click_crit', 'クリティカル', 'クリック時に確率で3倍収入', 500, 'val_base', 10, 1.6, { x: 2, y: -1 }, (gm, lv) => {
            gm.critChance = Math.min(0.5, lv * 0.05);
        }, { type: 'metal', amount: 500 });
        // Tier 3
        add('compound_interest', '複利運用', '5秒毎に所持金の0.5%利息', 30000, 'marketing', 10, 1.5, { x: 3, y: 0 }, (gm, lv) => {
            gm.interestRate = 0.005;
            gm.interestCap = 1000 + (lv * 1000);
        }, { type: 'metal', amount: 2000 });

        // Tier 4
        add('unlock_industry', '産業革命', '自動資源生成・売却系を解禁', 100000, 'compound_interest', 1, 1, { x: 4, y: 0 }, () => { }, { type: 'circuit', amount: 1000 });
        add('trash_futures', 'ゴミ先物取引', '売却価格が常に変動', 150000, 'unlock_industry', 1, 1, { x: 4, y: 1 }, (gm) => { gm.futuresUnlocked = true; }, { type: 'circuit', amount: 2000 });
        add('auto_miner', '自動採掘', '毎秒プラ+金属を獲得', 200000, 'unlock_industry', 10, 1.3, { x: 5, y: -1 }, () => { }, { type: 'metal', amount: 3000 });
        add('auto_factory', '自動工場', '毎秒プラ+金属を売却', 500000, 'unlock_industry', 10, 1.4, { x: 5, y: 1 }, () => { }, { type: 'plastic', amount: 3000 });

        // Tier 5
        add('auto_sorter', '自動選別機', '特定ゴミを即時換金', 1500000, 'auto_factory', 1, 1, { x: 6, y: 1 }, () => { }, { type: 'circuit', amount: 5000 });
        add('global_mining', '世界展開', '収入効率大幅UP', 800000, 'auto_miner', 1, 1, { x: 6, y: -1 }, () => { }, { type: 'metal', amount: 5000 });

        // Tier 6
        add('crypto_mining', '仮想通貨マイニング', 'エネルギーを消費して資金生成', 500000, 'unlock_industry', 20, 1.4, { x: 5, y: 0 }, (gm, lv) => {
            gm.cryptoLevel = lv;
        }, { type: 'circuit', amount: 2000 });

        // Tier 7
        add('buy_planet', '地球買収', 'ゲームクリア', 100000000, 'crypto_mining', 1, 1, { x: 7, y: 0 }, () => { console.log("WIN"); }, { type: 'metal', amount: 5000 });
        add('galactic_fed', '銀河連邦加盟', 'エンディング分岐B', 200000000, 'buy_planet', 1, 1, { x: 8, y: 0 }, () => { }, { type: 'circuit', amount: 9999 });


        // =================================================================================
        // === WEST BRANCH (Left, X-): PHYSICS & ENERGY ===
        // Vacuum -> Energy -> Black Hole -> Time Prep -> Quantum
        // =================================================================================

        // Tier 1
        add('vacuum_unlock', '吸引装置', '右クリック長押しでゴミを吸い寄せる', 300, 'root_mining', 1, 1, { x: -1, y: 0 }, () => { });

        // Tier 2
        add('vacuum_power', '吸引力強化', '吸引スピードUP', 500, 'vacuum_unlock', 10, 1.5, { x: -2, y: 0 }, (gm, lv) => {
            gm.vacuumPower = 0.005 + (lv * 0.0005);
        }, { type: 'plastic', amount: 200 });
        add('vacuum_range', '吸引範囲', '吸引の有効範囲拡大', 600, 'vacuum_power', 10, 1.5, { x: -2, y: 1 }, (gm, lv) => {
            gm.vacuumRange = 200 + (lv * 50);
        }, { type: 'metal', amount: 300 });

        // Tier 3
        add('black_hole_unlock', 'ブラックホール', 'ゴミを吸い込む特異点を生成', 50000, 'vacuum_power', 1, 1, { x: -3, y: 0 }, () => { }, { type: 'metal', amount: 500 });
        add('hawking_radiation', 'ホーキング放射', '活性化中、エネルギーを少し還元', 200000, 'black_hole_unlock', 1, 1, { x: -3, y: -1 }, () => { }, { type: 'bioCell', amount: 1000 });
        add('event_horizon', '事象の地平線', 'ブラックホールの吸引範囲拡大', 3000, 'black_hole_unlock', 5, 1.6, { x: -3, y: 1 }, () => { }, { type: 'metal', amount: 1000 });
        add('singularity_engine', '特異点エンジン', 'ブラックホールの成長速度UP', 150000, 'black_hole_unlock', 3, 2.0, { x: -4, y: 0 }, () => { }, { type: 'rareMetal', amount: 500 });

        // Tier 4 (Energy)
        add('solar_panel', 'ソーラーパネル', '毎秒エネルギー+1/Lv', 20000, 'vacuum_power', 10, 1.5, { x: -2, y: -2 }, () => { }, { type: 'metal', amount: 500 });
        add('battery_upgrade', '大容量蓄電池', '最大エネルギー保存量UP', 50000, 'solar_panel', 5, 1.5, { x: -2, y: -3 }, () => { }, { type: 'metal', amount: 1000 });
        add('laser_grid', '防衛レーザー', '自動焦却（エネルギー消費）', 250000, 'battery_upgrade', 5, 2.0, { x: -1, y: -2 }, (gm, lv) => {
            gm.laserPower = lv * 10;
        }, { type: 'circuit', amount: 800 });

        // Tier 5 (Quantum)
        add('quantum_core', '量子コア', '全速度倍増', 1000000, 'singularity_engine', 1, 1, { x: -5, y: 0 }, () => { }, { type: 'rareMetal', amount: 2000 });
        add('quantum_destabilizer', '量子分解', '爆発で資源を獲得可能に', 800000, 'quantum_core', 1, 1, { x: -5, y: 1 }, () => { }, { type: 'bioCell', amount: 2000 });
        add('time_machine', 'タイムマシン', '失ったゴミを回収', 25000000, 'quantum_core', 1, 1, { x: -6, y: 0 }, () => { }, { type: 'radioactive', amount: 1000 });
        add('time_warp', '時間跳躍', '時間加速スキル', 75000000, 'time_machine', 1, 1, { x: -7, y: 0 }, () => { }, { type: 'darkMatter', amount: 2000 });

        // Tier 6 (Quantum High)
        add('unlock_quantum', '量子デバイス回収', '量子デバイスが出現', 50000000, 'quantum_core', 1, 1, { x: -5, y: -2 }, () => { }, { type: 'rareMetal', amount: 5000 });
        add('quantum_storage', '量子ストレージ', '床容量+500', 80000000, 'unlock_quantum', 3, 1.5, { x: -6, y: -2 }, (gm, lv) => { gm.trashCapacity += lv * 500; }, { type: 'quantumCrystal', amount: 500 });
        add('quantum_teleport', '量子テレポート', 'ゴミを瞬時に回収可能', 150000000, 'quantum_storage', 1, 1, { x: -7, y: -2 }, () => { }, { type: 'quantumCrystal', amount: 1000 });
        add('quantum_multiverse', 'マルチバース', '並行世界から収入を得る', 1000000000, 'quantum_teleport', 1, 1, { x: -8, y: -2 }, () => { console.log("MULTIVERSE WIN"); }, { type: 'quantumCrystal', amount: 10000 });


        // === OTHER / LEFTOVER ADAPTATION ===
        // Some items from the previous list might need home if I missed them. checked generally looks good.
        // I put 'magnet_field', 'gravity_manipulator' here:
        add('magnet_field', '磁力場', '金属・基板を中央に引き寄せて、効率よく処理する', 40000, 'vacuum_power', 1, 1, { x: -1, y: 1 }, () => { }, { type: 'metal', amount: 1000 });
        add('gravity_manipulator', '重力制御', 'ゴミの落下速度を自在に操る', 2000000, 'singularity_engine', 3, 1.5, { x: -4, y: 1 }, () => { }, { type: 'rareMetal', amount: 1000 });

        // Rare Metals
        add('unlock_battery', 'バッテリー回収', 'バッテリーゴミが出現', 500000, 'auto_sorter', 1, 1, { x: 6, y: 2 }, () => { }, { type: 'circuit', amount: 1000 });
        add('rare_metal_processing', 'レアメタル精製', 'レアメタル獲得量+1', 1000000, 'unlock_battery', 5, 1.5, { x: 7, y: 2 }, () => { }, { type: 'rareMetal', amount: 500 });
        add('rare_alloy', '特殊合金', 'ガジェット効果2倍', 5000000, 'rare_metal_processing', 1, 1, { x: 8, y: 2 }, () => { }, { type: 'rareMetal', amount: 500 });

        // Misc
        add('market_manipulation', '相場操作', '一時的に売却額を大幅に引き上げる', 5000, 'marketing', 1, 1, { x: 3, y: 1 }, () => { }, { type: 'plastic', amount: 1000 });
        add('luck_unlock', 'ラッキーゴミ', '金色のゴミが出現しやすくなる', 5000, 'click_crit', 1, 1, { x: 3, y: -1 }, (gm) => { gm.luckRate = 0.05; }, { type: 'metal', amount: 1000 });
        add('rainbow_trash', '虹色ゴミ', '超高額ゴミが出現するようになる', 75000, 'luck_unlock', 1, 1, { x: 4, y: -1 }, () => { }, { type: 'rareMetal', amount: 100 });

        // Gadget Stuff
        add('gadget_mastery', 'ガジェット研究', 'クラフトコストを大幅に削減', 50000, 'unlock_crafting', 5, 1.5, { x: 1, y: 1 }, (gm, lv) => {
            gm.craftingCostReduction = Math.min(0.5, lv * 0.1);
        }, { type: 'circuit', amount: 500 });
        add('dynamite_spec', '発破技術', 'ダイナマイトの効果範囲を拡大', 15000, 'unlock_crafting', 5, 1.5, { x: 0, y: 3 }, (gm, lv) => {
            gm.dynamiteRange = 150 + (lv * 30);
        }, { type: 'metal', amount: 500 });
        // Fix collision: unlock_circuit is (0,3). dynamite_spec to (1,3)? recycling_tech is (1,3).
        // Move dynamite_spec to (2,2)
        this.getUpgrade('dynamite_spec')!.pos = { x: 2, y: 2 };
    }






    public addMoney(amount: number) {
        const val = Math.floor(amount);
        this.money = Math.floor(this.money + val);
        if (amount > 0) this.totalMoney = Math.floor(this.totalMoney + val);
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
            this.totalBioCell += amount;
        } else if (type === 'rareMetal') {
            this.rareMetal += amount;
            this.totalRareMetal += amount;
        } else if (type === 'radioactive') {
            this.radioactive += amount;
            this.totalRadioactive += amount;
        } else if (type === 'darkMatter') {
            this.darkMatter += amount;
            this.totalDarkMatter += amount;
        } else if (type === 'quantumCrystal') {
            this.quantumCrystal += amount;
            this.totalQuantumCrystal += amount;
        }
        this.save();
    }

    public addEnergy(amount: number) {
        this.energy = Math.min(this.energy + amount, this.maxEnergy);
        if (this.energy < 0) this.energy = 0;
    }

    // === BANK HELPERS ===
    public depositToBank(amount: number) {
        const val = Math.floor(amount);
        if (val <= 0) return;
        if (this.money >= val) {
            this.money = Math.floor(this.money - val);
            this.depositedMoney = Math.floor(this.depositedMoney + val);
            this.save();
        }
    }

    public withdrawFromBank(amount: number) {
        const val = Math.floor(amount);
        if (val <= 0) return;
        if (this.depositedMoney >= val) {
            this.depositedMoney = Math.floor(this.depositedMoney - val);
            this.money = Math.floor(this.money + val);
            this.save();
        }
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
        } else if (type === 'rareMetal' && this.rareMetal >= amount) {
            this.rareMetal -= amount;
            this.save();
            return true;
        } else if (type === 'radioactive' && this.radioactive >= amount) {
            this.radioactive -= amount;
            this.save();
            return true;
        } else if (type === 'darkMatter' && this.darkMatter >= amount) {
            this.darkMatter -= amount;
            this.save();
            return true;
        } else if (type === 'quantumCrystal' && this.quantumCrystal >= amount) {
            this.quantumCrystal -= amount;
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

    // --- Roguelike Upgrade System ---

    // --- Roguelike Upgrade System (Vampire Survivors Style) ---

    public getRogueStatInfo(type: keyof typeof this.rogueStats): { name: string, desc: string, cost: number, max: number } {
        const level = this.rogueStats[type];
        // Base costs and scaling (Simplified VS style)
        // PowerUp costs usually scale: Base * (1 + 0.1 * total_bought_powerups). 
        // For simplicity, let's just scale by level for now.

        let baseCost = 100;
        let maxLevel = 5;
        let name = type.toUpperCase();
        let desc = "Upgrade";

        switch (type) {
            case 'might': baseCost = 200; maxLevel = 5; name = "攻撃力"; desc = "ダメージ +10%"; break;
            case 'armor': baseCost = 200; maxLevel = 3; name = "防御力"; desc = "被ダメージ -1"; break;
            case 'maxHp': baseCost = 200; maxLevel = 5; name = "最大HP"; desc = "HP +10%"; break;
            case 'recovery': baseCost = 200; maxLevel = 5; name = "自動回復"; desc = "0.1 HP/秒"; break;
            case 'cooldown': baseCost = 900; maxLevel = 2; name = "クールダウン"; desc = "CT -2.5%"; break;
            case 'area': baseCost = 300; maxLevel = 2; name = "攻撃範囲"; desc = "サイズ +10%"; break;
            case 'speed': baseCost = 300; maxLevel = 2; name = "弾速"; desc = "速度 +10%"; break;
            case 'duration': baseCost = 300; maxLevel = 2; name = "持続時間"; desc = "効果時間 +15%"; break;
            case 'amount': baseCost = 5000; maxLevel = 1; name = "発射数"; desc = "発射数 +1"; break;
            case 'moveSpeed': baseCost = 300; maxLevel = 2; name = "移動速度"; desc = "速度 +5%"; break;
            case 'magnet': baseCost = 300; maxLevel = 2; name = "吸引範囲"; desc = "回収範囲 +25%"; break;
            case 'luck': baseCost = 600; maxLevel = 3; name = "運気"; desc = "ドロップ率 +10%"; break;
            case 'greed': baseCost = 200; maxLevel = 5; name = "強欲"; desc = "獲得ゴールド +10%"; break;
            case 'growth': baseCost = 900; maxLevel = 5; name = "成長"; desc = "獲得経験値 +3%"; break;
            case 'revival': baseCost = 10000; maxLevel = 1; name = "復活"; desc = "復活回数 +1"; break;
        }

        // Simple exponential curve + flat
        const cost = Math.floor(baseCost * Math.pow(1.7, level));
        return { name, desc, cost, max: maxLevel };
    }

    public upgradeRogueStat(type: keyof typeof this.rogueStats): boolean {
        const info = this.getRogueStatInfo(type);
        if (this.rogueStats[type] >= info.max) return false;

        if (this.rogueGold >= info.cost) {
            this.rogueGold -= info.cost;
            this.rogueStats[type]++;
            this.save();
            return true;
        }
        return false;
    }

    public refundAllRogueStats() {
        let totalRefund = 0;
        console.log("Starting refund calculation...");

        for (const key in this.rogueStats) {
            const type = key as keyof typeof this.rogueStats;
            const level = this.rogueStats[type];
            if (level === 0) continue;

            let statRefund = 0;
            for (let i = 0; i < level; i++) {
                statRefund += this.calculateCostForLevel(type, i);
            }
            console.log(`Refunding ${type}: level ${level}, amount ${statRefund}`);
            totalRefund += statRefund;
            this.rogueStats[type] = 0;
        }

        console.log(`Total refund: ${totalRefund}`);
        this.rogueGold += totalRefund;
        this.save();
    }

    private calculateCostForLevel(type: keyof typeof this.rogueStats, level: number): number {
        let baseCost = 100;
        switch (type) {
            case 'might': baseCost = 200; break;
            case 'armor': baseCost = 200; break;
            case 'maxHp': baseCost = 200; break;
            case 'recovery': baseCost = 200; break;
            case 'cooldown': baseCost = 900; break;
            case 'area': baseCost = 300; break;
            case 'speed': baseCost = 300; break;
            case 'duration': baseCost = 300; break;
            case 'amount': baseCost = 5000; break;
            case 'moveSpeed': baseCost = 300; break;
            case 'magnet': baseCost = 300; break;
            case 'luck': baseCost = 600; break;
            case 'greed': baseCost = 200; break;
            case 'growth': baseCost = 900; break;
            case 'revival': baseCost = 10000; break;
        }
        return Math.floor(baseCost * Math.pow(1.7, level));
    }

    private initAchievements() {
        if (this.achievements.length > 0) return;

        const addAch = (id: string, name: string, desc: string, condition: (gm: GameManager) => boolean) => {
            this.achievements.push({ id, name, desc, unlocked: false, condition });
        };

        // === PHASE 1: STARTUP (序盤) ===
        // === PHASE 1: STARTUP (序盤) ===
        addAch('ach_start', '一歩目', '手動回収 10回', (gm) => gm.pressCount >= 10);
        addAch('ach_craft', 'DIY精神', 'クラフト解禁', (gm) => (gm.getUpgrade('unlock_crafting')?.level ?? 0) > 0);
        addAch('ach_click_100', '指の運動', '手動回収 100回', (gm) => gm.pressCount >= 100);
        addAch('ach_plastic_100', 'プラスチック入門', '累計プラ 100個', (gm) => gm.totalPlastic >= 100);
        addAch('ach_metal_100', 'スクラップ集め', '累計金属 100個', (gm) => gm.totalMetal >= 100);
        addAch('ach_auto', '自動化の幕開け', 'ドローンを購入', (gm) => gm.droneUnlocked);

        // === PHASE 2: EXPANSION (拡大) ===
        addAch('ach_plastic_k', 'プラスチック王', '累計プラ 5,000個', (gm) => gm.totalPlastic >= 5000);
        addAch('ach_metal_k', '鉄の心', '累計金属 5,000個', (gm) => gm.totalMetal >= 5000);
        addAch('ach_circuit_100', '電子工作', '累計基板 100個', (gm) => gm.totalCircuit >= 100);
        addAch('ach_marketing', '広告戦略', '広告戦略 Lv10', (gm) => (gm.getUpgrade('marketing')?.level ?? 0) >= 10);
        addAch('ach_lab', '研究者', '研究所建設', (gm) => (gm.getUpgrade('research_lab')?.level ?? 0) > 0);
        addAch('ach_conveyor', 'ライン作業', 'ベルトコンベア設置', (gm) => gm.conveyorUnlocked);

        // === PHASE 3: INDUSTRIAL (産業) ===
        addAch('ach_incinerator', '焼却処分', '焼却炉建設', (gm) => (gm.getUpgrade('incinerator')?.level ?? 0) > 0);
        addAch('ach_automation_master', '工場長', 'Lv30 床面積拡張', (gm) => (gm.getUpgrade('floor_capacity')?.level ?? 0) >= 30);
        addAch('ach_silicon', 'シリコンバレー', '累計基板 1,000個', (gm) => gm.totalCircuit >= 1000);
        addAch('ach_gadget_10', '発明家', 'ガジェット所持数 合計10個', (gm) => Object.values(gm.inventory).reduce((a, b) => a + b, 0) >= 10);
        addAch('ach_speed', '高速搬入', '搬入ディレイ 300ms以下', (gm) => gm.spawnDelay <= 300);

        // === PHASE 4: ECONOMY (経済) ===
        addAch('ach_banker', '銀行家', '銀行預金 100万円', (gm) => gm.depositedMoney >= 1000000);
        addAch('ach_hedge_fund', 'ヘッジファンド', '1回の利息が1万円超え', (gm) => Math.floor(gm.depositedMoney * 0.02) >= 10000);
        addAch('ach_crypto', 'クリプト王', 'マイニング強度最大(10)', (gm) => gm.miningIntensity >= 10);
        addAch('ach_rich', '億万長者', '総資産 1億円', (gm) => gm.totalMoney >= 100000000);

        // === PHASE 5: ENERGY & PHYSICS (エネルギー・物理) ===
        addAch('ach_nuclear', '原子力', '原子炉建設', (gm) => (gm.getUpgrade('nuclear_reactor')?.level ?? 0) > 0);
        addAch('ach_fusion', '核融合', '核融合炉建設', (gm) => (gm.getUpgrade('fusion_reactor')?.level ?? 0) > 0);
        addAch('ach_battery', 'エネルギー危機', '累計放射性物質 500個', (gm) => gm.radioactive >= 500);
        addAch('ach_max_energy', 'フルパワー', 'エネルギー最大値 5,000', (gm) => gm.maxEnergy >= 5000);
        addAch('ach_bh', '特異点', 'ブラックホールを生成', (gm) => (gm.getUpgrade('black_hole_unlock')?.level ?? 0) > 0);

        // === PHASE 6: SPACE (宇宙) ===
        addAch('ach_satellite', 'スペースデブリ', '衛星回収許可を取得', (gm) => (gm.getUpgrade('unlock_satellite')?.level ?? 0) > 0);
        addAch('ach_stargazer', 'スターゲイザー', '軌道ステーション建設', (gm) => (gm.getUpgrade('orbital_station')?.level ?? 0) > 0);
        addAch('ach_moon', '月面着陸', '月面基地建設', (gm) => (gm.getUpgrade('moon_base')?.level ?? 0) > 0);
        addAch('ach_dark_matter', '暗黒物質', '累計ダークマター 100個', (gm) => gm.darkMatter >= 100);

        // === PHASE 7: QUANTUM & ENDGAME (量子・終焉) ===
        addAch('ach_quantum', '量子超越', '量子テレポート開発', (gm) => (gm.getUpgrade('quantum_teleport')?.level ?? 0) > 0);
        addAch('ach_quantum_storage', '四次元ポケット', '量子ストレージ建設', (gm) => (gm.getUpgrade('quantum_storage')?.level ?? 0) > 0);
        addAch('ach_mars', '火星移住計画', '火星コロニー建設 (Ending A)', (gm) => (gm.getUpgrade('mars_colony')?.level ?? 0) > 0);
        addAch('ach_universe', '多元宇宙への旅', 'マルチバース到達 (Ending B)', (gm) => (gm.getUpgrade('quantum_multiverse')?.level ?? 0) > 0);
        addAch('ach_earth', '地球の支配者', '地球買収完了 (Ending C)', (gm) => (gm.getUpgrade('buy_planet')?.level ?? 0) > 0);

        // === CHALLENGE & SECRET (やり込み・隠し) ===
        addAch('ach_click_master', 'ゴッドフィンガー', '手動回収 5,000回', (gm) => gm.pressCount >= 5000);
        addAch('ach_trillion', '兆万長者', '所持金 1兆円達成', (gm) => gm.money >= 1000000000000);
        addAch('ach_hoarder', '収集癖', '全通常資源(プラ〜基板)が各10,000個', (gm) => gm.plastic >= 10000 && gm.metal >= 10000 && gm.circuit >= 10000);
        addAch('ach_completionist', '完全制覇', '全アップグレード取得(Lv1以上)', (gm) => gm.getAllUpgrades().every(u => u.level > 0));
        addAch('ach_speed_demon', '光速の領域', '搬入ディレイ 100ms(最小値)', (gm) => gm.spawnDelay <= 100);
        addAch('ach_secret', '真実の探究者', '隠しモードを発見', (gm) => gm.secretModeDiscovered);

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

    // Get upgrades filtered by category
    getUpgradesByCategory(category: UpgradeCategory): Upgrade[] {
        return this.upgrades.filter(u => u.category === category);
    }

    // Check if a tab is unlocked based on D-plan conditions
    isTabUnlocked(category: UpgradeCategory): boolean {
        switch (category) {
            case 'processing':
                return true; // Always unlocked
            case 'automation':
                // Unlock when drone is purchased
                const droneUp = this.getUpgrade('drone_unlock');
                return droneUp ? droneUp.level > 0 : false;
            case 'research':
                // Unlock when totalMoney >= 1,000,000
                return this.totalMoney >= 1000000;
            case 'space':
                // Unlock when unlock_satellite is purchased
                const satUp = this.getUpgrade('unlock_satellite');
                return satUp ? satUp.level > 0 : false;
            case 'endgame':
                // Unlock when mars_colony or quantum_teleport is purchased
                const marsUp = this.getUpgrade('mars_colony');
                const quantumUp = this.getUpgrade('quantum_teleport');
                const marsUnlocked = marsUp && marsUp.level > 0;
                const quantumUnlocked = quantumUp && quantumUp.level > 0;
                return Boolean(marsUnlocked || quantumUnlocked);
            default:
                return false;
        }
    }

    // Get tab unlock hint text
    getTabUnlockHint(category: UpgradeCategory): string {
        switch (category) {
            case 'automation':
                return '「ドローン」を購入で解放';
            case 'research':
                return '累計収入 ¥1,000,000 で解放';
            case 'space':
                return '「衛星回収許可」を購入で解放';
            case 'endgame':
                return '「火星コロニー」か「量子テレポート」で解放';
            default:
                return '';
        }
    }


    getCost(up: Upgrade): number {
        if (up.level >= up.maxLevel) return Infinity;
        return Math.floor(up.baseCost * Math.pow(up.costMultiplier, up.level));
    }

    getResourceCost(up: Upgrade): { type: ResourceType, amount: number } | null {
        if (!up.resourceCost) return null;
        if (up.level >= up.maxLevel) return null;
        // Reduce base cost to 10% of the defined amount (User: too hard to get resources)
        const baseAmount = up.resourceCost.amount * 0.1;
        // Significantly dampen the scaling (80% less aggressive than money)
        const dampenedMult = 1 + (up.costMultiplier - 1) * 0.2;
        const amount = Math.floor(baseAmount * Math.pow(dampenedMult, up.level));
        return { type: up.resourceCost.type, amount: Math.max(1, amount) };
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

        const resCost = this.getResourceCost(up);
        if (resCost) {
            if (resCost.type === 'plastic' && this.plastic < resCost.amount) return false;
            if (resCost.type === 'metal' && this.metal < resCost.amount) return false;
            if (resCost.type === 'circuit' && this.circuit < resCost.amount) return false;
            if (resCost.type === 'bioCell' && this.bioCell < resCost.amount) return false;
            if (resCost.type === 'rareMetal' && this.rareMetal < resCost.amount) return false;
            if (resCost.type === 'radioactive' && this.radioactive < resCost.amount) return false;
            if (resCost.type === 'darkMatter' && this.darkMatter < resCost.amount) return false;
            if (resCost.type === 'quantumCrystal' && this.quantumCrystal < resCost.amount) return false;
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
            const resCost = this.getResourceCost(up);

            this.money -= cost;

            if (resCost) {
                this.spendResource(resCost.type, resCost.amount);
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

        // Reset all resources and money
        this.money = 0;
        this.plastic = 0;
        this.metal = 0;
        this.circuit = 0;
        this.bioCell = 0;
        this.rareMetal = 0;
        this.radioactive = 0;
        this.darkMatter = 0;
        this.quantumCrystal = 0;
        this.energy = 0;

        // Reset Lifetime Stats
        this.totalMoney = 0;
        this.totalPlastic = 0;
        this.totalMetal = 0;
        this.totalCircuit = 0;
        this.totalBioCell = 0;
        this.totalRareMetal = 0;
        this.totalRadioactive = 0;
        this.totalDarkMatter = 0;
        this.totalQuantumCrystal = 0;
        this.pressCount = 0;
        this.playTime = 0;
        this.prestigeMultiplier = 1.0;
        this.trashCapacity = 30;
        this.inventory = {};
        this.refineryInventory = {};

        // Reset System/Facility Flags
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
        this.dronesActive = false;
        this.droneSpeed = 100;
        this.droneCapacity = 1;
        this.droneCount = 0;
        this.marketingMultiplier = 1.0;
        this.comboMultiplier = 1.0;
        this.conveyorUnlocked = false;
        this.conveyorActive = false;
        this.refineryCapacity = 100;
        this.shippedTrashBuffer = [];
        this.magnetActive = false;
        this.laserActive = false;
        this.blackHoleActive = false;
        this.nanobotsActive = false;
        this.gravityActive = false;
        this.secretModeDiscovered = false;

        // Reset Financial Tech
        this.interestRate = 0;
        this.interestCap = 10000;
        this.futuresUnlocked = false;
        this.marketMultiplier = 1.0;
        this.depositedMoney = 0;
        this.miningActive = false;
        this.miningIntensity = 1;
        this.autoSellThreshold = 0;
        this.vacuumPowerPref = 1.0;
        this.vacuumRangePref = 1.0;

        // Reset Roguelike Persistent Stats
        this.rogueGold = 0;
        this.rogueStats = {
            might: 0, armor: 0, maxHp: 0, recovery: 0, cooldown: 0,
            area: 0, speed: 0, duration: 0, amount: 0, moveSpeed: 0,
            magnet: 0, luck: 0, greed: 0, growth: 0, revival: 0
        };

        // Reset upgrades & achievements
        this.upgrades = [];
        this.initUpgrades();
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
            rareMetal: this.rareMetal,
            radioactive: this.radioactive,
            darkMatter: this.darkMatter,
            quantumCrystal: this.quantumCrystal,
            energy: this.energy,

            // Lifetime
            totalMoney: this.totalMoney,
            totalPlastic: this.totalPlastic,
            totalMetal: this.totalMetal,
            totalCircuit: this.totalCircuit,
            totalBioCell: this.totalBioCell,
            totalRareMetal: this.totalRareMetal,
            totalRadioactive: this.totalRadioactive,
            totalDarkMatter: this.totalDarkMatter,
            totalQuantumCrystal: this.totalQuantumCrystal,
            pressCount: this.pressCount,
            playTime: this.playTime,
            prestigeMultiplier: this.prestigeMultiplier,
            inventory: this.inventory,
            refineryInventory: this.refineryInventory,

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
                marketingMultiplier: this.marketingMultiplier,
                vacuumPowerPref: this.vacuumPowerPref,
                vacuumRangePref: this.vacuumRangePref
            },
            upgrades: this.upgrades.map(u => ({ id: u.id, level: u.level })),
            achievements: this.achievements.map(a => ({ id: a.id, unlocked: a.unlocked })),
            rogueStats: this.rogueStats,
            rogueGold: this.rogueGold,
            // Finance
            depositedMoney: this.depositedMoney,
            miningActive: this.miningActive,
            miningIntensity: this.miningIntensity,
            autoSellThreshold: this.autoSellThreshold,
            secretModeDiscovered: this.secretModeDiscovered,
            settings: this.settings
        };
        localStorage.setItem('cyber_trash_save_v4', JSON.stringify(data));
    }

    load() {
        const raw = localStorage.getItem('cyber_trash_save_v4');
        if (raw) {
            const data = JSON.parse(raw);
            this.money = Math.floor(data.money || 0);
            this.rogueGold = Math.floor(data.rogueGold || 0);

            // Finance Restore
            this.depositedMoney = Math.floor(data.depositedMoney || 0);
            this.miningActive = data.miningActive ?? false;
            this.miningIntensity = data.miningIntensity ?? 1;
            this.autoSellThreshold = data.autoSellThreshold ?? 0.0;
            this.secretModeDiscovered = data.secretModeDiscovered ?? false;

            if (data.settings) {
                this.settings = { ...this.settings, ...data.settings };
            }

            if (data.rogueStats) {
                // Smart merge to handle new params
                this.rogueStats = { ...this.rogueStats, ...data.rogueStats };
            }
            this.plastic = data.plastic || 0;
            this.metal = data.metal || 0;
            this.circuit = data.circuit || 0;
            this.bioCell = data.bioCell || 0;
            this.rareMetal = data.rareMetal || 0;
            this.radioactive = data.radioactive || 0;
            this.darkMatter = data.darkMatter || 0;
            this.quantumCrystal = data.quantumCrystal || 0;
            this.energy = data.energy || 0;
            if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;

            this.totalMoney = Math.floor(data.totalMoney || this.money);
            this.totalPlastic = data.totalPlastic || this.plastic;
            this.totalMetal = data.totalMetal || this.metal;
            this.totalCircuit = data.totalCircuit || this.circuit;
            this.totalBioCell = data.totalBioCell || this.bioCell;
            this.totalRareMetal = data.totalRareMetal || 0;
            this.totalRadioactive = data.totalRadioactive || 0;
            this.totalDarkMatter = data.totalDarkMatter || 0;
            this.totalQuantumCrystal = data.totalQuantumCrystal || 0;
            this.pressCount = data.pressCount || 0;
            this.playTime = data.playTime || 0;
            this.prestigeMultiplier = data.prestigeMultiplier || 1.0;
            this.inventory = data.inventory || {};
            this.refineryInventory = data.refineryInventory || {};

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
                this.vacuumPowerPref = data.stats.vacuumPowerPref ?? 1.0;
                this.vacuumRangePref = data.stats.vacuumRangePref ?? 1.0;
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

    public getResourcePrice(type: string): number {
        const base = this.trashValue;
        const prices: Record<string, number> = {
            'plastic': base * 0.25, // UP from 0.1
            'metal': base * 0.4,   // UP from 0.1
            'circuit': base * 0.8, // UP from 0.5
            'bioCell': base * 1.0, // UP from 0.6
            'rareMetal': base * 2.5, // UP from 1.5
            'radioactive': base * 6.0, // UP from 4.0
            'darkMatter': base * 20.0, // UP from 15.0
            'quantumCrystal': base * 70.0 // UP from 50.0
        };
        return Math.floor((prices[type] || 0) * this.marketingMultiplier * this.marketMultiplier * this.prestigeMultiplier);
    }

    public sellResources(types: ResourceType[], percent: number = 1.0): number {
        let revenue = 0;
        const multiplier = this.marketMultiplier;

        types.forEach(type => {
            const current = (this as any)[type] as number;
            if (current > 0) {
                const amount = Math.floor(current * percent);
                if (amount > 0) {
                    const price = this.getResourcePrice(type);
                    const earnings = Math.floor(amount * price * multiplier);
                    revenue += earnings;
                    this.addResource(type, -amount);
                }
            }
        });

        if (revenue > 0) {
            this.addMoney(revenue);
        }
        return revenue;
    }

    public update(delta: number): { interestPaid: number, marketChanged: boolean, cryptoPaid: number } {
        let interestPaid = 0;
        let marketChanged = false;
        let cryptoPaid = 0;

        // Interest (Bank)
        // Interest (Bank)
        if (true) { // Always active if Bank UI is accessible
            this.interestTimer += delta;
            if (this.interestTimer >= 10000) { // 10s
                this.interestTimer = 0;

                if (this.depositedMoney > 0) {
                    const payment = Math.floor(this.depositedMoney * 0.02); // 2%
                    if (payment > 0) {
                        this.depositedMoney += payment; // Add to bank
                        interestPaid = payment;
                    }
                }
            }
        }

        // Futures
        if (this.futuresUnlocked) {
            this.marketTimer += delta;
            if (this.marketTimer >= 10000) {
                this.marketTimer = 0;
                // Random 0.8 to 1.5
                this.marketMultiplier = 0.8 + (Math.random() * 0.7);
                this.marketTrend = this.marketMultiplier >= 1.0 ? 'BULL' : 'BEAR';
                marketChanged = true;
            }
        }

        // Crypto
        if (this.cryptoLevel > 0 && this.miningActive) {
            this.cryptoTimer += delta;
            if (this.cryptoTimer >= 1000) {
                this.cryptoTimer = 0;

                const cost = Math.ceil(this.miningIntensity * 10);
                if (this.energy >= cost) {
                    // Consume energy
                    this.addEnergy(-cost);

                    const gain = Math.floor(this.cryptoLevel * 100 * this.marketMultiplier * this.miningIntensity);
                    this.addMoney(gain); // Mining goes to wallet
                    cryptoPaid = gain;
                } else {
                    // Auto turn off if no energy? Or just stall?
                    // Stall is fine.
                }
            }
        }

        return { interestPaid, marketChanged, cryptoPaid };
    }
}
