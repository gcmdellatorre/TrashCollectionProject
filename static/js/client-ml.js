/**
 * Client-Side ML Processing for Trash Detection
 * Uses TensorFlow.js and COCO-SSD model for fast detection
 */

class ClientMLProcessor {
    constructor() {
        this.model = null;
        this.isModelLoaded = false;
        this.isLoading = false;
    }

    /**
     * Initialize TensorFlow.js and load the model
     */
    async initialize() {
        try {
            console.log('🚀 Initializing TensorFlow.js...');
            
            // Set backend to WebGL for better performance
            await tf.setBackend('webgl');
            console.log('✅ WebGL backend initialized');
            
            // Load COCO-SSD model
            console.log('📦 Loading COCO-SSD model...');
            this.model = await cocoSsd.load();
            this.isModelLoaded = true;
            
            console.log('✅ COCO-SSD model loaded successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error initializing ML model:', error);
            return false;
        }
    }

    /**
     * Detect objects in a video frame
     */
    async detectInFrame(videoElement, confidenceThreshold = 0.5) {
        if (!this.isModelLoaded) {
            throw new Error('Model not loaded. Call initialize() first.');
        }

        try {
            console.log('🔍 Detecting objects in frame...');
            
            // Detect objects using COCO-SSD
            const predictions = await this.model.detect(videoElement, confidenceThreshold);
            
            // Filter for trash-related objects
            const trashObjects = this.filterTrashObjects(predictions);
            
            console.log(`✅ Detected ${trashObjects.length} trash objects`);
            return trashObjects;
            
        } catch (error) {
            console.error('❌ Error detecting objects:', error);
            throw error;
        }
    }

    /**
     * Process video frames for trash detection
     */
    async processVideo(videoFile, frameInterval = 30, confidenceThreshold = 0.5) {
        if (!this.isModelLoaded) {
            throw new Error('Model not loaded. Call initialize() first.');
        }

        try {
            console.log('🎥 Processing video for trash detection...');
            
            const video = document.createElement('video');
            video.src = URL.createObjectURL(videoFile);
            video.muted = true;
            
            return new Promise((resolve, reject) => {
                video.onloadedmetadata = async () => {
                    try {
                        const results = await this.processVideoFrames(
                            video, 
                            frameInterval, 
                            confidenceThreshold
                        );
                        resolve(results);
                    } catch (error) {
                        reject(error);
                    }
                };
                
                video.onerror = () => {
                    reject(new Error('Failed to load video'));
                };
            });
            
        } catch (error) {
            console.error('❌ Error processing video:', error);
            throw error;
        }
    }

    /**
     * Process individual video frames
     */
    async processVideoFrames(video, frameInterval, confidenceThreshold) {
        const results = {
            frames_processed: 0,
            total_objects: 0,
            trash_objects: 0,
            detections: [],
            category_counts: {},
            simple_category_counts: {
                plastic: 0,
                paper: 0,
                metal: 0,
                glass: 0,
                electronic: 0,
                organic: 0
            }
        };

        const duration = video.duration;
        const frameCount = Math.floor(duration * 30); // Assuming 30fps
        
        console.log(`📊 Video: ${duration}s, ${frameCount} frames, processing every ${frameInterval} frames`);

        for (let frameIndex = 0; frameIndex < frameCount; frameIndex += frameInterval) {
            try {
                // Seek to frame
                video.currentTime = frameIndex / 30;
                
                // Wait for seek to complete
                await new Promise(resolve => {
                    video.onseeked = resolve;
                });

                // Detect objects in this frame
                const frameDetections = await this.detectInFrame(video, confidenceThreshold);
                
                // Add frame results
                results.detections.push({
                    frame: frameIndex,
                    time: frameIndex / 30,
                    objects: frameDetections
                });

                // Update counts
                results.frames_processed++;
                results.total_objects += frameDetections.length;
                results.trash_objects += frameDetections.length;

                // Update category counts
                frameDetections.forEach(obj => {
                    const category = obj.category;
                    results.category_counts[category] = (results.category_counts[category] || 0) + 1;
                    
                    // Map to simple categories
                    const simpleCategory = this.mapToSimpleCategory(category);
                    if (simpleCategory) {
                        results.simple_category_counts[simpleCategory]++;
                    }
                });

                console.log(`Frame ${frameIndex}: ${frameDetections.length} objects detected`);

            } catch (error) {
                console.warn(`⚠️ Error processing frame ${frameIndex}:`, error);
            }
        }

        // Calculate estimated weight
        results.estimated_weight_kg = this.calculateEstimatedWeight(results.simple_category_counts);
        
        console.log(`✅ Video processing complete: ${results.frames_processed} frames, ${results.trash_objects} objects`);
        return results;

    }

