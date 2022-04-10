class LinkNode {
	constructor(value) {
		this.value = value
		this.prev = null
		this.next = null
	}
}

class LinkedList {
	constructor(head) {
		this.head = head
	}

	search(f) {
		let cur = this.head;
		while(cur) {
			if(f(cur)) return cur;
			cur = cur.next;
		}
		return null;
	}
}

var FunimationSync = class {
	constructor() {
		this.video = document.getElementById('vjs_video_3_html5_api');
		this.trackList = null;
	}

	setKeypressEventListener() {
		this.moveTrackListener = e => {
			if(e.key == 'k') this.seekToCurrentTrack();
			if(e.key == 'j') this.seekToPrevTrack();
			if(e.key == 'l') this.seekToNextTrack();
		}
		document.addEventListener('keypress', this.moveTrackListener);
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

	async setupVtt(url) {
		if(this.trackList) return;

		const res = await fetch(url);
		if(!res.ok) return;
		const vttText = await res.text();

		const parser = new WebVTT.Parser(window, WebVTT.StringDecoder());
		let cues = [];
		parser.oncue = cue => {
			cues.push(cue);
		}
		parser.parse(vttText);
		parser.flush();

		const head = new LinkNode(cues[0]);
		let last = head;
		for(let i = 1; i < cues.length; i++) {
			const node = new LinkNode(cues[i]);
			if(last) last.next = node;
			node.prev = last;
			last = node;
		}
		this.trackList = new LinkedList(head);
		this.setKeypressEventListener();
	}

	getCurrentCue() {
		if(!this.trackList) return null;
		return this.trackList.search(node => {
			let result = false;
			result = this.video.currentTime >= node.value.startTime;
			if(node.next) {
				result = result && this.video.currentTime < node.next.value.startTime;
			}
			return result;
		})
	}

	seekToPrevTrack() {
		const currentCue = this.getCurrentCue();
		if(!currentCue) return;
		this.seekTo(currentCue.prev.value.startTime);
	}
	
	seekToCurrentTrack() {
		const currentCue = this.getCurrentCue();
		if(!currentCue) return;
		this.seekTo(currentCue.value.startTime);
	}

	seekToNextTrack() {
		const currentCue = this.getCurrentCue();
		if(!currentCue) return;
		this.seekTo(currentCue.next.value.startTime);
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
		syncCtl.sendMessage('getVttLocation');
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

