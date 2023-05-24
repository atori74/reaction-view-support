window.onload = _ => {
	renderPopup();

}

const renderPopup = async _ => {
	const tabs = await getAllTabs();
	const selections = document.getElementsByClassName('tab-select');

	let [lastSetData, err] = await getStorage(['session', 'lastSetData']);

	for (let selection of selections) {
		tabs.forEach(tab => {
			const option = document.createElement('option');
			option.value = tab.id;
			option.innerText = tab.title;
			if(lastSetData && selection.name == 'master-tab' && lastSetData.masterTabId == tab.id) {
				option.selected = true;
			}
			if(lastSetData && selection.name == 'follower-tab' && lastSetData.followerTabId == tab.id) {
				option.selected = true;
			}
			selection.appendChild(option);
		})
	}

	if (lastSetData) {
		document.getElementById('master-anchor-point-input').value = lastSetData.masterAnchorPoint;
		document.getElementById('follower-anchor-point-input').value = lastSetData.followerAnchorPoint;
	}

	const captureButtons = document.getElementsByClassName('capture-button')
	for (let b of captureButtons) {
		b.onclick = _ => {
			requestCapturePosition(b.name);
		}
	}

	document.getElementById('sync').onclick = elem => {
		sync();
	}

	document.getElementById('toggle-tracks-box').onclick = elem => {
		toggleTracksBox();
	}
}


const requestCapturePosition = buttonName => {
	console.log('caputre')
	console.log(buttonName)
	let tabId;
	if (buttonName == 'master-capture') {
		const masterTabOption = document.getElementById('master-tab-select');
		tabId = Number(masterTabOption.options[masterTabOption.selectedIndex].value);
	} else if (buttonName == 'follower-capture') {
		const followerTabOption = document.getElementById('follower-tab-select');
		tabId = Number(followerTabOption.options[followerTabOption.selectedIndex].value);
	} else {
		return;
	}

	chrome.runtime.sendMessage({
		type: 'FROM_ACTION',
		command: 'captureRequest',
		data: {
			tabId: tabId,
		}
	})

	const handlePlaybackPosition = msg => {
		if (msg.type != 'FROM_PAGE' || msg.command != 'playbackPosition') {
			return;
		}
		chrome.runtime.onMessage.removeListener(handlePlaybackPosition);

		const position = msg.data.position;
		if (buttonName == 'master-capture') {
			document.getElementById('master-anchor-point-input').value = position;
		} else if (buttonName == 'follower-capture') {
			document.getElementById('follower-anchor-point-input').value = position;
		} 
	}
	chrome.runtime.onMessage.addListener(handlePlaybackPosition);
	setTimeout(_ => {
		chrome.runtime.onMessage.removeListener(handlePlaybackPosition);
	}, 5000);
}


const sync = _ => {
	const masterAnchorPoint = Number(document.getElementById('master-anchor-point-input').value);
	const masterSelectedOption = document.getElementById('master-tab-select');
	const masterTabId = Number(masterSelectedOption.options[masterSelectedOption.selectedIndex].value);

	const followerAnchorPoint = Number(document.getElementById('follower-anchor-point-input').value);
	const followerSelectedOption = document.getElementById('follower-tab-select');
	const followerTabId = Number(followerSelectedOption.options[followerSelectedOption.selectedIndex].value);

	if (masterAnchorPoint == null || masterTabId == null || followerAnchorPoint == null || followerTabId == null ) {
		console.log('Some inputs might be lack')
		return;
	}

	setStorage('session', {
		'lastSetData': {
			'masterTabId': masterTabId,
			'masterAnchorPoint': masterAnchorPoint,
			'followerTabId': followerTabId,
			'followerAnchorPoint': followerAnchorPoint,
		}
	})

	console.log({
		'type': 'FROM_ACTION',
		'command': 'sync',
		'data': {
			'masterTabId': masterTabId,
			'masterAnchorPoint': masterAnchorPoint,
			'followerTabId': followerTabId,
			'followerAnchorPoint': followerAnchorPoint,
		},
	})

	chrome.runtime.sendMessage({
		'type': 'FROM_ACTION',
		'command': 'sync',
		'data': {
			'masterTabId': masterTabId,
			'masterAnchorPoint': masterAnchorPoint,
			'followerTabId': followerTabId,
			'followerAnchorPoint': followerAnchorPoint,
		},
	})

}

const toggleTracksBox = _ => {
	chrome.runtime.sendMessage({
		'type': 'FROM_ACTION',
		'command': 'toggleTracksBox',
	})
}

const getAllTabs = async _ => new Promise(resolve => {
	chrome.tabs.query({}, tabs => {
		resolve(tabs);
	})
})

