(() => {
	const startBtn = document.getElementById('startBtn');
	const settingsBtn = document.getElementById('settingsBtn');
	const settingsPanel = document.getElementById('settingsPanel');
	const display = document.getElementById('present_number');
	const winnersEl = document.getElementById('winners');
	const resetBtn = document.getElementById('resetBtn');
	const resetBtnExternal = document.getElementById('resetBtnExternal');
	const exportBtn = document.getElementById('exportBtn');
	const exportWinnersBtn = document.getElementById('exportWinnersBtn');
	const importBtn = document.getElementById('importBtn');
	const importBtnExternal = document.getElementById('importBtnExternal');
	const importFile = document.getElementById('importFile');
	const g1El = document.getElementById('group1');
	const g2El = document.getElementById('group2');
	const g3El = document.getElementById('group3');
	const g4El = document.getElementById('group4');
	const totalPrizesEl = null;
	const g1PrizesEl = document.getElementById('g1Prizes');
	const g2PrizesEl = document.getElementById('g2Prizes');
	const g3PrizesEl = document.getElementById('g3Prizes');
	const g4PrizesEl = document.getElementById('g4Prizes');
	const g5PrizesEl = document.getElementById('g5Prizes');
	const g6PrizesEl = document.getElementById('g6Prizes');
	const g7PrizesEl = document.getElementById('g7Prizes');
	const g8PrizesEl = document.getElementById('g8Prizes');
	const g9PrizesEl = document.getElementById('g9Prizes');
	const g10PrizesEl = document.getElementById('g10Prizes');
	const g1PoolEl = document.getElementById('g1Pool');
	const g2PoolEl = document.getElementById('g2Pool');
	const g3PoolEl = document.getElementById('g3Pool');
	const g4PoolEl = document.getElementById('g4Pool');
	const g5PoolEl = document.getElementById('g5Pool');
	const g6PoolEl = document.getElementById('g6Pool');
	const g7PoolEl = document.getElementById('g7Pool');
	const g8PoolEl = document.getElementById('g8Pool');
	const g9PoolEl = document.getElementById('g9Pool');
	const g10PoolEl = document.getElementById('g10Pool');
    const currentPrizeLabel = document.getElementById('currentPrizeLabel');
    const groupPrizesSumEl = document.getElementById('groupPrizesSum');
	const totalCountEl = document.getElementById('totalCount');

	let running = false;
	let currentPrize = 0; // next prize to draw (will be calculated from prize counts)
	let pools = null; // in-memory pools so winners are removed across clicks
	let usedNames = new Set(); // track drawn names across sessions
	let hasStarted = false; // whether at least one draw occurred
	let requireReset = false; // if true, user must reset before next draw
	let prizeRanges = {}; // computed {g: {start,end}}
	let namePoolMapping = {}; // maps prize group (1-10) to name pool group (1-4)

	// Get which name pool(s) to use for a given prize group
	function getPoolsForPrizeGroup(prizeGroup){
		const poolEls = [null, g1PoolEl, g2PoolEl, g3PoolEl, g4PoolEl, g5PoolEl, g6PoolEl, g7PoolEl, g8PoolEl, g9PoolEl, g10PoolEl];
		const el = poolEls[prizeGroup];
		if(!el) return [1]; // default: group 1 (d)
		const val = el.value;
		return [parseInt(val)];
	}

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
		const a = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const b = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const c = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const d = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		const e = parseInt(g5PrizesEl && g5PrizesEl.value) || 0;
		const f = parseInt(g6PrizesEl && g6PrizesEl.value) || 0;
		const g = parseInt(g7PrizesEl && g7PrizesEl.value) || 0;
		const h = parseInt(g8PrizesEl && g8PrizesEl.value) || 0;
		const i = parseInt(g9PrizesEl && g9PrizesEl.value) || 0;
		const j = parseInt(g10PrizesEl && g10PrizesEl.value) || 0;
		const sum = a + b + c + d + e + f + g + h + i + j;
		const warn = document.getElementById('prizeCountWarning');
		if(!warn) return true;
		if(sum <= 0){
			warn.textContent = 'กรุณาระบุจำนวนของขวัญอย่างน้อย 1 กลุ่ม';
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
		const e = parseInt(g5PrizesEl && g5PrizesEl.value) || 0;
		const f = parseInt(g6PrizesEl && g6PrizesEl.value) || 0;
		const g = parseInt(g7PrizesEl && g7PrizesEl.value) || 0;
		const h = parseInt(g8PrizesEl && g8PrizesEl.value) || 0;
		const i = parseInt(g9PrizesEl && g9PrizesEl.value) || 0;
		const j = parseInt(g10PrizesEl && g10PrizesEl.value) || 0;
		const sum = a + b + c + d + e + f + g + h + i + j;
		groupPrizesSumEl.textContent = `รวมของขวัญ: ${sum}`;
		groupPrizesSumEl.style.color = '#007700';
	}

	function updateCurrentPrizeLabel(){
		if(!currentPrizeLabel) return;
		currentPrizeLabel.textContent = `รางวัลที่ ${currentPrize}`;
	}

	function calculatePrizeRanges(){
		const c1 = parseInt(g1PrizesEl && g1PrizesEl.value) || 0;
		const c2 = parseInt(g2PrizesEl && g2PrizesEl.value) || 0;
		const c3 = parseInt(g3PrizesEl && g3PrizesEl.value) || 0;
		const c4 = parseInt(g4PrizesEl && g4PrizesEl.value) || 0;
		const c5 = parseInt(g5PrizesEl && g5PrizesEl.value) || 0;
		const c6 = parseInt(g6PrizesEl && g6PrizesEl.value) || 0;
		const c7 = parseInt(g7PrizesEl && g7PrizesEl.value) || 0;
		const c8 = parseInt(g8PrizesEl && g8PrizesEl.value) || 0;
		const c9 = parseInt(g9PrizesEl && g9PrizesEl.value) || 0;
		const c10 = parseInt(g10PrizesEl && g10PrizesEl.value) || 0;
		const total = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9 + c10;
		let start = total;
		prizeRanges = {};
		if(c1 > 0){ prizeRanges[1] = {start: start, end: start - c1 + 1}; start -= c1; } else { prizeRanges[1] = {start:0,end:0}; }
		if(c2 > 0){ prizeRanges[2] = {start: start, end: start - c2 + 1}; start -= c2; } else { prizeRanges[2] = {start:0,end:0}; }
		if(c3 > 0){ prizeRanges[3] = {start: start, end: start - c3 + 1}; start -= c3; } else { prizeRanges[3] = {start:0,end:0}; }
		if(c4 > 0){ prizeRanges[4] = {start: start, end: start - c4 + 1}; start -= c4; } else { prizeRanges[4] = {start:0,end:0}; }
		if(c5 > 0){ prizeRanges[5] = {start: start, end: start - c5 + 1}; start -= c5; } else { prizeRanges[5] = {start:0,end:0}; }
		if(c6 > 0){ prizeRanges[6] = {start: start, end: start - c6 + 1}; start -= c6; } else { prizeRanges[6] = {start:0,end:0}; }
		if(c7 > 0){ prizeRanges[7] = {start: start, end: start - c7 + 1}; start -= c7; } else { prizeRanges[7] = {start:0,end:0}; }
		if(c8 > 0){ prizeRanges[8] = {start: start, end: start - c8 + 1}; start -= c8; } else { prizeRanges[8] = {start:0,end:0}; }
		if(c9 > 0){ prizeRanges[9] = {start: start, end: start - c9 + 1}; start -= c9; } else { prizeRanges[9] = {start:0,end:0}; }
		if(c10 > 0){ prizeRanges[10] = {start: start, end: start - c10 + 1}; start -= c10; } else { prizeRanges[10] = {start:0,end:0}; }
	}

	function getGroupForPrize(n){
		// ensure ranges are calculated
		if(!prizeRanges || Object.keys(prizeRanges).length === 0) calculatePrizeRanges();
		for(const g of [1,2,3,4,5,6,7,8,9,10]){
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

		const prize = currentPrize;
		const prizeGroup = getGroupForPrize(prize);
		
		// Get which name pools to use for this prize group
		const allowedPools = getPoolsForPrizeGroup(prizeGroup);
		
		// Create combined pool from allowed name groups only
		let combinedPool = [];
		for(const g of allowedPools){
			if(pools[g] && pools[g].length) {
				combinedPool = combinedPool.concat(pools[g].map(name => ({name, group: g})));
			}
		}

		if(combinedPool.length === 0){
			const poolNames = allowedPools.map(p => ['กลุ่ม d','กลุ่ม c','กลุ่ม b','แกลุ่ม a'][p-1]).join(', ');
			alert(`ไม่มีรายชื่อใน ${poolNames} สำหรับของขวัญกลุ่ม${prizeGroup} รางวัล #${prize}`);
			pools = null;
			return;
		}

		running = true;
		startBtn.disabled = true;
		settingsBtn.disabled = true;

		console.log('drawOnePrize - prizeRanges=', prizeRanges, 'prize=', prize, 'prizeGroup=', prizeGroup, 'allowedPools=', allowedPools);

		display.textContent = `รางวัล #${prize}`;
		
		// Create flash pool from ALL name groups for animation display
		let allNamesFlash = [];
		for(const g of [1,2,3,4]){
			if(pools[g] && pools[g].length) {
				allNamesFlash = allNamesFlash.concat(pools[g]);
			}
		}
		
		// Use combined pool for actual drawing
		const nameList = combinedPool.map(item => item.name);
		const result = await animateDraw(nameList, display, allNamesFlash);
		
		if(result.index !== -1){
			const winnerName = result.name;
			const winnerItem = combinedPool[result.index];
			usedNames.add(winnerName.toLowerCase().trim());
			appendWinner(prize, winnerName);
			
			// Remove from original pool
			const nameGroup = winnerItem.group;
			const idx = pools[nameGroup].indexOf(winnerName);
			if(idx !== -1) pools[nameGroup].splice(idx, 1);
			
			// mark that drawing has started (at least one winner drawn)
			hasStarted = true;
		}

		currentPrize -= 1;

		running = false;
		startBtn.disabled = false;
		settingsBtn.disabled = false;
		if(currentPrize < 1) startBtn.disabled = true;
		
		// Alert when 10 prizes remain (after drawing prize #11)
		if(currentPrize === 10){
			setTimeout(() => {
				alert('เหลืออีก 10 รางวัลสุดท้าย');
			}, 500);
		}
		
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
		const total = (parseInt(g1PrizesEl && g1PrizesEl.value) || 0) + 
		              (parseInt(g2PrizesEl && g2PrizesEl.value) || 0) + 
		              (parseInt(g3PrizesEl && g3PrizesEl.value) || 0) + 
		              (parseInt(g4PrizesEl && g4PrizesEl.value) || 0) +
		              (parseInt(g5PrizesEl && g5PrizesEl.value) || 0) +
		              (parseInt(g6PrizesEl && g6PrizesEl.value) || 0) +
		              (parseInt(g7PrizesEl && g7PrizesEl.value) || 0) +
		              (parseInt(g8PrizesEl && g8PrizesEl.value) || 0) +
		              (parseInt(g9PrizesEl && g9PrizesEl.value) || 0) +
		              (parseInt(g10PrizesEl && g10PrizesEl.value) || 0);
		currentPrize = total;
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
				g1: parseInt(g1PrizesEl && g1PrizesEl.value) || 0,
				g2: parseInt(g2PrizesEl && g2PrizesEl.value) || 0,
				g3: parseInt(g3PrizesEl && g3PrizesEl.value) || 0,
				g4: parseInt(g4PrizesEl && g4PrizesEl.value) || 0,
				g5: parseInt(g5PrizesEl && g5PrizesEl.value) || 0,
				g6: parseInt(g6PrizesEl && g6PrizesEl.value) || 0,
				g7: parseInt(g7PrizesEl && g7PrizesEl.value) || 0,
				g8: parseInt(g8PrizesEl && g8PrizesEl.value) || 0,
				g9: parseInt(g9PrizesEl && g9PrizesEl.value) || 0,
				g10: parseInt(g10PrizesEl && g10PrizesEl.value) || 0,
				g1Pool: g1PoolEl && g1PoolEl.value,
				g2Pool: g2PoolEl && g2PoolEl.value,
				g3Pool: g3PoolEl && g3PoolEl.value,
				g4Pool: g4PoolEl && g4PoolEl.value,
				g5Pool: g5PoolEl && g5PoolEl.value,
				g6Pool: g6PoolEl && g6PoolEl.value,
				g7Pool: g7PoolEl && g7PoolEl.value,
				g8Pool: g8PoolEl && g8PoolEl.value,
				g9Pool: g9PoolEl && g9PoolEl.value,
				g10Pool: g10PoolEl && g10PoolEl.value
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
			if(g1PrizesEl && typeof obj.g1 !== 'undefined') g1PrizesEl.value = obj.g1;
			if(g2PrizesEl && typeof obj.g2 !== 'undefined') g2PrizesEl.value = obj.g2;
			if(g3PrizesEl && typeof obj.g3 !== 'undefined') g3PrizesEl.value = obj.g3;
			if(g4PrizesEl && typeof obj.g4 !== 'undefined') g4PrizesEl.value = obj.g4;
			if(g5PrizesEl && typeof obj.g5 !== 'undefined') g5PrizesEl.value = obj.g5;
			if(g6PrizesEl && typeof obj.g6 !== 'undefined') g6PrizesEl.value = obj.g6;
			if(g7PrizesEl && typeof obj.g7 !== 'undefined') g7PrizesEl.value = obj.g7;
			if(g8PrizesEl && typeof obj.g8 !== 'undefined') g8PrizesEl.value = obj.g8;
			if(g9PrizesEl && typeof obj.g9 !== 'undefined') g9PrizesEl.value = obj.g9;
			if(g10PrizesEl && typeof obj.g10 !== 'undefined') g10PrizesEl.value = obj.g10;
			if(g1PoolEl && obj.g1Pool) g1PoolEl.value = obj.g1Pool;
			if(g2PoolEl && obj.g2Pool) g2PoolEl.value = obj.g2Pool;
			if(g3PoolEl && obj.g3Pool) g3PoolEl.value = obj.g3Pool;
			if(g4PoolEl && obj.g4Pool) g4PoolEl.value = obj.g4Pool;
			if(g5PoolEl && obj.g5Pool) g5PoolEl.value = obj.g5Pool;
			if(g6PoolEl && obj.g6Pool) g6PoolEl.value = obj.g6Pool;
			if(g7PoolEl && obj.g7Pool) g7PoolEl.value = obj.g7Pool;
			if(g8PoolEl && obj.g8Pool) g8PoolEl.value = obj.g8Pool;
			if(g9PoolEl && obj.g9Pool) g9PoolEl.value = obj.g9Pool;
			if(g10PoolEl && obj.g10Pool) g10PoolEl.value = obj.g10Pool;
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

	function updateCounts(){
		const groups = getGroups();
		const c1 = groups[1].length;
		const c2 = groups[2].length;
		const c3 = groups[3].length;
		const c4 = groups[4] ? groups[4].length : 0;
		const totalPeople = c1 + c2 + c3 + c4;
		
		// Calculate required prizes for each name group
		const prizeInputs = [g1PrizesEl, g2PrizesEl, g3PrizesEl, g4PrizesEl, g5PrizesEl, g6PrizesEl, g7PrizesEl, g8PrizesEl, g9PrizesEl, g10PrizesEl];
		const poolSelects = [g1PoolEl, g2PoolEl, g3PoolEl, g4PoolEl, g5PoolEl, g6PoolEl, g7PoolEl, g8PoolEl, g9PoolEl, g10PoolEl];
		
		// Count required prizes for each name group (1=d, 2=c, 3=b, 4=a)
		const required = {1: 0, 2: 0, 3: 0, 4: 0};
		for(let i = 0; i < prizeInputs.length; i++){
			const prizeCount = parseInt(prizeInputs[i] && prizeInputs[i].value) || 0;
			const poolValue = poolSelects[i] && poolSelects[i].value;
			if(poolValue && prizeCount > 0){
				const poolNum = parseInt(poolValue);
				if(required[poolNum] !== undefined){
					required[poolNum] += prizeCount;
				}
			}
		}
		
		// calculate total prizes
		const totalPrizes = required[1] + required[2] + required[3] + required[4];
		
		// Update total count
		if(totalCountEl) {
			totalCountEl.textContent = `(${totalPeople} คน / ต้องการ ${totalPrizes})`;
			totalCountEl.style.color = totalPeople >= totalPrizes ? '#007700' : '#b85b00';
		}
		
		// Update individual group counts
		const gd1CountEl = document.getElementById('gd1Count');
		const gc2CountEl = document.getElementById('gc2Count');
		const gb3CountEl = document.getElementById('gb3Count');
		const ga4CountEl = document.getElementById('ga4Count');
		
		if(gd1CountEl) {
			gd1CountEl.textContent = `(${c1} คน / ต้องการ ${required[1]})`;
			gd1CountEl.style.color = c1 >= required[1] ? '#007700' : '#b85b00';
		}
		if(gc2CountEl) {
			gc2CountEl.textContent = `(${c2} คน / ต้องการ ${required[2]})`;
			gc2CountEl.style.color = c2 >= required[2] ? '#007700' : '#b85b00';
		}
		if(gb3CountEl) {
			gb3CountEl.textContent = `(${c3} คน / ต้องการ ${required[3]})`;
			gb3CountEl.style.color = c3 >= required[3] ? '#007700' : '#b85b00';
		}
		if(ga4CountEl) {
			ga4CountEl.textContent = `(${c4} คน / ต้องการ ${required[4]})`;
			ga4CountEl.style.color = c4 >= required[4] ? '#007700' : '#b85b00';
		}
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

	function showPasswordModal(title = 'เข้าสู่การตั้งค่า'){
		return new Promise((resolve)=>{
			const modal = document.getElementById('pwdModal');
			const input = document.getElementById('pwdInput');
			const ok = document.getElementById('pwdOk');
			const titleEl = modal && modal.querySelector('h4');
			if(!modal || !input || !ok){
				resolve(null);
				return;
			}
			if(titleEl) titleEl.textContent = title;
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
		const pwd = await showPasswordModal('แก้ไขรายชื่อผู้มีสิทธิ์ได้รับรางวัล');
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

	// external reset button with password protection
	if(resetBtnExternal){
		resetBtnExternal.addEventListener('click', async ()=>{
			const pwd = await showPasswordModal('ยืนยันรีเซ็ตรายชื่อผู้ได้รับรางวัล');
			if(pwd === SETTINGS_PASSWORD){
				if(confirm('ยืนยันการเริ่มเกมใหม่ ลบผู้ชนะทั้งหมด?')){
					resetGame();
				}
			} else if(pwd !== null){
				alert('รหัสผ่านไม่ถูกต้อง');
			}
		});
	}

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

	// export winners only to Excel (CSV format)
	if(exportWinnersBtn){
		exportWinnersBtn.addEventListener('click', ()=>{
			const winners = JSON.parse(localStorage.getItem(WINNERS_STORAGE_KEY) || '[]');
			if(winners.length === 0){
				alert('ยังไม่มีรายชื่อผู้ได้รับรางวัล');
				return;
			}
			
			// Create CSV content with UTF-8 BOM for Excel compatibility
			const exportDate = new Date().toLocaleString('th-TH');
			let csvContent = '\uFEFF'; // UTF-8 BOM
			csvContent += `รายชื่อผู้ได้รับรางวัล ทองสวย 2026\n`;
			csvContent += `วันที่ส่งออก: ${exportDate}\n`;
			csvContent += `จำนวนผู้ชนะทั้งหมด: ${winners.length} คน\n`;
			csvContent += `\n`;
			csvContent += `ลำดับ,รางวัล,ชื่อผู้ชนะ\n`;
			
			// Parse winners and add to CSV
			winners.forEach((winner, index) => {
				// Extract prize number and name from format "รางวัล #123: ชื่อ"
				const match = winner.match(/รางวัล #(\d+):\s*(.+)$/);
				if(match){
					const prizeNum = match[1];
					const name = match[2];
					csvContent += `${index + 1},รางวัล #${prizeNum},"${name}"\n`;
				} else {
					csvContent += `${index + 1},-,"${winner}"\n`;
				}
			});
			
			// Create and download CSV file
			const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `ทองสวย_ผู้ชนะ_${new Date().toISOString().slice(0,10)}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	// import data from JSON file
	importBtn.addEventListener('click', ()=>{
		importFile.click();
	});

	// external import button (outside settings panel)
	if(importBtnExternal){
		importBtnExternal.addEventListener('click', ()=>{
			importFile.click();
		});
	}

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
		const total = (parseInt(g1PrizesEl && g1PrizesEl.value) || 0) + 
		              (parseInt(g2PrizesEl && g2PrizesEl.value) || 0) + 
		              (parseInt(g3PrizesEl && g3PrizesEl.value) || 0) + 
		              (parseInt(g4PrizesEl && g4PrizesEl.value) || 0) +
		              (parseInt(g5PrizesEl && g5PrizesEl.value) || 0) +
		              (parseInt(g6PrizesEl && g6PrizesEl.value) || 0) +
		              (parseInt(g7PrizesEl && g7PrizesEl.value) || 0) +
		              (parseInt(g8PrizesEl && g8PrizesEl.value) || 0) +
		              (parseInt(g9PrizesEl && g9PrizesEl.value) || 0) +
		              (parseInt(g10PrizesEl && g10PrizesEl.value) || 0);
		currentPrize = total;
		startBtn.disabled = false;
		updateCounts();
		checkDuplicates();
		saveGroupsToStorage();
	}));

	// wire prize inputs to save on change and validate
	if(g1PrizesEl){
		const allPrizeInputs = [g1PrizesEl, g2PrizesEl, g3PrizesEl, g4PrizesEl, g5PrizesEl, g6PrizesEl, g7PrizesEl, g8PrizesEl, g9PrizesEl, g10PrizesEl];
		const allPoolSelects = [g1PoolEl, g2PoolEl, g3PoolEl, g4PoolEl, g5PoolEl, g6PoolEl, g7PoolEl, g8PoolEl, g9PoolEl, g10PoolEl];
		
		allPrizeInputs.forEach(el=>{
			if(!el) return;
			el.addEventListener('input', ()=>{
				savePrizeCountsToStorage();
				validatePrizeCounts();
				updateGroupPrizesSum();
				updateCounts();
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
		
		// Add listeners for pool selectors
		allPoolSelects.forEach(el=>{
			if(!el) return;
			el.addEventListener('change', ()=>{
				savePrizeCountsToStorage();
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
		// update label to show prize that will be drawn
		updateCurrentPrizeLabel();
		drawOnePrize();
	});

// View remaining names with alert
	const viewRemainingBtn = document.getElementById('viewRemainingBtn');

	if(viewRemainingBtn){
		viewRemainingBtn.addEventListener('click', () => {
			// Get current groups
			const groups = getGroups();
			
			// Collect all remaining names from all groups
			let allRemaining = [];
			for(const g of [1, 2, 3, 4]){
				if(groups[g]){
					const filtered = groups[g].filter(name => !usedNames.has(name.toLowerCase().trim()));
					allRemaining = allRemaining.concat(filtered);
				}
			}

			if(allRemaining.length === 0){
				alert('ไม่มีรายชื่อที่เหลือ (จับครบทุกคนแล้ว)');
			} else {
				let text = 'รายชื่อที่ยังไม่ถูกสุ่ม\n';
				text += `รวมทั้งหมด ${allRemaining.length} คน\n\n`;
				allRemaining.forEach((name) => {
					text += `${name}\n`;
				});
				alert(text);
			}
		});
	}
})();
