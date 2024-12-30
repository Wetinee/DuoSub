// popup.js

let selectionOrder = [];

document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.getElementById('fetch-captions');

    // Function to validate YouTube URL
    function isValidYouTubeUrl(url) {
        const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return urlPattern.test(url);
    }

    // Check the current tab's URL and update button state
    async function updateFetchButtonState() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0].url;
        fetchButton.disabled = !isValidYouTubeUrl(currentUrl);
    }

    // Initial check
    updateFetchButtonState();

    // Add event listener to fetch captions
    fetchButton.addEventListener('click', async () => {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tabs[0].id, { action: "getCaptions" });
            let { captions, videoId } = response;
            
            const captionsDiv = document.getElementById('captions');
            captionsDiv.innerHTML = '';

            if (captions.length === 0) {
                captionsDiv.textContent = 'No subtitle is available'
            }
    
            if (captions.length < 2) {
                captionsDiv.textContent = 'Less than 2 subtitles are available.';
                return;
            }

            // Sort captions alphabetically based on the 'snippet.language' property
            captions.sort((a, b) => a.snippet.language.localeCompare(b.snippet.language, 'en', { sensitivity: 'base' }));


            captions.forEach((caption, index) => {
                console.log(caption);
                const captionItem = document.createElement('div');
                captionItem.textContent = `${caption.snippet.language}`;
                captionItem.className = 'caption-item';
                captionItem.dataset.index = index;

                captionItem.addEventListener('click', () => {
                    captionItem.classList.toggle('selected');
                    
                    if (captionItem.classList.contains('selected')) {
                        selectionOrder.push(captionItem);
                    } else {
                        selectionOrder = selectionOrder.filter(item => item !== captionItem);
                    }

                    updateSelectedCaptions();
                    updateSendRequestsButton();
                });

                captionsDiv.appendChild(captionItem);
            });

            const fetchButton = document.getElementById('fetch-captions');
            fetchButton.textContent = "Available Subs: " + captions.length;
            fetchButton.disabled = true;

        } catch (error) {
            console.error('Error fetching captions:', error);
            document.getElementById('captions').textContent = 'Error fetching captions. Please try again.';
        }
    });
});

function updateSendRequestsButton() {
    const downloadButton = document.getElementById('download-subs');
    downloadButton.disabled = selectionOrder.length !== 2;
}

// Function to handle downloading subtitles
async function downloadSubtitles(lang1, lang2, videoUrl) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/download?video_url=${encodeURIComponent(videoUrl)}&lang1=${lang1}&lang2=${lang2}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to download subtitles: ${errorText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'combined_subtitles.vtt';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading subtitles:', error);
        alert('Error downloading subtitles. Please try again.');
    }
}

document.getElementById('download-subs').addEventListener('click', async () => {
    if (selectionOrder.length === 2) {
        const lang1 = selectionOrder[0].textContent;
        const lang2 = selectionOrder[1].textContent;

        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const videoUrl = tabs[0].url;

        await downloadSubtitles(lang1, lang2, videoUrl);
    }
});

// Function to update the selected captions display
function updateSelectedCaptions() {
    const firstSelected = document.getElementById('firstSelected');
    const secondSelected = document.getElementById('secondSelected');

    firstSelected.textContent = selectionOrder[0] ? 'First Subtitle: ' + selectionOrder[0].textContent : '';
    secondSelected.textContent = selectionOrder[1] ? 'Second Subtitle: ' + selectionOrder[1].textContent : '';
}

