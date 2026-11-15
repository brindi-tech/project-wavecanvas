
class ParticleVisualization extends AudioVisualization {

    constructor(canvas, audioProcessor) {
        super(canvas, audioProcessor);

        this.name = 'Partículas';

        this.particles = [];
        this.circleParticles = [];
        this.floatingParticles = [];

        // Configurações
        this.particleCount = 150;
        this.maxConnections = 85;
        this.connectionDistance = 85;
        this.particleSize = 1;
        this.properties = {
            connectionDistance: {
                label: 'Distância das ligações',
                value: this.connectionDistance,
                min: 40,
                max: 180,
                step: 5
            },
            particleSize: {
                label: 'Tamanho das partículas',
                value: this.particleSize,
                min: 0.5,
                max: 2,
                step: 0.1
            }
        };

        // Centro da nuvem
        this.updateLayout();

        // Áudio
        this.bassEnergy = 0;
        this.midEnergy = 0;
        this.highEnergy = 0;
        this.audioLevel = 0;

        // Movimento
        this.time = 0;
        this.pulse = 0;
        this.waveIntensity = 0;
        this.bassHitCooldown = 0;
        this.previousRawBass = 0;
        this.beatPulse = 0;

        this.initParticles();
    }

    updateLayout() {
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.baseRadius = Math.min(this.width, this.height) * 0.2;
    }

    resize(width, height) {
        super.resize(width, height);
        this.updateLayout();
        this.initParticles();
    }

    initParticles() {

        this.circleParticles = [];
        this.floatingParticles = [];
        this.particles = [];
        const floatingParticleCount = 80;
        const circleParticleCount = this.particleCount - floatingParticleCount;

        for (let i = 0; i < this.particleCount; i++) {

            const isFloater = i >= circleParticleCount;
            const angle = isFloater ? 0 : (i / circleParticleCount) * Math.PI * 2;
            const distance = isFloater ? 0 : this.baseRadius + (Math.random() - 0.5) * 12;
            const x = isFloater ? Math.random() * this.width : this.centerX + Math.cos(angle) * distance;
            const y = isFloater ? Math.random() * this.height : this.centerY + Math.sin(angle) * distance;

            const particle = {

                x: x,
                y: y,

                vx: isFloater ? (Math.random() - 0.5) * 1.2 : 0,
                vy: isFloater ? (Math.random() - 0.5) * 1.2 : 0,

                angle: angle,
                wanderAngle: Math.random() * Math.PI * 2,

                distance: distance,
                isFloater: isFloater,

                // Variação individual
                noiseOffset: Math.random() * 1000,

                noiseSpeed: Math.random() * 0.025 + 0.01,

                noiseStrength: isFloater ? Math.random() * 12 + 8 : Math.random() * 3 + 1,

                radius: Math.random() * 2.5 + 1,

                baseRadius: Math.random() * 2.5 + 1,

                color: `hsl(${240 + Math.random() * 100}, 100%, 65%)`,

                alpha: Math.random() * 0.5 + 0.5
            };

            this.particles.push(particle);
            if (isFloater) {
                this.floatingParticles.push(particle);
            } else {
                this.circleParticles.push(particle);
            }
        }
    }

    // ==========================================
    // ATUALIZAR VISUALIZAÇÃO
    // ==========================================

    update() {

        super.update();

        this.updateAudio();

        this.time += 0.016;
        this.bassHitCooldown = Math.max(0, this.bassHitCooldown - 0.016);
        this.beatPulse *= 0.88;

        this.updateOrganicMovement();
        this.resolveParticleCollisions();
    }

    // ==========================================
    // ANALISAR ÁUDIO
    // ==========================================

