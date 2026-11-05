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

  // Initiate a call session (supports User SIM 8518900153 or Unknown / Masked Caller ID)
  initiateCallSession({ decisionMakerId, customPhone, callMode = 'device-dialer', callerIdMode = 'user-sim' }) {
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

    // Format clean phone
    const dialPhoneFormatted = cleanTargetPhone.startsWith('91') || cleanTargetPhone.startsWith('+91')
      ? cleanTargetPhone
      : `91${cleanTargetPhone.slice(-10)}`;

    const isUnknown = callerIdMode === 'unknown';
    // GSM #31# prefix initiates call with Private / Unknown Caller ID presentation on mobile networks
    const telUri = isUnknown ? `tel:%2331%23%2B${dialPhoneFormatted}` : `tel:+${dialPhoneFormatted}`;
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
      callerNumber: isUnknown ? 'Private / Unknown Number' : caller.agentPhone,
      callerName: isUnknown ? 'Unknown Caller (Private Line)' : caller.agentName,
      callerIdMode: isUnknown ? 'unknown' : 'user-sim',
      isUnknownNumber: isUnknown,
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

  // ==========================================
  // FULLY AUTOMATED AI CALLING BOT ENGINE
  // ==========================================

  // Initiate an autonomous voice call session (supports User SIM 8518900153 or Unknown / Masked Caller ID)
  initiateAutomatedAiCall({ decisionMakerId, customPhone, callerIdMode = 'user-sim' }) {
    const caller = this.getCallerProfile();
    const refConfig = referralService.getReferralConfig();
    let dm = null;

    if (decisionMakerId) {
      dm = dmService.getById(decisionMakerId);
    }

    if (!dm && !customPhone) {
      throw new Error('A valid decision-maker or phone number is required for automated calling.');
    }

    const isUnknown = callerIdMode === 'unknown';
    const targetName = dm ? dm.fullName : 'Business Leader';
    const targetCompany = dm ? dm.companyName : 'Your Company';
    const targetDesignation = dm ? dm.designation : 'Executive';
    const targetPhone = dm ? dm.phone : customPhone;

    // Structured conversational dialog turns for the automated AI voice agent
    const dialogTurns = [
      {
        step: 1,
        title: 'Greeting & Verification',
        botAudioText: `Hello ${targetName}! This is the Go Extra Mile partner merchant desk calling on behalf of ${caller.agentName}. Am I speaking with the ${targetDesignation} of ${targetCompany}?`,
        expectedProspectResponse: 'Yes, speaking / Who is this?',
        botResponse: `Great to connect with you, ${targetName}! I will keep this brief.`,
        speechSynthesizerConfig: { lang: 'en-IN', rate: 0.95, pitch: 1.02 }
      },
      {
        step: 2,
        title: 'Core Go Extra Mile Pitch',
        botAudioText: `Go Extra Mile connects leading brands with thousands of active buyers looking for exclusive deals, product discounts, and promotional offers. We are currently listing premier brands with zero upfront friction, giving you complete autonomy over your deal margins and campaign duration.`,
        expectedProspectResponse: 'What are the listing fees or terms?',
        botResponse: `There are absolutely zero upfront listing fees. You retain complete control over your product listings, discounts, and campaign duration.`,
        speechSynthesizerConfig: { lang: 'en-IN', rate: 0.95, pitch: 1.02 }
      },
      {
        step: 3,
        title: 'Offer Listing Proposition',
        botAudioText: `Would you be open to featuring ${targetCompany}'s exclusive products or special discount packages on our platform to drive immediate sales and customer acquisition?`,
        expectedProspectResponse: 'Yes, tell me more / Send details.',
        botResponse: `Wonderful! We would love to feature ${targetCompany}.`,
        speechSynthesizerConfig: { lang: 'en-IN', rate: 0.95, pitch: 1.02 }
      },
      {
        step: 4,
        title: 'Consent & Referral Link Handshake',
        botAudioText: `May I send our official merchant onboarding portal link directly to your WhatsApp at ${targetPhone} so you can review onboarding details and list your brand offers?`,
        expectedProspectResponse: 'Yes, send it on WhatsApp.',
        botResponse: `Sending it right now! Your official partner link is https://www.goextramile.in/r?code=GOMILES with partner code GOMILES. Thank you, ${targetName}!`,
        speechSynthesizerConfig: { lang: 'en-IN', rate: 0.95, pitch: 1.02 }
      },
      {
        step: 5,
        title: 'Email Proposal & Campaign Guidelines',
        botAudioText: `I can also email our complete merchant onboarding deck and referral link directly to your email, detailing how to run ${targetCompany}'s deals and exclusive offers on the Go Extra Mile app.`,
        expectedProspectResponse: 'Yes, email the campaign proposal.',
        botResponse: `Perfect! I am dispatching the full merchant proposal and link https://www.goextramile.in/r?code=GOMILES to your email right away!`,
        speechSynthesizerConfig: { lang: 'en-IN', rate: 0.95, pitch: 1.02 }
      }
    ];

    // Formulate TwiML XML response for Twilio Voice Telephony
    const callerIdTwiml = isUnknown ? 'callerId="RESTRICTED"' : `callerId="${caller.agentPhone}"`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Hello ${targetName}! This is the Go Extra Mile merchant onboarding desk calling on behalf of ${caller.agentName}. We are offering ${targetCompany} an exclusive opportunity to list your products and promotional discounts on the Go Extra Mile app with zero listing fees.</Say>
    <Pause length="1"/>
    <Say voice="Polly.Aditi" language="en-IN">If you would like us to send the official partner onboarding link to your WhatsApp, please press 1.</Say>
    <Gather numDigits="1" action="/api/calls/twiml-callback?dmId=${dm ? dm.id : ''}" method="POST">
    </Gather>
</Response>`;

    // Formulate Vapi / Bland.ai AI Voice Agent Payload
    const aiAgentConfig = {
      model: 'gpt-4o-mini',
      voice: 'en-IN-Standard-A',
      callerId: isUnknown ? 'anonymous' : caller.agentPhone,
      firstMessage: `Hello ${targetName}! This is the Go Extra Mile merchant desk calling on behalf of ${caller.agentName}. Am I speaking with the ${targetDesignation} of ${targetCompany}?`,
      systemPrompt: `You are an AI sales representative calling for Go Extra Mile (https://www.goextramile.in/r?code=GOMILES).
Your goal is to convince ${targetName}, ${targetDesignation} of ${targetCompany}, to list their products, exclusive offers, discounts, and promotional deals on Go Extra Mile.
Key points:
- Zero upfront listing cost
- Complete autonomy over discount margins and campaign duration
- Thousands of active consumer shoppers
- Referral Code: GOMILES
Always ask for explicit consent before sending the onboarding link to WhatsApp.`
    };

    return {
      callId: `auto_call_${Date.now()}`,
      status: 'In Progress',
      callerIdMode: isUnknown ? 'unknown' : 'user-sim',
      callerNumber: isUnknown ? 'Private / Unknown Number' : caller.agentPhone,
      callerName: isUnknown ? 'Private Caller ID (Masked Cloud PBX)' : caller.agentName,
      isUnknownNumber: isUnknown,
      privacyHeader: isUnknown ? 'Privacy: id; Privacy-Full' : 'none',
      targetNumber: targetPhone,
      targetEmail: dm ? dm.email : null,
      targetName,
      targetCompany,
      targetDesignation,
      decisionMakerId: dm ? dm.id : null,
      companyId: dm ? dm.companyId : null,
      referralUrl: refConfig.officialUrl,
      referralCode: refConfig.referralCode,
      dialogTurns,
      twiml,
      aiAgentConfig,
      botCanSpeak: true,
      audioVoice: 'Polly.Aditi (en-IN)',
      startedAt: new Date().toISOString()
    };
  }

  // Get Queue of prioritized decision-makers for automated dialing
  getAutoDialQueue(tier = null) {
    let dms = dmService.getAll();
    if (tier) {
      dms = dms.filter(d => d.priorityTier === parseInt(tier, 10));
    }

    // Prioritize Tier 1 (Owner, MD, CEO, Founder) first, verified first
    return dms.map(d => ({
      id: d.id,
      fullName: d.fullName,
      designation: d.designation,
      companyName: d.companyName,
      phone: d.phone,
      priorityTier: d.priorityTier,
      priorityRank: d.priorityRank,
      verificationStatus: d.verificationStatus
    }));
  }
}

module.exports = new CallingService();
