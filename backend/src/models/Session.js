const mongoose = require('mongoose');
const crypto = require('crypto');
const { jwt, resetToken } = require('../config/env');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      enum: ['logout', 'password_change', 'token_reuse', 'admin_revoke', 'expired'],
      default: null,
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });

sessionSchema.virtual('isRevoked').get(function() {
  return !!this.revokedAt;
});

sessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

sessionSchema.virtual('isValid').get(function() {
  return !this.isRevoked && !this.isExpired;
});

sessionSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

sessionSchema.statics.generateRefreshToken = function() {
  return crypto.randomBytes(64).toString('hex');
};

sessionSchema.methods.revoke = function(reason = 'logout', replacedBy = null) {
  this.revokedAt = new Date();
  this.revokedReason = reason;
  if (replacedBy) this.replacedBy = replacedBy;
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('Session', sessionSchema);