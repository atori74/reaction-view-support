const NetflixCtl = class {
	constructor() {
		this.state = 'OPEN';
		this.video = document.querySelector('video');
		this.initPlayer();
		this.isPaused = false;

		//this.initEventListener();

		this.allowedDiff = 0.5;
	}

	injectScript(f, args) {
		const actualcode = '(' + f + ')(' + (args ? JSON.stringify(args) : '') + ')';
		let script = document.createElement('script');
		script.textContent = actualcode;
		(document.head || document.documentElement).appendChild(script);
		script.remove();
	}

	initEventListener() {
		// Arrow Function では定義時点のthisが保存されるのでthisを別名変数にする必要なし
		this.playedHandler = _ => {
			console.log("played")
			if (this.isPaused) {
				this.isPaused = false;
				this.sendMessage('played');
			}
		};
		this.pausedHandler = _ => {
			console.log("paused")
			return;
		};
		this.seekedHandler = _ => {
			return;
		};

		this.video.addEventListener('play', this.playedHandler);
		this.video.addEventListener('pause', this.pausedHandler);
		this.video.addEventListener('seeked', this.seekedHandler);
	}

	clearEventListener() {
		this.video.removeEventListener('play', this.playedHandler);
		this.video.removeEventListener('pause', this.pausedHandler);
		this.video.removeEventListener('seeked', this.seekedHandler);
	}

	initPlayer() {
		this.injectScript(_ => {
			player = netflix.appContext.state.playerApp.getAPI().videoPlayer;
			sessionId = player.getAllPlayerSessionIds()[0];
			video = player.getVideoPlayerBySessionId(sessionId);
		}, undefined);
	}

	getDuration() {
		return this.video.duration;
	}

	play() {
		this.injectScript(_ => {
			video.play();
		}, undefined);
	}

	pause() {
		this.injectScript(_ => {
			video.pause();
		}, undefined);
	}

	seekTo(position) {
		this.injectScript(p => {
			video.seek(p*1000);
		}, position);
	}

	seekAfter(sec) { 
		this.injectScript(sec => {
			video.seek(video.getCurrentTime() + sec * 1000);
		}, sec);
	}

	sync(position) {
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

	release() {
		this.clearEventListener();
		this.state = 'CLOSED';
	}
}

const sleep = async ms => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	})
};

let syncCtl;

console.log("content scripts was loaded");

const initializeSyncCtl = _ => {
	if(/^\/watch/.test(document.location.pathname)) {
		const wait = setInterval(_ => {
			if(document.querySelector('video')) {
				console.log("syncCtl is initialized")
				syncCtl = new NetflixCtl();
				clearInterval(wait);
			}
		}, 100);
		setTimeout(_ => {
			clearInterval(wait);
		}, 60000);
	}
};

const stopSyncCtl = _ => {
	if(syncCtl && syncCtl.state == 'OPEN') {
		console.log("syncCtl is released")
		syncCtl.release();
	}
}

(_ => {
	const actualcode = 'let player, sessionId, video;';
	let script = document.createElement('script');
	script.textContent = actualcode;
	(document.head || document.documentElement).appendChild(script);
})();

let currentHref = document.location.href;
const watchNavigate = setInterval(async _ => {
	if (currentHref != document.location.href) {
		currentHref = document.location.href;
		if(document.location.hostname != 'www.netflix.com') {
			clearInterval(watchNavigate);
			return
		}
		stopSyncCtl();
		await sleep(1000)
		initializeSyncCtl();
	}
}, 100);

initializeSyncCtl();



