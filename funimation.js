function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id)) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id).onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

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

	setupTracksBox() {
		const boxDiv = document.createElement('div');
		boxDiv.id = 'rvs-tracks-box';
		boxDiv.classList.add('visible');
		for(let cur = this.trackList.head; cur; cur = cur.next) {
			const row = document.createElement('div');
			row.innerText = cur.value.text;
			row.id = 'track-row-' + cur.value.id;
			row.classList.add('track-row')
			boxDiv.appendChild(row);
		}
		dragElement(boxDiv);
		document.body.appendChild(boxDiv);
		this.traceTrack();
	}

	async traceTrack() {
		setInterval(_ => {
			for(const row of document.querySelectorAll('.track-row.current-track-row')) {
				row.classList.remove('current-track-row');
			}

			const currentCue = this.getCurrentCue();
			if (!currentCue) return;
			const row = document.getElementById('track-row-' + currentCue.value.id);
			if (row) row.classList.add('current-track-row');

			const trackBox = document.getElementById('rvs-tracks-box');
			const doScroll = true;
			if (doScroll) {
				const relativeTop = row.getBoundingClientRect().top - trackBox.firstChild.getBoundingClientRect().top;
				const topMargin = 16;
				const scrollTopTo= relativeTop + topMargin - (trackBox.clientHeight/3);
				if (Math.abs(scrollTopTo - trackBox.scrollTop) > trackBox.clientHeight) {
					trackBox.scrollTop = scrollTopTo;
				} else {
					trackBox.scroll({
						top: scrollTopTo,
						behavior: 'smooth',
					})
				}
			}
		}, 100);
	}

	toggleTracksBox() {
		document.getElementById('rvs-tracks-box').classList.toggle('visible');
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

		this.vttUrl = url;
		console.log(url);

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
		head.value.id = 0;
		let last = head;
		for(let i = 1; i < cues.length; i++) {
			const node = new LinkNode(cues[i]);
			node.value.id = i;
			if(last) last.next = node;
			node.prev = last;
			last = node;
		}
		this.trackList = new LinkedList(head);
		this.setKeypressEventListener();
		this.setupTracksBox();
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
			clearInterval(wait);
			initializeSyncCtl();
		}
	}, 100);
	setTimeout(_ => {
		clearInterval(wait);
	}, 60000);
}

