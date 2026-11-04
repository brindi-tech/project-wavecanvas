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
