(function () {
    const apiKey = '';

    function getVideoId(url) {
        try {
            const urlObj = new URL(url);

            // Check if the hostname is a YouTube domain
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                // Extract the video ID from the 'v' parameter for standard YouTube URLs
                if (urlObj.searchParams.has('v')) {
                    return urlObj.searchParams.get('v');
                }

                // Handle shortened YouTube URLs (e.g., youtu.be/VIDEO_ID)
                const pathSegments = urlObj.pathname.split('/');
                if (urlObj.hostname.includes('youtu.be') && pathSegments.length > 1) {
                    return pathSegments[1];
                }

                // Handle embedded YouTube URLs (e.g., youtube.com/embed/VIDEO_ID)
                if (urlObj.pathname.includes('/embed/')) {
                    return pathSegments[pathSegments.length - 1];
                }
            }

            console.error('Invalid YouTube URL:', url);
            return null;
        } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
        }
    }


    function fetchCaptions(videoId) {
        if (!apiKey) {
            console.error('API key is not defined');
            return Promise.reject('API key is not defined');
        }
    
        return fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.items) {
                    console.warn('No captions found for this video.');
                    return [];
                }
                
                let subsList = data.items;
    
                // Filter out ASR tracks
                const filteredSubsList = subsList.filter(sub => sub.snippet.trackKind !== "asr");
                return filteredSubsList;
            })
            .catch(error => {
                console.error('Error fetching caption list:', error);
                return []; 
            });
    }
    
    // Function to create a hidden element to store captions
    function createCaptionsElement() {
        const captionsDiv = document.createElement('div');
        captionsDiv.id = 'youtube-captions';
        captionsDiv.style.display = 'none'; 
        document.body.appendChild(captionsDiv);
    }

    // Listen for messages from popup.js
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getCaptions") {
            const url = window.location.href;
            const videoId = getVideoId(url);
            fetchCaptions(videoId).then(captions => {
                // Store captions in a hidden element
                const captionsDiv = document.getElementById('youtube-captions');
                captionsDiv.innerHTML = JSON.stringify(captions); 
                sendResponse({ captions, videoId }); // Send captions and video ID back to popup.js
            });
            return true; 
        }
    });

    createCaptionsElement();
})();