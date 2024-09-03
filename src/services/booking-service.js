const BookingRepository = require('../repository/booking-repository');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const FLIGHT_SERVICE_PATH = process.env.FLIGHT_SERVICE_PATH;
const USER_SERVICE_PATH = process.env.USER_SERVICE_PATH;

class BookingService {
    constructor() {
        this.bookingRepository = new BookingRepository();
    }

    async createBooking(data, token) {
        try {
            
            //1. Check authentication from token from user microservice
            const checkIsAuthenticatedURL = `${USER_SERVICE_PATH}/api/v1/auth/validate`;

            const isValidUser = await axios.get(checkIsAuthenticatedURL, {
                headers: {
                    'x-access-token': token
                }
            });

            const userId = isValidUser.data.data;
                        
            // 2. Check flight availability
            const flightId = data.flightId;
            const getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${flightId}`;
            const response = await axios.get(getFlightRequestURL);
            const flightData = response.data.data;

            // 3. Check if seats are available
            if (data.numberOfSeat > flightData.totalSeats) {
                console.error('Insufficient seats in the flight');
                throw new Error('Insufficient seats in the flight');
            }

            // 4. Calculate total cost and create booking
            const totalCost = flightData.price * data.numberOfSeat;
            const bookingPayload = { ...data, totalCost, userId };
            const booking = await this.bookingRepository.create(bookingPayload);

            // 5. Update flight seats
            const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${booking.flightId}`;
            await axios.patch(updateFlightRequestURL, { totalSeats: flightData.totalSeats - booking.numberOfSeat });

            // 6. Finalize booking
            const finalBooking = await this.bookingRepository.update(booking.id, { status: "Booked" });

            return finalBooking;

        } catch (error) {
            console.error('Something went wrong in the booking process', error);
            throw error;
        }
    }
}

module.exports = BookingService;