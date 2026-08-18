'use strict';

const { Sequelize } = require('sequelize');
const { spawnSync } = require('child_process');
const { env } = require('./env');

const sharedDefine = {
  underscored: false,
  freezeTableName: false,
  timestamps: true,
};

// ── Sync TCP probe: check if PostgreSQL port is open ─────────────────────────
// Runs a child Node.js process (1.5s timeout) — executes synchronously so that
// models/index.js can destructure `sequelize` at load time with the right instance.
function isPgAvailable() {
  if (env.NODE_ENV === 'production') return true; // always real in production
  try {
    const result = spawnSync(
      process.execPath,
      ['-e', `
        const s=require('net').connect(${env.DB_PORT},'${env.DB_HOST}');
        s.on('connect',()=>process.exit(0));
        s.on('error',()=>process.exit(1));
        setTimeout(()=>process.exit(1),1500);
      `],
      { timeout: 2000, windowsHide: true }
    );
    return result.status === 0;
  } catch {
    return false;
  }
}

// ── Choose DB backend at load time ───────────────────────────────────────────
// DB_FORCE_POSTGRES=true forces PostgreSQL exclusively (no SQLite / pg-mem
// fallback) even in development. If Postgres is unreachable the app fails to
// start instead of silently switching to SQLite.
const forcePostgres = process.env.DB_FORCE_POSTGRES === 'true';
const pgAvailable = forcePostgres || isPgAvailable();

let sequelize;
let usingMemDb = false;
let usingSqlite = false;

if (pgAvailable) {
  sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    pool: { max: 10, min: 0, acquire: 10000, idle: 5000 },
    define: sharedDefine,
  });
} else {
  // Try SQLite (persistent) first, fall back to pg-mem (ephemeral)
  let sqliteAvailable = false;
  try {
    require('sqlite3');
    sqliteAvailable = true;
  } catch { /* not installed */ }

  if (sqliteAvailable) {
    const path = require('path');
    const fs = require('fs');
    const { DataTypes } = require('sequelize');
    usingSqlite = true;
    const dataDir = path.resolve(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const sqlitePath = path.join(dataDir, 'dev.sqlite');
    console.warn(`[DB] PostgreSQL not reachable — using SQLite (persistent) at ${sqlitePath}`);
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: sqlitePath,
      logging: false,
      define: sharedDefine,
    });
    // SQLite does not support PostgreSQL ARRAY or JSONB types.
    // Override both to use JSON (stored as text) for dev compatibility.
    const _origArray = DataTypes.ARRAY;
    DataTypes.ARRAY = function patchedArray() { return DataTypes.JSON; };
    DataTypes.ARRAY.prototype = _origArray.prototype;
    // JSONB is a Postgres extension; map to plain JSON for SQLite
    DataTypes.JSONB = DataTypes.JSON;
  } else {
    usingMemDb = true;
    console.warn('[DB] PostgreSQL not reachable — using pg-mem (in-memory) for development');
    console.warn('[DB] Install better-sqlite3 for persistent dev storage: npm install --save-dev better-sqlite3');
    const { newDb } = require('pg-mem');
    const { v4: uuidv4 } = require('uuid');
    const db = newDb();
    db.public.registerFunction({ name: 'gen_random_uuid', returns: 'text', implementation: uuidv4 });
    db.public.registerFunction({ name: 'uuid_generate_v4', returns: 'text', implementation: uuidv4 });
    const pgAdapter = db.adapters.createPg();
    sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      dialect: 'postgres',
      dialectModule: pgAdapter,
      logging: false,
      define: sharedDefine,
    });
    // pg-mem does not support pg_catalog.pg_enum queries that Sequelize uses in
    // ensureEnums(). Override to CREATE TYPE directly (pg-mem supports this DDL).
    const { DataTypes } = require('sequelize');
    const qi = sequelize.dialect.queryInterface;
    qi.ensureEnums = async function (tableName, attributes) {
      const tblName = typeof tableName === 'string' ? tableName : tableName.tableName;
      for (const [key, attribute] of Object.entries(attributes)) {
        const type = attribute.type;
        const isEnum = type instanceof DataTypes.ENUM;
        const isArrayEnum = type instanceof DataTypes.ARRAY && type.type instanceof DataTypes.ENUM;
        if (!isEnum && !isArrayEnum) continue;
        const enumType = isArrayEnum ? type.type : type;
        const values = attribute.values || enumType.values || [];
        const fieldName = attribute.field || key;
        const typeName = `enum_${tblName}_${fieldName}`;
        const valsSql = values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
        try {
          await sequelize.query(`CREATE TYPE "${typeName}" AS ENUM (${valsSql});`);
        } catch (e) {
          if (!e.message.toLowerCase().includes('already exists') &&
              !e.message.toLowerCase().includes('duplicate')) {
            // Ignore — likely already exists
          }
        }
      }
    };
  }
}

