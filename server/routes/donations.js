const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Donation = require('../models/Donation');
const authMiddleware = require('../middleware/auth');

// GET: Saari available donations
router.get('/', async (req, res) => {
  try {
    const donations = await Donation.find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(donations);
  } catch (error) {
    console.error('Fetch donations:', error.message);
    res.status(500).json({
      message: 'Could not fetch donations.',
    });
  }
});

// POST: Login ke baad donation create karein
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      foodName,
      quantity,
      unit,
      foodType,
      bestBefore,
      location,
      phone,
      details,
    } = req.body;

    if (
      !foodName?.trim() ||
      quantity === undefined ||
      quantity === null ||
      quantity === '' ||
      !unit ||
      !foodType ||
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

    const expiryDate = new Date(bestBefore);

    if (Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        message: 'Please enter a valid best-before date.',
      });
    }

    const donation = await Donation.create({
      foodName: foodName.trim(),
      quantity: numericQuantity,
      unit,
      foodType,
      bestBefore: expiryDate,
      location: location.trim(),
      phone: phone.trim(),
      details: details || '',
      donor: req.user.userId,
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error('Create donation:', error.message);
    res.status(400).json({
      message: error.message || 'Could not create donation.',
    });
  }
});

// DELETE: Sirf apni donation delete karein
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid donation ID.',
      });
    }

    const donation = await Donation.findOneAndDelete({
      _id: id,
      donor: req.user.userId,
    });

    if (!donation) {
      return res.status(404).json({
        message: 'Donation not found or you cannot delete this listing.',
      });
    }

    res.status(200).json({
      message: 'Donation deleted successfully.',
    });
  } catch (error) {
    console.error('Delete donation:', error.message);
    res.status(500).json({
      message: 'Could not delete donation.',
    });
  }
});

module.exports = router;