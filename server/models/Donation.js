const mongoose = require('mongoose')

const donationSchema = new mongoose.Schema(
  {
    foodName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unit: {
      type: String,
      required: true,
      trim: true,
    },

    foodType: {
      type: String,
      required: true,
      trim: true,
    },

    bestBefore: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null,
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: String,
      default: '',
    },

    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
enum: ['available', 'requested', 'accepted', 'collected'],      default: 'available',
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    requestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Donation', donationSchema)