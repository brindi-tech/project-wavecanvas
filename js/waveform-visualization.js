class WaveformVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Forma de Onda';
        this.amplitude = 1;
        this.lineWidth = 2;
        this.properties = {
            amplitude: {
                label: 'Amplitude',
                value: this.amplitude,
                min: 0.5,
                max: 2,
                step: 0.1
            },
            lineWidth: {
                label: 'Espessura da linha',
                value: this.lineWidth,
                min: 1,
                max: 5,
                step: 0.25
            }
        };
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
        const centerY = this.height / 2;
        this.ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const normalizedSample = (data[i] - 128) / 128;
            const y = Math.max(
                0,
                Math.min(this.height, centerY - normalizedSample * centerY * this.amplitude)
            );
            const x = i * sliceWidth;
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.strokeStyle = '#4cc9f0';
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.stroke();
    }
}
