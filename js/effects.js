const Effects = (() => {
    'use strict';

    const SWIRL_TURNS = 2;
    const MAX_DISTORT_SCALE = 1000;
    const MAX_IMAGE_DIMENSION = 1000;

    /**
     * Twists the image around its center.
     * @param {ImageData} source - Original pixels to sample without modifying them.
     * @param {number} strength - 1 for full swirl, 0 for the original image.
     * @returns {ImageData} New distorted pixels with the source dimensions.
     */
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

    /**
     * @param {HTMLImageElement} image - Decoded image with valid natural dimensions.
     * @returns {ImageData} Pixels scaled down to MAX_IMAGE_DIMENSION on the longest side,
     * preserving aspect ratio and never upscaling.
     * @throws {Error} If canvas creation, drawing, or pixel access fails.
     */
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

    /**
     * Resizes the target canvas to the cached pixels and draws the requested swirl.
     * @param {HTMLCanvasElement} canvas - Destination for the effect.
     * @param {ImageData | null} pixels - Original cached pixels; null is rejected.
     * @param {number} strength - 1 for full swirl, 0 for the original image.
     * @returns {void}
     * @throws {Error} If pixels are missing or a 2D canvas context cannot be created.
     */
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
