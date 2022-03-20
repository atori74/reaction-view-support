var FunimationSync = class {
	constructor() {
		this.video = document.getElementById('vjs_video_3_html5_api');
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
		// すでにpause状態または広告が流れている場合はスキップ
		if (this.isPaused || this.adInterrupting) {
			return;
		}
		// pauseを検知した場合はpauseコマンドをclientsに送信
		if (!this.isPaused && this.video.paused) {
			this.isPaused = true;
			this.sendMessage('paused');
		}
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
	if(location.pathname.startsWith('/v/')) {
		console.log('syncCtl is initialized.')
		syncCtl = new FunimationSync();
	}
};

if(/^\/v\/.+/.test(document.location.pathname)) {
	const wait = setInterval(_ => {
		if(document.querySelector('video#vjs_video_3_html5_api')) {
			initializeSyncCtl();
			clearInterval(wait);
		}
	}, 100);
	setTimeout(_ => {
		clearInterval(wait);
	}, 60000);
}

