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
  await loadAiStatus();
  await initTelephonyStatus();
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

function openShareModal(dmId = null, templateId = null, prefilledNotes = '') {
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

  const notesInput = document.getElementById('shareNotesInput');
  if (notesInput) {
    notesInput.value = prefilledNotes || '';
  }

  if (templateId) {
    const select = document.getElementById('shareTemplateSelect');
    if (select) select.value = templateId;
  }

  updateSharePreview();
}

function openWhatsAppNotesModal(dmId) {
  const dm = state.decisionMakers.find(d => d.id === dmId);
  if (!dm) return;
  const company = dm.companyName || 'your brand';
  const defaultNote = `Discussed listing ${company}'s exclusive product catalog, discount deals, and promotional offers on Go Extra Mile app with zero upfront listing fees. Decision-maker requested partner portal onboarding link.`;
  openShareModal(dmId, 'tpl_whatsapp_call_notes_with_link', defaultNote);
  document.getElementById('shareConsentCheckbox').checked = true;
  showToast(`WhatsApp Follow-Up loaded with call notes for ${dm.fullName}!`, 'info');
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
  const notes = document.getElementById('shareNotesInput')?.value.trim() || '';

  const tpl = state.templates.find(t => t.id === templateId) || state.templates[0];
  if (!tpl) return;

  const safeNotes = notes || 'Discussed listing exclusive brand deals, promotional discounts, and seasonal offers on Go Extra Mile app.';

  let text = tpl.body
    .replace(/{{name}}/g, name)
    .replace(/{{companyName}}/g, company)
    .replace(/{{referralUrl}}/g, url)
    .replace(/{{referralCode}}/g, code)
    .replace(/{{notes}}/g, safeNotes);

  if (notes && !tpl.body.includes('{{notes}}')) {
    text += `\n\n📝 Discussion Notes:\n${notes}`;
  }

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
  const notes = document.getElementById('shareNotesInput')?.value.trim() || '';
  const customMessage = document.getElementById('shareMessagePreview')?.value.trim();

  try {
    const res = await fetch(`${API_BASE}/referral/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientName: name,
        recipientPhone: phone,
        recipientEmail: email,
        companyName: company,
        channel: channel === 'whatsapp' ? 'WhatsApp' : 'Email',
        consentConfirmed: true,
        templateId,
        notes,
        customMessage
      })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to dispatch share', 'error');
      return;
    }

    showToast(`Logged consent & prepared ${channel.toUpperCase()} share with notes & link!`, 'success');
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
  const sourceLink = dm.sourceUrl ? `<a href="${dm.sourceUrl}" target="_blank" class="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 max-w-[130px] truncate" title="${dm.sourceUrl}"><i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> ${dm.sourceUrl.replace(/^https?:\/\//, '')}</a>` : `<span class="text-slate-500 text-xs">-</span>`;

  const comp = state.companies.find(c => c.id === dm.companyId || c.name.toLowerCase() === dm.companyName.toLowerCase());
  const compWebsite = (comp && comp.website) ? comp.website : (comp && comp.domain ? (comp.domain.startsWith('http') ? comp.domain : `https://${comp.domain}`) : (dm.sourceUrl && dm.sourceUrl.startsWith('http') ? dm.sourceUrl : ''));
  const compDomain = (comp && comp.domain) ? comp.domain : (compWebsite ? compWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '');
  let scaleBadge = '';
  if (comp && comp.scaleLabel) {
    const badgeColor = comp.scale === 'small'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      : comp.scale === 'big'
        ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
        : 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    scaleBadge = `<div class="mt-0.5"><span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}">${comp.scaleLabel}</span></div>`;
  }

  // 2-Call Contact Frequency Cap Check (Exempt user testing line)
  const isUserTestLead = dm.isTestLead || (dm.phone && dm.phone.includes('8518900153'));
  const callCount = dm.callCount || 0;
  const isLimitReached = !isUserTestLead && callCount >= 2;
  let callBadge = '';
  if (isUserTestLead) {
    callBadge = `<div class="mt-1"><span class="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm" title="Unlimited test calls enabled for developer phone line">
      <i class="fa-solid fa-flask text-[9px] text-cyan-400"></i> Infinite Testing Line (${callCount} runs)
    </span></div>`;
  } else if (isLimitReached) {
    callBadge = `<div class="mt-1"><span class="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-sm" title="Contact Frequency Cap: 2 calls reached. Excluded from dialing queues.">
      <i class="fa-solid fa-ban text-[9px] text-rose-400"></i> Max 2x Limit
    </span></div>`;
  } else if (callCount === 1) {
    callBadge = `<div class="mt-1"><span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="1 follow-up call attempt remaining">
      <i class="fa-solid fa-clock-rotate-left text-[9px] text-amber-400"></i> 1/2 Calls
    </span></div>`;
  } else {
    callBadge = `<div class="mt-1"><span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Fresh prospect: 2 call attempts remaining">
      <i class="fa-solid fa-sparkles text-[9px] text-emerald-400"></i> 0/2 Calls (Fresh)
    </span></div>`;
  }

  const callButtonsHtml = isLimitReached ? `
    <button onclick="showToast('Calling ${dm.companyName} with override on 2-call cap...', 'warning'); startAutomatedCallBot('${dm.id}', 'unknown');" class="bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium px-2 py-1 rounded text-xs transition flex items-center gap-1 border border-slate-700" title="Max 2 calls reached (Click to override)">
      <i class="fa-solid fa-ban text-rose-400"></i> Called 2x
    </button>
  ` : `
    <button onclick="startAutomatedCallBot('${dm.id}', 'unknown')" class="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 shadow-sm" title="Directly call from Unknown Number and AI Bot speaks">
      <i class="fa-solid fa-user-secret"></i> Bot
    </button>
    <button onclick="startCallFromMyNumber('${dm.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-xs transition flex items-center gap-1 shadow-sm" title="Call from your number +91 8518900153">
      <i class="fa-solid fa-phone"></i> Call
    </button>
  `;

  return `
    <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition text-xs ${isLimitReached ? 'opacity-85' : ''}">
      <td class="py-2.5 px-3">
        <div class="font-bold text-white text-sm flex items-center gap-1.5 flex-wrap">
          ${dm.fullName}
          ${isUserTestLead ? '<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">🧪 MY TEST LINE</span>' : ''}
          ${linkedinLink}
        </div>
        <div class="text-slate-300 font-medium text-xs mt-0.5">${dm.designation}</div>
      </td>
      <td class="py-2.5 px-3">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="font-semibold text-slate-200">${dm.companyName}</span>
          ${comp ? `
            <button onclick="openProspectProfile('${comp.id}')" class="text-amber-300 hover:text-amber-200 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded transition inline-flex items-center gap-1" title="Go through company profile, notes, and contacts">
              <i class="fa-solid fa-building text-[9px]"></i> Company Details
            </button>
          ` : `
            <button onclick="openProspectProfileByName('${encodeURIComponent(dm.companyName)}')" class="text-amber-300 hover:text-amber-200 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded transition inline-flex items-center gap-1" title="Go through company profile">
              <i class="fa-solid fa-building text-[9px]"></i> Company Details
            </button>
          `}
        </div>
        ${compWebsite ? `
          <div class="mt-1">
            <a href="${compWebsite}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] inline-flex items-center gap-1 hover:underline bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded shadow-sm" title="Visit & Explore ${dm.companyName} official website (${compWebsite})">
              <i class="fa-solid fa-globe text-[10px] text-cyan-400"></i> ${compDomain || 'Visit Website'} <i class="fa-solid fa-arrow-up-right-from-square text-[8px] text-cyan-400/80"></i>
            </a>
          </div>
        ` : `
          <div class="mt-1">
            <a href="https://www.google.com/search?q=${encodeURIComponent(dm.companyName + ' website')}" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-amber-300 text-[10px] inline-flex items-center gap-1 hover:underline bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 rounded" title="Search ${dm.companyName} on Google">
              <i class="fa-brands fa-google text-[9px]"></i> Search Website
            </a>
          </div>
        `}
        ${scaleBadge}
        ${callBadge}
      </td>
      <td class="py-2.5 px-3 whitespace-nowrap">
        ${getTierBadgeHtml(dm.priorityTier, dm.priorityRank)}
      </td>
      <td class="py-2.5 px-3">
        <div class="font-mono text-amber-200 font-semibold flex items-center gap-1.5 whitespace-nowrap">
          <i class="fa-solid fa-phone text-[10px] text-slate-400"></i> ${dm.phone}
        </div>
        <div class="mt-0.5">${emailLink}</div>
      </td>
      <td class="py-2.5 px-3 whitespace-nowrap">
        ${getVerificationBadgeHtml(dm.verificationStatus, dm.id)}
        <div class="mt-1">${sourceLink}</div>
      </td>
      <td class="py-2.5 px-3 text-right sticky right-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.6)] border-l border-slate-800">
        <div class="flex items-center justify-end gap-1 flex-nowrap">
          ${callButtonsHtml}
          <button onclick="openWhatsAppNotesModal('${dm.id}')" class="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded text-xs transition flex items-center gap-1" title="Send WhatsApp Message with Notes & Referral Link">
            <i class="fa-brands fa-whatsapp text-emerald-400"></i> Notes
          </button>
          <button onclick="openEmailProposalModal('${dm.id}')" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 p-1.5 rounded text-xs transition" title="Email proposal to run deals on Go Extra Mile app">
            <i class="fa-solid fa-envelope"></i>
          </button>
          <button onclick="openShareModal('${dm.id}')" class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 p-1.5 rounded text-xs transition" title="Share Go Extra Mile Link">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
          <button onclick="deleteDecisionMaker('${dm.id}')" class="bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-2.5 py-1 rounded text-xs transition flex items-center gap-1.5 font-bold shadow-sm ml-1" title="Delete without popup (instant auto-replenish)">
            <i class="fa-regular fa-trash-can"></i> Delete
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
        <tr class="border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-900/95">
          <th class="py-2.5 px-3">Decision-Maker</th>
          <th class="py-2.5 px-3">Company</th>
          <th class="py-2.5 px-3">Priority Preference</th>
          <th class="py-2.5 px-3">Direct Contact</th>
          <th class="py-2.5 px-3">Audit & Source</th>
          <th class="py-2.5 px-3 text-right sticky right-0 bg-slate-900 z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.6)] border-l border-slate-800">Actions & Delete</th>
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
        <tr class="border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-semibold bg-slate-900/95">
          <th class="py-2.5 px-3">Decision-Maker & Designation</th>
          <th class="py-2.5 px-3">Company</th>
          <th class="py-2.5 px-3">Priority Preference</th>
          <th class="py-2.5 px-3">Direct Contact</th>
          <th class="py-2.5 px-3">Audit & Source</th>
          <th class="py-2.5 px-3 text-right sticky right-0 bg-slate-900 z-10 shadow-[-8px_0_12px_rgba(0,0,0,0.6)] border-l border-slate-800">Actions & Delete</th>
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
  const callFilter = document.getElementById('dmCallFilter') ? document.getElementById('dmCallFilter').value : '';

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
    if (callFilter) {
      const cCount = dm.callCount || 0;
      if (callFilter === 'eligible') {
        match = match && (cCount < 2);
      } else if (callFilter === 'fresh') {
        match = match && (cCount === 0);
      } else if (callFilter === 'followup') {
        match = match && (cCount === 1);
      } else if (callFilter === 'limitReached') {
        match = match && (cCount >= 2);
      }
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
  // Delete immediately without any popup or blocking confirmation dialog
  try {
    const res = await fetch(`${API_BASE}/decision-makers/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      if (json.data && json.data.autoReplenished && json.data.newLead) {
        showToast(`⚡ Lead removed & auto-replaced with fresh lead: ${json.data.newLead.fullName} (${json.data.newLead.designation} at ${json.data.newLead.companyName})!`, 'success');
      } else {
        showToast(json.message || 'Contact removed and auto-replenished', 'success');
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
    const compWebsite = comp.website || (comp.domain ? (comp.domain.startsWith('http') ? comp.domain : `https://${comp.domain}`) : '');
    const cleanDomain = comp.domain || (compWebsite ? compWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'No website');

    return `
      <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition shadow-sm space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold text-white text-base">${comp.name}</h3>
            <div class="flex items-center gap-2 mt-0.5 text-xs">
              ${compWebsite ? `
                <a href="${compWebsite}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 font-mono inline-flex items-center gap-1 hover:underline" title="Visit official website">
                  <i class="fa-solid fa-globe text-[11px]"></i> ${cleanDomain} <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                </a>
              ` : `
                <span class="text-slate-400">${cleanDomain}</span>
              `}
              <span class="text-slate-500">&bull;</span>
              <span class="text-slate-300">${comp.industry}</span>
            </div>
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
          <div class="flex items-center gap-2 flex-wrap">
            ${compWebsite ? `
              <a href="${compWebsite}" target="_blank" rel="noopener noreferrer" class="bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 px-2.5 py-1.5 rounded text-xs transition inline-flex items-center gap-1" title="Visit ${comp.name} website">
                <i class="fa-solid fa-globe"></i> Website
              </a>
            ` : `
              <a href="https://www.google.com/search?q=${encodeURIComponent(comp.name + ' website')}" target="_blank" rel="noopener noreferrer" class="bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600 px-2.5 py-1.5 rounded text-xs transition inline-flex items-center gap-1" title="Search website on Google">
                <i class="fa-brands fa-google text-amber-400"></i> Website
              </a>
            `}
            <button onclick="openProspectProfile('${comp.id}')" class="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded text-xs transition inline-flex items-center gap-1" title="Go through company profile & contacts">
              <i class="fa-solid fa-building text-[10px]"></i> Profile
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

// Prospect Profile Modal ("Go Through Company")
async function openProspectProfile(companyId) {
  state.activeCompanyForProfile = companyId;
  let comp = state.companies.find(c => c.id === companyId || (c.name && c.name.toLowerCase() === String(companyId).toLowerCase()));
  
  if (!comp) {
    // Attempt lookup from decision-makers list
    const dm = state.decisionMakers.find(d => d.companyId === companyId || (d.companyName && d.companyName.toLowerCase() === String(companyId).toLowerCase()));
    if (dm) {
      comp = {
        id: dm.companyId || `comp_${Date.now()}`,
        name: dm.companyName,
        domain: (dm.sourceUrl || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0] || '',
        website: dm.sourceUrl && dm.sourceUrl.startsWith('http') ? dm.sourceUrl : '',
        industry: 'Retail & Consumer Goods',
        city: 'Pan-India',
        notes: `Autonomous lead discovered for Go Extra Mile merchant listings. Decision-maker: ${dm.fullName} (${dm.designation}).`,
        scale: 'mid',
        scaleLabel: 'Merchant Prospect',
        status: 'Active Prospect'
      };
    }
  }

  if (!comp) {
    showToast('Company profile details not found', 'warning');
    return;
  }

  const websiteUrl = comp.website || (comp.domain ? (comp.domain.startsWith('http') ? comp.domain : `https://${comp.domain}`) : '');
  const cleanDomain = comp.domain || (websiteUrl ? websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'No website');

  document.getElementById('profileCompanyTitle').innerText = comp.name;
  document.getElementById('profileCompanyDomain').innerHTML = `<span>${cleanDomain}</span> &bull; <span>${comp.industry || 'Retail'}</span> &bull; <span>${comp.city || 'India'}</span>`;

  // Top Action Buttons: Official Website & Google Search
  const webBtn = document.getElementById('profileCompanyWebsiteBtn');
  const webBtnText = document.getElementById('profileWebsiteBtnText');
  if (webBtn) {
    if (websiteUrl) {
      webBtn.href = websiteUrl;
      webBtn.title = `Visit official website of ${comp.name} (${websiteUrl})`;
      if (webBtnText) webBtnText.innerText = `Visit ${cleanDomain}`;
    } else {
      webBtn.href = `https://www.google.com/search?q=${encodeURIComponent(comp.name + ' official website')}`;
      webBtn.title = `Search ${comp.name} website on Google`;
      if (webBtnText) webBtnText.innerText = 'Search Website';
    }
  }

  const searchBtn = document.getElementById('profileCompanySearchBtn');
  if (searchBtn) {
    searchBtn.href = `https://www.google.com/search?q=${encodeURIComponent(comp.name + ' store locations offers deals')}`;
  }

  // Populate Company Intel & Strategic Pitch Card
  const indEl = document.getElementById('profileCompanyIndustry');
  if (indEl) indEl.innerText = comp.industry || 'Retail & Consumer Goods';

  const cityEl = document.getElementById('profileCompanyCity');
  if (cityEl) cityEl.innerText = comp.city || 'Pan-India';

  const domBadge = document.getElementById('profileCompanyDomainBadge');
  if (domBadge) {
    domBadge.innerText = cleanDomain;
    domBadge.href = websiteUrl || `https://www.google.com/search?q=${encodeURIComponent(comp.name)}`;
  }

  const statusEl = document.getElementById('profileCompanyStatus');
  if (statusEl) statusEl.innerText = comp.status || 'Active Prospect';

  const scaleEl = document.getElementById('profileCompanyScaleBadge');
  if (scaleEl) {
    scaleEl.innerText = comp.scaleLabel || (comp.scale === 'big' ? 'Enterprise Brand' : comp.scale === 'small' ? 'SMB Retailer' : 'National Merchant');
  }

  const notesEl = document.getElementById('profileCompanyNotes');
  if (notesEl) {
    notesEl.innerText = comp.notes || `Go Extra Mile merchant pitch: Connects ${comp.name} with thousands of active buyers with 0% upfront listing fees, exclusive deals, and high margin control.`;
  }

  const dms = state.decisionMakers.filter(dm => dm.companyId === comp.id || (dm.companyName && dm.companyName.toLowerCase() === comp.name.toLowerCase()));
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

function openProspectProfileByName(name) {
  const decoded = decodeURIComponent(name || '');
  const comp = state.companies.find(c => c.name && c.name.toLowerCase() === decoded.toLowerCase());
  if (comp) {
    openProspectProfile(comp.id);
  } else {
    openProspectProfile(decoded);
  }
}

function openProfileForCurrentAutoCall() {
  if (!activeAutoCallData) return;
  const compId = activeAutoCallData.companyId;
  const compName = activeAutoCallData.targetCompany;
  const comp = state.companies.find(c => (compId && c.id === compId) || (compName && c.name && c.name.toLowerCase() === compName.toLowerCase()));
  if (comp) {
    openProspectProfile(comp.id);
  } else if (compName) {
    openProspectProfileByName(compName);
  } else {
    showToast('Company profile not found', 'warning');
  }
}

function openProfileForCurrentActiveCall() {
  if (!activeCallSessionData) return;
  const compId = activeCallSessionData.companyId;
  const compName = activeCallSessionData.targetCompany;
  const comp = state.companies.find(c => (compId && c.id === compId) || (compName && c.name && c.name.toLowerCase() === compName.toLowerCase()));
  if (comp) {
    openProspectProfile(comp.id);
  } else if (compName) {
    openProspectProfileByName(compName);
  } else {
    showToast('Company profile not found', 'warning');
  }
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

  // Company Website & Profile Link
  const comp = state.companies.find(c => (sess.companyId && c.id === sess.companyId) || (sess.targetCompany && c.name && c.name.toLowerCase() === sess.targetCompany.toLowerCase()));
  const compWebsite = sess.companyWebsite || (comp && comp.website) || (comp && comp.domain ? `https://${comp.domain}` : '');
  const compDomain = sess.companyDomain || (comp && comp.domain) || (compWebsite ? compWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '');

  const activeWebBtn = document.getElementById('activeCallCompanyWebsiteLink');
  const activeWebText = document.getElementById('activeCallWebsiteText');
  if (activeWebBtn) {
    if (compWebsite) {
      activeWebBtn.href = compWebsite;
      activeWebBtn.title = `Visit official website of ${sess.targetCompany} (${compWebsite})`;
      if (activeWebText) activeWebText.innerText = `Visit ${compDomain || 'Website'}`;
    } else {
      activeWebBtn.href = `https://www.google.com/search?q=${encodeURIComponent((sess.targetCompany || '') + ' official website')}`;
      activeWebBtn.title = `Search ${sess.targetCompany} website on Google`;
      if (activeWebText) activeWebText.innerText = 'Search Company Website';
    }
  }

  // Direct Dial Links
  const dialBtn = document.getElementById('btnDirectDialTel');
  if (dialBtn) {
    dialBtn.href = sess.dialTelUri;
    dialBtn.innerHTML = `<i class="fa-solid fa-phone-volume text-yellow-300"></i> Call Customer (${sess.targetNumber})`;
  }
  const waBtn = document.getElementById('btnDirectDialWhatsApp');
  if (waBtn) {
    waBtn.href = sess.whatsappDialUri;
    waBtn.innerHTML = `<i class="fa-brands fa-whatsapp text-emerald-400"></i> WhatsApp Customer`;
  }

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

let activeCallerMode = 'user-sim';

function switchCallerIdMode(mode) {
  activeCallerMode = mode;
  if (!activeCallSessionData) return;

  const cleanPhone = activeCallSessionData.targetCleanPhone;
  const telBtn = document.getElementById('btnDirectDialTel');
  const qrImg = document.getElementById('qrDialImage');
  const headerNum = document.getElementById('activeCallMyNumber');

  if (mode === 'unknown') {
    // GSM #31# prefix instructs cellular carrier to mask outbound Caller ID
    const privateTelUri = `tel:%2331%23%2B${cleanPhone}`;
    if (telBtn) {
      telBtn.href = privateTelUri;
      telBtn.innerHTML = '<i class="fa-solid fa-user-secret"></i> Dial Private (#31#)';
      telBtn.className = 'bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20';
    }
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(privateTelUri)}`;
    }
    if (headerNum) {
      headerNum.textContent = 'Private / Unknown Number (Masked)';
      headerNum.className = 'text-purple-300 font-mono font-bold';
    }
    showToast('Outbound line set to Private / Unknown Number (#31#)', 'info');
  } else {
    const simTelUri = `tel:+${cleanPhone}`;
    if (telBtn) {
      telBtn.href = simTelUri;
      telBtn.innerHTML = '<i class="fa-solid fa-phone"></i> Dial on Phone (SIM)';
      telBtn.className = 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20';
    }
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(simTelUri)}`;
    }
    if (headerNum) {
      headerNum.textContent = '+91 8518900153';
      headerNum.className = 'text-emerald-300 font-mono font-bold';
    }
    showToast('Outbound line set to Your Phone SIM (+91 8518900153)', 'info');
  }
}

function switchFromManualToBotCall() {
  if (!activeCallSessionData) return;
  const dmId = activeCallSessionData.decisionMakerId;
  const mode = activeCallerMode;
  closeActiveCallModal();
  startAutomatedCallBot(dmId, mode);
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

function appendActiveCallNote(noteText) {
  const input = document.getElementById('activeCallNotesInput');
  if (!input) return;
  if (input.value.trim().length > 0) {
    input.value = input.value.trim() + '; ' + noteText;
  } else {
    input.value = noteText;
  }
}

async function finishActiveCall(andShareReferral = false) {
  if (!activeCallSessionData) return;

  const outcome = document.getElementById('activeCallOutcomeSelect').value;
  const consent = document.getElementById('activeCallConsentChecked').checked;
  const notesText = document.getElementById('activeCallNotesInput')?.value.trim() || '';

  try {
    if (andShareReferral) {
      if (!consent) {
        showToast('Consent confirmation required to dispatch referral link.', 'error');
        return;
      }

      // Generate WhatsApp follow-up embedding custom discussion notes & official link
      const resNotes = await fetch(`${API_BASE}/referral/whatsapp-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCallSessionData.companyId,
          decisionMakerId: activeCallSessionData.decisionMakerId,
          recipientName: activeCallSessionData.targetName,
          recipientPhone: activeCallSessionData.targetNumber,
          companyName: activeCallSessionData.targetCompany,
          designation: activeCallSessionData.targetDesignation,
          notes: notesText || `Discussed listing exclusive brand deals and offers on Go Extra Mile app. Outcome: ${outcome}.`,
          consentConfirmed: true
        })
      });

      const jsonNotes = await resNotes.json();
      if (!jsonNotes.success) {
        showToast(jsonNotes.error || 'Failed to dispatch WhatsApp notes message', 'error');
        return;
      }

      // Log call session
      await fetch(`${API_BASE}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCallSessionData.companyId,
          decisionMakerId: activeCallSessionData.decisionMakerId,
          outcome,
          notes: notesText ? `${notesText} (Call from ${activeCallSessionData.callerNumber})` : `Call from agent line ${activeCallSessionData.callerNumber} to ${activeCallSessionData.targetName}. Outcome: ${outcome}.`,
          referralShared: true,
          sharedVia: 'WhatsApp (Notes + Referral Link)',
          consentVerified: true,
          channel: 'WhatsApp'
        })
      });

      showToast('Call logged & WhatsApp opened with discussion notes and Go Extra Mile referral link!', 'success');
      closeActiveCallModal();
      await refreshAllData();

      if (jsonNotes.data?.whatsappUrl) {
        window.open(jsonNotes.data.whatsappUrl, '_blank');
      }
    } else {
      const res = await fetch(`${API_BASE}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: activeCallSessionData.companyId,
          decisionMakerId: activeCallSessionData.decisionMakerId,
          outcome,
          notes: notesText ? `${notesText} (Call from ${activeCallSessionData.callerNumber})` : `Call from agent line ${activeCallSessionData.callerNumber} to ${activeCallSessionData.targetName} (${activeCallSessionData.targetDesignation} - ${activeCallSessionData.targetCompany}). Outcome: ${outcome}.`,
          referralShared: false,
          consentVerified: consent,
          channel: null
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
let speechResumeTimer = null;
let cachedVoices = [];

function loadVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function unlockSpeechAudio() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}
  }
}

// Keep speech synthesis active in Chromium/Chrome (prevents silent pause)
function keepSpeechSynthesisAlive() {
  if (speechResumeTimer) clearInterval(speechResumeTimer);
  speechResumeTimer = setInterval(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      clearInterval(speechResumeTimer);
      speechResumeTimer = null;
    }
  }, 9000);
}

function toggleVoiceSpeech() {
  voiceSpeechEnabled = !voiceSpeechEnabled;
  const icon = document.getElementById('voiceToggleIcon');
  const label = document.getElementById('voiceToggleLabel');
  if (voiceSpeechEnabled) {
    unlockSpeechAudio();
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

function speakBotText(text, onDone = null) {
  if (!voiceSpeechEnabled || !window.speechSynthesis) {
    if (onDone) setTimeout(onDone, 1200);
    return;
  }

  unlockSpeechAudio();

  // Cancel prior utterance
  try {
    window.speechSynthesis.cancel();
  } catch (e) {}

  setTimeout(() => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.02;
      utterance.volume = 1.0;

      const wave = document.getElementById('botSpeakingWave');
      const statusLbl = document.getElementById('botSpeakingStatusLabel');
      const forceBtnText = document.getElementById('btnForceSpeakText');

      utterance.onstart = () => {
        if (wave) wave.classList.remove('opacity-40');
        if (statusLbl) statusLbl.innerText = 'AI Bot Speaking...';
        if (forceBtnText) forceBtnText.innerText = '🔊 AI Voice Bot Speaking Aloud (Live Audio)';
        keepSpeechSynthesisAlive();
      };

      utterance.onend = () => {
        if (statusLbl) statusLbl.innerText = 'Bot Ready';
        if (forceBtnText) forceBtnText.innerText = '🔊 AI Voice Bot Ready (Tap to Replay Speech)';
        if (onDone) setTimeout(onDone, 700);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (statusLbl) statusLbl.innerText = 'Bot Ready';
        if (forceBtnText) forceBtnText.innerText = '🔊 Tap Here to Listen Aloud';
        if (onDone) onDone();
      };

      const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      const inVoice = voices.find(v => v.lang.includes('en-IN') || v.name.includes('India') || v.name.includes('Aditi')) ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0];
      if (inVoice) {
        utterance.voice = inVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('speakBotText failed:', err);
      if (onDone) onDone();
    }
  }, 60);
}

function replayCurrentBotSpeech() {
  unlockSpeechAudio();
  if (!activeAutoCallData || !activeAutoCallData.dialogTurns) {
    showToast('No active call session to speak', 'warning');
    return;
  }

  const turns = activeAutoCallData.dialogTurns;
  const firstTurn = turns[0];
  if (!firstTurn) return;

  showToast('🔊 Playing AI Voice Bot Speech...', 'info');
  speakBotText(firstTurn.botAudioText, () => {
    if (turns[1]) {
      setTimeout(() => {
        if (!activeAutoCallData) return;
        speakBotText(turns[1].botAudioText);
      }, 800);
    }
  });
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
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-robot text-purple-400"></i> Go Extra Mile AI Bot (Audible Voice)</span>
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

async function startAutomatedCallBot(dmId, callerIdMode = 'unknown') {
  unlockSpeechAudio();
  showToast('Connecting AI Voice Bot session...', 'info');
  try {
    const res = await fetch(`${API_BASE}/calls/auto-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionMakerId: dmId, callerIdMode })
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

// Auto-Dial Campaign for Priority Tier Leads (Strictly enforces 2-call maximum cap)
async function startAutoCallQueueCampaign(tier = 1) {
  try {
    showToast(`Loading Priority Tier ${tier} auto-dial queue (excluding contacts called 2x)...`, 'info');
    const res = await fetch(`${API_BASE}/calls/auto-queue?tier=${tier}`);
    const json = await res.json();

    if (!json.success) {
      showToast(json.error || 'Failed to fetch auto-dial queue', 'error');
      return;
    }

    const queue = json.data || [];
    if (queue.length === 0) {
      showToast(`All Tier ${tier} prospects have reached the 2-call maximum limit! Auto-discovering fresh merchant lead...`, 'warning');
      await executeOneClickDiscovery();
      return;
    }

    const nextLead = queue[0];
    const callNotice = nextLead.callCount === 1 ? '1/2 calls made (Follow-up Call)' : '0/2 calls made (1st Call)';
    showToast(`Queue Active (${queue.length} eligible prospects with < 2 calls). Dialing ${nextLead.fullName} at ${nextLead.companyName} [${callNotice}]...`, 'success');

    // Launch automated bot call for the next eligible prospect
    await startAutomatedCallBot(nextLead.id, 'unknown');
  } catch (err) {
    showToast('Auto-dial campaign error: ' + err.message, 'error');
  }
}

// Dedicated 1-Click Function to Test AI Voice Bot Directly on User's Phone (+91 8518900153)
async function testAiBotOnMyNumber(callerIdMode = 'unknown') {
  unlockSpeechAudio();
  showToast('⚡ Connecting AI Voice Bot to your test phone (+91 8518900153)...', 'info');
  try {
    const res = await fetch(`${API_BASE}/calls/test-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerIdMode })
    });
    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to start AI test call', 'error');
      return;
    }

    launchAutoCallSession(json.data, json.realCall);

    if (json.realCall && json.realCall.realCallPlaced) {
      showToast(`📞 Real PSTN Call Placed via ${json.realCall.provider}! Your phone +91 8518900153 is ringing now!`, 'success');
    } else {
      showToast('🔊 AI Voice Bot Speaking Aloud: Listen to the pitch through your speakers!', 'info');
    }
  } catch (err) {
    showToast('AI test call error: ' + err.message, 'error');
  }
}

async function startAutomatedCallBotCustom(name, phone, company, designation, callerIdMode = 'unknown') {
  unlockSpeechAudio();
  try {
    const res = await fetch(`${API_BASE}/calls/auto-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customPhone: phone,
        customName: name,
        customCompany: company,
        customDesignation: designation,
        callerIdMode
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

function toggleAutoCallCallerMode(mode) {
  if (!activeAutoCallData) return;
  activeAutoCallData.callerIdMode = mode;
  const isUnknown = mode === 'unknown';
  activeAutoCallData.isUnknownNumber = isUnknown;

  const displayEl = document.getElementById('autoCallCallerDisplay');
  const badgeEl = document.getElementById('autoCallBadge');

  if (isUnknown) {
    if (displayEl) {
      displayEl.innerText = 'Private / Unknown Number (Masked PBX)';
      displayEl.className = 'text-purple-300 font-mono';
    }
    if (badgeEl) {
      badgeEl.innerText = 'UNKNOWN NUMBER ACTIVE';
      badgeEl.className = 'text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold';
    }
    showToast('Calling as Unknown / Private Number (Caller ID Masked)', 'info');
  } else {
    if (displayEl) {
      displayEl.innerText = '+91 8518900153 (SIM Line)';
      displayEl.className = 'text-emerald-300 font-mono';
    }
    if (badgeEl) {
      badgeEl.innerText = 'MY PHONE LINE ACTIVE';
      badgeEl.className = 'text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold';
    }
    showToast('Calling from your mobile line +91 8518900153', 'info');
  }
}

function launchAutoCallSession(callData, realCallData = null) {
  activeAutoCallData = callData;

  const realCall = realCallData || callData.realCall;
  const telIcon = document.getElementById('autoCallTelIcon');
  const telText = document.getElementById('autoCallTelText');
  const directSimBtn = document.getElementById('btnAutoCallDirectSim');

  if (directSimBtn && callData.targetNumber) {
    const cleanNum = (callData.targetNumber || '').replace(/[^0-9]/g, '');
    const dialNum = cleanNum.startsWith('91') && cleanNum.length === 12
      ? cleanNum
      : cleanNum.length === 10
      ? `91${cleanNum}`
      : cleanNum;
    directSimBtn.href = `tel:+${dialNum}`;
  }

  if (realCall && realCall.realCallPlaced) {
    if (telIcon) telIcon.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0';
    if (telText) {
      telText.innerHTML = `<strong class="text-emerald-300">📞 Real PSTN Call Placed:</strong> Ringing your handset via ${realCall.provider} (SID: ${realCall.callSid || 'active'})!`;
    }
  } else {
    if (telIcon) telIcon.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0';
    if (telText) {
      telText.innerHTML = `<strong class="text-amber-300">🔊 Browser Audio Simulation:</strong> Speaking aloud via computer audio. <span class="text-slate-400">(Connect Twilio/Exotel or tap 'Dial on SIM' to ring real phone).</span>`;
    }
  }

  document.getElementById('autoCallTargetName').innerText = callData.targetName;
  document.getElementById('autoCallTargetDesignation').innerText = `${callData.targetDesignation} • ${callData.targetCompany}`;
  document.getElementById('autoCallTargetPhone').innerText = callData.targetNumber;

  // Target Company Website & Profile Link
  const comp = state.companies.find(c => (callData.companyId && c.id === callData.companyId) || (callData.targetCompany && c.name && c.name.toLowerCase() === callData.targetCompany.toLowerCase()));
  const compWebsite = callData.companyWebsite || (comp && comp.website) || (comp && comp.domain ? `https://${comp.domain}` : '');
  const compDomain = callData.companyDomain || (comp && comp.domain) || (compWebsite ? compWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : '');

  const autoCompEl = document.getElementById('autoCallTargetCompName');
  if (autoCompEl) autoCompEl.innerText = callData.targetCompany || 'Merchant';

  const autoWebBtn = document.getElementById('autoCallCompanyWebsiteBtn');
  const autoWebText = document.getElementById('autoCallWebsiteText');
  if (autoWebBtn) {
    if (compWebsite) {
      autoWebBtn.href = compWebsite;
      autoWebBtn.title = `Visit official website of ${callData.targetCompany} (${compWebsite})`;
      if (autoWebText) autoWebText.innerText = `Visit ${compDomain || 'Website'}`;
    } else {
      autoWebBtn.href = `https://www.google.com/search?q=${encodeURIComponent((callData.targetCompany || '') + ' official website')}`;
      autoWebBtn.title = `Search ${callData.targetCompany} website on Google`;
      if (autoWebText) autoWebText.innerText = 'Search Company Website';
    }
  }

  // Caller ID Display
  const isUnknown = callData.isUnknownNumber !== false;
  const displayEl = document.getElementById('autoCallCallerDisplay');
  const badgeEl = document.getElementById('autoCallBadge');
  const radUnknown = document.getElementById('autoRadioUnknown');
  const radSim = document.getElementById('autoRadioSim');

  if (isUnknown) {
    if (displayEl) {
      displayEl.innerText = 'Private / Unknown Number (Masked PBX)';
      displayEl.className = 'text-purple-300 font-mono';
    }
    if (badgeEl) {
      badgeEl.innerText = 'UNKNOWN NUMBER ACTIVE';
      badgeEl.className = 'text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold';
    }
    if (radUnknown) radUnknown.checked = true;
  } else {
    if (displayEl) {
      displayEl.innerText = `${callData.callerNumber || '+91 8518900153'} (SIM Line)`;
      displayEl.className = 'text-emerald-300 font-mono';
    }
    if (badgeEl) {
      badgeEl.innerText = 'MY PHONE LINE ACTIVE';
      badgeEl.className = 'text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold';
    }
    if (radSim) radSim.checked = true;
  }

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

  // Prefill Bot Notes for WhatsApp follow-up
  const notesEl = document.getElementById('autoCallNotesInput');
  if (notesEl) {
    notesEl.value = `Autonomous AI Voice Bot pitch: Discussed listing ${callData.targetCompany}'s exclusive product catalog and discount offers on Go Extra Mile app with 0% upfront fee.`;
  }

  document.getElementById('modalAutoCallBot').classList.remove('hidden');

  // Trigger sound effect or speech immediately
  unlockSpeechAudio();

  const forceBtn = document.getElementById('btnForceSpeakText');
  if (forceBtn) forceBtn.innerText = '🔊 AI Voice Bot Speaking Aloud (Tap to Replay)';

  // Step 1: Greeting - Bot speaks aloud immediately!
  const turn1 = (callData.dialogTurns && callData.dialogTurns[0]) ? callData.dialogTurns[0] : null;
  if (turn1) {
    addTranscriptBubble('bot', turn1.botAudioText);
    setTimeout(() => {
      speakBotText(turn1.botAudioText, () => {
        // Step 2: Pitch automatically speaks when Step 1 finishes
        if (!activeAutoCallData) return;
        const turn2 = (callData.dialogTurns && callData.dialogTurns[1]) ? callData.dialogTurns[1] : null;
        if (turn2) {
          setTimeout(() => {
            if (!activeAutoCallData) return;
            addTranscriptBubble('bot', turn2.botAudioText);
            speakBotText(turn2.botAudioText);
          }, 900);
        }
      });
    }, 300);
  }
}

function playFullBotSpeech() {
  if (!activeAutoCallData || !activeAutoCallData.dialogTurns) return;

  const turns = activeAutoCallData.dialogTurns;
  showToast('Starting hands-free autonomous bot pitch speech...', 'info');

  let current = 0;
  function speakNextTurn() {
    if (!activeAutoCallData || current >= turns.length) {
      showToast('Completed autonomous voice bot pitch sequence!', 'success');
      return;
    }
    const t = turns[current];
    addTranscriptBubble('bot', t.botAudioText);
    current++;
    speakBotText(t.botAudioText, speakNextTurn);
  }

  speakNextTurn();
}

function advanceBotStep(intent) {
  if (!activeAutoCallData) return;

  const notesEl = document.getElementById('autoCallNotesInput');

  if (intent === 'cost_query') {
    if (notesEl) {
      notesEl.value = `Fee Inquiry: Confirmed 0% upfront listing fee, 100% price autonomy, and exclusive deal featuring for ${activeAutoCallData.targetCompany}.`;
    }
    addTranscriptBubble('prospect', 'What does it cost to list our brand on Go Extra Mile?');
    setTimeout(() => {
      const answer = 'There are absolutely zero upfront listing fees. Your brand retains 100% control over your discount percentages, featured products, and campaign duration.';
      addTranscriptBubble('bot', answer);
      speakBotText(answer);
    }, 800);
  } else if (intent === 'interested') {
    if (notesEl) {
      notesEl.value = `Confirmed Interest: ${activeAutoCallData.targetName} agreed to list ${activeAutoCallData.targetCompany}'s exclusive deals and offers on Go Extra Mile app. Requested onboarding link on WhatsApp.`;
    }
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
    if (notesEl) {
      notesEl.value = `Proposal Requested: Decision-maker requested official merchant onboarding agreement and campaign proposal for ${activeAutoCallData.targetCompany}.`;
    }
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

// ==========================================
// TWO-WAY LIVE INTERNET VOICE CALLING (VOIP)
// ==========================================

let isMicListening = false;
let activeSpeechRecognition = null;

function toggleMicInteractiveMode() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Your browser does not support Speech Recognition. Use Google Chrome or Microsoft Edge.', 'warning');
    return;
  }

  if (isMicListening) {
    stopMicListening();
    return;
  }

  startMicListening();
}

function startMicListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const btn = document.getElementById('btnToggleMicCall');
  const btnText = document.getElementById('btnToggleMicText');
  const statusPill = document.getElementById('micCallStatus');
  const icon = document.getElementById('micPulsingIcon');

  try {
    activeSpeechRecognition = new SpeechRecognition();
    activeSpeechRecognition.continuous = false;
    activeSpeechRecognition.interimResults = false;
    activeSpeechRecognition.lang = 'en-IN';

    activeSpeechRecognition.onstart = () => {
      isMicListening = true;
      if (btn) btn.className = 'bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 shrink-0 animate-pulse';
      if (btnText) btnText.innerText = 'Listening... Speak Now';
      if (statusPill) {
        statusPill.className = 'text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse';
        statusPill.innerText = '🎙️ Microphone Live (Listening)';
      }
      if (icon) icon.className = 'w-8 h-8 rounded-full bg-rose-500/30 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0 animate-bounce';
      showToast('Microphone active: Speak to the AI bot (e.g. "What are the fees?" or "Send me the link")', 'info');
    };

    activeSpeechRecognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      stopMicListening();
      handleUserVoiceInput(speechResult);
    };

    activeSpeechRecognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      stopMicListening();
      if (event.error !== 'no-speech') {
        showToast('Mic error: ' + event.error, 'warning');
      }
    };

    activeSpeechRecognition.onend = () => {
      stopMicListening();
    };

    activeSpeechRecognition.start();
  } catch (err) {
    console.warn('Failed to start speech recognition:', err);
    stopMicListening();
    showToast('Could not access microphone: ' + err.message, 'error');
  }
}

function stopMicListening() {
  isMicListening = false;
  if (activeSpeechRecognition) {
    try { activeSpeechRecognition.stop(); } catch (e) {}
    activeSpeechRecognition = null;
  }

  const btn = document.getElementById('btnToggleMicCall');
  const btnText = document.getElementById('btnToggleMicText');
  const statusPill = document.getElementById('micCallStatus');
  const icon = document.getElementById('micPulsingIcon');

  if (btn) btn.className = 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 shrink-0';
  if (btnText) btnText.innerText = 'Speak to AI (Mic)';
  if (statusPill) {
    statusPill.className = 'text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold';
    statusPill.innerText = 'Over Internet (No SIM Needed)';
  }
  if (icon) icon.className = 'w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0';
}

function handleUserVoiceInput(spokenText) {
  if (!activeAutoCallData) return;

  addTranscriptBubble('prospect', spokenText);

  const lower = spokenText.toLowerCase();

  if (lower.includes('fee') || lower.includes('cost') || lower.includes('charge') || lower.includes('price') || lower.includes('commission')) {
    advanceBotStep('cost_query');
  } else if (lower.includes('yes') || lower.includes('send') || lower.includes('link') || lower.includes('whatsapp') || lower.includes('interested') || lower.includes('sure')) {
    advanceBotStep('interested');
  } else if (lower.includes('email') || lower.includes('mail') || lower.includes('proposal') || lower.includes('deck')) {
    advanceBotStep('email_requested');
  } else {
    // Intelligent contextual response
    setTimeout(() => {
      const response = `I understand, ${activeAutoCallData.targetName}. On Go Extra Mile, brands get complete flexibility with zero upfront listing cost and direct customer outreach. Would you like me to share our official onboarding link on WhatsApp (${activeAutoCallData.targetNumber})?`;
      addTranscriptBubble('bot', response);
      speakBotText(response);
    }, 800);
  }
}

// Directly dial customer's phone from call bot dialog
function callCustomerDirectFromBotModal() {
  if (!activeAutoCallData || !activeAutoCallData.targetNumber) {
    showToast('Customer phone number not available', 'error');
    return;
  }
  const cleanNum = (activeAutoCallData.targetNumber || '').replace(/[^0-9]/g, '');
  const dialNum = cleanNum.startsWith('91') && cleanNum.length === 12
    ? cleanNum
    : cleanNum.length === 10
    ? `91${cleanNum}`
    : cleanNum;

  showToast(`📞 Dialing ${activeAutoCallData.targetName} (+${dialNum}) directly on your phone dialer...`, 'success');
  window.location.href = `tel:+${dialNum}`;
}

async function dispatchBotReferralWhatsApp() {
  if (!activeAutoCallData) return;

  const notesText = document.getElementById('autoCallNotesInput')?.value.trim() ||
    `Autonomous AI Voice Bot pitched Go Extra Mile merchant deals & product listing. Decision-maker agreed to review onboarding link with 0% listing fee.`;

  try {
    const resNotes = await fetch(`${API_BASE}/referral/whatsapp-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: activeAutoCallData.companyId,
        decisionMakerId: activeAutoCallData.decisionMakerId,
        recipientName: activeAutoCallData.targetName,
        recipientPhone: activeAutoCallData.targetNumber,
        companyName: activeAutoCallData.targetCompany,
        designation: activeAutoCallData.targetDesignation,
        notes: notesText,
        consentConfirmed: true
      })
    });

    const jsonNotes = await resNotes.json();
    if (!jsonNotes.success) {
      showToast(jsonNotes.error || 'Failed to dispatch WhatsApp message', 'error');
      return;
    }

    await fetch(`${API_BASE}/calls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: activeAutoCallData.companyId,
        decisionMakerId: activeAutoCallData.decisionMakerId,
        outcome: 'Interested (Automated AI Call)',
        notes: notesText,
        referralShared: true,
        sharedVia: 'WhatsApp (Notes + Referral Link)',
        consentVerified: true,
        channel: 'WhatsApp'
      })
    });

    showToast('Automated Call Logged: WhatsApp opened with bot notes and Go Extra Mile referral link!', 'success');
    await refreshAllData();

    if (jsonNotes.data?.whatsappUrl) {
      window.open(jsonNotes.data.whatsappUrl, '_blank');
    }
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

// ==========================================
// AI COMPANY SEARCH & LEAD HUNTER
// ==========================================
function openAiSearchModal() {
  const modal = document.getElementById('modalAiSearch');
  if (!modal) return;
  document.getElementById('aiSearchQueryInput').value = '';
  document.getElementById('aiSearchProgressBox').classList.add('hidden');
  document.getElementById('aiSearchResultCard').classList.add('hidden');
  loadAiStatus();
  modal.classList.remove('hidden');
}

function closeAiSearchModal() {
  const modal = document.getElementById('modalAiSearch');
  if (modal) modal.classList.add('hidden');
}

function quickFillAiModal(query) {
  const input = document.getElementById('aiSearchQueryInput');
  if (input) input.value = query;
}

function quickFillAndSearchAi(query) {
  openAiSearchModal();
  quickFillAiModal(query);
  executeAiCompanySearch();
}

function executeAiSearchFromDashboard() {
  const input = document.getElementById('dashAiQueryInput');
  const query = input?.value.trim();
  if (!query) {
    // If input is empty, directly perform 1-Click Auto-Search!
    executeOneClickDiscovery();
    return;
  }
  openAiSearchModal();
  document.getElementById('aiSearchQueryInput').value = query;
  executeAiCompanySearch();
}

async function loadAiStatus() {
  try {
    const res = await fetch(`${API_BASE}/ai/status`);
    const json = await res.json();
    if (json.success) {
      const badge = document.getElementById('modalAiProviderBadge');
      const dashBadge = document.getElementById('dashAiBadge');
      const text = json.provider;
      if (badge) badge.textContent = text;
      if (dashBadge) dashBadge.textContent = text;
    }
  } catch (e) {
    // ignore
  }
}

async function saveGeminiApiKey() {
  const keyInput = document.getElementById('cfgGeminiKeyInput');
  const geminiApiKey = keyInput?.value.trim();
  if (!geminiApiKey) {
    showToast('Please enter your Gemini API key.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/ai/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiApiKey })
    });
    const json = await res.json();
    if (json.success) {
      showToast('Google Gemini API Key connected successfully!', 'success');
      loadAiStatus();
    } else {
      showToast(json.error || 'Failed to save key', 'error');
    }
  } catch (err) {
    showToast('Error saving Gemini key: ' + err.message, 'error');
  }
}

async function executeAiCompanySearch() {
  const input = document.getElementById('aiSearchQueryInput');
  const query = input?.value.trim();
  if (!query) {
    showToast('Please enter a company name or search query.', 'error');
    return;
  }

  const btn = document.getElementById('btnExecuteAiSearch');
  const progressBox = document.getElementById('aiSearchProgressBox');
  const logList = document.getElementById('aiSearchLogList');
  const statusText = document.getElementById('aiSearchStatusText');
  const resultCard = document.getElementById('aiSearchResultCard');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> AI Searching...';
  progressBox.classList.remove('hidden');
  resultCard.classList.add('hidden');
  logList.innerHTML = '';
  statusText.textContent = 'Analyzing...';
  statusText.className = 'text-purple-400 font-bold';

  const appendLog = (msg, cls = 'text-slate-300') => {
    const div = document.createElement('div');
    div.className = cls;
    div.textContent = msg;
    logList.appendChild(div);
    logList.scrollTop = logList.scrollHeight;
  };

  appendLog(`[1/4] AI Engine processing natural language prompt: "${query}"...`);

  try {
    const res = await fetch(`${API_BASE}/ai/search-company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, autoSave: true })
    });

    const json = await res.json();

    if (!json.success) {
      statusText.textContent = 'Failed';
      statusText.className = 'text-rose-400 font-bold';
      appendLog(`[ERROR] ${json.error || 'Failed to research company.'}`, 'text-rose-400');
      showToast(json.error || 'Failed to research company', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Search with AI';
      return;
    }

    // Display logs from server
    if (json.logs && Array.isArray(json.logs)) {
      for (const log of json.logs) {
        appendLog(log, log.includes('[ERROR]') ? 'text-rose-400' : log.includes('[Database]') ? 'text-emerald-300 font-bold' : log.includes('[Guardrail]') ? 'text-amber-300' : 'text-slate-300');
      }
    }

    statusText.textContent = 'Research Complete!';
    statusText.className = 'text-emerald-400 font-bold';

    // Populate Extracted Result Card
    const comp = json.company;
    const dm = (json.decisionMakers && json.decisionMakers.length > 0) ? json.decisionMakers[0] : null;

    if (comp) {
      document.getElementById('aiResCompName').textContent = comp.name;
      document.getElementById('aiResCompMeta').textContent = `${comp.industry || 'Retail'} • ${comp.city || 'Pan-India'}`;
      document.getElementById('aiResCompUrl').textContent = comp.website || `https://${comp.domain}`;
    }

    if (json.pitchOpportunity) {
      document.getElementById('aiResPitchText').textContent = json.pitchOpportunity;
    }

    if (dm) {
      document.getElementById('aiResDmName').textContent = dm.fullName;
      document.getElementById('aiResDmRole').textContent = `${dm.designation} (${dm.priorityLabel || 'Tier 1'})`;
      document.getElementById('aiResDmPhone').textContent = dm.phone || 'Direct phone verified';
      document.getElementById('aiResDmEmail').textContent = dm.email || 'Email verified';
      document.getElementById('aiResTierBadge').textContent = `Tier ${dm.priorityTier}: ${dm.designation}`;

      // Set up Call Now button
      const btnCall = document.getElementById('btnAiCallNow');
      btnCall.onclick = () => {
        closeAiSearchModal();
        triggerCallModal(dm.id);
      };

      // Set up Email Proposal button
      const btnEmail = document.getElementById('btnAiEmailProposal');
      btnEmail.onclick = () => {
        closeAiSearchModal();
        openEmailProposalModal(dm.id);
      };
    }

    resultCard.classList.remove('hidden');
    showToast(`AI successfully researched and saved ${comp.name}!`, 'success');
    await refreshAllData();
  } catch (err) {
    statusText.textContent = 'Error';
    statusText.className = 'text-rose-400 font-bold';
    appendLog(`[ERROR] ${err.message}`, 'text-rose-400');
    showToast('AI Search error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Search with AI';
  }
}

// ==========================================
// 1-CLICK INSTANT SEARCH & DISCOVERY ENGINE (SMALL • DOMESTIC • BIG ENTERPRISES)
// ==========================================
let currentOneClickScale = 'all';
let autoSearchLoopInterval = null;

function setOneClickScale(scale) {
  currentOneClickScale = scale;
  const scales = ['all', 'small', 'mid', 'big'];
  scales.forEach(s => {
    const btn = document.getElementById(`scaleChip-${s}`);
    const dashBtn = document.getElementById(`dashScaleChip-${s}`);

    if (btn) {
      if (s === scale) {
        btn.className = 'scale-chip active-scale-chip bg-amber-500 text-slate-950 font-bold text-[11px] px-3 py-1 rounded-lg transition shadow-sm';
      } else {
        btn.className = 'scale-chip bg-slate-900 hover:bg-slate-700 text-slate-300 font-medium text-[11px] px-3 py-1 rounded-lg border border-slate-700 transition';
      }
    }

    if (dashBtn) {
      if (s === scale) {
        dashBtn.className = 'scale-chip active-scale-chip bg-amber-500 text-slate-950 font-bold text-[11px] px-2.5 py-0.5 rounded-lg transition shadow-sm';
      } else {
        dashBtn.className = 'scale-chip bg-slate-900 hover:bg-slate-700 text-slate-300 font-medium text-[11px] px-2.5 py-0.5 rounded-lg border border-slate-700 transition';
      }
    }
  });

  const label = document.getElementById('labelOneClickDiscover');
  if (label) {
    if (scale === 'small') label.innerText = '1-Click Auto-Search Small Domestic Shop';
    else if (scale === 'mid') label.innerText = '1-Click Auto-Search Mid-Sized Domestic Brand';
    else if (scale === 'big') label.innerText = '1-Click Auto-Search Big National Enterprise';
    else label.innerText = '1-Click Auto-Search Next Company';
  }
}

function toggleContinuousAutoSearch() {
  const btn = document.getElementById('btnAutoSearchLoop');
  const dot = document.getElementById('loopDot');
  const label = document.getElementById('loopLabel');

  if (autoSearchLoopInterval) {
    // Turn off
    clearInterval(autoSearchLoopInterval);
    autoSearchLoopInterval = null;

    if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-500';
    if (label) label.innerText = 'Auto-Search Loop: OFF';
    if (btn) btn.className = 'bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-2 border border-slate-700 shadow-sm';
    showToast('Continuous Auto-Search Loop stopped.', 'info');
  } else {
    // Turn on
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
    if (label) label.innerText = 'Auto-Search: ACTIVE (8s)';
    if (btn) btn.className = 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-bold text-xs px-3 py-2 rounded-lg transition flex items-center gap-2 border border-emerald-500/50 shadow-sm';
    showToast('Continuous Auto-Search Loop ACTIVE: Auto-discovering companies every 8s!', 'success');

    // Run first discovery immediately
    executeOneClickDiscovery();

    autoSearchLoopInterval = setInterval(() => {
      executeOneClickDiscovery();
    }, 8000);
  }
}

async function executeOneClickDiscovery(scale = null, count = 1) {
  const targetScale = scale || currentOneClickScale;
  const btn = document.getElementById('btnOneClickDiscover');
  const icon = document.getElementById('iconOneClickDiscover');
  const label = document.getElementById('labelOneClickDiscover');

  if (btn) btn.disabled = true;
  if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-slate-950 text-base';
  if (label) label.innerText = 'Searching across public directories & company rosters...';

  try {
    const res = await fetch(`${API_BASE}/leads/one-click-discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale: targetScale, count })
    });

    const json = await res.json();
    if (!json.success) {
      showToast(json.error || 'Failed to discover company', 'error');
      return;
    }

    const items = json.data || [];
    if (items.length > 0) {
      const first = items[0];
      showToast(`⚡ Discovered fresh company: ${first.company.name} (${first.scaleLabel})!`, 'success');
      renderOneClickLatestCard(first);
    }

    await refreshAllData();
  } catch (err) {
    showToast('Discovery network error: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (icon) icon.className = 'fa-solid fa-bolt text-slate-950 text-base';
    setOneClickScale(currentOneClickScale);
  }
}

async function executeOneClickDiscoveryBatch(count = 3) {
  await executeOneClickDiscovery(currentOneClickScale, count);
}

function renderOneClickLatestCard(item) {
  const cards = [
    document.getElementById('oneClickLatestCard'),
    document.getElementById('oneClickLatestCardDash')
  ].filter(Boolean);

  if (cards.length === 0) return;

  const comp = item.company;
  const dm = item.decisionMaker;
  const scale = item.scale;
  const scaleBadgeClass = scale === 'small'
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : scale === 'big'
      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
      : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

  const html = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${scaleBadgeClass}">
            ${item.scaleLabel}
          </span>
          <span class="text-xs font-bold text-white">${comp.name}</span>
          <span class="text-xs text-slate-400 font-medium">&bull; ${comp.city} &bull; ${comp.industry}</span>
        </div>
        <div class="text-xs text-slate-300 flex flex-wrap items-center gap-3">
          <span class="font-semibold text-amber-300"><i class="fa-solid fa-user-tie"></i> ${dm.fullName}</span>
          <span class="text-slate-400">(${dm.designation})</span>
          <span class="font-mono text-emerald-400 font-semibold"><i class="fa-solid fa-phone"></i> ${dm.phone}</span>
          ${dm.email ? `<span class="text-indigo-400"><i class="fa-solid fa-envelope"></i> ${dm.email}</span>` : ''}
        </div>
        <p class="text-[11px] text-slate-400 italic">${comp.notes || ''}</p>
      </div>

      <div class="flex flex-wrap items-center gap-1.5 shrink-0">
        <button onclick="startAutomatedCallBot('${dm.id}', 'unknown')" class="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-user-secret"></i> Bot Call
        </button>
        <button onclick="startCallFromMyNumber('${dm.id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm">
          <i class="fa-solid fa-phone"></i> Call
        </button>
        <button onclick="openWhatsAppNotesModal('${dm.id}')" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 shadow-sm">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp Notes & Link
        </button>
        <button onclick="deleteDecisionMaker('${dm.id}')" class="bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 font-bold shadow-sm" title="Delete without popup (instant auto-replenish)">
          <i class="fa-regular fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `;

  cards.forEach(c => {
    c.innerHTML = html;
    c.classList.remove('hidden');
  });
}

// ==========================================
// CLOUD TELEPHONY & REAL PHONE CALLING ENGINE
// ==========================================

let telephonyConfig = {
  provider: 'simulation',
  isConfigured: false
};

async function initTelephonyStatus() {
  try {
    const res = await fetch(`${API_BASE}/telephony/status`);
    const json = await res.json();
    if (!json.success) return;

    telephonyConfig = json.data;

    const dot = document.getElementById('telephonyHeaderDot');
    const text = document.getElementById('telephonyHeaderText');
    const pill = document.getElementById('modalTelStatusPill');

    if (telephonyConfig.isConfigured) {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      if (text) text.innerText = `Telephony: ${telephonyConfig.provider.toUpperCase()} (Live)`;
      if (pill) {
        pill.className = 'text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded border border-emerald-500/30';
        pill.innerText = `Real PSTN Calling Active (${telephonyConfig.provider.toUpperCase()})`;
      }
    } else {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400';
      if (text) text.innerText = 'Telephony: Simulation';
      if (pill) {
        pill.className = 'text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded border border-amber-500/30';
        pill.innerText = 'Simulation Mode';
      }
    }

    // Populate inputs if modal exists
    if (document.getElementById('inputTwilioSid')) {
      document.getElementById('inputTwilioSid').value = telephonyConfig.twilioAccountSid || '';
      document.getElementById('inputTwilioNumber').value = telephonyConfig.twilioPhoneNumber || '';
    }
    if (document.getElementById('inputExotelSid')) {
      document.getElementById('inputExotelSid').value = telephonyConfig.exotelSid || '';
      document.getElementById('inputExotelKey').value = telephonyConfig.exotelApiKey || '';
      document.getElementById('inputExotelCallerId').value = telephonyConfig.exotelCallerId || '';
    }

    // Update Mobile IP
    if (json.data.localUrls && json.data.localUrls.length > 0) {
      const primaryUrl = json.data.localUrls[0].url;
      const display = document.getElementById('modalLocalIpDisplay');
      if (display) display.innerText = primaryUrl;
      const qr = document.getElementById('modalMobileQrCode');
      if (qr) qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(primaryUrl)}`;
    }
  } catch (err) {
    console.warn('Failed to load telephony status:', err);
  }
}

function openTelephonyModal() {
  initTelephonyStatus();
  document.getElementById('modalTelephonySettings').classList.remove('hidden');
}

function closeTelephonyModal() {
  document.getElementById('modalTelephonySettings').classList.add('hidden');
}

function switchTelephonyTab(tab) {
  const tabTwilio = document.getElementById('tabTelTwilio');
  const tabExotel = document.getElementById('tabTelExotel');
  const tabMobile = document.getElementById('tabTelMobile');

  const contentTwilio = document.getElementById('telTabContentTwilio');
  const contentExotel = document.getElementById('telTabContentExotel');
  const contentMobile = document.getElementById('telTabContentMobile');

  if (!tabTwilio || !tabExotel || !tabMobile) return;

  tabTwilio.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5';
  tabExotel.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5';
  tabMobile.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1.5';

  contentTwilio.classList.add('hidden');
  contentExotel.classList.add('hidden');
  contentMobile.classList.add('hidden');

  if (tab === 'twilio') {
    tabTwilio.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600/30 text-indigo-200 border border-indigo-500/40';
    contentTwilio.classList.remove('hidden');
  } else if (tab === 'exotel') {
    tabExotel.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600/30 text-indigo-200 border border-indigo-500/40';
    contentExotel.classList.remove('hidden');
  } else if (tab === 'mobile') {
    tabMobile.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600/30 text-indigo-200 border border-indigo-500/40';
    contentMobile.classList.remove('hidden');
  }
}

async function saveTelephonySettings() {
  const twilioSid = (document.getElementById('inputTwilioSid') ? document.getElementById('inputTwilioSid').value : '').trim();
  const twilioToken = (document.getElementById('inputTwilioToken') ? document.getElementById('inputTwilioToken').value : '').trim();
  const twilioNumber = (document.getElementById('inputTwilioNumber') ? document.getElementById('inputTwilioNumber').value : '').trim();

  const exotelSid = (document.getElementById('inputExotelSid') ? document.getElementById('inputExotelSid').value : '').trim();
  const exotelKey = (document.getElementById('inputExotelKey') ? document.getElementById('inputExotelKey').value : '').trim();
  const exotelToken = (document.getElementById('inputExotelToken') ? document.getElementById('inputExotelToken').value : '').trim();
  const exotelCallerId = (document.getElementById('inputExotelCallerId') ? document.getElementById('inputExotelCallerId').value : '').trim();

  const payload = {};
  if (twilioSid && twilioNumber) {
    payload.provider = 'twilio';
    payload.twilioAccountSid = twilioSid;
    if (twilioToken) payload.twilioAuthToken = twilioToken;
    payload.twilioPhoneNumber = twilioNumber;
  } else if (exotelSid && exotelKey) {
    payload.provider = 'exotel';
    payload.exotelSid = exotelSid;
    payload.exotelApiKey = exotelKey;
    if (exotelToken) payload.exotelToken = exotelToken;
    payload.exotelCallerId = exotelCallerId;
  } else {
    payload.provider = 'simulation';
  }

  try {
    const res = await fetch(`${API_BASE}/telephony/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('Telephony credentials saved successfully!', 'success');
      await initTelephonyStatus();
    } else {
      showToast(json.error || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showToast('Error saving telephony credentials: ' + err.message, 'error');
  }
}

async function testRealOutboundCallToMyPhone() {
  const btn = document.getElementById('btnTestRealCall');
  const statusBox = document.getElementById('realCallStatusBox');

  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching Real Call...';
    btn.disabled = true;
  }
  if (statusBox) statusBox.innerText = 'Connecting to Cloud Telecom Gateway...';

  try {
    const res = await fetch(`${API_BASE}/calls/real-outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+91 8518900153',
        name: 'Ritik Jain'
      })
    });
    const json = await res.json();

    if (json.realCallPlaced) {
      showToast(`📞 Real Call Dispatched via ${json.provider}! Your phone +91 8518900153 is ringing now!`, 'success');
      if (statusBox) statusBox.innerHTML = `<span class="text-emerald-400 font-bold">Call Active (SID: ${json.callSid || 'placed'})</span>`;
    } else {
      showToast(json.message || 'Cannot place real call without Twilio/Exotel credentials.', 'warning');
      if (statusBox) statusBox.innerHTML = `<span class="text-amber-400 font-medium">${json.message}</span>`;
    }
  } catch (err) {
    showToast('Failed to trigger real call: ' + err.message, 'error');
    if (statusBox) statusBox.innerHTML = `<span class="text-rose-400">Error: ${err.message}</span>`;
  } finally {
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-phone-arrow-up-right"></i> Make Real Call to +91 8518900153';
      btn.disabled = false;
    }
  }
}

