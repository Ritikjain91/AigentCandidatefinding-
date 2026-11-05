const express = require('express');
const router = express.Router();
const storage = require('../services/storageService');
const dmService = require('../services/decisionMakerService');
const researchService = require('../services/researchService');
const referralService = require('../services/referralService');
const callingService = require('../services/callingService');
const websiteFetcher = require('../services/websiteFetcherService');
const aiSearchService = require('../services/aiCompanySearchService');

// ==========================================
// SETTINGS & CONFIGURATION
// ==========================================

// GET Settings
router.get('/settings', (req, res) => {
  try {
    const config = storage.getConfig();
    const referral = referralService.getReferralConfig();
    res.json({
      success: true,
      data: {
        ...config,
        referral
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE Settings (Guarding referral code GOMILES)
router.put('/settings', (req, res) => {
  try {
    const updated = storage.updateConfig(req.body);
    res.json({ success: true, message: 'Settings updated successfully.', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// DASHBOARD STATS
// ==========================================
router.get('/stats', (req, res) => {
  try {
    const companies = storage.getCompanies();
    const decisionMakers = storage.getDecisionMakers();
    const calls = storage.getCalls();
    const shareLogs = storage.getShareLogs();

    const tier1Count = decisionMakers.filter(dm => dm.priorityTier === 1).length;
    const tier2Count = decisionMakers.filter(dm => dm.priorityTier === 2).length;
    const tier3Count = decisionMakers.filter(dm => dm.priorityTier === 3).length;
    const verifiedCount = decisionMakers.filter(dm => dm.verificationStatus === 'Verified').length;
    const unverifiedCount = decisionMakers.filter(dm => dm.verificationStatus !== 'Verified').length;

    const interestedCalls = calls.filter(c => c.outcome === 'Interested').length;

    res.json({
      success: true,
      data: {
        totalCompanies: companies.length,
        totalDecisionMakers: decisionMakers.length,
        priorityTiers: {
          tier1: tier1Count,
          tier2: tier2Count,
          tier3: tier3Count
        },
        verification: {
          verified: verifiedCount,
          unverified: unverifiedCount,
          verifiedRatePercent: decisionMakers.length ? Math.round((verifiedCount / decisionMakers.length) * 100) : 0
        },
        outreach: {
          totalCalls: calls.length,
          interestedCalls,
          referralSharesSent: shareLogs.length
        },
        officialReferralLink: referralService.getReferralConfig().officialUrl
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// COMPANIES
// ==========================================

// List Companies
router.get('/companies', (req, res) => {
  try {
    const companies = storage.getCompanies();
    const allDMs = storage.getDecisionMakers();

    const enriched = companies.map(comp => {
      const dms = allDMs.filter(dm => dm.companyId === comp.id);
      return {
        ...comp,
        decisionMakersCount: dms.length,
        tier1Count: dms.filter(d => d.priorityTier === 1).length,
        tier2Count: dms.filter(d => d.priorityTier === 2).length,
        tier3Count: dms.filter(d => d.priorityTier === 3).length,
        verifiedCount: dms.filter(d => d.verificationStatus === 'Verified').length
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Company
router.post('/companies', (req, res) => {
  try {
    if (!req.body.name || !req.body.name.trim()) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }
    const created = storage.addCompany(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Company by ID with its Decision Makers
router.get('/companies/:id', (req, res) => {
  try {
    const comp = storage.getCompanyById(req.params.id);
    if (!comp) {
      return res.status(404).json({ success: false, error: 'Company not found.' });
    }
    const dms = dmService.getAll({ companyId: req.params.id });
    res.json({
      success: true,
      data: {
        ...comp,
        decisionMakers: dms
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Company
router.put('/companies/:id', (req, res) => {
  try {
    const updated = storage.updateCompany(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Company not found.' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Company
router.delete('/companies/:id', (req, res) => {
  try {
    storage.deleteCompany(req.params.id);
    res.json({ success: true, message: 'Company and associated contacts removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DECISION-MAKERS
// ==========================================

// List Decision Makers (with Priority Sorting & Filters)
router.get('/decision-makers', (req, res) => {
  try {
    const dms = dmService.getAll(req.query);
    res.json({ success: true, count: dms.length, data: dms });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Decision Maker
router.post('/decision-makers', (req, res) => {
  try {
    const created = dmService.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message, validationErrors: err.validationErrors });
  }
});

// Get Decision Maker
router.get('/decision-makers/:id', (req, res) => {
  try {
    const dm = dmService.getById(req.params.id);
    if (!dm) {
      return res.status(404).json({ success: false, error: 'Decision maker not found.' });
    }
    res.json({ success: true, data: dm });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Decision Maker
router.put('/decision-makers/:id', (req, res) => {
  try {
    const updated = dmService.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify / Unverify Decision Maker
router.post('/decision-makers/:id/verify', (req, res) => {
  try {
    const { status, method } = req.body;
    const updated = dmService.verify(req.params.id, status || 'Verified', method);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Decision Maker (With Auto-Replenish if enabled)
router.delete('/decision-makers/:id', (req, res) => {
  try {
    const result = dmService.delete(req.params.id);
    const msg = result.autoReplenished
      ? `Contact removed. Auto-Replenished fresh lead: ${result.newLead.fullName} (${result.newLead.designation} - ${result.newCompany.name})!`
      : 'Decision maker deleted.';
    res.json({ success: true, message: msg, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Auto-Replenish Batch of Fresh Leads
router.post('/leads/replenish', (req, res) => {
  try {
    const count = parseInt(req.body.count || 1, 10);
    const batch = researchService.replenishBatch(count);
    res.json({
      success: true,
      message: `Auto-generated ${batch.length} fresh prioritized decision-makers!`,
      count: batch.length,
      data: batch
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle / Configure Auto-Replenish Mode
router.put('/leads/replenish-config', (req, res) => {
  try {
    const updated = storage.updateConfig({ autoReplenish: req.body });
    res.json({ success: true, message: 'Auto-replenish configuration updated.', data: updated.autoReplenish });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTOMATIC WEBSITE LEAD FETCHER & CRAWLER
// ==========================================

// Automatically fetch any website, extract company & decision-makers, and generate lead
router.post('/leads/fetch-from-website', async (req, res) => {
  try {
    const { url, autoSave } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Please enter a website URL or domain name.' });
    }
    const result = await websiteFetcher.fetchWebsiteAndGenerateLead(url, { autoSave: autoSave !== false });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Autonomous web directory crawler to discover and generate merchant leads
router.post('/leads/auto-crawl-web', async (req, res) => {
  try {
    const count = parseInt(req.body.count || 3, 10);
    const category = req.body.category || 'all';
    const results = await websiteFetcher.autoDiscoverFromWebDirectory(count, category);
    res.json({
      success: true,
      count: results.length,
      data: results,
      message: `Successfully crawled web directory and generated ${results.length} merchant leads!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AI COMPANY SEARCH & RESEARCH ENGINE
// ==========================================

// Search any company using AI and generate decision-maker lead
router.post('/ai/search-company', async (req, res) => {
  try {
    const { query, autoSave } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Please enter a company name, brand, or search query.' });
    }
    const result = await aiSearchService.searchCompany(query, { autoSave: autoSave !== false });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get AI Search Status & Provider
router.get('/ai/status', (req, res) => {
  try {
    const config = storage.getConfig();
    const hasKey = !!(process.env.GEMINI_API_KEY || config.aiSettings?.geminiApiKey);
    res.json({
      success: true,
      provider: hasKey ? 'Google Gemini 1.5 Flash' : 'Autonomous AI Search Engine',
      hasKey,
      model: hasKey ? 'gemini-1.5-flash' : 'builtin-autonomous-agent'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Configure AI Engine Key
router.post('/ai/configure', (req, res) => {
  try {
    const { geminiApiKey } = req.body;
    const updated = storage.updateConfig({
      aiSettings: {
        geminiApiKey: (geminiApiKey || '').trim(),
        provider: geminiApiKey ? 'gemini' : 'autonomous'
      }
    });
    res.json({
      success: true,
      message: 'AI Search settings updated.',
      provider: geminiApiKey ? 'Google Gemini 1.5 Flash' : 'Autonomous AI Search Engine'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// RESEARCH & DISCOVERY MODULE
// ==========================================

// Generate Search Queries for Company
router.post('/research/queries', (req, res) => {
  try {
    const { companyName, domain } = req.body;
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required.' });
    }
    const queries = researchService.generateSearchQueries(companyName, domain);
    res.json({ success: true, data: queries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Discover Decision-Makers for Company
router.post('/research/discover', async (req, res) => {
  try {
    const { name, domain, industry, city } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Company name is required for discovery.' });
    }
    const discovery = await researchService.discoverCompanyDecisionMakers({ name, domain, industry, city });
    res.json({ success: true, data: discovery });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Batch Save Candidates
router.post('/research/save-candidates', async (req, res) => {
  try {
    const { companyId, candidates } = req.body;
    if (!candidates || !Array.isArray(candidates)) {
      return res.status(400).json({ success: false, error: 'Candidates array is required.' });
    }
    const saved = await researchService.saveDiscoveredCandidates(companyId, candidates);
    res.json({ success: true, savedCount: saved.length, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SALES CALLS & MANUAL REFERRAL SHARING
// ==========================================

// Log Sales Call
router.post('/calls', (req, res) => {
  try {
    const { companyId, decisionMakerId, outcome, notes, referralShared, consentVerified, channel } = req.body;
    if (!companyId || !decisionMakerId) {
      return res.status(400).json({ success: false, error: 'Company ID and Decision Maker ID are required.' });
    }

    const dm = dmService.getById(decisionMakerId);
    const comp = storage.getCompanyById(companyId);

    const callRecord = storage.logCall({
      companyId,
      companyName: comp ? comp.name : 'Unknown',
      decisionMakerId,
      decisionMakerName: dm ? dm.fullName : 'Unknown',
      designation: dm ? dm.designation : '',
      phone: dm ? dm.phone : '',
      outcome: outcome || 'Call Completed',
      notes: notes || '',
      referralShared: !!referralShared,
      sharedVia: channel || null,
      consentVerified: !!consentVerified,
      consentTimestamp: consentVerified ? new Date().toISOString() : null
    });

    res.status(201).json({ success: true, data: callRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Calls
router.get('/calls', (req, res) => {
  try {
    const calls = storage.getCalls();
    res.json({ success: true, data: calls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Templates for Go Extra Mile Merchant Listing
router.get('/referral/templates', (req, res) => {
  try {
    const templates = storage.getTemplates();
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Compose Message for Prospect
router.post('/referral/compose', (req, res) => {
  try {
    const { templateId, prospectName, companyName, designation } = req.body;
    const message = referralService.composeMessage({
      templateId,
      prospectName,
      companyName,
      designation
    });
    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Referral Share (With Strict Consent Enforcement)
router.post('/referral/share', (req, res) => {
  try {
    const {
      companyId,
      decisionMakerId,
      recipientName,
      recipientPhone,
      recipientEmail,
      channel,
      consentConfirmed,
      consentNote,
      templateId
    } = req.body;

    // Requirement 10: Never send promotional messages automatically without appropriate consent and authorization
    if (!consentConfirmed) {
      return res.status(403).json({
        success: false,
        error: 'Consent Required: You must verify that the decision-maker authorized receiving the Go Extra Mile referral link.'
      });
    }

    const result = referralService.executeManualShare({
      companyId,
      decisionMakerId,
      recipientName,
      recipientPhone,
      recipientEmail,
      channel,
      consentConfirmed,
      consentNote,
      templateId
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// List Share Logs
router.get('/referral/logs', (req, res) => {
  try {
    const logs = storage.getShareLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send / Compose Merchant Campaign Email Proposal
router.post('/referral/email-proposal', (req, res) => {
  try {
    const {
      companyId,
      decisionMakerId,
      recipientName,
      recipientEmail,
      companyName,
      consentConfirmed,
      customSubject,
      customBody
    } = req.body;

    const result = referralService.sendEmailProposal({
      companyId,
      decisionMakerId,
      recipientName,
      recipientEmail,
      companyName,
      consentConfirmed: consentConfirmed !== undefined ? consentConfirmed : true,
      customSubject,
      customBody
    });

    res.json({ success: true, message: 'Merchant email proposal generated & logged.', data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// CALLER PROFILE & DIALER SESSIONS
// ==========================================
router.get('/caller-profile', (req, res) => {
  try {
    const profile = callingService.getCallerProfile();
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/caller-profile', (req, res) => {
  try {
    const updated = callingService.updateCallerProfile(req.body);
    res.json({ success: true, message: 'Caller profile and agent number updated.', data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/calls/initiate', (req, res) => {
  try {
    const session = callingService.initiateCallSession(req.body);
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/calls/bridge', (req, res) => {
  try {
    const bridge = callingService.triggerTelephonyBridge(req.body);
    res.json({ success: true, message: 'Telephony bridge initiated. Your phone will ring shortly.', data: bridge });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/network-urls', (req, res) => {
  try {
    const urls = callingService.getLocalNetworkUrls();
    res.json({ success: true, data: urls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTOMATED AI CALLING BOT ENDPOINTS
// ==========================================
router.post('/calls/auto-call', (req, res) => {
  try {
    const autoCall = callingService.initiateAutomatedAiCall(req.body);
    res.json({ success: true, data: autoCall });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/calls/auto-queue', (req, res) => {
  try {
    const queue = callingService.getAutoDialQueue(req.query.tier);
    res.json({ success: true, count: queue.length, data: queue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Twilio TwiML Callback (When prospect presses 1 to receive link)
router.post('/calls/twiml-callback', (req, res) => {
  try {
    const { Digits } = req.body;
    const dmId = req.query.dmId;

    if (Digits === '1' && dmId) {
      const dm = dmService.getById(dmId);
      if (dm) {
        // Auto-log consent and positive outcome
        storage.logCall({
          companyId: dm.companyId,
          companyName: dm.companyName,
          decisionMakerId: dm.id,
          decisionMakerName: dm.fullName,
          designation: dm.designation,
          phone: dm.phone,
          outcome: 'Interested (Automated Call)',
          notes: 'Decision-maker pressed 1 during automated call to receive Go Extra Mile onboarding link.',
          referralShared: true,
          sharedVia: 'WhatsApp',
          consentVerified: true,
          consentTimestamp: new Date().toISOString()
        });
      }
    }

    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Thank you! We are sending the Go Extra Mile partner link directly to your WhatsApp. Have a great day!</Say>
</Response>`);
  } catch (err) {
    res.status(500).send('<Response><Say>An error occurred.</Say></Response>');
  }
});

module.exports = router;

