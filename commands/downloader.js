// commands/downloader.js
const axios = require('axios');
const config = require('../config');

module.exports = {
    play: async (sock, chat, sender, args) => {
        if (!args.length) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide song name\nExample: .play Daniel Ochungulo' 
            });
            return;
        }

        const query = args.join(' ');
        await sock.sendMessage(chat, { text: `🔍 Searching: ${query}...` });

        try {
            const searchRes = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: 'snippet',
                    q: query,
                    type: 'video',
                    maxResults: 1,
                    key: 'AIzaSyAMPD1qbljXot21bfpMsB7EkW1tL6ABkEs'
                }
            });

            if (!searchRes.data?.items?.length) {
                await sock.sendMessage(chat, { 
                    text: '❌ No results found.' 
                });
                return;
            }

            const video = searchRes.data.items[0];
            const videoId = video.id.videoId;
            const videoTitle = video.snippet.title;
            const channelTitle = video.snippet.channelTitle;
            const thumbnail = video.snippet.thumbnails.high.url;

            let viewCount = 'N/A', duration = 'N/A';
            try {
                const statsRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                    params: {
                        part: 'statistics,contentDetails',
                        id: videoId,
                        key: 'AIzaSyAMPD1qbljXot21bfpMsB7EkW1tL6ABkEs'
                    }
                });
                
                if (statsRes.data?.items?.[0]) {
                    viewCount = parseInt(statsRes.data.items[0].statistics.viewCount).toLocaleString();
                    
                    const durationStr = statsRes.data.items[0].contentDetails.duration;
                    const matches = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                    if (matches) {
                        const hours = matches[1] || 0;
                        const minutes = matches[2] || 0;
                        const seconds = matches[3] || 0;
                        duration = `${hours ? hours + ':' : ''}${minutes}:${seconds.toString().padStart(2, '0')}`;
                    }
                }
            } catch (e) {}

            const infoMsg = `🎵 *${videoTitle}*\n📺 ${channelTitle}\n👁️ ${viewCount} views\n⏱️ ${duration}\n\n1️⃣ Audio\n2️⃣ Document\n3️⃣ Link`;
            
            global.lastSearch = {
                chat,
                videoId,
                videoTitle
            };
            
            await sock.sendMessage(chat, { 
                image: { url: thumbnail },
                caption: infoMsg
            });

        } catch (error) {
            await sock.sendMessage(chat, { 
                text: '❌ Search failed.' 
            });
        }
    },

    audio: async (sock, chat, sender, args) => {
        const videoId = args[0];
        if (!videoId) {
            await sock.sendMessage(chat, { text: '❌ Invalid video ID' });
            return;
        }

        await sock.sendMessage(chat, { text: '⬇️ Downloading...' });

        try {
            const infoRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                params: {
                    part: 'snippet',
                    id: videoId,
                    key: 'AIzaSyAMPD1qbljXot21bfpMsB7EkW1tL6ABkEs'
                }
            });
            
            const videoTitle = infoRes.data?.items?.[0]?.snippet?.title || 'Audio';

            const downloadUrl = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`;
            
            const dlRes = await axios.get(downloadUrl, {
                headers: {
                    'x-rapidapi-key': config.rapidApiKey,
                    'x-rapidapi-host': config.rapidApiHost
                },
                timeout: 30000
            });

            if (dlRes.data && dlRes.data.link) {
                await sock.sendMessage(chat, { 
                    audio: { url: dlRes.data.link },
                    mimetype: 'audio/mpeg',
                    fileName: `${videoTitle}.mp3`
                });
            } else {
                await sock.sendMessage(chat, { 
                    text: `🔗 https://youtu.be/${videoId}` 
                });
            }

        } catch (error) {
            await sock.sendMessage(chat, { 
                text: `🔗 https://youtu.be/${videoId}` 
            });
        }
    },

    doc: async (sock, chat, sender, args) => {
        const videoId = args[0];
        if (!videoId) {
            await sock.sendMessage(chat, { text: '❌ Invalid video ID' });
            return;
        }

        await sock.sendMessage(chat, { text: '⬇️ Preparing...' });

        try {
            const infoRes = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
                params: {
                    part: 'snippet',
                    id: videoId,
                    key: 'AIzaSyAMPD1qbljXot21bfpMsB7EkW1tL6ABkEs'
                }
            });
            
            const videoTitle = infoRes.data?.items?.[0]?.snippet?.title || 'Audio';
            const channelTitle = infoRes.data?.items?.[0]?.snippet?.channelTitle || 'YouTube';

            const downloadUrl = `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`;
            
            const dlRes = await axios.get(downloadUrl, {
                headers: {
                    'x-rapidapi-key': config.rapidApiKey,
                    'x-rapidapi-host': config.rapidApiHost
                },
                timeout: 30000
            });

            if (dlRes.data && dlRes.data.link) {
                await sock.sendMessage(chat, { 
                    document: { url: dlRes.data.link },
                    mimetype: 'audio/mpeg',
                    fileName: `${videoTitle}.mp3`,
                    caption: `🎵 ${videoTitle}`
                });
            } else {
                await sock.sendMessage(chat, { 
                    text: `🔗 https://youtu.be/${videoId}` 
                });
            }

        } catch (error) {
            await sock.sendMessage(chat, { 
                text: `🔗 https://youtu.be/${videoId}` 
            });
        }
    },

    ytlink: async (sock, chat, sender, args) => {
        const videoId = args[0];
        await sock.sendMessage(chat, { 
            text: `🔗 https://youtu.be/${videoId}` 
        });
    },

    ytmp3: async (sock, chat, sender, args) => {
        if (!args.length) {
            await sock.sendMessage(chat, { 
                text: '❌ Provide YouTube URL' 
            });
            return;
        }
        let videoId = args[0];
        if (videoId.includes('youtu.be/')) {
            videoId = videoId.split('youtu.be/')[1].split('?')[0];
        } else if (videoId.includes('v=')) {
            videoId = videoId.split('v=')[1].split('&')[0];
        }
        await module.exports.audio(sock, chat, sender, [videoId]);
    },

    handleReply: async (sock, chat, sender, text, msg) => {
        if (!global.lastSearch || global.lastSearch.chat !== chat) return false;
        
        const choice = text.trim();
        const { videoId, videoTitle } = global.lastSearch;
        
        if (choice === '1') {
            await sock.sendMessage(chat, { text: `⏳ Downloading: ${videoTitle}` });
            await module.exports.audio(sock, chat, sender, [videoId]);
            global.lastSearch = null;
            return true;
        } else if (choice === '2') {
            await sock.sendMessage(chat, { text: `⏳ Preparing: ${videoTitle}` });
            await module.exports.doc(sock, chat, sender, [videoId]);
            global.lastSearch = null;
            return true;
        } else if (choice === '3') {
            await module.exports.ytlink(sock, chat, sender, [videoId]);
            global.lastSearch = null;
            return true;
        }
        return false;
    }
};
