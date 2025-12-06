
const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { getUserLevel } = require('../utils/xpLeveling');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendOtpEmail, sendActivationEmail, sendPasswordChangeOtp } = require('../utils/emailService');

// Username validation regex (MIG33 rules)
const usernameRegex = /^[a-z][a-z0-9._]{5,31}$/;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedEmailDomains = ['gmail.com', 'yahoo.com', 'zoho.com'];

// Generate activation token
function generateActivationToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/login', async (req, res, next) => {
  try {
    console.log('LOGIN REQUEST RECEIVED:', { username: req.body.username });
    
    const { username, password, rememberMe, invisible } = req.body;
    
    if (!username) {
      console.log('LOGIN FAILED: Username missing');
      return res.status(400).json({ success: false, error: 'Username is required' });
    }
    
    let user = await userService.getUserByUsername(username);
    
    if (!user) {
      console.log('LOGIN FAILED: User not found');
      return res.status(400).json({ success: false, error: 'Invalid username or password' });
    }

    // Check if account is activated
    if (!user.is_active) {
      console.log('LOGIN FAILED: Account not activated');
      return res.status(403).json({ success: false, error: 'Account not activated. Please check your email.' });
    }

    // Verify password if provided
    if (password && user.password_hash) {
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        console.log('LOGIN FAILED: Invalid password');
        return res.status(400).json({ success: false, error: 'Invalid username or password' });
      }
    }

    // Update invisible status if requested
    if (invisible !== undefined) {
      await userService.updateUserInvisible(user.id, invisible);
      user.is_invisible = invisible;
    }
    
    const levelData = await getUserLevel(user.id);
    
    console.log('LOGIN SUCCESS:', username);
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        credits: user.credits,
        role: user.role,
        status: invisible ? 'offline' : user.status,
        avatar: user.avatar,
        level: levelData.level,
        xp: levelData.xp,
        country: user.country,
        gender: user.gender,
        isInvisible: user.is_invisible,
        createdAt: user.created_at
      },
      rememberMe: rememberMe || false
    });
    
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    console.error('ERROR STACK:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      message: error.message
    });
  }
});

