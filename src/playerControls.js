function isVisibleVideo(video) {
  if (!video || video.readyState === 0) return false;
  const rect = video.getBoundingClientRect();
  const style = window.getComputedStyle(video);
  return rect.width > 40 &&
    rect.height > 40 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) !== 0;
}

export function getActiveVideo() {
  const videos = Array.from(document.querySelectorAll('video')).filter(isVisibleVideo);
  if (videos.length === 0) return null;

  const playing = videos.find((video) => !video.paused && !video.ended);
  if (playing) return playing;

  return videos
    .map((video) => {
      const rect = video.getBoundingClientRect();
      return { video, area: rect.width * rect.height };
    })
    .sort((a, b) => b.area - a.area)[0].video;
}

export function togglePlayPause() {
  const video = getActiveVideo();
  if (!video) return false;

  if (video.paused || video.ended) {
    const result = video.play();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } else {
    video.pause();
  }

  return true;
}

export function seekBy(seconds) {
  const video = getActiveVideo();
  if (!video || Number.isNaN(video.duration)) return false;

  const maxTime = Number.isFinite(video.duration) ? video.duration : Number.MAX_SAFE_INTEGER;
  video.currentTime = Math.max(0, Math.min(maxTime, video.currentTime + seconds));
  return true;
}

export function tryFullscreen() {
  const video = getActiveVideo();
  if (!video) return false;

  const target = video.closest('[data-player], .player, .video-player') || video;
  const request = target.requestFullscreen ||
    target.webkitRequestFullscreen ||
    target.msRequestFullscreen;

  if (!request) return false;
  try {
    request.call(target);
    return true;
  } catch {
    return false;
  }
}
