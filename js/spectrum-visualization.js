class SpectrumVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Espectro de Frequências';
        this.sensitivity = 1;
        this.properties = {
            sensitivity: {
                label: 'Sensibilidade',
                value: this.sensitivity,
                min: 0.5,
                max: 2,
                step: 0.1
            }
        };
    }

    draw() {
        this.clearCanvas();

        if (!this.hasActiveAudio()) {
            return;
        }

        const audioData = this.audioProcessor?.getFrequencyData();
        if (!audioData?.length || !this.width || !this.height) {
            return;
        }

        const data = audioData;
        const barWidth = this.width / data.length;
        for (let i = 0; i < data.length; i++) {
            const barHeight = Math.min(1, (data[i] / 255) * this.sensitivity) * this.height;
            const x = i * barWidth;
            const y = this.height - barHeight;

            this.ctx.fillStyle = `hsl(${i / data.length * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        }
    }
}
