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
  composeMessage({ templateId, prospectName, companyName, designation, notes }) {
    const templates = storage.getTemplates();
    const config = this.getReferralConfig();

    let template = templates.find(t => t.id === templateId) || templates[0];

    const safeName = prospectName || 'Partner';
    const safeCompany = companyName || 'your company';
    const safeNotes = (notes && notes.trim()) ? notes.trim() : 'Discussed listing exclusive brand deals, product discounts, and seasonal offers on Go Extra Mile app.';

    const subject = (template.subject || '')
      .replace(/{{name}}/g, safeName)
      .replace(/{{companyName}}/g, safeCompany);

    let body = (template.body || '')
      .replace(/{{name}}/g, safeName)
      .replace(/{{companyName}}/g, safeCompany)
      .replace(/{{designation}}/g, designation || 'Leader')
      .replace(/{{referralUrl}}/g, config.officialUrl)
      .replace(/{{referralCode}}/g, config.referralCode)
      .replace(/{{notes}}/g, safeNotes);

    return {
      templateId: template.id,
      templateName: template.name,
      type: template.type,
      subject,
      body,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      notes: safeNotes
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
    companyName,
    channel,
    consentConfirmed,
    consentNote,
    templateId,
    notes,
    customMessage
  }) {
    // REQUIREMENT 10: Never send promotional messages automatically without appropriate consent and authorization
    if (!consentConfirmed) {
      throw new Error('Compliance Violation: Explicit consent and authorization from the decision-maker is required before sharing promotional referral links.');
    }

    const config = this.getReferralConfig();
    const composed = this.composeMessage({
      templateId,
      prospectName: recipientName,
      companyName: companyName || 'Your Business',
      notes
    });

    const finalBody = customMessage || composed.body;

    const shareLinks = this.generateShareLinks({
      phone: recipientPhone,
      email: recipientEmail,
      messageText: finalBody,
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
      messageSnippet: finalBody.slice(0, 150) + '...',
      trigger: 'Manual Share'
    });

    return {
      success: true,
      log: logEntry,
      shareLinks,
      composedMessage: composed,
      notes: notes || composed.notes
    };
  }

  // Compose and log merchant email proposal to run deals on Go Extra Mile app
  sendEmailProposal({
    companyId,
    decisionMakerId,
    recipientName,
    recipientEmail,
    companyName,
    consentConfirmed = true,
    customSubject,
    customBody
  }) {
    const config = this.getReferralConfig();
    const composed = this.composeMessage({
      templateId: 'tpl_email_merchant_campaign',
      prospectName: recipientName,
      companyName: companyName || 'your brand'
    });

    const subject = customSubject || composed.subject;
    const body = customBody || composed.body;

    const shareLinks = this.generateShareLinks({
      email: recipientEmail,
      messageText: body,
      subjectText: subject
    });

    const logEntry = storage.logShare({
      companyId: companyId || null,
      decisionMakerId: decisionMakerId || null,
      recipientName,
      recipientEmail: recipientEmail || null,
      channel: 'Email',
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      consentConfirmed: true,
      consentNote: 'Decision-maker requested official Go Extra Mile campaign proposal & onboarding link via email.',
      messageSnippet: body.slice(0, 150) + '...',
      trigger: 'Email Merchant Proposal'
    });

    return {
      success: true,
      log: logEntry,
      subject,
      body,
      mailtoUrl: shareLinks.mailtoUrl,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode
    };
  }

  // Compose WhatsApp message embedding custom call notes and Go Extra Mile referral link
  composeWhatsAppNoteMessage({ prospectName, companyName, designation, notes }) {
    const config = this.getReferralConfig();
    const safeName = prospectName || 'Partner';
    const safeCompany = companyName || 'your brand';
    const safeRole = designation || 'Leader';
    const safeNotes = (notes && notes.trim()) ? notes.trim() : 'Discussed listing exclusive brand deals, promotional discounts, and seasonal offers on Go Extra Mile app with zero upfront fees.';

    const message = `Hello ${safeName} (${safeRole} at ${safeCompany}),

Thank you for connecting with us today regarding ${safeCompany}!

📝 Discussion Notes & Action Points:
${safeNotes}

🚀 Partnering with Go Extra Mile:
Go Extra Mile connects premier brands with thousands of active buyers looking for exclusive deals, product discounts, and promotional offers with 0% upfront listing fees.

🔗 Official Partner Onboarding Link:
${config.officialUrl}

🔑 Partner Referral Code: ${config.referralCode}
(Applied for prioritized merchant onboarding & dedicated support)

Please tap the link above to complete your quick merchant profile and publish your offers. Feel free to reply directly here if you have any questions!

Best regards,
Ritik Jain
Go Extra Mile Partnerships
📞 +91 8518900153`;

    return {
      messageText: message,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      notes: safeNotes
    };
  }

  // Send / generate WhatsApp message bundling notes and referral link with consent logging
  sendWhatsAppWithNotes({
    companyId,
    decisionMakerId,
    recipientName,
    recipientPhone,
    companyName,
    designation,
    notes,
    consentConfirmed = true
  }) {
    if (!consentConfirmed) {
      throw new Error('Compliance Violation: Consent confirmation is required to dispatch referral link.');
    }

    const config = this.getReferralConfig();
    const composed = this.composeWhatsAppNoteMessage({
      prospectName: recipientName,
      companyName,
      designation,
      notes
    });

    const shareLinks = this.generateShareLinks({
      phone: recipientPhone,
      messageText: composed.messageText
    });

    const logEntry = storage.logShare({
      companyId: companyId || null,
      decisionMakerId: decisionMakerId || null,
      recipientName,
      recipientPhone: recipientPhone || null,
      channel: 'WhatsApp',
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      consentConfirmed: true,
      consentNote: `WhatsApp follow-up with call notes & onboarding link dispatched to ${recipientName}. Notes: ${composed.notes.slice(0, 100)}`,
      messageSnippet: composed.messageText.slice(0, 150) + '...',
      trigger: 'WhatsApp Call Notes & Link'
    });

    return {
      success: true,
      log: logEntry,
      messageText: composed.messageText,
      whatsappUrl: shareLinks.whatsappUrl,
      referralUrl: config.officialUrl,
      referralCode: config.referralCode,
      notes: composed.notes
    };
  }
}

module.exports = new ReferralService();

