import { freezeDesign } from '../content-design/catalogs.mjs';

const docs = 'https://docs.coupa.com/en/';
const sources = {
  culture: 'https://careers.coupa.com/en/life-at-coupa/',
  s2p: `${docs}coupa-glossary/overview/s`,
  approval: `${docs}coupa-glossary/overview/a`,
  requisitions: `${docs}developer-documentation/the-coupa-core-api/resources/transactional-resources/requisitions-api-requisitions`,
  requisitionExamples: `${docs}developer-documentation/the-coupa-core-api/resources/transactional-resources/requisitions-api-requisitions/requisitions-api-example-calls`,
  receipts: `${docs}developer-documentation/the-coupa-core-api/resources/transactional-resources/receipts-api`,
  invoices: `${docs}supplier-documentation/coupa-for-suppliers/the-coupa-supplier-portal-or-csp/features-and-processes-in-the-coupa-supplier-portal/invoices/view-and-manage-invoices`,
  orders: `${docs}supplier-documentation/coupa-for-suppliers/the-coupa-supplier-portal-or-csp/features-and-processes-in-the-coupa-supplier-portal/purchase-orders/view-and-manage-pos/edit-a-po-in-the-csp`,
  api: `${docs}developer-documentation/the-coupa-core-api/get-started-with-the-api`,
  scopes: `${docs}developer-documentation/the-coupa-core-api/oauth-2.0-and-oidc/openid-connect-clients`,
  pages: `${docs}developer-documentation/the-coupa-core-api/get-started-with-the-api/querying-options`,
  runs: `${docs}developer-documentation/the-coupa-core-api/resources/transactional-resources/integrations-api-integrations/integration-runs-api`,
};
const sourceTitles = {
  culture: 'Coupa — Life at Coupa',
  s2p: 'Coupa glossary — Source to pay',
  approval: 'Coupa glossary — Approval',
  requisitions: 'Coupa Core API — Requisitions',
  requisitionExamples: 'Coupa Core API — Requisition creation examples',
  receipts: 'Coupa Core API — Receipts',
  invoices: 'Coupa Supplier Portal — View and manage invoices',
  orders: 'Coupa Supplier Portal — Edit a purchase order',
  api: 'Coupa Core API — Get started',
  scopes: 'Coupa Core API — OpenID Connect clients',
  pages: 'Coupa Core API — Querying options',
  runs: 'Coupa Core API — Integration runs',
};
const record = (id, title, ...lines) => ({ id, title, lines });
const field = (id, label, options, expected, explanation) => ({
  id,
  label,
  options: options.map(([value, label]) => ({ value, label })),
  expected,
  explanation,
});
const choices = (...values) => values.map((value) => [value, value]);
const reflection = (id, label, options) => ({
  id,
  label,
  expected: null,
  explanation: 'There is no scored personality or values assessment.',
  options: options.map(([value, consequence]) => ({ value, label: value, consequence })),
});
const rows = [
  [
    'coupa-inside-village',
    1,
    'Make a first connection',
    'New colleague',
    'Choose a small next step in a fictional first week. This is a reflection on how you prefer to connect, not a test of belonging.',
    [
      record(
        'welcome',
        'Village welcome',
        'Coupa’s public culture page names Cultivate Belonging as a core value.',
        'The fictional team offers a buddy conversation and a written introduction thread.',
        'Both routes are available; neither determines whether someone belongs.',
      ),
      record(
        'handoff',
        'A helpful introduction',
        'Share your role, one current question, and how teammates can reach you.',
        'Keep personal details optional.',
      ),
    ],
    [
      reflection('connection', 'Your first step', [
        [
          'Ask a buddy for a short conversation',
          'A buddy can provide immediate context and introduce another teammate.',
        ],
        [
          'Write a short introduction',
          'A written introduction gives colleagues across time zones a way to respond.',
        ],
      ]),
    ],
    'Your connection plan is saved. Different approaches can build the same community.',
    ['culture'],
  ],
  [
    'coupa-inside-village',
    2,
    'Listen before connecting',
    'Teammate',
    'A fictional colleague asks for help with a confusing handoff. Choose how to understand the need before proposing a fix.',
    [
      record(
        'request',
        'Colleague’s message',
        '“I am not sure who owns the next step.”',
        'There are no customer records in this exercise.',
      ),
      record(
        'context',
        'Available context',
        'Drive Success for #AllofUs is one of Coupa’s current public core values.',
        'A shared handoff note may be stale. The colleague is available today.',
        'You can begin with either the person or the written context, then confirm understanding.',
      ),
    ],
    [
      reflection('start', 'Where you begin', [
        [
          'Ask the colleague to describe the blocker',
          'A short conversation can uncover missing context; record the agreed next step afterward.',
        ],
        [
          'Read the handoff note together',
          'Reviewing the note together can expose the gap; check that it matches the colleague’s experience.',
        ],
      ]),
    ],
    'Listening approach saved. The next handoff begins with a shared understanding.',
    ['culture'],
  ],
  [
    'coupa-inside-village',
    3,
    'Make participation easier',
    'Workshop host',
    'A fictional team workshop spans time zones and communication preferences. Choose the first improvement you would make.',
    [
      record(
        'workshop',
        'Workshop constraints',
        'Two colleagues cannot join the live hour. Another prefers time to consider written questions.',
        'The team wants everyone to have a useful way to contribute.',
      ),
      record(
        'options',
        'Available support',
        'A shared document and a recorded summary are available.',
        'Ask participants what helps; do not infer anyone’s disability or personal circumstances.',
      ),
    ],
    [
      reflection('support', 'First improvement', [
        [
          'Share questions before the session',
          'Advance questions create more time to consider and contribute; leave an asynchronous response route.',
        ],
        [
          'Open an asynchronous contribution thread',
          'An open thread gives colleagues outside the live hour a place to contribute; bring their ideas into the summary.',
        ],
      ]),
    ],
    'Participation plan saved. Follow up with the people it is intended to help.',
    ['culture'],
  ],
  [
    'coupa-inside-village',
    4,
    'Own the handoff',
    'Project contributor',
    'Your fictional project moves to another team tomorrow. Choose how to make the transition understandable.',
    [
      record(
        'work',
        'Current state',
        'Coupa’s public culture page names Own our Results as a core value.',
        'The prototype works. One open question remains about the demonstration schedule.',
        'The receiving team needs an owner and a clear next step.',
      ),
      record(
        'handoff',
        'Available handoff routes',
        'You can write a short status note or host a short walkthrough.',
        'Both routes should retain the open question instead of hiding it.',
      ),
    ],
    [
      reflection('handoff', 'Handoff approach', [
        [
          'Write status, owner and next step',
          'A written handoff gives the receiving team a durable reference; invite corrections.',
        ],
        [
          'Walk through the work and record decisions',
          'A walkthrough can surface questions quickly; save the resulting owner and next step.',
        ],
      ]),
    ],
    'Handoff approach saved. Ownership stays visible after the transition.',
    ['culture'],
  ],
  [
    'coupa-inside-village',
    5,
    'Build a small experiment',
    'Team contributor',
    'A fictional repeated task slows your team. Choose a small, reversible way to learn before proposing a wider change.',
    [
      record(
        'problem',
        'Repeated task',
        'Build Tomorrow Together is one of Coupa’s current public core values.',
        'Teammates repeatedly ask where the latest workshop guide lives.',
        'No production system or customer information is involved.',
      ),
      record(
        'experiment',
        'Two local experiments',
        'Try a visible link on the team page, or try a short guide index with three teammates.',
        'Use what you learn to decide whether the change helps.',
      ),
    ],
    [
      reflection('experiment', 'First experiment', [
        [
          'Try one visible team-page link',
          'A small link change tests whether discoverability is the main problem; observe whether questions decrease.',
        ],
        [
          'Test a guide index with three teammates',
          'A small usability check can reveal confusing labels before the index grows.',
        ],
      ]),
    ],
    'Experiment saved. A useful result can be improvement or evidence to change direction.',
    ['culture'],
  ],
  [
    'coupa-inside-village',
    6,
    'Share what the village learned',
    'Team contributor',
    'Close the fictional team project by choosing how to carry useful learning forward. This reflection does not score your values.',
    [
      record(
        'result',
        'Project notes',
        'A shared owner list reduced confusion. An early scheduling assumption proved wrong.',
        'Several colleagues helped; the team wants their contribution recognized.',
      ),
      record(
        'next',
        'Two ways to share',
        'A short retrospective or an annotated handoff guide can carry learning forward.',
        'Include what changed and credit the collaborators in either format.',
      ),
    ],
    [
      reflection('share', 'Sharing format', [
        [
          'Host a short retrospective',
          'A conversation can surface more perspectives; preserve the agreed learning afterward.',
        ],
        [
          'Publish an annotated team guide',
          'A durable guide supports future teammates; invite additions from contributors.',
        ],
      ]),
    ],
    'Reflection saved. Community learning continues beyond this route.',
    ['culture'],
  ],
  [
    'coupa-source-to-pay',
    1,
    'Write the requirement',
    'Requester',
    'Prepare the requirement for a fictional workshop opening. The chosen record must describe the need, not prematurely choose a supplier.',
    [
      record(
        'need',
        'Workshop brief',
        'Twelve learners each need one electronics kit.',
        'The workshop starts 14 October. Kits must arrive by 12 October.',
      ),
      record(
        'offer',
        'Unsolicited offer',
        'Supplier Birch offers ten camera cases arriving 16 October.',
        'An offer is evidence to compare, not the requirement itself.',
      ),
    ],
    [
      field(
        'item',
        'Required item',
        choices('Electronics kit', 'Camera case'),
        'Electronics kit',
        'Camera cases cannot replace the electronics kits learners will use; copying the offer would leave the workshop without its required equipment.',
      ),
      field(
        'quantity',
        'Required quantity',
        choices('10', '12'),
        '12',
        'Ten kits would leave two of the twelve learners without equipment. Keep one kit per learner.',
      ),
      field(
        'needBy',
        'Required arrival',
        choices('12 October', '16 October'),
        '12 October',
        'An arrival on 16 October misses the 14 October workshop. The brief needs kits by 12 October for preparation.',
      ),
    ],
    'Requirement saved: 12 electronics kits, needed by 12 October.',
    ['s2p'],
  ],
  [
    'coupa-source-to-pay',
    2,
    'Compare the offers',
    'Buyer',
    'Select an offer against the declared need and budget. These fictional suppliers are collaborators, not enemies.',
    [
      record(
        'requirement',
        'Approved requirement',
        '12 electronics kits by 12 October. Maximum total: 600 credits.',
        'All kits must include a reusable case.',
      ),
      record(
        'offers',
        'Comparable offers',
        'Birch: 12 kits with cases, 570 credits, 11 October.',
        'Cedar: 12 kits without cases, 510 credits, 10 October.',
        'Maple: 12 kits with cases, 540 credits, 15 October.',
      ),
    ],
    [
      field(
        'supplier',
        'Selected offer',
        choices('Birch', 'Cedar', 'Maple'),
        'Birch',
        'Cedar omits the required cases; Maple arrives after the deadline. Birch supplies the complete scope on time within 600 credits.',
      ),
      field(
        'basis',
        'Recorded decision basis',
        choices('Meets scope, date and budget', 'Lowest displayed price'),
        'Meets scope, date and budget',
        'Choosing the lowest displayed price would omit required cases. Record scope, date and budget so the next owner can understand the award.',
      ),
    ],
    'Birch offer linked to the requirement with its decision basis.',
    ['s2p'],
  ],
  [
    'coupa-source-to-pay',
    3,
    'Prepare the terms handoff',
    'Sourcing coordinator',
    'Connect the chosen offer to a fictional contract brief. This exercise is a document handoff, not legal advice.',
    [
      record(
        'award',
        'Chosen offer',
        'Birch: 12 electronics kits with reusable cases.',
        'Total 570 credits; arrival 11 October.',
      ),
      record(
        'terms',
        'Agreed scenario terms',
        'The parties have agreed payment 30 days after invoice date.',
        'The contract brief must retain the chosen scope and those terms.',
      ),
    ],
    [
      field(
        'scope',
        'Contract scope',
        choices('12 kits with cases', '12 cases only'),
        '12 kits with cases',
        'Cases alone would remove the electronics kits from the handoff. Retain both kits and cases from the chosen offer.',
      ),
      field(
        'paymentTerm',
        'Payment term',
        choices('30 days after invoice date', 'Pay immediately on order'),
        '30 days after invoice date',
        'Immediate payment on order changes the agreed obligation. Carry forward the parties’ 30-days-after-invoice term without inventing a new one.',
      ),
    ],
    'Contract brief prepared with the awarded scope and agreed payment term.',
    ['s2p'],
  ],
  [
    'coupa-source-to-pay',
    4,
    'Route the request',
    'Requester',
    'A draft request is ready. Apply the fictional organization’s handoff policy; this is not a live Coupa configuration.',
    [
      record(
        'request',
        'Request R-104',
        '12 kits, total 570 credits. Status: Draft.',
        'Supplier and contract references are present.',
      ),
      record(
        'policy',
        'Scenario policy',
        'A department approver reviews requests above 500 credits.',
        'Only an approved request can proceed to the buyer for order issuance.',
      ),
    ],
    [
      field(
        'nextOwner',
        'Next owner',
        choices('Department approver', 'Supplier'),
        'Department approver',
        '570 credits exceeds this case’s 500-credit threshold. Sending the draft to the supplier would skip the required department review.',
      ),
      field(
        'nextState',
        'Requested next state',
        choices('Pending approval', 'Issued order'),
        'Pending approval',
        'Pending approval preserves the required review step. Calling the draft an issued order would claim an authorization that has not happened.',
      ),
    ],
    'Request R-104 routed for approval; no purchase order has been issued.',
    ['approval', 'requisitions'],
  ],
  [
    'coupa-source-to-pay',
    5,
    'Record what arrived',
    'Receiver',
    'Update the fictional receiving record using the delivery evidence. Leave undelivered quantities outstanding.',
    [
      record('order', 'Order PO-204', 'Line 1: 12 electronics kits. Previously received: 0.'),
      record(
        'delivery',
        'Delivery note D-204A',
        '8 kits arrived intact today.',
        'The remaining 4 kits are scheduled for later.',
      ),
    ],
    [
      field(
        'line',
        'Order line',
        choices('PO-204 / line 1', 'PO-999 / line 1'),
        'PO-204 / line 1',
        'PO-204 is the order on the delivery evidence. Posting to PO-999 would leave the real order outstanding and corrupt an unrelated record.',
      ),
      field(
        'received',
        'Quantity received today',
        choices('8', '12'),
        '8',
        'Recording 12 would claim the four undelivered kits arrived and hide the remaining delivery. Record the eight physically received today.',
      ),
    ],
    'Receipt recorded for 8 kits. Four kits remain outstanding.',
    ['receipts'],
  ],
  [
    'coupa-source-to-pay',
    6,
    'Close the record chain',
    'Accounts payable',
    'Reconcile the example’s three-document check and prepare the correct handoff. A later payment is a separate event.',
    [
      record(
        'chain',
        'Order and receipt',
        'PO-204 ordered 12 kits. Receipts now total 12 kits.',
        'Invoice INV-204 is for 12 kits at the agreed 570 credits.',
      ),
      record(
        'status',
        'Current invoice',
        'Status: Pending approval. No payment record exists.',
        'The scenario requires an AP review before payment scheduling.',
        'For this simplified case, matching quantities and the agreed total satisfy that review; there are no other holds. Real review rules vary by organization.',
      ),
    ],
    [
      field(
        'match',
        'Reconciliation result',
        choices('Documents match', 'Quantity mismatch'),
        'Documents match',
        'The order, receipts and invoice each show 12 kits, and the invoice matches 570 credits. Flagging a quantity mismatch would delay this ready handoff.',
      ),
      field(
        'state',
        'After the review',
        choices('Approved for payment', 'Paid'),
        'Approved for payment',
        'This case permits approval after the matching check, but no payment record exists. Marking it paid would conceal the outstanding payment step.',
      ),
    ],
    'Invoice approved for payment scheduling. It has not been marked paid.',
    ['invoices'],
  ],
  [
    'coupa-product-operations',
    1,
    'Choose the actionable task',
    'Requester',
    'Work from a fictional task board. Select the request assigned to your role instead of acting on another team’s notification.',
    [
      record(
        'role',
        'Your current role',
        'You are the requester for R-301.',
        'Your task is to complete a missing delivery address.',
      ),
      record(
        'tasks',
        'Task board',
        'R-301: delivery address missing; assigned to you.',
        'INV-77: approved notification; no requester action.',
        'R-405: review pending; assigned to a department approver.',
      ),
    ],
    [
      field(
        'record',
        'Open record',
        choices('R-301', 'INV-77', 'R-405'),
        'R-301',
        'R-301 is assigned to the requester. Acting on R-405 would take another role’s review while leaving your delivery address unresolved.',
      ),
      field(
        'action',
        'Work to perform',
        choices('Complete delivery address', 'Approve invoice'),
        'Complete delivery address',
        'The invoice notification reports an outcome; it does not assign you approval work. Complete the address so the requester’s task can move forward.',
      ),
    ],
    'R-301 opened with the requester’s delivery-address task selected.',
    ['requisitions', 'approval'],
  ],
  [
    'coupa-product-operations',
    2,
    'Repair and save the draft',
    'Requester',
    'Correct the fictional draft’s missing information and save it. Saving is deliberately separate from submitting.',
    [
      record(
        'draft',
        'Draft R-301',
        'Item: desk lamp. Quantity: empty. Currency: EUR.',
        'Delivery address is now Workshop North.',
      ),
      record(
        'brief',
        'Request note',
        'The team needs 4 desk lamps.',
        'The requester wants to save the draft for review before submission.',
      ),
    ],
    [
      field(
        'quantity',
        'Quantity',
        choices('1', '4'),
        '4',
        'One lamp would leave three of the four requested lamps unfulfilled. Use the request note’s quantity of four.',
      ),
      field(
        'operation',
        'Draft action',
        choices('Save draft', 'Submit for approval'),
        'Save draft',
        'Submitting now would start a review before the requester’s intended draft check. Save the complete draft and keep submission separate.',
      ),
    ],
    'R-301 saved as a complete draft. It has not been submitted.',
    ['requisitions'],
  ],
  [
    'coupa-product-operations',
    3,
    'Review the evidence',
    'Department approver',
    'Apply the stated policy to a fictional request. The training screen is illustrative, not a replica of a customer instance.',
    [
      record(
        'request',
        'Request R-302',
        'Total: 780 credits. Business purpose: workshop equipment.',
        'Supporting quote: missing.',
      ),
      record(
        'policy',
        'Review policy for this case',
        'Requests above 500 credits require an attached quote.',
        'Incomplete requests are returned to the requester for clarification.',
      ),
    ],
    [
      field(
        'decision',
        'Review action',
        choices('Return for clarification', 'Approve'),
        'Return for clarification',
        '780 credits exceeds this case’s threshold and the required quote is absent. Approval would bypass the stated evidence check.',
      ),
      field(
        'reason',
        'Handoff reason',
        choices('Attach supporting quote', 'Request is too old'),
        'Attach supporting quote',
        'A request to attach the quote tells the requester how to repair the handoff. An age complaint does not identify the missing evidence.',
      ),
    ],
    'R-302 returned with a request for the supporting quote.',
    ['approval'],
  ],
  [
    'coupa-product-operations',
    4,
    'Handle a pending change',
    'Buyer',
    'Track a fictional supplier change without confusing a request with the currently accepted order.',
    [
      record(
        'order',
        'Issued PO-303',
        'Accepted delivery date: 18 October.',
        'Accepted quantity: 10 kits.',
      ),
      record(
        'change',
        'Supplier change request C-303',
        'Proposed delivery date: 21 October. Status: Pending review.',
        'The scenario routes delivery changes to the buyer for review.',
      ),
    ],
    [
      field(
        'owner',
        'Review owner',
        choices('Buyer', 'Requester automatically'),
        'Buyer',
        'This case assigns delivery-change review to the buyer. Sending it elsewhere would leave the pending change without its designated decision maker.',
      ),
      field(
        'acceptedDate',
        'Current accepted delivery date',
        choices('18 October', '21 October'),
        '18 October',
        'Using 21 October now would treat an unapproved proposal as accepted. Retain 18 October until this change is approved.',
      ),
    ],
    'Change C-303 routed to the buyer. The accepted date remains 18 October.',
    ['orders'],
  ],
  [
    'coupa-product-operations',
    5,
    'Receive the correct line',
    'Receiver',
    'Record the delivery against the correct fictional order line, leaving undelivered goods open.',
    [
      record(
        'lines',
        'Order PO-304',
        'Line 1: 6 monitors. Line 2: 10 keyboards.',
        'Neither line has a previous receipt.',
      ),
      record(
        'delivery',
        'Packing slip',
        '4 monitors delivered. No keyboards delivered.',
        'Record only the goods physically received in this case.',
      ),
    ],
    [
      field(
        'line',
        'Receiving line',
        choices('Line 1: monitors', 'Line 2: keyboards'),
        'Line 1: monitors',
        'Receiving keyboards would record goods that did not arrive while leaving the monitor delivery unrecorded. Use the monitor line.',
      ),
      field(
        'quantity',
        'Quantity received',
        choices('4', '6', '10'),
        '4',
        'Six would hide the two undelivered monitors; ten would also confuse the keyboard quantity. Record the four monitors on the packing slip.',
      ),
    ],
    'Four monitors received on line 1; two monitors and ten keyboards remain open.',
    ['receipts'],
  ],
  [
    'coupa-product-operations',
    6,
    'Resolve the quantity exception',
    'Accounts payable',
    'Trace a fictional discrepancy using linked records. This exercise does not prescribe country-specific tax or credit-note rules.',
    [
      record(
        'records',
        'Linked records',
        'PO-305: 8 lamps. Receipt: 8 lamps. Invoice: 10 lamps.',
        'The invoice has not been paid.',
      ),
      record(
        'policy',
        'Exception handling for this case',
        'Send a quantity clarification to the supplier through the AP owner.',
        'Do not alter a correct receipt to make the invoice match.',
      ),
    ],
    [
      field(
        'issue',
        'Discrepancy',
        choices('Invoice quantity', 'Receipt quantity'),
        'Invoice quantity',
        'The order and actual receipt both show eight lamps; only the invoice shows ten. Changing the receipt would erase accurate delivery evidence.',
      ),
      field(
        'handoff',
        'Next action',
        choices('AP requests supplier clarification', 'Increase receipt to ten'),
        'AP requests supplier clarification',
        'AP can ask the supplier to clarify the extra two invoiced lamps. Increasing a correct receipt would disguise the discrepancy without delivering goods.',
      ),
    ],
    'Quantity exception documented and handed to AP for supplier clarification.',
    ['invoices'],
  ],
  [
    'coupa-developer-integration',
    1,
    'Plan a resource read',
    'Integration developer',
    'Configure an illustrative Core API read. No request is sent and no customer instance is used.',
    [
      record(
        'requirement',
        'Integration requirement',
        'Read one known supplier record for a small on-demand lookup.',
        'The job does not update the supplier.',
      ),
      record(
        'resources',
        'Resource notes',
        'Supplier records belong to the suppliers resource.',
        'API reads suit the on-demand lookup; bulk file imports serve a different job.',
      ),
    ],
    [
      field(
        'resource',
        'Resource',
        choices('suppliers', 'invoices'),
        'suppliers',
        'An invoices read returns the wrong business object. Select suppliers so the lookup can resolve the known supplier record.',
      ),
      field(
        'method',
        'Operation',
        choices('GET', 'POST'),
        'GET',
        'GET reads the existing supplier; POST attempts a create. Choosing a write operation would exceed this read-only lookup.',
      ),
    ],
    'Local request plan: GET one supplier record. No network request was made.',
    ['api'],
  ],
  [
    'coupa-developer-integration',
    2,
    'Choose the narrow access',
    'Integration developer',
    'Configure a fictional system-to-system client. Scope labels are training labels, not a list to paste into a live instance.',
    [
      record(
        'job',
        'Job context',
        'A scheduled backend job reads accounting reference data.',
        'No end user is present and the job never writes data.',
      ),
      record(
        'access',
        'Available training choices',
        'Client credentials: system-to-system. Authorization code: user-involved consent.',
        'Read accounting grants the needed read; write accounting is broader than this job.',
      ),
    ],
    [
      field(
        'grant',
        'Grant type',
        choices('Client credentials', 'Authorization code'),
        'Client credentials',
        'The unattended job has no user to complete consent. Client credentials fits the stated system-to-system context; authorization code needs user involvement.',
      ),
      field(
        'scope',
        'Training permission',
        choices('Read accounting', 'Read and write accounting'),
        'Read accounting',
        'Write permission adds an ability this job never needs. Read-only access limits what the fictional client can change if misused.',
      ),
    ],
    'Fictional client configured for client credentials and accounting read only.',
    ['scopes'],
  ],
  [
    'coupa-developer-integration',
    3,
    'Finish the filtered read',
    'Integration developer',
    'Complete a frozen, two-page local response set. The fixture is small; the documented Core API page bound is separate.',
    [
      record(
        'page-one',
        'Local page 1',
        'Filter: active suppliers. IDs returned: 101, 102.',
        'The fixture indicates another page exists.',
      ),
      record(
        'page-two',
        'Local page 2',
        'Same filter. ID returned: 103. No further page.',
        'The combined result contains three unique records.',
      ),
    ],
    [
      field(
        'ids',
        'Combined result IDs',
        choices('101, 102', '101, 102, 103'),
        '101, 102, 103',
        'Stopping after the first page drops supplier 103 from the ledger. Include both frozen pages to complete this query.',
      ),
      field(
        'filter',
        'Filter on subsequent page',
        choices('Keep active-supplier filter', 'Drop filter'),
        'Keep active-supplier filter',
        'Dropping the active-supplier filter can mix in records outside the requested set. Keep the same query while advancing through pages.',
      ),
    ],
    'Local ledger completed with IDs 101, 102 and 103 under the same filter.',
    ['pages'],
  ],
  [
    'coupa-developer-integration',
    4,
    'Resolve valid references',
    'Integration developer',
    'Prepare a fictional transaction using existing active references. This is not a complete production payload.',
    [
      record(
        'references',
        'Available reference records',
        'Supplier S-10: active. Supplier S-11: inactive.',
        'Requester U-7: active. Accounting code WORKSHOP: exists.',
      ),
      record(
        'draft',
        'Draft requirement',
        'The transaction requires the active supplier, requester U-7 and existing code WORKSHOP.',
        'Do not invent a missing supplier or change the intended requester.',
      ),
    ],
    [
      field(
        'supplier',
        'Supplier reference',
        choices('S-10', 'S-11', 'S-99'),
        'S-10',
        'S-11 is inactive and S-99 does not exist in this fixture. Neither satisfies the draft’s active-reference requirement; resolve S-10.',
      ),
      field(
        'account',
        'Accounting reference',
        choices('WORKSHOP', 'UNLISTED'),
        'WORKSHOP',
        'UNLISTED has no reference in this fixture. WORKSHOP preserves the intended accounting assignment without inventing a record.',
      ),
    ],
    'Active supplier and existing accounting references linked to the fictional draft.',
    ['requisitions'],
  ],
  [
    'coupa-developer-integration',
    5,
    'Repair the validation error',
    'Integration developer',
    'Inspect a deterministic local validation response and repair only the missing field.',
    [
      record(
        'request',
        'Fictional draft request',
        'One quantity-based line: electronics kit. Currency EUR. Quantity missing.',
        'The intended quantity is 3. This exercise creates a draft only.',
      ),
      record(
        'response',
        'Local response',
        'Validation failed: quantity is required for this quantity-based line.',
        'No draft was created on the failed attempt; correct the request before retrying.',
      ),
    ],
    [
      field(
        'quantity',
        'Line quantity',
        choices('0', '3'),
        '3',
        'Zero does not fulfill the three-kit requirement. Repair the missing quantity to three while retaining the other draft fields.',
      ),
      field(
        'operation',
        'Successful next operation',
        choices('Create draft', 'Mark order issued'),
        'Create draft',
        'Passing draft validation creates a draft only. Marking an order issued would skip separate submission, approval and issuance steps.',
      ),
    ],
    'Local validation passed. Fictional draft created; no real API was called.',
    ['requisitionExamples'],
  ],
  [
    'coupa-developer-integration',
    6,
    'Recover the failed item',
    'Integration developer',
    'Use the fixture’s recovery policy. Coupa endpoint-specific idempotency and retry behavior must be checked separately.',
    [
      record(
        'ledger',
        'Local integration run',
        'A: processed, destination ID 901. B: failed validation, no destination record. C: processed, destination ID 903.',
        'Run result: failed because B is unresolved.',
      ),
      record(
        'recovery',
        'Recovery policy for this fixture',
        'Correct B and retry only B after confirming no destination record exists.',
        'Do not blindly repeat successful creates A or C. Verify every intended record before marking the run successful.',
      ),
    ],
    [
      field(
        'retry',
        'Records to retry',
        choices('B only', 'A, B and C'),
        'B only',
        'A and C already have destination records. Repeating their creates risks duplicates; correct and retry only B, whose absence is confirmed.',
      ),
      field(
        'completion',
        'Completion condition',
        choices('All intended records reconciled', 'Retry command sent'),
        'All intended records reconciled',
        'A sent retry may still fail. Reconcile all intended destination records before calling the run successful.',
      ),
    ],
    'Recovery plan targets B only and requires reconciliation before success.',
    ['runs', 'api'],
  ],
];
export const COMPANY_LESSONS = freezeDesign(
  rows.map(([campaignId, ordinal, title, role, brief, records, fields, success, refs]) => {
    const missionId = `${campaignId}-${String(ordinal).padStart(2, '0')}`;
    return {
      format: 'revealline-learning-lesson.v1',
      id: `${missionId}-lesson`,
      revision: '3',
      fixtureRevision:
        campaignId === 'coupa-inside-village' ||
        (campaignId === 'coupa-source-to-pay' && ordinal === 6)
          ? '2'
          : '1',
      missionId,
      campaignId,
      title,
      role,
      brief,
      kind: campaignId === 'coupa-inside-village' ? 'reflection' : 'practice',
      notice:
        'Fictional, offline training. Illustrative records; no live Coupa actions or certification.',
      sourceReviewedAt: '2026-09-26',
      sources: refs.map((id) => ({ title: sourceTitles[id], url: sources[id] })),
      records,
      fields,
      success,
    };
  }),
);
export function companyLessonForMission(missionId) {
  return COMPANY_LESSONS.find((lesson) => lesson.missionId === missionId) ?? null;
}