router.post('/register', async (req, res, next) => {
  try {
    console.log('REGISTER REQUEST RECEIVED:', { 
      body: { ...req.body, password: '[HIDDEN]' } 
    });
    
    const { username, password, email, country, gender } = req.body;
    
    // Validate username
    if (!username || !usernameRegex.test(username)) {
      console.log('REGISTER FAILED: Invalid username');
      return res.status(400).json({ 
        success: false,
        error: 'Username must be 6-32 characters, start with a letter, and contain only lowercase letters, numbers, dots, and underscores' 
      });
    }
    
    // Validate email format
    if (!email || !emailRegex.test(email)) {
      console.log('REGISTER FAILED: Invalid email format');
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Validate email domain
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!allowedEmailDomains.includes(emailDomain)) {
      console.log('REGISTER FAILED: Invalid email domain:', emailDomain);
      return res.status(400).json({ 
        success: false,
        error: `Email must be from Gmail, Yahoo, or Zoho. You used: ${emailDomain}` 
      });
    }
    
    // Validate password
    if (!password || password.length < 6) {
      console.log('REGISTER FAILED: Password too short');
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    // Validate country
    if (!country) {
      console.log('REGISTER FAILED: Country missing');
      return res.status(400).json({ success: false, error: 'Country is required' });
    }

    // Validate gender
    if (!gender || !['male', 'female'].includes(gender)) {
      console.log('REGISTER FAILED: Invalid gender');
      return res.status(400).json({ success: false, error: 'Gender must be male or female' });
    }
    
    // Check if username exists
    const existingUser = await userService.getUserByUsername(username);
    if (existingUser) {
      console.log('REGISTER FAILED: Username exists');
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    // Check if email exists
    const existingEmail = await userService.getUserByEmail(email);
    if (existingEmail) {
      console.log('REGISTER FAILED: Email exists');
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate activation token
    const activationToken = generateActivationToken();
    
    // Create user
    const user = await userService.createUserWithRegistration({
      username,
      passwordHash,
      email,
      country,
      gender,
      activationToken
    });
    
    if (!user || user.error) {
      console.log('REGISTER FAILED: User creation failed');
      return res.status(400).json({ success: false, error: user?.error || 'Registration failed' });
    }

    // Generate OTP for registration
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    const otpStored = await userService.storeRegistrationOtp(user.id, email, otp);
    if (!otpStored) {
      console.warn('Failed to store OTP in database');
    } else {
      console.log('OTP stored in database for user:', user.id);
    }
    
    // Send OTP email
    try {
      const emailResult = await sendOtpEmail(email, otp, username);
      if (!emailResult.success) {
        console.warn('Failed to send OTP email, but user created');
      } else {
        console.log('OTP email sent successfully to:', email);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }
    
    // Send activation email as well (backup method)
    try {
      const activationResult = await sendActivationEmail(email, username, activationToken);
      if (!activationResult.success) {
        console.warn('Failed to send activation email');
      }
    } catch (activationError) {
      console.error('Activation email error:', activationError);
    }
    
    console.log('REGISTER SUCCESS:', username);
    res.status(200).json({
      success: true,
      message: 'Registration successful! Please check your email for verification code and activation link.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    console.error('ERROR STACK:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: 'Registration failed',
      message: error.message
    });
  }
});

router.get('/activate/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await userService.activateUser(token);
    
    if (!result.success) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ Activation Failed</h2>
            <p>${result.error}</p>
          </body>
        </html>
      `);
    }
    
    res.send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>✅ Account Activated!</h2>
          <p>Your account has been successfully activated.</p>
          <p>You can now log in to the app.</p>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).send('Activation failed');
  }
});

router.get('/check/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await userService.getUserByUsername(username);
    
    res.json({
      exists: !!user
    });
    
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Check failed' });
  }
});

// Get countries
router.get('/countries', (req, res) => {
  try {
    const countries = require('../data/countries.json');
    res.json(countries);
  } catch (error) {
    console.error('Error loading countries:', error);
    res.status(500).json({ error: 'Failed to load countries' });
  }
});

// Get genders
router.get('/genders', (req, res) => {
  try {
    const genders = require('../data/genders.json');
    res.json(genders);
  } catch (error) {
    console.error('Error loading genders:', error);
    res.status(500).json({ error: 'Failed to load genders' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Old password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    const result = await userService.updatePassword(userId, newPasswordHash);
    
    if (result) {
      res.json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to change password' });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Send email OTP
router.post('/send-email-otp', async (req, res) => {
  try {
    const { userId, oldEmail, newEmail } = req.body;
    
    if (!userId || !oldEmail || !newEmail) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email !== oldEmail) {
      return res.status(400).json({ error: 'Old email does not match' });
    }

    // Check if new email already exists
    const existingEmail = await userService.getUserByEmail(newEmail);
    if (existingEmail && existingEmail.id !== userId) {
      return res.status(400).json({ error: 'New email already in use' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database temporarily
    await userService.storeEmailOtp(userId, otp, newEmail);

    // Send OTP email using Resend
    const emailResult = await sendPasswordChangeOtp(oldEmail, user.username, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({ error: 'Failed to send OTP email' });
    }
    
    res.json({ success: true, message: 'OTP sent to your old email' });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP for registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    console.log('VERIFY OTP REQUEST:', { userId, otp: otp ? 'provided' : 'missing' });
    
    if (!userId || !otp) {
      return res.status(400).json({ success: false, error: 'User ID and OTP are required' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_active) {
      return res.status(400).json({ success: false, error: 'Account already activated' });
    }

    const isValidOtp = await userService.verifyRegistrationOtp(userId, otp);
    if (!isValidOtp) {
      console.log('VERIFY OTP FAILED: Invalid or expired OTP');
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    const activationResult = await userService.activateUserById(userId);
    if (!activationResult.success) {
      console.log('VERIFY OTP FAILED: Activation failed');
      return res.status(500).json({ success: false, error: activationResult.error || 'Activation failed' });
    }

    console.log('VERIFY OTP SUCCESS: Account activated for user:', userId);
    
    const levelData = await getUserLevel(userId);
    
    res.status(200).json({
      success: true,
      message: 'Account verified and activated successfully!',
      user: {
        id: activationResult.user.id,
        username: activationResult.user.username,
        email: activationResult.user.email,
        credits: user.credits || 0,
        role: user.role || 'user',
        status: 'online',
        avatar: user.avatar,
        level: levelData.level,
        xp: levelData.xp,
        country: user.country,
        gender: user.gender,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Resend OTP for registration
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.is_active) {
      return res.status(400).json({ success: false, error: 'Account already activated' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const otpStored = await userService.storeRegistrationOtp(user.id, user.email, otp);
    if (!otpStored) {
      return res.status(500).json({ success: false, error: 'Failed to generate new OTP' });
    }
    
    const emailResult = await sendOtpEmail(user.email, otp, user.username);
    if (!emailResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to send OTP email' });
    }

    console.log('RESEND OTP SUCCESS: New OTP sent to:', user.email);
    res.status(200).json({ success: true, message: 'New OTP sent to your email' });
    
  } catch (error) {
    console.error('RESEND OTP ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to resend OTP' });
  }
});

// Change email
router.post('/change-email', async (req, res) => {
  try {
    const { userId, oldEmail, newEmail, otp } = req.body;
    
    if (!userId || !oldEmail || !newEmail || !otp) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email !== oldEmail) {
      return res.status(400).json({ error: 'Old email does not match' });
    }

    // Verify OTP
    const isValidOtp = await userService.verifyEmailOtp(userId, otp, newEmail);
    if (!isValidOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Update email
    const result = await userService.updateEmail(userId, newEmail);
    
    if (result) {
      res.json({ success: true, message: 'Email changed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to change email' });
    }
  } catch (error) {
    console.error('Change email error:', error);
    res.status(500).json({ error: 'Failed to change email' });
  }
});

module.exports = router;
