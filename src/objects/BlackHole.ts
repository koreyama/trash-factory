import Phaser from 'phaser';
import { GameManager } from '../managers/GameManager';
import { SoundManager } from '../managers/SoundManager';
import { Trash } from './Trash';
import { FloatingText } from './FloatingText';

export class BlackHole extends Phaser.GameObjects.Container {
    private mainSprite: Phaser.GameObjects.Arc;
    private auraStart: Phaser.GameObjects.Arc;
    private eventHorizon: Phaser.GameObjects.Arc;
    private particles: Phaser.GameObjects.Particles.ParticleEmitter;

    private _state: 'DORMANT' | 'ACTIVE' | 'UNSTABLE' = 'DORMANT'; // Rename to _state to avoid collision
    private consumedMass: number = 0;
    private massLimit: number = 500; // Big Bang Threshold
    private suctionRange: number = 200;
    private suctionForce: number = 0.005;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Visuals
        // Event Horizon (Black Center)
        this.mainSprite = scene.add.circle(0, 0, 30, 0x000000);
        this.mainSprite.setStrokeStyle(2, 0x8e44ad);

        // Accretion Disk (Glowing Aura)
        this.auraStart = scene.add.circle(0, 0, 40, 0x9b59b6, 0.4);

        // Event Horizon Range Visualization (Optional, maybe for debug or upgrade)
        this.eventHorizon = scene.add.circle(0, 0, this.suctionRange, 0xffffff, 0);
        this.eventHorizon.setStrokeStyle(1, 0x9b59b6, 0.2);

        this.add([this.eventHorizon, this.auraStart, this.mainSprite]);

        // Particles (Sucking Inwards)
        // Particles (Sucking Inwards)
        // const particleTex = ... // Not needed if already geenerated or exists.
        if (!scene.textures.exists('bh_particle')) {
            scene.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff).fillCircle(0, 0, 2).generateTexture('bh_particle', 4, 4);
        }
        this.particles = scene.add.particles(x, y, 'bh_particle', {
            speed: { min: -100, max: -50 }, // Negative to move towards center? No, emitted from center outwards usually. 
            // To suck in, we need gravity well or emit from circle edge moving to center.
            // Let's emit from circle, move to center.
            emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 150) } as any,
            moveToX: x,
            moveToY: y,
            lifespan: 1000,
            scale: { start: 1, end: 0 },
            quantity: 2,
            blendMode: 'ADD',
            tint: [0x9b59b6, 0x8e44ad, 0xffffff]
        });
        this.particles.stop();

        scene.add.existing(this);
    }

    public update(delta: number) {
        const gm = GameManager.getInstance();

        // Unlock Check
        const unlock = gm.getUpgrade('black_hole_unlock');
        if (!unlock || unlock.level === 0) {
            this.setVisible(false);
            return;
        }
        this.setVisible(true);

        // Rotation visual
        this.auraStart.rotation += 0.02;

        // Active Logic
        if (this._state === 'ACTIVE' || this._state === 'UNSTABLE') {
            // Energy Drain
            let energyCost = 20 * (delta / 1000); // 20 Energy/sec base (Increased)

            // Efficiency Upgrade
            // const eff = gm.getUpgrade('hawking_radiation');
            // if (eff && eff.level > 0) energyCost *= 0.8; // example

            if (gm.energy > energyCost) {
                gm.addEnergy(-energyCost);
                // Hawking Radiation (Refund small energy?)
                // ...
            } else {
                this.deactivate(); // Out of energy
            }

            // Physics Logic
            this.applyGravity(delta);
            this.checkConsumption();

            // Particles
            if (!this.particles.emitting) this.particles.start();

        } else {
            if (this.particles.emitting) this.particles.stop();
        }

        // Update Visuals based on mass
        const scale = 1 + (this.consumedMass / this.massLimit) * 2; // Grow up to 3x
        this.setScale(scale);
    }

    public toggle() {
        if (this._state === 'DORMANT') {
            this._state = 'ACTIVE';
            SoundManager.getInstance().startLoop('blackhole', 'blackhole_suck');
            return true;
        } else {
            this._state = 'DORMANT';
            SoundManager.getInstance().stopLoop('blackhole');
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
        // Upgrade affects Range/Force
        const gm = GameManager.getInstance();
        const horiz = gm.getUpgrade('event_horizon');
        const rangeMult = horiz && horiz.level > 0 ? 1.0 + (horiz.level * 0.2) : 1.0;

        const effectiveRange = this.suctionRange * rangeMult * this.scaleX; // Scale with growth

        const bodies = this.scene.matter.world.getAllBodies();
        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const angle = Phaser.Math.Angle.Between(b.position.x, b.position.y, this.x, this.y);
                const dist = Phaser.Math.Distance.Between(b.position.x, b.position.y, this.x, this.y);

                if (dist < effectiveRange) {
                    // Stronger as it gets closer
                    const force = this.suctionForce * (1 + (effectiveRange - dist) / 100);

                    this.scene.matter.body.applyForce(b, b.position, {
                        x: Math.cos(angle) * force,
                        y: Math.sin(angle) * force
                    });
                }
            }
        });
    }

    private checkConsumption() {
        const bodies = this.scene.matter.world.getAllBodies();
        const eatRadius = 40 * this.scaleX;

        bodies.forEach((b: any) => {
            if (b.gameObject && b.gameObject instanceof Trash && !b.isStatic && !b.gameObject.isDestroyed) {
                const dist = Phaser.Math.Distance.Between(b.position.x, b.position.y, this.x, this.y);
                if (dist < eatRadius) {
                    const t = b.gameObject as Trash;
                    this.consume(t);
                }
            }
        });
    }

    private consume(t: Trash) {
        t.destroyTrash(); // Silent destroy?
        this.consumedMass++;

        // Add minimal resources (Black holes are hungry but stingy until explosion)
        // Or strictly stored for Big Bang?
        // Let's store.

        if (this.consumedMass >= this.massLimit && this._state !== 'UNSTABLE') {
            this._state = 'UNSTABLE';
            new FloatingText(this.scene, this.x, this.y, "CRITICAL MASS!", "#ff00ff").setScale(2);
        }
    }

    public triggerBigBang() {
        if (this.consumedMass <= 0) return;

        // Stop Suck Sound
        SoundManager.getInstance().stopLoop('blackhole');
        SoundManager.getInstance().playBigBang();

        // Explosion Visual
        this.scene.cameras.main.shake(500, 0.05);

        // Reward Calculation
        const gm = GameManager.getInstance();
        const value = this.consumedMass * gm.trashValue * 5; // HUGE MULTIPLIER
        gm.addMoney(value);
        gm.addResource('plastic', Math.floor(this.consumedMass * 0.5));

        new FloatingText(this.scene, this.x, this.y, `BIG BANG!\n+¥${value}`, "#00ffff").setScale(3);

        // Reset
        this.consumedMass = 0;
        this._state = 'DORMANT';
        this.setScale(1); // Reset scale
    }

    private deactivate() {
        this._state = 'DORMANT';
        SoundManager.getInstance().stopLoop('blackhole');
    }
}
