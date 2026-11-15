class UIManager {
    constructor(app) {
        this.app = app;
        this.visualizationEngine = app.visualizationEngine;
        this.audioProcessor = app.audioProcessor;
        this.lastAudioInfo = '';
        this.audioPending = false;
        this.audioState = {};
        this.setupEventListeners();
    }

    updatePropertiesPanel() {
        const container = document.getElementById('properties-container');
        const properties = this.visualizationEngine.getVisualizationProperties();
        container.replaceChildren();

        for (const [property, definition] of Object.entries(properties)) {
            container.appendChild(this.createPropertyControl(property, definition));
        }

        if (Object.keys(properties).length === 0) {
            const message = document.createElement('p');
            message.className = 'empty-properties';
            message.textContent = 'Esta visualização não tem propriedades ajustáveis.';
            container.appendChild(message);
        }
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

    setButtonStates(state) {
        this.audioState = state;
        this.updateAudioButtons();
    }

    updateAudioButtons() {
        const startMicBtn = document.getElementById('startMic');
        const stopMicBtn = document.getElementById('stopMic');
        const toggleAudioBtn = document.getElementById('toggleAudio');
        const stopAudioBtn = document.getElementById('stopAudio');
        const state = this.audioState;
        startMicBtn.disabled = this.audioPending || state.isMicActive;
        stopMicBtn.disabled = !state.isMicActive;
        toggleAudioBtn.disabled = !state.canResumeAudio;
        toggleAudioBtn.textContent = state.isPaused ? 'Reproduzir Áudio' : 'Pausar Áudio';
        stopAudioBtn.disabled = !state.canResumeAudio;
    }

    setAudioPending(pending) {
        this.audioPending = pending;
        this.updateAudioButtons();
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

        document.getElementById('stopMic').addEventListener('click', () => {
            this.app.stopMicrophone();
        });

        document.getElementById('stopAudio').addEventListener('click', () => {
            this.app.stopAudio();
        });

        document.getElementById('toggleAudio').addEventListener('click', () => {
            this.app.toggleAudioPlayback();
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

    createPropertyControl(property, definition) {
        const container = document.createElement('div');
        container.className = 'property-control';
        const label = document.createElement('label');
        label.htmlFor = `prop-${property}`;
        label.textContent = definition.label;

        const valueDisplay = document.createElement('output');
        valueDisplay.className = 'property-value';
        valueDisplay.htmlFor = `prop-${property}`;
        valueDisplay.textContent = definition.value;
        label.appendChild(valueDisplay);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = `prop-${property}`;
        input.min = definition.min;
        input.max = definition.max;
        input.step = definition.step;
        input.value = definition.value;
        input.addEventListener('input', (event) => {
            const value = Number.parseFloat(event.target.value);
            valueDisplay.textContent = value;
            this.visualizationEngine.updateVisualizationProperty(property, value);
        });

        container.appendChild(label);
        container.appendChild(input);
        return container;
    }
}
