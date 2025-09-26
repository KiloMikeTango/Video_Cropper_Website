// server.js - OPTIMIZED for FFmpeg Processing Speed

const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Setup Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure the 'uploads' directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Serve static files (HTML, CSS, JS) from the root directory
app.use(express.static(path.join(__dirname)));

// API Endpoint for Video Cropping
app.post('/crop', upload.single('videoFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    const { cropWidth, cropHeight, cropX, cropY } = req.body;
    const inputPath = req.file.path;
    const outputFileName = `cropped-${Date.now()}.mp4`;
    const outputPath = path.join(__dirname, 'uploads', outputFileName);

    // Ensure all required parameters are present and valid
    if (!cropWidth || !cropHeight || !cropX || !cropY) {
        fs.unlinkSync(inputPath); // Clean up uploaded file
        return res.status(400).send('Missing crop dimensions.');
    }

    console.log(`Starting crop: ${inputPath} -> ${outputPath}`);
    console.log(`Crop Filter: ${cropWidth}:${cropHeight}:${cropX}:${cropY}`);

    try {
        ffmpeg(inputPath)
            // Apply the crop filter: format is 'w:h:x:y'
            .videoFilters(`crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`)
            
            // >>> SPEED OPTIMIZATION PARAMETERS ADDED HERE <<<
            .videoCodec('libx264')
            .audioCodec('aac')
            .addOptions([
                // '-preset ultrafast' is the single biggest speed boost on low-CPU servers
                '-preset ultrafast', 
                // '-crf 28' is a higher compression (lower quality) but much faster encoding
                '-crf 28', 
                // '-pix_fmt yuv420p' ensures maximum compatibility for web playback
                '-pix_fmt yuv420p' 
            ])
            // >>> END OF OPTIMIZATION PARAMETERS <<<

            .on('end', () => {
                console.log('FFmpeg processing finished.');
                // 1. Send the file back to the client
                res.download(outputPath, outputFileName, (err) => {
                    if (err) {
                        console.error('Download error:', err);
                    }
                    // Clean up all files after download or error
                    fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    if (err && !res.headersSent) {
                        res.status(500).send('Error during download.');
                    }
                });
            })
            .on('error', (err) => {
                console.error('FFmpeg error: ' + err.message);
                // Clean up files on error
                fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                if (!res.headersSent) {
                    res.status(500).send('Video processing failed.');
                }
            })
            .save(outputPath);

    } catch (e) {
        console.error('General server error:', e);
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        res.status(500).send('An unexpected error occurred.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Ensure FFmpeg is installed and accessible in your system PATH.');
});