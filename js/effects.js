const Effects = (() => {
    'use strict';

    const SWIRL_TURNS = 2;
    const MAX_DISTORT_SCALE = 1000;
    const MAX_IMAGE_DIMENSION = 1000;

    // Twists the image around its center like a snail shell.
    // strength 1 = full swirl, 0 = original image.
    // Returns new pixels, the source stays unchanged.
    function swirl(source, strength) {
        const {width, height, data} = source;
        const result = new ImageData(width, height);
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.hypot(centerX, centerY);
        const maxAngle = strength * SWIRL_TURNS * 2 * Math.PI;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                // strongest twist in the center, none in the corners
                const angle = maxAngle * (1 - Math.hypot(dx, dy) / radius);
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const sourceX = Math.min(width - 1,
                    Math.max(0, Math.round(centerX + dx * cos - dy * sin)));
                const sourceY = Math.min(height - 1,
                    Math.max(0, Math.round(centerY + dx * sin + dy * cos)));
                const sourceIndex = (sourceY * width + sourceX) * 4;
                const targetIndex = (y * width + x) * 4;
                result.data[targetIndex] = data[sourceIndex];
                result.data[targetIndex + 1] = data[sourceIndex + 1];
                result.data[targetIndex + 2] = data[sourceIndex + 2];
                result.data[targetIndex + 3] = data[sourceIndex + 3];
            }
        }
        return result;
    }

    function readPixels(image) {
        // scaled down, so the swirl is calculated fast
        const scale = Math.min(1, MAX_IMAGE_DIMENSION /
            Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not create a 2D canvas context.');
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }

    function drawSwirl(canvas, pixels, strength) {
        if (pixels === null) {
            throw new Error('No image pixels available for the swirl.');
        }
        if (canvas.width !== pixels.width) {
            canvas.width = pixels.width;
        }
        if (canvas.height !== pixels.height) {
            canvas.height = pixels.height;
        }
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not create a 2D canvas context.');
        }
        context.putImageData(swirl(pixels, strength), 0, 0);
    }

    return Object.freeze({MAX_DISTORT_SCALE, swirl, readPixels, drawSwirl});
})();
