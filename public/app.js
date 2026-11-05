// AutomaticCallingBot Client Application
const API_BASE = '/api';

// Application State
let state = {
  activeTab: 'dashboard',
  companies: [],
  decisionMakers: [],
  filteredDms: [],
  calls: [],
  shareLogs: [],
  templates: [],
  settings: {
    referral: {
      officialUrl: 'https://www.goextramile.in/r?code=GOMILES',
      referralCode: 'GOMILES'
    }
  },
  activeCompanyForProfile: null,
  discoveredCandidates: []
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadTemplates();
  await refreshAllData();
});

async function refreshAllData() {
  await Promise.all([
    loadStats(),
    loadCompanies(),
    loadDecisionMakers(),
    loadCalls(),
    loadShareLogs()
  ]);
  renderDashboard();
  renderFullDecisionMakers();
  renderCompanies();
  renderCalls();
  renderShareLogs();
}

// ==========================================
// DATA FETCHING
// ==========================================
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const json = await res.json();
    if (json.success) {
      state.settings = json.data;
      updateReferralUiElements();

      if (json.data.caller) {
        state.callerProfile = json.data.caller;
        const phoneEl = document.getElementById('headerCallerPhone');
        if (phoneEl) phoneEl.innerText = json.data.caller.agentPhone;
        const phoneInput = document.getElementById('settingsAgentPhone');
        if (phoneInput) phoneInput.value = json.data.caller.agentPhone;
        const nameInput = document.getElementById('settingsAgentName');
        if (nameInput) nameInput.value = json.data.caller.agentName;
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function loadTemplates() {
  try {
    const res = await fetch(`${API_BASE}/referral/templates`);
    const json = await res.json();
    if (json.success) {
      state.templates = json.data;
      populateTemplateSelect();
    }
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const json = await res.json();
    if (json.success) {
      const s = json.data;
      document.getElementById('statTotalCompanies').innerText = s.totalCompanies;
      document.getElementById('statTier1Count').innerText = s.priorityTiers.tier1;
      document.getElementById('statTier2Tier3Count').innerText = s.priorityTiers.tier2 + s.priorityTiers.tier3;
      document.getElementById('statVerifiedPercent').innerText = `${s.verification.verifiedRatePercent}%`;
      document.getElementById('statVerifiedSubtext').innerText = `${s.verification.verified} verified / ${s.verification.unverified} unverified`;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadCompanies() {
  try {
    const res = await fetch(`${API_BASE}/companies`);
    const json = await res.json();
    if (json.success) {
      state.companies = json.data;
    }
  } catch (err) {
    console.error('Failed to load companies:', err);
  }
}

async function loadDecisionMakers() {
  try {
    const res = await fetch(`${API_BASE}/decision-makers`);
    const json = await res.json();
    if (json.success) {
      state.decisionMakers = json.data;
      state.filteredDms = [...state.decisionMakers];
      document.getElementById('dmFilteredCount').innerText = state.decisionMakers.length;
    }
  } catch (err) {
    console.error('Failed to load decision-makers:', err);
  }
}

async function loadCalls() {
  try {
    const res = await fetch(`${API_BASE}/calls`);
    const json = await res.json();
    if (json.success) {
      state.calls = json.data;
      document.getElementById('callsCount').innerText = `${state.calls.length} calls logged`;
    }
  } catch (err) {
    console.error('Failed to load calls:', err);
  }
}

async function loadShareLogs() {
  try {
    const res = await fetch(`${API_BASE}/referral/logs`);
    const json = await res.json();
    if (json.success) {
      state.shareLogs = json.data;
    }
  } catch (err) {
    console.error('Failed to load share logs:', err);
  }
}

// Update all referral link occurrences in UI
function updateReferralUiElements() {
  const url = state.settings.referral?.officialUrl || 'https://www.goextramile.in/r?code=GOMILES';
  const topEl = document.getElementById('topReferralUrl');
  if (topEl) topEl.innerText = url;
  const cardEl = document.getElementById('cardReferralUrl');
  if (cardEl) cardEl.innerText = url;
  const settingsInput = document.getElementById('settingsReferralUrl');
  if (settingsInput) settingsInput.value = url;
}

// ==========================================
// TAB SWITCHING
// ==========================================
function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active-tab'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');

  const btn = document.getElementById(`tabBtn-${tabId}`);
  if (btn) btn.classList.add('active-tab');

  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'decisionMakers') renderFullDecisionMakers();
  if (tabId === 'companies') renderCompanies();
  if (tabId === 'outreach') {
    renderCalls();
    renderShareLogs();
  }
}

// ==========================================
// REFERRAL LINK COPY & SHARE
// ==========================================
function copyReferralLink() {
  const url = state.settings.referral?.officialUrl || 'https://www.goextramile.in/r?code=GOMILES';
  navigator.clipboard.writeText(url).then(() => {
    showToast('Referral link copied to clipboard!', 'success');
  }).catch(err => {
    showToast('Failed to copy: ' + err.message, 'error');
  });
}

function openShareModal(dmId = null) {
  const modal = document.getElementById('modalShare');
  modal.classList.remove('hidden');

  let defaultName = '';
  let defaultCompany = '';
  let defaultPhone = '';
  let defaultEmail = '';

  if (dmId) {
    const dm = state.decisionMakers.find(d => d.id === dmId);
    if (dm) {
      defaultName = dm.fullName;
      defaultCompany = dm.companyName;
      defaultPhone = dm.phone;
      defaultEmail = dm.email || '';
    }
  }

  document.getElementById('shareProspectName').value = defaultName;
  document.getElementById('shareCompanyName').value = defaultCompany;
  document.getElementById('sharePhone').value = defaultPhone;
  document.getElementById('shareEmail').value = defaultEmail;
  document.getElementById('shareConsentCheckbox').checked = false;

  updateSharePreview();
}

function closeShareModal() {
  document.getElementById('modalShare').classList.add('hidden');
}

function populateTemplateSelect() {
  const select = document.getElementById('shareTemplateSelect');
  if (!select) return;
  select.innerHTML = '';
  state.templates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.innerText = `${t.name} [${t.type.toUpperCase()}]`;
    select.appendChild(opt);
  });
}

function updateSharePreview() {
  const templateId = document.getElementById('shareTemplateSelect').value;
  const name = document.getElementById('shareProspectName').value.trim() || 'Partner';
  const company = document.getElementById('shareCompanyName').value.trim() || 'your brand';
  const url = state.settings.referral?.officialUrl || 'https://www.goextramile.in/r?code=GOMILES';
  const code = state.settings.referral?.referralCode || 'GOMILES';

  const tpl = state.templates.find(t => t.id === templateId) || state.templates[0];
  if (!tpl) return;

  const text = tpl.body
    .replace(/{{name}}/g, name)
    .replace(/{{companyName}}/g, company)
    .replace(/{{referralUrl}}/g, url)
    .replace(/{{referralCode}}/g, code);

  document.getElementById('shareMessagePreview').value = text;
}

function copySharePreviewText() {
  const text = document.getElementById('shareMessagePreview').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Message text copied to clipboard!', 'success');
  });
}

