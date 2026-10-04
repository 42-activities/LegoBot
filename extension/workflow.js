import fixtures from './demo-data.js';

export const INITIAL_STATUSES = ['READY', 'PRECEDENT', 'SPECIALIST_REVIEW', 'CLIENT_DECISION'];
export const DECISIONS = {
  REJECT: 'Reject the governance request',
  OBSERVER_RIGHTS_ONLY: 'Observer / information rights only',
  ACCEPT_NOMINATION: 'Accept nomination for GP consideration only'
};
export const STATUS_LABELS = {
  READY: 'Ready for lawyer review', PRECEDENT: 'Precedent available',
  PROPOSED_FROM_PRECEDENT: 'Proposed from precedent', SPECIALIST_REVIEW: 'Specialist review required',
  IN_SPECIALIST_REVIEW: 'With Tax · work continues in parallel', SPECIALIST_REVIEWED: 'Specialist reviewed by Tax',
  CLIENT_DECISION: 'Client decision required', CLIENT_APPROVED: 'Client instruction recorded'
};

export function createState() {
  return {
    matter: structuredClone(fixtures['demo-case'].matter),
    issues: structuredClone(fixtures['demo-analysis'].issues),
    audit: [], package: null, drafts: null, analyzed: false,
    provenance: 'Demo-safe fallback', context: fixtures['demo-case'].legoraContext
  };
}

export function validateAnalysis(raw) {
  if (!raw || !Array.isArray(raw.issues) || raw.issues.length !== 4) throw new Error('Invalid issue schema');
  const expected = fixtures['demo-analysis'].issues;
  const seen = new Set();
  return expected.map(base => {
    const matches = raw.issues.filter(item => item.id === base.id);
    if (matches.length !== 1 || seen.has(base.id)) throw new Error('Invalid issue identifiers');
    const item = matches[0]; seen.add(item.id);
    if (!INITIAL_STATUSES.includes(item.status) || item.status !== base.status) throw new Error('Unsafe or inconsistent initial status');
    const permitted = new Set(['id', 'title', 'status', 'reason', 'draftResponse', 'nextAction']);
    if (Object.keys(item).some(key => !permitted.has(key))) throw new Error('Model attempted to set application state');
    if (typeof item.reason !== 'string' || item.reason.length < 10 || item.reason.length > 4000) throw new Error('Invalid reasoning');
    if (item.draftResponse !== undefined && (typeof item.draftResponse !== 'string' || item.draftResponse.length > 6000)) throw new Error('Invalid draft');
    return { ...structuredClone(base), reason: item.reason, draftResponse: item.draftResponse || base.draftResponse };
  });
}

export function applyAnalysis(state, result) {
  const next = createState();
  next.context = state.context;
  next.analyzed = true;
  if (result?.provenance === 'Mistral') {
    next.issues = validateAnalysis(result);
    next.provenance = 'Mistral';
  }
  return next;
}

function record(state, issue, type, actor, extra = {}) {
  const event = {
    id: state.audit.length + 1, at: new Date().toISOString(),
    fund: state.matter.fund, investor: state.matter.investor,
    issue: issue?.id || 'whole-package', sourceDocument: state.matter.sourceDocument,
    sourceVersion: issue?.sourceVersion || state.matter.currentVersion,
    approvalType: type, approvedBy: actor, simulated: true,
    ...(issue ? { clause: issue.investorRequest } : {}), ...extra
  };
  state.audit.push(event);
  return event;
}

export function canPreparePack(state) {
  return state.analyzed && state.issues.every(issue => !issue.stale && (
    (issue.id === 'poa' && issue.draftPrepared) ||
    (issue.id === 'public-records' && issue.status === 'PROPOSED_FROM_PRECEDENT') ||
    (issue.id === 'tax' && issue.status === 'SPECIALIST_REVIEWED') ||
    (issue.id === 'advisory-council' && issue.status === 'CLIENT_APPROVED')
  ));
}