    updateAudio() {

        if (!this.hasActiveAudio()) {
            this.bassEnergy = 0;
            this.midEnergy = 0;
            this.highEnergy = 0;
            this.audioLevel = 0;
            this.pulse = 0;
            this.waveIntensity = 0;
            this.previousRawBass = 0;
            this.beatPulse = 0;
            return;
        }

        const audioData =
            this.audioProcessor?.getFrequencyData();

        const data = audioData;

        if (!data || data.length === 0) {

            this.bassEnergy *= 0.95;
            this.midEnergy *= 0.95;
            this.highEnergy *= 0.95;

            return;
        }

        // Dividir frequências
        const frequencyBinWidth = this.audioProcessor?.analyser && this.audioProcessor?.audioContext
            ? this.audioProcessor.audioContext.sampleRate / this.audioProcessor.analyser.fftSize
            : 1;
        const bassStart = Math.min(
            data.length - 1,
            Math.floor(35 / frequencyBinWidth)
        );
        const bassEnd = Math.min(
            data.length,
            Math.max(bassStart + 1, Math.ceil(180 / frequencyBinWidth))
        );

        const midEnd = Math.max(
            bassEnd + 1,
            Math.floor(data.length * 0.35)
        );

        let bass = 0;
        let mid = 0;
        let high = 0;

        // Graves
        for (let i = bassStart; i < bassEnd; i++) {
            bass += data[i];
        }

        const rawBass = bass / (bassEnd - bassStart) / 255;
        bass = rawBass;

        // Médios
        for (let i = bassEnd; i < midEnd; i++) {
            mid += data[i];
        }

        mid /= (midEnd - bassEnd);

        // Agudos
        for (let i = midEnd; i < data.length; i++) {
            high += data[i];
        }

        high /= (data.length - midEnd);

        // Normalizar
        mid /= 255;
        high /= 255;

        // Suavizar valores
        this.bassEnergy +=
            (bass - this.bassEnergy) * 0.25;

        this.midEnergy +=
            (mid - this.midEnergy) * 0.20;

        this.highEnergy +=
            (high - this.highEnergy) * 0.25;

        // Volume geral
        this.audioLevel = this.audioProcessor ? this.audioProcessor.audioLevel : 0;

        // Pulso dos graves
        this.pulse +=
            (this.bassEnergy - this.pulse) * 0.18;

        // Intensidade das ondas
        this.waveIntensity =
            this.midEnergy * 0.7 +
            this.highEnergy * 0.5;

        const bassRise = rawBass - this.previousRawBass;
        this.previousRawBass = rawBass;
        if (rawBass > 0.18 && bassRise > 0.045 && this.bassHitCooldown === 0) {
            this.triggerBassBeat(rawBass);
            this.bassHitCooldown = 0.35;
        }
    }

    triggerBassBeat(intensity) {
        this.beatPulse = Math.min(1, this.beatPulse + 0.85);

        for (const particle of this.circleParticles) {
            const speed = 2 + intensity * 3;
            particle.vx += Math.cos(particle.angle) * speed;
            particle.vy += Math.sin(particle.angle) * speed;
        }

        for (const particle of this.floatingParticles) {
            const direction = Math.random() * Math.PI * 2;
            const speed = 0.35 + Math.random() * 0.55;
            particle.vx += Math.cos(direction) * speed;
            particle.vy += Math.sin(direction) * speed;
        }
    }

    // ==========================================
    // MOVIMENTO ORGÂNICO
    // ==========================================

