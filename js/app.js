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
