/**
 * ExportEngine - A utility to record animations from D3 (SVG) and ECharts (Canvas)
 * and export them as high-quality videos with a branded watermark.
 */
class ExportEngine {
    constructor() {
        this.config = {
            logoUrl: '', // URL for the logo image
            siteUrl: 'TennisAnalytics.net', // Text to display
            width: 1920, // Default tracking width (HD)
            height: 1080, // Default tracking height (HD)
            fps: 30,     // Reduced to 30fps for stability with heavy SVG serialization
            mimeType: 'video/webm;codecs=vp9'
        };
        this.isRecording = false;
        this._overlay = null;
    }

    // ... (static methods remain unchanged)

    // ... (_startRecording remains unchanged)

    // ... (_recordCanvas remains unchanged)

    /**
     * Rasterizes SVG to Canvas frame-by-frame.
     */
    async _recordSVG(svgElement) {
        // Handle SVG dimensions
        const width = svgElement.clientWidth * 2 || this.config.width;
        const height = svgElement.clientHeight * 2 || this.config.height;

        const proxyCanvas = document.createElement('canvas');
        proxyCanvas.width = width;
        proxyCanvas.height = height;
        const ctx = proxyCanvas.getContext('2d');

        // Fetch valid CSS to inject
        const cssContent = await this._getStylesForSVG();

        // 1. Prepare images: Pre-fetch all images
        const imageUrls = new Set();
        svgElement.querySelectorAll('image').forEach(img => {
            const href = img.getAttribute('href') || img.getAttribute('xlink:href');
            if (href && !href.startsWith('data:')) imageUrls.add(href);
        });

        console.log(`ExportEngine: Pre-loading ${imageUrls.size} images for embedding...`);
        const imageMap = new Map();

        await Promise.all(Array.from(imageUrls).map(async url => {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const b64 = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onloadend = () => r(reader.result);
                    reader.readAsDataURL(blob);
                });
                imageMap.set(url, b64);
            } catch (e) {
                console.warn("ExportEngine: Failed to load image", url, e);
            }
        }));

        let frameCount = 0;
        const drawLoop = () => {
            if (!this.isRecording) return;

            try {
                // 1. Clone the node
                const clone = svgElement.cloneNode(true);

                // 2. Embed styles
                const style = document.createElement('style');
                style.textContent = cssContent;
                clone.insertBefore(style, clone.firstChild);

                // 3. Embed images in the clone
                clone.querySelectorAll('image').forEach(image => {
                    const href = image.getAttribute('href') || image.getAttribute('xlink:href');
                    if (imageMap.has(href)) {
                        image.setAttribute('href', imageMap.get(href));
                    }
                });

                // 4. Force dimensions
                clone.setAttribute("width", width);
                clone.setAttribute("height", height);

                // 5. Serialize to BLOB (More efficient than DataURI string)
                const serializer = new XMLSerializer();
                const source = serializer.serializeToString(clone);
                const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = () => {
                    // Update canvas
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    this._drawWatermark(ctx, width, height);

                    // Cleanup
                    URL.revokeObjectURL(url);
                    frameCount++;
                    if (frameCount % 60 === 0) console.log(`ExportEngine: Processed ${frameCount} frames`);
                };
                img.onerror = (e) => {
                    console.warn("ExportEngine: Frame skipped, SVG load error", e);
                    URL.revokeObjectURL(url);
                };
                img.src = url;

            } catch (error) {
                console.error("ExportEngine: Draw loop error", error);
            }

            requestAnimationFrame(drawLoop);
        };

        console.log("ExportEngine: Starting draw loop");
        requestAnimationFrame(drawLoop);

        // Return stream with specified FPS
        return proxyCanvas.captureStream(this.config.fps);
    }

    /**
     * Initialize the engine with global configuration.
     * @param {Object} options - { logoUrl, siteUrl }
     */
    static init(options = {}) {
        if (!window.ExportEngineInstance) {
            window.ExportEngineInstance = new ExportEngine();
        }
        Object.assign(window.ExportEngineInstance.config, options);
        return window.ExportEngineInstance;
    }

    /**
     * Start recording an element (SVG or Canvas).
     * @param {HTMLElement} element - The D3 SVG or ECharts Canvas container.
     * @param {number} durationSeconds - Duration to record in seconds.
     * @param {string} filename - Output filename (without extension).
     * @returns {Promise} Resolves when recording starts.
     */
    static record(element, durationSeconds, filename) {
        const instance = window.ExportEngineInstance || ExportEngine.init();
        return instance._startRecording(element, durationSeconds, filename);
    }

    /**
     * Stop the current recording.
     */
    static stop() {
        if (window.ExportEngineInstance && window.ExportEngineInstance.isRecording) {
            window.ExportEngineInstance._stopRecording();
        }
    }

    /**
     * Record an SVG animation deterministically (frame-by-frame).
     * This avoids UI freezing by driving the animation instead of capturing real-time.
     * 
     * @param {SVGElement} svgElement - The SVG element to record.
     * @param {Object} animationController - Must implement: getDuration(), renderFrame(index), reset()
     * @param {string} filename - Output filename (without extension).
     * @param {Object} options - Optional: { fps: 30 }
     */
    static recordDeterministic(svgElement, animationController, filename, options = {}) {
        const instance = window.ExportEngineInstance || ExportEngine.init();
        return instance._recordDeterministicSVG(svgElement, animationController, filename, options);
    }

    /**
     * Internal: Deterministic SVG recording.
     * Renders each frame, waits for capture, then moves to next frame.
     */
    async _recordDeterministicSVG(svgElement, controller, filename, options = {}) {
        if (this.isRecording) {
            console.warn("ExportEngine: Already recording.");
            return;
        }

        const fps = options.fps || this.config.fps;
        const totalFrames = controller.getDuration();

        console.log(`ExportEngine: Starting deterministic recording. Total frames: ${totalFrames}, FPS: ${fps}`);

        this.isRecording = true;
        this._showOverlay();

        // Setup canvas
        const width = svgElement.clientWidth * 2 || this.config.width;
        const height = svgElement.clientHeight * 2 || this.config.height;

        const proxyCanvas = document.createElement('canvas');
        proxyCanvas.width = width;
        proxyCanvas.height = height;
        const ctx = proxyCanvas.getContext('2d');

        // Pre-fetch CSS
        const cssContent = await this._getStylesForSVG();

        // Pre-fetch images
        const imageUrls = new Set();
        svgElement.querySelectorAll('image').forEach(img => {
            const href = img.getAttribute('href') || img.getAttribute('xlink:href');
            if (href && !href.startsWith('data:')) imageUrls.add(href);
        });

        console.log(`ExportEngine: Pre-loading ${imageUrls.size} images...`);
        const imageMap = new Map();

        await Promise.all(Array.from(imageUrls).map(async url => {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const b64 = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onloadend = () => r(reader.result);
                    reader.readAsDataURL(blob);
                });
                imageMap.set(url, b64);
            } catch (e) {
                console.warn("ExportEngine: Failed to load image", url, e);
            }
        }));

        // Setup MediaRecorder
        const stream = proxyCanvas.captureStream(fps);
        const mimeType = this._getSupportedMimeType();
        const chunks = [];

        let recorder;
        try {
            recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                videoBitsPerSecond: 8000000
            });
        } catch (e) {
            console.error("MediaRecorder creation failed:", e);
            this.isRecording = false;
            this._hideOverlay();
            return;
        }

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        const recorderStoppedPromise = new Promise(resolve => {
            recorder.onstop = () => {
                const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
                console.log(`ExportEngine: Recording complete. Chunks: ${chunks.length}`);
                const blob = new Blob(chunks, { type: mimeType });
                console.log(`ExportEngine: Blob size: ${blob.size} bytes`);

                if (blob.size === 0) {
                    alert("Recording failed (0 bytes). Please check console for errors.");
                } else {
                    this._saveBlob(blob, filename, ext);
                }

                this.isRecording = false;
                this._hideOverlay();
                stream.getTracks().forEach(track => track.stop());
                resolve();
            };
        });

        recorder.start();
        controller.reset();

        // Frame-by-frame capture loop
        for (let frameIndex = 0; frameIndex < totalFrames && this.isRecording; frameIndex++) {
            // Render the animation at this frame
            controller.renderFrame(frameIndex);

            // Allow DOM to update (critical for D3 transitions)
            await new Promise(r => requestAnimationFrame(r));

            // Capture the current SVG state
            await this._captureFrameToCanvas(svgElement, ctx, width, height, cssContent, imageMap);

            // Update progress
            if (frameIndex % 30 === 0 || frameIndex === totalFrames - 1) {
                const pct = Math.round((frameIndex / totalFrames) * 100);
                this._updateOverlayProgress(pct);
                console.log(`ExportEngine: Progress ${pct}% (frame ${frameIndex}/${totalFrames})`);
            }
        }

        // Finalize
        console.log("ExportEngine: Stopping recorder...");
        if (recorder.state === 'recording') {
            recorder.stop();
        }

        await recorderStoppedPromise;
    }

    /**
     * Capture a single frame from SVG to canvas (async).
     */
    async _captureFrameToCanvas(svgElement, ctx, width, height, cssContent, imageMap) {
        return new Promise((resolve, reject) => {
            try {
                // Clone SVG
                const clone = svgElement.cloneNode(true);

                // Embed styles
                const style = document.createElement('style');
                style.textContent = cssContent;
                clone.insertBefore(style, clone.firstChild);

                // Embed images
                clone.querySelectorAll('image').forEach(image => {
                    const href = image.getAttribute('href') || image.getAttribute('xlink:href');
                    if (imageMap.has(href)) {
                        image.setAttribute('href', imageMap.get(href));
                    }
                });

                // Set dimensions
                clone.setAttribute("width", width);
                clone.setAttribute("height", height);

                // Serialize
                const serializer = new XMLSerializer();
                const source = serializer.serializeToString(clone);
                const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.onload = () => {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    this._drawWatermark(ctx, width, height);
                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.onerror = (e) => {
                    console.warn("ExportEngine: Frame capture failed", e);
                    URL.revokeObjectURL(url);
                    resolve(); // Continue even on error
                };
                img.src = url;
            } catch (error) {
                console.error("ExportEngine: Capture error", error);
                resolve(); // Continue even on error
            }
        });
    }

    /**
     * Update overlay with progress percentage.
     */
    _updateOverlayProgress(percent) {
        if (this._overlay) {
            const textEl = this._overlay.querySelector('span');
            if (textEl) {
                textEl.textContent = `Recording... ${percent}%`;
            }
        }
    }

    async _startRecording(element, durationSeconds, filename) {
        if (this.isRecording) {
            console.warn("ExportEngine: Already recording.");
            return;
        }
        this.isRecording = true;
        this._showOverlay();

        try {
            const isCanvas = element.tagName === 'CANVAS';
            const stream = isCanvas ?
                await this._recordCanvas(element) :
                await this._recordSVG(element);

            this._startMediaRecorder(stream, durationSeconds, filename);
        } catch (e) {
            console.error("ExportEngine Error:", e);
            this._hideOverlay();
            this.isRecording = false;
        }
    }

    /**
     * Captures a MediaStream from an existing Canvas.
     * Note: ECharts canvas can be captured directly, but to add a watermark,
     * we need to draw it to a proxy canvas.
     */
    async _recordCanvas(sourceCanvas) {
        // Create a proxy canvas that matches the destination resolution or source
        // For 'Race' animations, we usually want high quality.
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;

        const proxyCanvas = document.createElement('canvas');
        proxyCanvas.width = width;
        proxyCanvas.height = height;
        const ctx = proxyCanvas.getContext('2d');

        // We need to continuously draw the source canvas + watermark to the proxy
        const drawLoop = () => {
            if (!this.isRecording) return;

            // 1. Clear
            ctx.clearRect(0, 0, width, height);

            // 2. Draw Source
            // ECharts canvas might need to be drawn carefully
            ctx.drawImage(sourceCanvas, 0, 0, width, height);

            // 3. Draw Watermark
            this._drawWatermark(ctx, width, height);

            requestAnimationFrame(drawLoop);
        };
        requestAnimationFrame(drawLoop);

        // Capture stream from the proxy canvas
        return proxyCanvas.captureStream(this.config.fps);
    }

    /**
     * Rasterizes SVG to Canvas frame-by-frame.
     */
    async _recordSVG(svgElement) {
        // Handle SVG dimensions
        const width = svgElement.clientWidth * 2 || this.config.width;
        const height = svgElement.clientHeight * 2 || this.config.height;

        const proxyCanvas = document.createElement('canvas');
        proxyCanvas.width = width;
        proxyCanvas.height = height;
        const ctx = proxyCanvas.getContext('2d');

        // Fetch valid CSS to inject
        const cssContent = await this._getStylesForSVG();

        // 1. Prepare images: We need to pre-fetch all images used in the SVG to Data URIs
        // to avoid Tainted Canvas issues and ensure they show up in the recording.
        // We'll map URL -> DataURI.
        const imageUrls = new Set();
        svgElement.querySelectorAll('image').forEach(img => {
            const href = img.getAttribute('href') || img.getAttribute('xlink:href');
            if (href && !href.startsWith('data:')) imageUrls.add(href);
        });

        console.log(`ExportEngine: Pre-loading ${imageUrls.size} images for embedding...`);
        const imageMap = new Map();

        await Promise.all(Array.from(imageUrls).map(async url => {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const b64 = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onloadend = () => r(reader.result);
                    reader.readAsDataURL(blob);
                });
                imageMap.set(url, b64);
            } catch (e) {
                console.warn("ExportEngine: Failed to load image", url, e);
            }
        }));

        const img = new Image();

        const drawLoop = () => {
            if (!this.isRecording) return;

            // 1. Clone the node to safely modify it for serialization
            const clone = svgElement.cloneNode(true);

            // 2. Embed styles
            const style = document.createElement('style');
            style.textContent = cssContent;
            clone.insertBefore(style, clone.firstChild);

            // 3. Embed images in the clone
            clone.querySelectorAll('image').forEach(image => {
                const href = image.getAttribute('href') || image.getAttribute('xlink:href');
                if (imageMap.has(href)) {
                    image.setAttribute('href', imageMap.get(href));
                }
            });

            // 4. Force dimensions on clone to match capture size
            clone.setAttribute("width", width);
            clone.setAttribute("height", height);

            // 5. Serialize
            const serializer = new XMLSerializer();
            const source = serializer.serializeToString(clone);

            const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                this._drawWatermark(ctx, width, height);
            };
            img.src = url;

            requestAnimationFrame(drawLoop);
        };

        requestAnimationFrame(drawLoop);
        return proxyCanvas.captureStream(this.config.fps);
    }

    _startMediaRecorder(stream, durationSeconds, filename) {
        const chunks = [];
        // Check for MP4 support
        const mimeType = this._getSupportedMimeType();
        const options = {
            mimeType: mimeType,
            videoBitsPerSecond: 8000000 // 8 Mbps
        };

        console.log(`ExportEngine: Starting recording with ${mimeType}`);

        let recorder;
        try {
            recorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error("MediaRecorder creation failed:", e);
            return;
        }

        this.recorder = recorder;
        this.stream = stream;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            console.log(`ExportEngine: Recording stopped. Chunks: ${chunks.length}`);
            const blob = new Blob(chunks, { type: mimeType });
            console.log(`ExportEngine: Blob size: ${blob.size} bytes`);

            if (blob.size === 0) {
                alert("Recording failed (0 bytes). Please check console for errors.");
            } else {
                this._saveBlob(blob, filename, ext);
            }
            this.isRecording = false;
            this._hideOverlay();

            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            this.recorder = null;
        };

        recorder.start();

        // Stop recording after duration, but also allow manual stop
        this.stopTimeout = setTimeout(() => {
            if (this.isRecording && this.recorder && this.recorder.state === 'recording') {
                this.recorder.stop();
            }
        }, durationSeconds * 1000);
    }

    _stopRecording() {
        if (this.stopTimeout) clearTimeout(this.stopTimeout);
        if (this.frameTimer) clearInterval(this.frameTimer); // Stop loop
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
    }

    _drawWatermark(ctx, width, height) {
        ctx.save();

        // Background strip (Bottom Right)
        const stripHeight = 50;
        const stripWidth = 350;
        const x = width - stripWidth;
        const y = height - stripHeight;

        // Glassmorphism effect
        ctx.fillStyle = "rgba(30, 86, 49, 0.9)"; // Primary Green
        ctx.fillRect(x, y, stripWidth, stripHeight);

        // Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Montserrat', Arial, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        ctx.fillText(this.config.siteUrl, width - 20, y + (stripHeight / 2));

        // Small Color Accent
        ctx.fillStyle = "#f9c74f"; // Accent Yellow
        ctx.fillRect(x, y + stripHeight - 4, stripWidth, 4);

        ctx.restore();
    }

    _getSupportedMimeType() {
        // Reverting to WebM priority for reliability.
        // Chrome/Firefox handle this best.
        // Mac Safari might still struggle with MediaRecorder+Canvas, 
        // but WebM is the standard fallback.
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4' // Reduced priority
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        return 'video/webm';
    }

    _saveBlob(blob, filename, extension = 'webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.${extension}`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    _getStylesForSVG() {
        return new Promise(resolve => {
            let css = "";
            // Iterating through all stylesheets to capture styles
            for (const sheet of document.styleSheets) {
                try {
                    // Start by checking if we cause a CORS error accessing rules
                    if (!sheet.cssRules) continue;

                    for (const rule of sheet.cssRules) {
                        css += rule.cssText + "\n";
                    }
                } catch (e) {
                    console.warn("ExportEngine: Could not read styles from a sheet (likely CORS)", e);
                    // Fallback for CORS: explicitly fetch common known local sheets if needed, 
                    // or just ignore. For this project, main styles are local.
                }
            }

            // Append font and basic reset if missing or for certainty
            css += `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
                text { font-family: 'Montserrat', sans-serif !important; }
                .domain { display: none; }
            `;

            resolve(css);
        });
    }

    _showOverlay() {
        if (!this._overlay) {
            const div = document.createElement('div');
            div.className = 'recording-overlay';
            div.innerHTML = `
                <div class="recording-pulse"></div>
                <span>Recording...</span>
            `;
            document.body.appendChild(div);
            this._overlay = div;
        }
        this._overlay.style.display = 'flex';
    }

    _hideOverlay() {
        if (this._overlay) {
            this._overlay.style.display = 'none';
        }
    }
}

// Global Export
window.ExportEngine = ExportEngine;