    updateOrganicMovement() {

        const expansion =
            1 +
            this.bassEnergy * 0.55 +
            this.midEnergy * 0.18 +
            this.highEnergy * 0.08 +
            this.beatPulse * 0.3;
        const waveformData = this.audioProcessor?.getWaveformData();
        const waveform = waveformData?.length ? waveformData : this.testData;

        for (let index = 0; index < this.circleParticles.length; index++) {
            const particle = this.circleParticles[index];

            // Movimento temporal individual
            particle.noiseOffset += particle.noiseSpeed;

            const targetDistance =
                particle.distance * expansion;

            const waveIndex = Math.floor(
                (index / this.circleParticles.length) * waveform.length
            );
            const waveformOffset = ((waveform[waveIndex] - 128) / 128) * 48;
            const driftX =
                Math.sin(this.time + particle.noiseOffset) * particle.noiseStrength;
            const driftY =
                Math.cos(this.time * 0.8 + particle.noiseOffset) * particle.noiseStrength;
            const radialWave = Math.abs(waveformOffset) * 0.65 +
                this.bassEnergy * 18 +
                this.beatPulse * 35;
            const targetRadius = targetDistance + radialWave;

            // Posição desejada
            const targetX =
                this.centerX +
                Math.cos(particle.angle) *
                targetRadius +
                driftX;

            const targetY =
                this.centerY +
                Math.sin(particle.angle) * targetRadius +
                waveformOffset +
                driftY;

            // Movimento suave até à posição desejada
            const forceX =
                (targetX - particle.x) * 0.055;

            const forceY =
                (targetY - particle.y) * 0.055;

            particle.vx += forceX;
            particle.vy += forceY;

            // Resistência
            particle.vx *= 0.9;
            particle.vy *= 0.9;

            // Atualizar posição
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Atualizar tamanho
            particle.radius =
                (particle.baseRadius +
                this.bassEnergy * 4 +
                this.highEnergy * 2 +
                this.beatPulse * 3) * this.particleSize;
        }

        this.updateFloatingParticles();
    }

    updateFloatingParticles() {
        for (const particle of this.floatingParticles) {
            particle.noiseOffset += particle.noiseSpeed;
            particle.wanderAngle += (Math.random() - 0.5) * 0.08;
            particle.vx += Math.cos(particle.wanderAngle) * 0.035;
            particle.vy += Math.sin(particle.wanderAngle) * 0.035;
            particle.vx += (this.width / 2 - particle.x) * 0.00008;
            particle.vy += (this.height / 2 - particle.y) * 0.00008;

            const speed = Math.hypot(particle.vx, particle.vy);
            const maxSpeed = 1.5;
            if (speed > maxSpeed) {
                particle.vx = (particle.vx / speed) * maxSpeed;
                particle.vy = (particle.vy / speed) * maxSpeed;
            }

            particle.vx *= 0.99;
            particle.vy *= 0.99;
            particle.x += particle.vx;
            particle.y += particle.vy;

            const horizontalMargin = this.width * 0.08;
            const verticalMargin = this.height * 0.08;
            if (particle.x < horizontalMargin || particle.x > this.width - horizontalMargin) {
                particle.vx *= -1;
                particle.x = Math.max(horizontalMargin, Math.min(this.width - horizontalMargin, particle.x));
            }
            if (particle.y < verticalMargin || particle.y > this.height - verticalMargin) {
                particle.vy *= -1;
                particle.y = Math.max(verticalMargin, Math.min(this.height - verticalMargin, particle.y));
            }

            particle.radius =
                (particle.baseRadius +
                this.bassEnergy * 4 +
                this.highEnergy * 2) * this.particleSize;
        }
    }

