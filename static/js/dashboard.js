Chart.register(ChartDataLabels);

document.getElementById('startDate').valueAsDate = new Date();
document.getElementById('endDate').valueAsDate = new Date();

let currentPlatform = 'all';
let currentView = 'dashboard';
let activeCharts = [];
let overallChartInstance = null;

// Vibrant Pastel Colors Configuration (Adjusted)
const COLORS = {
	pos: { bg: '#66bb6a', border: '#4caf50', hover: '#43a047' }, // Green 400 - สดขึ้น
	neg: { bg: '#ef5350', border: '#e53935', hover: '#e53935' }, // Red 400 - สดขึ้น
	neu: { bg: '#ffa726', border: '#fb8c00', hover: '#fb8c00' }, // Orange 400 - สดขึ้น
	nm: { bg: '#bdbdbd', border: '#9e9e9e', hover: '#757575' }  // Grey
};

// --- SERVICE LAYER ---
const SentimentService = {
	_db: {
		"youtube": {
			name: "YouTube",
			aspects: {
				"Taste": { pos: 800, neg: 50, neu: 150, nm: 0 },
				"Price": { pos: 200, neg: 100, neu: 50, nm: 0 },
				"Service": { pos: 300, neg: 80, neu: 100, nm: 0 },
				"Atmosphere": { pos: 250, neg: 20, neu: 80, nm: 0 },
				"Accessibility": { pos: 50, neg: 10, neu: 20, nm: 0 }
			}
		},
		"tiktok": {
			name: "TikTok",
			aspects: {
				"Taste": { pos: 1200, neg: 100, neu: 200, nm: 0 },
				"Price": { pos: 400, neg: 300, neu: 100, nm: 0 },
				"Service": { pos: 200, neg: 50, neu: 100, nm: 0 },
				"Atmosphere": { pos: 500, neg: 50, neu: 100, nm: 0 },
				"Accessibility": { pos: 80, neg: 20, neu: 30, nm: 0 }
			}
		},
		"google": {
			name: "Google Maps",
			aspects: {
				"Taste": { pos: 300, neg: 30, neu: 50, nm: 0 },
				"Price": { pos: 150, neg: 20, neu: 60, nm: 0 },
				"Service": { pos: 100, neg: 100, neu: 40, nm: 0 },
				"Atmosphere": { pos: 100, neg: 10, neu: 30, nm: 0 },
				"Accessibility": { pos: 150, neg: 50, neu: 40, nm: 0 }
			}
		}
	},

	// Mock Comments
	_mockComments: [
		{ id: 1, platform: 'youtube', date: '25 Oct 23', text: 'น้ำซุปหมาล่าอร่อยมากกกก ชอบสุดๆ 😋', sentiment: 'pos', aspect: 'Taste' },
		{ id: 2, platform: 'tiktok', date: '25 Oct 23', text: 'พนักงานบริการไม่ค่อยทันใจเลยคนเยอะจัด', sentiment: 'neg', aspect: 'Service' },
		{ id: 3, platform: 'google', date: '24 Oct 23', text: 'ราคาถือว่าโอเคครับ เมื่อเทียบกับคุณภาพ', sentiment: 'pos', aspect: 'Price' },
		{ id: 4, platform: 'tiktok', date: '24 Oct 23', text: 'ไปกินมาแล้ว เฉยๆ นะ น้ำจิ้มยังไม่โดน', sentiment: 'neu', aspect: 'Taste' },
		{ id: 5, platform: 'youtube', date: '23 Oct 23', text: 'แค่เดินผ่าน ไม่ได้แวะกิน', sentiment: 'nm', aspect: 'Atmosphere' },
		{ id: 6, platform: 'google', date: '23 Oct 23', text: 'บรรยากาศร้านดีมาก สะอาดสะอ้าน', sentiment: 'pos', aspect: 'Atmosphere' },
		{ id: 7, platform: 'tiktok', date: '22 Oct 23', text: 'หมูสามชั้นคือดีย์ ไม่ไหววว', sentiment: 'pos', aspect: 'Taste' },
		{ id: 8, platform: 'youtube', date: '22 Oct 23', text: 'รอคิว 2 ชั่วโมง ท้อเลยยย 😭', sentiment: 'neg', aspect: 'Service' },
		{ id: 9, platform: 'google', date: '21 Oct 23', text: 'ร้านปิดวันไหนบ้างครับ', sentiment: 'nm', aspect: 'Service' },
		{ id: 10, platform: 'tiktok', date: '21 Oct 23', text: 'แพงไปหน่อยถ้าเทียบกับปริมาณ', sentiment: 'neg', aspect: 'Price' },
		{ id: 11, platform: 'google', date: '20 Oct 23', text: 'ที่จอดรถหายากมากครับ', sentiment: 'neg', aspect: 'Accessibility' },
	],

	_delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

	async getData(platform, startDate, endDate) {
		await this._delay(300);
		if (platform === 'all') {
			let aggregated = {};
			const firstKey = Object.keys(this._db)[0];
			const aspectKeys = Object.keys(this._db[firstKey].aspects);
			aspectKeys.forEach(k => aggregated[k] = { pos: 0, neg: 0, neu: 0, nm: 0 });
			Object.values(this._db).forEach(p => {
				aspectKeys.forEach(k => {
					const s = p.aspects[k];
					aggregated[k].pos += s.pos; aggregated[k].neg += s.neg;
					aggregated[k].neu += s.neu; aggregated[k].nm += s.nm;
				});
			});
			return aggregated;
		} else {
			return this._db[platform].aspects;
		}
	},

	async getCommentsList(platform, startDate, endDate, sentiment = 'all', aspect = 'all') {
		await this._delay(300);
		let filtered = this._mockComments;
		if (platform !== 'all') filtered = filtered.filter(c => c.platform === platform);
		if (sentiment !== 'all') filtered = filtered.filter(c => c.sentiment === sentiment);
		if (aspect !== 'all') filtered = filtered.filter(c => c.aspect === aspect); // Filter by Aspect
		return filtered;
	},

	getCounts() {
		let counts = { all: 0 };
		for (const [key, data] of Object.entries(this._db)) {
			let platformTotal = 0;
			Object.values(data.aspects).forEach(s => {
				platformTotal += (s.pos + s.neg + s.neu);
			});
			counts[key] = platformTotal;
			counts.all += platformTotal;
		}
		return counts;
	}
};

