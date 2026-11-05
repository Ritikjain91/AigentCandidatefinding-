const assert = require('assert');
const storage = require('../src/services/storageService');
const dmService = require('../src/services/decisionMakerService');
const referralService = require('../src/services/referralService');
const researchService = require('../src/services/researchService');
const callingService = require('../src/services/callingService');

async function runTests() {
  console.log('🧪 Starting AutomaticCallingBot Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
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