// ── ensureColumns — additive schema migration ────────────────────────────────
// sync({ force: false }) creates missing tables but never ALTERs existing ones,
// so newly-added model columns must be added manually. This runs idempotently on
// every startup and is safe for SQLite and PostgreSQL (duplicate-column errors
// are swallowed). Double-quoted identifiers work on both dialects.
async function ensureColumns() {
  const columns = [
    { table: 'RoomTypes', column: 'maxAdults', type: 'INTEGER DEFAULT 2' },
    { table: 'RoomTypes', column: 'maxChildren', type: 'INTEGER DEFAULT 0' },
    { table: 'Bookings', column: 'numAdults', type: 'INTEGER DEFAULT 1' },
    { table: 'Bookings', column: 'numChildren', type: 'INTEGER DEFAULT 0' },
    { table: 'RoomInventories', column: 'overrideAvailable', type: 'INTEGER' },
  ];
  for (const c of columns) {
    try {
      await sequelize.query(`ALTER TABLE "${c.table}" ADD COLUMN "${c.column}" ${c.type}`);
      console.log(`[DB] Added column ${c.table}.${c.column}`);
    } catch (e) {
      const msg = (e.message || '').toLowerCase();
      if (!msg.includes('duplicate') && !msg.includes('already exists')) {
        console.warn(`[DB] ensureColumns ${c.table}.${c.column}: ${e.message}`);
      }
      // else: column already exists — nothing to do
    }
  }
}

// ── connectDatabase — called in bootstrap() ──────────────────────────────────
async function connectDatabase() {
  await sequelize.authenticate();

  if (usingMemDb) {
    console.log('[DB] pg-mem authenticated — syncing tables...');
    await sequelize.sync({ force: true });
    console.log('[DB] Tables created in pg-mem');
    await ensureColumns();
    await _seedDevDb();
  } else if (usingSqlite) {
    console.log('[DB] SQLite authenticated — syncing schema...');
    // Never use alter on SQLite — it creates _old shadow tables with stale FK triggers.
    // force:false just creates missing tables without touching existing ones.
    await sequelize.sync({ force: false });
    await ensureColumns();
    console.log('[DB] SQLite schema up-to-date');
    // Seed if Hotel OR RoomType tables are empty
    const models = require('../models');
    const hotelCount = await models.Hotel.count().catch(() => 0);
    const roomTypeCount = await models.RoomType.count().catch(() => 0);
    if (hotelCount === 0 || roomTypeCount === 0) {
      console.log('[DB] SQLite missing data — seeding demo data...');
      await _seedDevDb();
    } else {
      console.log(`[DB] SQLite has ${hotelCount} hotel(s), ${roomTypeCount} room type(s) — skipping seed`);
    }
  } else {
    console.log('[DB] PostgreSQL connected successfully');
    // Create any missing tables (safe: sync() without force/alter never drops
    // data). This project has no migration files, so sync is how the schema is
    // materialized. ensureColumns then adds any newly-introduced columns.
    await sequelize.sync();
    await ensureColumns();
    // Seed demo data in non-production if the DB is empty.
    if (env.NODE_ENV !== 'production') {
      const models = require('../models');
      const hotelCount = await models.Hotel.count().catch(() => 0);
      const roomTypeCount = await models.RoomType.count().catch(() => 0);
      if (hotelCount === 0 || roomTypeCount === 0) {
        console.log('[DB] PostgreSQL missing data — seeding demo data...');
        await _seedDevDb();
      } else {
        console.log(`[DB] PostgreSQL has ${hotelCount} hotel(s), ${roomTypeCount} room type(s) — skipping seed`);
      }
    }
  }
}

