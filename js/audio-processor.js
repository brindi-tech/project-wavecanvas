class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphoneSourceNode = null;
        this.audioSourceNode = null;
        this.mediaStream = null;
        this.audioElement = null;
        this.objectUrl = null;
        this.frequencyData = new Uint8Array();
        this.waveformData = new Uint8Array();
        this.audioLevel = 0;
        this.isPlaying = false;
        this.isMicActive = false;
        this.audioEnded = false;
        this.audioFileName = null;
        this.status = 'Parado';
        this.onStateChange = () => {};
        this.onError = () => {};
    }

    async startMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Este navegador não permite acesso ao microfone. Abra a aplicação em HTTPS ou em localhost.');
        }

        if (this.isMicActive) {
            return;
        }

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
            this.microphoneSourceNode = this.audioContext.createMediaStreamSource(stream);
            this.microphoneSourceNode.connect(this.analyser);
            this.isMicActive = true;
            this.updateStatus();
            this.notifyStateChange();
        } catch (error) {
            stream?.getTracks().forEach((track) => track.stop());
            this.stopMicrophoneSource();
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

        this.stopAudioSource();
        this.updateStatus();
        this.notifyStateChange();
        await this.ensureAudioGraph();

        this.objectUrl = URL.createObjectURL(file);
        this.audioFileName = file.name;
        const audioElement = new Audio();
        this.audioElement = audioElement;
        audioElement.preload = 'auto';
        audioElement.src = this.objectUrl;
        audioElement.addEventListener('ended', () => {
            if (this.audioElement !== audioElement) {
                return;
            }

            this.isPlaying = false;
            this.audioEnded = true;
            this.updateStatus('Reprodução terminada');
            this.notifyStateChange();
        }, { once: true });
        audioElement.addEventListener('error', () => {
            if (this.audioElement !== audioElement) {
                return;
            }

            this.stopAudioSource();
            this.updateStatus('Erro na reprodução');
            this.notifyStateChange();
            this.onError(new Error('Não foi possível descodificar ou reproduzir este ficheiro de áudio.'));
        }, { once: true });

        try {
            this.audioSourceNode = this.audioContext.createMediaElementSource(audioElement);
            this.audioSourceNode.connect(this.analyser);
            this.audioSourceNode.connect(this.audioContext.destination);
            await this.audioContext.resume();
            await audioElement.play();

            this.isPlaying = true;
            this.audioEnded = false;
            this.updateStatus();
            this.notifyStateChange();
        } catch (error) {
            this.stopAudioSource();
            this.updateStatus();
            this.notifyStateChange();
            throw error;
        }
    }

    async togglePlayback() {
        if (!this.audioElement) {
            throw new Error('Não existe nenhum ficheiro de áudio para reproduzir.');
        }

        if (!this.audioElement.paused) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            await this.audioContext.resume();
            await this.audioElement.play();
            this.isPlaying = true;
            this.audioEnded = false;
        }

        this.updateStatus();
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

    stopMicrophoneSource() {
        if (this.microphoneSourceNode) {
            this.microphoneSourceNode.disconnect();
            this.microphoneSourceNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }
        this.isMicActive = false;
        this.audioLevel = 0;
    }

    stopAudioSource() {
        if (this.audioSourceNode) {
            this.audioSourceNode.disconnect();
            this.audioSourceNode = null;
        }
        if (this.audioElement) {
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
        this.audioEnded = false;
    }

    async stopMicrophone() {
        this.stopMicrophoneSource();
        this.updateStatus();
        this.notifyStateChange();
    }

    async stopAudio() {
        this.stopAudioSource();
        this.updateStatus();
        this.notifyStateChange();
    }

    async stop() {
        this.stopMicrophoneSource();
        this.stopAudioSource();
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
        if (!this.analyser || (!this.isPlaying && !this.isMicActive)) {
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
            isMicActive: this.isMicActive,
            canResumeAudio: Boolean(this.audioElement),
            isPaused: Boolean(this.audioElement) && !this.isPlaying,
            status: this.status,
            level: Math.round(this.audioLevel * 100)
        });
    }

    updateStatus(fallback = null) {
        const parts = [];
        if (this.isMicActive) {
            parts.push('Microfone ativo');
        }
        if (this.isPlaying) {
            parts.push(`A reproduzir: ${this.audioFileName}`);
        } else if (this.audioElement && this.audioFileName) {
            parts.push(this.audioEnded ? 'Reprodução terminada' : `Pausado: ${this.audioFileName}`);
        } else if (fallback) {
            parts.push(fallback);
        }
        this.status = parts.join(' + ') || 'Parado';
    }
}
