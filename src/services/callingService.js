const storage = require('./storageService');
const dmService = require('./decisionMakerService');
const referralService = require('./referralService');

class CallingService {
  constructor() {
    this.defaultCaller = {
      agentPhone: '+91 8518900153',
      rawPhone: '8518900153',
      agentName: 'Ritik Jain',
      companyName: 'Go Extra Mile Partnerships'
    };
  }

  getCallerProfile() {
    const config = storage.getConfig();
    return config.caller || this.defaultCaller;
  }

  updateCallerProfile(profile) {
    const cleanRaw = (profile.agentPhone || profile.rawPhone || '8518900153').replace(/[^0-9]/g, '');
    const formatted = cleanRaw.startsWith('91') && cleanRaw.length === 12
      ? `+${cleanRaw.slice(0, 2)} ${cleanRaw.slice(2)}`
      : cleanRaw.length === 10
      ? `+91 ${cleanRaw}`
      : profile.agentPhone;

    const updated = {
      agentPhone: formatted,
      rawPhone: cleanRaw.slice(-10),
      agentName: profile.agentName || 'Ritik Jain',
      companyName: profile.companyName || 'Go Extra Mile Partnerships',
      callMode: profile.callMode || 'device-dialer',
      enableBridge: profile.enableBridge !== undefined ? profile.enableBridge : true,
      enableAiPitchAssistant: profile.enableAiPitchAssistant !== undefined ? profile.enableAiPitchAssistant : true
    };

    storage.updateConfig({ caller: updated });
    return updated;
  }

  // Generate live sales pitch script for the caller
  generateCallScript(decisionMaker, caller) {
    const refConfig = referralService.getReferralConfig();
    const dmName = decisionMaker.fullName || 'Partner';
    const company = decisionMaker.companyName || 'your company';
    const designation = decisionMaker.designation || 'Leader';

    return {
      openingGreeting: `Hello ${dmName}! This is ${caller.agentName} calling from ${caller.companyName}. I hope I caught you at a good time.`,
      contextIntro: `I noticed ${company}'s great presence in the market and wanted to reach out to you directly as ${designation} regarding an exclusive merchant feature on Go Extra Mile.`,
      coreProposition: `Go Extra Mile connects thousands of active shoppers looking for exclusive brand deals, seasonal discounts, and promotional offers. We are currently listing premier brands with zero upfront friction, giving you complete autonomy over your deal margins and campaign duration.`,
      callToAction: `Would you be open to listing some of ${company}'s exclusive product bundles or special discount offers on our app?`,
      objectionHandled: `There are zero listing fees. I can share our official partner onboarding link directly on your WhatsApp right now (${refConfig.officialUrl}) with partner code ${refConfig.referralCode} so you can take a look at your convenience.`,
      closingConfirmation: `Great! I will send the official onboarding link right over to your WhatsApp (${decisionMaker.phone}). Thank you for your time, ${dmName}!`
    };
  }

  // Initiate a call session from user's number 8518900153 to decision-maker
  initiateCallSession({ decisionMakerId, customPhone, callMode = 'device-dialer' }) {
    const caller = this.getCallerProfile();
    let dm = null;

    if (decisionMakerId) {
      dm = dmService.getById(decisionMakerId);
    }

    if (!dm && !customPhone) {
      throw new Error('A valid decision-maker or phone number is required to place a call.');
    }

    const targetPhone = dm ? dm.phone : customPhone;
    const cleanTargetPhone = targetPhone.replace(/[^0-9]/g, '');

    // Format tel URI for direct dial on device
    const dialPhoneFormatted = cleanTargetPhone.startsWith('91') || cleanTargetPhone.startsWith('+91')
      ? cleanTargetPhone
      : `91${cleanTargetPhone.slice(-10)}`;

    const telUri = `tel:+${dialPhoneFormatted}`;
    const whatsappCallUri = `https://api.whatsapp.com/send?phone=${dialPhoneFormatted}`;

    const script = this.generateCallScript(dm || {
      fullName: 'Decision-Maker',
      companyName: 'Company',
      designation: 'Leader',
      phone: targetPhone
    }, caller);

    // Call bridge metadata
    const session = {
      sessionId: `call_sess_${Date.now()}`,
      callerNumber: caller.agentPhone,
      callerName: caller.agentName,
      targetNumber: targetPhone,
      targetCleanPhone: dialPhoneFormatted,
      targetName: dm ? dm.fullName : 'Prospect',
      targetDesignation: dm ? dm.designation : '',
      targetCompany: dm ? dm.companyName : '',
      companyId: dm ? dm.companyId : null,
      decisionMakerId: dm ? dm.id : null,
      dialTelUri: telUri,
      whatsappDialUri: whatsappCallUri,
      status: 'Initiated',
      callMode,
      script,
      initiatedAt: new Date().toISOString()
    };

    return session;
  }
}

module.exports = new CallingService();
