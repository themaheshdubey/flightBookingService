const {Booking} = require('../models/index')

class BookingRepository {
    async create(data) {
        try {
            const booking = await Booking.create(data);
            return booking;
        } catch (error) {
            console.log('Something wrong at repository layer');
            throw error;
        }
    }

    async update(bookingId, data) {
        try {
            const booking = await Booking.findByPk(bookingId);
            if(data.status) {
                booking.bookingStatus = data.status;
            }
            await booking.save();
            return booking;
        } 
        catch (error) {
            console.log('something wrong at repository layer');
            throw error;
        }
    }

    async getById(bookingId) {
        try {
            const booking = await Booking.findByPk(bookingId);
            if(!booking) {
                throw new Error('Booking not valid');
            }
            return booking;
        } catch (error) {
            throw error;
        }
    }

}



module.exports = BookingRepository;