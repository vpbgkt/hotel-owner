'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RoomInventory = sequelize.define(
    'RoomInventory',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      roomTypeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'RoomTypes', key: 'id' },
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      availableCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      // Admin-set manual cap on how many rooms may be sold for this date.
      // When null (the default), availability is derived purely from
      // totalRooms − active bookings. When set, effective availability is
      // capped at (overrideAvailable − active bookings). This lets the admin
      // "Available Count" bulk control restrict stock without disturbing the
      // live booking-derived availability model.
      overrideAvailable: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      priceOverride: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      minStayNights: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      isClosed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'RoomInventories',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['roomTypeId', 'date'] },
      ],
    }
  );

  RoomInventory.associate = (models) => {
    RoomInventory.belongsTo(models.RoomType, { foreignKey: 'roomTypeId', as: 'roomType' });
  };

  return RoomInventory;
};