export function canDraft(state) {
  return canPreparePack(state) && state.package?.status === 'CLIENT_PACKAGE_APPROVED' &&
    state.package.packageVersion === state.matter.currentVersion;
}

export function transition(input, action, payload = {}) {
  const state = structuredClone(input);
  if (!state.analyzed) throw new Error('Analyze the demo matter first.');
  const issue = state.issues.find(item => item.id === payload.id);
  const requireIssue = (id, status) => {
    if (!issue || issue.id !== id || (status && issue.status !== status)) throw new Error('This action is not available for the current issue state.');
  };
  switch (action) {
    case 'PREPARE_POA':
      requireIssue('poa', 'READY');
      issue.draftPrepared = true;
      record(state, issue, 'DRAFT_PREPARED', 'Lawyer');
      break;
    case 'PROPOSE_PRECEDENT':
      requireIssue('public-records', 'PRECEDENT');
      issue.status = 'PROPOSED_FROM_PRECEDENT';
      issue.proposedPosition = issue.draftResponse;
      record(state, issue, 'PROPOSED_STARTING_POSITION', 'Lawyer');
      break;
    case 'SEND_TAX':
      requireIssue('tax', 'SPECIALIST_REVIEW');
      issue.status = 'IN_SPECIALIST_REVIEW';
      issue.specialistReview = {
        specialist: 'Tax', status: 'IN_SPECIALIST_REVIEW',
        fund: state.matter.fund, investor: state.matter.investor,
        issue: issue.id, sourceDocument: issue.sourceDocument,
        sourceVersion: issue.sourceVersion, clause: issue.investorRequest,
        question: issue.specialistQuestion
      };
      record(state, issue, 'SPECIALIST_PACKET_PREPARED', 'Lawyer');
      break;
    case 'TAX_REPLY':
      requireIssue('tax', 'IN_SPECIALIST_REVIEW');
      issue.status = 'SPECIALIST_REVIEWED';
      Object.assign(issue.specialistReview, {
        status: 'SPECIALIST_REVIEWED', reviewedBy: 'Tax', simulated: true,
        response: 'Tax confirms that the prior wording can be used as the proposed Fund V position for Atlas, subject to final document review and mandatory withholding obligations.'
      });
      record(state, issue, 'SPECIALIST_REVIEW', 'Tax', { reviewedBy: 'Tax' });
      break;
    case 'CLIENT_DECISION':
      requireIssue('advisory-council', 'CLIENT_DECISION');
      if (!Object.hasOwn(DECISIONS, payload.decision)) throw new Error('Choose a valid client instruction.');
      issue.humanDecision = record(state, issue, 'CLIENT_INSTRUCTION', 'Client', { decision: payload.decision });
      issue.approvedBy = 'Client'; issue.status = 'CLIENT_APPROVED'; issue.stale = false;
      issue.proposedPosition = DECISIONS[payload.decision];
      state.package = null; state.drafts = null;
      break;
    case 'PREPARE_PACK':
      if (!canPreparePack(state)) throw new Error('Prepare POA, propose the precedent, complete Tax review and record the client instruction first.');
      state.package = { status: 'AWAITING_CLIENT', packageVersion: state.matter.currentVersion };
      record(state, null, 'PACKAGE_PREPARED', 'Lawyer');
      break;
    case 'RETURN_TO_LAWYER':
      if (state.package?.status !== 'AWAITING_CLIENT') throw new Error('Prepare a review package first.');
      state.package.status = 'RETURNED_TO_LAWYER'; state.drafts = null;
      record(state, null, 'PACKAGE_RETURNED', 'Client');
      break;
    case 'APPROVE_PACKAGE':
      if (!canPreparePack(state) || state.package?.status !== 'AWAITING_CLIENT' || state.package.packageVersion !== state.matter.currentVersion) throw new Error('The current package is not ready for sign-off.');
      const approval = record(state, null, 'CLIENT_PACKAGE_APPROVAL', 'Client');
      state.package = { ...state.package, ...approval, status: 'CLIENT_PACKAGE_APPROVED' };
      break;
    case 'ACTIVATE_V4':
      if (state.matter.currentVersion !== 'v3') throw new Error('The investor v4 fixture is already active.');
      const version = fixtures['matter-v4'];
      state.matter.currentVersion = state.matter.sourceVersion = 'v4';
      for (const affected of state.issues.filter(item => version.changedIssueIds.includes(item.id))) {
        affected.previousRequest = affected.investorRequest;
        affected.previousDecision = affected.humanDecision || null;
        affected.investorRequest = version.advisoryCouncilRequest;
        affected.sourceVersion = 'v4'; affected.stale = Boolean(affected.humanDecision);
        affected.status = 'CLIENT_DECISION'; affected.humanDecision = null;
        affected.approvedBy = null; affected.proposedPosition = null;
        affected.reason = version.reason;
        record(state, affected, 'MATERIAL_CHANGE', 'Version fixture', { invalidatedVersion: 'v3' });
      }
      if (state.package) state.previousPackage = { ...state.package, stale: true };
      state.package = null; state.drafts = null;
      break;
    default: throw new Error('Unknown workflow action');
  }
  return state;
}

