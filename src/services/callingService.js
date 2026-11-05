const os = require('os');
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
      enableAiPitchAssistant: profile.enableAiPitchAssistant !== undefined ? profile.enableAiPitchAssistant : true,
      telephonyProvider: profile.telephonyProvider || 'simulated-bridge'
    };

    storage.updateConfig({ caller: updated });
    return updated;
  }

  // Get local network IPs for connecting via mobile phone browser
  getLocalNetworkUrls() {
    const interfaces = os.networkInterfaces();
    const urls = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          urls.push({
            name,
            ip: iface.address,
            url: `http://${iface.address}:3000`
          });
        }
      }
    }

    return urls;
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

    // QR Code to scan with phone camera to instantly trigger the call on mobile
    const dialQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(telUri)}`;

    const script = this.generateCallScript(dm || {
      fullName: 'Decision-Maker',
      companyName: 'Company',
      designation: 'Leader',
      phone: targetPhone
    }, caller);

    const localIps = this.getLocalNetworkUrls();
    const primaryMobileUrl = localIps.length > 0 ? localIps[0].url : 'http://localhost:3000';
    const mobileAppQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(primaryMobileUrl)}`;

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
      dialQrCodeUrl,
      mobileAppQrUrl,
      mobileAccessUrl: primaryMobileUrl,
      status: 'Initiated',
      callMode,
      script,
      initiatedAt: new Date().toISOString()
    };

    return session;
  }

  // Cloud Telephony Bridge: Rings user's phone 8518900153 first, then bridges to prospect
  triggerTelephonyBridge({ decisionMakerId, customPhone }) {
    const caller = this.getCallerProfile();
    let dm = null;

    if (decisionMakerId) {
      dm = dmService.getById(decisionMakerId);
    }

    const targetPhone = dm ? dm.phone : customPhone;
    if (!targetPhone) {
      throw new Error('A target phone number is required to trigger telephony bridge.');
    }

    // Two-leg call bridge simulation / execution payload
    const bridgeRecord = {
      bridgeId: `bridge_${Date.now()}`,
      leg1: {
        number: caller.agentPhone,
        description: `Calling your phone (${caller.agentPhone})`,
        status: 'Ringing Agent Phone'
      },
      leg2: {
        number: targetPhone,
        name: dm ? dm.fullName : 'Prospect',
        description: `Bridging to prospect (${targetPhone})`,
        status: 'Queued'
      },
      provider: caller.telephonyProvider || 'simulated-bridge',
      instructions: [
        `1. Your phone (${caller.agentPhone}) will receive an incoming call.`,
        `2. Answer the call on your phone.`,
        `3. System will immediately dial ${targetPhone} and connect you both directly!`,
        `4. Pitch Go Extra Mile and listing exclusive merchant discounts.`
      ],
      createdAt: new Date().toISOString()
    };

    return bridgeRecord;
  }
}

module.exports = new CallingService();
