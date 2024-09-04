const BookingRepository = require('../repository/booking-repository');
const axios = require('axios');
require('dotenv').config();
const FLIGHT_SERVICE_PATH = process.env.FLIGHT_SERVICE_PATH;
const USER_SERVICE_PATH = process.env.USER_SERVICE_PATH;

class BookingService {
    constructor() {
        this.bookingRepository = new BookingRepository();
    }

    async validateUser(token) {
        const checkIsAuthenticatedURL = `${USER_SERVICE_PATH}/api/v1/auth/validate`;
        const isValidUser = await axios.get(checkIsAuthenticatedURL, {
            headers: { 'x-access-token': token }
        });
        return isValidUser.data.data;
    }
    

    async createBooking(data, token) {
        try {
            
            //1. Check authentication from token from user microservice
            const userId = await this.validateUser(token);
                        
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


    async cancelBooking(bookingId , token) {
        try {

            //1. Check authentication from token from user microservice
            const tokenUserId = await this.validateUser(token);

            //check if bookingId exist
            const booking = await this.bookingRepository.getById(bookingId);
            const bookingUserId = booking.userId;

            //compare bookingId userId and compare tokenUserId
            if(bookingUserId !== tokenUserId) {
                return new Error('Not authorized user');
            }

            //check if already cancelled
            if(booking.bookingStatus === "Cancelled") {
                return new Error('Already this booking is cancelled');
            }

            // Cancel booking
            const finalBooking = await this.bookingRepository.update(booking.id, { status: "Cancelled" });

            // Update flight seats
            const getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${booking.flightId}`;
            const flightData = await axios.get(getFlightRequestURL);
            const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${booking.flightId}`;
            await axios.patch(updateFlightRequestURL, { totalSeats: flightData.data.data.totalSeats + booking.numberOfSeat });
            
            return finalBooking;
        }
         catch (error) {
            console.error('Something went wrong in the booking cancel process', error);
            throw error;
        }

    }
}

module.exports = BookingService;