async function _seedDevDb() {
  try {
    const models = require('../models');
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const HOTEL_ID = env.HOTEL_ID || '11111111-1111-1111-1111-111111111111';

    // Use findOne + create instead of findOrCreate (pg-mem has no PL/pgSQL)
    const upsert = async (Model, where, defaults) => {
      const existing = await Model.findOne({ where });
      if (!existing) await Model.create({ ...where, ...defaults });
    };

    await upsert(models.Hotel, { id: HOTEL_ID }, {
      name: 'Grand Horizon Hotel',
      slug: 'grand-horizon-hotel',
      description: 'Grand Horizon Hotel is a premier luxury property nestled in the heart of Bangalore. Offering breathtaking city views, world-class dining, a rooftop infinity pool, and impeccable service — every stay is an unforgettable experience.',
      address: '42 MG Road, Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      phone: '+919876543210',
      email: 'info@grandhorizon.com',
      website: 'https://grandhorizonhotel.com',
      starRating: 5,
      coverImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      heroImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=200&q=80',
      amenities: ['Free WiFi', 'Rooftop Pool', 'Spa & Wellness', 'Fine Dining', 'Fitness Center', 'Business Center', 'Conference Rooms', 'Valet Parking', 'Airport Transfer', '24h Room Service', 'Bar & Lounge', 'Kids Play Area'],
      bookingModel: 'DAILY',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      isActive: true,
      setupCompleted: true,
      template: 'LUXURY',
    });

    const [adminHash, guestHash, staffHash] = await Promise.all([
      bcrypt.hash('Admin@123', 12),
      bcrypt.hash('Guest@123', 12),
      bcrypt.hash('Staff@123', 12),
    ]);

    await upsert(models.User, { email: 'admin@grandhorizon.com' }, {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      name: 'Hotel Admin', phone: '+911111111111', password: adminHash,
      role: 'HOTEL_ADMIN', hotelId: HOTEL_ID,
      isActive: true, emailVerified: true, phoneVerified: true,
    });

    await upsert(models.User, { email: 'guest@example.com' }, {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      name: 'Rahul Sharma', phone: '+912222222222', password: guestHash,
      role: 'GUEST', hotelId: null,
      isActive: true, emailVerified: true, phoneVerified: true,
    });

    await upsert(models.User, { email: 'staff@grandhorizon.com' }, {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Front Desk Staff', phone: '+913333333333', password: staffHash,
      role: 'HOTEL_STAFF', hotelId: HOTEL_ID,
      isActive: true, emailVerified: true, phoneVerified: true,
    });

    // ── Room Types + Inventory ────────────────────────────────────────────
    // Model-based seeding (dialect-agnostic — works on PostgreSQL and SQLite).
    // amenities/images are passed as real arrays so PostgreSQL ARRAY columns and
    // the SQLite JSON fallback both store them correctly. IDs are left to the
    // DB (auto-increment) rather than hardcoded, avoiding Postgres sequence
    // conflicts. maxGuests = adults + children (as in the original seed).
    const dayjs = require('dayjs');
    const rtRows = [
      { slug: 'deluxe-room', name: 'Deluxe Room',
        description: 'Elegant 32 sqm room with a plush king-size bed, city views, rain shower, and complimentary high-speed Wi-Fi.',
        basePriceDaily: 3500, basePriceHourly: 500, maxGuests: 3, maxAdults: 2, maxChildren: 1, maxExtraGuests: 1, extraGuestCharge: 700, totalRooms: 20, sortOrder: 1,
        amenities: ['King Bed','Free WiFi','AC','55" Smart TV','Mini Fridge','Tea/Coffee Maker','Rain Shower','City View','Daily Housekeeping','Room Service'],
        images: ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80','https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80','https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'] },
      { slug: 'superior-room', name: 'Superior Room',
        description: 'Spacious 42 sqm Superior Room featuring a living area, work desk, premium bedding, and stunning panoramic city views.',
        basePriceDaily: 5500, basePriceHourly: 800, maxGuests: 4, maxAdults: 2, maxChildren: 2, maxExtraGuests: 2, extraGuestCharge: 900, totalRooms: 15, sortOrder: 2,
        amenities: ['King Bed','Free WiFi','AC','65" Smart TV','Mini Bar','Sofa Area','Bathtub + Shower','City View','Welcome Drink','Daily Housekeeping','Room Service'],
        images: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80','https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'] },
      { slug: 'executive-suite', name: 'Executive Suite',
        description: 'Our 75 sqm Executive Suite offers a separate bedroom and living room, private jacuzzi, walk-in wardrobe, and dedicated butler service.',
        basePriceDaily: 9500, basePriceHourly: 1500, maxGuests: 5, maxAdults: 3, maxChildren: 2, maxExtraGuests: 2, extraGuestCharge: 1200, totalRooms: 8, sortOrder: 3,
        amenities: ['Super King Bed','Free WiFi','AC','75" Smart TV','Full Mini Bar','Jacuzzi','Separate Living Room','Balcony','Butler Service','Airport Transfer','Complimentary Breakfast'],
        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80','https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'] },
      { slug: 'presidential-suite', name: 'Presidential Suite',
        description: 'The crown jewel of Grand Horizon. 150 sqm with two bedrooms, private dining room, rooftop terrace, personal chef, and panoramic views.',
        basePriceDaily: 22000, basePriceHourly: 3500, maxGuests: 6, maxAdults: 4, maxChildren: 2, maxExtraGuests: 2, extraGuestCharge: 2000, totalRooms: 2, sortOrder: 4,
        amenities: ['2 Bedrooms','Private Terrace','Private Pool','Personal Chef','Dedicated Butler','Luxury Spa Access','Private Dining Room','Home Theater','Limousine Service','Complimentary All Meals'],
        images: ['https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=800&q=80','https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80','https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'] },
    ];

    for (const rt of rtRows) {
      // findOne + create (not findOrCreate) keeps parity with the upsert helper
      // and stays compatible with the pg-mem fallback.
      let roomType = await models.RoomType.findOne({ where: { hotelId: HOTEL_ID, slug: rt.slug } });
      if (!roomType) {
        roomType = await models.RoomType.create({ ...rt, hotelId: HOTEL_ID, isActive: true });
      }

      // Seed the next 60 days of inventory for this room type.
      if (models.RoomInventory) {
        const today = dayjs();
        for (let d = 0; d < 60; d++) {
          const date = today.add(d, 'day').format('YYYY-MM-DD');
          const existing = await models.RoomInventory.findOne({ where: { roomTypeId: roomType.id, date } });
          if (!existing) {
            await models.RoomInventory.create({
              roomTypeId: roomType.id,
              date,
              availableCount: roomType.totalRooms,
              isClosed: false,
            });
          }
        }
      }
    }

    // ── Demo Reviews ────────────────────────────────────────────────────────
    // Note: Reviews require a valid bookingId so they are not seeded here.
    // Reviews will be created naturally through the booking flow.

    // ── Demo Blog Posts ─────────────────────────────────────────────────────
    if (models.BlogPost) {
      const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      const posts = [
        {
          title: 'Top 5 Things to Do in Bangalore Near MG Road',
          slug: 'top-5-things-bangalore-mg-road',
          excerpt: 'Discover the best experiences just steps away from Grand Horizon Hotel — from bustling markets to fine dining.',
          content: '<p>Bangalore\'s MG Road is a vibrant hub of culture, shopping, and cuisine. Here are the top 5 activities for guests staying at Grand Horizon Hotel.</p><h2>1. Brigade Road Shopping</h2><p>Just a short walk away, Brigade Road offers everything from international brands to local boutiques.</p><h2>2. Cubbon Park</h2><p>A serene escape in the middle of the city, perfect for morning jogs or relaxing afternoons.</p><h2>3. UB City Mall</h2><p>Luxury shopping and fine dining all under one roof, just 10 minutes away.</p>',
          coverImageUrl: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80',
          isPublished: true,
          publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          tags: ['Bangalore', 'Travel', 'Sightseeing'],
        },
        {
          title: 'A Guide to Grand Horizon\'s Spa & Wellness Centre',
          slug: 'guide-to-grand-horizon-spa-wellness',
          excerpt: 'Our world-class spa offers over 30 treatments. Here\'s everything you need to know to plan your perfect wellness retreat.',
          content: '<p>The Grand Horizon Spa & Wellness Centre spans 2,000 sqft and offers a comprehensive range of treatments designed to rejuvenate mind, body, and spirit.</p><h2>Signature Treatments</h2><p>Our signature Himalayan Salt Stone Massage uses heated salt stones to deeply relax muscles and restore energy balance.</p><h2>Yoga & Meditation</h2><p>Daily morning yoga sessions are available for hotel guests free of charge.</p>',
          coverImageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
          isPublished: true,
          publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          tags: ['Spa', 'Wellness', 'Relaxation'],
        },
        {
          title: 'Planning the Perfect Corporate Event at Grand Horizon',
          slug: 'corporate-event-planning-grand-horizon',
          excerpt: 'With 5 state-of-the-art conference halls and a dedicated events team, Grand Horizon is the ideal venue for your next corporate gathering.',
          content: '<p>Grand Horizon Hotel offers unmatched facilities for corporate events, product launches, and business conferences. Our events team ensures every detail is perfect.</p><h2>Conference Facilities</h2><p>Five fully-equipped conference halls with capacities ranging from 20 to 500 guests.</p>',
          coverImageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
          isPublished: true,
          publishedAt: new Date(),
          tags: ['Corporate', 'Events', 'Conferences'],
        },
      ];
      for (const post of posts) {
        const existing = await models.BlogPost.findOne({ where: { slug: post.slug } });
        if (!existing) {
          await models.BlogPost.create({ ...post, authorId: ADMIN_ID, hotelId: HOTEL_ID });
        }
      }
    }

    console.log('[DB] Demo data seeded — admin@grandhorizon.com / Admin@123 | guest@example.com / Guest@123');
  } catch (e) {
    console.warn('[DB] Seed warning:', e.message);
  }
}

module.exports = { sequelize, usingMemDb, usingSqlite, connectDatabase };


