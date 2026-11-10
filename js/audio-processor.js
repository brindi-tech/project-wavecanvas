class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.mediaStream = null;
        this.audioElement = null;
        this.objectUrl = null;
        this.outputConnected = false;
        this.frequencyData = new Uint8Array();
        this.waveformData = new Uint8Array();
        this.audioLevel = 0;
        this.isPlaying = false;
        this.audioFileName = null;
        this.status = 'Parado';
        this.onStateChange = () => {};
        this.onError = () => {};
    }

    async startMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Este navegador não permite acesso ao microfone. Abra a aplicação em HTTPS ou em localhost.');
        }

        this.stopCurrentSource();
        let stream;
        try {
            await this.ensureAudioGraph();
            stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            this.mediaStream = stream;
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.sourceNode.connect(this.analyser);
            this.isPlaying = true;
            this.status = 'Microfone ativo';
            this.notifyStateChange();
        } catch (error) {
            stream?.getTracks().forEach((track) => track.stop());
            this.stopCurrentSource();
            throw error;
        }
    }

    async loadAudioFile(file) {
        if (!file) {
            throw new Error('Seleciona um ficheiro de áudio.');
        }

        if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.wav')) {
            throw new Error('O ficheiro selecionado não parece ser um áudio. Escolhe um ficheiro WAV ou outro formato de áudio suportado.');
        }

        this.stopCurrentSource();
        await this.ensureAudioGraph();

        this.objectUrl = URL.createObjectURL(file);
        this.audioFileName = file.name;
        this.audioElement = new Audio();
        this.audioElement.preload = 'auto';
        this.audioElement.src = this.objectUrl;
        this.audioElement.addEventListener('ended', () => {
            this.stopCurrentSource();
            this.status = 'Reprodução terminada';
            this.notifyStateChange();
        }, { once: true });
        this.audioElement.addEventListener('error', () => {
            if (!this.audioElement) {
                return;
            }

            this.stopCurrentSource();
            this.isPlaying = false;
            this.status = 'Erro na reprodução';
            this.notifyStateChange();
            this.onError(new Error('Não foi possível descodificar ou reproduzir este ficheiro de áudio.'));
        }, { once: true });

        try {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
            this.sourceNode.connect(this.analyser);
            if (!this.outputConnected) {
                this.analyser.connect(this.audioContext.destination);
                this.outputConnected = true;
            }
            await this.audioContext.resume();
            await this.audioElement.play();

            this.isPlaying = true;
            this.status = `A reproduzir: ${file.name}`;
            this.notifyStateChange();
        } catch (error) {
            this.stopCurrentSource();
            this.isPlaying = false;
            this.status = 'Parado';
            this.notifyStateChange();
            throw error;
        }
    }

    async togglePlayback() {
        if (!this.audioElement) {
            throw new Error('Não existe nenhum ficheiro de áudio para reproduzir.');
        }

        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            this.status = `Pausado: ${this.audioFileName}`;
        } else {
            await this.audioContext.resume();
            await this.audioElement.play();
            this.isPlaying = true;
            this.status = `A reproduzir: ${this.audioFileName}`;
        }

        this.notifyStateChange();
    }

    async ensureAudioGraph() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('Este navegador não suporta a Web Audio API necessária para processar áudio.');
            }

            this.audioContext = new AudioContextClass();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.65;
            this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.waveformData = new Uint8Array(this.analyser.fftSize);
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    stopCurrentSource() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        if (this.audioElement) {
            if (this.analyser && this.outputConnected) {
                this.analyser.disconnect(this.audioContext.destination);
                this.outputConnected = false;
            }

            this.audioElement.pause();
            this.audioElement.removeAttribute('src');
            this.audioElement.load();
            this.audioElement = null;
        }

        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }

        this.audioFileName = null;
        this.isPlaying = false;
        this.audioLevel = 0;
    }

    async stop() {
        this.stopCurrentSource();
        this.status = 'Parado';

        if (this.analyser) {
            this.analyser.disconnect();
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            await this.audioContext.close();
        }

        this.audioContext = null;
        this.analyser = null;
        this.frequencyData = new Uint8Array();
        this.waveformData = new Uint8Array();
        this.notifyStateChange();
    }

    update() {
        if (!this.analyser || !this.isPlaying) {
            this.audioLevel = 0;
            return;
        }

        this.analyser.getByteFrequencyData(this.frequencyData);
        this.analyser.getByteTimeDomainData(this.waveformData);
        this.audioLevel = this.calculateAudioLevel();
    }

    getFrequencyData() {
        return this.frequencyData;
    }

    getWaveformData() {
        return this.waveformData;
    }

    calculateAudioLevel() {
        if (!this.waveformData.length) {
            return 0;
        }

        let sumOfSquares = 0;
        for (const sample of this.waveformData) {
            const normalizedSample = (sample - 128) / 128;
            sumOfSquares += normalizedSample * normalizedSample;
        }

        return Math.sqrt(sumOfSquares / this.waveformData.length);
    }

    notifyStateChange() {
        this.onStateChange({
            isPlaying: this.isPlaying,
            canResumeAudio: Boolean(this.audioElement),
            isPaused: Boolean(this.audioElement) && !this.isPlaying,
            status: this.status,
            level: Math.round(this.audioLevel * 100)
        });
    }
}
