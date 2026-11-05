const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const CONFIG_PATH = path.join(__dirname, '../../config/default.json');
const TEMPLATES_PATH = path.join(__dirname, '../../config/templates.json');

class StorageService {
  constructor() {
    this.ensureFilesExist();
    this.ensureUserTestLead();
  }

  ensureFilesExist() {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify({ companies: [], decisionMakers: [], calls: [], shareLogs: [] }, null, 2));
    }
  }

  ensureUserTestLead() {
    const db = this.readDb();
    db.companies = db.companies || [];
    db.decisionMakers = db.decisionMakers || [];

    const testNumber = '8518900153';
    const exists = db.decisionMakers.some(dm => (dm.phone || '').replace(/[^0-9]/g, '').includes(testNumber));

    if (!exists) {
      const compId = `comp_test_${Date.now()}`;
      const newComp = {
        id: compId,
        name: 'Ritik Jain Enterprises (AI Bot Test Company)',
        domain: 'ritikjaintest.in',
        website: 'https://ritikjaintest.in',
        industry: 'Retail & Consumer Goods',
        city: 'Indore / Bhopal',
        scale: 'small',
        scaleLabel: 'AI Bot Test Sandbox',
        status: 'Test Sandbox',
        notes: 'Dedicated test company for testing the AI voice bot, audible pitch, and WhatsApp link sending.',
        createdAt: new Date().toISOString()
      };
      db.companies.unshift(newComp);

      const newDm = {
        id: `dm_test_${Date.now()}`,
        companyId: compId,
        companyName: newComp.name,
        fullName: 'Ritik Jain (Test Line)',
        designation: 'Owner & Founder',
        priorityTier: 1,
        priorityRank: 1,
        priorityLabel: 'Owner (1st Preference - Test Line)',
        phone: '+91 8518900153',
        email: 'ritik@goextramile.in',
        linkedInUrl: 'https://www.linkedin.com/in/ritik-jain',
        sourceUrl: 'https://www.goextramile.in/r?code=GOMILES',
        verificationStatus: 'Verified',
        verificationMethod: 'Official developer testing SIM number',
        isCustomerSupport: false,
        isTestLead: true,
        notes: 'User testing line (+91 8518900153): Click "Bot Call" or "Test Bot" to test voice pitch, WhatsApp notes, and email proposals hands-on.',
        createdAt: new Date().toISOString()
      };
      db.decisionMakers.unshift(newDm);
      this.writeDb(db);
    }
  }

  readDb() {
    try {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading database file:', err);
      return { companies: [], decisionMakers: [], calls: [], shareLogs: [] };
    }
  }

  writeDb(data) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Error writing to database:', err);
      throw err;
    }
  }

  getConfig() {
    try {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading config file:', err);
      return {
        referral: {
          officialUrl: 'https://www.goextramile.in/r?code=GOMILES',
          referralCode: 'GOMILES'
        }
      };
    }
  }

  updateConfig(updates) {
    const current = this.getConfig();

    // Guardrail: Do not modify or remove the referral code GOMILES
    if (updates.referral) {
      if (updates.referral.referralCode && updates.referral.referralCode !== 'GOMILES') {
        throw new Error('Referral code GOMILES is protected and cannot be modified or removed.');
      }
      if (updates.referral.officialUrl && !updates.referral.officialUrl.includes('code=GOMILES')) {
        throw new Error('Official referral URL must retain the mandatory code parameter "?code=GOMILES".');
      }
      current.referral = {
        ...current.referral,
        ...updates.referral,
        referralCode: 'GOMILES' // strictly enforced
      };
    }

    if (updates.compliance) {
      current.compliance = { ...current.compliance, ...updates.compliance };
    }

    if (updates.caller) {
      current.caller = { ...current.caller, ...updates.caller };
    }

    if (updates.autoReplenish) {
      current.autoReplenish = { ...current.autoReplenish, ...updates.autoReplenish };
    }

    if (updates.telephony) {
      current.telephony = { ...(current.telephony || {}), ...updates.telephony };
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf-8');
    return current;
  }

  getTemplates() {
    try {
      const content = fs.readFileSync(TEMPLATES_PATH, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Error reading templates file:', err);
      return [];
    }
  }

  // Companies
  getCompanies() {
    const db = this.readDb();
    return db.companies || [];
  }

  getCompanyById(id) {
    const db = this.readDb();
    return (db.companies || []).find(c => c.id === id) || null;
  }

  addCompany(company) {
    const db = this.readDb();
    const newCompany = {
      id: company.id || `comp_${Date.now()}`,
      name: company.name.trim(),
      domain: company.domain ? company.domain.trim() : '',
      industry: company.industry || 'General Retail & Services',
      city: company.city || 'India',
      scale: company.scale || 'domestic',
      scaleLabel: company.scaleLabel || 'Domestic Business',
      website: company.website || (company.domain ? `https://${company.domain}` : ''),
      status: company.status || 'New',
      notes: company.notes || '',
      createdAt: new Date().toISOString()
    };
    db.companies = db.companies || [];
    db.companies.push(newCompany);
    this.writeDb(db);
    return newCompany;
  }

  updateCompany(id, updates) {
    const db = this.readDb();
    const index = (db.companies || []).findIndex(c => c.id === id);
    if (index === -1) return null;
    db.companies[index] = { ...db.companies[index], ...updates, updatedAt: new Date().toISOString() };
    this.writeDb(db);
    return db.companies[index];
  }

  deleteCompany(id) {
    const db = this.readDb();
    db.companies = (db.companies || []).filter(c => c.id !== id);
    // Also remove associated decision makers
    db.decisionMakers = (db.decisionMakers || []).filter(dm => dm.companyId !== id);
    this.writeDb(db);
    return true;
  }

  // Decision Makers
  getDecisionMakers() {
    const db = this.readDb();
    return db.decisionMakers || [];
  }

  getDecisionMakerById(id) {
    const db = this.readDb();
    return (db.decisionMakers || []).find(dm => dm.id === id) || null;
  }

  addDecisionMaker(dm) {
    const db = this.readDb();
    db.decisionMakers = db.decisionMakers || [];
    db.decisionMakers.push(dm);
    this.writeDb(db);
    return dm;
  }

  updateDecisionMaker(id, updates) {
    const db = this.readDb();
    const index = (db.decisionMakers || []).findIndex(dm => dm.id === id);
    if (index === -1) return null;
    db.decisionMakers[index] = { ...db.decisionMakers[index], ...updates, updatedAt: new Date().toISOString() };
    this.writeDb(db);
    return db.decisionMakers[index];
  }

  deleteDecisionMaker(id) {
    const db = this.readDb();
    db.decisionMakers = (db.decisionMakers || []).filter(dm => dm.id !== id);
    this.writeDb(db);
    return true;
  }

  // Call Logs & Frequency Enforcement (Max 2 Attempts per Prospect)
  MAX_CALLS_PER_PROSPECT = 2;

  getCalls() {
    const db = this.readDb();
    return db.calls || [];
  }

  getCallCountForContact({ decisionMakerId, companyId, phone }) {
    const db = this.readDb();
    const calls = db.calls || [];
    let count = 0;

    const cleanTargetPhone = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : null;

    for (const c of calls) {
      if (decisionMakerId && c.decisionMakerId === decisionMakerId) {
        count++;
        continue;
      }
      if (companyId && c.companyId === companyId) {
        count++;
        continue;
      }
      if (cleanTargetPhone && (c.targetNumber || c.targetPhone || c.customPhone)) {
        const cPhone = (c.targetNumber || c.targetPhone || c.customPhone).replace(/[^0-9]/g, '').slice(-10);
        if (cPhone === cleanTargetPhone) {
          count++;
        }
      }
    }

    return count;
  }

  isCallLimitReached({ decisionMakerId, companyId, phone }) {
    return this.getCallCountForContact({ decisionMakerId, companyId, phone }) >= this.MAX_CALLS_PER_PROSPECT;
  }

  logCall(call) {
    const db = this.readDb();
    db.calls = db.calls || [];
    const newCall = {
      id: call.id || `call_${Date.now()}`,
      calledAt: new Date().toISOString(),
      ...call
    };
    db.calls.unshift(newCall);

    // Track calls on Decision Maker
    if (call.decisionMakerId) {
      const dm = (db.decisionMakers || []).find(d => d.id === call.decisionMakerId);
      if (dm) {
        dm.callCount = (dm.callCount || 0) + 1;
        dm.lastCalledAt = newCall.calledAt;
        dm.lastOutcome = call.outcome || 'Call Completed';
        if (dm.callCount >= this.MAX_CALLS_PER_PROSPECT) {
          dm.callLimitReached = true;
        }
      }
    }

    // Track calls on Company and update status
    if (call.companyId) {
      const comp = (db.companies || []).find(c => c.id === call.companyId);
      if (comp) {
        comp.callCount = (comp.callCount || 0) + 1;
        comp.lastContactedAt = newCall.calledAt;
        if (call.outcome === 'Interested') {
          comp.status = 'Qualified - Interested';
        } else if (comp.callCount >= this.MAX_CALLS_PER_PROSPECT) {
          comp.status = 'Max Calls Reached (2/2 - Excluded)';
          comp.callLimitReached = true;
        } else {
          comp.status = `Contacted (${comp.callCount}/2 Attempts)`;
        }
      }
    }

    this.writeDb(db);
    return newCall;
  }

  // Share Logs
  getShareLogs() {
    const db = this.readDb();
    return db.shareLogs || [];
  }

  logShare(share) {
    const db = this.readDb();
    db.shareLogs = db.shareLogs || [];
    const newShare = {
      id: share.id || `share_${Date.now()}`,
      timestamp: new Date().toISOString(),
      referralUrl: 'https://www.goextramile.in/r?code=GOMILES',
      referralCode: 'GOMILES',
      ...share
    };
    db.shareLogs.unshift(newShare);
    this.writeDb(db);
    return newShare;
  }
}

module.exports = new StorageService();

