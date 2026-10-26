
const express = require('express');
const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function notifyDonationsUpdated(req) {
  const io = req.app.get('io');
  if (io) {
    io.emit('donations:updated');
  }
}

// GET: Donor ki apni donations ya NGO ke liye available donations
router.get('/', authMiddleware, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'donor') {
      filter.donor = req.user.userId;
    } else if (req.user.role === 'ngo') {
      filter.bestBefore = { $gte: new Date() };
      filter.status = { $nin: ['collected', 'expired'] };
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const donations = await Donation.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(donations);
  } catch (error) {
    console.error('Fetch donations error:', error);
    return res.status(500).json({ message: 'Failed to fetch donations.' });
  }
});

// POST: Donor creates a donation
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({
        message: 'Only donors can create donations.',
      });
    }

    const {
      foodName,
      quantity,
      unit,
      foodType,
      bestBefore,
      location,
      phone,
      details,
      latitude,
      longitude,
    } = req.body;

    if (
      !foodName?.trim() ||
      quantity === undefined ||
      quantity === null ||
      unit === undefined ||
      !String(unit).trim() ||
      !foodType?.trim() ||
      !bestBefore ||
      !location?.trim() ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        message: 'Please fill all required fields.',
      });
    }

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      return res.status(400).json({
        message: 'Quantity must be a positive number.',
      });
    }

    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';

    if (hasLatitude !== hasLongitude) {
      return res.status(400).json({
        message: 'Please select a valid map location.',
      });
    }

    if (hasLatitude || hasLongitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return res.status(400).json({
          message: 'Please select a valid map location.',
        });
      }
    }

    const donation = await Donation.create({
      foodName: foodName.trim(),
      quantity: numericQuantity,
      unit: String(unit).trim(),
      foodType: foodType.trim(),
      bestBefore: new Date(bestBefore),
      location: location.trim(),
      phone: phone.trim(),
      details: details || '',
      donor: req.user.userId,
      ...(hasLatitude && {
        latitude: Number(latitude),
        longitude: Number(longitude),
      }),
    });

    notifyDonationsUpdated(req);

    return res.status(201).json({
      message: 'Donation created successfully.',
      donation,
    });
  } catch (error) {
    console.error('Create donation error:', error);

    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid donation details.',
      });
    }

    return res.status(500).json({
      message: 'Failed to create donation.',
    });
  }
});

// DELETE: Donor deletes their own donation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid donation ID.' });
    }

    const donation = await Donation.findOne({
      _id: req.params.id,
      donor: req.user.userId,
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    await donation.deleteOne();
    notifyDonationsUpdated(req);

    return res.status(200).json({
      message: 'Donation deleted successfully.',
    });
  } catch (error) {
    console.error('Delete donation error:', error);
    return res.status(500).json({ message: 'Failed to delete donation.' });
  }
});

// PATCH: NGO requests pickup
router.patch('/:id/request-pickup', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({
        message: 'Only NGOs can request pickups.',
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid donation ID.' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found.' });
    }

    if (donation.bestBefore && new Date(donation.bestBefore) < new Date()) {
      return res.status(400).json({
        message: 'This donation has expired.',
      });
    }

    donation.status = 'pickup_requested';
    donation.requestedBy = req.user.userId;
    await donation.save();

    notifyDonationsUpdated(req);

    return res.status(200).json({
      message: 'Pickup request successful!',
      donation,
    });
  } catch (error) {
    console.error('Pickup request error:', error);
    return res.status(500).json({
      message: 'Failed to request pickup.',
    });
  }
});

module.exports = router;
