let sMutex = new Mutex();

const sleep = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

/*
const rerenderPopup = async log => {
	const release = await sMutex.acquire();
	let [allLogs, err] = await getStorage(['session', 'userLog']);
	if(err != undefined) {
		console.log(err)
		return;
	}
	if(allLogs) {
		allLogs.push(log);
	} else {
		allLogs = [log,];
	}

	// ログにメッセージをappendした後で、popupをrenderしたいのでawaitをつかう
	await setStorage('session', {'userLog': allLogs});
	release();

	chrome.runtime.sendMessage({
		'type': 'FROM_BG',
		'command': 'rerenderView',
	})
}

const appendUserLog = async logs => {
	if(!logs) {
		return;
	}
	const release = await sMutex.acquire();
	let [allLogs, err] = await getStorage(['session', 'userLog']);
	if(err != undefined) {
		console.log(err)
		return;
	}

	// Logの上限はだいたい1000くらいになるようにする
	if (!allLogs) {
		allLogs = logs
	} else if (allLogs.length > 1000) {
		allLogs = allLogs.slice(allLogs.length - 1000 + logs.length);
		allLogs.push(...logs);
	} else {
		allLogs.push(...logs);
	}

	await setStorage('session', {'userLog': allLogs});
	release();

	chrome.runtime.sendMessage({
		'type': 'FROM_BG',
		'command': 'appendLog',
		'data': {
			'logs': logs,
		},
	})
}
*/

const AnchorPoint = class {
	constructor(masterTabId, masterPosition, slaveTabId, slavePosition) {
		this.master = {
			tabId: masterTabId,
			position: masterPosition,
		}
		this.slave = {
			tabId: slaveTabId,
			position: slavePosition,
		}
	}
}

const seekSlave = async (masterPosition, anchorPoint) => {
	const slavePosition = anchorPoint.slave.position + masterPosition - anchorPoint.master.position;
	const slaveTabId = anchorPoint.slave.tabId;
	chrome.tabs.executeScript(
		slaveTabId,
		{code: `syncCtl.sync(${slavePosition})`}
	);
}

const sync = async anchorPoint => {
	const masterTabId = anchorPoint.master.tabId;
	chrome.tabs.executeScript(
		masterTabId,
		{code: 'syncCtl.responsePosition();'}
	);
	const receiveResponseFromMaster = msg => {
		chrome.runtime.onMessage.removeListener(receiveResponseFromMaster);
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'responsePosition') {
				const masterPosition = msg.data.position;
				seekSlave(masterPosition, anchorPoint);
				return;
			}
		}
	}
	chrome.runtime.onMessage.addListener(receiveResponseFromMaster);
}


chrome.runtime.onInstalled.addListener(function() {
	// extension読込時はstorageをクリア
	clearStorage('session');

	/*
	chrome.webRequest.onBeforeRequest.addListener(
		detail => {
			console.log("Redirect: " + detail.url)
			return {
				redirectUrl: "https://us-central1-streamsync-307115.cloudfunctions.net/GeoCheck"
			}
		},
		{urls: ["https://geo-service.prd.funimationsvc.com/geo/v1/region/check"]},
		["blocking"]
	)
	*/

	chrome.runtime.onMessage.addListener(async (msg, sender) => {
		if(msg.type == 'FROM_PAGE') {
			if(msg.command == 'responsePosition') {
				const masterPosition = msg.data.position;
				// seekSlave(masterPosition);
				return;
			}
			if(msg.command == 'getVttLocation') {
				const callback = detail => {
					chrome.webRequest.onCompleted.removeListener(callback);
					if(detail.tabId == sender.tab.id) {
						chrome.tabs.executeScript(
							sender.tab.id,
							{code: `syncCtl.setupVtt('${detail.url}');`}
						)
					}
				}
				const filter = {
					urls: ['https://*/*.vtt']
				}
				chrome.webRequest.onCompleted.addListener(callback, filter);
				return;
			}
		}
		if(msg.type == 'FROM_ACTION') {
			if(msg.command == 'sync') {
				const a = new AnchorPoint(
					msg.data.masterTabId,
					msg.data.masterAnchorPoint,
					msg.data.slaveTabId,
					msg.data.slaveAnchorPoint
				);
				sync(a);
				return;
			}
			if (msg.command == 'captureRequest') {
				const tabId = msg.data.tabId;
				chrome.tabs.executeScript(
					tabId,
					{code: `syncCtl.sendPlaybackPosition();`},
				)
			}
		}
	})
});

