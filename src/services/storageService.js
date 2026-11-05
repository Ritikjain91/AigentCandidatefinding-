const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/database.json');
const CONFIG_PATH = path.join(__dirname, '../../config/default.json');
const TEMPLATES_PATH = path.join(__dirname, '../../config/templates.json');

class StorageService {
  constructor() {
    this.ensureFilesExist();
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

  // Call Logs
  getCalls() {
    const db = this.readDb();
    return db.calls || [];
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

    // Update company status if call outcome leads to progress
    if (call.companyId && call.outcome) {
      const comp = (db.companies || []).find(c => c.id === call.companyId);
      if (comp) {
        comp.status = call.outcome === 'Interested' ? 'Qualified - Follow-up' : 'Call Completed';
        comp.lastContactedAt = new Date().toISOString();
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

