const storage = require('./storageService');
const crypto = require('crypto');

class DecisionMakerService {
  constructor() {
    this.config = storage.getConfig();
  }

  // Determine Priority Tier and Rank based on designation
  classifyDesignation(designation) {
    if (!designation) {
      return { tier: 3, rank: 99, label: 'Uncategorized' };
    }

    const d = designation.trim().toLowerCase();

    // First preference: Owner, Managing Director (MD), Chief Executive Officer (CEO), Founder / Co-Founder, Chairman, Managing Partner, Proprietor
    if (d.includes('owner') || d.includes('proprietor') || d.includes('partner')) {
      return { tier: 1, rank: 1, label: 'Owner (1st Preference)' };
    }
    if (d.includes('managing director') || /\bmd\b/.test(d) || d.includes('executive director')) {
      return { tier: 1, rank: 2, label: 'Managing Director (1st Preference)' };
    }
    if (d.includes('chief executive officer') || /\bceo\b/.test(d)) {
      return { tier: 1, rank: 3, label: 'CEO (1st Preference)' };
    }
    if (d.includes('founder') || d.includes('co-founder') || d.includes('cofounder')) {
      return { tier: 1, rank: 4, label: 'Founder / Co-Founder (1st Preference)' };
    }
    if (d.includes('chairman') || d.includes('chairperson') || d.includes('president')) {
      return { tier: 1, rank: 2, label: 'Chairman (1st Preference)' };
    }

    // Second preference: Head of Marketing, Marketing Manager
    if (d.includes('head of marketing') || d.includes('marketing head') || d.includes('vp marketing') || /\bcmo\b/.test(d) || d.includes('chief marketing officer') || d.includes('director of marketing')) {
      return { tier: 2, rank: 5, label: 'Head of Marketing (2nd Preference)' };
    }
    if (d.includes('marketing manager') || d.includes('marketing lead') || d.includes('growth manager')) {
      return { tier: 2, rank: 6, label: 'Marketing Manager (2nd Preference)' };
    }

    // Third preference: Head of Sales, Sales Manager
    if (d.includes('head of sales') || d.includes('sales head') || d.includes('vp sales') || d.includes('chief commercial officer') || /\bcco\b/.test(d) || d.includes('director of sales')) {
      return { tier: 3, rank: 7, label: 'Head of Sales (3rd Preference)' };
    }
    if (d.includes('sales manager') || d.includes('sales lead') || d.includes('business development manager') || d.includes('bdm')) {
      return { tier: 3, rank: 8, label: 'Sales Manager (3rd Preference)' };
    }

    // General Director / Leadership without marketing/sales is Tier 1
    if (d.includes('director')) {
      return { tier: 1, rank: 2, label: 'Director (1st Preference)' };
    }

    return { tier: 3, rank: 90, label: 'Other Role' };
  }

  // Check if phone or email appears to be customer care / customer support
  isCustomerCareContact(phone, email) {
    const config = storage.getConfig();
    const prefixes = config.customerCarePatterns?.phonePrefixes || ['1800', '1860', '0800'];
    const emailKeywords = config.customerCarePatterns?.emailKeywords || ['support@', 'care@', 'customercare@', 'help@', 'info@', 'contact@', 'helpdesk@'];

    const reasons = [];

    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      for (const prefix of prefixes) {
        const cleanPrefix = prefix.replace(/[\s\-\(\)\+]/g, '');
        if (cleanPhone.startsWith(cleanPrefix) || cleanPhone.includes(cleanPrefix)) {
          reasons.push(`Phone number starts with or contains toll-free/helpline prefix "${prefix}"`);
          break;
        }
      }
    }

    if (email) {
      const lowerEmail = email.toLowerCase().trim();
      for (const kw of emailKeywords) {
        if (lowerEmail.startsWith(kw) || lowerEmail.includes(kw)) {
          reasons.push(`Email matches generic support address pattern "${kw}"`);
          break;
        }
      }
    }

