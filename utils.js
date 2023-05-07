const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

const setStorage = async (key, obj) => {
	// storage.getおよびsetを同期的に処理するためPromiseでラップする
	return new Promise(resolve => {
		chrome.storage.local.get(key, data => {
			let src = data[key];
			const result = deepmerge(src, obj, {arrayMerge: overwriteMerge});
			const toSet = {};
			toSet[key] = result;
			chrome.storage.local.set(toSet, resolve);
		})
	})
}

const clearStorage = async key => {
	return new Promise(resolve => {
		const toSet = {};
		toSet[key] = {};
		chrome.storage.local.set(toSet, resolve);
	})
}


// return (value, error)
const getStorage = async (keys) => {
	return new Promise(resolve => {
		try {
			if(!keys) {
				resolve([undefined, new Error('keys are empty')]);
			}
			chrome.storage.local.get(data => {
				const result = keys.reduce((acc, key) => acc[key], data)
				resolve([result, undefined]);
			})
		} catch(err) {
			resolve([undefined, err]);
		}
	})
}

// The MIT License (MIT)
// Copyright (c) 2016 Emma Kuo
// https://opensource.org/licenses/mit-license.php
//
// await acquire()
// まずtaskが作られる taskはrelease()をもつオブジェクト
// taskがキューに入る
// sched()（キューのポーリング処理）を呼ぶ
// sched()では、資源が1以上あればキューからtaskを取り出してreleaseを返す(aquireをresolveする)
// schedでキューからポーリングされたタイミングで初めてacquireがresolveされる
// 資源が0の場合は、スキップされる
// ユーザーからrelease()が呼ばれると、semaphore++してschedを呼ぶ
// これにより次のキューから次のtaskがポーリングされる
class Semaphore {
	constructor(count) {
		this.tasks = [];
		this.count = count;
	}

	sched() {
		if (this.count > 0 && this.tasks.length > 0) {
			this.count--;
			const next = this.tasks.shift();
			if (next === undefined) {
				throw "Unexpected undefined value in tasks list";
			}

			next();
		}
	}

	acquire() {
		return new Promise(resolve => {
			const task = _ => {
				let released = false;
				resolve(_ => {
					if (!released) {
						released = true;
						this.count++;
						this.sched();
					}
				});
			};
			this.tasks.push(task);
			setTimeout(this.sched.bind(this), 0);
		})
	}
}

class Mutex extends Semaphore {
	constructor() {
		super(1);
	}
}


// dragElement makes elmnt Element draggable.
function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id+'-header')) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id+'-header').onmousedown = dragMouseDown;
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
