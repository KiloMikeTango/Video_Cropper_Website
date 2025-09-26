// script.js - Final and Complete Robust Version with Mobile Touch Support

document.addEventListener('DOMContentLoaded', () => {
    
    const videoFile = document.getElementById('videoFile');
    const videoPlayer = document.getElementById('videoPlayer');
    const previewArea = document.getElementById('video-preview-area');
    const uploadArea = document.querySelector('.upload-area');
    const cropBox = document.getElementById('cropBox');
    const videoWrapper = document.querySelector('.video-wrapper');
    const cropButton = document.getElementById('cropButton');
    const statusMessage = document.getElementById('statusMessage');
    
    let isDragging = false;
    let isResizing = false;
    let activeHandle = null;
    let startX, startY, startW, startH, startBoxX, startBoxY;
    
    let cropPercent = { left: 0, top: 0, width: 80, height: 80 };
    const minSize = 50;
    
    // >>> NEW STATE VARIABLE: Lock interaction after successful crop
    let isLocked = false; 


    const setStatus = (message, isProcessing = false) => {
        statusMessage.textContent = message;
        statusMessage.className = `status-msg ${isProcessing ? 'processing' : ''}`;
    };

    /**
     * NEW UTILITY: Gets coordinates from either Mouse or Touch event
     */
    const getCoords = (e) => {
        if (e.touches && e.touches.length) {
            // Return the coordinates of the first touch point (mobile)
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } else {
            // Return mouse coordinates (desktop)
            return {
                x: e.clientX,
                y: e.clientY
            };
        }
    };


    /**
     * Calculates the actual displayed width, height, and offsets of the video player.
     */
    const getDisplayedVideoDimensions = () => {
        if (!videoPlayer.videoWidth || !videoPlayer.videoHeight) {
            return { displayW: 0, displayH: 0, offsetX: 0, offsetY: 0 };
        }
        
        const videoRatio = videoPlayer.videoWidth / videoPlayer.videoHeight;
        const wrapperRect = videoWrapper.getBoundingClientRect();
        const wrapperW = wrapperRect.width;
        const wrapperH = wrapperRect.height;
        const wrapperRatio = wrapperW / wrapperH;

        let displayW, displayH, offsetX, offsetY;

        if (videoRatio > wrapperRatio) {
            displayW = wrapperW;
            displayH = wrapperW / videoRatio;
            offsetX = 0;
            offsetY = (wrapperH - displayH) / 2;
        } else {
            displayH = wrapperH;
            displayW = wrapperH * videoRatio;
            offsetY = 0;
            offsetX = (wrapperW - displayW) / 2;
        }

        return { displayW, displayH, offsetX, offsetY };
    };

    /**
     * Renders the crop box based on stored percentages and current wrapper size.
     */
    const renderCropBox = () => {
        const wrapperRect = videoWrapper.getBoundingClientRect();
        
        const absW = (cropPercent.width / 100) * wrapperRect.width;
        const absH = (cropPercent.height / 100) * wrapperRect.height;
        const absX = (cropPercent.left / 100) * wrapperRect.width;
        const absY = (cropPercent.top / 100) * wrapperRect.height;
        
        cropBox.style.width = `${absW}px`;
        cropBox.style.height = `${absH}px`;
        cropBox.style.left = `${absX}px`;
        cropBox.style.top = `${absY}px`;
    };
    
    // --- Window Resize Listener ---
    window.addEventListener('resize', () => {
        if (!previewArea.classList.contains('hidden')) {
            renderCropBox();
        }
    });

    // --- 1. Video Loading Logic ---
    videoFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            videoPlayer.src = url;
            uploadArea.classList.add('hidden');
            previewArea.classList.remove('hidden');
            cropButton.disabled = true;
            setStatus('Video loaded. Drag the box to crop.', false);

            videoPlayer.addEventListener('loadedmetadata', () => {
                cropPercent = { left: 10, top: 10, width: 80, height: 80 };
                renderCropBox();
                cropButton.disabled = false;
            }, { once: true });
        }
    });


    // --- 2. Dragging & Resizing Setup (Unified Start Function) ---

    const startInteraction = (e) => {
        // >>> CRITICAL FIX: Block interaction if the process is finished/locked
        if (isLocked) return;
        
        // ***** CRITICAL FIX: Prevent default action (scrolling/zooming) on interaction start *****
        e.preventDefault(); 

        const coords = getCoords(e);
        startX = coords.x;
        startY = coords.y;
        startW = cropBox.offsetWidth;
        startH = cropBox.offsetHeight;
        startBoxX = cropBox.offsetLeft;
        startBoxY = cropBox.offsetTop;

        if (e.target === cropBox) {
            // Started on the box itself (Dragging)
            isDragging = true;
        } else if (e.target.classList.contains('handle')) {
            // Started on a handle (Resizing)
            isResizing = true;
            activeHandle = e.target;
        }

        // Add document listeners to handle movement outside the box
        document.addEventListener('mousemove', moveInteraction);
        document.addEventListener('mouseup', endInteraction);
        document.addEventListener('touchmove', moveInteraction); // NEW
        document.addEventListener('touchend', endInteraction);  // NEW
    };

    // Attach start listeners to the crop box and handles for both mouse and touch
    cropBox.addEventListener('mousedown', startInteraction);
    cropBox.addEventListener('touchstart', startInteraction); // NEW

    document.querySelectorAll('.handle').forEach(handle => {
        handle.addEventListener('mousedown', startInteraction);
        handle.addEventListener('touchstart', startInteraction); // NEW
    });


    // --- 3. Move Logic (Unified) ---
    const moveInteraction = (e) => {
        if (!isDragging && !isResizing) return;
        
        // ***** CRITICAL FIX: Prevent default action (scrolling) during movement *****
        e.preventDefault(); 
        
        const wrapperRect = videoWrapper.getBoundingClientRect();
        const wrapperWidth = wrapperRect.width;
        const wrapperHeight = wrapperRect.height;
        
        const coords = getCoords(e);
        const dx = coords.x - startX;
        const dy = coords.y - startY;
        
        // Handle Dragging
        if (isDragging) {
            let newX = startBoxX + dx;
            let newY = startBoxY + dy;

            // Clamping
            newX = Math.max(0, Math.min(newX, wrapperWidth - cropBox.offsetWidth));
            newY = Math.max(0, Math.min(newY, wrapperHeight - cropBox.offsetHeight));

            // Store new position as percentage
            cropPercent.left = (newX / wrapperWidth) * 100;
            cropPercent.top = (newY / wrapperHeight) * 100;

            // Apply clamped position
            cropBox.style.left = `${newX}px`;
            cropBox.style.top = `${newY}px`;
        }

        // Handle Resizing 
        if (isResizing && activeHandle) {
            let newW = startW;
            let newH = startH;
            let newX = startBoxX;
            let newY = startBoxY;

            // Calculate new dimensions/positions
            if (activeHandle.classList.contains('top-left')) {
                newW = Math.max(minSize, startW - dx);
                newH = Math.max(minSize, startH - dy);
                newX = startBoxX + (startW - newW);
                newY = startBoxY + (startH - newH);

            } else if (activeHandle.classList.contains('top-right')) {
                newW = Math.max(minSize, startW + dx);
                newH = Math.max(minSize, startH - dy);
                newY = startBoxY + (startH - newH);

            } else if (activeHandle.classList.contains('bottom-left')) {
                newW = Math.max(minSize, startW - dx);
                newH = Math.max(minSize, startH + dy);
                newX = startBoxX + (startW - newW);

            } else if (activeHandle.classList.contains('bottom-right')) {
                newW = Math.max(minSize, startW + dx);
                newH = Math.max(minSize, startH + dy);
            }

            // --- Comprehensive Clamping for Resizing ---
            if (newX < 0) { newW += newX; newX = 0; } // If left boundary exceeded, move x to 0 and adjust width
            if (newX + newW > wrapperWidth) { newW = wrapperWidth - newX; }
            if (newY < 0) { newH += newY; newY = 0; } // If top boundary exceeded, move y to 0 and adjust height
            if (newY + newH > wrapperHeight) { newH = wrapperHeight - newY; }
            
            // Re-clamp minimum size after boundary check
            newW = Math.max(minSize, newW);
            newH = Math.max(minSize, newH);

            // Apply final dimensions and positions
            cropBox.style.width = `${newW}px`;
            cropBox.style.height = `${newH}px`;
            cropBox.style.left = `${newX}px`;
            cropBox.style.top = `${newY}px`;

            // Store new size/position as percentage for responsiveness
            cropPercent.width = (newW / wrapperWidth) * 100;
            cropPercent.height = (newH / wrapperHeight) * 100;
            cropPercent.left = (newX / wrapperWidth) * 100;
            cropPercent.top = (newY / wrapperHeight) * 100;
        }
    };

    // --- 4. End Logic (Unified) ---
    const endInteraction = () => {
        isDragging = false;
        isResizing = false;
        activeHandle = null;

        // Remove document listeners
        document.removeEventListener('mousemove', moveInteraction);
        document.removeEventListener('mouseup', endInteraction);
        document.removeEventListener('touchmove', moveInteraction);
        document.removeEventListener('touchend', endInteraction);
    };
    
    // --- 5. Crop and Upload to Server Logic (UPDATED with UX/Spinner and Lock-out) ---
    cropButton.addEventListener('click', async () => {
        if (!videoFile.files[0]) {
            setStatus('Please upload a video first.', false);
            return;
        }

        cropButton.disabled = true;

        // >>> START OF UX OPTIMIZATION: Spinner and Expectation Setting <<<
        let spinner = ['\\', '|', '/', '-'];
        let i = 0;
        const initialMessage = 'Processing video on server... Expect rapid results! Please wait.';

        // Set initial status and class
        setStatus(initialMessage + ' ' + spinner[i++ % 4], true);

        // Start the spinner interval
        const interval = setInterval(() => {
            // Update spinner character while preserving the message
            setStatus(initialMessage + ' ' + spinner[i++ % 4], true);
        }, 150);
        // >>> END OF UX OPTIMIZATION <<<

        const { displayW, displayH, offsetX, offsetY } = getDisplayedVideoDimensions();
        
        const videoW = videoPlayer.videoWidth;
        const videoH = videoPlayer.videoHeight;
        
        const scaleX = videoW / displayW;
        const scaleY = videoH / displayH;

        const cropX_abs = cropBox.offsetLeft;
        const cropY_abs = cropBox.offsetTop;

        const cropX_relative = cropX_abs - offsetX;
        const cropY_relative = cropY_abs - offsetY;

        // ---------------------------------------------------------------------
        // >>> FFmpeg PARAMETER CALCULATION AND CLAMPING (CRITICAL FIX) <<<
        // ---------------------------------------------------------------------

        let crop_w = Math.round(cropBox.offsetWidth * scaleX);
        let crop_h = Math.round(cropBox.offsetHeight * scaleY);
        let crop_x = Math.round(cropX_relative * scaleX);
        let crop_y = Math.round(cropY_relative * scaleY);

        if (crop_x < 0) {
            crop_w += crop_x; 
            crop_x = 0;
        }
        if (crop_y < 0) {
            crop_h += crop_y; 
            crop_y = 0;
        }

        if (crop_x + crop_w > videoW) {
            crop_w = videoW - crop_x;
        }
        if (crop_y + crop_h > videoH) {
            crop_h = videoH - crop_y;
        }
        
        crop_w = Math.max(1, crop_w);
        crop_h = Math.max(1, crop_h);
        
        // ---------------------------------------------------------------------
        
        console.log(`Sending FFmpeg Params: W:${crop_w}, H:${crop_h}, X:${crop_x}, Y:${crop_y}`);

        const formData = new FormData();
        formData.append('videoFile', videoFile.files[0]);
        formData.append('cropWidth', crop_w);
        formData.append('cropHeight', crop_h);
        formData.append('cropX', crop_x);
        formData.append('cropY', crop_y);

        let response;
        try {
            response = await fetch('/crop', {
                method: 'POST',
                body: formData,
            });

            // Stop the spinner regardless of success or failure
            clearInterval(interval); 

            if (response.ok) {
                // >>> NEW LOCK-OUT STEP: Prevent further interaction
                isLocked = true; 
                cropBox.style.pointerEvents = 'none'; // Optional visual hint

                // Trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                a.download = response.headers.get('Content-Disposition') ? 
                                response.headers.get('Content-Disposition').split('filename=')[1].replace(/"/g, '') : 
                                'cropped_video.mp4';
                
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                
                // Final success message
                setStatus('✅ Crop complete! Download started. Refreshing page in 3 seconds...', false);
                
                // Refresh the page after a short delay
                setTimeout(() => {
                    window.location.reload();
                }, 3000); 

            } else {
                const errorText = await response.text();
                setStatus(`❌ Processing failed: ${errorText || 'Server Error'}`, false);
                // On failure, remove the lock if it was accidentally set (though it shouldn't be)
                isLocked = false; 
                cropBox.style.pointerEvents = '';
            }
        } catch (error) {
            // Stop spinner on network error
            clearInterval(interval); 
            console.error('Fetch Error:', error);
            setStatus('❌ Network or server connection failed.', false);
            // On failure, remove the lock if it was accidentally set
            isLocked = false;
            cropBox.style.pointerEvents = '';
        } finally {
            // Only re-enable the button if we are not about to refresh
            if (!response || !response.ok) {
                cropButton.disabled = false;
            }
        }
    });
});