    return {
      isCustomerCare: reasons.length > 0,
      reasons
    };
  }

  // Validate contact data integrity
  validateDecisionMaker(data) {
    const errors = [];

    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push('Full name is required and cannot be empty.');
    }

    if (!data.designation || data.designation.trim().length < 2) {
      errors.push('Current designation is required.');
    }

    if (!data.companyName || data.companyName.trim().length < 2) {
      errors.push('Company name is required.');
    }

    if (!data.phone || data.phone.trim().length < 6) {
      errors.push('Publicly available professional business phone number is required.');
    }

    if (!data.sourceUrl || data.sourceUrl.trim().length < 4) {
      errors.push('Source URL (where this decision-maker was identified) is required for auditability.');
    }

    // STRICT GUARDRAIL: Never substitute customer-care or customer-support numbers for decision-maker contacts
    const ccCheck = this.isCustomerCareContact(data.phone, data.email);
    if (ccCheck.isCustomerCare) {
      errors.push(`Customer-Care Guardrail Triggered: ${ccCheck.reasons.join('; ')}. Never substitute customer care/support channels for direct decision-maker contacts.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get all decision makers with priority sorting
  getAll(filter = {}) {
    let list = storage.getDecisionMakers();

    if (filter.companyId) {
      list = list.filter(dm => dm.companyId === filter.companyId);
    }
    if (filter.tier) {
      const tierNum = parseInt(filter.tier, 10);
      list = list.filter(dm => dm.priorityTier === tierNum);
    }
    if (filter.verificationStatus) {
      list = list.filter(dm => dm.verificationStatus.toLowerCase() === filter.verificationStatus.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(dm =>
        dm.fullName.toLowerCase().includes(q) ||
        dm.companyName.toLowerCase().includes(q) ||
        dm.designation.toLowerCase().includes(q) ||
        (dm.phone && dm.phone.includes(q)) ||
        (dm.email && dm.email.toLowerCase().includes(q))
      );
    }

    // Sorting: Tier ascending (1 -> 2 -> 3), Rank ascending (1 -> 8), Verified first, then FullName
    return list.sort((a, b) => {
      if (a.priorityTier !== b.priorityTier) {
        return a.priorityTier - b.priorityTier;
      }
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      if (a.verificationStatus === 'Verified' && b.verificationStatus !== 'Verified') {
        return -1;
      }
      if (b.verificationStatus === 'Verified' && a.verificationStatus !== 'Verified') {
        return 1;
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }

  getById(id) {
    return storage.getDecisionMakerById(id);
  }

  // Create new decision maker
  create(payload) {
    const validation = this.validateDecisionMaker(payload);
    if (!validation.isValid) {
      const err = new Error(validation.errors.join(' '));
      err.validationErrors = validation.errors;
      throw err;
    }

    const classification = this.classifyDesignation(payload.designation);

    const dm = {
      id: payload.id || `dm_${crypto.randomUUID().slice(0, 8)}`,
      companyId: payload.companyId || null,
      companyName: payload.companyName.trim(),
      fullName: payload.fullName.trim(),
      designation: payload.designation.trim(),
      priorityTier: classification.tier,
      priorityRank: classification.rank,
      priorityLabel: classification.label,
      phone: payload.phone.trim(),
      email: payload.email ? payload.email.trim() : null,
      linkedInUrl: payload.linkedInUrl ? payload.linkedInUrl.trim() : null,
      sourceUrl: payload.sourceUrl.trim(),
      verificationStatus: payload.verificationStatus === 'Verified' ? 'Verified' : 'Unverified',
      verifiedAt: payload.verificationStatus === 'Verified' ? new Date().toISOString() : null,
      verificationMethod: payload.verificationMethod || (payload.verificationStatus === 'Verified' ? 'Manual verification check' : null),
      isCustomerSupport: false,
      notes: payload.notes ? payload.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    return storage.addDecisionMaker(dm);
  }

  // Update existing decision maker
  update(id, updates) {
    const existing = storage.getDecisionMakerById(id);
    if (!existing) {
      throw new Error(`Decision-maker with ID ${id} not found.`);
    }

    // If designation changed, reclassify priority
    let priorityUpdates = {};
    if (updates.designation && updates.designation !== existing.designation) {
      const classification = this.classifyDesignation(updates.designation);
      priorityUpdates = {
        priorityTier: classification.tier,
        priorityRank: classification.rank,
        priorityLabel: classification.label
      };
    }

    // Check customer-care guardrail if phone or email updated
    const phoneToCheck = updates.phone !== undefined ? updates.phone : existing.phone;
    const emailToCheck = updates.email !== undefined ? updates.email : existing.email;
    const ccCheck = this.isCustomerCareContact(phoneToCheck, emailToCheck);
    if (ccCheck.isCustomerCare) {
      throw new Error(`Customer-Care Guardrail Triggered: ${ccCheck.reasons.join('; ')}. Direct contact cannot be customer care.`);
    }

    const merged = {
      ...updates,
      ...priorityUpdates
    };

    return storage.updateDecisionMaker(id, merged);
  }

  // Set verification status
  verify(id, status = 'Verified', method = 'Manual Direct Check') {
    const existing = storage.getDecisionMakerById(id);
    if (!existing) {
      throw new Error(`Decision-maker with ID ${id} not found.`);
    }

    const updates = {
      verificationStatus: status === 'Verified' ? 'Verified' : 'Unverified',
      verifiedAt: status === 'Verified' ? new Date().toISOString() : null,
      verificationMethod: status === 'Verified' ? method : null
    };

    return storage.updateDecisionMaker(id, updates);
  }

  delete(id) {
    const existing = storage.getDecisionMakerById(id);
    const deleted = storage.deleteDecisionMaker(id);
    const config = storage.getConfig();

    let autoReplenished = null;
    if (config.autoReplenish?.autoDiscoverOnDelete) {
      try {
        const researchService = require('./researchService');
        autoReplenished = researchService.generateAndSaveFreshLead();
      } catch (err) {
        console.warn('Auto-replenish on delete notice:', err.message);
      }
    }

    return {
      deleted: !!deleted,
      deletedId: id,
      deletedName: existing ? existing.fullName : '',
      autoReplenished: !!autoReplenished,
      newLead: autoReplenished ? autoReplenished.decisionMaker : null,
      newCompany: autoReplenished ? autoReplenished.company : null
    };
  }
}

module.exports = new DecisionMakerService();

