var YoutubeSync = class {
	constructor() {
		this.video = document.getElementsByClassName('video-stream html5-main-video')[0];
	}

	getDuration() {
		return this.video.duration;
	}

	play() {
		this.video.play();
	}

	pause() {
		this.video.pause();
	}

	seekTo(position) {
		this.video.currentTime = position;
	}

	seekAfter(sec) {
		this.video.currentTime += sec;
	}

	sync(position) {
		if (position < 0 || position > this.getDuration()) {
			return;
		}
		this.seekTo(position);
	}

	sendPlaybackPosition() {
		this.sendMessage('playbackPosition');
	}

	responsePosition() {
		this.sendMessage('responsePosition');
	}

	sendMessage(command) {
		chrome.runtime.sendMessage({
			type: 'FROM_PAGE',
			command: command,
			data: {
				position: this.video.currentTime,
				currentTime: (new Date()).toISOString(),
				mediaURL: document.URL,
			},
		}, undefined);
	}

	async sleep(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms);
		})
	}
}

var syncCtl;

const initializeSyncCtl = _ => {
	if(location.pathname == '/watch') {
		console.log('syncCtl is initialized.')
		syncCtl = new YoutubeSync();
	}
};

const stopSyncCtl = _ => {
	if(syncCtl && syncCtl.state == 'OPEN') {
		console.log('syncCtl is released.')
		syncCtl.release();
	}
}

document.addEventListener('yt-navigate-start', stopSyncCtl)
document.addEventListener('yt-navigate-finish', initializeSyncCtl);

if(document.body) {
	initializeSyncCtl();
} else {
	document.addEventListener('DOMContentLoaded', initializeSyncCtl);
}