export function governancePosition(decision) {
  switch (decision) {
    case 'OBSERVER_RIGHTS_ONLY':
      return 'Observer / information rights only. The GP may offer observer attendance and agreed information access, subject to confidentiality and conflict safeguards. Atlas receives no right to nominate, appoint or designate a voting Advisory Council member.';
    case 'REJECT':
      return 'Reject the requested Advisory Council governance right. The GP retains control over appointments; no contractual nomination, observer or voting appointment entitlement is granted.';
    case 'ACCEPT_NOMINATION':
      return 'Atlas may nominate one representative for consideration by the GP. Appointment remains at GP discretion. This grants no automatic appointment or voting seat; any v4 voting-appointment request is counterproposed on this narrower basis.';
    default: throw new Error('A current client instruction is required');
  }
}

export function validateDraftState(state) {
  if (!state || !canDraft(state)) throw new Error('Current client package approval is required before final drafts.');
  const demoMatter = fixtures['demo-case'].matter;
  if (!['v3','v4'].includes(state.matter.currentVersion) ||
      ['fund','investor','sourceDocument'].some(key => state.matter[key] !== demoMatter[key])) throw new Error('Invalid demo matter scope');
  if (state.package.approvedBy !== 'Client' || state.package.fund !== state.matter.fund ||
      state.package.investor !== state.matter.investor || state.package.sourceDocument !== state.matter.sourceDocument ||
      state.package.sourceVersion !== state.matter.currentVersion) throw new Error('Invalid client package scope');
  const known = fixtures['demo-analysis'].issues;
  if (state.issues.length !== 4 || known.some(base => state.issues.filter(i => i.id === base.id).length !== 1)) throw new Error('Invalid draft issue scope');
  const advisory = state.issues.find(i => i.id === 'advisory-council');
  const tax = state.issues.find(i => i.id === 'tax');
  const decision = advisory.humanDecision;
  const expectedAdvisory = fixtures[`matter-${state.matter.currentVersion}`].advisoryCouncilRequest;
  if (advisory.sourceVersion !== state.matter.currentVersion || advisory.investorRequest !== expectedAdvisory ||
      known.some(base => base.id !== 'advisory-council' && state.issues.find(i => i.id === base.id).investorRequest !== base.investorRequest)) throw new Error('Clause does not match the recorded fixture');
  if (!decision || decision.approvedBy !== 'Client' || decision.sourceVersion !== advisory.sourceVersion ||
      decision.fund !== state.matter.fund || decision.investor !== state.matter.investor ||
      decision.sourceDocument !== advisory.sourceDocument || decision.clause !== advisory.investorRequest) throw new Error('Client instruction scope is invalid');
  if (tax.specialistReview?.reviewedBy !== 'Tax' || tax.specialistReview.clause !== tax.investorRequest ||
      tax.specialistReview.fund !== state.matter.fund || tax.specialistReview.investor !== state.matter.investor ||
      tax.specialistReview.sourceVersion !== tax.sourceVersion) throw new Error('Tax review scope is invalid');
  governancePosition(decision.decision);
  return state;
}

