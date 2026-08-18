'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomType = sequelize.define(
    'RoomType',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      hotelId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Hotels', key: 'id' },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      basePriceDaily: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      basePriceHourly: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      maxGuests: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      maxAdults: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
      },
      maxChildren: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      maxExtraGuests: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      extraGuestCharge: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      totalRooms: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      amenities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        get() {
          const raw = this.getDataValue('amenities');
          if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
          return Array.isArray(raw) ? raw : [];
        },
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        get() {
          const raw = this.getDataValue('images');
          if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
          return Array.isArray(raw) ? raw : [];
        },
      },
      bookingModelOverride: {
        type: DataTypes.ENUM('DAILY', 'HOURLY', 'BOTH'),
        allowNull: true,
      },
      minHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      maxHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'RoomTypes',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['hotelId', 'slug'] },
      ],
    }
  );

  RoomType.associate = (models) => {
    RoomType.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
    RoomType.hasMany(models.Room, { foreignKey: 'roomTypeId', as: 'rooms', onDelete: 'CASCADE' });
    RoomType.hasMany(models.RoomInventory, { foreignKey: 'roomTypeId', as: 'inventory', onDelete: 'CASCADE' });
    RoomType.hasMany(models.HourlySlot, { foreignKey: 'roomTypeId', as: 'hourlySlots', onDelete: 'CASCADE' });
    RoomType.hasMany(models.Booking, { foreignKey: 'roomTypeId', as: 'bookings' });
  };

  return RoomType;
};