    resolveParticleCollisions() {
        for (const first of this.circleParticles) {
            for (const second of this.floatingParticles) {

                let dx = second.x - first.x;
                let dy = second.y - first.y;
                const minimumDistance = first.radius + second.radius;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared >= minimumDistance * minimumDistance) {
                    continue;
                }

                let distance = Math.sqrt(distanceSquared);
                if (distance === 0) {
                    dx = Math.random() - 0.5;
                    dy = Math.random() - 0.5;
                    distance = Math.sqrt(dx * dx + dy * dy);
                }

                const normalX = dx / distance;
                const normalY = dy / distance;
                const overlap = minimumDistance - distance;

                first.x -= normalX * overlap * 0.5;
                first.y -= normalY * overlap * 0.5;
                second.x += normalX * overlap * 0.5;
                second.y += normalY * overlap * 0.5;

                const relativeVelocity =
                    (second.vx - first.vx) * normalX +
                    (second.vy - first.vy) * normalY;

                if (relativeVelocity < 0) {
                    const impulse = -relativeVelocity * 0.5;
                    second.vx += normalX * impulse;
                    second.vy += normalY * impulse;
                    first.vx -= normalX * impulse;
                    first.vy -= normalY * impulse;
                }
            }
        }
    }

    // ==========================================
    // DESENHAR VISUALIZAÇÃO
    // ==========================================

    draw() {

        if (!this.hasActiveAudio()) {
            this.clearCanvas();
            return;
        }

        // Rastos luminosos
        this.ctx.fillStyle =
            'rgba(0, 0, 0, 0.18)';

        this.ctx.fillRect(
            0,
            0,
            this.width,
            this.height
        );

        this.drawConnections();

        this.drawParticles();

        this.drawCenterGlow();
    }

    // ==========================================
    // LIGAÇÕES ENTRE PARTÍCULAS
    // ==========================================

    drawConnections() {

        const maxDistance =
            this.connectionDistance + this.bassEnergy * 45;

        this.drawParticleGroupConnections(this.circleParticles, maxDistance);
        this.drawParticleGroupConnections(this.floatingParticles, maxDistance);
    }

    drawParticleGroupConnections(particles, maxDistance) {
        const opacityBucketCount = 8;
        const maxDistanceSquared = maxDistance * maxDistance;
        const maximumOpacity = 0.15 + this.audioLevel * 0.5;
        const connectionsByOpacity = Array.from(
            { length: opacityBucketCount },
            () => []
        );

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {

                const first = particles[i];
                const second = particles[j];

                const dx = first.x - second.x;
                const dy = first.y - second.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared >= maxDistanceSquared) {
                    continue;
                }

                const distance = Math.sqrt(distanceSquared);
                const opacity = (1 - distance / maxDistance) * maximumOpacity;
                const bucket = Math.min(
                    opacityBucketCount - 1,
                    Math.floor((opacity / maximumOpacity) * opacityBucketCount)
                );
                connectionsByOpacity[bucket].push(
                    first.x, first.y, second.x, second.y
                );
            }
        }

        this.ctx.lineWidth = 0.5 + this.bassEnergy * 1.5;
        for (let bucket = 0; bucket < opacityBucketCount; bucket++) {
            const connections = connectionsByOpacity[bucket];
            if (connections.length === 0) {
                continue;
            }

            this.ctx.beginPath();
            for (let index = 0; index < connections.length; index += 4) {
                this.ctx.moveTo(connections[index], connections[index + 1]);
                this.ctx.lineTo(connections[index + 2], connections[index + 3]);
            }
            const opacity = ((bucket + 0.5) / opacityBucketCount) * maximumOpacity;
            this.ctx.strokeStyle = `rgba(100, 150, 255, ${opacity})`;
            this.ctx.stroke();
        }
    }

    // ==========================================
    // DESENHAR PARTÍCULAS
    // ==========================================

    drawParticles() {
        this.ctx.save();
        this.ctx.shadowBlur = 8 + this.bassEnergy * 25 + this.highEnergy * 15;

        for (const particle of this.particles) {
            this.ctx.beginPath();
            this.ctx.arc(
                particle.x,
                particle.y,
                particle.radius,
                0,
                Math.PI * 2
            );

            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.shadowColor = particle.color;
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    // ==========================================
    // BRILHO CENTRAL
    // ==========================================

    drawCenterGlow() {

        const radius =
            this.baseRadius *
            (0.25 + this.bassEnergy * 0.6);

        const gradient =
            this.ctx.createRadialGradient(
                this.centerX,
                this.centerY,
                0,
                this.centerX,
                this.centerY,
                radius
            );

        gradient.addColorStop(
            0,
            `rgba(100, 120, 255, ${0.12 + this.bassEnergy * 0.25})`
        );

        gradient.addColorStop(
            0.5,
            'rgba(100, 80, 255, 0.08)'
        );

        gradient.addColorStop(
            1,
            'rgba(100, 80, 255, 0)'
        );

        this.ctx.fillStyle = gradient;

        this.ctx.beginPath();

        this.ctx.arc(
            this.centerX,
            this.centerY,
            radius,
            0,
            Math.PI * 2
        );

        this.ctx.fill();
    }
}