async function executeShareAction(channel) {
  const consent = document.getElementById('shareConsentCheckbox').checked;
  if (!consent) {
    showToast('Mandatory Consent Required: Confirm that the recipient authorized receiving the referral link.', 'error');
    return;
  }

  const name = document.getElementById('shareProspectName').value.trim();
  const company = document.getElementById('shareCompanyName').value.trim();
  const phone = document.getElementById('sharePhone').value.trim();
  const email = document.getElementById('shareEmail').value.trim();
  const templateId = document.getElementById('shareTemplateSelect').value;

  try {
    const res = await fetch(`${API_BASE}/referral/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientName: name,
        recipientPhone: phone,
        recipientEmail: email,
        channel: channel === 'whatsapp' ? 'WhatsApp' : 'Email',
        consentConfirmed: true,
        templateId
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to dispatch share', 'error');
      return;
    }

    showToast(`Logged consent & prepared ${channel.toUpperCase()} share!`, 'success');
    closeShareModal();
    await loadShareLogs();
    renderShareLogs();

    // Trigger platform action
    if (channel === 'whatsapp') {
      window.open(json.data.shareLinks.whatsappUrl, '_blank');
    } else {
      window.location.href = json.data.shareLinks.mailtoUrl;
    }
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

// ==========================================
// RENDERING DECISION MAKERS
// ==========================================
function getTierBadgeHtml(tier, rank) {
  if (tier === 1) {
    return `<span class="badge-tier-1 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex">
      <i class="fa-solid fa-crown text-[10px]"></i> 1st Preference (Tier 1)
    </span>`;
  } else if (tier === 2) {
    return `<span class="badge-tier-2 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex">
      <i class="fa-solid fa-bullhorn text-[10px]"></i> 2nd Preference (Tier 2)
    </span>`;
  } else {
    return `<span class="badge-tier-3 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 inline-flex">
      <i class="fa-solid fa-chart-line text-[10px]"></i> 3rd Preference (Tier 3)
    </span>`;
  }
}

function getVerificationBadgeHtml(status, id) {
  if (status === 'Verified') {
    return `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30" onclick="toggleVerification('${id}', 'Unverified')" title="Click to change verification">
      <i class="fa-solid fa-check-circle"></i> Verified
    </span>`;
  } else {
    return `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-amber-500/30" onclick="toggleVerification('${id}', 'Verified')" title="Click to verify contact">
      <i class="fa-solid fa-clock"></i> Unverified
    </span>`;
  }
}

function renderDecisionMakerRow(dm) {
  const emailLink = dm.email ? `<a href="mailto:${dm.email}" class="text-indigo-400 hover:underline flex items-center gap-1"><i class="fa-regular fa-envelope text-[11px]"></i> ${dm.email}</a>` : `<span class="text-slate-500 text-xs">-</span>`;
  const linkedinLink = dm.linkedInUrl ? `<a href="${dm.linkedInUrl}" target="_blank" class="text-blue-400 hover:text-blue-300"><i class="fa-brands fa-linkedin text-sm"></i></a>` : '';
  const sourceLink = dm.sourceUrl ? `<a href="${dm.sourceUrl}" target="_blank" class="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 max-w-[140px] truncate" title="${dm.sourceUrl}"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> ${dm.sourceUrl.replace(/^https?:\/\//, '')}</a>` : `<span class="text-slate-500 text-xs">-</span>`;

  return `
    <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition text-xs">
      <td class="py-3 px-4">
        <div class="font-bold text-white text-sm flex items-center gap-2">
          ${dm.fullName}
          ${linkedinLink}
        </div>
        <div class="text-slate-300 font-medium text-xs mt-0.5">${dm.designation}</div>
      </td>
      <td class="py-3 px-4">
        <span class="font-semibold text-slate-200">${dm.companyName}</span>
      </td>
      <td class="py-3 px-4">
        ${getTierBadgeHtml(dm.priorityTier, dm.priorityRank)}
      </td>
      <td class="py-3 px-4">
        <div class="font-mono text-amber-200 font-semibold flex items-center gap-1.5">
          <i class="fa-solid fa-phone text-[10px] text-slate-400"></i> ${dm.phone}
        </div>
        <div class="mt-1">${emailLink}</div>
      </td>
      <td class="py-3 px-4">
        ${sourceLink}
      </td>
      <td class="py-3 px-4">
        ${getVerificationBadgeHtml(dm.verificationStatus, dm.id)}
      </td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1.5">
          <button onclick="startAutomatedCallBot('${dm.id}')" class="bg-purple-600 hover:bg-purple-500 text-white font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 shadow-sm" title="Launch Autonomous AI Voice Calling Bot">
            <i class="fa-solid fa-robot"></i> Auto-Call
          </button>
          <button onclick="startCallFromMyNumber('${dm.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 shadow-sm" title="Call from your number +91 8518900153">
            <i class="fa-solid fa-phone"></i> Call (8518900153)
          </button>
          <button onclick="openEmailProposalModal('${dm.id}')" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-2 py-1 rounded text-xs transition flex items-center gap-1" title="Email proposal to run deals on Go Extra Mile app">
            <i class="fa-solid fa-envelope"></i> Mail
          </button>
          <button onclick="openShareModal('${dm.id}')" class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-1 rounded text-xs transition" title="Share Go Extra Mile Link">
            <i class="fa-solid fa-share-nodes"></i> Share
          </button>
          <button onclick="deleteDecisionMaker('${dm.id}')" class="text-slate-500 hover:text-rose-400 p-1 transition" title="Delete">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderDashboard() {
  const container = document.getElementById('dashboardDmTableContainer');
  if (!container) return;

  const topDms = [...state.decisionMakers].slice(0, 5);

  if (topDms.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">No decision-makers added yet. Click "Add Decision-Maker" or use the Research tab to discover candidates.</div>`;
    return;
  }

  let html = `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-900/50">
          <th class="py-2.5 px-4">Decision-Maker</th>
          <th class="py-2.5 px-4">Company</th>
          <th class="py-2.5 px-4">Priority Preference</th>
          <th class="py-2.5 px-4">Professional Coordinates</th>
          <th class="py-2.5 px-4">Source</th>
          <th class="py-2.5 px-4">Status</th>
          <th class="py-2.5 px-4 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${topDms.map(renderDecisionMakerRow).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

function renderFullDecisionMakers() {
  const container = document.getElementById('fullDmTableContainer');
  if (!container) return;

  if (state.filteredDms.length === 0) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400 text-xs">No decision-makers match your current filters.</div>`;
    return;
  }

  let html = `
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-900/50">
          <th class="py-2.5 px-4">Decision-Maker & Designation</th>
          <th class="py-2.5 px-4">Company</th>
          <th class="py-2.5 px-4">Priority Hierarchy</th>
          <th class="py-2.5 px-4">Direct Contact (No Support Lines)</th>
          <th class="py-2.5 px-4">Source URL</th>
          <th class="py-2.5 px-4">Verification</th>
          <th class="py-2.5 px-4 text-right">Outreach Actions</th>
        </tr>
      </thead>
      <tbody>
        ${state.filteredDms.map(renderDecisionMakerRow).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

function filterDecisionMakers() {
  const search = document.getElementById('dmSearchInput').value.toLowerCase().trim();
  const tier = document.getElementById('dmTierFilter').value;
  const status = document.getElementById('dmVerifyFilter').value;

  state.filteredDms = state.decisionMakers.filter(dm => {
    let match = true;
    if (search) {
      match = match && (
        dm.fullName.toLowerCase().includes(search) ||
        dm.companyName.toLowerCase().includes(search) ||
        dm.designation.toLowerCase().includes(search) ||
        (dm.phone && dm.phone.includes(search)) ||
        (dm.email && dm.email.toLowerCase().includes(search))
      );
    }
    if (tier) {
      match = match && (dm.priorityTier === parseInt(tier, 10));
    }
    if (status) {
      match = match && (dm.verificationStatus === status);
    }
    return match;
  });

  document.getElementById('dmFilteredCount').innerText = state.filteredDms.length;
  renderFullDecisionMakers();
}

async function toggleVerification(id, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/decision-makers/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        method: newStatus === 'Verified' ? 'Manual audit & verified by user' : null
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Contact status updated to ${newStatus}`, 'success');
      await refreshAllData();
    }
  } catch (err) {
    showToast('Failed to update verification: ' + err.message, 'error');
  }
}

