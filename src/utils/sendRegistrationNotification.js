import sgMail from "@sendgrid/mail";


sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// ✅ Send Escort Registration Notification to Admin
export const sendRegistrationNotification = async ({
  email,
  modelName
}) => {

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (!isValidEmail(email)) {
    console.log(`Invalid email format: ${email} - skipping`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">New Model Registered</h2>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;">
              Hello Admin, a new user <strong>${modelName}</strong> has just registered on <strong>Greene Velvet</strong>. Please review the profile for approval.
            </p>

            <!-- Action Button -->
            <div style="margin:30px 0;">
              <a href="${process.env.ADMIN_DASHBOARD_URL}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 32px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Review New Profile
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              This is an automated notification from your system. <br>
              <span style="font-size:12px;">Login to your dashboard to manage all pending registrations.</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
               © ${new Date().getFullYear()} <b>Greene Velvet</b> All rights reserved. <br>
              Australia's Exclusive Premium Escort Directory Platform.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

  try {
    const msg = {
      to: email, // Admin's email
      from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`,
      subject: `New Model Registration: ${modelName} - GreeneVelvet`,
      html: html,
    };

    await sgMail.send(msg);
    console.log(`Registration notification sent to ${email}`);

  } catch (error) {
    console.error(
      `Notification email not sent to ${email}:`,
      error.response?.body || error.message
    );
  }
};

// ✅ Send Client Registration Notification to Admin
export const sendClientRegistrationNotification = async ({
  email,
  clientName
}) => {
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (!isValidEmail(email)) {
    console.log(`Invalid email format: ${email} - skipping`);
    return;
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">New Client Registered</h2>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;">
              Hello Admin, a new client <strong>${clientName}</strong> has just created an account on <strong>Greene Velvet</strong>.
            </p>

            <!-- Action Button -->
            <div style="margin:30px 0;">
              <a href="${process.env.ADMIN_DASHBOARD_URL}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 32px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                View Client Details
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              This is an automated notification from your system. <br>
              <span style="font-size:12px;">Login to your dashboard to manage client accounts.</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
               © ${new Date().getFullYear()} <b>Greene Velvet</b> All rights reserved. <br>
              Australia's Exclusive Premium Escort Directory Platform.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

  try {
    const msg = {
      to: email, // Admin's email
      from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`,
      subject: `New Client Registration: ${clientName} - GreeneVelvet`,
      html: html,
    };

    await sgMail.send(msg);
    console.log(`Client registration notification sent to ${email}`);

  } catch (error) {
    console.error(
      `Notification email not sent to ${email}:`,
      error.response?.body || error.message
    );
  }
};




// ✅ Send Registration Reminder Email to Escort
export const sendRegistrationReminderEmail = async ({
  email,
  modelName,
  redirectUrl,
  customMessage
}) => {

  console.log("send mail query check ", email, modelName, redirectUrl, customMessage);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  if (!isValidEmail(email)) {
    console.log(`Invalid email format: ${email} - skipping`);
    return;
  }

  const defaultMessage = "We noticed that your registration process is incomplete. Please click the button below to resume and complete your profile setup on Greene Velvet.";
  const messageBody = customMessage ? customMessage.replace(/\n/g, '<br>') : defaultMessage;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1px;">
              GREENE VELVET
            </h1>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 40px 40px;text-align:center;">
            <h2 style="margin:0 0 12px 0;color:#1a1a1a;font-size:20px;font-weight:600;">Complete Your Registration</h2>
            <p style="margin:0 0 15px 0;color:#333333;font-size:15px;line-height:22px;text-align:left;">
              Hello <strong>${modelName || "Advertiser"}</strong>,
            </p>
            <p style="margin:0 0 25px 0;color:#555555;font-size:15px;line-height:22px;text-align:left;">
              ${messageBody}
            </p>

            <!-- Action Button -->
            <div style="margin:30px 0;">
              <a href="${redirectUrl}" 
                 style="display:inline-block; background-color:#00A68F; color:#ffffff; padding:16px 32px; font-size:16px; font-weight:700; text-decoration:none; border-radius:8px; box-shadow: 0 4px 12px rgba(0, 166, 143, 0.2);">
                Continue Next Step
              </a>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px;">
              If the button above does not work, copy and paste this link into your browser:<br>
              <a href="${redirectUrl}" style="color:#00A68F; word-break:break-all; font-size:12px;">${redirectUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:25px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b> Solutions. <br>
              Building digital excellence, one step at a time.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

  try {
    const msg = {
      to: email, // Escort's email
      from: `"GREENE VELVET" <${process.env.SENDER_EMAIL}>`,
      subject: `Complete Your Registration - Greene Velvet`,
      html: html,
    };

    await sgMail.send(msg);
    console.log(`Registration reminder email sent to ${email}`);
    return {
      success: true
    };

  } catch (error) {
    console.error(
      `Reminder email not sent to ${email}:`,
      error.response?.body || error.message
    );
    throw error;
  }
};



// send Priority email support
export const sendPrioritySupportReplyEmail = async ({
  email,
  fullname,
  subject,
  reply,
  status
}) => {

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail(email)) {
    console.log(`Invalid email format: ${email} - skipping`);
    return;
  }

  // Status color badge condition
  const isResolved = status?.toLowerCase() === 'resolved';
  const statusBg = isResolved ? '#DEF7EC' : '#FEF3C7';
  const statusColor = isResolved ? '#03543F' : '#92400E';

  const formattedReply = reply ? reply.replace(/\n/g, '<br>') : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f9f9f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding:40px 0;">
  <tr>
    <td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.05);border:1px solid #eeeeee;overflow:hidden;">
        
        <!-- Header Accent -->
        <tr>
          <td height="5" style="background-color:#00A68F;"></td>
        </tr>

        <!-- Brand Section -->
        <tr>
          <td style="padding:35px 40px 10px 40px;text-align:center;">
            <h1 style="margin:0;color:#00A68F;font-size:24px;font-weight:800;letter-spacing:1.5px;">
              GREENE VELVET
            </h1>
            <p style="margin:4px 0 0 0;color:#666666;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
              Australia’s Premium Escort Directory
            </p>
          </td>
        </tr>

        <!-- Main Content -->
        <tr>
          <td style="padding:20px 40px 35px 40px;text-align:left;">
            <h2 style="margin:0 0 16px 0;color:#1a1a1a;font-size:20px;font-weight:600;text-align:center;">
              Priority Support Update
            </h2>

            <p style="margin:0 0 12px 0;color:#333333;font-size:15px;line-height:22px;">
              Hello <strong>${fullname || 'User'}</strong>,
            </p>

            <p style="margin:0 0 20px 0;color:#555555;font-size:14px;line-height:22px;">
              Our support team has responded to your priority inquiry regarding <strong>"${subject}"</strong>.
            </p>

            <!-- Ticket Status Box -->
            <div style="background-color:#F8FAFC; border:1px solid #E2E8F0; padding:12px 16px; border-radius:8px; margin-bottom:20px;">
              <span style="font-size:12px; color:#64748B; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Ticket Status:</span>
              <span style="display:inline-block; margin-left:8px; padding:3px 10px; background-color:${statusBg}; color:${statusColor}; font-size:12px; font-weight:700; border-radius:12px; text-transform:capitalize;">
                ${status || 'Updated'}
              </span>
            </div>

            <!-- Admin Reply Message Box -->
            <div style="background-color:#FFFBEB; border-left:4px solid #00A68F; padding:16px; border-radius:4px; margin-bottom:25px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#00A68F; font-weight:700; text-transform:uppercase;">
                Support Response:
              </p>
              <div style="margin:0; font-size:14px; color:#334155; line-height:22px;">
                ${formattedReply}
              </div>
            </div>

            <p style="margin:20px 0 0 0; color:#888888; font-size:13px; line-height:20px; text-align:center;">
              If you have further questions, feel free to reply directly or visit your support dashboard.<br>
              <span style="font-size:12px;">Thank you for being a valued member of Greene Velvet.</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background-color:#fcfcfc;border-top:1px solid #eeeeee;text-align:center;">
            <p style="margin:0;font-size:12px;color:#888888;line-height:18px;">
              © ${new Date().getFullYear()} <b>Greene Velvet</b>. All rights reserved. <br>
              Australia's Exclusive Premium Escort Directory Platform.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>
`;

  try {
    const msg = {
      to: email,
      from: `"GREENE VELVET Support" <${process.env.SENDER_EMAIL}>`,
      subject: `Re: [${status || 'Update'}] ${subject} - Greene Velvet Support`,
      html: html,
    };

    await sgMail.send(msg);
    console.log(`Priority support reply email sent to ${email}`);
    return {
      success: true
    };

  } catch (error) {
    console.error(
      `Support email not sent to ${email}:`,
      error.response?.body || error.message
    );
    throw error;
  }
};