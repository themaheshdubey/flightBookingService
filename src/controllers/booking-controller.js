const BookingService = require('../services/booking-service');
const bookingService = new BookingService();

class BookingController {
    constructor() {}

    async create(req, res) {
        try {
            const {flightId, numberOfSeat } = req.body;
            if (!flightId || !numberOfSeat) {
                return res.status(400).json({
                    message: 'Missing required fields: flightId, or numberOfSeat',
                    success: false,
                    err: {},
                    data: {}
                });
            }
            
            const token = req.headers['x-access-token'];
            if(!token) {
                return res.status(400).json({
                    message: 'Missing required token',
                    success: false,
                    err: {},
                    data: {}
                });
            }

            const response = await bookingService.createBooking(req.body , token);
            return res.status(201).json({
                message: 'Successfully completed booking',
                success: true,
                err: {},
                data: response
            });
        } catch (error) {
            console.error("Error in BookingController.create:", error);
            return res.status(500).json({
                message: error.message,
                success: false,
                err: error, 
                data: {}
            });
        }
    }


    async cancel(req, res) {
        try {
            const { bookingId } = req.params;

            if (!bookingId) {
                return res.status(400).json({
                    message: 'Missing bookingId',
                    success: false,
                    err: {},
                    data: {}
                });
            }
    
            const token = req.headers['x-access-token'];
            if (!token) {
                return res.status(400).json({
                    message: 'Missing required token',
                    success: false,
                    err: {},
                    data: {}
                });
            }
    
            const response = await bookingService.cancelBooking(bookingId, token);
            return res.status(200).json({
                message: 'Successfully canceled booking',
                success: true,
                err: {},
                data: response
            });
        } catch (error) {
            console.error("Error in BookingController.cancel:", error);
            return res.status(500).json({
                message: error.message,
                success: false,
                err: error, 
                data: {}
            });
        }
    }
    
}

module.exports = BookingController;
