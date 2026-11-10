class WaveformVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Forma de Onda';
    }

    draw() {
        this.clearCanvas();

        if (!this.hasActiveAudio()) {
            return;
        }

        const audioData = this.audioProcessor?.getWaveformData();
        if (!audioData?.length || !this.width || !this.height) {
            return;
        }

        const data = audioData;
        const sliceWidth = this.width / data.length;
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const y = (data[i] / 255) * this.height;
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
