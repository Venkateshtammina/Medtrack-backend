// 📁 frontend/src/components/DashboardAnalytics.js -> backend/utils/email.js (or your email utility file)
const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter;
let resendClient;

function getTransporter() {
  // Use Resend API if configured (works on Render without SMTP blocking)
  if (process.env.RESEND_API_KEY) {
    if (!resendClient) {
      const resend = require('resend');
      resendClient = new resend.Resend(process.env.RESEND_API_KEY);
    }
    return { type: 'resend', client: resendClient };
  }

  // Fallback to SMTP (for local development)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured when RESEND_API_KEY is not set");
  }

  if (!transporter) {
    if (process.env.EMAIL_HOST) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    }
  }

  return { type: 'smtp', client: transporter };
}

const DEFAULT_FROM_EMAIL = "venkatesht1243@gmail.com";
const RESEND_FROM_EMAIL = "MedTrack <onboarding@resend.dev>";

function getFromAddress() {
  const fromEmail =
    process.env.EMAIL_FROM ||
    (!process.env.EMAIL_HOST ? process.env.EMAIL_USER : DEFAULT_FROM_EMAIL);

  if (!fromEmail) {
    throw new Error(
      "EMAIL_FROM must be set to a verified sender address when using custom SMTP"
    );
  }

  return `"MedTrack Security" <${fromEmail}>`;
}

// Global styled email outer layout framework (Encapsulates data safely for cross-client rendering)
function getEmailWrapper(contentHtml) {
  return `
    <div style="background-color: #f6f9fc; padding: 40px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%; width: 100% !important;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); border: 1px solid #eef2f5;">
        <tr>
          <td style="background-color: #007aff; padding: 32px 40px; text-align: left;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">MedTrack</h1>
            <p style="color: rgba(255, 255, 255, 0.85); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">System Telemetry Notification</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px; background-color: #ffffff;">
            ${contentHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color: #fafbfd; padding: 24px 40px; text-align: center; border-top: 1px solid #f2f4f7;">
            <p style="margin: 0; font-size: 11px; color: #8e8e93; line-height: 1.6;">
              This is an automated operational system alert from your MedTrack deployment instance. Please do not reply directly to this mail transmission address.
            </p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #8e8e93; font-weight: 600;">
              &copy; ${new Date().getFullYear()} MedTrack Platform. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  
  if (transport.type === 'resend') {
    // Use Resend API
    await transport.client.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html: getEmailWrapper(html),
    });
    console.log(`✅ Email sent via Resend to ${to}`);
  } else {
    // Use SMTP
    await transport.client.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html: getEmailWrapper(html),
    });
    console.log(`✅ Email sent via SMTP to ${to}`);
  }
}

async function sendOtpEmail({ to, name, otp, purpose }) {
  const isReset = purpose === "reset";
  const subject = isReset ? "🔑 Action Required: Secure Password Reset Token" : "🛡️ Verify Your New MedTrack Account Setup";

  const actionGreetingText = isReset
    ? "A request was submitted to initiate a security credential password reset for your active account profile workspace."
    : "Welcome to the MedTrack core workspace environment! To activate your inventory operator credentials, please complete the secure identity verification check step.";

  const securityCautionDisclaimer = isReset
    ? "If you did not issue this password modification request ticket, please disregard this automated notification block securely. Your standard login details remain unaffected."
    : "If you did not initiate this system registration profile generation process, please reach out to your designated clinical systems control group immediately.";

  const innerBodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #1c1c1e; line-height: 1.5; font-weight: 600;">Hi ${name || "Operator"},</p>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #48484a; line-height: 1.6;">
      ${actionGreetingText}
    </p>
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0; text-align: center; background-color: #fafbfd; border-radius: 12px; border: 1px dashed #ced4da;">
      <tr>
        <td style="padding: 24px;">
          <span style="display: block; font-size: 11px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
            One-Time Verification Code
          </span>
          <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 800; color: #007aff; letter-spacing: 4px; display: inline-block;">
            ${otp}
          </span>
        </td>
      </tr>
    </table>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 149, 0, 0.05); border-left: 4px solid #ff9500; border-radius: 4px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px 16px;">
          <p style="margin: 0; font-size: 12px; color: #663c00; line-height: 1.5; font-weight: 500;">
            ⏳ <strong>Token Lifetime Limitation:</strong> This verification code matrix expires exactly 10 minutes from issuance tracking. Do not disclose this sequence parameter to anyone.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: #8e8e93; line-height: 1.5;">
      ${securityCautionDisclaimer}
    </p>
  `;

  await sendEmail({ to, subject, html: innerBodyHtml });
}

const sendExpiryNotification = async (to, medicineName, expiryDate) => {
  const subject = `⚠️ URGENT CRITICAL ALERT: Expiration Warning for ${medicineName}`;

  const innerBodyHtml = `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(255, 59, 48, 0.07); border-left: 4px solid #ff3b30; border-radius: 6px; margin-bottom: 28px;">
      <tr>
        <td style="padding: 16px 20px;">
          <h2 style="margin: 0; font-size: 15px; color: #ff3b30; font-weight: 700; letter-spacing: -0.2px;">
            ⚠️ Priority Batch Expiry Alert
          </h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #b3241e; line-height: 1.4;">
            A core inventory element validation lifecycle path has entered its critical baseline expiration window constraint boundaries.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #1c1c1e; line-height: 1.5;">
      Hello Operations Group,
    </p>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: #48484a; line-height: 1.6;">
      System monitors have flagged an upcoming batch expiration timeline match condition. Please review the operational SKU telemetry metrics below to adjust stock pipelines:
    </p>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; border: 1px solid #eceef2; margin-bottom: 28px;">
      <tr>
        <td style="padding: 18px 20px; border-bottom: 1px solid #eef2f5;">
          <span style="font-size: 11px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Medicine Catalog Name</span>
          <span style="font-size: 15px; font-weight: 700; color: #1c1c1e; display: block; margin-top: 4px;">${medicineName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 18px 20px;">
          <span style="font-size: 11px; font-weight: 700; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Identified Expiration Date Target</span>
          <span style="font-size: 15px; font-weight: 700; color: #ff3b30; display: block; margin-top: 4px;">${new Date(expiryDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
        </td>
      </tr>
    </table>

    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #1c1c1e; font-weight: 700;">Required Action Protocol:</h4>
    <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 13px; color: #48484a; line-height: 1.6;">
      <li style="margin-bottom: 6px;">Inspect the physical storage repository to confirm quantity verification parameters.</li>
      <li style="margin-bottom: 6px;">Isolate or safely purge any batches that have breached absolute baseline date safety margins.</li>
      <li style="margin-bottom: 0;">Update stock levels on your active dashboard interface layout to reconcile system state tracking.</li>
    </ul>
  `;

  try {
    const transport = getTransporter();
    
    if (transport.type === 'resend') {
      // Use Resend API
      await transport.client.emails.send({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html: getEmailWrapper(innerBodyHtml)
      });
      console.log(`✅ Automated Expiry Notification sent via Resend to ${to} for SKU item [${medicineName}]`);
    } else {
      // Use SMTP
      await transport.client.sendMail({
        from: getFromAddress(),
        to,
        subject,
        html: getEmailWrapper(innerBodyHtml)
      });
      console.log(`✅ Automated Expiry Notification sent via SMTP to ${to} for SKU item [${medicineName}]`);
    }
  } catch (err) {
    console.error("❌ Critical Expiry Notification execution failure:", err.message);
    throw err;
  }
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendExpiryNotification
};