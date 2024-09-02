const BookingRepository = require('../repository/booking-repository');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const FLIGHT_SERVICE_PATH = process.env.FLIGHT_SERVICE_PATH;
const USER_SERVICE_PATH = process.env.USER_SERVICE_PATH;
const JWT_KEY = process.env.JWT_KEY;

class BookingService {
    constructor() {
        this.bookingRepository = new BookingRepository();
    }

    async isAuthenticated(token) {
        try {
            const response = this.verifyToken(token);
            if (!response) {
                throw new Error('Invalid token');
            }
            const apiLink = `${USER_SERVICE_PATH}/api/v1/user/${response.id}`;
            const userResponse = await axios.get(apiLink);
            const user = userResponse.data.data;
            if (!user) {
                throw new Error('No user with the corresponding token exists');
            }
            return user.id;
        } catch (error) {
            console.error("Something went wrong in the auth process", error);
            throw error;
        }
    }

    verifyToken(token) {
        try {
            const response = jwt.verify(token, JWT_KEY);
            return response;
        } catch (error) {
            console.error("Something went wrong in token validation", error);
            throw error;
        }
    }

    async createBooking(data, token) {
        try {
            // 1. Authenticate the user
            const userId = await this.isAuthenticated(token);

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