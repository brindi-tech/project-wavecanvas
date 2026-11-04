class WaveformVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Forma de Onda';
    }

    draw() {
        this.clearCanvas();

        const audioData = this.audioProcessor?.getWaveformData();
        const data = audioData?.length ? audioData : this.testData;
        if (!data.length || !this.canvas.width || !this.canvas.height) {
            return;
        }

        const sliceWidth = this.canvas.width / data.length;
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const y = (data[i] / 255) * this.canvas.height;
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
