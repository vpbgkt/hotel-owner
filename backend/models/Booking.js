'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define(
    'Booking',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bookingNumber: {
        type: DataTypes.STRING(30),
        allowNull: false,
        unique: true,
      },
      hotelId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Hotels', key: 'id' },
      },
      guestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
      },
      roomTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'RoomTypes', key: 'id' },
      },
      assignedRoomId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'Rooms', key: 'id' },
      },
      bookingType: {
        type: DataTypes.ENUM('DAILY', 'HOURLY'),
        allowNull: false,
      },
      source: {
        type: DataTypes.ENUM('DIRECT', 'WALK_IN'),
        defaultValue: 'DIRECT',
      },
      // Daily booking fields
      checkInDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      checkOutDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      // Hourly booking fields
      checkInTime: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'ISO datetime string for hourly bookings',
      },
      checkOutTime: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      numHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Counts
      numRooms: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      numGuests: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      numAdults: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      numChildren: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      numExtraGuests: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      // Pricing breakdown
      roomTotal: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      extraGuestTotal: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      taxes: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      discountAmount: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      totalAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      // Status
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'),
        defaultValue: 'PENDING',
      },
      paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'),
        defaultValue: 'PENDING',
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Denormalized guest info (snapshot at time of booking)
      guestName: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      guestEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      guestPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'Bookings',
      timestamps: true,
      indexes: [
        { fields: ['hotelId', 'status'] },
        { fields: ['guestId'] },
        { fields: ['checkInDate'] },
      ],
    }
  );

  Booking.associate = (models) => {
    Booking.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    Booking.belongsTo(models.User, { foreignKey: 'guestId', as: 'guest' });
    Booking.belongsTo(models.RoomType, { foreignKey: 'roomTypeId', as: 'roomType' });
    Booking.belongsTo(models.Room, { foreignKey: 'assignedRoomId', as: 'assignedRoom' });
    Booking.hasMany(models.Payment, { foreignKey: 'bookingId', as: 'payments', onDelete: 'CASCADE' });
    Booking.hasOne(models.Review, { foreignKey: 'bookingId', as: 'review' });
  };

  return Booking;
};
