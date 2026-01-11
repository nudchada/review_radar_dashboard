// Register Chart Plugin
Chart.register(ChartDataLabels);

// --- 1. CONFIG & STATE ---
const DEFAULT_BATCH_ID = "55"; // Hardcode ไว้สำหรับ Mock
document.getElementById('startDate').valueAsDate = new Date('2024-01-01');
document.getElementById('endDate').valueAsDate = new Date('2024-12-31');

let currentPlatform = 'all';
let currentView = 'dashboard';
let activeCharts = [];
let overallChartInstance = null;

// สีเดิมที่คุณตั้งค่าไว้ (Vibrant Pastel)
const COLORS = {
	pos: { bg: '#66bb6a', border: '#4caf50', hover: '#43a047' },
	neg: { bg: '#ef5350', border: '#e53935', hover: '#e53935' },
	neu: { bg: '#ffa726', border: '#fb8c00', hover: '#fb8c00' },
	nm: { bg: '#bdbdbd', border: '#9e9e9e', hover: '#757575' }
};

// --- 2. SERVICE LAYER (API Connection) ---
const SentimentService = {
	// ดึง Metrics (กราฟ)
	async getMetrics(batchId, platform, startDate, endDate) {
		const params = new URLSearchParams({ from_date: startDate, to_date: endDate });
		if (platform !== 'all') params.append('platforms', platform);

		try {
			const res = await fetch(`/api/batches/${batchId}/metrics?${params}`);
			if (!res.ok) throw new Error('Metrics API Error');
			const json = await res.json();
			return json.data;
		} catch (err) {
			console.error(err);
			return null;
		}
	},

	// ดึง Reviews (ตาราง)
	async getReviews(batchId, platform, startDate, endDate, sentiment, aspect) {
		// API ปัจจุบันรับ params ตามนี้
		const params = new URLSearchParams({ sort: 'random', limit: 50 });
		if (platform !== 'all') params.append('platform', platform);

		try {
			const res = await fetch(`/api/batches/${batchId}/reviews?${params}`);
			if (!res.ok) throw new Error('Reviews API Error');
			const json = await res.json();
			return json.data;
		} catch (err) {
			console.error(err);
			return [];
		}
	}
};

// --- 3. CONTROLLER ---

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
	const viewDash = document.getElementById('view-dashboard');
	const viewComm = document.getElementById('view-comments');

	if (viewName === 'dashboard') {
		viewDash.classList.remove('d-none');
		viewComm.classList.add('d-none');
		btnDash.classList.replace('text-secondary', 'btn-primary');
		btnDash.classList.remove('btn-link');
		btnComm.classList.replace('btn-primary', 'text-secondary');
		btnComm.classList.add('btn-link');
	} else {
		viewDash.classList.add('d-none');
		viewComm.classList.remove('d-none');
		btnDash.classList.replace('btn-primary', 'text-secondary');
		btnDash.classList.add('btn-link');
		btnComm.classList.replace('text-secondary', 'btn-primary');
		btnComm.classList.remove('btn-link');
	}
	renderCurrentView();
}

function renderCurrentView() {
	if (currentView === 'dashboard') renderDashboard();
	else renderCommentsList();
}

// --- 4. RENDERERS (DASHBOARD) ---

async function renderDashboard() {
	const loadingOverlay = document.getElementById('loadingOverlay');
	if (loadingOverlay) loadingOverlay.style.display = 'flex';

	try {
		const startDate = document.getElementById('startDate').value;
		const endDate = document.getElementById('endDate').value;

		// 1. เรียก API
		const data = await SentimentService.getMetrics(DEFAULT_BATCH_ID, currentPlatform, startDate, endDate);

		if (data) {
			// 2. อัปเดตตัวเลข Platform Counts
			updatePlatformCounts(data.platform_counts);

			// 3. เตรียมข้อมูล Overall Chart (แปลง positive -> pos)
			const overallScores = {
				pos: data.overall_sentiment.positive,
				neg: data.overall_sentiment.negative,
				neu: data.overall_sentiment.neutral
			};

			renderOverallChart(overallScores);
			updateOverallStats(overallScores);

			// 4. วาดกราฟ Aspect
			renderAspectGrid(data.aspect_metrics);
		}

	} catch (error) {
		console.error("Dashboard Error:", error);
	} finally {
		if (loadingOverlay) loadingOverlay.style.display = 'none';
	}
}

