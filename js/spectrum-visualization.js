class SpectrumVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Espectro de Frequências';
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
            const barHeight = (data[i] / 255) * this.height;
            const x = i * barWidth;
            const y = this.height - barHeight;

            this.ctx.fillStyle = `hsl(${i / data.length * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        }
    }
}
