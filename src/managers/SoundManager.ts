export class SoundManager {
    private static instance: SoundManager;
    private ctx: AudioContext | null = null;
    private enabled: boolean = true;

    private constructor() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
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

    private beep(freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
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
            gain.gain.setValueAtTime(0.1, now);
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
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Low volume
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }
}
