// Global Variables
const SESSION_ID = 55; // Hardcode ไว้ก่อน
let currentQCItems = [];
let currentAuditItemId = null;
let auditModal = null;

document.addEventListener('DOMContentLoaded', () => {
	auditModal = new bootstrap.Modal(document.getElementById('auditModal'));
	loadQCItems();
});

// --- API Functions ---

async function loadQCItems() {
	showLoading(true);
	try {
		// 1. เรียก API ดึงรายการ QC Items
		const res = await fetch(`/api/qc-sessions/${SESSION_ID}`);
		if (!res.ok) throw new Error('API Error');
		const data = await res.json();

		// 2. เก็บข้อมูลไว้ใน Global Variable
		currentQCItems = data.items;

		// 3. อัปเดต UI
		renderStats(data.meta.progress);
		renderTable(data.items);

	} catch (err) {
		console.error(err);
		alert("Failed to load QC items");
	} finally {
		showLoading(false);
	}
}

async function submitUpdate(qcItemId, correctSentiment) {
	try {
		const payload = {
			correct_sentiment: correctSentiment,
			confirmed: 1 // 1 = Human Reviewed
		};

		const res = await fetch(`/api/qc-items/${qcItemId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!res.ok) throw new Error('Update Failed');

		// Update สำเร็จ -> รีโหลดตาราง
		await loadQCItems();
		auditModal.hide();

	} catch (err) {
		console.error(err);
		alert("Error saving data");
	}
}


// --- Render Functions ---

function renderStats(progress) {
	document.getElementById('stat-total').innerText = progress.total;
	document.getElementById('stat-reviewed').innerText = progress.reviewed;
	document.getElementById('stat-remaining').innerText = progress.remaining;
}

function renderTable(items) {
	const tbody = document.getElementById('qcTableBody');
	tbody.innerHTML = '';

	items.forEach(item => {
		// Logic สีของ Confidence Bar
		let confColor = 'conf-fill';
		if (item.confidence < 0.6) confColor += ' conf-low';
		else if (item.confidence < 0.85) confColor += ' conf-mid';

		const confPercent = Math.round(item.confidence * 100);

		// Status Badge
		const isReviewed = item.status === 'reviewed';
		const statusBadge = isReviewed
			? `<span class="badge-status status-reviewed"><i class="fas fa-check me-1"></i>Reviewed</span>`
			: `<span class="badge-status status-pending">Pending</span>`;

		const tr = document.createElement('tr');
		tr.innerHTML = `
            <td class="text-muted small">#${item.qc_item_id}</td>
            <td>
                <div class="text-truncate" style="max-width: 400px;" title="${item.review_content}">
                    ${item.review_content}
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${item.aspect}</span></td>
            <td>
                <span class="fw-bold ${getTextColor(item.predicted_sentiment)}">
                    ${capitalize(item.predicted_sentiment)}
                </span>
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="conf-wrapper"><div class="${confColor}" style="width: ${confPercent}%"></div></div>
                    <small class="text-muted">${confPercent}%</small>
                </div>
            </td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-audit" onclick="openAuditModal(${item.qc_item_id})">
                    <i class="fas fa-edit me-1"></i>Audit
                </button>
            </td>
        `;
		tbody.appendChild(tr);
	});
}


// --- Modal & Action Logic ---

function openAuditModal(qcItemId) {
	// หาข้อมูล item จาก array
	const item = currentQCItems.find(i => i.qc_item_id === qcItemId);
	if (!item) return;

	currentAuditItemId = qcItemId;

	// Fill Data in Modal
	document.getElementById('modal-item-id').innerText = item.qc_item_id;
	document.getElementById('modal-review-text').innerText = item.review_content;
	document.getElementById('modal-aspect').value = capitalize(item.aspect);

	const predInput = document.getElementById('modal-ai-pred');
	predInput.value = capitalize(item.predicted_sentiment);
	// Reset Color Class
	predInput.className = `form-control fw-bold ${getTextColor(item.predicted_sentiment)}`;

	// Reset Radio Buttons
	document.querySelectorAll('input[name="humanSentiment"]').forEach(r => r.checked = false);

	// ถ้าเคย Review แล้ว ให้ติ๊กอันเดิมไว้ให้
	// (แต่ Mock Data เราไม่ได้เก็บค่าที่แก้ไว้ใน JSON ถาวร ถ้า Refersh หน้าอาจหาย 
	// แต่ถ้ากดแก้สดๆ Logic นี้จะช่วยให้ UX ดีขึ้นถ้าระบบจริงเก็บค่าไว้)
	// สำหรับ Mock นี้เรา Default ให้เลือกตาม AI ไปก่อน
	const radioToSelect = document.querySelector(`input[name="humanSentiment"][value="${item.predicted_sentiment}"]`);
	if (radioToSelect) radioToSelect.checked = true;

	auditModal.show();
}

function submitAudit() {
	// หาว่า User เลือกค่าอะไร
	const selected = document.querySelector('input[name="humanSentiment"]:checked');
	if (!selected) {
		alert("Please select a sentiment");
		return;
	}

	// ส่งไป API
	submitUpdate(currentAuditItemId, selected.value);
}


// --- Helpers ---

function showLoading(show) {
	document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function capitalize(str) {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTextColor(sentiment) {
	if (sentiment === 'positive') return 'text-success';
	if (sentiment === 'negative') return 'text-danger';
	return 'text-warning';
}
