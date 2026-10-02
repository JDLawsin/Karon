import type { ReactNode } from "react";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export type LegalNotice = {
  title: string;
  description: string;
  lastUpdated: string;
  sections: ReadonlyArray<LegalSection>;
};

const externalLink = "font-semibold text-primary underline underline-offset-4";

export const privacyNotice = (contactEmail: string): LegalNotice => ({
  title: "Website privacy notice",
  description: "How Karon handles information from this marketing website.",
  lastUpdated: "2026-10-01",
  sections: [
    {
      id: "scope",
      title: "Scope",
      content: <>
        <p>This notice covers marketing leads and marketing-site measurement only. It does not cover patient information entered by a clinic. A clinic controls its patient information, and that separate clinic and patient notice is pending counsel review.</p>
        <p>Karon acts as the controller for the marketing lead information described here. This wording is a draft pending counsel review.</p>
      </>
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      content: <>
        <p>When you send an application or demo request, we collect your name, clinic name, country, province when supplied, city or municipality, email, clinic size, role, optional mobile number, optional preferred demo time, and optional message.</p>
        <p>We also store your privacy-notice acknowledgment and version. If you separately choose launch updates, we store that choice, its wording version, purpose, source page, and time.</p>
        <p>For attribution, a lead row may include the five allowlisted UTM values, landing path without its query string, and referrer domain. The first-party <code>sessionStorage</code> key <code>karon_utm</code> carries those UTM values between pages and clears when the browser tab closes.</p>
      </>
    },
    {
      id: "why-we-use-it",
      title: "Why we use it",
      content: <>
        <p>We use request details to review and answer your application or demo request, operate the request form, prevent abuse, and understand which marketing channels lead to accepted requests.</p>
        <p><strong>Launch updates are a separate purpose.</strong> If you tick the optional box, Karon may email occasional product-launch updates. The box starts unticked and is not bundled with the privacy acknowledgment. Frequency and unsubscribe wording remain pending KR-039 and counsel review. You can withdraw that choice through the unsubscribe method in those messages or by contacting us.</p>
      </>
    },
    {
      id: "analytics",
      title: "Analytics and site performance",
      content: <>
        <p>No analytics vendor or advertising pixel is currently enabled. Vercel Web Analytics is the proposed cookieless analytics provider, pending Joshua&apos;s decision and counsel review. Its published policy says it creates a visitor hash from a request, keeps that hash for 24 hours, and stores the URL, referrer, filtered query parameters, geolocation, and device data for each data point.</p>
        <p>Vercel Speed Insights is also proposed, not active. Its published policy says each data point may include route, URL, network speed, browser, device type and operating system, country, the Web Vital and its attribution, SDK version, and server-received time, and says the data is not tied to a visitor or IP address.</p>
        <p>Sources checked 2026-09-26: <a className={externalLink} href="https://vercel.com/docs/analytics/privacy-policy">Vercel Web Analytics privacy policy</a> and <a className={externalLink} href="https://vercel.com/docs/speed-insights/privacy-policy">Vercel Speed Insights privacy policy</a>. Whether these tools can run without a consent banner in the Philippines remains unconfirmed pending written counsel advice. No tool will be enabled before that decision.</p>
      </>
    },
    {
      id: "processors",
      title: "Service providers and processing locations",
      content: <>
        <p>Planned service providers are Vercel for website hosting and proposed measurement, Supabase for the lead database, Cloudflare Turnstile for abuse prevention, and Resend for request notifications and any separately requested launch updates.</p>
        <p>Whether information processed by Vercel or Resend is transferred outside the Philippines, and whether this notice should name a data protection officer, remain pending counsel review.</p>
      </>
    },
    {
      id: "retention",
      title: "Retention and deletion",
      content: <>
        <p>The lead retention period is pending Joshua and counsel. Twelve months is only a team proposal and is not active configuration. Once approved, an automated daily job will remove leads older than the configured period.</p>
        <p>You may request earlier deletion. Karon will process a verified request as soon as reasonably possible; the promised maximum response period remains pending counsel. If launch-update delivery has been enabled, its related mailing contact must also be removed or suppressed.</p>
      </>
    },
    {
      id: "rights-and-contact",
      title: "Your rights and how to contact us",
      content: <>
        <p>Under the Philippine Data Privacy Act of 2012, you may have rights to be informed, object, access, correct, erase or block, obtain a copy of certain information, and raise a complaint, subject to the law&apos;s conditions.</p>
        <p>To ask a privacy question, withdraw launch-update consent, or request access, correction, or deletion, email <a className={externalLink} href={`mailto:${contactEmail}`}>{contactEmail}</a>. We may need to verify that the request concerns your information before acting.</p>
        <p>Source checked 2026-09-26: <a className={externalLink} href="https://privacy.gov.ph/data-privacy-act/">National Privacy Commission, Data Privacy Act of 2012</a>.</p>
      </>
    }
  ]
});

