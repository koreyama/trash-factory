import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';
import { Trash } from './Trash';
import { FloatingText } from './FloatingText';

export class BlackHole extends Phaser.GameObjects.Container {
    private mainSprite: Phaser.GameObjects.Arc;     // The Event Horizon (Black)
    private photonRing: Phaser.GameObjects.Arc;     // Glowing Ring
    private accretionDisk: Phaser.GameObjects.Graphics; // Swirling Matter
    private particles: Phaser.GameObjects.Particles.ParticleEmitter;

    private _state: 'DORMANT' | 'ACTIVE' | 'UNSTABLE' = 'DORMANT';
    private consumedMass: number = 0;
    private massLimit: number = 1000; // Increased capacity for visual impact
    private suctionRange: number = 250;
    private suctionForce: number = 0.001; // Reduced from 0.008 to prevent vacuum-cleaner effect

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // 1. Accretion Disk (Swirling Gas)
        // We use Graphics to draw multiple spiral arcs
        this.accretionDisk = scene.add.graphics();
        this.drawAccretionDisk();
        this.add(this.accretionDisk);

        // 2. Photon Ring (Unstable Orbit)
        // A glowing ring just outside the event horizon
        this.photonRing = scene.add.circle(0, 0, 35, 0xffffff, 0);
        this.photonRing.setStrokeStyle(3, 0xc71585, 0.8); // Deep Pink/Purple
        this.add(this.photonRing);

        // 3. Event Horizon (The Void)
        this.mainSprite = scene.add.circle(0, 0, 30, 0x000000, 1);
        this.mainSprite.setStrokeStyle(1, 0x4b0082); // Indigo
        this.add(this.mainSprite);

        // 4. Particles (Infalling Matter)
        // Texture generation if needed
        if (!scene.textures.exists('bh_matter')) {
            const g = scene.make.graphics({ x: 0, y: 0 });
            g.fillStyle(0xffffff, 1);
            g.fillCircle(4, 4, 4); // Soft glow
            g.generateTexture('bh_matter', 8, 8);
        }

        this.particles = scene.add.particles(0, 0, 'bh_matter', {
            // Emitting from a ring
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Circle(0, 0, 180)
            } as any,
            lifespan: { min: 600, max: 1000 },
            scale: { start: 0.8, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            tint: [0x9b59b6, 0x8e44ad, 0x2980b9, 0xe74c3c], // Cosmic colors
            blendMode: 'ADD',
            frequency: 30,
            quantity: 3,
            follow: this
        });

        // Custom update to make particles spiral in
        // Note: In Phaser 3.60+, ParticleEmitter has more features. 
        // We'll stick to simple gravity/speed if possible, or just let them fade in/out
        // to simulate "appearing from gas and falling in".
        // A moveTowards center effect:
        // Custom update to make particles spiral in
        const processor = {
            manager: this.particles,
            x: 0,
            y: 0,
            active: true,
            destroy: () => { },
            update: (particle: any, _delta: number, _t: number) => {
                // Ensure delta is used or ignored (underscored if unused)
                const tx = this.x;
                const ty = this.y;
                particle.x += (tx - particle.x) * 0.05;
                particle.y += (ty - particle.y) * 0.05;
            }
        };
        this.particles.addParticleProcessor(processor);

        this.particles.stop();

