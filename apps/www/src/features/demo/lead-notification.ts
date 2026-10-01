import "server-only";

type LeadNotification = {
  id: string;
  name: string;
  clinicName: string;
  city: string;
};

const stripHeaderBreaks = (value: string) => value.replace(/[\r\n]/gu, "");
const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const notifyLead = async (lead: LeadNotification, fetchImpl = fetch) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const recipient = process.env.LEAD_NOTIFICATION_TO?.trim();
  const sender = process.env.LEAD_NOTIFICATION_FROM?.trim();
  const recordsUrl = process.env.LEAD_RECORDS_URL?.trim();

  if (!apiKey || !recipient || !sender || !recordsUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Lead notification is not configured");
    }
    return;
  }

  const recordUrl = new URL(lead.id, recordsUrl.endsWith("/") ? recordsUrl : `${recordsUrl}/`);
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `lead/${lead.id}`
    },
    body: JSON.stringify({
      from: stripHeaderBreaks(sender),
      to: [stripHeaderBreaks(recipient)],
      subject: "New Karon lead",
      html: [
        `<p>Name: ${escapeHtml(lead.name)}</p>`,
        `<p>Clinic: ${escapeHtml(lead.clinicName)}</p>`,
        `<p>City: ${escapeHtml(lead.city)}</p>`,
        `<p><a href="${escapeHtml(recordUrl.toString())}">Open lead record</a></p>`
      ].join("")
    })
  });

  if (!response.ok) throw new Error("Lead notification failed");
};

export { notifyLead };
export type { LeadNotification };
