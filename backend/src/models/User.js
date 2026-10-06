const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const zxcvbn = require('zxcvbn');
const { password } = require('../config/env');

const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', 'qwerty123', 'admin123',
  'letmein', 'welcome123', 'monkey123', 'dragon123', 'sunshine123',
]);

function containsCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase());
}

function containsPersonalInfo(password, user) {
  const lowerPassword = password.toLowerCase();
  const checks = [
    user.name?.toLowerCase(),
    user.email?.split('@')[0]?.toLowerCase(),
    user.businessName?.toLowerCase(),
  ].filter(Boolean);

  return checks.some(info => info.length >= 3 && lowerPassword.includes(info));
}

function validatePasswordStrength(password, user = {}) {
  const errors = [];

  if (password.length < password.minLength) {
    errors.push(`Password must be at least ${password.minLength} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (containsCommonPassword(password)) {
    errors.push('Password is too common, please choose a stronger one');
  }

  if (containsPersonalInfo(password, user)) {
    errors.push('Password must not contain your name, email, or business name');
  }

  const zxcvbnResult = zxcvbn(password);
  if (zxcvbnResult.score < 3) {
    errors.push('Password is too weak');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: zxcvbnResult.score,
    feedback: zxcvbnResult.feedback,
  };
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      validate: {
        validator: function(v) {
          return !/<script/i.test(v);
        },
        message: 'Name contains invalid characters',
      },
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: 'Phone must be in E.164 format (e.g., +15551234567)',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    lastLogin: Date,
    lastLoginIp: String,
    lastLoginUserAgent: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

userSchema.index({ lockUntil: 1 }, { expireAfterSeconds: 0 });

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(password.bcryptSaltRounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementFailedLogins = async function() {
  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= password.accountLockThreshold) {
    this.lockUntil = new Date(Date.now() + password.accountLockDurationMs);
  }

  return this.save({ validateBeforeSave: false });
};

userSchema.methods.resetFailedLogins = async function() {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  return this.save({ validateBeforeSave: false });
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + password.resetToken.expireMs;
  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  return verificationToken;
};

module.exports = mongoose.model('User', userSchema);
module.exports.validatePasswordStrength = validatePasswordStrength;