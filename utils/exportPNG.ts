// SVG-based PNG export utility to avoid oklab CSS parsing issues

export async function exportCanvasAsPNG(
    canvasContainerId: string,
    filename: string,
    showMeasurements: boolean,
    setShowMeasurements: (show: boolean) => void
): Promise<void> {
    console.log('🎨 Starting SVG-based PNG export...');

    const wasShowingMeasurements = showMeasurements;

    // Enable measurements if needed
    if (!wasShowingMeasurements) {
        setShowMeasurements(true);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
        const container = document.getElementById(canvasContainerId);
        if (!container) {
            throw new Error('Canvas container not found');
        }

        const svgElement = container.querySelector('svg');
        if (!svgElement) {
            throw new Error('SVG element not found');
        }

        // Get SVG dimensions
        const bbox = svgElement.getBoundingClientRect();
        const scale = 2; // 2x for higher quality
        const width = Math.floor(bbox.width * scale);
        const height = Math.floor(bbox.height * scale);

        console.log(`Creating canvas: ${width}x${height}`);

        // Serialize SVG
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        // CRITICAL: Remove oklab colors from string to avoid parsing errors
        console.log('Removing oklab colors from SVG string...');
        svgString = svgString.replace(/oklab\([^)]+\)/g, '#000000');

        // Also handle oklch if present
        svgString = svgString.replace(/oklch\([^)]+\)/g, '#000000');

        // Create SVG blob
        const svgBlob = new Blob([svgString], {
            type: 'image/svg+xml;charset=utf-8'
        });
        const svgUrl = URL.createObjectURL(svgBlob);

        // Load SVG as image
        const img = new Image();

        const imageLoadPromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
            img.onload = () => {
                console.log('SVG loaded successfully');

                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Fill white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                // Draw SVG
                ctx.drawImage(img, 0, 0, width, height);

                URL.revokeObjectURL(svgUrl);
                resolve(canvas);
            };

            img.onerror = (error) => {
                console.error('Failed to load SVG as image:', error);
                URL.revokeObjectURL(svgUrl);
                reject(new Error('Failed to load SVG as image'));
            };
        });

        img.src = svgUrl;
        const canvas = await imageLoadPromise;

        console.log('Canvas created successfully');

        // Convert to blob and download
        canvas.toBlob((blob) => {
            if (!blob) {
                throw new Error('Failed to create PNG blob');
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 100);
            console.log('✅ PNG export successful!');
        }, 'image/png');

    } finally {
        // Always restore measurement state
        if (!wasShowingMeasurements) {
            setShowMeasurements(false);
        }
    }
}
