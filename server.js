const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// Create directories
const downloadsDir = path.join(__dirname, 'downloads');
const thumbnailsDir = path.join(__dirname, 'thumbnails');

[downloadsDir, thumbnailsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created: ${dir}`);
    }
});

// Serve downloads
app.use('/downloads', express.static(downloadsDir));

// Cookies
const cookiesPath = path.join(__dirname, 'cookies.txt');
const cookiesOption = fs.existsSync(cookiesPath) ? ` --cookies "${cookiesPath}"` : '';

// ========== VIDEO INFO ENDPOINT ==========
app.post('/info', (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.json({ error: 'URL provide karo' });
    }

   const command = `yt-dlp --dump-json --no-download ${cookiesOption} "${url}"`

    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Info error:', stderr);
            return res.json({ error: 'Video info nahi mil payi' });
        }

        try {
            let info;

try {
    const lines = stdout.split("\n");
    const jsonLine = lines.find(line => line.trim().startsWith("{"));
    info = JSON.parse(jsonLine);
} catch (e) {
    console.error("JSON parse failed");
    console.log("FULL STDOUT:\n", stdout);
    return res.status(500).send("Failed to parse video info");
}

            
            // Available qualities
            const formats = info.formats || [];
            const qualities = [...new Set(formats
                .map(f => f.height)
                .filter(h => h && h > 0)
                .sort((a, b) => b - a)
            )];
            
            const videoInfo = {
                title: info.title || 'No title',
                description: info.description || 'No description',
                duration: formatDuration(info.duration),
                uploader: info.uploader || info.channel || 'Unknown',
                views: formatNumber(info.view_count),
                likes: formatNumber(info.like_count),
                comments: formatNumber(info.comment_count),
                uploadDate: info.upload_date ? formatDate(info.upload_date) : 'Unknown',
                thumbnail: info.thumbnail || null,
                platform: info.extractor_key || 'Unknown',
                url: url,
                availableQualities: qualities,
                maxResolution: qualities[0] || 'N/A'
            };
            
            res.json(videoInfo);
        } catch (e) {
            console.error('Parse error:', e);
            res.json({ error: 'Info parse nahi ho paya' });
        }
    });
});

// ========== DOWNLOAD ENDPOINT ==========
app.post('/download', (req, res) => {
    const { url, quality = 'best' } = req.body;
    
    if (!url) {
        return res.json({ error: 'URL provide karo' });
    }

    const timestamp = Date.now();
    const outputPath = path.join(downloadsDir, `${timestamp}.%(ext)s`);
    
    let formatOption;
    if (quality === 'audio') {
        formatOption = '-f bestaudio --extract-audio --audio-format mp3';
    } else if (quality === 'best') {
        formatOption = '-f "bestvideo+bestaudio/best" --merge-output-format mp4';
    } else {
        formatOption = `-f "best[height<=${quality}]+bestaudio/best[height<=${quality}]" --merge-output-format mp4`;
    }
    
const command = `yt-dlp ${formatOption} --no-playlist --embed-metadata ${cookiesOption} "${url}" -o "${outputPath}"`
    
    exec(command, { maxBuffer: 1024 * 1024 * 1024 }, (error) => {
        if (error) {
            console.error('Download error:', error);
            return res.json({ error: 'Video download nahi ho paya' });
        }
        
        fs.readdir(downloadsDir, (err, files) => {
            if (err) return res.json({ error: 'File nahi mili' });
            
            const downloadedFiles = files.filter(file => file.startsWith(timestamp.toString()));
            
            if (downloadedFiles.length === 0) {
                return res.json({ error: 'Downloaded file nahi mili' });
            }
            
            const filename = downloadedFiles[0];
            const filePath = path.join(downloadsDir, filename);
            
            // Auto delete after 1 minute
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (!err) console.log('🗑️ Deleted:', filename);
                });
            }, 60000);
            
            res.json({ 
                downloadUrl: `/downloads/${filename}`,
                filename: filename,
                success: true,
                message: '1 minute mein delete ho jayega'
            });
        });
    });
});

// ========== HELPER FUNCTIONS ==========
function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    return `${dateStr.substr(0,4)}-${dateStr.substr(4,2)}-${dateStr.substr(6,2)}`;
}

// Cleanup old files (5 minutes)
setInterval(() => {
    fs.readdir(downloadsDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(downloadsDir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;
                if (now - stats.mtimeMs > 300000) {
                    fs.unlink(filePath, () => {});
                }
            });
        });
    });
}, 300000);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════╗
    ║   🚀 SERVER STARTED              ║
    ║   http://localhost:${PORT}        ║
    ║   Made with ❤️ by Zero           ║
    ╚══════════════════════════════════╝
    `);
});