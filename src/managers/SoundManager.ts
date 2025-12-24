export class SoundManager {
    private static instance: SoundManager;
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 1.0;
    private sfxVolume: number = 0.5;

    private constructor() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    private loops: Map<string, { osc: OscillatorNode, noise: AudioBufferSourceNode, gain: GainNode }> = new Map();

    static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public setVolume(v: number) {
        this.volume = Math.max(0, Math.min(1, v));
    }

    public setBgmVolume(_v: number) {
        // Placeholder: BGM logic not yet implemented
    }

    public setSfxVolume(v: number) {
        this.sfxVolume = Math.max(0, Math.min(1, v));
    }

    public play(type: 'click' | 'hover' | 'success' | 'error' | 'destroy') {
        if (!this.enabled || !this.ctx) return;

        // Resume context if needed (browser autoplay policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        switch (type) {
            case 'click':
                this.beep(800, 0.05, 'square');
                break;
            case 'hover':
                this.beep(400, 0.02, 'sine', 0.05); // quiet
                break;
            case 'success':
                this.melody([600, 800], [0.1, 0.1]);
                break;
            case 'error':
                this.beep(200, 0.1, 'sawtooth');
                break;
            case 'destroy':
                this.noise(0.1);
                break;
        }
    }

    public startLoop(id: string, type: 'vacuum' | 'conveyor' | 'lava' | 'shredder' | 'blackhole_suck') {
        if (!this.enabled || !this.ctx || this.loops.has(id)) return;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        const fadeTime = 0.5; // Smoother fade
        gain.gain.linearRampToValueAtTime(0.05 * this.volume * this.sfxVolume, this.ctx.currentTime + fadeTime);

        const osc = this.ctx.createOscillator();
        const noiseS = this.createNoiseSource();

        // Common filter for noise
        const filter = this.ctx.createBiquadFilter();
        noiseS.connect(filter);

        if (type === 'vacuum') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, this.ctx.currentTime);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + fadeTime);
        }
        else if (type === 'conveyor') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(50, this.ctx.currentTime); // Low rumble
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.ctx.currentTime); // Muffled mechanical noise
            gain.gain.linearRampToValueAtTime(0.03 * this.volume * this.sfxVolume, this.ctx.currentTime + fadeTime); // Quiet
        }
        else if (type === 'lava') {
            osc.frequency.setValueAtTime(0, this.ctx.currentTime); // No tone, just noise
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(150, this.ctx.currentTime); // Deep rumble/hiss
            filter.Q.value = 5; // Resonant bubbling?
            gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + fadeTime);
        }
        else if (type === 'shredder') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(40, this.ctx.currentTime); // Grinding
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, this.ctx.currentTime); // Metallic scrap
            gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + fadeTime);

            // LFO for grinding variation
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 8; // 8Hz mod
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 200;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();
        }
        else if (type === 'blackhole_suck') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(50, this.ctx.currentTime); // Deep hum
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(100, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15 * this.volume * this.sfxVolume, this.ctx.currentTime + fadeTime); // Louder internal hum

            // LFO for throbbing
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.5; // Slow throb
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 20; // Pitch bend amount
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
        }

        osc.connect(gain);
        filter.connect(gain); // Connect filtered noise
        gain.connect(this.ctx.destination);

        osc.start();
        noiseS.start();

        this.loops.set(id, { osc, noise: noiseS, gain });
    }

    public stopLoop(id: string) {
        const loop = this.loops.get(id);
        if (loop && this.ctx) {
            loop.gain.gain.cancelScheduledValues(this.ctx.currentTime);
            loop.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1); // Fade out
            setTimeout(() => {
                try {
                    loop.osc.stop();
                    loop.noise.stop();
                    loop.osc.disconnect();
                    loop.noise.disconnect();
                    loop.gain.disconnect();
                } catch (e) { }
            }, 100);
            this.loops.delete(id);
        }
    }

    public playBigBang() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;

        // 1. Deep Boom (Sine Sweep)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 2.0); // Drop pitch

        oscGain.gain.setValueAtTime(0.8, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 2.5);

        osc.start(t);
        osc.stop(t + 3.0);

        // 2. Explosion Noise
        const noise = this.createNoiseSource();
        const noiseFilter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();

        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(1000, t);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 1.0); // Muffle over time

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);

        noise.start(t);
        noise.stop(t + 2.0);
    }

    private createNoiseSource(): AudioBufferSourceNode {
        if (!this.ctx) throw new Error("No ctx");
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        return source;
    }

    private beep(freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const finalVol = vol * this.volume * this.sfxVolume;
        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    private melody(freqs: number[], durs: number[]) {
        let now = this.ctx!.currentTime;
        freqs.forEach((f, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.frequency.setValueAtTime(f, now);
            gain.gain.setValueAtTime(0.1 * this.volume * this.sfxVolume, now);
            gain.gain.linearRampToValueAtTime(0, now + durs[i]);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + durs[i]);
            now += durs[i];
        });
    }

    private noise(duration: number) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05 * this.volume * this.sfxVolume, this.ctx.currentTime); // Low volume
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }
}
