const express = require('express');
const router = express.Router();

const BookingController = require('../../controllers/booking-controller');
const bookingController = new BookingController();

router.post('/bookings', bookingController.create);
router.delete('/bookings/:bookingId', bookingController.cancel);

module.exports = router;