function updatePlatformCounts(counts) {
	const setTxt = (id, val) => {
		const el = document.getElementById(id);
		if (el) el.innerText = val ? val.toLocaleString() : '0';
	};

	let total = 0;
	if (counts) {
		Object.values(counts).forEach(v => total += v);
		setTxt('count-youtube', counts.youtube);
		setTxt('count-tiktok', counts.tiktok);
		setTxt('count-google', counts.google);
	}
	setTxt('count-all', total);
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

	if (!aspectsData) return;

	let globalMax = 0;
	Object.values(aspectsData).forEach(scores => {
		// API Keys: positive, negative, neutral
		const maxInAspect = Math.max(scores.positive, scores.negative, scores.neutral);
		if (maxInAspect > globalMax) globalMax = maxInAspect;
	});
	globalMax = Math.ceil(globalMax * 1.1) || 10;

	Object.entries(aspectsData).forEach(([aspectName, scores], index) => {
		const mentionsCount = scores.positive + scores.negative + scores.neutral;

		// จัดรูปแบบชื่อ (TASTE -> Taste)
		const title = aspectName.charAt(0).toUpperCase() + aspectName.slice(1).toLowerCase();

		const col = document.createElement('div');
		col.className = 'col-md-6';
		col.innerHTML = `
            <div class="card card-sentiment h-100 p-3">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <h6 class="fw-bold mb-0 text-dark small">${title}</h6>
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
					// Mapping ข้อมูลจาก API (positive -> pos)
					data: [scores.positive, scores.negative, scores.neutral],
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

// --- 5. RENDERERS (COMMENTS LIST) ---

async function renderCommentsList() {
	const loadingOverlay = document.getElementById('loadingOverlay');
	if (loadingOverlay) loadingOverlay.style.display = 'flex';

	const tbody = document.getElementById('commentsTableBody');
	tbody.innerHTML = '';

	try {
		const startDate = document.getElementById('startDate').value;
		const endDate = document.getElementById('endDate').value;
		const sentimentFilter = document.getElementById('sentimentFilter').value;
		const aspectFilter = document.getElementById('aspectFilter').value;

		// เรียก API
		const comments = await SentimentService.getReviews(DEFAULT_BATCH_ID, currentPlatform, startDate, endDate, sentimentFilter, aspectFilter);

		if (!comments || comments.length === 0) {
			tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>';
		} else {
			comments.forEach(c => {
				let icon = '<i class="fas fa-comment text-secondary opacity-50"></i>';
				// Check 'source_platform' (Not just 'platform')
				if (c.source_platform === 'youtube') icon = '<i class="fab fa-youtube text-danger opacity-75"></i>';
				else if (c.source_platform === 'tiktok') icon = '<i class="fab fa-tiktok text-dark opacity-75"></i>';
				else if (c.source_platform === 'google') icon = '<i class="fab fa-google text-primary opacity-75"></i>';
				else if (c.source_platform === 'facebook') icon = '<i class="fab fa-facebook text-primary opacity-75"></i>';
				else if (c.source_platform === 'shopee') icon = '<i class="fas fa-shopping-bag text-warning opacity-75"></i>';

				// --- KEY CHANGE: Get Badge from Nested Results ---
				const getBadge = (columnKey) => {
					const keyLower = columnKey.toLowerCase();

					// เช็คใน c.results แทน c.aspect
					if (c.results && c.results[keyLower]) {
						const item = c.results[keyLower];

						let sentimentCode = 'neu';
						if (item.sentiment === 'positive') sentimentCode = 'pos';
						if (item.sentiment === 'negative') sentimentCode = 'neg';

						const label = sentimentCode.charAt(0).toUpperCase() + sentimentCode.slice(1);
						return `<span class="badge-pastel badge-${sentimentCode}">${label}</span>`;
					}
					return '<span class="badge-empty">-</span>';
				};

				const tr = document.createElement('tr');
				tr.className = 'comment-row';
				const dateStr = new Date(c.review_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

				tr.innerHTML = `
                    <td class="ps-4 text-muted small">${dateStr}</td>
                    <td>${icon}</td>
                    <td><div class="text-review text-truncate" style="max-width: 350px;" title="${c.content}">${c.content}</div></td>
                    <td class="text-center">${getBadge('Taste')}</td>
                    <td class="text-center">${getBadge('Price')}</td>
                    <td class="text-center">${getBadge('Service')}</td>
                    <td class="text-center">${getBadge('Atmosphere')}</td>
                    <td class="text-center">${getBadge('Accessibility')}</td>
                `;
				tbody.appendChild(tr);
			});
		}
	} catch (error) {
		console.error(error);
	} finally {
		if (loadingOverlay) loadingOverlay.style.display = 'none';
	}
}

// Start
renderCurrentView();
