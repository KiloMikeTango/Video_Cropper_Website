// server.js
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
        // Use fluent-ffmpeg to execute the command
        ffmpeg(inputPath)
            // Apply the crop filter: format is 'w:h:x:y'
            .videoFilters(`crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`)
            // Use H.264 codec and copy the audio stream (faster)
            .videoCodec('libx264')
            .audioCodec('copy')
            .on('end', () => {
                console.log('FFmpeg processing finished.');
                // 1. Send the file back to the client
                res.download(outputPath, outputFileName, (err) => {
                    if (err) {
                        console.error('Download error:', err);
                        // Clean up all files after download or error
                        fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                        if (!res.headersSent) {
                            res.status(500).send('Error during download.');
                        }
                    } else {
                         // 2. Clean up server files after successful download
                        fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    }
                });
            })
            .on('error', (err) => {
                console.error('FFmpeg error: ' + err.message);
                // Clean up files on error
                fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                res.status(500).send('Video processing failed.');
            })
            .save(outputPath);

    } catch (e) {
        console.error('General server error:', e);
        res.status(500).send('An unexpected error occurred.');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Ensure FFmpeg is installed and accessible in your system PATH.');
});