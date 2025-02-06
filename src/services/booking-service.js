const { sequelize , Booking } = require('../models');
const BookingRepository = require('../repository/booking-repository');
const axios = require('axios');
require('dotenv').config();
const FLIGHT_SERVICE_PATH = process.env.FLIGHT_SERVICE_PATH;
const USER_SERVICE_PATH = process.env.USER_SERVICE_PATH;
const NOTIFICATION_SERVICE_PATH = process.env.NOTIFICATION_SERVICE_PATH;
const rabbitmqPublisher = require('../rabbitMqPublisher');


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

        const transaction = await sequelize.transaction(); //  Start a transaction

        try {
            
            //1. Check authentication from token from user microservice
            const userId = await this.validateUser(token);
                        
            // 2. Check flight availability
            const flightId = data.flightId;
            const getFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${flightId}`;
            const response = await axios.get(getFlightRequestURL);
            const flightData = response.data.data;


            // Lock the row so no other transaction can modify it concurrently
            const lockedFlight = await sequelize.models.Booking.findOne({
                where: { id: flightId },
                lock: transaction.LOCK.UPDATE,
                transaction, 
            });

            if (!lockedFlight) {
                throw new Error('Flight not found');
            }


            // 3. Check if seats are available
            if (data.numberOfSeat > flightData.totalSeats) {
                console.error('Insufficient seats in the flight');
                throw new Error('Insufficient seats in the flight');
            }

            // 4. Calculate total cost and create booking
            const totalCost = flightData.price * data.numberOfSeat;
            const bookingPayload = { ...data, totalCost, userId };
            const booking = await this.bookingRepository.create(bookingPayload , transaction);
            console.log(booking);

            // 5. Update flight seats
            const updateFlightRequestURL = `${FLIGHT_SERVICE_PATH}/api/v1/flight/${booking.flightId}`;
            await axios.patch(updateFlightRequestURL, { totalSeats: flightData.totalSeats - booking.numberOfSeat });

            // 6. Finalize booking
            const finalBooking = await this.bookingRepository.update(booking.id, { status: "Booked" });


             //7. Now store this booking record in notificationTicket table. For that fetch user data from other service

            const getUserDetailURL = `${USER_SERVICE_PATH}/api/v1/user/${userId}`;
            const userResponse = await axios.get(getUserDetailURL);
            const recepientMail = userResponse.data.data.email;

            // const notificationPayload = {
            //     flightId: booking.flightId,
            //     userEmail: recepientMail
            // };

            // const sendNotificationURL = `${NOTIFICATION_SERVICE_PATH}/api/v1/createTicket`;
            // await axios.post(sendNotificationURL, notificationPayload);


            // We will store this rabbitmq. we wont do api call. After successful booking, send message to RabbitMQ
            const ticketMessage = {
                flightId: booking.flightId,
                userEmail: recepientMail
            };

            await rabbitmqPublisher.publishMessage(ticketMessage);


            await transaction.commit(); //Commit the transaction
            return finalBooking;

        } catch (error) {
            await transaction.rollback(); //Rollback in case of failure
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