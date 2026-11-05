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

  // Cloud Telephony Provider Configuration & Status
  getTelephonyConfig() {
    const config = storage.getConfig();
    const tel = config.telephony || {};
    const provider = tel.provider || process.env.TELEPHONY_PROVIDER || (process.env.TWILIO_ACCOUNT_SID ? 'twilio' : (process.env.EXOTEL_SID ? 'exotel' : 'simulation'));
    const isTwilioConfigured = !!((tel.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) && (tel.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN) && (tel.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER));
    const isExotelConfigured = !!((tel.exotelSid || process.env.EXOTEL_SID) && (tel.exotelToken || process.env.EXOTEL_TOKEN) && (tel.exotelApiKey || process.env.EXOTEL_API_KEY));

    return {
      provider,
      isConfigured: isTwilioConfigured || isExotelConfigured,
      isTwilioConfigured,
      isExotelConfigured,
      twilioAccountSid: tel.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: tel.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN ? '••••••••' : '',
      twilioPhoneNumber: tel.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || '',
      exotelSid: tel.exotelSid || process.env.EXOTEL_SID || '',
      exotelToken: tel.exotelToken || process.env.EXOTEL_TOKEN ? '••••••••' : '',
      exotelApiKey: tel.exotelApiKey || process.env.EXOTEL_API_KEY || '',
      exotelCallerId: tel.exotelCallerId || process.env.EXOTEL_CALLER_ID || '',
      userPhone: this.getCallerProfile().agentPhone,
      modeDescription: (isTwilioConfigured || isExotelConfigured)
        ? `Real PSTN Calling Active via ${provider.toUpperCase()}`
        : 'Browser Simulation Mode (Requires Twilio or Exotel to ring physical mobile phones)'
    };
  }

  updateTelephonyConfig(updates) {
    const config = storage.getConfig();
    const currentTel = config.telephony || {};
    const newTel = {
      ...currentTel,
      ...updates
    };
    storage.updateConfig({ telephony: newTel });

    // Sync with process.env for runtime calls
    if (newTel.twilioAccountSid) process.env.TWILIO_ACCOUNT_SID = newTel.twilioAccountSid;
    if (newTel.twilioAuthToken) process.env.TWILIO_AUTH_TOKEN = newTel.twilioAuthToken;
    if (newTel.twilioPhoneNumber) process.env.TWILIO_PHONE_NUMBER = newTel.twilioPhoneNumber;
    if (newTel.exotelSid) process.env.EXOTEL_SID = newTel.exotelSid;
    if (newTel.exotelToken) process.env.EXOTEL_TOKEN = newTel.exotelToken;
    if (newTel.exotelApiKey) process.env.EXOTEL_API_KEY = newTel.exotelApiKey;
    if (newTel.exotelCallerId) process.env.EXOTEL_CALLER_ID = newTel.exotelCallerId;
    if (newTel.provider) process.env.TELEPHONY_PROVIDER = newTel.provider;

    return this.getTelephonyConfig();
  }

  // Place a real physical phone call via Twilio / Exotel gateway
  async makeRealOutboundCall({ targetPhone, targetName = 'Prospect', scriptText, callerIdMode = 'user-sim' }) {
    const config = storage.getConfig();
    const tel = config.telephony || {};
    const caller = this.getCallerProfile();

    const cleanDigits = (targetPhone || '').replace(/[^0-9]/g, '');
    const formattedTarget = cleanDigits.startsWith('91') && cleanDigits.length === 12
      ? `+${cleanDigits}`
      : cleanDigits.length === 10
      ? `+91${cleanDigits}`
      : `+${cleanDigits}`;

    const speechScript = scriptText || `Hello ${targetName}! This is the Go Extra Mile partner merchant desk calling on behalf of ${caller.agentName}. We are offering exclusive merchant listing on the Go Extra Mile app with zero listing fees. To receive our partner onboarding link on WhatsApp, press 1.`;

    const twilioSid = tel.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = tel.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = tel.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">${speechScript}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Aditi" language="en-IN">Press 1 on your phone keypad to receive the official Go Extra Mile onboarding link directly on your WhatsApp.</Say>
    <Gather numDigits="1" action="/api/calls/twiml-callback" method="POST">
    </Gather>
</Response>`;

      const params = new URLSearchParams({
        To: formattedTarget,
        From: twilioFrom,
        Url: 'https://twimlets.com/echo?Twiml=' + encodeURIComponent(twiml)
      });

      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const twilioData = await twilioRes.json();
      if (!twilioRes.ok) {
        throw new Error(`Twilio Call Error: ${twilioData.message || twilioRes.statusText} (Code: ${twilioData.code || twilioRes.status})`);
      }

      return {
        success: true,
        realCallPlaced: true,
        provider: 'Twilio',
        callSid: twilioData.sid,
        status: twilioData.status,
        targetPhone: formattedTarget,
        message: `Real PSTN call dispatched to ${formattedTarget} via Twilio! Pick up your phone to hear the AI pitch.`
      };
    }

    const exotelSid = tel.exotelSid || process.env.EXOTEL_SID;
    const exotelToken = tel.exotelToken || process.env.EXOTEL_TOKEN;
    const exotelKey = tel.exotelApiKey || process.env.EXOTEL_API_KEY;

    if (exotelSid && exotelToken && exotelKey) {
      const params = new URLSearchParams({
        From: caller.agentPhone,
        To: formattedTarget,
        CallerId: tel.exotelCallerId || process.env.EXOTEL_CALLER_ID || exotelKey,
        CallType: 'trans'
      });

      const basicAuth = Buffer.from(`${exotelKey}:${exotelToken}`).toString('base64');
      const exotelRes = await fetch(`https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const exotelData = await exotelRes.json();
      if (!exotelRes.ok) {
        throw new Error(`Exotel Call Error: ${exotelData.RestException ? exotelData.RestException.Message : exotelRes.statusText}`);
      }

      return {
        success: true,
        realCallPlaced: true,
        provider: 'Exotel',
        callSid: exotelData.Call ? exotelData.Call.Sid : 'exotel_call',
        status: 'Initiated',
        targetPhone: formattedTarget,
        message: `Real call bridged to ${formattedTarget} via Exotel!`
      };
    }

    // No credentials configured: explain simulation mode & direct dial options
    const localUrls = this.getLocalNetworkUrls();
    const mobileIp = localUrls.length > 0 ? localUrls[0].ip : 'localhost';

    return {
      success: false,
      realCallPlaced: false,
      provider: 'simulation',
      requiresCredentials: true,
      targetPhone: formattedTarget,
      instructions: {
        methodA: 'Add your Twilio Account SID, Auth Token & Phone Number in Telephony Settings to ring your physical SIM directly.',
        methodB: `Open http://${mobileIp}:3000 on your mobile phone browser to make direct calls from your phone's SIM card.`
      },
      message: `No real Cloud Telephony Provider (Twilio or Exotel) is connected yet. Your phone (${formattedTarget}) cannot ring without a telecom gateway. The app is currently demonstrating the AI pitch via computer audio.`
    };
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
  initiateCallSession({ decisionMakerId, customPhone, customName, customCompany, customDesignation, callMode = 'device-dialer', callerIdMode = 'user-sim', forceOverride = false }) {
    const caller = this.getCallerProfile();
    let dm = null;

    if (decisionMakerId) {
      dm = dmService.getById(decisionMakerId);
    }

    if (!dm && !customPhone) {
      throw new Error('A valid decision-maker or phone number is required to place a call.');
    }

    const targetPhone = dm ? dm.phone : customPhone;
    const targetCompany = dm ? dm.companyName : (customCompany || 'Company');
    const targetName = dm ? dm.fullName : (customName || 'Prospect');
    const targetDesignation = dm ? dm.designation : (customDesignation || 'Leader');

    const cleanUserSim = (caller.agentPhone || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanTarget = targetPhone.replace(/[^0-9]/g, '').slice(-10);
    const isTestCall = cleanTarget === cleanUserSim || (dm && dm.isTestLead);

    // Enforcement: Maximum 2 calls per company/decision-maker (exempt for user testing line)
    const currentCallCount = storage.getCallCountForContact({
      decisionMakerId,
      companyId: dm ? dm.companyId : null,
      phone: targetPhone
    });

    if (currentCallCount >= 2 && !forceOverride && !isTestCall) {
      throw new Error(`Contact Frequency Limit Reached: ${targetCompany} has already been called ${currentCallCount} times. A prospect cannot be called more than 2 times.`);
    }

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

    // If real telephony (Twilio/Exotel) is configured, dispatch the live two-leg bridge
    const telConfig = this.getTelephonyConfig();
    if (telConfig.isConfigured) {
      this.dispatchRealBridgeCall({
        userPhone: caller.agentPhone,
        customerPhone: targetPhone,
        customerName: dm ? dm.fullName : 'Merchant'
      }).catch(err => console.warn('Bridge dispatch background error:', err.message));
    }

    return bridgeRecord;
  }

  // Real Two-Leg Cloud Bridge Dispatcher
  async dispatchRealBridgeCall({ userPhone, customerPhone, customerName = 'Merchant' }) {
    const config = storage.getConfig();
    const tel = config.telephony || {};

    const cleanUser = userPhone.replace(/[^0-9]/g, '');
    const formattedUser = cleanUser.startsWith('91') && cleanUser.length === 12
      ? `+${cleanUser}`
      : cleanUser.length === 10
      ? `+91${cleanUser}`
      : `+${cleanUser}`;

    const cleanTarget = customerPhone.replace(/[^0-9]/g, '');
    const formattedTarget = cleanTarget.startsWith('91') && cleanTarget.length === 12
      ? `+${cleanTarget}`
      : cleanTarget.length === 10
      ? `+91${cleanTarget}`
      : `+${cleanTarget}`;

    const twilioSid = tel.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = tel.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = tel.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      const bridgeTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Connecting your call to ${customerName} on Go Extra Mile merchant desk.</Say>
    <Dial callerId="${twilioFrom}">${formattedTarget}</Dial>
</Response>`;

      const params = new URLSearchParams({
        To: formattedUser,
        From: twilioFrom,
        Url: 'https://twimlets.com/echo?Twiml=' + encodeURIComponent(bridgeTwiml)
      });

      const basicAuth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      return await twilioRes.json();
    }

    const exotelSid = tel.exotelSid || process.env.EXOTEL_SID;
    const exotelToken = tel.exotelToken || process.env.EXOTEL_TOKEN;
    const exotelKey = tel.exotelApiKey || process.env.EXOTEL_API_KEY;

    if (exotelSid && exotelToken && exotelKey) {
      const params = new URLSearchParams({
        From: formattedUser,
        To: formattedTarget,
        CallerId: tel.exotelCallerId || tel.exotelApiKey || exotelKey,
        CallType: 'trans'
      });

      const basicAuth = Buffer.from(`${exotelKey}:${exotelToken}`).toString('base64');
      const exotelRes = await fetch(`https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      return await exotelRes.json();
    }
  }

  // ==========================================
  // FULLY AUTOMATED AI CALLING BOT ENGINE
  // ==========================================

  // Initiate an autonomous voice call session (supports User SIM 8518900153 or Unknown / Masked Caller ID)
  initiateAutomatedAiCall({ decisionMakerId, customPhone, customName, customCompany, customDesignation, callerIdMode = 'user-sim', forceOverride = false }) {
    const caller = this.getCallerProfile();
    const refConfig = referralService.getReferralConfig();
    let dm = null;

    if (decisionMakerId) {
      dm = dmService.getById(decisionMakerId);
    }

    if (!dm && !customPhone) {
      throw new Error('A valid decision-maker or phone number is required for automated calling.');
    }

    const targetPhone = dm ? dm.phone : customPhone;
    const targetCompany = dm ? dm.companyName : (customCompany || 'Your Company');
    const targetName = dm ? dm.fullName : (customName || 'Business Leader');
    const targetDesignation = dm ? dm.designation : (customDesignation || 'Executive');

    const cleanUserSim = (caller.agentPhone || '').replace(/[^0-9]/g, '').slice(-10);
    const cleanTarget = targetPhone.replace(/[^0-9]/g, '').slice(-10);
    const isTestCall = cleanTarget === cleanUserSim || (dm && dm.isTestLead);

    // Enforcement: Maximum 2 calls per company/decision-maker (exempt for user testing line)
    const currentCallCount = storage.getCallCountForContact({
      decisionMakerId,
      companyId: dm ? dm.companyId : null,
      phone: targetPhone
    });

    if (currentCallCount >= 2 && !forceOverride && !isTestCall) {
      throw new Error(`Contact Frequency Limit Reached: ${targetCompany} (${targetName}) has already been called ${currentCallCount} times. A prospect cannot be called more than 2 times.`);
    }

    const isUnknown = callerIdMode === 'unknown';

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
      telephonyStatus: this.getTelephonyConfig(),
      startedAt: new Date().toISOString()
    };
  }

  // Get Queue of prioritized decision-makers for automated dialing (Excludes contacts called >= 2 times)
  getAutoDialQueue(tier = null, maxCalls = 2) {
    let dms = dmService.getAll();
    const calls = storage.getCalls();

    const callCountMap = new Map();
    for (const c of calls) {
      if (c.decisionMakerId) {
        callCountMap.set(c.decisionMakerId, (callCountMap.get(c.decisionMakerId) || 0) + 1);
      }
      if (c.companyId) {
        callCountMap.set(c.companyId, (callCountMap.get(c.companyId) || 0) + 1);
      }
    }

    if (tier) {
      dms = dms.filter(d => d.priorityTier === parseInt(tier, 10));
    }

    // Contact Frequency Rule: Exclude contacts who have already reached maxCalls (default: 2 times max)
    const eligible = dms.filter(d => {
      const dmCalls = callCountMap.get(d.id) || 0;
      const compCalls = callCountMap.get(d.companyId) || 0;
      const totalCalls = Math.max(dmCalls, compCalls);
      return totalCalls < maxCalls;
    });

    // Prioritize Tier 1 (Owner, MD, CEO, Founder) first, verified first
    return eligible.map(d => {
      const dmCalls = callCountMap.get(d.id) || 0;
      const compCalls = callCountMap.get(d.companyId) || 0;
      const totalCalls = Math.max(dmCalls, compCalls);
      return {
        id: d.id,
        companyId: d.companyId,
        fullName: d.fullName,
        designation: d.designation,
        companyName: d.companyName,
        phone: d.phone,
        priorityTier: d.priorityTier,
        priorityRank: d.priorityRank,
        verificationStatus: d.verificationStatus,
        callCount: totalCalls,
        remainingAttempts: Math.max(0, maxCalls - totalCalls)
      };
    });
  }
}

module.exports = new CallingService();
