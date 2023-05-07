const PrimeVideoCtl = class {
	constructor() {
	}

	getVideo() {
		const videos = document.querySelectorAll('.webPlayerContainer video[src]');
		if(videos.length == 0) {
			return undefined;
		}
		return videos[videos.length - 1];
	}

	getDuration() {
		return this.getVideo().duration;
	}

	play() {
		this.getVideo().play();
	}

	pause() {
		this.getVideo().pause();
	}

	seekTo(position) {
		const video = this.getVideo();
		const isPaused = video.paused;
		if(video.paused) {
			video.pause();
			video.currentTime = position;
			video.play();
		} else {
			video.currentTime = position;
		}
	}

	seekAfter(sec) {
		const video = this.getVideo();
		const isPaused = video.paused;
		if(video.paused) {
			video.pause();
			video.currentTime += sec;
			video.play();
		} else {
			video.currentTime += sec;
		}
	}

	sync(position) {
		if (position < 0 || position > this.getDuration()) {
			return;
		}
		this.seekTo(position);
	}

	isFullscreen() {
		return document.querySelector('#dv-web-player').classList.contains('dv-player-fullscreen');
	}

	closePlayer() {
		document.querySelector('.closeButtonWrapper .imageButton').click();
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
				position: this.getVideo().currentTime,
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

const isAmazonHost = _ => {
	return window.location.host.includes('amazon.');
}

const isPrimeVideo = _ => {
	return isAmazonHost() && document.title.includes('Prime Video');
}

let syncCtl;

console.log("content scripts was loaded");

const initializeSyncCtl = _ => {
	console.log("syncCtl is initialized")
	syncCtl = new PrimeVideoCtl();
};

if(isPrimeVideo()) {
	const wait = setInterval(_ => {
		if(document.querySelector('.webPlayerElement video')) {
			initializeSyncCtl();
			clearInterval(wait);
		}
	}, 100);
	setTimeout(_ => {
		clearInterval(wait);
	}, 60000);
}

