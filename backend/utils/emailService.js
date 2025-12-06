
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const getFromAddress = () => {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  return 'MIGX <onboarding@resend.dev>';
};

async function sendOtpEmail(email, otp, username) {
  try {
    console.log('Sending OTP email to:', email);
    console.log('Using RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
    
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Your MIGX Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #8FE9FF 0%, #00936A 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">MIGX Community</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #00936A;">Account Verification</h2>
            <p>Hi ${username},</p>
            <p>Your verification code is:</p>
            <h1 style="letter-spacing: 8px; color: #00936A; text-align: center; font-size: 48px; margin: 30px 0;">${otp}</h1>
            <p style="color: #666;">This code will expire in <strong>5 minutes</strong>.</p>
            <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </div>
      `
    });

    console.log('OTP Email sent successfully:', result);
    return { success: true, data: result };
  } catch (err) {
    console.error('OTP Email Error:', err);
    console.error('OTP Email Error Details:', JSON.stringify(err, null, 2));
    return { success: false, error: err.message || 'Failed to send OTP' };
  }
}

async function sendActivationEmail(email, username, token) {
  const baseUrl = process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : 'http://localhost:5000';
  const activationUrl = `${baseUrl}/api/auth/activate/${token}`;
  
  try {
    console.log('Sending activation email to:', email);
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Activate Your MIGX Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #8FE9FF 0%, #00936A 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to MIGX!</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #00936A;">Hi ${username}!</h2>
            <p>Thank you for joining the MIGX Community.</p>
            <p>Please click the button below to activate your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${activationUrl}" style="background-color: #00936A; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Activate Account</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: <br/>${activationUrl}</p>
            <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              This link will expire in <strong>24 hours</strong>.
            </p>
          </div>
        </div>
      `
    });

    console.log('Activation email sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending activation email:', error);
    console.error('Activation Email Error Details:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}

async function sendPasswordChangeOtp(email, username, otp) {
  try {
    console.log('Sending password change OTP to:', email);
    const result = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'MIGX Email Change Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #8FE9FF 0%, #00936A 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">Email Change Request</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #00936A;">Hi ${username},</h2>
            <p>You requested to change your email address.</p>
            <p>Your verification code is:</p>
            <h1 style="letter-spacing: 8px; color: #00936A; text-align: center; font-size: 48px; margin: 30px 0;">${otp}</h1>
            <p style="color: #666;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you didn't request this change, please secure your account immediately.
            </p>
          </div>
        </div>
      `
    });

    console.log('Password change OTP sent successfully:', result);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending email change OTP:', error);
    console.error('Password Change OTP Error Details:', JSON.stringify(error, null, 2));
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
  sendActivationEmail,
  sendPasswordChangeOtp
};