    /**
     * Filter predictions for trash-related objects
     */
    filterTrashObjects(predictions) {
        const trashKeywords = [
            'bottle', 'cup', 'bowl', 'fork', 'knife', 'spoon', 'plate',
            'can', 'box', 'bag', 'wrapper', 'container', 'paper',
            'book', 'newspaper', 'cardboard', 'plastic', 'metal',
            'glass', 'electronics', 'phone', 'laptop', 'tv'
        ];

        return predictions.filter(prediction => {
            const className = prediction.class.toLowerCase();
            return trashKeywords.some(keyword => className.includes(keyword));
        });
    }

    /**
     * Map COCO-SSD categories to simple trash categories
     */
    mapToSimpleCategory(cocoCategory) {
        const category = cocoCategory.toLowerCase();
        
        // Plastic
        if (category.includes('bottle') || category.includes('cup') || 
            category.includes('container') || category.includes('plastic')) {
            return 'plastic';
        }
        
        // Paper
        if (category.includes('book') || category.includes('newspaper') || 
            category.includes('paper') || category.includes('cardboard')) {
            return 'paper';
        }
        
        // Metal
        if (category.includes('can') || category.includes('metal') || 
            category.includes('fork') || category.includes('knife') || 
            category.includes('spoon')) {
            return 'metal';
        }
        
        // Glass
        if (category.includes('glass') || category.includes('bottle')) {
            return 'glass';
        }
        
        // Electronic
        if (category.includes('phone') || category.includes('laptop') || 
            category.includes('tv') || category.includes('electronics')) {
            return 'electronic';
        }
        
        // Organic (food waste)
        if (category.includes('apple') || category.includes('banana') || 
            category.includes('orange') || category.includes('food')) {
            return 'organic';
        }
        
        return null;
    }

    /**
     * Calculate estimated weight based on object counts
     */
    calculateEstimatedWeight(simpleCategoryCounts) {
        const weights = {
            plastic: 0.05,    // 50g per item
            paper: 0.02,      // 20g per item
            metal: 0.1,       // 100g per item
            glass: 0.3,       // 300g per item
            electronic: 0.5,  // 500g per item
            organic: 0.03     // 30g per item
        };

        let totalWeight = 0;
        for (const [category, count] of Object.entries(simpleCategoryCounts)) {
            totalWeight += count * (weights[category] || 0.03);
        }

        return Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Check if model is ready
     */
    isReady() {
        return this.isModelLoaded && !this.isLoading;
    }

    /**
     * Get processing status
     */
    getStatus() {
        return {
            modelLoaded: this.isModelLoaded,
            isLoading: this.isLoading,
            backend: tf.getBackend()
        };
    }
}

// Global instance
window.clientMLProcessor = new ClientMLProcessor();

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 Auto-initializing client-side ML...');
    const success = await window.clientMLProcessor.initialize();
    if (success) {
        console.log('✅ Client-side ML ready for use!');
        // Show success notification
        if (window.showNotification) {
            window.showNotification('ML model loaded - Fast client-side detection ready!', 'success');
        }
    } else {
        console.warn('⚠️ Client-side ML failed to initialize');
        if (window.showNotification) {
            window.showNotification('ML model failed to load - Using server-side detection', 'warning');
        }
    }
}); 