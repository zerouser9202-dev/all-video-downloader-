let currentVideoUrl = '';
let currentVideoInfo = {};

async function getVideoInfo() {
    const url = document.getElementById('videoUrl').value.trim();
    
    if (!url) {
        showError('Please enter a video URL');
        return;
    }

    if (!url.startsWith('http')) {
        showError('Enter a valid URL (start with http:// or https://)');
        return;
    }

    // Reset UI
    document.getElementById('loading').style.display = 'block';
    document.getElementById('videoCard').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('downloadBtn').disabled = true;

    try {
        const response = await fetch('/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Server error');
        }

        const data = await response.json();

        if (data.error) {
            showError(data.error);
            document.getElementById('loading').style.display = 'none';
            return;
        }

        currentVideoUrl = url;
        currentVideoInfo = data;
        displayVideoInfo(data);

    } catch (error) {
        console.error('Error:', error);
        showError('Network error. Check if server is running.');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayVideoInfo(info) {
    document.getElementById('platform').textContent = info.platform || 'Unknown';
    document.getElementById('title').textContent = info.title || 'No title';
    document.getElementById('uploader').textContent = info.uploader || 'Unknown';
    
    // Thumbnail
    const thumbnailImg = document.getElementById('thumbnail');
    const noThumbnail = document.getElementById('noThumbnail');
    
    if (info.thumbnail) {
        thumbnailImg.src = info.thumbnail;
        thumbnailImg.style.display = 'block';
        noThumbnail.style.display = 'none';
    } else {
        thumbnailImg.style.display = 'none';
        noThumbnail.style.display = 'flex';
    }
    
    // Stats
    document.getElementById('duration').textContent = info.duration || '0:00';
    document.getElementById('views').textContent = info.views || '0';
    document.getElementById('likes').textContent = info.likes || '0';
    document.getElementById('comments').textContent = info.comments || '0';
    document.getElementById('uploadDate').textContent = info.uploadDate || 'Unknown';
    document.getElementById('maxQuality').textContent = info.maxResolution || 'HD';
    
    // Quality Selector
    const qualitySelector = document.getElementById('qualitySelector');
    const qualitySelect = document.getElementById('qualitySelect');
    
    if (info.availableQualities && info.availableQualities.length > 0) {
        qualitySelect.innerHTML = '';
        
        const bestOption = document.createElement('option');
        bestOption.value = 'best';
        bestOption.textContent = '🎥 Best Quality';
        qualitySelect.appendChild(bestOption);
        
        info.availableQualities.forEach(q => {
            const option = document.createElement('option');
            option.value = q;
            option.textContent = `📺 ${q}p`;
            qualitySelect.appendChild(option);
        });
        
        const audioOption = document.createElement('option');
        audioOption.value = 'audio';
        audioOption.textContent = '🔊 Only Audio (MP3)';
        qualitySelect.appendChild(audioOption);
        
        qualitySelector.style.display = 'block';
        document.getElementById('qualityInfo').textContent = 
            `✨ Max: ${info.maxResolution}p | Audio available`;
    } else {
        qualitySelector.style.display = 'none';
    }
    
    // Description
    document.getElementById('description').textContent = 
        info.description && info.description !== 'No description' 
        ? info.description 
        : 'No description available for this video.';
    
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('videoCard').style.display = 'block';
}

async function downloadVideo() {
    if (!currentVideoUrl) {
        showError('Get video info first');
        return;
    }

    const qualitySelect = document.getElementById('qualitySelect');
    const selectedQuality = qualitySelect ? qualitySelect.value : 'best';

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ DOWNLOADING...';

    try {
        const response = await fetch('/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: currentVideoUrl,
                quality: selectedQuality 
            })
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        const data = await response.json();

        if (data.success && data.downloadUrl) {
            const a = document.createElement('a');
            a.href = data.downloadUrl;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            downloadBtn.textContent = '✅ DOWNLOAD STARTED! (Auto-delete in 1 min)';
            
            setTimeout(() => {
                downloadBtn.textContent = '⬇️ DOWNLOAD VIDEO';
                downloadBtn.disabled = false;
            }, 60000);
        } else {
            showError(data.error || 'Download failed');
            downloadBtn.disabled = false;
            downloadBtn.textContent = '⬇️ DOWNLOAD VIDEO';
        }
    } catch (error) {
        console.error('Download error:', error);
        showError('Download error occurred');
        downloadBtn.disabled = false;
        downloadBtn.textContent = '⬇️ DOWNLOAD VIDEO';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = '⚠️ ' + message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Enter key support
document.getElementById('videoUrl').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getVideoInfo();
    }
});