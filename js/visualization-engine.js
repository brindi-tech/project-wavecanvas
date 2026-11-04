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