// --- CONTROLLER ---
const counts = SentimentService.getCounts();
document.getElementById('count-all').innerText = counts.all.toLocaleString();
document.getElementById('count-youtube').innerText = counts.youtube.toLocaleString();
document.getElementById('count-tiktok').innerText = counts.tiktok.toLocaleString();
document.getElementById('count-google').innerText = counts.google.toLocaleString();

function selectPlatform(platform, btnElement) {
	currentPlatform = platform;
	document.querySelectorAll('.platform-btn-group .btn').forEach(btn => btn.classList.remove('active'));
	btnElement.classList.add('active');
	renderCurrentView();
}

function switchView(viewName) {
	currentView = viewName;
	const btnDash = document.getElementById('btn-view-dashboard');
	const btnComm = document.getElementById('btn-view-comments');

	if (viewName === 'dashboard') {
		document.getElementById('view-dashboard').classList.remove('d-none');
		document.getElementById('view-comments').classList.add('d-none');
		// Reset Button Style
		btnDash.classList.remove('btn-link', 'text-secondary');
		btnDash.classList.add('btn-primary');
		btnComm.classList.remove('btn-primary');
		btnComm.classList.add('btn-link', 'text-secondary');
	} else {
		document.getElementById('view-dashboard').classList.add('d-none');
		document.getElementById('view-comments').classList.remove('d-none');
		// Swap Button Style
		btnDash.classList.remove('btn-primary');
		btnDash.classList.add('btn-link', 'text-secondary');
		btnComm.classList.remove('btn-link', 'text-secondary');
		btnComm.classList.add('btn-primary');
	}
	renderCurrentView();
}

function renderCurrentView() {
	if (currentView === 'dashboard') renderDashboard();
	else renderCommentsList();
}

async function renderDashboard() {
	const loadingOverlay = document.getElementById('loadingOverlay');
	loadingOverlay.style.display = 'flex';

	try {
		const startDate = document.getElementById('startDate').value;
		const endDate = document.getElementById('endDate').value;
		const data = await SentimentService.getData(currentPlatform, startDate, endDate);

		let overallScores = { pos: 0, neg: 0, neu: 0 };
		Object.values(data).forEach(s => {
			overallScores.pos += s.pos; overallScores.neg += s.neg; overallScores.neu += s.neu;
		});

		renderOverallChart(overallScores);
		updateOverallStats(overallScores);
		renderAspectGrid(data);

	} catch (error) {
		console.error(error);
	} finally {
		loadingOverlay.style.display = 'none';
	}
}