async function deleteDecisionMaker(id) {
  if (!confirm('Are you sure you want to remove this decision-maker record? Auto-replenish will instantly generate a fresh replacement.')) return;
  try {
    const res = await fetch(`${API_BASE}/decision-makers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      if (json.data && json.data.autoReplenished && json.data.newLead) {
        showToast(`Contact removed. Auto-replenished replacement lead: ${json.data.newLead.fullName} (${json.data.newLead.designation} at ${json.data.newLead.companyName})!`, 'success');
      } else {
        showToast(json.message || 'Contact removed', 'success');
      }
      await refreshAllData();
    } else {
      showToast('Error removing contact: ' + (json.error || 'Failed'), 'error');
    }
  } catch (err) {
    showToast('Error removing contact: ' + err.message, 'error');
  }
}

async function triggerManualReplenish(count = 3) {
  try {
    showToast(`Autonomous Engine searching & generating ${count} fresh decision-maker leads...`, 'info');
    const res = await fetch(`${API_BASE}/leads/replenish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count })
    });
    const json = await res.json();
    if (json.success) {
      const generatedCount = json.count || (json.data && json.data.length) || count;
      showToast(`Successfully discovered & added ${generatedCount} fresh verified decision-makers to pipeline!`, 'success');
      await refreshAllData();
    } else {
      showToast('Replenish error: ' + (json.error || 'Failed'), 'error');
    }
  } catch (err) {
    showToast('Error generating leads: ' + err.message, 'error');
  }
}

// ==========================================
// ADD / EDIT DECISION MAKER FORM & VALIDATION
// ==========================================
function openAddDecisionMakerModal(companyName = '') {
  document.getElementById('modalDmTitle').innerHTML = '<i class="fa-solid fa-user-plus text-amber-400"></i> Add Identified Decision-Maker';
  document.getElementById('dmFormCompany').value = companyName;
  document.getElementById('dmFormName').value = '';
  document.getElementById('dmFormDesignation').value = '';
  document.getElementById('dmFormPhone').value = '';
  document.getElementById('dmFormEmail').value = '';
  document.getElementById('dmFormLinkedIn').value = '';
  document.getElementById('dmFormSourceUrl').value = '';
  document.getElementById('dmFormVerificationStatus').value = 'Verified';
  document.getElementById('dmFormVerificationMethod').value = 'Official company leadership profile';
  document.getElementById('dmFormAlert').classList.add('hidden');

  document.getElementById('modalAddDm').classList.remove('hidden');
}

function closeAddDecisionMakerModal() {
  document.getElementById('modalAddDm').classList.add('hidden');
}

async function saveDecisionMakerForm() {
  const alertBox = document.getElementById('dmFormAlert');
  alertBox.classList.add('hidden');
  alertBox.innerText = '';

  const payload = {
    companyName: document.getElementById('dmFormCompany').value.trim(),
    fullName: document.getElementById('dmFormName').value.trim(),
    designation: document.getElementById('dmFormDesignation').value.trim(),
    phone: document.getElementById('dmFormPhone').value.trim(),
    email: document.getElementById('dmFormEmail').value.trim(),
    linkedInUrl: document.getElementById('dmFormLinkedIn').value.trim(),
    sourceUrl: document.getElementById('dmFormSourceUrl').value.trim(),
    verificationStatus: document.getElementById('dmFormVerificationStatus').value,
    verificationMethod: document.getElementById('dmFormVerificationMethod').value.trim()
  };

  // Client-side Customer Care Guardrail Check
  const cleanPhone = payload.phone.replace(/[\s\-\(\)\+]/g, '');
  if (cleanPhone.startsWith('1800') || cleanPhone.startsWith('1860') || cleanPhone.startsWith('0800') || cleanPhone.includes('1800')) {
    alertBox.innerText = 'Customer-Care Guardrail Triggered: The entered phone number matches a toll-free customer support number. Never substitute customer care for direct decision-maker contacts.';
    alertBox.classList.remove('hidden');
    return;
  }

  const lowerEmail = payload.email.toLowerCase();
  if (lowerEmail.startsWith('support@') || lowerEmail.startsWith('care@') || lowerEmail.startsWith('customercare@') || lowerEmail.startsWith('help@')) {
    alertBox.innerText = 'Customer-Care Guardrail Triggered: The entered email is a generic customer service inbox. Direct decision-maker contacts only.';
    alertBox.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/decision-makers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) {
      alertBox.innerText = json.error || 'Validation failed';
      alertBox.classList.remove('hidden');
      return;
    }

    showToast('Decision-maker saved with priority classification!', 'success');
    closeAddDecisionMakerModal();
    await refreshAllData();
  } catch (err) {
    alertBox.innerText = 'Network error: ' + err.message;
    alertBox.classList.remove('hidden');
  }
}

