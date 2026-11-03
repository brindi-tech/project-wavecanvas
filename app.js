// Processamento de áudio
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
        this.status = 'Parado';
        this.onStateChange = () => {};
        this.onError = () => {};
    }

    async startMicrophone() {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Este navegador não permite acesso ao microfone. Abra a aplicação em HTTPS ou em localhost.');
        }

        this.stopCurrentSource();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        try {
            await this.ensureAudioGraph();
            this.mediaStream = stream;
            this.sourceNode = this.audioContext.createMediaStreamSource(stream);
            this.sourceNode.connect(this.analyser);
            this.isPlaying = true;
            this.status = 'Microfone ativo';
            this.notifyStateChange();
        } catch (error) {
            stream.getTracks().forEach((track) => track.stop());
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

    async ensureAudioGraph() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('Este navegador não suporta a Web Audio API necessária para processar áudio.');
            }

            this.audioContext = new AudioContextClass();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;
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
            status: this.status,
            level: Math.round(this.audioLevel * 100)
        });
    }
}

// Classe base das visualizações
class AudioVisualization {
    constructor(canvas, audioProcessor) {
        if (new.target === AudioVisualization) {
            throw new Error('AudioVisualization é uma classe abstrata e não pode ser instanciada diretamente.');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioProcessor = audioProcessor;
        this.name = 'Visualização';
        this.properties = {};
        this.testData = new Uint8Array(256);
        this.frameCount = 0;

        for (let i = 0; i < this.testData.length; i++) {
            this.testData[i] = Math.sin(i / 10) * 128 + 128;
        }
    }

    draw() {
        throw new Error('Método draw() deve ser implementado pela subclasse.');
    }

    update() {
        this.frameCount++;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    getProperties() {
        return this.properties;
    }

    updateProperty(property, value) {
        if (Object.prototype.hasOwnProperty.call(this.properties, property)) {
            this.properties[property] = value;
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        // A grelha será implementada com as propriedades visuais.
    }

    createGradient() {
        return this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    }

    normalizeData() {
        return [];
    }
}

class SpectrumVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Espectro de Frequências';
    }

    draw() {
        this.clearCanvas();

        const audioData = this.audioProcessor?.getFrequencyData();
        const data = audioData?.length ? audioData : this.testData;
        const barWidth = this.canvas.width / data.length;

        for (let i = 0; i < data.length; i++) {
            const barHeight = (data[i] / 255) * this.canvas.height;
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;

            this.ctx.fillStyle = `hsl(${i / data.length * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
    }
}

class WaveformVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Forma de Onda';
    }

    draw() {
        this.clearCanvas();

        const audioData = this.audioProcessor?.getWaveformData();
        const data = audioData?.length ? audioData : this.testData;
        const sliceWidth = this.canvas.width / data.length;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height / 2);

        for (let i = 0; i < data.length; i++) {
            const value = data[i] / 128;
            const y = value * this.canvas.height / 2;
            const x = i * sliceWidth;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.strokeStyle = '#4cc9f0';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
}

class ParticleVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Partículas';
        this.particles = [];
        this.lastTime = 0;
        this.initParticles();
    }

    draw() {
        this.clearCanvas();
        this.drawParticles();
        this.drawConnections();
    }

    update() {
        super.update();
        this.updateParticles();
    }

    initParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }
    }

    updateParticles() {
        const audioData = this.audioProcessor?.getFrequencyData();
        const data = audioData?.length ? audioData : this.testData;
        const audioLevel = this.audioProcessor ? this.audioProcessor.calculateAudioLevel() : 0.5;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            if (data.length > 0) {
                const frequencyIndex = Math.floor(i / this.particles.length * data.length);
                const intensity = data[frequencyIndex] / 255;

                particle.vx += (Math.random() - 0.5) * intensity * 0.5;
                particle.vy += (Math.random() - 0.5) * intensity * 0.5;

                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                const maxSpeed = 2 + audioLevel * 3;
                if (speed > maxSpeed) {
                    particle.vx = (particle.vx / speed) * maxSpeed;
                    particle.vy = (particle.vy / speed) * maxSpeed;
                }
            }
        }
    }

    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        }
    }

    drawConnections() {
        const maxDistance = 100;

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const first = this.particles[i];
                const second = this.particles[j];
                const dx = first.x - second.x;
                const dy = first.y - second.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = 1 - distance / maxDistance;
                    this.ctx.beginPath();
                    this.ctx.moveTo(first.x, first.y);
                    this.ctx.lineTo(second.x, second.y);
                    this.ctx.strokeStyle = `rgba(76, 201, 240, ${opacity * 0.5})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
    }
}

// Motor das visualizações
class VisualizationEngine {
    constructor(canvasId, audioProcessor = null) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas com o id "${canvasId}" não encontrado.`);
        }

        this.ctx = this.canvas.getContext('2d');
        this.visualizations = new Map();
        this.currentVisualization = null;
        this.animationId = null;
        this.isRunning = false;
        this.audioProcessor = audioProcessor;
        this.onFrame = () => {};
        this.resizeHandler = () => this.resize();

        this.initVisualizations();
        window.addEventListener('resize', this.resizeHandler);
        this.resize();
    }

    initVisualizations() {
        this.visualizations.set('spectrum', new SpectrumVisualization(this.canvas, this.audioProcessor));
        this.visualizations.set('waveform', new WaveformVisualization(this.canvas, this.audioProcessor));
        this.visualizations.set('particles', new ParticleVisualization(this.canvas, this.audioProcessor));
    }

    setVisualization(type) {
        const visualization = this.visualizations.get(type);
        if (!visualization) {
            console.error(`Visualização desconhecida: ${type}`);
            return false;
        }

        this.currentVisualization = visualization;
        this.currentVisualization.resize(this.canvas.width, this.canvas.height);
        return true;
    }

    start() {
        if (this.isRunning || !this.currentVisualization) {
            return;
        }

        this.isRunning = true;
        const renderFrame = () => {
            if (!this.isRunning) {
                return;
            }

            this.audioProcessor?.update();
            this.currentVisualization.update();
            this.currentVisualization.draw();
            this.onFrame();
            this.animationId = window.requestAnimationFrame(renderFrame);
        };

        this.animationId = window.requestAnimationFrame(renderFrame);
    }

    stop() {
        this.isRunning = false;
        if (this.animationId !== null) {
            window.cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resize() {
        const bounds = this.canvas.getBoundingClientRect();
        const width = Math.floor(bounds.width);
        const height = Math.floor(bounds.height);

        if (width === 0 || height === 0) {
            return;
        }

        if (this.canvas.width === width && this.canvas.height === height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.currentVisualization?.resize(width, height);
    }

    getVisualizationProperties() {
        return this.currentVisualization ? this.currentVisualization.getProperties() : {};
    }

    updateVisualizationProperty(property, value) {
        this.currentVisualization?.updateProperty(property, value);
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.resizeHandler);
    }
}

// Gestão da interface
class UIManager {
    constructor(app) {
        this.app = app;
        this.visualizationEngine = app.visualizationEngine;
        this.audioProcessor = app.audioProcessor;
        this.lastAudioInfo = '';
        this.setupEventListeners();
    }

    updatePropertiesPanel() {
        console.log('Atualizando painel de propriedades...');
    }

    updateAudioInfo(info, isError = false) {
        const audioStatus = document.getElementById('audioStatus');
        const audioLevel = document.getElementById('audioLevel');

        if (isError) {
            audioStatus.textContent = `Erro: ${info}`;
            audioStatus.style.color = '#f72585';
            return;
        }

        const status = `Áudio: ${info.status || 'Ativo'}`;
        const level = `Nível: ${info.level || 0}%`;
        const currentInfo = `${status}|${level}`;
        if (currentInfo !== this.lastAudioInfo) {
            audioStatus.textContent = status;
            audioStatus.style.color = '#e6e6e6';
            audioLevel.textContent = level;
            this.lastAudioInfo = currentInfo;
        }
    }

    setButtonStates(playing) {
        const startMicBtn = document.getElementById('startMic');
        const stopAudioBtn = document.getElementById('stopAudio');

        startMicBtn.disabled = playing;
        stopAudioBtn.disabled = !playing;
    }

    setAudioPending(pending) {
        document.getElementById('startMic').disabled = pending || this.audioProcessor.isPlaying;
        document.getElementById('audioFile').disabled = pending;
    }

    showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');

        errorMessage.textContent = message;
        errorModal.classList.remove('hidden');

        document.querySelector('.close').onclick = () => {
            errorModal.classList.add('hidden');
        };

        window.onclick = (event) => {
            if (event.target === errorModal) {
                errorModal.classList.add('hidden');
            }
        };
    }

    setupEventListeners() {
        document.getElementById('startMic').addEventListener('click', () => {
            this.app.startMicrophone();
        });

        document.getElementById('stopAudio').addEventListener('click', () => {
            this.app.stopAudio();
        });

        document.getElementById('audioFile').addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                this.app.loadAudioFile(event.target.files[0]);
            }
            event.target.value = '';
        });

        document.getElementById('visualizationType').addEventListener('change', (event) => {
            this.app.setVisualization(event.target.value);
        });

        document.getElementById('exportPNG').addEventListener('click', () => {
            this.app.exportManager.exportAsPNG();
        });

        document.getElementById('exportJPEG').addEventListener('click', () => {
            this.app.exportManager.exportAsJPEG(0.9);
        });
    }

    setupAudioLevels() {
        // Implementado na etapa do sistema de áudio.
    }

    createPropertyControl(property, value, min, max, step) {
        const container = document.createElement('div');
        container.className = 'property-control';

        const label = document.createElement('label');
        label.textContent = property;
        label.htmlFor = `prop-${property}`;

        const input = document.createElement('input');
        input.type = 'range';
        input.id = `prop-${property}`;
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;

        input.addEventListener('input', (event) => {
            this.visualizationEngine.updateVisualizationProperty(property, parseFloat(event.target.value));
        });

        container.appendChild(label);
        container.appendChild(input);

        return container;
    }
}

// Gestão da exportação
class ExportManager {
    constructor(visualizationEngine) {
        this.visualizationEngine = visualizationEngine;
    }

    exportAsPNG() {
        try {
            const canvas = this.visualizationEngine.canvas;
            const link = document.createElement('a');
            link.download = `audio-visualization-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Erro ao exportar PNG:', error);
        }
    }