function renderOverallChart(scores) {
	if (overallChartInstance) overallChartInstance.destroy();
	const ctx = document.getElementById('overallChart').getContext('2d');
	const total = scores.pos + scores.neg + scores.neu;

	overallChartInstance = new Chart(ctx, {
		type: 'doughnut',
		data: {
			labels: ['Positive', 'Negative', 'Neutral'],
			datasets: [{
				data: [scores.pos, scores.neg, scores.neu],
				backgroundColor: [COLORS.pos.bg, COLORS.neg.bg, COLORS.neu.bg],
				borderWidth: 2,
				borderColor: '#ffffff',
				hoverOffset: 10
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			cutout: '70%',
			plugins: {
				legend: { display: true, position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
				tooltip: { enabled: true },
				datalabels: {
					color: '#fff',
					font: { weight: 'bold', size: 12 },
					formatter: (value) => {
						if (total === 0) return '';
						let pct = (value * 100 / total).toFixed(0);
						return pct > 5 ? pct + '%' : '';
					}
				}
			}
		}
	});
}

function updateOverallStats(scores) {
	const total = scores.pos + scores.neg + scores.neu;
	const statsHTML = `
<div class="d-flex justify-content-between align-items-center mb-2">
<span class="small text-muted"><span style="color:${COLORS.pos.bg}">●</span> Positive</span>
<span class="fw-bold text-dark">${scores.pos.toLocaleString()}</span>
</div>
<div class="d-flex justify-content-between align-items-center mb-2">
<span class="small text-muted"><span style="color:${COLORS.neg.bg}">●</span> Negative</span>
<span class="fw-bold text-dark">${scores.neg.toLocaleString()}</span>
</div>
<div class="d-flex justify-content-between align-items-center">
<span class="small text-muted"><span style="color:${COLORS.neu.bg}">●</span> Neutral</span>
<span class="fw-bold text-dark">${scores.neu.toLocaleString()}</span>
</div>
`;
	document.getElementById('overallStats').innerHTML = statsHTML;
}

function renderAspectGrid(aspectsData) {
	const container = document.getElementById('aspectGrid');
	activeCharts.forEach(c => c.destroy());
	activeCharts = [];
	container.innerHTML = '';

	let globalMax = 0;
	Object.values(aspectsData).forEach(scores => {
		const maxInAspect = Math.max(scores.pos, scores.neg, scores.neu);
		if (maxInAspect > globalMax) globalMax = maxInAspect;
	});
	globalMax = Math.ceil(globalMax * 1.1);

	Object.entries(aspectsData).forEach(([aspectName, scores], index) => {
		const mentionsCount = scores.pos + scores.neg + scores.neu;

		const col = document.createElement('div');
		col.className = 'col-md-6';
		col.innerHTML = `
<div class="card card-sentiment h-100 p-3">
	<div class="d-flex justify-content-between align-items-center mb-1">
		<h6 class="fw-bold mb-0 text-dark small">${aspectName}</h6>
		<small class="text-muted" style="font-size: 0.75rem;">${mentionsCount.toLocaleString()} mentions</small>
	</div>
	<div class="chart-container-bar">
		<canvas id="aspectChart-${index}"></canvas>
	</div>
</div>
`;
		container.appendChild(col);

		const ctx = document.getElementById(`aspectChart-${index}`).getContext('2d');
		const chart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: ['Pos', 'Neg', 'Neu'],
				datasets: [{
					data: [scores.pos, scores.neg, scores.neu],
					backgroundColor: [COLORS.pos.bg, COLORS.neg.bg, COLORS.neu.bg],
					borderRadius: 4,
					barPercentage: 0.5
				}]
			},
			options: {
				indexAxis: 'y',
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false }, datalabels: { display: false } },
				scales: {
					x: {
						grid: { display: true, color: '#f0f0f0', drawBorder: false },
						ticks: { font: { size: 10 }, color: '#999' },
						max: globalMax
					},
					y: {
						grid: { display: false },
						ticks: { font: { size: 11, weight: '500' }, color: '#555' }
					}
				}
			}
		});
		activeCharts.push(chart);
	});
}

async function renderCommentsList() {
	const loadingOverlay = document.getElementById('loadingOverlay');
	loadingOverlay.style.display = 'flex';
	const tbody = document.getElementById('commentsTableBody');
	tbody.innerHTML = '';

	try {
		const startDate = document.getElementById('startDate').value;
		const endDate = document.getElementById('endDate').value;
		const sentimentFilter = document.getElementById('sentimentFilter').value;
		const aspectFilter = document.getElementById('aspectFilter').value; // Get Aspect

		const comments = await SentimentService.getCommentsList(currentPlatform, startDate, endDate, sentimentFilter, aspectFilter);

		if (comments.length === 0) {
			tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>';
		} else {
			comments.forEach(c => {
				let icon = '';
				if (c.platform === 'youtube') icon = '<i class="fab fa-youtube text-danger opacity-75"></i>';
				else if (c.platform === 'tiktok') icon = '<i class="fab fa-tiktok text-dark opacity-75"></i>';
				else if (c.platform === 'google') icon = '<i class="fab fa-google text-primary opacity-75"></i>';

				// Function to check aspect and return badge
				const getBadge = (targetAspect) => {
					if (c.aspect === targetAspect && c.sentiment !== 'nm') {
						if (c.sentiment === 'pos') return '<span class="badge-pastel badge-pos">Pos</span>';
						if (c.sentiment === 'neg') return '<span class="badge-pastel badge-neg">Neg</span>';
						if (c.sentiment === 'neu') return '<span class="badge-pastel badge-neu">Neu</span>';
					}
					return '<span class="badge-empty">-</span>';
				};

				const tr = document.createElement('tr');
				tr.className = 'comment-row';
				tr.innerHTML = `
<td class="ps-4 text-muted small">${c.date}</td>
<td>${icon}</td>
<td><div class="text-review text-truncate" style="max-width: 350px;" title="${c.text}">${c.text}</div></td>
<td class="text-center">${getBadge('Taste')}</td>
<td class="text-center">${getBadge('Price')}</td>
<td class="text-center">${getBadge('Service')}</td>
<td class="text-center">${getBadge('Atmosphere')}</td>
<td class="text-center">${getBadge('Accessibility')}</td>
`;
				tbody.appendChild(tr);
			});
		}
	} catch (error) { console.error(error); } finally { loadingOverlay.style.display = 'none'; }
}

renderDashboard();

