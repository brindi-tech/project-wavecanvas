class AudioVisualization {
    constructor(canvas, audioProcessor) {
        if (new.target === AudioVisualization) {
            throw new Error('AudioVisualization é uma classe abstrata e não pode ser instanciada diretamente.');
        }

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Não foi possível obter o contexto 2D do canvas.');
        }
        this.audioProcessor = audioProcessor;
        this.name = 'Visualização';
        this.properties = {};
        this.testData = new Uint8Array(256);
        this.frameCount = 0;

        for (let i = 0; i < this.testData.length; i++) {
            this.testData[i] = Math.sin(i / 10) * 128 + 128;
        }
    }

    draw() {
        throw new Error('Método draw() deve ser implementado pela subclasse.');
    }

    update() {
        this.frameCount++;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    getProperties() {
        return this.properties;
    }

    updateProperty(property, value) {
        if (Object.prototype.hasOwnProperty.call(this.properties, property)) {
            this.properties[property] = value;
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid() {
        const { width, height } = this.canvas;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(230, 230, 230, 0.12)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let index = 1; index < 4; index++) {
            const y = height * index / 4;
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    createGradient() {
        return this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    }

    normalizeData(data) {
        if (!data || !data.length) {
            return [];
        }

        return Array.from(data, (value) => value / 255);
    }
}
