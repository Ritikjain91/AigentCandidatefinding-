const storage = require('./storageService');

class ReferralService {
  constructor() {
    this.OFFICIAL_CODE = 'GOMILES';
    this.OFFICIAL_URL = 'https://www.goextramile.in/r?code=GOMILES';
  }

  // Retrieve official link configuration with guaranteed code integrity
  getReferralConfig() {
    const config = storage.getConfig();
    const link = config.referral?.officialUrl || this.OFFICIAL_URL;

    // Safety check: Ensure code is never stripped
    if (!link.includes('code=GOMILES')) {
      return {
        officialUrl: this.OFFICIAL_URL,
        referralCode: this.OFFICIAL_CODE,
        appName: 'Go Extra Mile',
        salesPitch: 'List your products, exclusive offers, discounts and promotional deals on Go Extra Mile.'
      };
    }

    return {
      officialUrl: link,
      referralCode: this.OFFICIAL_CODE,
      appName: config.referral?.appName || 'Go Extra Mile',
      portalName: config.referral?.portalName || 'Go Extra Mile Merchant Portal',
      salesPitch: config.referral?.salesPitch || 'List your products, exclusive offers, discounts and promotional deals on Go Extra Mile.'
    };
  }

  // Compose personalized follow-up message containing the link
  composeMessage({ templateId, prospectName, companyName, designation }) {
    const templates = storage.getTemplates();
    const config = this.getReferralConfig();

    let template = templates.find(t => t.id === templateId) || templates[0];

    const safeName = prospectName || 'Partner';
    const safeCompany = companyName || 'your company';

    const subject = (template.subject || '')
      .replace(/{{name}}/g, safeName)
      .replace(/{{companyName}}/g, safeCompany);

    let body = (template.body || '')
      .replace(/{{name}}/g, safeName)
      .replace(/{{companyName}}/g, safeCompany)
      .replace(/{{designation}}/g, designation || 'Leader')
      .replace(/{{referralUrl}}/g, config.officialUrl)
      .replace(/{{referralCode}}/g, config.referralCode);

    return {
      templateId: template.id,
      templateName: template.name,
      type: template.type,
      subject,
      body,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode
    };
  }

  // Generate shareable links for WhatsApp, Email, etc.
  generateShareLinks({ phone, email, messageText, subjectText }) {
    const config = this.getReferralConfig();
    const encodedText = encodeURIComponent(messageText || `Hi, explore listing your brand deals on Go Extra Mile here: ${config.officialUrl}`);
    const encodedSubject = encodeURIComponent(subjectText || 'Go Extra Mile - Partner Onboarding Link');

    // Clean phone number for WhatsApp
    let cleanPhone = '';
    if (phone) {
      cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Default to India prefix if 10 digits
      }
    }

    const whatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    const mailtoUrl = email 
      ? `mailto:${encodeURIComponent(email)}?subject=${encodedSubject}&body=${encodedText}`
      : `mailto:?subject=${encodedSubject}&body=${encodedText}`;

    return {
      officialUrl: config.officialUrl,
      referralCode: config.referralCode,
      whatsappUrl,
      mailtoUrl,
      encodedText
    };
  }

  // Execute manual share with strict consent verification
  executeManualShare({
    companyId,
    decisionMakerId,
    recipientName,
    recipientPhone,
    recipientEmail,
    channel,
    consentConfirmed,
    consentNote,
    templateId
  }) {
    // REQUIREMENT 10: Never send promotional messages automatically without appropriate consent and authorization
    if (!consentConfirmed) {
      throw new Error('Compliance Violation: Explicit consent and authorization from the decision-maker is required before sharing promotional referral links.');
    }

    const config = this.getReferralConfig();
    const composed = this.composeMessage({
      templateId,
      prospectName: recipientName,
      companyName: 'Your Business'
    });

    const shareLinks = this.generateShareLinks({
      phone: recipientPhone,
      email: recipientEmail,
      messageText: composed.body,
      subjectText: composed.subject
    });

    // Record in share audit log
    const logEntry = storage.logShare({
      companyId: companyId || null,
      decisionMakerId: decisionMakerId || null,
      recipientName,
      recipientPhone: recipientPhone || null,
      recipientEmail: recipientEmail || null,
      channel,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      consentConfirmed: true,
      consentNote: consentNote || 'Manual post-call share initiated with verified verbal/written consent.',
      messageSnippet: composed.body.slice(0, 150) + '...',
      trigger: 'Manual Share'
    });

    return {
      success: true,
      log: logEntry,
      shareLinks,
      composedMessage: composed
    };
  }
}

module.exports = new ReferralService();

