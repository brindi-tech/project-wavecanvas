class ParticleVisualization extends AudioVisualization {
    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);
        this.name = 'Partículas';
        this.particles = [];
        this.initParticles();
    }

    draw() {
        this.clearCanvas();
        this.drawParticles();
        this.drawConnections();
    }

    update() {
        super.update();
        this.updateParticles();
    }

    initParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                radius: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`
            });
        }
    }

    updateParticles() {
        const audioData = this.audioProcessor?.getFrequencyData();
        const data = audioData?.length ? audioData : this.testData;
        const audioLevel = this.audioProcessor ? this.audioProcessor.calculateAudioLevel() : 0.5;

        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            if (data.length > 0) {
                const frequencyIndex = Math.floor(i / this.particles.length * data.length);
                const intensity = data[frequencyIndex] / 255;
                particle.vx += (Math.random() - 0.5) * intensity * 1.5;
                particle.vy += (Math.random() - 0.5) * intensity * 1.5;

                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                const maxSpeed = 2 + audioLevel * 8;
                if (speed > maxSpeed) {
                    particle.vx = (particle.vx / speed) * maxSpeed;
                    particle.vy = (particle.vy / speed) * maxSpeed;
                }
            }
        }
    }

    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = particle.color;
            this.ctx.fill();
        }
    }

    drawConnections() {
        const maxDistance = 100;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const first = this.particles[i];
                const second = this.particles[j];
                const dx = first.x - second.x;
                const dy = first.y - second.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = 1 - distance / maxDistance;
                    this.ctx.beginPath();
                    this.ctx.moveTo(first.x, first.y);
                    this.ctx.lineTo(second.x, second.y);
                    this.ctx.strokeStyle = `rgba(76, 201, 240, ${opacity * 0.5})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }
            }
        }
    }
}
