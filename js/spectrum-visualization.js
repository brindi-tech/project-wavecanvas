class SpectrumVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Espectro de Frequências';
    }

    draw() {
        this.clearCanvas();

        const audioData = this.audioProcessor?.getFrequencyData();
        const data = audioData?.length ? audioData : this.testData;
        if (!data.length || !this.canvas.width || !this.canvas.height) {
            return;
        }

        const barWidth = this.canvas.width / data.length;
        for (let i = 0; i < data.length; i++) {
            const barHeight = (data[i] / 255) * this.canvas.height;
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;

            this.ctx.fillStyle = `hsl(${i / data.length * 360}, 100%, 50%)`;
            this.ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        }
    }
}
