
const express = require('express')
const router = express.Router()

const Donation = require('../models/Donation')
const authMiddleware = require('../middleware/auth')

// GET impact analytics — authenticated users only
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!['donor', 'ngo'].includes(req.user.role)) {
      return res.status(403).json({
        message: 'You are not allowed to view analytics.',
      })
    }

    // Har donor ko sirf apni donations ke statistics milenge.
    const filter =
      req.user.role === 'donor'
        ? { donor: req.user.userId }
        : {}

    const [total, available, requested, accepted, collected, quantityByUnit] =
      await Promise.all([
        Donation.countDocuments(filter),
        Donation.countDocuments({
          ...filter,
          $or: [
            { status: 'available' },
            { status: { $exists: false } },
          ],
        }),
        Donation.countDocuments({ ...filter, status: 'requested' }),
        Donation.countDocuments({ ...filter, status: 'accepted' }),
        Donation.countDocuments({ ...filter, status: 'collected' }),
        Donation.aggregate([
          { $match: { ...filter, status: 'collected' } },
          {
            $group: {
              _id: '$unit',
              totalQuantity: { $sum: '$quantity' },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ])

    const collectionRate =
      total > 0
        ? Number(((collected / total) * 100).toFixed(1))
        : 0

    return res.status(200).json({
      totalDonations: total,
      availableDonations: available,
      pendingRequests: requested,
      acceptedPickups: accepted,
      collectedDonations: collected,
      collectionRate,
      collectedQuantityByUnit: quantityByUnit.map((item) => ({
        unit: item._id || 'unspecified',
        quantity: item.totalQuantity,
      })),
    })
  } catch (error) {
    console.error('Fetch analytics:', error.message)
    return res.status(500).json({
      message: 'Could not fetch impact analytics.',
    })
  }
})

module.exports = router