export const termsNotice: LegalNotice = {
  title: "Website terms",
  description: "Terms for visiting the Karon marketing website and sending a request.",
  lastUpdated: "2026-10-01",
  sections: [
    {
      id: "draft-status",
      title: "Draft status",
      content: <p>These website terms are pending counsel review. They are not the clinic software subscription terms and do not open access to the Karon product.</p>
    },
    {
      id: "permitted-use",
      title: "Permitted use",
      content: <p>You may use this website to learn about Karon and to send a genuine application or demo request. Do not misuse the form, attempt unauthorized access, interfere with the site, or send patient information through the marketing form.</p>
    },
    {
      id: "information-on-this-site",
      title: "Information on this site",
      content: <p>Product descriptions reflect the status identified on the page and may change. Draft pricing, availability, and future features are not commitments. Nothing on this site is dental, medical, or legal advice.</p>
    },
    {
      id: "third-party-services",
      title: "Third-party services",
      content: <p>The website may rely on or link to third-party services. Their own terms apply to those services. The final allocation of responsibility for third-party availability remains pending counsel review.</p>
    },
    {
      id: "contact",
      title: "Questions",
      content: <p>Questions about these draft terms may be sent through the contact channel in the website privacy notice.</p>
    }
  ]
};

export const cookieNotice: LegalNotice = {
  title: "Cookie and browser storage notice",
  description: "Cookies and browser storage used by the Karon marketing website.",
  lastUpdated: "2026-10-01",
  sections: [
    {
      id: "current-use",
      title: "Current use",
      content: <p>Karon does not currently load an analytics vendor, advertising pixel, or non-essential cookie on this marketing site. A consent banner is not shown because there is currently no non-essential tracking to choose.</p>
    },
    {
      id: "first-party-storage",
      title: "First-party session storage",
      content: <p>If a page URL contains an allowlisted UTM parameter, Karon stores it in <code>sessionStorage</code> under <code>karon_utm</code>. It contains only <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code>, and <code>utm_content</code>, and clears when the tab closes. This is browser storage, not a cookie.</p>
    },
    {
      id: "strictly-necessary",
      title: "Strictly necessary services",
      content: <p>When the request form is enabled, Cloudflare Turnstile may use strictly necessary browser data or a <code>cf_clearance</code> cookie to detect abuse. No other strictly necessary marketing-site cookie is intentionally set by Karon at this time. Cloudflare&apos;s handling is described in its own privacy policy.</p>
    },
    {
      id: "future-analytics",
      title: "Future analytics and consent",
      content: <p>Vercel Web Analytics and Vercel Speed Insights are proposed but not active. Whether they require a banner in the Philippines remains pending written counsel advice. If Karon later enables GA4, advertising pixels, or another non-essential technology, it will stay off by default until a visitor chooses to accept it, and Reject will be presented with equal prominence.</p>
    },
    {
      id: "changes",
      title: "Changes to this notice",
      content: <p>This notice will be updated before any new cookie or browser-storage purpose is enabled. The last-updated date identifies the wording in effect.</p>
    }
  ]
};

export const processingAgreementNotice: LegalNotice = {
  title: "Processing agreement summary",
  description: "A draft overview of the intended data-processing terms between a clinic and Karon.",
  lastUpdated: "2026-10-01",
  sections: [
    {
      id: "not-an-agreement",
      title: "This is not the agreement",
      content: <p>This summary is pending counsel review and is not a signed data processing agreement. Final subscription and processing terms must be accepted separately before production use.</p>
    },
    {
      id: "roles",
      title: "Intended roles",
      content: <p>For patient information entered into the clinic product, the clinic is intended to act as the personal information controller and Karon as its personal information processor. For marketing leads collected on this website, Karon acts separately as controller under the website privacy notice.</p>
    },
    {
      id: "instructions-and-purpose",
      title: "Instructions and purpose",
      content: <p>Karon is intended to process clinic information only to provide, secure, support, and maintain the service under the clinic&apos;s documented instructions and the final agreement.</p>
    },
    {
      id: "providers-and-transfers",
      title: "Providers and transfers",
      content: <p>The final agreement must identify relevant subprocessors, processing locations, cross-border arrangements, assistance duties, incident handling, return or deletion, and audit terms. Those details remain pending counsel and the production vendor review.</p>
    },
    {
      id: "clinic-responsibilities",
      title: "Clinic responsibilities",
      content: <p>The clinic remains responsible for the lawful collection and use of its patient information, its notices and choices, authorized staff access, and its instructions to Karon, subject to the final agreement.</p>
    },
    {
      id: "request-the-final-document",
      title: "Request the final document",
      content: <p>The counsel-approved agreement will replace this summary when available. Until then, this page must not be treated as a contractual commitment or privacy approval.</p>
    }
  ]
};
