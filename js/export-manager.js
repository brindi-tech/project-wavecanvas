class ExportManager {
    constructor(visualizationEngine) {
        this.visualizationEngine = visualizationEngine;
    }

    exportAsPNG() {
        try {
            const canvas = this.visualizationEngine.canvas;
            const link = document.createElement('a');
            link.download = `audio-visualization-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Erro ao exportar PNG:', error);
        }
    }

    exportAsJPEG(quality = 0.9) {
        try {
            const canvas = this.visualizationEngine.canvas;
            const link = document.createElement('a');
            link.download = `audio-visualization-${Date.now()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', quality);
            link.click();
        } catch (error) {
            console.error('Erro ao exportar JPEG:', error);
        }
    }
}
