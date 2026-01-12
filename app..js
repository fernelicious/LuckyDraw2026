(() => {
	const startBtn = document.getElementById('startBtn');
	const settingsBtn = document.getElementById('settingsBtn');
	const settingsPanel = document.getElementById('settingsPanel');
	const display = document.getElementById('present_number');
	const winnersEl = document.getElementById('winners');
	const resetBtn = document.getElementById('resetBtn');
	const exportBtn = document.getElementById('exportBtn');
	const importBtn = document.getElementById('importBtn');
	const importFile = document.getElementById('importFile');
	const g1El = document.getElementById('group1');
	const g2El = document.getElementById('group2');
	const g3El = document.getElementById('group3');
	const g4El = document.getElementById('group4');
	const totalPrizesEl = document.getElementById('totalPrizes');
	const g1PrizesEl = document.getElementById('g1Prizes');
	const g2PrizesEl = document.getElementById('g2Prizes');
	const g3PrizesEl = document.getElementById('g3Prizes');
	const g4PrizesEl = document.getElementById('g4Prizes');
    const currentPrizeLabel = document.getElementById('currentPrizeLabel');
    const groupPrizesSumEl = document.getElementById('groupPrizesSum');

	let running = false;
	let currentPrize = 112; // next prize to draw
	let pools = null; // in-memory pools so winners are removed across clicks
	let usedNames = new Set(); // track drawn names across sessions
	let hasStarted = false; // whether at least one draw occurred
	let requireReset = false; // if true, user must reset before next draw
	let prizeRanges = {}; // computed {g: {start,end}}

	function parseList(text){
		return text.split('\n').map(s=>s.trim()).filter(Boolean);
	}

	function getGroups(){
		return {
			1: parseList(g1El.value),
			2: parseList(g2El.value),
			3: parseList(g3El.value),
			4: parseList((g4El && g4El.value) || '')
		};
	}

	// validate that sum of per-group prize counts does not exceed total
	function validatePrizeCounts(){
		const total = parseInt(totalPrizesEl && totalPrizesEl.value) || 0;
		const a = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const b = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const c = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const d = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		const sum = a + b + c + d;
		const warn = document.getElementById('prizeCountWarning');
		if(!warn) return true;
		if(total <= 0){
			warn.textContent = 'กรุณาระบุจำนวนรางวัลรวมอย่างน้อย 1';
			warn.style.display = 'block';
			return false;
		}
		if(sum > total){
			warn.textContent = `⚠️ ผลรวม (${sum}) เกินจำนวนทั้งหมด (${total}) โปรดแก้ไข`;
			warn.style.display = 'block';
			return false;
		}
		warn.textContent = '';
		warn.style.display = 'none';
		return true;
	}
	
	function updateGroupPrizesSum(){
		if(!groupPrizesSumEl) return;
		const a = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const b = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const c = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const d = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		const sum = a + b + c + d;
		const total = parseInt(totalPrizesEl && totalPrizesEl.value) || 0;
		groupPrizesSumEl.textContent = `รวมในกลุ่ม: ${sum}`;
		// color green when sum equals total, warning color otherwise
		groupPrizesSumEl.style.color = (total > 0 && sum === total) ? '#007700' : '#b85b00';
	}

	function updateCurrentPrizeLabel(){
		if(!currentPrizeLabel) return;
		currentPrizeLabel.textContent = `รางวัลที่ ${currentPrize}`;
	}

	function calculatePrizeRanges(){
		const total = parseInt(totalPrizesEl && totalPrizesEl.value) || 0;
		const c1 = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const c2 = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const c3 = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const c4 = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		let start = total;
		prizeRanges = {};
		if(c1 > 0){ prizeRanges[1] = {start: start, end: start - c1 + 1}; start -= c1; } else { prizeRanges[1] = {start:0,end:0}; }
		if(c2 > 0){ prizeRanges[2] = {start: start, end: start - c2 + 1}; start -= c2; } else { prizeRanges[2] = {start:0,end:0}; }
		if(c3 > 0){ prizeRanges[3] = {start: start, end: start - c3 + 1}; start -= c3; } else { prizeRanges[3] = {start:0,end:0}; }
		if(c4 > 0){ prizeRanges[4] = {start: start, end: start - c4 + 1}; start -= c4; } else { prizeRanges[4] = {start:0,end:0}; }
	}

	function getGroupForPrize(n){
		// ensure ranges are calculated
		if(!prizeRanges || Object.keys(prizeRanges).length === 0) calculatePrizeRanges();
		for(const g of [1,2,3,4]){
			const r = prizeRanges[g];
			if(r && r.start > 0 && n <= r.start && n >= r.end) return g;
		}
		// fallback: highest group
		return 1;
	}

	function appendWinner(prizeNumber, name){
		const row = document.createElement('div');
		row.textContent = `รางวัล #${prizeNumber}: ${name}`;
		row.style.padding = '6px 0';
		winnersEl.insertBefore(row, winnersEl.firstChild);
		saveWinnersToStorage();
	}

	// Animate draw: fast flashing (optionally from all groups) then slow deceleration
	// - `names`: the pool used to pick the final winner
	// - `flashNames` (optional): array of names to flash during the fast phase (can be union of all groups)
	function animateDraw(names, displayEl, flashNames){
		return new Promise((resolve) => {
			if(!Array.isArray(names) || names.length === 0){
				resolve({index:-1,name:null});
				return;
			}

			const fastPool = (Array.isArray(flashNames) && flashNames.length) ? flashNames : names;

			displayEl.classList.remove('winner');

			const fastInterval = 60;
			const fastTicker = setInterval(()=>{
				displayEl.textContent = fastPool[Math.floor(Math.random()*fastPool.length)];
			}, fastInterval);

			const totalFast = 200 + Math.random()*600; // 0.2 - 0.8s
			setTimeout(()=>{
				clearInterval(fastTicker);

				const steps = 12;
				const winnerIndex = Math.floor(Math.random()*names.length);
				let accumulated = 0;
				for(let i=0;i<steps;i++){
					const delay = Math.floor(20 + Math.pow(i,1.7)*8);
					accumulated += delay;
					setTimeout(((step)=>{
						return ()=>{
							if(step < steps-1){
								displayEl.textContent = names[Math.floor(Math.random()*names.length)];
							} else {
								displayEl.textContent = names[winnerIndex];
								displayEl.classList.add('winner');
								resolve({index:winnerIndex,name:names[winnerIndex]});
							}
						};
					})(i), accumulated);
				}
			}, totalFast);
		});
	}

	// Draw exactly one prize per click; pools are initialized from settings on first draw
	async function drawOnePrize(){
		if(running) return;
		if(requireReset){
			alert('การตั้งค่าถูกแก้ไขหลังจากเริ่มจับรางวัล ต้องกดรีเซ็ตเกมก่อนเริ่มใหม่');
			return;
		}
		// ensure ranges are current before deciding group
		calculatePrizeRanges();
		if(currentPrize < 1){
			alert('จับรางวัลครบแล้ว');
			return;
		}

		if(!pools){
			pools = getGroups();
			// filter out already-used names from pools
			for(const g of [1,2,3,4]){
				if(pools[g]) pools[g] = pools[g].filter(name => !usedNames.has(name.toLowerCase().trim()));
			}
		}

		// if all pools are empty, nothing to draw
		const allEmpty = [1,2,3,4].every(g => !pools[g] || pools[g].length === 0);
		if(allEmpty){
			alert('กรุณาเพิ่มรายชื่อผู้มีสิทธิ์จับรางวัล');
			pools = null;
			return;
		}

		running = true;
		startBtn.disabled = true;
		settingsBtn.disabled = true;

		const prize = currentPrize;
		const grpId = getGroupForPrize(prize);
		console.log('drawOnePrize - prizeRanges=', prizeRanges, 'prize=', prize, 'grpId=', grpId);
		const pool = pools[grpId];
		if(!pool || pool.length === 0){
			console.warn('empty pool for grp', grpId, 'prize', prize, 'pools=', pools && Object.keys(pools).reduce((acc,k)=>{acc[k]=pools[k]&&pools[k].length;return acc;},{}) );
			alert(`ไม่พอชื่อในกลุ่ม ${grpId} สำหรับรางวัล #${prize}.`);
			running = false;
			startBtn.disabled = false;
			settingsBtn.disabled = false;
			return;
		}

		display.textContent = `รางวัล #${prize}`;
		// build a flashing pool (all available names across groups) so fast phase cycles through everyone
		let flashPool = [];
		for(const g of [1,2,3,4]){
			if(pools[g] && pools[g].length) flashPool = flashPool.concat(pools[g]);
		}
		const result = await animateDraw(pool, display, flashPool);
		if(result.index !== -1){
			usedNames.add(result.name.toLowerCase().trim());
			appendWinner(prize, result.name);
			pool.splice(result.index,1);
			// mark that drawing has started (at least one winner drawn)
			hasStarted = true;
		}

		currentPrize -= 1;
		updateCurrentPrizeLabel();

		running = false;
		startBtn.disabled = false;
		settingsBtn.disabled = false;
		if(currentPrize < 1) startBtn.disabled = true;
		savePrizeToStorage();
	}

	const SETTINGS_PASSWORD = 'admin1234';

	const STORAGE_KEY = 'ทองสวย_lottery_groups_v1';
	const WINNERS_STORAGE_KEY = 'ทองสวย_lottery_winners_v1';
	const PRIZE_STORAGE_KEY = 'ทองสวย_lottery_prize_v1';
	const PRIZE_COUNTS_STORAGE_KEY = 'ทองสวย_lottery_counts_v1';

	function saveGroupsToStorage(){
		try{
			const groups = getGroups();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
		}catch(e){
			console.warn('ไม่สามารถบันทึกการตั้งค่าได้', e);
		}
	}

	function loadGroupsFromStorage(){
		try{
			const raw = localStorage.getItem(STORAGE_KEY);
			if(!raw) return false;
			const obj = JSON.parse(raw);
			if(g1El && obj[1]) g1El.value = Array.isArray(obj[1]) ? obj[1].join('\n') : '';
			if(g2El && obj[2]) g2El.value = Array.isArray(obj[2]) ? obj[2].join('\n') : '';
			if(g3El && obj[3]) g3El.value = Array.isArray(obj[3]) ? obj[3].join('\n') : '';
			if(g4El && obj[4]) g4El.value = Array.isArray(obj[4]) ? obj[4].join('\n') : '';
			return true;
		}catch(e){
			console.warn('ไม่สามารถโหลดการตั้งค่าได้', e);
		}
		return false;
	}

	function saveWinnersToStorage(){
		try{
			const winners = [];
			for(const el of winnersEl.children){
				winners.push(el.textContent);
			}
			localStorage.setItem(WINNERS_STORAGE_KEY, JSON.stringify(winners));
		}catch(e){
			console.warn('ไม่สามารถบันทึกผู้ชนะได้', e);
		}
	}

	function loadWinnersFromStorage(){
		try{
			const raw = localStorage.getItem(WINNERS_STORAGE_KEY);
			if(!raw) return false;
			const winners = JSON.parse(raw);
			if(!Array.isArray(winners) || winners.length === 0) return false;
			winnersEl.innerHTML = '';
			usedNames.clear();
			for(const txt of winners){
				const row = document.createElement('div');
				row.textContent = txt;
				row.style.padding = '6px 0';
				winnersEl.appendChild(row);
				// extract name from "รางวัล #123: name" format
				const match = txt.match(/:\s*(.+)$/);
				if(match) usedNames.add(match[1].toLowerCase().trim());
			}
			return true;
		}catch(e){
			console.warn('ไม่สามารถโหลดผู้ชนะได้', e);
		}
		return false;
	}

	function resetGame(){
		currentPrize = parseInt(totalPrizesEl && totalPrizesEl.value) || 112;
		pools = null;
		usedNames.clear();
		winnersEl.innerHTML = '';
		display.textContent = '-';
		display.classList.remove('winner');
		startBtn.disabled = false;
		hasStarted = false;
		requireReset = false;
		const warn = document.getElementById('prizeCountWarning'); if(warn){ warn.textContent=''; warn.style.display='none'; }
		savePrizeToStorage();
		saveWinnersToStorage();
		updateCurrentPrizeLabel();
	}

	function savePrizeToStorage(){
		try{
			localStorage.setItem(PRIZE_STORAGE_KEY, JSON.stringify(currentPrize));
		}catch(e){
			console.warn('ไม่สามารถบันทึกเลขรางวัลได้', e);
		}
	}

	function savePrizeCountsToStorage(){
		try{
			const obj = {
				total: parseInt(totalPrizesEl && totalPrizesEl.value) || 112,
				g1: parseInt(g1PrizesEl && g1PrizesEl.value) || 0,
				g2: parseInt(g2PrizesEl && g2PrizesEl.value) || 0,
				g3: parseInt(g3PrizesEl && g3PrizesEl.value) || 0,
				g4: parseInt(g4PrizesEl && g4PrizesEl.value) || 0
			};
			localStorage.setItem(PRIZE_COUNTS_STORAGE_KEY, JSON.stringify(obj));
		}catch(e){
			console.warn('ไม่สามารถบันทึกการตั้งค่ารางวัลได้', e);
		}
	}

	function loadPrizeCountsFromStorage(){
		try{
			const raw = localStorage.getItem(PRIZE_COUNTS_STORAGE_KEY);
			if(!raw) return false;
			const obj = JSON.parse(raw);
			if(totalPrizesEl && typeof obj.total !== 'undefined') totalPrizesEl.value = obj.total;
			if(g1PrizesEl && typeof obj.g1 !== 'undefined') g1PrizesEl.value = obj.g1;
			if(g2PrizesEl && typeof obj.g2 !== 'undefined') g2PrizesEl.value = obj.g2;
			if(g3PrizesEl && typeof obj.g3 !== 'undefined') g3PrizesEl.value = obj.g3;
			if(g4PrizesEl && typeof obj.g4 !== 'undefined') g4PrizesEl.value = obj.g4;
			return true;
		}catch(e){
			console.warn('ไม่สามารถโหลดการตั้งค่ารางวัลได้', e);
		}
		return false;
	}

	function loadPrizeFromStorage(){
		try{
			const raw = localStorage.getItem(PRIZE_STORAGE_KEY);
			if(raw){
				const prize = JSON.parse(raw);
				if(typeof prize === 'number' && prize >= 0) currentPrize = prize;
			}
		}catch(e){
			console.warn('ไม่สามารถโหลดเลขรางวัลได้', e);
		}
	}
	
		// ensure UI reflects current prize after loading
		function initCurrentPrizeUI(){
			updateCurrentPrizeLabel();
			if(currentPrize < 1) startBtn.disabled = true;
		}

	// required winners per group based on prize ranges
	const REQUIRED = {
		1: (112 - 90 + 1), // 23
		2: (89 - 60 + 1), // 30
		3: (59 - 20 + 1), // 40
		4: (19 - 1 + 1) // 19
	};

	const g1CountEl = document.getElementById('g1Count');
	const g2CountEl = document.getElementById('g2Count');
	const g3CountEl = document.getElementById('g3Count');
	const g4CountEl = document.getElementById('g4Count');

	function updateCounts(){
		const groups = getGroups();
		const c1 = groups[1].length;
		const c2 = groups[2].length;
		const c3 = groups[3].length;
		const c4 = groups[4] ? groups[4].length : 0;
		// required numbers come from prize input settings
		const req1 = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const req2 = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const req3 = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const req4 = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		if(g1CountEl) g1CountEl.textContent = `(${c1} คน / ต้องการ ${req1})`;
		if(g2CountEl) g2CountEl.textContent = `(${c2} คน / ต้องการ ${req2})`;
		if(g3CountEl) g3CountEl.textContent = `(${c3} คน / ต้องการ ${req3})`;
		if(g4CountEl) g4CountEl.textContent = `(${c4} คน / ต้องการ ${req4})`;
		// only turn green when count exactly matches required; otherwise use warning color
		if(g1CountEl) g1CountEl.style.color = c1 === req1 ? '#007700' : '#b85b00';
		if(g2CountEl) g2CountEl.style.color = c2 === req2 ? '#007700' : '#b85b00';
		if(g3CountEl) g3CountEl.style.color = c3 === req3 ? '#007700' : '#b85b00';
		if(g4CountEl) g4CountEl.style.color = c4 === req4 ? '#007700' : '#b85b00';
	}

	// check duplicates across all groups (including repeated within same group)
	let duplicatesExist = false;
	function checkDuplicates(){
		const groups = getGroups();
		const map = Object.create(null);
		for(const g of [1,2,3,4]){
			const list = groups[g]||[];
			for(const name of list){
				const norm = name.replace(/\s+/g,' ').trim().toLowerCase();
				if(!norm) continue;
				if(!map[norm]) map[norm] = {name: name, occ: []};
				map[norm].occ.push(g);
			}
		}
		const dups = Object.keys(map).filter(k=>map[k].occ.length > 1);
		const dupEl = document.getElementById('dupWarning');
		if(dups.length){
			duplicatesExist = true;
			const msgs = dups.map(k => {
				const info = map[k];
				const groupsList = Array.from(new Set(info.occ)).join(',');
				return `${info.name} (กลุ่ม ${groupsList})`;
			});
			if(dupEl) dupEl.textContent = 'พบรายชื่อซ้ำ: ' + msgs.join('; ');
		} else {
			duplicatesExist = false;
			if(dupEl) dupEl.textContent = '';
		}
		return duplicatesExist;
	}

	function showPasswordModal(){
		return new Promise((resolve)=>{
			const modal = document.getElementById('pwdModal');
			const input = document.getElementById('pwdInput');
			const ok = document.getElementById('pwdOk');
			if(!modal || !input || !ok){
				resolve(null);
				return;
			}
			modal.style.display = 'flex';
			input.value = '';
			setTimeout(()=>input.focus(),50);

			function cleanup(){
				ok.removeEventListener('click', onOk);
				input.removeEventListener('keydown', onKey);
				modal.removeEventListener('click', onBackdropClick);
				modal.style.display = 'none';
			}
			function onOk(){
				const v = input.value;
				cleanup();
				resolve(v);
			}
			function onKey(e){
				if(e.key === 'Enter'){
					onOk();
				}
				if(e.key === 'Escape'){
					cleanup();
					resolve(null);
				}
			}
			function onBackdropClick(e){
				if(e.target === modal){
					cleanup();
					resolve(null);
				}
			}
			ok.addEventListener('click', onOk);
			input.addEventListener('keydown', onKey);
			modal.addEventListener('click', onBackdropClick);
		});
	}

	settingsBtn.addEventListener('click', async ()=>{
		// If already open, allow hiding without password
		if(settingsPanel.style.display !== 'none'){
			settingsPanel.style.display = 'none';
			return;
		}
		const pwd = await showPasswordModal();
		if(pwd === SETTINGS_PASSWORD){
			settingsPanel.style.display = 'block';
			updateCounts();
			checkDuplicates();
		} else if(pwd !== null){
			alert('รหัสผ่านไม่ถูกต้อง');
		}
	});

	resetBtn.addEventListener('click', ()=>{
		if(confirm('ยืนยันการเริ่มเกมใหม่ ลบผู้ชนะทั้งหมด?')){
			resetGame();
		}
	});

	// export all saved data to JSON file
	exportBtn.addEventListener('click', ()=>{
		const data = {
			groups: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
			winners: JSON.parse(localStorage.getItem(WINNERS_STORAGE_KEY) || '[]'),
			prize: JSON.parse(localStorage.getItem(PRIZE_STORAGE_KEY) || '112'),
			counts: JSON.parse(localStorage.getItem(PRIZE_COUNTS_STORAGE_KEY) || '{}'),
			exportDate: new Date().toLocaleString('th-TH')
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ทองสวย_${new Date().getTime()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	});

	// import data from JSON file
	importBtn.addEventListener('click', ()=>{
		importFile.click();
	});

	importFile.addEventListener('change', (e)=>{
		const file = e.target.files[0];
		if(!file) return;
		const reader = new FileReader();
		reader.onload = (evt)=>{
			try{
				const data = JSON.parse(evt.target.result);
				if(data.groups) localStorage.setItem(STORAGE_KEY, JSON.stringify(data.groups));
				if(data.winners) localStorage.setItem(WINNERS_STORAGE_KEY, JSON.stringify(data.winners));
				if(typeof data.prize === 'number') localStorage.setItem(PRIZE_STORAGE_KEY, JSON.stringify(data.prize));
				if(data.counts) localStorage.setItem(PRIZE_COUNTS_STORAGE_KEY, JSON.stringify(data.counts));
				alert('นำเข้าข้อมูลสำเร็จ กรุณารีเฟรชหน้าเว็บ');
				// reset UI state and reload
				location.reload();
			}catch(err){
				alert('ไฟล์ JSON ไม่ถูกต้อง: ' + err.message);
			}
		};
		reader.readAsText(file);
	});

	// if settings are edited, reset in-memory pools so changes take effect
	[g1El,g2El,g3El,g4El].forEach(el=>el.addEventListener('input', ()=>{
		// update in-memory pools and prize counter when group names change,
		// but DO NOT clear saved winners automatically (user may edit lists without losing history)
		pools = null;
		currentPrize = parseInt(totalPrizesEl && totalPrizesEl.value) || 112;
		startBtn.disabled = false;
		updateCounts();
		checkDuplicates();
		saveGroupsToStorage();
	}));

	// wire prize inputs to save on change and validate
	if(typeof totalPrizesEl !== 'undefined' && totalPrizesEl){
		[totalPrizesEl, g1PrizesEl, g2PrizesEl, g3PrizesEl, g4PrizesEl].forEach(el=>{
			if(!el) return;
			el.addEventListener('input', ()=>{
				savePrizeCountsToStorage();
				validatePrizeCounts();
				updateGroupPrizesSum();
				// if draws already happened, require reset before next draw
				if(hasStarted){
					requireReset = true;
					startBtn.disabled = true;
					const warn = document.getElementById('prizeCountWarning');
					if(warn){
						warn.textContent = 'การตั้งค่าถูกแก้ไขหลังเริ่มจับรางวัล ต้องกดรีเซ็ตเกมก่อนเริ่มใหม่';
						warn.style.display = 'block';
					}
				}
			});
		});
		// load saved counts if any and compute ranges
		loadPrizeCountsFromStorage();
		calculatePrizeRanges();
		validatePrizeCounts();
		updateGroupPrizesSum();
	}

	// wire prize count inputs to validate in real-time
	if(totalPrizesEl){
		[totalPrizesEl, g1PrizesEl, g2PrizesEl, g3PrizesEl, g4PrizesEl].forEach(el=>{
			if(!el) return;
			el.addEventListener('input', ()=>{
				validatePrizeCounts();
				updateGroupPrizesSum();
			});
		});
		// initial validation
		validatePrizeCounts();
	}

	// load saved groups and winners (if any) and initialize counts
	loadGroupsFromStorage();
	loadPrizeFromStorage();
	initCurrentPrizeUI();
	loadWinnersFromStorage();
	// ensure prize ranges are computed from current inputs
	calculatePrizeRanges();
	updateCounts();
	checkDuplicates();

	startBtn.addEventListener('click', ()=>{
		if(startBtn.disabled) return;
		// validate prize counts before drawing
		if(!validatePrizeCounts()){
			alert('การตั้งค่าจำนวนของขวัญไม่ถูกต้อง: ผลรวมของกลุ่มต้องไม่เกินจำนวนรวม');
			return;
		}
		if(checkDuplicates()){
			alert('พบรายชื่อซ้ำในตั้งค่า กรุณาแก้ไขก่อนจับรางวัล');
			return;
		}
		drawOnePrize();
	});
})();