    exportAsJPEG(quality = 0.9) {
        try {
            const canvas = this.visualizationEngine.canvas;
            const link = document.createElement('a');
            link.download = `audio-visualization-${Date.now()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', quality);
            link.click();
        } catch (error) {
            console.error('Erro ao exportar JPEG:', error);
        }
    }
}

// Aplicação principal
class App {
    constructor() {
        this.audioProcessor = new AudioProcessor();
        this.visualizationEngine = new VisualizationEngine('audioCanvas', this.audioProcessor);
        this.uiManager = new UIManager(this);
        this.exportManager = new ExportManager(this.visualizationEngine);
        this.audioProcessor.onStateChange = (state) => {
            this.uiManager.setButtonStates(state.isPlaying);
            this.uiManager.updateAudioInfo(state);
        };
        this.audioProcessor.onError = (error) => {
            this.uiManager.showError(error.message);
        };
        this.visualizationEngine.onFrame = () => {
            this.uiManager.updateAudioInfo({
                status: this.audioProcessor.status,
                level: Math.round(this.audioProcessor.audioLevel * 100)
            });
        };

        this.init();
    }

    init() {
        const selectedType = document.getElementById('visualizationType').value;
        this.setVisualization(selectedType);
        this.visualizationEngine.start();
        console.log('App inicializada');
    }

    async startMicrophone() {
        this.uiManager.setAudioPending(true);
        try {
            await this.audioProcessor.startMicrophone();
        } catch (error) {
            this.uiManager.showError(this.getAudioErrorMessage(error));
        } finally {
            this.uiManager.setAudioPending(false);
        }
    }

    async loadAudioFile(file) {
        this.uiManager.setAudioPending(true);
        try {
            await this.audioProcessor.loadAudioFile(file);
        } catch (error) {
            this.uiManager.showError(this.getAudioErrorMessage(error));
        } finally {
            this.uiManager.setAudioPending(false);
        }
    }

    async stopAudio() {
        try {
            await this.audioProcessor.stop();
        } catch (error) {
            this.uiManager.showError(`Não foi possível libertar os recursos de áudio: ${error.message}`);
        }
    }

    getAudioErrorMessage(error) {
        switch (error.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                return 'O acesso ao microfone foi recusado. Autoriza o microfone nas permissões do navegador e tenta novamente.';
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                return 'Não foi encontrado nenhum microfone. Liga um microfone e tenta novamente.';
            case 'NotReadableError':
            case 'TrackStartError':
                return 'O microfone não pode ser iniciado. Pode estar a ser utilizado por outra aplicação.';
            case 'NotSupportedError':
                return 'O formato deste áudio não é suportado pelo navegador.';
            case 'AbortError':
                return 'A reprodução do áudio foi interrompida antes de começar.';
            default:
                return error.message || 'Ocorreu um erro ao iniciar o áudio.';
        }
    }

    setVisualization(type) {
        const changed = this.visualizationEngine.setVisualization(type);
        if (changed) {
            this.uiManager.updatePropertiesPanel();
        }
    }

    exportFrame() {
        this.exportManager.exportAsPNG();
    }

    async destroy() {
        this.visualizationEngine.destroy();
        await this.audioProcessor.stop();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app;
    window.addEventListener('beforeunload', () => app.destroy(), { once: true });
});
