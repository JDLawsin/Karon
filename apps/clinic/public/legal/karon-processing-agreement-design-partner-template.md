# Karon design-partner processing agreement template

> FOUNDER DRAFT. COUNSEL REVIEW REQUIRED. NOT FOR OPEN PRODUCTION.
>
> This template is not legal advice. Complete every bracketed field for the actual
> clinic deployment. Karon's open self-serve production release remains blocked until
> counsel approves the privacy notice, this agreement, retention terms, and the PIA.

Version: 2026-09-29-design-partner-v1

## 1. Parties and roles

This agreement is between **[Clinic legal name and address]** (the "Clinic") and
**[Karon operating entity legal name and address]** ("Karon").

For patient records and booking requests, the Clinic determines the purpose and means
of processing as Personal Information Controller (PIC). Karon processes that data for
the Clinic as Personal Information Processor (PIP), subject to the Clinic's documented
instructions and applicable law.

Clinic privacy contact: **[name, role, email, mobile]**

Karon privacy contact: **[name, role, email, mobile]**

Effective date: **[date]**

## 2. Subject, purpose, and duration

Karon provides an offline-first dental-clinic service for appointment intake, patient
identity, visit status, clinical chart events, quotes, payment records, next visits,
imports, and clinic exports. Processing is limited to providing, securing, supporting,
and ending that service on the Clinic's instructions.

This agreement lasts while Karon provides the service and through the agreed return or
deletion period after termination, unless applicable law requires a longer period.

## 3. Data subjects and personal data

Data subjects may include patients, prospective patients who submit booking requests,
Clinic owners, dentists, assistants, and invited staff.

Data may include:

- patient name, mobile number, optional email, appointment, and visit status;
- public booking service, requested slot, optional note, acknowledgment version and time;
- odontogram events, clinical notes, treatment and procedure details;
- quotes, amounts, payment method, payment status, and optional reference;
- next-visit and reminder information;
- import source rows during the short staging period and import outcome metadata;
- export audit metadata; and
- staff identity, role, session, security, and audit metadata.

Health and treatment information may be Sensitive Personal Information. X-rays and
clinical photos are outside the current V1 scope.

## 4. Clinic instructions and responsibilities

The Clinic will:

1. use Karon only for lawful clinic operations and provide documented instructions;
2. give patients an approved privacy notice and identify the Clinic's privacy contact;
3. limit staff access, remove former staff, and protect account and device credentials;
4. decide and document lawful retention periods for patient and booking records;
5. handle patient requests and tell Karon when processor assistance is required;
6. avoid placing unnecessary health details in reminders, logs, or public booking notes;
7. notify Karon promptly of suspected incidents; and
8. confirm any legally required permissions, registrations, or consents.

## 5. Karon processor commitments

Karon will:

1. process personal data only on documented Clinic instructions, except where law
   requires otherwise;
2. require confidentiality from people authorized to process the data;
3. maintain appropriate organizational, physical, and technical safeguards;
4. keep clinics separated through tenant controls and least-privilege access;
5. help the Clinic respond to data-subject requests and security obligations to the
   extent reasonably possible for the service;
6. notify the Clinic without undue delay after confirming a personal-data breach that
   affects the Clinic;
7. not sell patient lists or use Clinic records to train public AI models;
8. not add a subprocessor that handles Clinic personal data outside the agreed process;
9. make relevant compliance information available to the Clinic; and
10. return or delete personal data at the end of service according to Section 8.

## 6. Security and access

The parties will complete this deployment-specific schedule before signing:

- Hosting and database location: **[provider, country/region]**
- Authorized Clinic roles: **[Owner, dentist, assistant permissions]**
- Local device protection: **[device passcode, session lock, device revocation]**
- Transport and storage protection: **[controls]**
- Backup and recovery: **[controls and tested frequency]**
- Support access and break-glass process: **[process]**
- Incident contacts and after-hours channel: **[contacts]**

Neither party will place raw patient or clinical details in operational logs, support
tickets, or unapproved messaging channels.

## 7. Subprocessors

Approved subprocessors at signing:

| Provider | Service | Processing location | Data involved | Approval/date |
| --- | --- | --- | --- | --- |
| [Supabase project host] | Database, auth, storage | [region] | [scope] | [date] |
| Cloudflare | Public-booking abuse protection | [region] | limited browser/network data | [date] |
| [Other approved provider] | [purpose] | [region] | [scope] | [date] |

Karon will apply data-protection obligations to subprocessors appropriate to their
processing. The parties will document how the Clinic is told about proposed changes and
how objections are handled: **[notice and objection process]**.

## 8. Retention, return, and deletion

- Import source objects are deleted after processing. A cleanup path retries abandoned
  objects after 24 hours. Parsed staging rows are purged with the job lifecycle.
- Booking requests currently remain with the Clinic record while the Clinic account is
  active. The parties must insert the counsel-approved period and deletion workflow
  here before open production: **[period and workflow]**.
- Clinical and financial records follow the Clinic's documented legal and care-retention
  schedule: **[schedule]**.
- On termination, Karon will provide an agreed export window of **[period]**, then return
  or delete Clinic personal data within **[period]**, except data that law requires a
  party to retain. Backup expiry is **[period]**.
- Karon may retain minimal subscriber billing, security, and audit records for
  **[period and legal basis]** without retaining patient content beyond the approved
  schedule.

Deletion must include live systems and expiry from backups under the documented backup
cycle. Karon will provide reasonable confirmation on request.

## 9. Data-subject requests

The Clinic receives and decides requests to be informed, access, rectify, object,
erase or block, and obtain portable data where applicable. Karon will provide available
search, correction, export, and deletion assistance after receiving a verified Clinic
instruction. Target response time between the parties: **[period]**.

## 10. Incidents and breach cooperation

Each party will preserve relevant evidence, limit further exposure, and promptly notify
the other through the contacts in Section 6. The Clinic decides notices to patients and
regulators with counsel, while Karon provides known facts about affected systems, data,
timing, containment, and remediation. Notification target from Karon to the Clinic:
**[period]** after confirmation.

## 11. Audit and assurance

Karon will make available reasonable information needed to demonstrate the commitments
in this agreement. Audit requests must protect other clinics, security secrets, and
privileged information. The parties will first use available reports and evidence, then
agree scope, timing, and cost for any additional audit.

## 12. International transfers

Personal-data locations and any international transfer mechanism must be recorded in
Sections 6 and 7 before signing. Karon will not move Clinic data to a new country or
international organization except on documented instruction or as authorized by law,
with applicable safeguards.

## 13. Order of terms and changes

This agreement supplements **[subscription/service agreement]**. If privacy terms
conflict, **[state order of precedence]**. Changes must be written and accepted by
authorized representatives of both parties.

## 14. Signatures

For the Clinic

Name: **[name]**  
Role: **[role]**  
Signature: **[signature]**  
Date: **[date]**

For Karon

Name: **[name]**  
Role: **[role]**  
Signature: **[signature]**  
Date: **[date]**

Counsel review record

Reviewer: **[name and organization]**  
Scope/version reviewed: **[version]**  
Date: **[date]**  
Outcome or required changes: **[notes]**
