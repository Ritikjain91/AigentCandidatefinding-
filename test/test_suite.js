const assert = require('assert');
const storage = require('../src/services/storageService');
const dmService = require('../src/services/decisionMakerService');
const referralService = require('../src/services/referralService');
const researchService = require('../src/services/researchService');
const callingService = require('../src/services/callingService');
const websiteFetcher = require('../src/services/websiteFetcherService');
const aiSearchService = require('../src/services/aiCompanySearchService');

async function runTests() {
  console.log('🧪 Starting AutomaticCallingBot Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Referral Link and Immutable Code GOMILES
  test('Requirement: Official Referral Link is configured with GOMILES', () => {
    const config = referralService.getReferralConfig();
    assert.strictEqual(config.officialUrl, 'https://www.goextramile.in/r?code=GOMILES');
    assert.strictEqual(config.referralCode, 'GOMILES');
  });

  test('Requirement: Modifying referral code away from GOMILES throws error', () => {
    assert.throws(() => {
      storage.updateConfig({
        referral: {
          referralCode: 'OTHERCODE'
        }
      });
    }, /Referral code GOMILES is protected/);
  });

  test('Requirement: Removing referral code query parameter from official URL throws error', () => {
    assert.throws(() => {
      storage.updateConfig({
        referral: {
          officialUrl: 'https://www.goextramile.in/r'
        }
      });
    }, /Official referral URL must retain the mandatory code parameter/);
  });

  // TEST 2: Decision Maker Classification & Priority Ordering
  test('Requirement: Classifies Tier 1 (Owner, MD, CEO, Founder)', () => {
    const owner = dmService.classifyDesignation('Company Owner & Proprietor');
    assert.strictEqual(owner.tier, 1);
    assert.strictEqual(owner.rank, 1);

    const md = dmService.classifyDesignation('Managing Director');
    assert.strictEqual(md.tier, 1);
    assert.strictEqual(md.rank, 2);

    const ceo = dmService.classifyDesignation('Chief Executive Officer (CEO)');
    assert.strictEqual(ceo.tier, 1);
    assert.strictEqual(ceo.rank, 3);

    const founder = dmService.classifyDesignation('Co-Founder & Director');
    assert.strictEqual(founder.tier, 1);
    assert.strictEqual(founder.rank, 4);
  });

  test('Requirement: Classifies Tier 2 (Head of Marketing, Marketing Manager)', () => {
    const mktHead = dmService.classifyDesignation('Head of Marketing');
    assert.strictEqual(mktHead.tier, 2);
    assert.strictEqual(mktHead.rank, 5);

    const mktMgr = dmService.classifyDesignation('Marketing Manager');
    assert.strictEqual(mktMgr.tier, 2);
    assert.strictEqual(mktMgr.rank, 6);
  });

  test('Requirement: Classifies Tier 3 (Head of Sales, Sales Manager)', () => {
    const salesHead = dmService.classifyDesignation('Head of Sales');
    assert.strictEqual(salesHead.tier, 3);
    assert.strictEqual(salesHead.rank, 7);

    const salesMgr = dmService.classifyDesignation('Sales Manager');
    assert.strictEqual(salesMgr.tier, 3);
    assert.strictEqual(salesMgr.rank, 8);
  });

  // TEST 3: Customer Care Guardrail
  test('Requirement: Never substitute customer-care/support numbers for decision-makers', () => {
    // Toll-free 1800 number
    const ccPhone = dmService.isCustomerCareContact('1800 200 4455', 'director@brand.com');
    assert.strictEqual(ccPhone.isCustomerCare, true);

    // Support email
    const ccEmail = dmService.isCustomerCareContact('+91 98201 12345', 'support@brand.com');
    assert.strictEqual(ccEmail.isCustomerCare, true);

    // Direct personal contact
    const directContact = dmService.isCustomerCareContact('+91 98201 44521', 'rajesh@brand.com');
    assert.strictEqual(directContact.isCustomerCare, false);
  });

  test('Requirement: Validation prevents saving decision-maker with customer care contact', () => {
    const invalidContact = {
      fullName: 'Test Person',
      designation: 'CEO',
      companyName: 'Test Corp',
      phone: '1800-111-222',
      email: 'support@testcorp.com',
      sourceUrl: 'https://testcorp.com'
    };

    const val = dmService.validateDecisionMaker(invalidContact);
    assert.strictEqual(val.isValid, false);
    assert.ok(val.errors.some(e => e.includes('Customer-Care Guardrail Triggered')));
  });

  // TEST 4: Priority Sorting of Multiple Decision Makers
  test('Requirement: Multiple decision-makers sorted strictly by priority order', () => {
    const all = dmService.getAll();
    assert.ok(all.length >= 3);

    // Verify ordering
    for (let i = 0; i < all.length - 1; i++) {
      if (all[i].priorityTier < all[i + 1].priorityTier) {
        assert.ok(true);
      } else if (all[i].priorityTier === all[i + 1].priorityTier) {
        assert.ok(all[i].priorityRank <= all[i + 1].priorityRank);
      } else {
        assert.fail(`Sorting violation: Tier ${all[i].priorityTier} placed after Tier ${all[i + 1].priorityTier}`);
      }
    }
  });

  // TEST 5: Verification Status Differentiation
  test('Requirement: Clearly distinguish verified from unverified information', () => {
    const all = dmService.getAll();
    const verified = all.filter(dm => dm.verificationStatus === 'Verified');
    const unverified = all.filter(dm => dm.verificationStatus === 'Unverified');

    assert.ok(verified.length > 0, 'Should have verified contacts');
    assert.ok(unverified.length > 0, 'Should have unverified contacts');
    assert.strictEqual(verified[0].verificationStatus, 'Verified');
    assert.strictEqual(unverified[0].verificationStatus, 'Unverified');
  });

  // TEST 6: Message Composition & Sales Objective Integration
  test('Requirement: Follow-up message includes Go Extra Mile referral link and listing proposition', () => {
    const message = referralService.composeMessage({
      templateId: 'tpl_post_call_interested',
      prospectName: 'Vikram',
      companyName: 'Nexus Retail',
      designation: 'CEO'
    });

    assert.ok(message.body.includes('https://www.goextramile.in/r?code=GOMILES'));
    assert.ok(message.body.includes('GOMILES'));
    assert.ok(message.body.toLowerCase().includes('exclusive offers') || message.body.toLowerCase().includes('discounts') || message.body.toLowerCase().includes('promotional'));
  });

  // TEST 7: Mandatory Consent Verification for Promotional Link Sharing
  test('Requirement: Never send promotional messages automatically without appropriate consent', () => {
    // Attempt share without consent
    assert.throws(() => {
      referralService.executeManualShare({
        recipientName: 'Karan',
        recipientPhone: '+919811055490',
        channel: 'WhatsApp',
        consentConfirmed: false // No consent!
      });
    }, /Compliance Violation: Explicit consent and authorization/);

    // Share with verified consent
    const shareResult = referralService.executeManualShare({
      recipientName: 'Karan',
      recipientPhone: '+919811055490',
      channel: 'WhatsApp',
      consentConfirmed: true, // Consent verified!
      consentNote: 'Decision maker agreed during call'
    });

    assert.strictEqual(shareResult.success, true);
    assert.ok(shareResult.shareLinks.whatsappUrl.includes('https://api.whatsapp.com/send'));
    assert.ok(shareResult.shareLinks.whatsappUrl.includes(encodeURIComponent('https://www.goextramile.in/r?code=GOMILES')));
  });

  // TEST 8: Research Query Generation
  test('Requirement: Research module generates targeted search queries across sources', () => {
    const queries = researchService.generateSearchQueries('Zenith Lifestyle', 'zenithlifestyle.in');
    assert.ok(queries.tier1Queries.length > 0);
    assert.ok(queries.tier1Queries.some(q => q.includes('site:linkedin.com/in/')));
    assert.ok(queries.tier1Queries.some(q => q.includes('Owner') || q.includes('CEO') || q.includes('Managing Director')));
  });

  // TEST 9: Caller Line Configuration (8518900153)
  test('Requirement: User number 8518900153 is configured as the active caller line', () => {
    const caller = callingService.getCallerProfile();
    assert.strictEqual(caller.rawPhone, '8518900153');
    assert.strictEqual(caller.agentPhone, '+91 8518900153');
  });

  // TEST 10: Calling Session & Live Pitch Generation
  test('Requirement: Calling bot initiates session from 8518900153 to prospect with Go Extra Mile pitch', () => {
    const dms = dmService.getAll();
    const targetDm = dms[0];
    const session = callingService.initiateCallSession({ decisionMakerId: targetDm.id });

    assert.strictEqual(session.callerNumber, '+91 8518900153');
    assert.strictEqual(session.targetName, targetDm.fullName);
    assert.ok(session.dialTelUri.startsWith('tel:+'));
    assert.ok(session.dialQrCodeUrl.includes('https://api.qrserver.com'));
    assert.ok(session.whatsappDialUri.includes('https://api.whatsapp.com/send'));
    assert.ok(session.script.openingGreeting.includes('8518900153') || session.script.openingGreeting.includes('Ritik') || session.script.openingGreeting.includes(targetDm.fullName));
    assert.ok(session.script.coreProposition.includes('Go Extra Mile'));
    assert.ok(session.script.coreProposition.includes('exclusive brand deals') || session.script.coreProposition.includes('discounts'));
  });

  // TEST 11: Two-Leg Cloud Telephony Bridge
  test('Requirement: Telephony Bridge connects user phone 8518900153 to prospect', () => {
    const bridge = callingService.triggerTelephonyBridge({ customPhone: '+91 98201 44521' });
    assert.strictEqual(bridge.leg1.number, '+91 8518900153');
    assert.strictEqual(bridge.leg2.number, '+91 98201 44521');
    assert.ok(bridge.instructions.some(i => i.includes('8518900153')));
  });

  // TEST 12: Autonomous AI Voice Calling Bot Engine
  test('Requirement: Automated AI Calling Bot generates dialog turns and Go Extra Mile merchant pitch', () => {
    const dms = dmService.getAll();
    const autoCall = callingService.initiateAutomatedAiCall({ decisionMakerId: dms[0].id });

    assert.strictEqual(autoCall.callerNumber, '+91 8518900153');
    assert.strictEqual(autoCall.targetName, dms[0].fullName);
    assert.ok(autoCall.dialogTurns.length >= 3);
    assert.ok(autoCall.dialogTurns.some(t => t.botAudioText.includes('Go Extra Mile')));
    assert.strictEqual(autoCall.referralCode, 'GOMILES');
    assert.strictEqual(autoCall.referralUrl, 'https://www.goextramile.in/r?code=GOMILES');
    assert.ok(autoCall.twiml.includes('<Response>'));
    assert.ok(autoCall.twiml.includes('Go Extra Mile'));
  });

  // TEST 13: Prioritized Auto-Dial Queue
  test('Requirement: Auto-dial queue strictly prioritizes Tier 1 (Owner, MD, CEO, Founder)', () => {
    const queue = callingService.getAutoDialQueue(1);
    assert.ok(queue.length > 0);
    assert.ok(queue.every(item => item.priorityTier === 1));
  });

  // TEST 14: Email Merchant Proposal to Run Deals on Go Extra Mile
  test('Requirement: Email merchant proposal generates listing pitch and sends referral link GOMILES', () => {
    const emailResult = referralService.sendEmailProposal({
      recipientName: 'Rajesh Singhania',
      recipientEmail: 'rajesh@auroraretail.in',
      companyName: 'Aurora Retail'
    });

    assert.strictEqual(emailResult.success, true);
    assert.strictEqual(emailResult.referralCode, 'GOMILES');
    assert.strictEqual(emailResult.referralUrl, 'https://www.goextramile.in/r?code=GOMILES');
    assert.ok(emailResult.subject.includes('Go Extra Mile'));
    assert.ok(emailResult.body.includes('https://www.goextramile.in/r?code=GOMILES'));
    assert.ok(emailResult.body.includes('GOMILES'));
    assert.ok(emailResult.body.toLowerCase().includes('run') || emailResult.body.toLowerCase().includes('exclusive offers'));
    assert.ok(emailResult.mailtoUrl.startsWith('mailto:rajesh%40auroraretail.in?subject='));
  });

  // TEST 15: Autonomous Fresh Lead Generation
  test('Requirement: Autonomous engine generates and saves valid Tier 1 decision-maker lead', () => {
    const fresh = researchService.generateAndSaveFreshLead();
    assert.ok(fresh.company);
    assert.ok(fresh.decisionMaker);
    assert.strictEqual(fresh.decisionMaker.priorityTier, 1);
    assert.strictEqual(fresh.decisionMaker.verificationStatus, 'Verified');
    assert.ok(fresh.decisionMaker.phone.startsWith('+91'));
    // Ensure customer care guardrail is respected
    assert.strictEqual(fresh.decisionMaker.phone.includes('1800'), false);
    assert.strictEqual(fresh.decisionMaker.phone.includes('1860'), false);
  });

  // TEST 16: Replenish Batch of Leads
  test('Requirement: Replenish batch creates requested count of fresh merchant leads', () => {
    const initialCount = storage.getDecisionMakers().length;
    const batch = researchService.replenishBatch(2);
    assert.strictEqual(batch.length, 2);
    const newCount = storage.getDecisionMakers().length;
    assert.strictEqual(newCount, initialCount + 2);
  });

  // TEST 17: Auto-Replenish on Lead Deletion
  test('Requirement: Deleting a decision-maker automatically generates a replacement lead', () => {
    // Enable autoReplenish
    storage.updateConfig({ autoReplenish: { enabled: true, autoDiscoverOnDelete: true } });
    
    // Create a temporary lead to delete
    const tempLead = dmService.create({
      companyName: 'Temporary Retail Co',
      fullName: 'Aakash Verma',
      designation: 'Owner',
      phone: '+91 99999 12345',
      verificationStatus: 'Verified',
      sourceUrl: 'https://tempretail.in'
    });

    const beforeDeleteCount = storage.getDecisionMakers().length;
    const deleteResult = dmService.delete(tempLead.id);

    assert.strictEqual(deleteResult.deleted, true);
    assert.strictEqual(deleteResult.autoReplenished, true);
    assert.ok(deleteResult.newLead);
    assert.strictEqual(deleteResult.newLead.priorityTier, 1);
    // Overall count should remain equal because 1 was deleted and 1 was auto-generated
    const afterDeleteCount = storage.getDecisionMakers().length;
    assert.strictEqual(afterDeleteCount, beforeDeleteCount);
  });

  // TEST 18: Automatic Website URL Normalization & Metadata Extraction
  test('Requirement: Automatically normalizes website address and derives company details', () => {
    const norm = websiteFetcher.normalizeUrl('chaipoint.com');
    assert.strictEqual(norm.fullUrl, 'https://chaipoint.com/');
    assert.strictEqual(norm.hostname, 'chaipoint.com');

    const sampleHtml = `
      <html>
        <head>
          <title>Chai Point - India's Largest Chai Brand | Order Online</title>
          <meta property="og:site_name" content="Chai Point" />
          <meta name="description" content="Artisanal chai, healthy breakfast snacks, and coffee delivery in Bengaluru, Delhi, Mumbai." />
        </head>
        <body>
          <h1>Welcome to Chai Point</h1>
        </body>
      </html>
    `;
    const meta = websiteFetcher.parseMetadata(sampleHtml, norm.hostname);
    assert.strictEqual(meta.siteName, 'Chai Point');
    assert.ok(meta.description.includes('Bengaluru'));

    const compDetails = websiteFetcher.deriveCompanyDetails(meta, norm);
    assert.strictEqual(compDetails.companyName, 'Chai Point');
    assert.strictEqual(compDetails.industry, 'Dining & Bakeries');
    assert.ok(['Bengaluru', 'Delhi NCR', 'Mumbai'].includes(compDetails.city));
  });

  // TEST 19: Customer-Care Guardrail on Extracted Website Contacts
  test('Requirement: Website extractor rejects toll-free customer care (1800/1860) and support emails', () => {
    const htmlWithSupport = `
      <div class="footer">
        <p>Customer Care Helpline: 1800-200-1234, 1860-500-9999</p>
        <p>Email: care@company.com, support@company.com</p>
        <div class="leadership">
          <h3>Rohan Singhania, Founder & CEO</h3>
          <p>Direct Business Line: +91 98200 44321</p>
          <p>Executive Office: rohan@company.com</p>
        </div>
      </div>
    `;
    const dms = websiteFetcher.extractDecisionMakersFromHtml(htmlWithSupport, { domain: 'company.com' }, 'https://company.com');
    assert.ok(dms.length > 0);
    const founder = dms[0];
    assert.strictEqual(founder.fullName, 'Rohan Singhania');
    assert.strictEqual(founder.priorityTier, 1);
    // Verified direct business line
    assert.strictEqual(founder.phone, '+91 98200 44321');
    assert.strictEqual(founder.email, 'rohan@company.com');
    // Ensure customer care numbers were filtered out
    assert.strictEqual(founder.phone.includes('1800'), false);
    assert.strictEqual(founder.phone.includes('1860'), false);
    assert.strictEqual(founder.email.includes('support@'), false);
    assert.strictEqual(founder.email.includes('care@'), false);
  });

  // TEST 20: End-to-End Automatic Website Fetch and Lead Generation Pipeline
  await test('Requirement: Automatically fetches website and creates company & verified decision-maker in database', async () => {
    const result = await websiteFetcher.fetchWebsiteAndGenerateLead('https://bluetokaicoffee.com', { autoSave: true });
    assert.strictEqual(result.success, true);
    assert.ok(result.company);
    assert.ok(result.company.name);
    assert.ok(result.decisionMakers.length > 0);
    assert.strictEqual(result.decisionMakers[0].priorityTier, 1);
    assert.strictEqual(result.decisionMakers[0].verificationStatus, 'Verified');
    assert.ok(result.logs.length >= 4);

    // Verify stored in DB
    const savedComp = storage.getCompanies().find(c => c.domain.includes('bluetokaicoffee.com'));
    assert.ok(savedComp);
    const savedDms = storage.getDecisionMakers().filter(d => d.companyId === savedComp.id);
    assert.ok(savedDms.length > 0);
  });

  // TEST 21: Autonomous Web Directory Lead Generator
  await test('Requirement: Autonomous web directory generator creates merchant leads for Go Extra Mile acquisition', async () => {
    const leads = await websiteFetcher.autoDiscoverFromWebDirectory(1, 'all');
    assert.strictEqual(leads.length, 1);
    assert.strictEqual(leads[0].success, true);
    assert.ok(leads[0].company.name);
    assert.ok(leads[0].decisionMakers.length > 0);
  });

  // TEST 22: AI Company Search - Specific Merchant Brand (Lenskart)
  await test('Requirement: AI searches company "Lenskart", identifies Co-Founder Peyush Bansal as Tier 1, and tailors Go Extra Mile pitch', async () => {
    const res = await aiSearchService.searchCompany('Lenskart', { autoSave: true });
    assert.strictEqual(res.success, true);
    assert.ok(res.company);
    assert.ok(res.company.name.toLowerCase().includes('lenskart'));
    assert.strictEqual(res.company.domain, 'lenskart.com');
    assert.ok(res.decisionMakers.length > 0);

    const founder = res.decisionMakers.find(d => d.fullName.includes('Peyush Bansal'));
    assert.ok(founder, 'Should find Peyush Bansal');
    assert.strictEqual(founder.priorityTier, 1);
    assert.ok(founder.phone.startsWith('+91'));
    assert.strictEqual(founder.phone.includes('1800'), false);
    assert.strictEqual(founder.verificationStatus, 'Verified');
    assert.ok(res.pitchOpportunity.toLowerCase().includes('go extra mile') || res.pitchOpportunity.toLowerCase().includes('discount'));
  });

  // TEST 23: AI Company Search - Customer-Care Guardrail Verification (boAt Lifestyle)
  await test('Requirement: AI searches company "boAt Lifestyle", verifies executive coordinates, and strictly rejects customer care', async () => {
    const res = await aiSearchService.searchCompany('boAt Lifestyle', { autoSave: true });
    assert.strictEqual(res.success, true);
    assert.ok(res.decisionMakers.length > 0);
    for (const dm of res.decisionMakers) {
      assert.strictEqual(dm.phone.includes('1800'), false);
      assert.strictEqual(dm.phone.includes('1860'), false);
      assert.strictEqual(dm.email.includes('support@'), false);
      assert.strictEqual(dm.email.includes('care@'), false);
      assert.strictEqual(dm.isCustomerSupport, false);
    }
  });

  // TEST 24: AI Company Search - Dynamic Natural Language Query
  await test('Requirement: AI searches dynamic prompt "Search company Saffron Splendor Retail in Jaipur", creates Tier 1 lead in database', async () => {
    const res = await aiSearchService.searchCompany('Search company Saffron Splendor Retail in Jaipur', { autoSave: true });
    assert.strictEqual(res.success, true);
    assert.ok(res.company.name.includes('Saffron Splendor'));
    assert.strictEqual(res.company.city, 'Jaipur');
    assert.ok(res.decisionMakers.length > 0);
    assert.strictEqual(res.decisionMakers[0].priorityTier, 1);

    const saved = storage.getDecisionMakers().find(d => d.fullName === res.decisionMakers[0].fullName);
    assert.ok(saved, 'Lead should exist in database');
  });

  // TEST 25: AI Voice Bot with Unknown Number and Speech Synthesis
  await test('Requirement: AI Voice Bot can call from Unknown Number with caller ID masking and spoken voice script', () => {
    const dms = dmService.getAll();
    const autoCall = callingService.initiateAutomatedAiCall({
      decisionMakerId: dms[0].id,
      callerIdMode: 'unknown'
    });

    assert.strictEqual(autoCall.isUnknownNumber, true);
    assert.strictEqual(autoCall.callerNumber, 'Private / Unknown Number');
    assert.ok(autoCall.callerName.toLowerCase().includes('private') || autoCall.callerName.toLowerCase().includes('unknown'));
    assert.strictEqual(autoCall.botCanSpeak, true);
    assert.ok(autoCall.dialogTurns.length >= 4);
    assert.ok(autoCall.dialogTurns.every(t => t.speechSynthesizerConfig && t.speechSynthesizerConfig.lang === 'en-IN'));
  });

  // TEST 26: WhatsApp Message with Notes Automatically Bundles Link & Code
  await test('Requirement: WhatsApp message automatically bundles custom discussion notes with Go Extra Mile link', () => {
    const customNotes = 'Discussed listing 20% festive voucher passes and weekend dining deals with 0% listing fee.';
    const res = referralService.sendWhatsAppWithNotes({
      recipientName: 'Karan Malhotra',
      recipientPhone: '+91 98110 55490',
      companyName: 'UrbanFeast Hospitality',
      designation: 'Owner & Co-Founder',
      notes: customNotes,
      consentConfirmed: true
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.referralCode, 'GOMILES');
    assert.strictEqual(res.referralUrl, 'https://www.goextramile.in/r?code=GOMILES');
    assert.ok(res.messageText.includes('UrbanFeast Hospitality'));
    assert.ok(res.messageText.includes(customNotes));
    assert.ok(res.messageText.includes('https://www.goextramile.in/r?code=GOMILES'));
    assert.ok(res.messageText.includes('GOMILES'));
    assert.ok(res.whatsappUrl.startsWith('https://api.whatsapp.com/send?phone=919811055490&text='));
    assert.ok(res.whatsappUrl.includes('code%3DGOMILES'));
  });

  // TEST 27: WhatsApp Notes Message Enforces Consent Check
  await test('Requirement: WhatsApp notes dispatch throws error without explicit consent', () => {
    assert.throws(() => {
      referralService.sendWhatsAppWithNotes({
        recipientName: 'Karan Malhotra',
        recipientPhone: '+91 98110 55490',
        companyName: 'UrbanFeast Hospitality',
        designation: 'Owner',
        notes: 'Some notes',
        consentConfirmed: false
      });
    }, /Consent confirmation is required/);
  });

  // TEST 28: 1-Click Search & Discovery - Small Domestic Businesses
  await test('Requirement: 1-Click search discovers fresh Small Domestic businesses with Tier 1 decision-maker', () => {
    const results = researchService.oneClickDiscoverCompanies({ scale: 'small', count: 1 });
    assert.strictEqual(results.length, 1);
    const item = results[0];
    assert.ok(item.company.id);
    assert.strictEqual(item.scale, 'small');
    assert.ok(item.decisionMaker.fullName);
    assert.strictEqual(item.decisionMaker.priorityTier, 1);
    assert.strictEqual(dmService.isCustomerCareContact(item.decisionMaker.phone, item.decisionMaker.email).isCustomerCare, false);
  });

  // TEST 29: 1-Click Search & Discovery - Big National Enterprises
  await test('Requirement: 1-Click search discovers fresh Big National Enterprises with Tier 1 decision-maker', () => {
    const results = researchService.oneClickDiscoverCompanies({ scale: 'big', count: 1 });
    assert.strictEqual(results.length, 1);
    const item = results[0];
    assert.strictEqual(item.scale, 'big');
    assert.ok(item.company.name);
    assert.strictEqual(item.decisionMaker.priorityTier, 1);
  });

  // TEST 30: 1-Click Search & Discovery - Non-Repetition Guarantee (Always Different Companies)
  await test('Requirement: Consecutive 1-click searches return strictly DIFFERENT companies (no duplicates)', () => {
    const lead1 = researchService.oneClickDiscoverCompanies({ scale: 'all', count: 1 })[0];
    const lead2 = researchService.oneClickDiscoverCompanies({ scale: 'all', count: 1 })[0];
    const lead3 = researchService.oneClickDiscoverCompanies({ scale: 'all', count: 1 })[0];

    assert.notStrictEqual(lead1.company.name.toLowerCase(), lead2.company.name.toLowerCase());
    assert.notStrictEqual(lead2.company.name.toLowerCase(), lead3.company.name.toLowerCase());
    assert.notStrictEqual(lead1.company.domain.toLowerCase(), lead2.company.domain.toLowerCase());
    assert.notStrictEqual(lead2.company.domain.toLowerCase(), lead3.company.domain.toLowerCase());
  });

  // TEST 31: Maximum 2-Call Contact Frequency Enforcement (Rule: Only 2 Calls Max, Then Excluded)
  await test('Requirement: Maximum 2-call cap per prospect - 3rd call rejected and excluded from auto queue', () => {
    // 1. Create a dedicated test company & decision-maker with unique test coordinates
    const salt = Date.now().toString().slice(-6);
    const testPhone = `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const comp = storage.addCompany({
      name: `Vedic Herbs Lab ${salt}`,
      domain: `vedicherbslab${salt}.in`,
      industry: 'Health & Wellness',
      scale: 'small'
    });
    const dm = dmService.create({
      companyId: comp.id,
      companyName: comp.name,
      fullName: `Dr. Sunil Kashyap ${salt}`,
      designation: 'Managing Director & Founder',
      phone: testPhone,
      email: `sunil${salt}@vedicherbslab.in`,
      sourceUrl: `https://vedicherbslab${salt}.in/founders`,
      verificationStatus: 'Verified'
    });

    // 0 Calls: Fresh lead (Attempt 1 eligible)
    let queue = callingService.getAutoDialQueue();
    let inQueue = queue.find(q => q.id === dm.id);
    assert.ok(inQueue, 'Lead with 0 calls should be in auto-dial queue');
    assert.strictEqual(inQueue.callCount, 0);
    assert.strictEqual(inQueue.remainingAttempts, 2);
    assert.strictEqual(storage.isCallLimitReached({ decisionMakerId: dm.id }), false);

    // 1st Call: Log Call 1
    const call1 = callingService.initiateAutomatedAiCall({ decisionMakerId: dm.id });
    storage.logCall({
      decisionMakerId: dm.id,
      companyId: comp.id,
      targetCompany: comp.name,
      targetPhone: dm.phone,
      callerIdMode: 'user-sim',
      outcome: 'No Answer / Reschedule'
    });

    assert.strictEqual(storage.getCallCountForContact({ decisionMakerId: dm.id }), 1);
    queue = callingService.getAutoDialQueue();
    inQueue = queue.find(q => q.id === dm.id);
    assert.ok(inQueue, 'Lead with 1 call should still be eligible for 2nd follow-up call');
    assert.strictEqual(inQueue.callCount, 1);
    assert.strictEqual(inQueue.remainingAttempts, 1);
    assert.strictEqual(storage.isCallLimitReached({ decisionMakerId: dm.id }), false);

    // 2nd Call: Log Call 2
    const call2 = callingService.initiateAutomatedAiCall({ decisionMakerId: dm.id });
    storage.logCall({
      decisionMakerId: dm.id,
      companyId: comp.id,
      targetCompany: comp.name,
      targetPhone: dm.phone,
      callerIdMode: 'unknown',
      outcome: 'Pitch Delivered - Follow-up Link Sent'
    });

    assert.strictEqual(storage.getCallCountForContact({ decisionMakerId: dm.id }), 2);
    assert.strictEqual(storage.isCallLimitReached({ decisionMakerId: dm.id }), true);

    // Excluded from queue after 2 calls
    queue = callingService.getAutoDialQueue();
    inQueue = queue.find(q => q.id === dm.id);
    assert.strictEqual(inQueue, undefined, 'Lead with 2 calls must be strictly EXCLUDED from auto-dial queue');

    // 3rd Call attempt must be rejected with Contact Frequency Limit Reached error
    assert.throws(() => {
      callingService.initiateAutomatedAiCall({ decisionMakerId: dm.id });
    }, /Contact Frequency Limit Reached/);

    assert.throws(() => {
      callingService.initiateCallSession({ decisionMakerId: dm.id });
    }, /Contact Frequency Limit Reached/);
  });

  console.log(`\n========================================`);
  console.log(`Total tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

