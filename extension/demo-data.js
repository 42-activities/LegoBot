// Generated from data/*.json by npm run build:fixtures. Synthetic demo only.
export default {
  "demo-case": {
    "matter": {
      "id": "northstar-v-atlas",
      "fund": "Northstar Growth Fund V, L.P.",
      "investor": "Atlas Public Pension Fund",
      "investorType": "Public pension plan",
      "commitment": "$20m",
      "sourceDocument": "Atlas Side Letter",
      "sourceVersion": "v3",
      "currentVersion": "v3"
    },
    "sourceNote": "Synthetic excerpts inspired by public PSERS, MEABF and ILPA examples. These are illustrative summaries, not verbatim extracts or verified current legal advice.",
    "legoraContext": "DEMO MATTER: Northstar Growth Fund V, L.P.; Atlas Public Pension Fund; public pension plan; $20m commitment; Atlas Side Letter v3.\n\n1. Power of Attorney: Atlas asks for confirmation that its power of attorney is ministerial only and excludes discretionary judgment. The LPA already limits it to ministerial/documentary actions permitted by the Fund documents.\n\n2. Public Records & Reporting: Atlas asks for legally required public-records disclosures and appropriate reporting/information access. The LPA provides general confidentiality and standard reporting. An executed Side Letter for a different public pension investor in Northstar Fund IV, with a $35m commitment, had tailored protections. This is evidence only; investor, fund, commitment and MFN context need consideration.\n\n3. Tax Withholding: Atlas asks for advance written notice and reasonable assistance to avoid unnecessary withholding where lawful. The LPA permits required withholding. Another public pension investor's executed Side Letter in Fund IV had notice/assistance language. Tax must confirm reuse for Fund V / Atlas.\n\n4. Advisory Council Seat: v3 permits Atlas to nominate a representative for consideration. The GP appoints members under the LPA. Another public pension investor in Fund IV with a $75m commitment received an executed designation right. Governance rights may be investor-specific and excluded from standard MFN. A current client commercial instruction is required."
  },
  "demo-analysis": {
    "issues": [
      {
        "id": "poa",
        "title": "Power of Attorney",
        "investorRequest": "Please confirm that any power of attorney granted under the Fund documents is ministerial only and cannot be used to exercise discretionary judgment on behalf of Atlas.",
        "lpaPosition": "The power of attorney is limited to ministerial/documentary actions permitted by the Fund documents.",
        "lpaSource": "Synthetic LPA summary · Power of attorney",
        "precedents": [],
        "status": "READY",
        "reason": "The core request appears substantially addressed by the LPA. The lawyer can move to drafting/review without a new specialist or client decision on this point.",
        "requiredReviewer": null,
        "nextAction": "Prepare a confirmation for lawyer review, without treating it as legal approval.",
        "draftResponse": "Our understanding is that the power of attorney is limited to ministerial and documentary actions permitted by the Fund documents and does not confer discretion to exercise judgment on behalf of Atlas. Counsel should verify this confirmation against the final documents.",
        "sourceDocument": "Atlas Side Letter",
        "sourceVersion": "v3",
        "stale": false
      },
      {
        "id": "public-records",
        "title": "Public Records & Reporting",
        "investorRequest": "As a public pension investor, Atlas must be able to make disclosures required by applicable public-records law and requests appropriate reporting and information-access arrangements.",
        "lpaPosition": "Fund information is confidential, subject to specified permitted disclosures and legally required disclosures, and the Fund provides standard investor reporting.",
        "lpaSource": "Synthetic LPA summary · Confidentiality and reporting",
        "precedents": [
          {
            "investor": "Meridian Public Retirement System",
            "investorType": "Public pension plan",
            "fund": "Northstar Growth Fund IV",
            "commitment": "$35m",
            "status": "EXECUTED",
            "sourceDocument": "Meridian Fund IV Side Letter · §4",
            "text": "A tailored public-records carve-out permitted legally required disclosures, with notice where lawful, and provided agreed investor reporting and information-access arrangements.",
            "applicability": "Similar public pension context; different fund, investor and commitment. Review scope, confidentiality safeguards and possible MFN implications. No commitment eligibility rule is assumed."
          }
        ],
        "status": "PRECEDENT",
        "reason": "Relevant executed wording is a useful starting point. It does not authorise the same treatment for Atlas or establish a commitment threshold.",
        "requiredReviewer": null,
        "nextAction": "Use as a proposed starting position, then include it in the whole client review package.",
        "draftResponse": "Consider tailored arrangements for disclosures required by applicable public-records law, with notice to the GP where lawful and practical, and reporting terms to be settled for Atlas.",
        "sourceDocument": "Atlas Side Letter",
        "sourceVersion": "v3",
        "stale": false
      },
      {
        "id": "tax",
        "title": "Tax Withholding",
        "investorRequest": "Before the Fund withholds and pays over any amount representing a tax liability of Atlas, Atlas requests advance written notice and reasonable assistance to avoid unnecessary withholding where legally possible.",
        "lpaPosition": "The General Partner may withhold taxes as required by applicable law and allocate withholding to the relevant investor.",
        "lpaSource": "Synthetic LPA summary · Tax withholding",
        "precedents": [
          {
            "investor": "Meridian Public Retirement System",
            "investorType": "Public pension plan",
            "fund": "Northstar Growth Fund IV",
            "commitment": "$35m",
            "status": "EXECUTED",
            "sourceDocument": "Meridian Fund IV Side Letter · §7",
            "text": "Advance notice and reasonable assistance regarding tax withholding were provided where legally permissible, without restricting compliance with applicable law.",
            "applicability": "Tax needs to confirm the wording for this fund, investor and source version. Previous execution does not replace current specialist review."
          }
        ],
        "status": "SPECIALIST_REVIEW",
        "reason": "The requested tax mechanics require a focused Tax review for Fund V / Atlas; the main lawyer can continue the other issues in parallel.",
        "requiredReviewer": "Tax",
        "specialistQuestion": "Can the previous public-pension withholding wording be reused for Fund V / Atlas, preserving all mandatory withholding obligations?",
        "nextAction": "Send the Atlas request, LPA baseline and executed precedent to Tax for this version.",
        "draftResponse": "Subject to Tax review: provide advance notice and reasonable assistance where legally permissible, without delaying or restricting mandatory withholding.",
        "sourceDocument": "Atlas Side Letter",
        "sourceVersion": "v3",
        "stale": false
      },
      {
        "id": "advisory-council",
        "title": "Advisory Council Seat",
        "investorRequest": "Atlas may nominate one representative for consideration for appointment to the Advisory Council.",
        "lpaPosition": "The General Partner appoints Advisory Council members from eligible Limited Partner representatives.",
        "lpaSource": "Synthetic LPA summary · Advisory Council appointments",
        "precedents": [
          {
            "investor": "Summit State Pension Trust",
            "investorType": "Public pension plan",
            "fund": "Northstar Growth Fund IV",
            "commitment": "$75m",
            "status": "EXECUTED",
            "sourceDocument": "Summit Fund IV Side Letter · §9",
            "text": "A prior public pension investor received a contractual right to designate one Advisory Council representative.",
            "applicability": "Governance rights can be investor-specific and may be excluded from standard MFN treatment. Atlas's $20m commitment is context for commercial judgment, not an automatic eligibility rule."
          }
        ],
        "status": "CLIENT_DECISION",
        "reason": "The existence of a designation precedent does not authorise granting governance rights to Atlas. The client must give a current commercial instruction.",
        "requiredReviewer": "Client",
        "nextAction": "Record a client instruction against the exact Atlas wording and version.",
        "draftResponse": "A current client instruction is required before drafting the Advisory Council position.",
        "sourceDocument": "Atlas Side Letter",
        "sourceVersion": "v3",
        "stale": false
      }
    ]
  },
  "demo-draft": {
    "draftEmail": "Dear Atlas team,\n\nThank you for your comments on the Fund documents. We have prepared a proposed response confirming the ministerial scope of the power of attorney, tailored public-records and reporting arrangements, and notice and reasonable assistance on withholding where legally permissible. The proposed Advisory Council position is observer / information rights only, with no voting appointment or nomination right.\n\nThese proposed terms remain subject to final lawyer review and settlement of the documents.\n\nKind regards,\nFund counsel",
    "commentsMemo": "Power of Attorney — confirm the ministerial/documentary limitation in the LPA; lawyer to verify the final text.\n\nPublic Records & Reporting — use the executed public pension precedent as a proposed starting point only. Check permitted disclosures, notice safeguards, information scope, commitment context and MFN implications.\n\nTax Withholding — Tax reviewed the proposed notice/assistance position for Atlas Side Letter v3. Preserve mandatory withholding and limit notice/assistance to what is legally permissible.\n\nAdvisory Council — client instruction: observer / information rights only; no voting appointment or nomination right. Align the memo, Side Letter and email with this instruction.\n\nWhole package approved by the simulated client for v3. All wording remains subject to final lawyer review; nothing is executed or binding.",
    "sideLetterChanges": "Public Records & Reporting — proposed wording: Atlas may disclose Fund information to the extent required by applicable public-records law. Where legally permissible and practical, Atlas will give the GP advance notice and cooperate on lawful confidentiality protections. Settle the reporting and information-access scope expressly.\n\nTax Withholding — proposed wording: Where legally permissible and practical, the GP will provide advance written notice of withholding attributable to Atlas and reasonable assistance to avoid unnecessary withholding. This does not restrict or delay compliance with mandatory tax withholding obligations.\n\nAdvisory Council — proposed wording: The GP may offer Atlas observer attendance and agreed information rights, subject to confidentiality and conflict safeguards. Atlas receives no right to nominate, appoint or designate a voting Advisory Council member.\n\nPower of Attorney — confirmation in the comments memo; no additional Side Letter clause proposed unless counsel identifies a gap."
  },
  "matter-v3": {
    "sourceDocument": "Atlas Side Letter",
    "sourceVersion": "v3",
    "advisoryCouncilRequest": "Atlas may nominate one representative for consideration for appointment to the Advisory Council.",
    "changedIssueIds": []
  },
  "matter-v4": {
    "sourceDocument": "Atlas Side Letter",
    "sourceVersion": "v4",
    "advisoryCouncilRequest": "Atlas shall have the right to appoint one voting member of the Advisory Council.",
    "changedIssueIds": [
      "advisory-council"
    ],
    "reason": "Nomination for consideration has changed to a contractual voting appointment right. The previous client instruction cannot automatically clear this stronger wording."
  }
};