// ==========================================
// COMPANIES RENDERING & PROFILE
// ==========================================
function renderCompanies() {
  const container = document.getElementById('companiesContainer');
  if (!container) return;

  if (state.companies.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400 text-xs">No companies added yet. Click "Add Target Company" above.</div>`;
    return;
  }

  container.innerHTML = state.companies.map(comp => {
    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition shadow-sm space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold text-white text-base">${comp.name}</h3>
            <p class="text-xs text-indigo-400">${comp.domain || 'No domain'} &bull; ${comp.industry}</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
            ${comp.city || 'India'}
          </span>
        </div>

        <p class="text-xs text-slate-300 line-clamp-2">${comp.notes || 'Prospect for merchant deals and discount promotions.'}</p>

        <!-- Decision Maker Counts per tier -->
        <div class="bg-slate-900/60 border border-slate-700/40 rounded-lg p-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div class="text-[10px] text-amber-400 font-bold">1st (Tier 1)</div>
            <div class="font-bold text-slate-100">${comp.tier1Count || 0}</div>
          </div>
          <div>
            <div class="text-[10px] text-purple-400 font-bold">2nd (Tier 2)</div>
            <div class="font-bold text-slate-100">${comp.tier2Count || 0}</div>
          </div>
          <div>
            <div class="text-[10px] text-blue-400 font-bold">3rd (Tier 3)</div>
            <div class="font-bold text-slate-100">${comp.tier3Count || 0}</div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
          <span class="text-[11px] text-emerald-400 font-semibold">
            <i class="fa-solid fa-check"></i> ${comp.verifiedCount || 0} verified
          </span>
          <div class="flex items-center gap-2">
            <button onclick="openProspectProfile('${comp.id}')" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded text-xs transition">
              View Profile
            </button>
            <button onclick="openShareModalForCompany('${comp.name}')" class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded text-xs transition" title="Share Go Extra Mile Referral Link">
              <i class="fa-solid fa-share-nodes"></i> Link
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddCompanyModal() {
  document.getElementById('compName').value = '';
  document.getElementById('compDomain').value = '';
  document.getElementById('compIndustry').value = '';
  document.getElementById('compCity').value = '';
  document.getElementById('compNotes').value = '';
  document.getElementById('modalAddCompany').classList.remove('hidden');
}

function closeAddCompanyModal() {
  document.getElementById('modalAddCompany').classList.add('hidden');
}

async function saveCompanyForm() {
  const name = document.getElementById('compName').value.trim();
  if (!name) {
    showToast('Company name is required', 'error');
    return;
  }

  const payload = {
    name,
    domain: document.getElementById('compDomain').value.trim(),
    industry: document.getElementById('compIndustry').value.trim(),
    city: document.getElementById('compCity').value.trim(),
    notes: document.getElementById('compNotes').value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Company added successfully', 'success');
      closeAddCompanyModal();
      await refreshAllData();
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// Prospect Profile Modal
async function openProspectProfile(companyId) {
  state.activeCompanyForProfile = companyId;
  const comp = state.companies.find(c => c.id === companyId);
  if (!comp) return;

  document.getElementById('profileCompanyTitle').innerText = comp.name;
  document.getElementById('profileCompanyDomain').innerText = `${comp.domain || 'No website'} &bull; ${comp.industry || 'Retail'} &bull; ${comp.city || ''}`;

  const dms = state.decisionMakers.filter(dm => dm.companyId === comp.id);
  const container = document.getElementById('profileDmsList');

  if (dms.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs bg-slate-900/50 rounded-lg">No decision-makers linked yet. Click "Add Contact" to associate one.</div>`;
  } else {
    container.innerHTML = dms.map(dm => {
      return `
        <div class="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">${dm.fullName}</span>
              ${getTierBadgeHtml(dm.priorityTier, dm.priorityRank)}
              ${getVerificationBadgeHtml(dm.verificationStatus, dm.id)}
            </div>
            <div class="text-xs text-amber-300 font-medium">${dm.designation}</div>
            <div class="text-xs text-slate-400 flex items-center gap-3">
              <span><i class="fa-solid fa-phone text-[10px]"></i> ${dm.phone}</span>
              ${dm.email ? `<span><i class="fa-regular fa-envelope text-[10px]"></i> ${dm.email}</span>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="startAutomatedCallBot('${dm.id}')" class="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow">
              <i class="fa-solid fa-robot"></i> Auto-Call
            </button>
            <button onclick="startCallFromMyNumber('${dm.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow">
              <i class="fa-solid fa-phone"></i> Call
            </button>
            <button onclick="openEmailProposalModal('${dm.id}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow">
              <i class="fa-solid fa-envelope"></i> Mail
            </button>
            <button onclick="openShareModal('${dm.id}')" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow">
              <i class="fa-solid fa-paper-plane"></i> Share
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('modalProspectProfile').classList.remove('hidden');
}

function closeProspectProfile() {
  document.getElementById('modalProspectProfile').classList.add('hidden');
}

function addDmForActiveCompany() {
  const comp = state.companies.find(c => c.id === state.activeCompanyForProfile);
  if (comp) {
    closeProspectProfile();
    openAddDecisionMakerModal(comp.name);
  }
}

function shareForCompanyProfile() {
  const comp = state.companies.find(c => c.id === state.activeCompanyForProfile);
  if (comp) {
    closeProspectProfile();
    openShareModalForCompany(comp.name);
  }
}

function openShareModalForCompany(companyName) {
  openShareModal();
  document.getElementById('shareCompanyName').value = companyName;
  updateSharePreview();
}

// ==========================================
// RESEARCH & DISCOVERY MODULE
// ==========================================
function generateSearchQueries() {
  const name = document.getElementById('resCompanyName').value.trim();
  const domain = document.getElementById('resDomain').value.trim();
  if (!name) {
    showToast('Enter a company name first', 'error');
    return;
  }

  fetch(`${API_BASE}/research/queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyName: name, domain })
  })
  .then(res => res.json())
  .then(json => {
    if (!json.success) return;
    const queries = json.data;
    const grid = document.getElementById('queriesGrid');
    grid.innerHTML = `
      <div class="bg-slate-900/80 border border-amber-500/30 rounded-lg p-3 space-y-2">
        <h5 class="text-xs font-bold text-amber-400 flex items-center gap-1"><i class="fa-solid fa-crown text-[10px]"></i> 1st Preference (Owner, MD, CEO)</h5>
        ${queries.tier1Queries.map(q => `
          <div class="text-[11px] font-mono bg-slate-950 p-2 rounded text-slate-300 hover:text-white cursor-pointer select-all" onclick="copyTextToClipboard('${q.replace(/'/g, "\\'")}')" title="Click to copy">
            ${q}
          </div>
        `).join('')}
      </div>

      <div class="bg-slate-900/80 border border-purple-500/30 rounded-lg p-3 space-y-2">
        <h5 class="text-xs font-bold text-purple-400 flex items-center gap-1"><i class="fa-solid fa-bullhorn text-[10px]"></i> 2nd Preference (Marketing)</h5>
        ${queries.tier2Queries.map(q => `
          <div class="text-[11px] font-mono bg-slate-950 p-2 rounded text-slate-300 hover:text-white cursor-pointer select-all" onclick="copyTextToClipboard('${q.replace(/'/g, "\\'")}')" title="Click to copy">
            ${q}
          </div>
        `).join('')}
      </div>

      <div class="bg-slate-900/80 border border-blue-500/30 rounded-lg p-3 space-y-2">
        <h5 class="text-xs font-bold text-blue-400 flex items-center gap-1"><i class="fa-solid fa-chart-line text-[10px]"></i> 3rd Preference (Sales)</h5>
        ${queries.tier3Queries.map(q => `
          <div class="text-[11px] font-mono bg-slate-950 p-2 rounded text-slate-300 hover:text-white cursor-pointer select-all" onclick="copyTextToClipboard('${q.replace(/'/g, "\\'")}')" title="Click to copy">
            ${q}
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('queriesContainer').classList.remove('hidden');
    showToast('Targeted search queries generated!', 'success');
  });
}

function copyTextToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Search query copied to clipboard!', 'success');
  });
}

async function runAutomatedDiscovery() {
  const name = document.getElementById('resCompanyName').value.trim();
  const domain = document.getElementById('resDomain').value.trim();
  const industry = document.getElementById('resIndustry').value.trim();
  const city = document.getElementById('resCity').value.trim();

  if (!name) {
    showToast('Please enter the target company name', 'error');
    return;
  }

  const btn = document.getElementById('btnRunDiscovery');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Researching...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/research/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain, industry, city })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Discovery failed', 'error');
      return;
    }

    state.discoveredCandidates = json.data.candidates;
    renderDiscoveryResults(json.data);
    showToast(`Discovered ${json.data.candidatesFound} decision-makers!`, 'success');
  } catch (err) {
    showToast('Error running discovery: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-robot"></i> Run Automated Discovery';
    btn.disabled = false;
  }
}

function renderDiscoveryResults(data) {
  const container = document.getElementById('discoveryResultsContainer');
  const list = document.getElementById('discoveryCandidatesList');
  container.classList.remove('hidden');

  list.innerHTML = data.candidates.map(c => {
    return `
      <div class="bg-slate-900/90 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-white text-sm">${c.fullName}</h4>
            ${getTierBadgeHtml(c.priorityTier, c.priorityRank)}
            ${getVerificationBadgeHtml(c.verificationStatus, 'preview')}
          </div>
          <p class="text-xs font-semibold text-amber-300">${c.designation}</p>
          <div class="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span><i class="fa-solid fa-phone text-[10px] text-slate-400"></i> ${c.phone}</span>
            <span><i class="fa-regular fa-envelope text-[10px] text-slate-400"></i> ${c.email}</span>
            <a href="${c.sourceUrl}" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1">
              <i class="fa-solid fa-link text-[10px]"></i> ${c.sourceUrl}
            </a>
          </div>
          <p class="text-[11px] text-slate-400 italic">${c.verificationMethod}</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="startAutomatedCallBotCustom('${c.fullName.replace(/'/g, "\\'")}', '${c.phone}', '${c.companyName.replace(/'/g, "\\'")}', '${c.designation.replace(/'/g, "\\'")}')" class="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-1.5 shadow">
            <i class="fa-solid fa-robot"></i> Auto-Call (AI)
          </button>
          <button onclick="callDiscoveredPerson('${c.fullName.replace(/'/g, "\\'")}', '${c.phone}', '${c.companyName.replace(/'/g, "\\'")}', '${c.designation.replace(/'/g, "\\'")}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow">
            <i class="fa-solid fa-phone"></i> Call from 8518900153
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function saveAllDiscoveredCandidates() {
  if (!state.discoveredCandidates || state.discoveredCandidates.length === 0) {
    showToast('No candidates to save', 'error');
    return;
  }

  const compName = document.getElementById('resCompanyName').value.trim();
  const domain = document.getElementById('resDomain').value.trim();
  const industry = document.getElementById('resIndustry').value.trim();
  const city = document.getElementById('resCity').value.trim();

  // First ensure company exists in db
  let comp = state.companies.find(c => c.name.toLowerCase() === compName.toLowerCase());
  let compId = comp ? comp.id : null;

  if (!compId) {
    const compRes = await fetch(`${API_BASE}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: compName, domain, industry, city })
    });
    const compJson = await compRes.json();
    if (compJson.success) {
      compId = compJson.data.id;
    }
  }

  // Now save candidates
  try {
    const res = await fetch(`${API_BASE}/research/save-candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId: compId, candidates: state.discoveredCandidates })
    });

    const json = await res.json();
    if (json.success) {
      showToast(`Saved ${json.savedCount} decision-makers directly to database!`, 'success');
      document.getElementById('discoveryResultsContainer').classList.add('hidden');
      await refreshAllData();
      switchTab('decisionMakers');
    }
  } catch (err) {
    showToast('Failed to save candidates: ' + err.message, 'error');
  }
}

// ==========================================
// SALES CALLS & POST-CALL LOGGING
// ==========================================
function openManualCallModal(dmId = null) {
  const select = document.getElementById('callSelectDm');
  select.innerHTML = '';

  state.decisionMakers.forEach(dm => {
    const opt = document.createElement('option');
    opt.value = dm.id;
    opt.innerText = `${dm.fullName} (${dm.designation} - ${dm.companyName})`;
    if (dmId && dm.id === dmId) opt.selected = true;
    select.appendChild(opt);
  });

  document.getElementById('callNotes').value = '';
  document.getElementById('callOutcome').value = 'Interested';
  document.getElementById('callConsentCheck').checked = true;
  document.getElementById('postCallShareSection').classList.remove('hidden');

  document.getElementById('modalCall').classList.remove('hidden');
}

function closeCallModal() {
  document.getElementById('modalCall').classList.add('hidden');
}

function onCallDmChanged() {
  // Can adapt notes if needed
}

function onCallOutcomeChanged() {
  const outcome = document.getElementById('callOutcome').value;
  const postCallSection = document.getElementById('postCallShareSection');
  if (outcome === 'Interested' || outcome === 'Follow-up Requested') {
    postCallSection.classList.remove('hidden');
  } else {
    postCallSection.classList.add('hidden');
  }
}

async function saveCallRecord(andShare = false) {
  const dmId = document.getElementById('callSelectDm').value;
  const outcome = document.getElementById('callOutcome').value;
  const notes = document.getElementById('callNotes').value.trim();
  const consent = document.getElementById('callConsentCheck').checked;

  const dm = state.decisionMakers.find(d => d.id === dmId);
  if (!dm) {
    showToast('Please select a valid decision-maker', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: dm.companyId,
        decisionMakerId: dm.id,
        outcome,
        notes,
        referralShared: andShare,
        consentVerified: consent,
        channel: andShare ? 'WhatsApp' : null
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to save call', 'error');
      return;
    }

    showToast('Sales call record saved!', 'success');
    closeCallModal();
    await refreshAllData();

    if (andShare) {
      // Open share modal pre-populated for this decision maker
      openShareModal(dm.id);
      document.getElementById('shareConsentCheckbox').checked = consent;
    }
  } catch (err) {
    showToast('Error logging call: ' + err.message, 'error');
  }
}

function renderCalls() {
  const container = document.getElementById('callsListContainer');
  if (!container) return;

  if (state.calls.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No calls logged yet.</div>`;
    return;
  }

  container.innerHTML = state.calls.map(c => {
    return `
      <div class="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 space-y-2 text-xs">
        <div class="flex items-center justify-between">
          <div class="font-bold text-white">${c.decisionMakerName} &bull; <span class="text-amber-300">${c.companyName}</span></div>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${c.outcome === 'Interested' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}">
            ${c.outcome}
          </span>
        </div>
        <p class="text-slate-300">${c.notes || 'No discussion notes provided.'}</p>
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
          <span>${new Date(c.calledAt).toLocaleString()}</span>
          ${c.referralShared ? `<span class="text-emerald-400 font-semibold"><i class="fa-solid fa-check"></i> Referral Link Shared (${c.sharedVia || 'WhatsApp'})</span>` : `<span class="text-slate-500">Link not yet shared</span>`}
        </div>
      </div>
    `;
  }).join('');
}

function renderShareLogs() {
  const container = document.getElementById('shareLogsContainer');
  if (!container) return;

  if (state.shareLogs.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs">No referral shares recorded yet.</div>`;
    return;
  }

  container.innerHTML = state.shareLogs.map(s => {
    return `
      <div class="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-bold text-white">${s.recipientName}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            ${s.channel}
          </span>
        </div>
        <div class="text-slate-400 text-[11px] font-mono">${s.referralUrl}</div>
        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span class="text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-lock"></i> Consent Verified</span>
          <span>${new Date(s.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// ACTIVE CALLING BOT (FROM USER'S NUMBER: 8518900153)
// ==========================================
let activeCallSessionData = null;

async function startCallFromMyNumber(dmId) {
  const dm = state.decisionMakers.find(d => d.id === dmId);
  if (!dm) {
    showToast('Decision-maker not found', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionMakerId: dmId })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to initiate call', 'error');
      return;
    }

    renderActiveCallModal(json.data);
  } catch (err) {
    showToast('Network error: ' + err.message, 'error');
  }
}

async function callDiscoveredPerson(fullName, phone, companyName, designation) {
  try {
    const res = await fetch(`${API_BASE}/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPhone: phone,
        customName: fullName,
        customCompany: companyName,
        customDesignation: designation
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to initiate call', 'error');
      return;
    }

    json.data.targetName = fullName;
    json.data.targetCompany = companyName;
    json.data.targetDesignation = designation;

    renderActiveCallModal(json.data);
  } catch (err) {
    showToast('Error initiating call: ' + err.message, 'error');
  }
}

function renderActiveCallModal(sess) {
  activeCallSessionData = sess;

  document.getElementById('activeCallMyNumber').innerText = sess.callerNumber;
  document.getElementById('activeCallTargetName').innerText = sess.targetName;
  document.getElementById('activeCallTargetRole').innerText = `${sess.targetDesignation || 'Executive'} • ${sess.targetCompany || 'Merchant'}`;
  document.getElementById('activeCallTargetPhone').innerText = sess.targetNumber;

  // Direct Dial Links
  document.getElementById('btnDirectDialTel').href = sess.dialTelUri;
  document.getElementById('btnDirectDialWhatsApp').href = sess.whatsappDialUri;

  // Set QR Code for Instant Phone Camera Dialing
  const qrImg = document.getElementById('qrDialImage');
  if (qrImg && sess.dialQrCodeUrl) {
    qrImg.src = sess.dialQrCodeUrl;
  }

  // Live In-Call Script
  document.getElementById('scriptGreeting').innerText = `"${sess.script.openingGreeting}"`;
  document.getElementById('scriptProposition').innerText = `"${sess.script.coreProposition}"`;
  document.getElementById('scriptCta').innerHTML = `"${sess.script.callToAction} ${sess.script.objectionHandled}"`;

  // Reset bridge button
  const bridgeBtn = document.getElementById('btnTriggerBridge');
  if (bridgeBtn) {
    bridgeBtn.innerHTML = '<i class="fa-solid fa-phone-arrow-up-right"></i> Ring My Phone (+91 8518900153)';
    bridgeBtn.disabled = false;
  }

  document.getElementById('modalActiveCall').classList.remove('hidden');
  showToast(`Active call session initiated from your number ${sess.callerNumber}!`, 'success');
}

async function triggerCallBridge() {
  if (!activeCallSessionData) return;

  const btn = document.getElementById('btnTriggerBridge');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ringing Your Phone (+91 8518900153)...';
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE}/calls/bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decisionMakerId: activeCallSessionData.decisionMakerId,
        customPhone: activeCallSessionData.targetNumber
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Cloud Bridge initiated! Your phone +91 8518900153 will ring now.', 'success');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-phone-volume text-emerald-400"></i> Bridged to ' + activeCallSessionData.targetName;
      }
    } else {
      showToast(json.error || 'Failed to trigger bridge', 'error');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-phone-arrow-up-right"></i> Ring My Phone (+91 8518900153)';
        btn.disabled = false;
      }
    }
  } catch (err) {
    showToast('Bridge error: ' + err.message, 'error');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-phone-arrow-up-right"></i> Ring My Phone (+91 8518900153)';
      btn.disabled = false;
    }
  }
}

function closeActiveCallModal() {
  document.getElementById('modalActiveCall').classList.add('hidden');
  activeCallSessionData = null;
}

async function finishActiveCall(andShareReferral = false) {
  if (!activeCallSessionData) return;

  const outcome = document.getElementById('activeCallOutcomeSelect').value;
  const consent = document.getElementById('activeCallConsentChecked').checked;

  try {
    const res = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: activeCallSessionData.companyId,
        decisionMakerId: activeCallSessionData.decisionMakerId,
        outcome,
        notes: `Call from agent line ${activeCallSessionData.callerNumber} to ${activeCallSessionData.targetName} (${activeCallSessionData.targetDesignation} - ${activeCallSessionData.targetCompany}). Outcome: ${outcome}.`,
        referralShared: andShareReferral,
        consentVerified: consent,
        channel: andShareReferral ? 'WhatsApp' : null
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to save call record', 'error');
      return;
    }

    showToast('Call logged successfully!', 'success');
    closeActiveCallModal();
    await refreshAllData();

    if (andShareReferral) {
      if (!consent) {
        showToast('Consent confirmation required to dispatch referral link.', 'error');
        return;
      }
      openShareModal(activeCallSessionData.decisionMakerId);
      document.getElementById('shareConsentCheckbox').checked = true;
      document.getElementById('shareProspectName').value = activeCallSessionData.targetName;
      document.getElementById('shareCompanyName').value = activeCallSessionData.targetCompany;
      document.getElementById('sharePhone').value = activeCallSessionData.targetNumber;
      updateSharePreview();
    }
  } catch (err) {
    showToast('Failed to complete call: ' + err.message, 'error');
  }
}

// ==========================================
// AUTONOMOUS AI CALLING BOT ENGINE
// ==========================================
let activeAutoCallData = null;
let autoCallTimerInterval = null;
let autoCallSeconds = 0;
let voiceSpeechEnabled = true;

function toggleVoiceSpeech() {
  voiceSpeechEnabled = !voiceSpeechEnabled;
  const icon = document.getElementById('voiceToggleIcon');
  const label = document.getElementById('voiceToggleLabel');
  if (voiceSpeechEnabled) {
    if (icon) icon.className = 'fa-solid fa-volume-high text-amber-400';
    if (label) label.innerText = 'Voice ON';
    showToast('Voice Audio Enabled', 'info');
  } else {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (icon) icon.className = 'fa-solid fa-volume-xmark text-slate-400';
    if (label) label.innerText = 'Voice MUTED';
    showToast('Voice Audio Muted', 'info');
  }
}

function speakBotText(text) {
  if (!voiceSpeechEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const inVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India')) ||
                  voices.find(v => v.lang.startsWith('en')) ||
                  voices[0];
  if (inVoice) utterance.voice = inVoice;

  window.speechSynthesis.speak(utterance);
}

function addTranscriptBubble(sender, text, isSpecial = false) {
  const container = document.getElementById('botTranscriptContainer');
  if (!container) return;

  const bubble = document.createElement('div');
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (sender === 'bot') {
    bubble.className = 'bg-indigo-950/70 border border-indigo-500/30 rounded-xl p-3 space-y-1 text-xs text-slate-200 animate-scale-in';
    bubble.innerHTML = `
      <div class="flex items-center justify-between text-[10px] text-indigo-400 font-bold">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-robot text-purple-400"></i> Go Extra Mile AI Bot</span>
        <span class="text-slate-500 font-mono">${timeStr}</span>
      </div>
      <p class="leading-relaxed ${isSpecial ? 'text-amber-200 font-semibold' : ''}">${text}</p>
    `;
  } else {
    bubble.className = 'bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1 text-xs text-slate-200 animate-scale-in ml-6';
    bubble.innerHTML = `
      <div class="flex items-center justify-between text-[10px] text-emerald-400 font-bold">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-user"></i> Prospect (${activeAutoCallData ? activeAutoCallData.targetName : 'Decision-Maker'})</span>
        <span class="text-slate-500 font-mono">${timeStr}</span>
      </div>
      <p class="leading-relaxed italic">${text}</p>
    `;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

async function startAutomatedCallBot(dmId) {
  try {
    const res = await fetch(`${API_BASE}/calls/auto-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionMakerId: dmId })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to start automated call', 'error');
      return;
    }

    launchAutoCallSession(json.data);
  } catch (err) {
    showToast('Auto-call error: ' + err.message, 'error');
  }
}

async function startAutomatedCallBotCustom(name, phone, company, designation) {
  try {
    const res = await fetch(`${API_BASE}/calls/auto-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPhone: phone,
        customName: name,
        customCompany: company,
        customDesignation: designation
      })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to start automated call', 'error');
      return;
    }

    json.data.targetName = name;
    json.data.targetCompany = company;
    json.data.targetDesignation = designation;

    launchAutoCallSession(json.data);
  } catch (err) {
    showToast('Auto-call error: ' + err.message, 'error');
  }
}

async function startAutoCallQueueCampaign(tier = 1) {
  try {
    const res = await fetch(`${API_BASE}/calls/auto-queue?tier=${tier}`);
    const json = await res.json();
    if (!json.success || !json.data || json.data.length === 0) {
      showToast('No uncalled Tier 1 decision-makers in queue.', 'info');
      return;
    }

    const first = json.data[0];
    showToast(`Launching Autonomous Calling Campaign for ${first.fullName} (${first.designation})...`, 'info');
    startAutomatedCallBot(first.id);
  } catch (err) {
    showToast('Campaign queue error: ' + err.message, 'error');
  }
}

function launchAutoCallSession(callData) {
  activeAutoCallData = callData;

  document.getElementById('autoCallTargetName').innerText = callData.targetName;
  document.getElementById('autoCallTargetDesignation').innerText = `${callData.targetDesignation} • ${callData.targetCompany}`;
  document.getElementById('autoCallTargetPhone').innerText = callData.targetNumber;

  // Display TwiML
  const twimlEl = document.getElementById('codeTwimlDisplay');
  if (twimlEl) twimlEl.innerText = callData.twiml;

  // Clear and reset transcript
  const transcript = document.getElementById('botTranscriptContainer');
  if (transcript) transcript.innerHTML = '';

  // Reset timer
  clearInterval(autoCallTimerInterval);
  autoCallSeconds = 0;
  const durEl = document.getElementById('botCallDuration');
  if (durEl) durEl.innerText = '00:00';
  autoCallTimerInterval = setInterval(() => {
    autoCallSeconds++;
    const m = String(Math.floor(autoCallSeconds / 60)).padStart(2, '0');
    const s = String(autoCallSeconds % 60).padStart(2, '0');
    if (durEl) durEl.innerText = `${m}:${s}`;
  }, 1000);

  document.getElementById('modalAutoCallBot').classList.remove('hidden');

  // Step 1: Greeting
  const turn1 = callData.dialogTurns[0];
  setTimeout(() => {
    addTranscriptBubble('bot', turn1.botAudioText);
    speakBotText(turn1.botAudioText);
  }, 600);

  // Step 2: Pitch
  setTimeout(() => {
    if (activeAutoCallData) {
      const turn2 = callData.dialogTurns[1];
      addTranscriptBubble('bot', turn2.botAudioText);
      speakBotText(turn2.botAudioText);
    }
  }, 5000);
}

function advanceBotStep(intent) {
  if (!activeAutoCallData) return;

  if (intent === 'cost_query') {
    addTranscriptBubble('prospect', 'What does it cost to list our brand on Go Extra Mile?');
    setTimeout(() => {
      const answer = 'There are absolutely zero upfront listing fees. Your brand retains 100% control over your discount percentages, featured products, and campaign duration.';
      addTranscriptBubble('bot', answer);
      speakBotText(answer);
    }, 800);
  } else if (intent === 'interested') {
    addTranscriptBubble('prospect', 'Yes, that sounds great. Go ahead and send me the partner onboarding link on WhatsApp.');
    setTimeout(() => {
      const closing = `Wonderful, ${activeAutoCallData.targetName}! Dispatching our official partner onboarding link (https://www.goextramile.in/r?code=GOMILES) to your WhatsApp (${activeAutoCallData.targetNumber}) right now. Referral code GOMILES is already applied for prioritized onboarding!`;
      addTranscriptBubble('bot', closing, true);
      speakBotText(closing);

      setTimeout(() => {
        dispatchBotReferralWhatsApp();
      }, 1500);
    }, 800);
  } else if (intent === 'email_requested') {
    addTranscriptBubble('prospect', 'Can you please email me the official merchant campaign proposal and onboarding link?');
    setTimeout(() => {
      const emailTarget = activeAutoCallData.targetEmail || 'your email';
      const closing = `Certainly, ${activeAutoCallData.targetName}! I am sending our complete Go Extra Mile merchant proposal and partner registration link (https://www.goextramile.in/r?code=GOMILES) directly to ${emailTarget}. Our partnerships team will assist you with listing your deals!`;
      addTranscriptBubble('bot', closing, true);
      speakBotText(closing);

      setTimeout(() => {
        dispatchBotReferralEmail();
      }, 1500);
    }, 800);
  }
}

async function dispatchBotReferralWhatsApp() {
  if (!activeAutoCallData) return;

  try {
    const res = await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: activeAutoCallData.companyId,
        decisionMakerId: activeAutoCallData.decisionMakerId,
        outcome: 'Interested (Automated AI Call)',
        notes: `Autonomous AI Voice Bot pitched Go Extra Mile merchant deals & product listing. Decision-maker consented to receive onboarding link.`,
        referralShared: true,
        sharedVia: 'WhatsApp',
        consentVerified: true,
        channel: 'WhatsApp'
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to log call', 'error');
      return;
    }

    showToast('Automated Call Completed & Logged: Referral Link Sent!', 'success');
    await refreshAllData();

    const targetClean = activeAutoCallData.targetNumber.replace(/[^0-9]/g, '');
    const cleanPhone = targetClean.startsWith('91') ? targetClean : '91' + targetClean.slice(-10);
    const msgText = encodeURIComponent(`Hi ${activeAutoCallData.targetName}, great speaking with you! Here is the official Go Extra Mile partner portal link to list ${activeAutoCallData.targetCompany}'s exclusive deals and offers: https://www.goextramile.in/r?code=GOMILES (Referral Code: GOMILES)`);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msgText}`;

    window.open(waUrl, '_blank');
  } catch (err) {
    showToast('Error sending referral link: ' + err.message, 'error');
  }
}

function closeAutoCallModal() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  clearInterval(autoCallTimerInterval);
  document.getElementById('modalAutoCallBot').classList.add('hidden');
  activeAutoCallData = null;
}

function endAutoCall() {
  if (!activeAutoCallData) return;
  closeAutoCallModal();
  showToast('Automated call session ended.', 'info');
}

async function dispatchBotReferralEmail() {
  if (!activeAutoCallData) return;

  const dm = state.decisionMakers.find(d => d.id === activeAutoCallData.decisionMakerId);
  const email = (dm && dm.email) ? dm.email : (activeAutoCallData.targetEmail || '');

  openEmailProposalModal(activeAutoCallData.decisionMakerId, {
    recipientName: activeAutoCallData.targetName,
    companyName: activeAutoCallData.targetCompany,
    recipientEmail: email
  });
}

// ==========================================
// EMAIL MERCHANT PROPOSAL MODAL & ACTIONS
// ==========================================
let activeEmailProposalData = null;

async function openEmailProposalModal(dmId, overrideData = null) {
  let dm = null;
  if (dmId) {
    dm = state.decisionMakers.find(d => d.id === dmId);
  }

  const name = overrideData ? overrideData.recipientName : (dm ? dm.fullName : 'Partner');
  const company = overrideData ? overrideData.companyName : (dm ? dm.companyName : 'your brand');
  const email = overrideData ? overrideData.recipientEmail : (dm ? (dm.email || '') : '');
  const companyId = dm ? dm.companyId : (activeAutoCallData ? activeAutoCallData.companyId : null);

  activeEmailProposalData = {
    decisionMakerId: dmId,
    companyId,
    name,
    company,
    email
  };

  document.getElementById('emailPropName').value = name;
  document.getElementById('emailPropCompany').value = company;
  document.getElementById('emailPropAddress').value = email;

  const url = state.settings.referral?.officialUrl || 'https://www.goextramile.in/r?code=GOMILES';
  const code = state.settings.referral?.referralCode || 'GOMILES';

  const tpl = state.templates.find(t => t.id === 'tpl_email_merchant_campaign') || state.templates.find(t => t.type === 'email') || state.templates[0];
  const subject = (tpl.subject || 'Run {{companyName}}\'s Deals & Exclusive Offers on Go Extra Mile App')
    .replace(/{{name}}/g, name)
    .replace(/{{companyName}}/g, company);

  const body = (tpl.body || '')
    .replace(/{{name}}/g, name)
    .replace(/{{companyName}}/g, company)
    .replace(/{{referralUrl}}/g, url)
    .replace(/{{referralCode}}/g, code);

  document.getElementById('emailPropSubject').value = subject;
  document.getElementById('emailPropBody').value = body;

  document.getElementById('modalEmailProposal').classList.remove('hidden');
}

function closeEmailProposalModal() {
  document.getElementById('modalEmailProposal').classList.add('hidden');
  activeEmailProposalData = null;
}

function copyEmailProposalBody() {
  const body = document.getElementById('emailPropBody').value;
  navigator.clipboard.writeText(body).then(() => {
    showToast('Email proposal body & referral link copied to clipboard!', 'success');
  });
}

async function executeSendEmailProposal() {
  const name = document.getElementById('emailPropName').value.trim();
  const company = document.getElementById('emailPropCompany').value.trim();
  const email = document.getElementById('emailPropAddress').value.trim();
  const subject = document.getElementById('emailPropSubject').value.trim();
  const body = document.getElementById('emailPropBody').value.trim();

  if (!email) {
    showToast('Please enter recipient email address', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/referral/email-proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: activeEmailProposalData ? activeEmailProposalData.companyId : null,
        decisionMakerId: activeEmailProposalData ? activeEmailProposalData.decisionMakerId : null,
        recipientName: name,
        recipientEmail: email,
        companyName: company,
        customSubject: subject,
        customBody: body
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to generate email proposal', 'error');
      return;
    }

    showToast('Merchant proposal & referral link logged! Launching email...', 'success');
    closeEmailProposalModal();
    await refreshAllData();

    // Open mail client (Outlook / Apple Mail / default)
    window.location.href = json.data.mailtoUrl;
  } catch (err) {
    showToast('Email error: ' + err.message, 'error');
  }
}

// ==========================================
// SETTINGS
// ==========================================
async function saveSettings() {
  const url = document.getElementById('settingsReferralUrl').value.trim();
  const pitch = document.getElementById('settingsPitch').value.trim();
  const agentPhone = document.getElementById('settingsAgentPhone') ? document.getElementById('settingsAgentPhone').value.trim() : '+91 8518900153';
  const agentName = document.getElementById('settingsAgentName') ? document.getElementById('settingsAgentName').value.trim() : 'Ritik Jain';

  // Guardrail check: Referral code GOMILES must be in the URL
  if (!url.includes('code=GOMILES')) {
    showToast('Protected Parameter: Official link must include "?code=GOMILES"', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referral: {
          officialUrl: url,
          referralCode: 'GOMILES',
          salesPitch: pitch
        },
        caller: {
          agentPhone,
          agentName
        }
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to save settings', 'error');
      return;
    }

    showToast('Settings & Caller Line saved successfully!', 'success');
    await loadSettings();
  } catch (err) {
    showToast('Error saving settings: ' + err.message, 'error');
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white border border-slate-700';

  toast.className = `${bg} px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 pointer-events-auto toast-enter`;
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : type === 'error' ? '<i class="fa-solid fa-triangle-exclamation"></i>' : '<i class="fa-solid fa-circle-info"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==========================================
// AUTOMATIC WEBSITE LEAD FETCHER & CRAWLER
// ==========================================
function openFetchWebsiteModal() {
  const modal = document.getElementById('modalFetchWebsite');
  if (!modal) return;
  document.getElementById('webFetchUrlInput').value = '';
  document.getElementById('webFetchProgressBox').classList.add('hidden');
  document.getElementById('webFetchResultCard').classList.add('hidden');
  modal.classList.remove('hidden');
}

function closeFetchWebsiteModal() {
  const modal = document.getElementById('modalFetchWebsite');
  if (modal) modal.classList.add('hidden');
}

function quickFillWebsite(domain) {
  const input = document.getElementById('webFetchUrlInput');
  if (input) input.value = domain;
}

function quickFillAndFetch(domain) {
  openFetchWebsiteModal();
  quickFillWebsite(domain);
  executeFetchFromWebsite();
}

function quickFetchFromDashboard() {
  const url = document.getElementById('dashQuickWebUrl')?.value.trim();
  if (!url) {
    showToast('Please enter a website URL or domain name.', 'error');
    return;
  }
  openFetchWebsiteModal();
  document.getElementById('webFetchUrlInput').value = url;
  executeFetchFromWebsite();
}

async function executeFetchFromWebsite() {
  const input = document.getElementById('webFetchUrlInput');
  const url = input?.value.trim();
  if (!url) {
    showToast('Please enter a website URL or domain name.', 'error');
    return;
  }

  const btn = document.getElementById('btnExecuteWebFetch');
  const progressBox = document.getElementById('webFetchProgressBox');
  const logList = document.getElementById('webFetchLogList');
  const statusText = document.getElementById('webFetchStatusText');
  const resultCard = document.getElementById('webFetchResultCard');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Crawling...';
  progressBox.classList.remove('hidden');
  resultCard.classList.add('hidden');
  logList.innerHTML = '';
  statusText.textContent = 'Connecting...';
  statusText.className = 'text-amber-400 font-bold';

  const appendLog = (msg, cls = 'text-slate-300') => {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = msg;
    logList.appendChild(div);
    logList.scrollTop = logList.scrollHeight;
  };

  appendLog(`[1/5] Initiating web crawler session for "${url}"...`);

  try {
    const res = await fetch(`${API_BASE}/leads/fetch-from-website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, autoSave: true })
    });

    const json = await res.json();

    if (!json.success) {
      statusText.textContent = 'Failed';
      statusText.className = 'text-rose-400 font-bold';
      appendLog(`[ERROR] ${json.error || 'Failed to crawl website.'}`, 'text-rose-400');
      showToast(json.error || 'Failed to crawl website', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Fetch & Generate Lead';
      return;
    }

    // Display logs from server
    if (json.logs && Array.isArray(json.logs)) {
      for (const log of json.logs) {
        appendLog(log, log.includes('[ERROR]') ? 'text-rose-400' : log.includes('[Database]') ? 'text-emerald-300 font-bold' : 'text-slate-300');
      }
    }

    statusText.textContent = 'Lead Generated!';
    statusText.className = 'text-emerald-400 font-bold';

    // Populate Extracted Result Card
    const comp = json.company;
    const dm = (json.decisionMakers && json.decisionMakers.length > 0) ? json.decisionMakers[0] : null;

    if (comp) {
      document.getElementById('resCompName').textContent = comp.name || comp.companyName;
      document.getElementById('resCompMeta').textContent = `${comp.industry || 'Merchant'} • ${comp.city || 'Pan-India'}`;
      document.getElementById('resCompUrl').textContent = comp.website || `https://${comp.domain}`;
    }

    if (dm) {
      document.getElementById('resDmName').textContent = dm.fullName;
      document.getElementById('resDmRole').textContent = `${dm.designation} (${dm.priorityLabel || 'Tier 1'})`;
      document.getElementById('resDmPhone').textContent = dm.phone || 'Direct phone verified';
      document.getElementById('resDmEmail').textContent = dm.email || 'Email verified';
      document.getElementById('resLeadTierBadge').textContent = `Tier ${dm.priorityTier}: ${dm.designation}`;

      // Set up Call Now button
      const btnCall = document.getElementById('btnResCallNow');
      btnCall.onclick = () => {
        closeFetchWebsiteModal();
        triggerCallModal(dm.id);
      };

      // Set up Email Proposal button
      const btnEmail = document.getElementById('btnResEmailProposal');
      btnEmail.onclick = () => {
        closeFetchWebsiteModal();
        openEmailProposalModal(dm.id);
      };
    }

    resultCard.classList.remove('hidden');
    showToast(`Lead generated successfully for ${comp.name || comp.companyName}!`, 'success');
    await refreshAllData();
  } catch (err) {
    statusText.textContent = 'Error';
    statusText.className = 'text-rose-400 font-bold';
    appendLog(`[ERROR] ${err.message}`, 'text-rose-400');
    showToast('Crawler error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Fetch & Generate Lead';
  }
}

async function triggerAutonomousWebCrawl(count = 2, category = 'all') {
  try {
    showToast(`Autonomous Web Crawler discovering ${count} merchant websites...`, 'info');
    const res = await fetch(`${API_BASE}/leads/auto-crawl-web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, category })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message || `Crawled and generated ${json.count} leads!`, 'success');
      await refreshAllData();
    } else {
      showToast(json.error || 'Failed to crawl web directory', 'error');
    }
  } catch (err) {
    showToast('Auto-crawl error: ' + err.message, 'error');
  }
}