// AI drafts three independent issues. Governance wording is assembled from the
// recorded instruction in all three products so a model cannot change authority.
export function composeDrafts(state, modelSections = null) {
  validateDraftState(state);
  const advisory = state.issues.find(i => i.id === 'advisory-council');
  const tax = state.issues.find(i => i.id === 'tax');
  const governance = governancePosition(advisory.humanDecision.decision);
  const version = state.matter.currentVersion;
  const note = `Draft for final lawyer review · ${state.matter.sourceDocument} ${version}. Simulated client sign-off; no document is executed or binding.`;
  const defaults = {
    poa: {
      draftEmail: 'We propose to confirm the ministerial/documentary scope of the power of attorney in the LPA.',
      commentsMemo: 'Power of Attorney — confirm that the LPA limits the power to ministerial/documentary actions; verify against the final documents. No additional specialist or commercial instruction is currently needed.',
      sideLetterChanges: 'Power of Attorney — confirmation belongs in the comments memo. No additional Side Letter clause is proposed unless counsel identifies a gap.'
    },
    'public-records': {
      draftEmail: 'We propose tailored public-records disclosures and reporting arrangements, with appropriate confidentiality safeguards.',
      commentsMemo: 'Public Records & Reporting — proposed from the executed public pension precedent; check the scope, permitted disclosures, notice safeguards, reporting arrangements and MFN/commitment context. Precedent is evidence, not current authority.',
      sideLetterChanges: 'Public Records & Reporting — Atlas may disclose Fund information to the extent required by applicable public-records law. Where legally permissible and practical, Atlas will give the GP advance notice and cooperate on lawful confidentiality protections. Settle the reporting and information-access scope expressly.'
    },
    tax: {
      draftEmail: 'We propose advance notice and reasonable assistance on withholding where legally permissible, preserving mandatory withholding obligations.',
      commentsMemo: `Tax Withholding — Tax reviewed the proposed notice/assistance position for ${tax.specialistReview.sourceVersion}${version !== tax.specialistReview.sourceVersion ? '; the Tax clause is unchanged in ' + version : ''}. Preserve mandatory withholding obligations. Specialist review does not itself provide commercial client approval.`,
      sideLetterChanges: 'Tax Withholding — Where legally permissible and practical, the GP will provide advance written notice of withholding attributable to Atlas and reasonable assistance to avoid unnecessary withholding. This does not restrict or delay compliance with mandatory tax withholding obligations.'
    }
  };
  const sections = modelSections || defaults;
  return {
    draftEmail: `Dear Atlas team,\n\nThank you for your comments on the Fund documents.\n\n${['poa', 'public-records', 'tax'].map(id => sections[id].draftEmail).join('\n\n')}\n\nAdvisory Council: ${governance}\n\nThese proposed terms remain subject to final lawyer review and settlement of the documents.\n\nKind regards,\nFund counsel\n\n${note}`,
    commentsMemo: `${['poa', 'public-records', 'tax'].map(id => sections[id].commentsMemo).join('\n\n')}\n\nAdvisory Council — current client instruction for ${advisory.sourceVersion}: ${governance}\n\n${note}`,
    sideLetterChanges: `${['poa', 'public-records', 'tax'].map(id => sections[id].sideLetterChanges).join('\n\n')}\n\nAdvisory Council — suggested wording aligned with the client instruction: ${governance}\n\n${note}`
  };
}