        scene.add.existing(this);
        this.setVisible(false); // Hidden by default until unlocked
    }

    private drawAccretionDisk() {
        this.accretionDisk.clear();

        // Draw many arcs to simulate a gaseous disk
        const colors = [0x8e44ad, 0x9b59b6, 0x3498db, 0xe74c3c]; // Purple, Blue, Red

        for (let i = 0; i < 40; i++) {
            const radius = Phaser.Math.Between(40, 160);
            const width = Phaser.Math.Between(1, 4);
            const color = Phaser.Utils.Array.GetRandom(colors);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
            const start = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const length = Phaser.Math.FloatBetween(0.1, 1.5);

            this.accretionDisk.lineStyle(width, color, alpha);
            this.accretionDisk.beginPath();
            this.accretionDisk.arc(0, 0, radius, start, start + length);
            this.accretionDisk.strokePath();
        }
    }

    public update(delta: number) {
        const gm = GameManager.getInstance();

        // Unlock Check
        const unlock = gm.getUpgrade('black_hole_unlock');
        if (!unlock || unlock.level === 0) {
            this.setVisible(false);
            if (this.particles.emitting) this.particles.stop();
            return;
        }
        this.setVisible(true);

        // Sync with GameManager Facility Toggle
        if (gm.blackHoleActive && this._state === 'DORMANT') {
            this._state = 'ACTIVE';
            SoundManager.getInstance().startLoop('blackhole', 'blackhole_suck');
        } else if (!gm.blackHoleActive && (this._state === 'ACTIVE' || this._state === 'UNSTABLE')) {
            this.deactivate();
        }

        // State-based Visibility
        const isActive = (this._state === 'ACTIVE' || this._state === 'UNSTABLE');
        this.accretionDisk.setVisible(isActive);
        this.photonRing.setVisible(isActive);
        this.mainSprite.setVisible(isActive);

        // Visual Updates if Active
        if (isActive) {
            // 1. Rotate the disk
            // Speed increases with mass
            const rotSpeed = 0.02 + (this.consumedMass / this.massLimit) * 0.05;
            this.accretionDisk.rotation += rotSpeed;

            // 2. Pulse the Photon Ring (Breathing effect)
            const pulse = 1 + Math.sin(this.scene.time.now / 300) * 0.1;
            this.photonRing.setScale(pulse);

            // 3. Unstable Jitter
            if (this._state === 'UNSTABLE') {
                this.x += Phaser.Math.Between(-2, 2);
                this.y += Phaser.Math.Between(-2, 2);
                this.photonRing.setStrokeStyle(4, 0xff0000, 1); // Red warning
            } else {
                this.photonRing.setStrokeStyle(3, 0xc71585, 0.8);
            }
        }

        // Active Logic
        if (this._state === 'ACTIVE' || this._state === 'UNSTABLE') {
            // Particles
            if (!this.particles.emitting) this.particles.start();

            // Energy Drain
            let energyCost = 15 * (delta / 1000);
            if (gm.energy > energyCost) {
                gm.addEnergy(-energyCost);
                this.applyGravity(delta);
                this.checkConsumption();
            } else {
                this.deactivate(); // Out of energy
            }

        } else {
            // Dormant
            if (this.particles.emitting) this.particles.stop();
        }

        // Scale based on mass (Limit max scale to avoid obscuring everything)
        // Starts at 1.0, maxes at 2.5
        const targetScale = 1 + (this.consumedMass / this.massLimit) * 1.5;
        // Smooth scale
        this.scale += (targetScale - this.scale) * 0.05;
    }

    public toggle() {
        if (this._state === 'DORMANT') {
            this._state = 'ACTIVE';
            SoundManager.getInstance().startLoop('blackhole', 'blackhole_suck'); // Ensure this sound key exists or add it
            return true;
        } else {
            this.deactivate();
            return false;
        }
    }

    public isStable(): boolean {
        return this._state !== 'UNSTABLE';
    }

    public isActive(): boolean {
        return this._state === 'ACTIVE' || this._state === 'UNSTABLE';
    }

    private applyGravity(_delta: number) {
        const gm = GameManager.getInstance();
        const horiz = gm.getUpgrade('event_horizon');
        const rangeMult = horiz && horiz.level > 0 ? 1.0 + (horiz.level * 0.2) : 1.0;
        const effectiveRange = this.suctionRange * rangeMult * this.scaleX;

        const bodies = this.scene.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const dist = Phaser.Math.Distance.Between(b.position.x, b.position.y, this.x, this.y);

                if (dist < effectiveRange) {
                    const angle = Phaser.Math.Angle.Between(b.position.x, b.position.y, this.x, this.y);
                    // Force increases dramatically as you get closer
                    // 1 / distance strategy?
                    let force = this.suctionForce * (1 + (effectiveRange - dist) / 50);

                    // Add tangent force for swirl?
                    // b.force is permanent, we use applyForce.

                    const fx = Math.cos(angle) * force;
                    const fy = Math.sin(angle) * force;

                    this.scene.matter.body.applyForce(b, b.position, { x: fx, y: fy });
                }
            }
        });
    }

    private checkConsumption() {
        const bodies = this.scene.matter.world.getAllBodies();
        const eatRadius = 35 * this.scaleX; // Slightly larger than sprite

        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const dist = Phaser.Math.Distance.Between(b.position.x, b.position.y, this.x, this.y);
                if (dist < eatRadius) {
                    this.consume(b.gameObject as Trash);
                }
            }
        });
    }

    private consume(t: Trash) {
        // Visual suck effect?
        // Just destroy for now, maybe shrink tween before destroy?
        // Creating tweens every frame for many objects is heavy.

        t.destroyTrash();

        this.consumedMass++;
        SoundManager.getInstance().play('hover'); // Subtle blip? Or silence (ominous)

        if (this.consumedMass >= this.massLimit && this._state !== 'UNSTABLE') {
            this.triggerBigBang(); // Auto trigger!
        }
    }

    public triggerBigBang() {
        if (this.consumedMass <= 0) return;

        SoundManager.getInstance().stopLoop('blackhole');
        SoundManager.getInstance().playBigBang(); // Ensure this method exists or use generic

        // Explosion Visual
        this.scene.cameras.main.shake(500, 0.05);

        // Flash
        const flash = this.scene.add.circle(this.x, this.y, 10, 0xffffff);
        this.scene.tweens.add({
            targets: flash,
            scale: 50,
            alpha: 0,
            duration: 500,
            onComplete: () => flash.destroy()
        });

        const gm = GameManager.getInstance();
        const value = Math.floor(this.consumedMass * gm.trashValue * 8); // High reward
        gm.addMoney(value);

        // Convert mass to resources
        gm.addResource('darkMatter', Math.floor(this.consumedMass * 0.1)); // Rare!
        gm.addResource('rareMetal', Math.floor(this.consumedMass * 0.3));

        new FloatingText(this.scene, this.x, this.y, `BIG BANG!\n+¥${value.toLocaleString()}`, "#00ffff").setScale(2.5);

        // Reset
        this.consumedMass = 0;
        this._state = 'DORMANT';
        this.scale = 1;
        this.drawAccretionDisk(); // Redraw random pattern for variety
    }

    private deactivate() {
        this._state = 'DORMANT';
        SoundManager.getInstance().stopLoop('blackhole');
        GameManager.getInstance().blackHoleActive = false; // Sync flag
    }
}
