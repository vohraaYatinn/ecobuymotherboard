const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const xlsx = require('xlsx');
require('dotenv').config();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'tax-slips');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: bookingId_timestamp.pdf
    const bookingId = req.params.id || 'booking';
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const ext = path.extname(originalName) || '.pdf';
    const name = path.basename(originalName, ext);
    cb(null, `${bookingId}_${timestamp}_${name}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Only accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Configure multer for marketplace image uploads
const marketplaceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'marketplace');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `marketplace_${timestamp}_${randomString}${ext}`);
  }
});

const marketplaceFileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadMarketplace = multer({
  storage: marketplaceStorage,
  fileFilter: marketplaceFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

// Configure multer for product image uploads
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `product_${timestamp}_${randomString}${ext}`);
  }
});

const productFileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadProduct = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for images
  }
});

// Configure multer for banner image/video uploads
const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'banners');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    cb(null, `banner_${timestamp}_${randomString}${ext}`);
  }
});

const bannerFileFilter = (req, file, cb) => {
  // Accept images and videos
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const uploadBanner = multer({
  storage: bannerStorage,
  fileFilter: bannerFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for images/videos
  }
});

const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || ['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only spreadsheet files (.xlsx, .xls, .csv) are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for spreadsheets
  }
});

// Configure multer for OTA bundle uploads
const otaBundleStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    console.log('📁 OTA upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Creating uploads directory...');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Uploads directory created');
      } catch (mkdirError) {
        console.error('❌ Failed to create uploads directory:', mkdirError);
        return cb(new Error(`Failed to create upload directory: ${mkdirError.message}`));
      }
    }
    
    // Check if directory is writable
    try {
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log('✅ Uploads directory is writable');
    } catch (accessError) {
      console.error('❌ Uploads directory is not writable:', accessError);
      return cb(new Error(`Upload directory is not writable: ${accessError.message}`));
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: bundle_timestamp.zip
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    cb(null, `bundle_${timestamp}_${randomString}.zip`);
  }
});

const otaBundleFileFilter = (req, file, cb) => {
  // Accept ZIP files
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed' ||
      ext === '.zip') {
    cb(null, true);
  } else {
    cb(new Error('Only ZIP files are allowed for OTA bundles'), false);
  }
};

const uploadOTABundle = multer({
  storage: otaBundleStorage,
  fileFilter: otaBundleFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for OTA bundles
  }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MONGODB_URI = process.env.MONGODB_URI;
const otp_development = false; // Set to true to bypass OTP verification and accept "0000" as valid OTP

// Validate required environment variables
if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is required in .env file');
  console.error('   Please set MONGODB_URI in your .env file');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  // Drop old phone index if it exists (migration fix)
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const usersCollection = collections.find(c => c.name === 'users');
    
    if (usersCollection) {
      const indexes = await db.collection('users').indexes();
      const phoneIndex = indexes.find(idx => idx.name === 'phone_1');
      
      if (phoneIndex) {
        console.log('🔧 Dropping old phone_1 index...');
        await db.collection('users').dropIndex('phone_1');
        console.log('✅ Old phone_1 index dropped successfully');
      }
    }
  } catch (error) {
    // Index might not exist, which is fine
    if (!error.message.includes('index not found')) {
      console.warn('⚠️  Warning checking/dropping phone index:', error.message);
    }
  }
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import models
const StatePlan = require('./models/StatePlan');
const Role = require('./models/Role');
const Employee = require('./models/Employee');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Coupon = require('./models/Coupon');
const InsuranceInquiry = require('./models/InsuranceInquiry');
const Device = require('./models/Device');
const Product = require('./models/Product');
const ScratchCard = require('./models/ScratchCard');
const MarketplaceItem = require('./models/MarketplaceItem');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Banner = require('./models/Banner');
const Settings = require('./models/Settings');
const Popup = require('./models/Popup');
const FuelPrice = require('./models/FuelPrice');
const Referral = require('./models/Referral');

// Firebase Admin SDK for Push Notifications
let admin = null;
let messaging = null;
try {
  admin = require('firebase-admin');
  
  // Initialize Firebase Admin if credentials are provided
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      // Check if already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          })
        });
        console.log('✅ Firebase Admin SDK initialized for push notifications');
      }
      messaging = admin.messaging();
      console.log('✅ Firebase Messaging service initialized');
    } catch (firebaseError) {
      console.error('⚠️  Firebase Admin SDK initialization failed:', firebaseError.message);
      console.log('💡 Push notifications will not work until Firebase is properly configured');
    }
  } else {
    console.log('⚠️  Firebase credentials not found in environment variables');
    console.log('💡 Push notifications will not work until Firebase is configured');
    console.log('   Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
} catch (error) {
  console.warn('⚠️  firebase-admin package not installed. Run: npm install firebase-admin');
  console.log('💡 Push notifications will not work until firebase-admin is installed');
}

// Import middleware
const { authenticateToken, requirePermission, requireAnyPermission } = require('./middleware/permissions');

// MessageCentral Configuration
const MESSAGE_CENTRAL_CONFIG = {
  authToken: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLTNGMEI1MUQzRTBCNzQ1MCIsImlhdCI6MTc2ODk3NjAzOCwiZXhwIjoxOTI2NjU2MDM4fQ.ssUp02it6DsK5El9tmtDrWYyDXnbj3C5ZZQ6llSTuoDPYi1BaNoQf0BEJALe4vRQvQCIrBVFmycyQqIejXq24w',
  customerId: 'C-3F0B51D3E0B7450',
  baseUrl: 'https://cpaas.messagecentral.com/verification/v3'
};

// WhatsApp (MSG91) Notification - Booking Confirmation
const MSG91_WHATSAPP_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';
const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY || '474157ACeh5c45oTc690870e0P1';
const MSG91_INTEGRATED_NUMBER = process.env.MSG91_INTEGRATED_NUMBER || '919205301151';
const MSG91_TEMPLATE_NAMESPACE = process.env.MSG91_TEMPLATE_NAMESPACE || '4ff51586_97f7_4e21_b819_e4f0de93301f';
const MSG91_TEMPLATE_NAME = process.env.MSG91_TEMPLATE_NAME || 'booking_confirmation';

function formatDateYMD(d) {
  try {
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-US', { month: 'short' });
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (_) {
    return '';
  }
}

function toWhatsAppNumbers(list) {
  const unique = new Set();
  (list || []).forEach((num) => {
    if (!num) return;
    const digits = String(num).replace(/\D/g, '');
    if (digits.length === 10) {
      unique.add(`91${digits}`);
    } else if (digits.length === 12 && digits.startsWith('91')) {
      unique.add(digits);
    }
  });
  return Array.from(unique);
}

function normalizeStateName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeDateOnly(value) {
  if (!value && value !== 0) return null;
  let date;
  if (value instanceof Date) {
    date = new Date(value);
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parseExcelDateValue(value) {
  if (value instanceof Date) {
    return normalizeDateOnly(value);
  }

  if (typeof value === 'number') {
    try {
      const parsed = xlsx.SSF?.parse_date_code?.(value);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
        return normalizeDateOnly(date);
      }
      return normalizeDateOnly(new Date(value));
    } catch (error) {
      return null;
    }
  }

  if (typeof value === 'string') {
    return normalizeDateOnly(value);
  }

  return null;
}

function parsePriceValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value < 0) return null;
    return Number(value.toFixed(2));
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Normalize common currency formats (e.g., "₹105.41", "105.41 ₹/L")
  const sanitized = raw
    .replace(/[^0-9.,-]/g, '') // strip currency symbols, units, letters
    .replace(/,/g, '');

  if (!sanitized) return null;

  const number = parseFloat(sanitized);
  if (Number.isNaN(number) || number < 0) return null;
  return Number(number.toFixed(2));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function sendWhatsAppBookingConfirmation(bookingDoc) {
  try {
    const stateName = bookingDoc?.visiting_state?.name || '';
    const district = bookingDoc?.entry_border || '';
    const vehicleNo = bookingDoc?.vehicle_number || '';
    const plan = bookingDoc?.tax_mode || '';
    const validFrom = formatDateYMD(bookingDoc?.tax_from_date);
    const validTo = formatDateYMD(bookingDoc?.tax_upto_date);

    const numbers = toWhatsAppNumbers([
      bookingDoc?.whatsapp_number,
      bookingDoc?.user?.mobile
    ]);

    if (numbers.length === 0) {
      console.log('ℹ️ Skipping WhatsApp notification: no valid recipient numbers');
      return;
    }

    const payload = {
      integrated_number: MSG91_INTEGRATED_NUMBER,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: MSG91_TEMPLATE_NAME,
          language: {
            code: 'en',
            policy: 'deterministic'
          },
          namespace: MSG91_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: numbers,
              components: {
                body_1: { type: 'text', value: stateName },
                body_2: { type: 'text', value: district },
                body_3: { type: 'text', value: vehicleNo },
                body_4: { type: 'text', value: plan },
                body_5: { type: 'text', value: validFrom },
                body_6: { type: 'text', value: validTo }
              }
            }
          ]
        }
      }
    };

    await axios.post(MSG91_WHATSAPP_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        authkey: MSG91_AUTHKEY
      },
      timeout: 10000
    });
    console.log('✅ WhatsApp booking confirmation sent to:', numbers.join(','));
  } catch (err) {
    console.error('❌ Failed to send WhatsApp booking confirmation:', err?.response?.data || err?.message);
  }
}

// Helper function to send push notification to a user's devices
async function sendPushNotificationToUser(user, notification, data = {}) {
  try {
    console.log(user.pushTokens)
    // Check if Firebase messaging is available
    if (!messaging) {
      console.warn('⚠️ [PushNotification] Firebase messaging not initialized, skipping push notification');
      return;
    }

    // Check if user has push tokens
    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      console.log(`ℹ️ [PushNotification] User ${user?.mobile || 'unknown'} has no registered push tokens`);
      return;
    }

    // Extract valid tokens
    const tokens = user.pushTokens
      .filter(token => token && token.token && token.token.trim())
      .map(token => token.token.trim());

    if (tokens.length === 0) {
      console.log(`ℹ️ [PushNotification] No valid push tokens found for user ${user.mobile}`);
      return;
    }

    // Prepare message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value); // FCM data must be strings
        return acc;
      }, {}),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    let sent = 0;
    let failed = 0;

    // Send to each token
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      try {
        const result = await messaging.send({
          ...message,
          token: token
        });
        sent++;
        console.log(`✅ [PushNotification] Sent to device ${i + 1}/${tokens.length} for user ${user.mobile}`);
      } catch (error) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        console.error(`❌ [PushNotification] Failed for device ${i + 1}/${tokens.length} (${user.mobile}): ${errorMsg}`);
        
        // Remove invalid tokens (e.g., uninstalled app, expired token)
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          try {
            await User.updateOne(
              { _id: user._id },
              { $pull: { pushTokens: { token: token } } }
            );
            console.log(`🗑️ [PushNotification] Removed invalid token for user ${user.mobile}`);
          } catch (updateErr) {
            console.error(`❌ [PushNotification] Failed to remove invalid token:`, updateErr.message);
          }
        }
      }
    }

    console.log(`📊 [PushNotification] Summary for user ${user.mobile}: ${sent} sent, ${failed} failed`);
  } catch (error) {
    console.error(`❌ [PushNotification] Error sending to user ${user?.mobile || 'unknown'}:`, error.message);
  }
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Increase body size limits for large file uploads
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Static file serving with CORS headers for uploads
app.use('/uploads', (req, res, next) => {
  console.log(`[UPLOADS] Serving: ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    console.log(`[UPLOADS] Setting headers for: ${filePath}`);
  }
}));

app.use('/api/uploads', (req, res, next) => {
  console.log(`[API-UPLOADS] Serving: ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    console.log(`[API-UPLOADS] Setting headers for: ${filePath}`);
  }
}));

// WebSocket Connection Handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Helper function to emit booking updates to all connected clients
const emitBookingUpdate = (eventType, booking) => {
  try {
    console.log(`📡 Emitting booking-update: ${eventType}`, booking?._id || 'N/A');
    io.emit('booking-update', {
      type: eventType, // 'created', 'updated', 'deleted', 'assigned', 'completed', 'uncompleted'
      booking: booking
    });
  } catch (error) {
    console.error('❌ Error emitting booking update:', error);
  }
};

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const otaUploadsDir = path.join(__dirname, 'uploads'); // OTA bundles go here
const versionsFile = path.join(__dirname, 'versions.json');
const usersFile = path.join(__dirname, 'users.json');
const otpSessionsFile = path.join(__dirname, 'otp-sessions.json');

// Ensure public/uploads directory exists and is writable
if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating public/uploads directory:', uploadsDir);
  fs.mkdirSync(uploadsDir, { recursive: true });
}
try {
  fs.accessSync(uploadsDir, fs.constants.W_OK);
  console.log('✅ public/uploads directory is writable:', uploadsDir);
} catch (error) {
  console.error('❌ public/uploads directory is not writable:', uploadsDir, error);
}

// Ensure uploads directory exists for OTA bundles
if (!fs.existsSync(otaUploadsDir)) {
  console.log('📁 Creating uploads directory for OTA bundles:', otaUploadsDir);
  fs.mkdirSync(otaUploadsDir, { recursive: true });
}
try {
  fs.accessSync(otaUploadsDir, fs.constants.W_OK);
  console.log('✅ uploads directory is writable:', otaUploadsDir);
} catch (error) {
  console.error('❌ uploads directory is not writable:', otaUploadsDir, error);
}

// Ensure versions.json exists
if (!fs.existsSync(versionsFile)) {
  console.log('📝 Creating versions.json:', versionsFile);
  fs.writeFileSync(versionsFile, JSON.stringify({ versions: [] }, null, 2));
}
try {
  fs.accessSync(versionsFile, fs.constants.R_OK | fs.constants.W_OK);
  console.log('✅ versions.json is readable and writable:', versionsFile);
} catch (error) {
  console.error('❌ versions.json is not accessible:', versionsFile, error);
}
if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify({ users: [] }, null, 2));
}
if (!fs.existsSync(otpSessionsFile)) {
  fs.writeFileSync(otpSessionsFile, JSON.stringify({ sessions: [] }, null, 2));
}


// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper functions
const getVersions = () => {
  try {
    if (!fs.existsSync(versionsFile)) {
      console.log('📝 versions.json does not exist, creating it...');
      const initialData = { versions: [] };
      fs.writeFileSync(versionsFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const fileContent = fs.readFileSync(versionsFile, 'utf8');
    
    // Handle empty file
    if (!fileContent || fileContent.trim() === '') {
      console.log('⚠️  versions.json is empty, initializing...');
      const initialData = { versions: [] };
      fs.writeFileSync(versionsFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    
    const data = JSON.parse(fileContent);
    
    // Ensure versions array exists
    if (!data || typeof data !== 'object') {
      console.log('⚠️  versions.json has invalid structure, resetting...');
      const initialData = { versions: [] };
      fs.writeFileSync(versionsFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    
    if (!Array.isArray(data.versions)) {
      console.log('⚠️  versions.json missing versions array, fixing...');
      data.versions = [];
      fs.writeFileSync(versionsFile, JSON.stringify(data, null, 2));
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error reading versions.json:', error);
    // If JSON parse fails, try to recover
    if (error instanceof SyntaxError) {
      console.log('⚠️  versions.json is corrupted, resetting...');
      try {
        const initialData = { versions: [] };
        fs.writeFileSync(versionsFile, JSON.stringify(initialData, null, 2));
        return initialData;
      } catch (writeError) {
        console.error('❌ Failed to reset versions.json:', writeError);
      }
    }
    throw new Error(`Failed to read versions file: ${error.message}`);
  }
};

const saveVersions = (data) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(versionsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(versionsFile, JSON.stringify(data, null, 2));
    console.log('✅ Successfully saved versions.json');
  } catch (error) {
    console.error('❌ Error saving versions.json:', error);
    throw new Error(`Failed to save versions file: ${error.message}`);
  }
};

const getUsers = () => {
  const data = fs.readFileSync(usersFile, 'utf8');
  return JSON.parse(data);
};

const saveUsers = (data) => {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
};

const getOtpSessions = () => {
  const data = fs.readFileSync(otpSessionsFile, 'utf8');
  return JSON.parse(data);
};

const saveOtpSessions = (data) => {
  fs.writeFileSync(otpSessionsFile, JSON.stringify(data, null, 2));
};

const findUserByMobile = (mobile) => {
  const data = getUsers();
  return data.users.find(u => u.mobile === mobile);
};

// Routes

// ============================================
// MOBILE APP AUTHENTICATION ROUTES
// ============================================

// Send OTP for login/signup
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { mobile, countryCode = '91', name, email, referralCode } = req.body;

    // Validation
    if (!mobile || mobile.length !== 10) {
      return res.status(400).json({ 
        error: 'Invalid mobile number',
        message: 'Mobile number must be 10 digits'
      });
    }

    const fullMobile = `${countryCode}${mobile}`;
    console.log(`📱 [AUTH] Sending OTP to ${fullMobile}`);

    // Check if user exists
    const existingUser = findUserByMobile(fullMobile);
    const isNewUser = !existingUser;

    // If new user from login (no name provided), return early with isNewUser flag
    // Frontend will redirect to signup page
    if (isNewUser && !name) {
      console.log(`👤 [AUTH] New user detected: ${fullMobile}, redirecting to signup`);
      return res.json({
        success: true,
        isNewUser: true,
        mobile: fullMobile,
        message: 'New user detected. Please complete signup.'
      });
    }

    // Development mode: bypass MessageCentral API if otp_development is true
    if (otp_development) {
      console.log('🧪 [AUTH] Development mode: Bypassing MessageCentral API (otp_development = true)');
      
      const verificationId = 'DEV-' + Date.now();
      
      // Store OTP session
      const sessions = getOtpSessions();
      
      // Clean up old sessions for this mobile
      sessions.sessions = sessions.sessions.filter(s => s.mobile !== fullMobile);
      
      // Add new session with dev mode flag
      sessions.sessions.push({
        mobile: fullMobile,
        verificationId,
        isNewUser,
        name: name || existingUser?.name,
        email: email || existingUser?.email || '',
        referralCode: referralCode || undefined,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        devMode: true,
        devOtp: '0000' // Use 0000 as dev OTP to match verify-otp logic
      });

      saveOtpSessions(sessions);

      // Process referral creation asynchronously (if referral code provided and new user signup)
      console.log('🔍 [DEBUG REFERRAL] send-otp (dev mode) - Checking referral conditions:', {
        hasReferralCode: !!referralCode,
        referralCode: referralCode,
        isNewUser: isNewUser,
        hasName: !!name,
        mongoConnected: mongoose.connection.readyState === 1,
        mongoState: mongoose.connection.readyState,
        willCreateReferral: !!(referralCode && isNewUser && name && mongoose.connection.readyState === 1)
      });

      if (referralCode && isNewUser && name && mongoose.connection.readyState === 1) {
        console.log('✅ [DEBUG REFERRAL] send-otp (dev mode) - Conditions met, creating referral record:', {
          mobile: fullMobile,
          name: name,
          email: email,
          referralCode: referralCode
        });
        setImmediate(async () => {
          try {
            console.log('🚀 [DEBUG REFERRAL] send-otp (dev mode) - Starting async referral creation');
            await createReferralRecordOnSignup(fullMobile, name, email, referralCode);
            console.log('✅ [DEBUG REFERRAL] send-otp (dev mode) - Referral creation completed');
          } catch (err) {
            console.error('❌ [DEBUG REFERRAL] send-otp (dev mode) - Error creating referral:', {
              error: err.message,
              stack: err.stack,
              mobile: fullMobile,
              referralCode: referralCode
            });
          }
        });
      } else {
        console.log('⚠️ [DEBUG REFERRAL] send-otp (dev mode) - Referral creation skipped:', {
          reason: !referralCode ? 'No referral code' : 
                  !isNewUser ? 'Existing user' : 
                  !name ? 'No name provided' : 
                  mongoose.connection.readyState !== 1 ? 'MongoDB not connected' : 'Unknown'
        });
      }

      return res.json({
        success: true,
        message: 'OTP sent successfully (DEV MODE - Use OTP: 0000)',
        verificationId,
        isNewUser,
        mobile: fullMobile,
        devMode: true
      });
    }

    // Production mode: Send OTP via MessageCentral with timeout
    try {
      const response = await axios.post(
        `${MESSAGE_CENTRAL_CONFIG.baseUrl}/send`,
        null,
        {
          params: {
            countryCode: countryCode,
            customerId: MESSAGE_CENTRAL_CONFIG.customerId,
            flowType: 'SMS',
            mobileNumber: mobile
          },
          headers: {
            'authToken': MESSAGE_CENTRAL_CONFIG.authToken
          },
          timeout: 15000 // 15 second timeout for SMS gateway
        }
      );

      console.log('✅ [AUTH] OTP sent successfully:', response.data);

      const verificationId = response.data.data?.verificationId;

      if (!verificationId) {
        throw new Error('No verification ID received');
      }

      // Store OTP session
      const sessions = getOtpSessions();
      
      // Clean up old sessions for this mobile
      sessions.sessions = sessions.sessions.filter(s => s.mobile !== fullMobile);
      
      // Add new session
      sessions.sessions.push({
        mobile: fullMobile,
        verificationId,
        isNewUser,
        name: name || existingUser?.name,
        email: email || existingUser?.email || '',
        referralCode: referralCode || undefined,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

      saveOtpSessions(sessions);

      // Process referral creation asynchronously (if referral code provided and new user signup)
      console.log('🔍 [DEBUG REFERRAL] send-otp (production) - Checking referral conditions:', {
        hasReferralCode: !!referralCode,
        referralCode: referralCode,
        isNewUser: isNewUser,
        hasName: !!name,
        mongoConnected: mongoose.connection.readyState === 1,
        mongoState: mongoose.connection.readyState,
        willCreateReferral: !!(referralCode && isNewUser && name && mongoose.connection.readyState === 1)
      });

      if (referralCode && isNewUser && name && mongoose.connection.readyState === 1) {
        console.log('✅ [DEBUG REFERRAL] send-otp (production) - Conditions met, creating referral record:', {
          mobile: fullMobile,
          name: name,
          email: email,
          referralCode: referralCode
        });
        setImmediate(async () => {
          try {
            console.log('🚀 [DEBUG REFERRAL] send-otp (production) - Starting async referral creation');
            await createReferralRecordOnSignup(fullMobile, name, email, referralCode);
            console.log('✅ [DEBUG REFERRAL] send-otp (production) - Referral creation completed');
          } catch (err) {
            console.error('❌ [DEBUG REFERRAL] send-otp (production) - Error creating referral:', {
              error: err.message,
              stack: err.stack,
              mobile: fullMobile,
              referralCode: referralCode
            });
          }
        });
      } else {
        console.log('⚠️ [DEBUG REFERRAL] send-otp (production) - Referral creation skipped:', {
          reason: !referralCode ? 'No referral code' : 
                  !isNewUser ? 'Existing user' : 
                  !name ? 'No name provided' : 
                  mongoose.connection.readyState !== 1 ? 'MongoDB not connected' : 'Unknown'
        });
      }

      res.json({
        success: true,
        message: 'OTP sent successfully',
        verificationId,
        isNewUser,
        mobile: fullMobile
      });

    } catch (error) {
      console.error('❌ [AUTH] MessageCentral API error:', error.response?.data || error.message);
      
      // Fallback: Create a mock session for development
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  [AUTH] Using development mode - OTP: 1234');
        
        const sessions = getOtpSessions();
        sessions.sessions = sessions.sessions.filter(s => s.mobile !== fullMobile);
        sessions.sessions.push({
          mobile: fullMobile,
          verificationId: 'DEV-' + Date.now(),
          isNewUser,
          name: name || existingUser?.name,
          email: email || existingUser?.email || '',
          referralCode: referralCode || undefined,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          devMode: true,
          devOtp: '1234'
        });
        saveOtpSessions(sessions);

        // Process referral creation asynchronously (if referral code provided and new user signup)
        console.log('🔍 [DEBUG REFERRAL] send-otp (dev fallback) - Checking referral conditions:', {
          hasReferralCode: !!referralCode,
          referralCode: referralCode,
          isNewUser: isNewUser,
          hasName: !!name,
          mongoConnected: mongoose.connection.readyState === 1,
          mongoState: mongoose.connection.readyState,
          willCreateReferral: !!(referralCode && isNewUser && name && mongoose.connection.readyState === 1)
        });

        if (referralCode && isNewUser && name && mongoose.connection.readyState === 1) {
          console.log('✅ [DEBUG REFERRAL] send-otp (dev fallback) - Conditions met, creating referral record:', {
            mobile: fullMobile,
            name: name,
            email: email,
            referralCode: referralCode
          });
          setImmediate(async () => {
            try {
              console.log('🚀 [DEBUG REFERRAL] send-otp (dev fallback) - Starting async referral creation');
              await createReferralRecordOnSignup(fullMobile, name, email, referralCode);
              console.log('✅ [DEBUG REFERRAL] send-otp (dev fallback) - Referral creation completed');
            } catch (err) {
              console.error('❌ [DEBUG REFERRAL] send-otp (dev fallback) - Error creating referral:', {
                error: err.message,
                stack: err.stack,
                mobile: fullMobile,
                referralCode: referralCode
              });
            }
          });
        } else {
          console.log('⚠️ [DEBUG REFERRAL] send-otp (dev fallback) - Referral creation skipped:', {
            reason: !referralCode ? 'No referral code' : 
                    !isNewUser ? 'Existing user' : 
                    !name ? 'No name provided' : 
                    mongoose.connection.readyState !== 1 ? 'MongoDB not connected' : 'Unknown'
          });
        }

        return res.json({
          success: true,
          message: 'OTP sent successfully (DEV MODE)',
          verificationId: 'DEV-' + Date.now(),
          isNewUser,
          mobile: fullMobile,
          devMode: true
        });
      }

      return res.status(500).json({ 
        error: 'Failed to send OTP',
        message: error.response?.data?.message || error.message
      });
    }

  } catch (error) {
    console.error('❌ [AUTH] Send OTP error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Verify OTP and login/signup
app.post('/api/auth/verify-otp', async (req, res) => {
  // Ensure response is sent even if there's an error
  let responseSent = false;
  
  const sendResponse = (status, data) => {
    if (!responseSent) {
      responseSent = true;
      res.status(status).json(data);
      // Ensure response is fully sent before continuing
      if (res.flushHeaders) {
        res.flushHeaders();
      }
      return;
    }
  };

  try {
    const { mobile, otp, verificationId, countryCode = '91' } = req.body;

    // Validation
    if (!mobile || !otp || !verificationId) {
      return sendResponse(400, { 
        error: 'Missing required fields',
        message: 'Mobile, OTP, and verification ID are required'
      });
    }

    if (otp.length !== 4) {
      return sendResponse(400, { 
        error: 'Invalid OTP',
        message: 'OTP must be 4 digits'
      });
    }

    const fullMobile = mobile.startsWith('+') ? mobile : `${countryCode}${mobile}`;
    console.log(`🔐 [AUTH] Verifying OTP for ${fullMobile}`);

    // Get OTP session
    const sessions = getOtpSessions();
    console.log('🔍 [DEBUG REFERRAL] OTP sessions available:', {
      totalSessions: sessions.sessions.length,
      sessions: sessions.sessions.map(s => ({
        mobile: s.mobile,
        verificationId: s.verificationId,
        hasReferralCode: !!s.referralCode,
        referralCode: s.referralCode,
        isNewUser: s.isNewUser
      }))
    });
    
    const session = sessions.sessions.find(s => 
      s.mobile === fullMobile && s.verificationId === verificationId
    );
    
    console.log('🔍 [DEBUG REFERRAL] OTP session lookup:', {
      searchedMobile: fullMobile,
      searchedVerificationId: verificationId,
      sessionFound: !!session,
      sessionReferralCode: session?.referralCode,
      sessionIsNewUser: session?.isNewUser,
      sessionMobile: session?.mobile,
      sessionVerificationId: session?.verificationId
    });

    if (!session) {
      return sendResponse(400, { 
        error: 'Invalid session',
        message: 'OTP session not found or expired'
      });
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      return sendResponse(400, { 
        error: 'OTP expired',
        message: 'Please request a new OTP'
      });
    }

    // Verify OTP
    let otpValid = false;

    // Development mode: accept "0000" as valid OTP if otp_development is true
    if (otp_development && otp === '0000') {
      otpValid = true;
      console.log('🧪 [AUTH] Development mode: OTP "0000" accepted (otp_development = true)');
    } else {
      // Special test account for Play Store testing
      const testPhoneNumber = '9205301151';
      const testOtp = '0000';
      const cleanMobile = mobile.replace(/^\+?91/, '').replace(/\s+/g, '');
      
      if (cleanMobile === testPhoneNumber && otp === testOtp) {
        otpValid = true;
        console.log('🧪 [AUTH] Play Store test account verified (9205301151 with OTP 0000)');
      } else if (session.devMode) {
        // Development mode
        otpValid = otp === session.devOtp;
        console.log('⚠️  [AUTH] Development mode OTP verification');
      } else {
        // Production mode - verify with MessageCentral
        try {
          const response = await axios.get(
            `${MESSAGE_CENTRAL_CONFIG.baseUrl}/validateOtp`,
            {
              params: {
                countryCode: countryCode,
                mobileNumber: mobile.replace(`+${countryCode}`, ''),
                verificationId: verificationId,
                customerId: MESSAGE_CENTRAL_CONFIG.customerId,
                code: otp
              },
              headers: {
                'authToken': MESSAGE_CENTRAL_CONFIG.authToken
              },
              timeout: 10000 // 10 second timeout
            }
          );

          console.log('✅ [AUTH] OTP verification response:', response.data);
          otpValid = response.data.data?.verificationStatus === 'VERIFICATION_COMPLETED';

        } catch (error) {
          console.error('❌ [AUTH] OTP verification error:', error.response?.data || error.message);
          
          // In development, accept any 4-digit OTP
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  [AUTH] Development fallback - accepting OTP');
            otpValid = true;
          } else {
            return sendResponse(400, { 
              error: 'OTP verification failed',
              message: error.response?.data?.message || 'Invalid OTP'
            });
          }
        }
      }
    }

    if (!otpValid) {
      return sendResponse(400, { 
        error: 'Invalid OTP',
        message: 'The OTP you entered is incorrect'
      });
    }

    // OTP is valid - create or update user
    const usersData = getUsers();
    let user = usersData.users.find(u => u.mobile === fullMobile);
    const isNewUser = !user;
    const referralCode = req.body.referralCode || session?.referralCode;
    
    // DEBUG: Log referral code processing info
    console.log('🔍 [DEBUG REFERRAL] OTP verify - User details:', {
      mobile: fullMobile,
      isNewUser,
      referralCodeFromBody: req.body.referralCode,
      referralCodeFromSession: session?.referralCode,
      finalReferralCode: referralCode,
      hasFinalReferralCode: !!referralCode,
      userId: user?.id,
      userName: user?.name || session?.name,
      requestBody: {
        mobile: req.body.mobile,
        otp: req.body.otp ? '***' : undefined,
        verificationId: req.body.verificationId,
        referralCode: req.body.referralCode
      }
    });

    if (!user) {
      // Create new user
      user = {
        id: Date.now().toString(),
        mobile: fullMobile,
        name: session.name,
        email: session.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };
      usersData.users.push(user);
      console.log('✅ [AUTH] New user created:', user.id);
    } else {
      // Update existing user
      user.updatedAt = new Date().toISOString();
      user.isActive = true;
      console.log('✅ [AUTH] Existing user logged in:', user.id);
    }

    saveUsers(usersData);

    // Clean up OTP session
    sessions.sessions = sessions.sessions.filter(s => s.verificationId !== verificationId);
    saveOtpSessions(sessions);

    // Generate JWT token (no expiry)
    const token = jwt.sign(
      { 
        userId: user.id,
        mobile: user.mobile,
        name: user.name
      },
      JWT_SECRET
      // No expiresIn - token never expires unless user logs out
    );

    // IMPORTANT: Send response FIRST before any lengthy async operations
    // This prevents "failed to fetch" errors if nodemon restarts during referral processing
    const responseData = {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      isNewUser: session.isNewUser
    };
    
    // Store variables in closure for async processing (BEFORE sending response)
    const referralCodeForProcessing = referralCode;
    const fullMobileForProcessing = fullMobile;
    const isNewUserForProcessing = isNewUser;
    const sessionForProcessing = session;
    const userForProcessing = user;
    
    console.log('📤 [RESPONSE] About to send response, will process referral async:', {
      hasReferralCode: !!referralCodeForProcessing,
      referralCode: referralCodeForProcessing,
      mobile: fullMobileForProcessing,
      isNewUser: isNewUserForProcessing
    });
    
    // Send response immediately and ensure it's flushed
    console.log('📤 [DEBUG AUTH] Sending verify-otp response to client:', {
      success: responseData.success,
      hasToken: !!responseData.token,
      userId: responseData.user.id,
      mobile: responseData.user.mobile,
      isNewUser: responseData.isNewUser
    });
    sendResponse(200, responseData);
    console.log('✅ [DEBUG AUTH] Response sent successfully');
    
    // Ensure response is fully sent before starting async work
    // Use process.nextTick to ensure response is flushed to client
    process.nextTick(() => {
      // NOW process referral asynchronously AFTER response is fully sent
      // This prevents "failed to fetch" errors during nodemon restarts
      // Wrap ALL referral processing in setImmediate so response is fully sent first
      setImmediate(async () => {
        console.log('🔄 [ASYNC] Async referral processing started:', {
          hasReferralCode: !!referralCodeForProcessing,
          referralCode: referralCodeForProcessing,
          mobile: fullMobileForProcessing,
          isNewUser: isNewUserForProcessing,
          mongoState: mongoose.connection.readyState,
          mongoStateName: mongoose.connection.readyState === 1 ? 'connected' : mongoose.connection.readyState === 0 ? 'disconnected' : mongoose.connection.readyState === 2 ? 'connecting' : 'unknown'
        });
        try {
          // Handle referral code - check MongoDB to determine if referral should be processed
          // Process referral if:
          // 1. User doesn't exist in MongoDB yet, OR
          // 2. User exists but doesn't have a referral record for this code yet
          console.log('🔍 [DEBUG REFERRAL] Background async - Checking referral code conditions:', {
            isNewUser: isNewUserForProcessing,
            hasReferralCode: !!referralCodeForProcessing,
            referralCode: referralCodeForProcessing,
            willProcess: !!referralCodeForProcessing,
            mobile: fullMobileForProcessing
          });
          
          if (referralCodeForProcessing) {
            try {
              // Use stored variables - redefine at the top of the block
              const referralCode = referralCodeForProcessing;
              const fullMobile = fullMobileForProcessing;
              const isNewUser = isNewUserForProcessing;
              const session = sessionForProcessing;
              const user = userForProcessing;
              
              // Wait for MongoDB connection if it's connecting (nodemon restart scenario)
              let mongoState = mongoose.connection.readyState;
        console.log('🔍 [DEBUG REFERRAL] Initial MongoDB connection state:', {
          state: mongoState,
          stateName: mongoState === 1 ? 'connected' : mongoState === 0 ? 'disconnected' : mongoState === 2 ? 'connecting' : 'unknown',
          willProceed: mongoState === 1
        });
        
        // If MongoDB is connecting, wait for it (max 5 seconds)
        if (mongoState === 2) {
          console.log('⏳ [REFERRAL] MongoDB is connecting, waiting for connection (max 5 seconds)...');
          let waitTime = 0;
          const maxWaitTime = 5000; // 5 seconds
          const checkInterval = 100; // Check every 100ms
          
          while (mongoState === 2 && waitTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waitTime += checkInterval;
            mongoState = mongoose.connection.readyState;
            
            // Log progress every 500ms
            if (waitTime % 500 === 0 && mongoState === 2) {
              console.log(`⏳ [REFERRAL] Still waiting for MongoDB... (${waitTime}ms/${maxWaitTime}ms)`);
            }
            
            if (mongoState === 1) {
              console.log('✅ [REFERRAL] MongoDB connected after waiting:', {
                waitTime: waitTime + 'ms',
                state: mongoState
              });
              break;
            }
            
            // Check if disconnected (state 0) - server might have restarted
            if (mongoState === 0) {
              console.warn('⚠️ [REFERRAL] MongoDB disconnected during wait (server restart?). Request will be aborted.');
              break;
            }
          }
          
          if (mongoState !== 1) {
            console.log('🔍 [DEBUG REFERRAL] MongoDB connection state after wait:', {
              state: mongoState,
              stateName: mongoState === 1 ? 'connected' : mongoState === 0 ? 'disconnected' : mongoState === 2 ? 'connecting' : 'unknown',
              waitTime: waitTime + 'ms',
              timedOut: waitTime >= maxWaitTime
            });
          }
        }
        
        if (mongoState !== 1) {
          console.warn('⚠️ [REFERRAL] MongoDB not connected, skipping referral processing:', {
            state: mongoState,
            stateName: mongoState === 1 ? 'connected' : mongoState === 0 ? 'disconnected' : mongoState === 2 ? 'connecting' : 'unknown'
          });
        } else {
          console.log('🎯 [REFERRAL] Processing referral code for new user:', {
            mobile: fullMobile,
            referralCode: referralCode.trim().toUpperCase(),
            isNewUser,
            normalizedCode: referralCode.trim().toUpperCase()
          });
          
          // Normalize mobile to find MongoDB user
          const normalizedMobile = String(fullMobile).replace(/\D/g, '').slice(-10);
          console.log('🔍 [DEBUG REFERRAL] Mobile normalization:', {
            originalMobile: fullMobile,
            normalizedMobile: normalizedMobile,
            regexPattern: `${normalizedMobile}$`
          });
          
          // Find or create MongoDB user
          console.log('🔍 [DEBUG REFERRAL] Searching for MongoDB user...');
          let mongoUser = await User.findOne({ 
            mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
          });
          console.log('🔍 [DEBUG REFERRAL] MongoDB user search result:', {
            found: !!mongoUser,
            userId: mongoUser?._id?.toString(),
            mobile: mongoUser?.mobile,
            hasReferralCode: !!mongoUser?.referralCode,
            isFirstBookingDone: mongoUser?.is_first_booking_done,
            referredCode: mongoUser?.referred_code,
            usedReferralCode: mongoUser?.usedReferralCode
          });

          // Check if referral already exists for this user and code
          let existingReferral = null;
          if (mongoUser) {
            const codeToSearch = referralCode.trim().toUpperCase();
            existingReferral = await Referral.findOne({
              referee: mongoUser._id,
              referralCode: codeToSearch
            });
            console.log('🔍 [DEBUG REFERRAL] Checking for existing referral record:', {
              hasMongoUser: !!mongoUser,
              mongoUserId: mongoUser?._id?.toString(),
              searchedCode: codeToSearch,
              existingReferralFound: !!existingReferral,
              existingReferralId: existingReferral?._id?.toString(),
              existingReferralStatus: existingReferral?.status
            });
          }

          // Update existing referral from 'pending' to 'loggedin' if OTP is verified
          console.log('🔵 [DEBUG REFERRAL] ===== verify-otp: Processing existing referral =====');
          if (existingReferral) {
            console.log('🔍 [DEBUG REFERRAL] verify-otp - Existing referral found:', {
              referralId: existingReferral._id.toString(),
              currentStatus: existingReferral.status,
              referrerId: existingReferral.referrer.toString(),
              refereeId: existingReferral.referee.toString(),
              referralCode: existingReferral.referralCode,
              signedUpAt: existingReferral.signedUpAt,
              loggedInAt: existingReferral.loggedInAt,
              createdAt: existingReferral.createdAt
            });

            if (existingReferral.status === 'pending') {
              console.log('🔄 [DEBUG REFERRAL] verify-otp - Updating status from pending to loggedin');
              const beforeUpdate = {
                status: existingReferral.status,
                loggedInAt: existingReferral.loggedInAt
              };

              // Update status to 'loggedin' when OTP is verified
              existingReferral.status = 'loggedin';
              existingReferral.loggedInAt = new Date();
              await existingReferral.save();

              // Verify the update
              const updatedReferral = await Referral.findById(existingReferral._id);
              console.log('✅ [DEBUG REFERRAL] verify-otp - Referral status updated successfully:', {
                referralId: existingReferral._id.toString(),
                before: beforeUpdate,
                after: {
                  status: updatedReferral.status,
                  loggedInAt: updatedReferral.loggedInAt
                },
                refereeId: mongoUser._id.toString(),
                refereeMobile: mongoUser.mobile,
                referralCode: existingReferral.referralCode,
                timeDifference: updatedReferral.loggedInAt ? 
                  `${Math.round((updatedReferral.loggedInAt - existingReferral.signedUpAt) / 1000)}s between signup and login` : 'N/A'
              });
              console.log('🟢 [DEBUG REFERRAL] ===== verify-otp: Status update complete =====');
            } else {
              console.log('ℹ️ [DEBUG REFERRAL] verify-otp - Referral already has non-pending status:', {
                referralId: existingReferral._id.toString(),
                currentStatus: existingReferral.status,
                refereeId: mongoUser._id.toString(),
                referralCode: existingReferral.referralCode,
                loggedInAt: existingReferral.loggedInAt,
                message: 'No status update needed'
              });
              console.log('🟡 [DEBUG REFERRAL] ===== verify-otp: No update needed =====');
            }
            // Skip creating new referral if already exists
          } else {
            console.log('ℹ️ [DEBUG REFERRAL] verify-otp - No existing referral found, will create new one if conditions met');
          }

          if (!mongoUser) {
            console.log('👤 [REFERRAL] Creating new MongoDB user for:', fullMobile);
            mongoUser = new User({
              mobile: fullMobile,
              name: session.name || fullMobile,
              email: session.email || undefined,
              isActive: true,
              is_first_booking_done: false // New user hasn't completed first booking yet
            });
            
            // Save user first to get ID
            await mongoUser.save();
            console.log('✅ [REFERRAL] MongoDB user created:', {
              userId: mongoUser._id.toString(),
              mobile: mongoUser.mobile
            });
            
            // Generate referral code based on user ID (deterministic and unique)
            if (!mongoUser.referralCode) {
              mongoUser.referralCode = await generateReferralCode(mongoUser._id);
              await mongoUser.save();
              console.log('✅ [REFERRAL] Generated referral code for new user:', mongoUser.referralCode);
            }
          } else {
            // User exists - generate referral code if missing
            if (!mongoUser.referralCode) {
              console.log('👤 [REFERRAL] Generating referral code for existing user:', mongoUser.mobile);
              mongoUser.referralCode = await generateReferralCode(mongoUser._id);
              await mongoUser.save();
              console.log('✅ [REFERRAL] Generated referral code:', mongoUser.referralCode);
            } else {
              console.log('👤 [REFERRAL] Using existing MongoDB user:', {
                userId: mongoUser._id.toString(),
                mobile: mongoUser.mobile,
                referralCode: mongoUser.referralCode
              });
            }
          }

          // Now process referral if mongoUser exists and referral doesn't exist yet
          if (!mongoUser) {
            console.warn('⚠️ [REFERRAL] MongoDB user not found, cannot process referral');
          } else if (existingReferral && existingReferral.status !== 'pending') {
            // Referral exists and is not pending, skip processing
            console.log('ℹ️ [REFERRAL] Referral already processed, skipping');
          } else if (existingReferral && existingReferral.status === 'pending') {
            // Already updated to 'loggedin' above, skip creating new one
            console.log('ℹ️ [REFERRAL] Referral updated to loggedin, skipping creation');
          } else {
            // Find referrer by referral code (exact match, case-insensitive)
            const codeToSearch = referralCode.trim().toUpperCase();
            console.log('🔍 [REFERRAL] Searching for referrer with code:', {
              originalCode: referralCode,
              trimmedCode: referralCode.trim(),
              upperCode: codeToSearch,
              codeLength: codeToSearch.length,
              expectedFormat: 'SAFAR + 6 chars = 11 total'
            });
            
            // Debug: Check if code exists in database
            const allReferralCodes = await User.find({ 
              referralCode: { $exists: true, $ne: null } 
            }).select('mobile referralCode').limit(20);
            console.log('🔍 [DEBUG REFERRAL] Sample referral codes in DB:', {
              total: allReferralCodes.length,
              codes: allReferralCodes.map(u => ({
                mobile: u.mobile,
                code: u.referralCode,
                matches: u.referralCode?.toUpperCase() === codeToSearch
              }))
            });
            
            // Try exact match first (faster)
            let referrer = await User.findOne({ 
              referralCode: codeToSearch
            });
            
            console.log('🔍 [DEBUG REFERRAL] Exact match search result:', {
              found: !!referrer,
              userId: referrer?._id?.toString(),
              mobile: referrer?.mobile,
              code: referrer?.referralCode
            });
            
            // If not found, try case-insensitive regex search
            if (!referrer) {
              const regexPattern = `^${codeToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
              console.log('🔍 [DEBUG REFERRAL] Trying regex search:', {
                pattern: regexPattern,
                flags: 'i'
              });
              
              referrer = await User.findOne({ 
                referralCode: { $regex: new RegExp(regexPattern, 'i') }
              });
              
              console.log('🔍 [DEBUG REFERRAL] Regex match search result:', {
                found: !!referrer,
                userId: referrer?._id?.toString(),
                mobile: referrer?.mobile,
                code: referrer?.referralCode
              });
            }
            
            // Also try with any whitespace removed
            if (!referrer) {
              const cleanedCode = codeToSearch.replace(/\s/g, '');
              if (cleanedCode !== codeToSearch) {
                console.log('🔍 [DEBUG REFERRAL] Trying cleaned code:', cleanedCode);
                referrer = await User.findOne({ 
                  referralCode: cleanedCode
                });
              }
            }
            
            console.log('🔍 [REFERRAL] Referrer lookup result:', {
              found: !!referrer,
              referrerId: referrer?._id?.toString(),
              referrerMobile: referrer?.mobile,
              referrerCode: referrer?.referralCode,
              refereeId: mongoUser._id.toString(),
              refereeMobile: mongoUser.mobile
            });
            
            // Process referral if we have mongoUser and no existing referral
            if (referrer && referrer._id.toString() !== mongoUser._id.toString()) {
              console.log('🎯 [REFERRAL DEBUG] === REFERRAL CODE DETAILS ===');
              console.log('🔍 [REFERRAL DEBUG] Referral Code:', {
                code: referralCode.trim().toUpperCase(),
                original: referralCode,
                trimmed: referralCode.trim(),
                upper: referralCode.trim().toUpperCase()
              });
              
              console.log('👤 [REFERRAL DEBUG] Referrer Account (Who shared the code):', {
                userId: referrer._id.toString(),
                mobile: referrer.mobile,
                name: referrer.name,
                referralCode: referrer.referralCode,
                referralStats: {
                  totalReferrals: referrer.referralStats?.totalReferrals || 0,
                  currentCycleReferrals: referrer.referralStats?.currentCycleReferrals || 0,
                  currentCycle: referrer.referralStats?.currentCycle || 1
                }
              });
              
              console.log('👤 [REFERRAL DEBUG] Referee Account (Who is using the code):', {
                userId: mongoUser._id.toString(),
                mobile: mongoUser.mobile,
                name: mongoUser.name,
                isNewUser: true,
                currentReferralCode: mongoUser.referralCode,
                usedReferralCode: mongoUser.usedReferralCode,
                referred_code: mongoUser.referred_code,
                is_first_booking_done: mongoUser.is_first_booking_done
              });
              
              // Get referrer's current cycle
              const currentCycle = referrer.referralStats?.currentCycle || 1;
              
              console.log('🔵 [DEBUG REFERRAL] ===== verify-otp: Creating new referral record =====');
              console.log('📝 [DEBUG REFERRAL] verify-otp - Creating Referral Record (new, not from send-otp):', {
                referrerId: referrer._id.toString(),
                referrerMobile: referrer.mobile,
                referrerName: referrer.name,
                refereeId: mongoUser._id.toString(),
                refereeMobile: mongoUser.mobile,
                refereeName: mongoUser.name,
                referralCode: referralCode.trim().toUpperCase(),
                status: 'loggedin', // OTP already verified, so status is 'loggedin'
                cycleNumber: currentCycle,
                reason: 'No existing referral found, creating new one with loggedin status'
              });
              
              // Create referral with 'loggedin' status since OTP is already verified
              const referral = new Referral({
                referrer: referrer._id,
                referee: mongoUser._id,
                referralCode: referralCode.trim().toUpperCase(),
                status: 'loggedin',
                cycleNumber: currentCycle,
                signedUpAt: new Date(),
                loggedInAt: new Date() // Set logged in time since OTP is verified
              });
              
              console.log('💾 [DEBUG REFERRAL] verify-otp - Saving Referral Record to Database...');
              await referral.save();
              
              // Verify the save
              const savedReferral = await Referral.findById(referral._id).populate('referrer', 'name mobile').populate('referee', 'name mobile');
              console.log('✅ [DEBUG REFERRAL] verify-otp - Referral record created successfully:', {
                referralId: referral._id.toString(),
                referrerId: referrer._id.toString(),
                referrerMobile: referrer.mobile,
                refereeId: mongoUser._id.toString(),
                refereeMobile: mongoUser.mobile,
                referralCode: referralCode.trim().toUpperCase(),
                status: 'loggedin',
                cycleNumber: currentCycle,
                signedUpAt: referral.signedUpAt,
                loggedInAt: referral.loggedInAt,
                createdAt: referral.createdAt,
                verified: savedReferral ? 'Yes' : 'No',
                note: 'Created directly with loggedin status (OTP already verified)'
              });
              console.log('🟢 [DEBUG REFERRAL] ===== verify-otp: New referral creation complete =====');
              
              console.log('✅ [REFERRAL DEBUG] Referral Record Saved Successfully:', {
                referralId: referral._id.toString(),
                referrerId: referral.referrer.toString(),
                refereeId: referral.referee.toString(),
                referralCode: referral.referralCode,
                status: referral.status,
                cycleNumber: referral.cycleNumber,
                createdAt: referral.createdAt
              });
              
              // Verify referral was saved by querying it back
              console.log('🔍 [REFERRAL DEBUG] Verifying Referral Record in Database...');
              const verifyReferral = await Referral.findById(referral._id)
                .populate('referrer', 'name mobile referralCode')
                .populate('referee', 'name mobile');
              
              console.log('✅ [REFERRAL DEBUG] Verification Result - Referral Record:', {
                found: !!verifyReferral,
                referralId: verifyReferral?._id?.toString(),
                referrer: {
                  id: verifyReferral?.referrer?._id?.toString(),
                  mobile: verifyReferral?.referrer?.mobile,
                  name: verifyReferral?.referrer?.name,
                  referralCode: verifyReferral?.referrer?.referralCode
                },
                referee: {
                  id: verifyReferral?.referee?._id?.toString(),
                  mobile: verifyReferral?.referee?.mobile,
                  name: verifyReferral?.referee?.name
                },
                status: verifyReferral?.status,
                referralCode: verifyReferral?.referralCode,
                cycleNumber: verifyReferral?.cycleNumber,
                createdAt: verifyReferral?.createdAt
              });
              
              // Update referrer stats
              console.log('📊 [REFERRAL DEBUG] Updating Referrer Stats:', {
                before: {
                  totalReferrals: referrer.referralStats?.totalReferrals || 0,
                  currentCycleReferrals: referrer.referralStats?.currentCycleReferrals || 0,
                  currentCycle: referrer.referralStats?.currentCycle || 1
                }
              });
              
              referrer.referralStats = referrer.referralStats || {
                totalReferrals: 0,
                completedReferrals: 0,
                rewardedReferrals: 0,
                currentCycleReferrals: 0,
                currentCycle: 1,
                totalRewardsEarned: 0
              };
              
              const oldTotalReferrals = referrer.referralStats.totalReferrals || 0;
              const oldCycleReferrals = referrer.referralStats.currentCycleReferrals || 0;
              
              referrer.referralStats.totalReferrals = oldTotalReferrals + 1;
              referrer.referralStats.currentCycleReferrals = oldCycleReferrals + 1;
              
              console.log('📊 [REFERRAL DEBUG] Referrer Stats After Update:', {
                after: {
                  totalReferrals: referrer.referralStats.totalReferrals,
                  currentCycleReferrals: referrer.referralStats.currentCycleReferrals,
                  currentCycle: referrer.referralStats.currentCycle
                },
                changes: {
                  totalReferrals: `+1 (${oldTotalReferrals} → ${referrer.referralStats.totalReferrals})`,
                  currentCycleReferrals: `+1 (${oldCycleReferrals} → ${referrer.referralStats.currentCycleReferrals})`
                }
              });
              
              await referrer.save();
              console.log('✅ [REFERRAL DEBUG] Referrer Stats Saved Successfully');
              
              // Update referee's used referral code and referred_code
              const referralCodeUpper = referralCode.trim().toUpperCase();
              
              console.log('📝 [REFERRAL DEBUG] Updating Referee User Fields:', {
                userId: mongoUser._id.toString(),
                mobile: mongoUser.mobile,
                before: {
                  usedReferralCode: mongoUser.usedReferralCode,
                  referred_code: mongoUser.referred_code,
                  is_first_booking_done: mongoUser.is_first_booking_done
                },
                willSet: {
                  usedReferralCode: referralCodeUpper,
                  referred_code: referralCodeUpper,
                  is_first_booking_done: false
                }
              });
              
              mongoUser.usedReferralCode = referralCodeUpper;
              mongoUser.referred_code = referralCodeUpper;
              // Set is_first_booking_done to false for new users
              mongoUser.is_first_booking_done = false;
              
              console.log('💾 [REFERRAL DEBUG] Saving Referee User with Referral Code...');
              await mongoUser.save();
              
              console.log('📝 [REFERRAL DEBUG] Referee User Fields After Update:', {
                after: {
                  usedReferralCode: mongoUser.usedReferralCode,
                  referred_code: mongoUser.referred_code,
                  is_first_booking_done: mongoUser.is_first_booking_done
                },
                changes: {
                  usedReferralCode: `${mongoUser.usedReferralCode || 'null'} → ${referralCodeUpper}`,
                  referred_code: `${mongoUser.referred_code || 'null'} → ${referralCodeUpper}`,
                  is_first_booking_done: `${mongoUser.is_first_booking_done} → false`
                }
              });
              
              // Verify the save
              console.log('🔍 [REFERRAL DEBUG] Verifying Referee User Fields in Database...');
              const verifyUser = await User.findById(mongoUser._id);
              console.log('✅ [REFERRAL DEBUG] Verification Result - Referee User:', {
                userId: verifyUser._id.toString(),
                mobile: verifyUser.mobile,
                usedReferralCode: verifyUser.usedReferralCode,
                referred_code: verifyUser.referred_code,
                is_first_booking_done: verifyUser.is_first_booking_done,
                verificationSuccess: verifyUser.usedReferralCode === referralCodeUpper && 
                                     verifyUser.referred_code === referralCodeUpper &&
                                     verifyUser.is_first_booking_done === false
              });
              
              console.log('🎉 [REFERRAL DEBUG] === REFERRAL PROCESS COMPLETED ===');
              console.log('✅ [REFERRAL DEBUG] Summary:', {
                referralCode: referralCodeUpper,
                referrer: {
                  mobile: referrer.mobile,
                  name: referrer.name,
                  userId: referrer._id.toString()
                },
                referee: {
                  mobile: mongoUser.mobile,
                  name: mongoUser.name,
                  userId: mongoUser._id.toString()
                },
                referralRecordId: referral._id.toString(),
                status: 'pending',
                nextStep: 'Wait for referee to complete first booking'
              });
              
              console.log('🎯 [REFERRAL] Created referral:', {
                referrer: referrer.mobile,
                referee: mongoUser.mobile,
                code: referralCode
              });
            } else if (!referrer) {
              console.warn('❌ [REFERRAL DEBUG] === REFERRAL FAILED ===');
              console.warn('⚠️ [REFERRAL DEBUG] Referrer Not Found:', {
                searchedCode: codeToSearch,
                codeLength: codeToSearch.length,
                expectedFormat: 'SAFAR + 6 chars = 11 total',
                actualFormat: `${codeToSearch.substring(0, 5)} + ${codeToSearch.length - 5} chars = ${codeToSearch.length} total`,
                referee: {
                  userId: mongoUser._id.toString(),
                  mobile: mongoUser.mobile,
                  name: mongoUser.name
                }
              });
              
              // Log all referral codes for debugging (remove in production)
              const allCodes = await User.find({ referralCode: { $exists: true, $ne: null } }).select('mobile referralCode').limit(10);
              console.log('📋 [REFERRAL DEBUG] Sample referral codes in database:', {
                totalCodesFound: allCodes.length,
                codes: allCodes.map(u => ({
                  mobile: u.mobile,
                  code: u.referralCode,
                  codeLength: u.referralCode?.length,
                  matches: u.referralCode?.toUpperCase() === codeToSearch
                }))
              });
            } else {
              console.warn('❌ [REFERRAL DEBUG] === REFERRAL FAILED ===');
              console.warn('⚠️ [REFERRAL DEBUG] Self-Referral Detected:', {
                userId: mongoUser._id.toString(),
                mobile: mongoUser.mobile,
                name: mongoUser.name,
                searchedCode: codeToSearch,
                userReferralCode: mongoUser.referralCode,
                message: 'User trying to refer themselves (not allowed)'
              });
            }
          }
        }
            } catch (refErr) {
              console.error('❌ [REFERRAL] Error creating referral:', {
                error: refErr.message,
                stack: refErr.stack,
                mobile: fullMobile,
                referralCode: referralCode,
                isNewUser: isNewUser,
                errorName: refErr.name,
                errorCode: refErr.code,
                mongoState: mongoose.connection.readyState
              });
              // Don't fail signup if referral fails
            }
          } else {
            console.log('ℹ️ [REFERRAL] No referral code provided:', {
              mobile: fullMobileForProcessing,
              isNewUser: isNewUserForProcessing
            });
          }
          
          // Also ensure MongoDB user exists and has referral code (separate from referral processing)
          try {
        // Check if MongoDB is connected before making queries
        if (mongoose.connection.readyState === 1) {
          const normalizedMobile = String(fullMobileForProcessing).replace(/\D/g, '').slice(-10);
          let mongoUser = await User.findOne({ 
            mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
          });
        
          if (!mongoUser) {
            mongoUser = new User({
              mobile: fullMobileForProcessing,
              name: sessionForProcessing?.name || userForProcessing?.name || fullMobileForProcessing,
              email: sessionForProcessing?.email || userForProcessing?.email || undefined,
              isActive: true,
              is_first_booking_done: false // New user hasn't completed first booking yet
            });
            
            // Save user first to get ID
            await mongoUser.save();
        
            // Generate referral code based on user ID (deterministic and unique)
            if (!mongoUser.referralCode) {
              mongoUser.referralCode = await generateReferralCode(mongoUser._id);
              await mongoUser.save();
            }
          } else if (!mongoUser.referralCode) {
            // Generate referral code for existing user based on their ID
            mongoUser.referralCode = await generateReferralCode(mongoUser._id);
            await mongoUser.save();
          }
        } else {
          console.warn('⚠️ [AUTH] MongoDB not connected, skipping MongoDB user sync');
        }
          } catch (mongoErr) {
            console.error('❌ [AUTH] Error ensuring MongoDB user:', mongoErr);
            // Don't fail signup if MongoDB sync fails
          }
        } catch (bgErr) {
          console.error('❌ [AUTH] Background processing error:', {
            error: bgErr.message,
            stack: bgErr.stack,
            errorName: bgErr.name,
            mobile: fullMobileForProcessing,
            referralCode: referralCodeForProcessing
          });
        }
      });
    });
    
    // Return after sending response (all referral/MongoDB processing happens async)
    return;

  } catch (error) {
    console.error('❌ [AUTH] Verify OTP error:', error);
    return sendResponse(500, { 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Verify token (check if user is authenticated)
app.get('/api/auth/verify-token', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUsers().users.find(u => u.id === decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        authenticated: false,
        error: 'User not found or inactive'
      });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(401).json({ 
      authenticated: false,
      error: 'Invalid token'
    });
  }
});

// Device registration (public)
app.post('/api/devices/register', async (req, res) => {
  try {
    const {
      fcmToken,
      platform = 'unknown',
      appVersion,
      deviceModel,
      osVersion,
      userMobile
    } = req.body || {};

    // Upsert by fcmToken if provided, else by userMobile + deviceModel combo
    const query = fcmToken ? { fcmToken } : (userMobile && deviceModel ? { userMobile, deviceModel } : {});

    let device;
    if (Object.keys(query).length > 0) {
      device = await Device.findOneAndUpdate(query, {
        $set: {
          platform,
          appVersion,
          deviceModel,
          osVersion,
          userMobile,
          isActive: true,
          lastSeenAt: new Date(),
        }
      }, { new: true, upsert: true });
    } else {
      device = await Device.create({
        fcmToken,
        platform,
        appVersion,
        deviceModel,
        osVersion,
        userMobile,
        isActive: true,
        lastSeenAt: new Date(),
      });
    }

    return res.json({
      success: true,
      message: 'Device registered',
      device: {
        id: device._id,
        platform: device.platform,
        appVersion: device.appVersion,
        registeredAt: device.createdAt,
      }
    });
  } catch (error) {
    console.error('Device register error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register device' });
  }
});

// Device unregistration (public)
app.post('/api/devices/unregister', async (req, res) => {
  try {
    const { fcmToken } = req.body || {};
    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'fcmToken is required' });
    }
    const device = await Device.findOneAndUpdate({ fcmToken }, { $set: { isActive: false } }, { new: true });
    return res.json({ success: true, message: 'Device unregistered', deviceId: device?._id });
  } catch (error) {
    console.error('Device unregister error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unregister device' });
  }
});

// Admin: Send Push Notification
app.post('/api/admin/push-notifications/send', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 [PushNotification] Send request received:', {
      tokensCount: req.body.tokens?.length || 0,
      title: req.body.notification?.title,
      body: req.body.notification?.body
    });

    // Check if Firebase messaging is available
    if (!messaging) {
      console.error('❌ [PushNotification] Firebase messaging not initialized');
      return res.status(503).json({
        success: false,
        error: 'Firebase Admin SDK not initialized',
        message: 'Push notifications are not available. Please configure Firebase credentials in .env file (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
      });
    }

    const { tokens, notification, data } = req.body;

    // Validation
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokens',
        message: 'Tokens array is required and must not be empty'
      });
    }

    if (!notification || !notification.title || !notification.body) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification',
        message: 'Notification title and body are required'
      });
    }

    console.log(`📤 [PushNotification] Sending to ${tokens.length} device(s)`);
    console.log(`📝 [PushNotification] Notification: "${notification.title}" - "${notification.body}"`);
    if (data) {
      console.log(`📦 [PushNotification] Data:`, JSON.stringify(data, null, 2));
    }

    // Prepare message
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: data ? Object.entries(data).reduce((acc, [key, value]) => {
        acc[key] = String(value); // FCM data must be strings
        return acc;
      }, {}) : {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    let sent = 0;
    let failed = 0;
    const errors = [];

    // Send to each token
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      try {
        console.log(`📡 [PushNotification] Sending to token ${i + 1}/${tokens.length}: ${token.substring(0, 20)}...`);
        
        const result = await messaging.send({
          ...message,
          token: token
        });

        sent++;
        console.log(`✅ [PushNotification] Success for token ${i + 1}: ${result}`);
      } catch (error) {
        failed++;
        const errorMsg = error.message || 'Unknown error';
        console.error(`❌ [PushNotification] Failed for token ${i + 1}: ${errorMsg}`);
        errors.push({
          token: token.substring(0, 20) + '...',
          error: errorMsg,
          code: error.code
        });
      }
    }

    console.log(`📊 [PushNotification] Summary: ${sent} sent, ${failed} failed`);

    res.json({
      success: true,
      message: `Notification sent to ${sent} device(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      sent,
      failed,
      total: tokens.length,
      errors: failed > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ [PushNotification] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification',
      message: error.message
    });
  }
});

// Register/save logged-in user's FCM token (multiple devices)
app.post('/api/user/push/register', async (req, res) => {
  try {
    // Authenticate like other phone app endpoints
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }
      throw error;
    }

    // Find user in JSON file (like other phone endpoints)
    const jsonUser = getUsers().users.find(u => u.id === decoded.userId);
    
    if (!jsonUser || !jsonUser.isActive) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const { mobile, fcmToken, platform, deviceModel, appVersion } = req.body || {};

    if (!mobile || !fcmToken) {
      return res.status(400).json({ success: false, message: 'mobile and fcmToken are required' });
    }

    // Normalize mobile number to last 10 digits only (remove country code)
    // Handles: 9205301151, +919205301151, 919205301151 -> all become 9205301151
    const normalizedMobile = String(mobile).replace(/\D+/g, '').slice(-10);
    
    if (normalizedMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number format' });
    }

    // Normalize authenticated user's mobile to compare
    const jsonUserMobile = String(jsonUser.mobile).replace(/\D+/g, '').slice(-10);
    
    // Verify mobile matches authenticated user
    if (normalizedMobile !== jsonUserMobile) {
      return res.status(403).json({ success: false, error: 'Mobile number does not match authenticated user' });
    }

    // Find user in MongoDB (don't create if not found)
    // Search with normalized 10-digit number in various possible formats
    const mobileVariants = [
      normalizedMobile,
      `91${normalizedMobile}`,
      `+91${normalizedMobile}`,
      `+${normalizedMobile}`
    ];
    
    const mongoUser = await User.findOne({ 
      $or: [
        { mobile: { $in: mobileVariants } },
        { mobile: { $regex: new RegExp(normalizedMobile + '$') } }
      ]
    });
    
    if (!mongoUser) {
      return res.status(404).json({ success: false, error: 'User not found in database' });
    }

    // Remove existing token if present, then add new one
    await User.updateOne({ _id: mongoUser._id }, { $pull: { pushTokens: { token: fcmToken } } });
    await User.updateOne({ _id: mongoUser._id }, {
      $push: {
        pushTokens: {
          $each: [{ token: fcmToken, platform: platform || 'unknown', deviceModel: deviceModel || 'Unknown Device', appVersion: appVersion || '0.0.0', lastSeenAt: new Date(), createdAt: new Date() }],
          $position: 0
        }
      }
    });
    
    // Limit to 10 most recent tokens
    await User.updateOne({ _id: mongoUser._id }, { $push: { pushTokens: { $each: [], $slice: 10 } } });

    console.log('✅ [USER PUSH REGISTER] Token saved for user:', normalizedMobile);
    return res.json({ success: true, message: 'User push token saved' });
  } catch (error) {
    console.error('❌ [USER PUSH REGISTER] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save user push token', error: error.message });
  }
});

// Store logged-in user's latest location (mobile app)
app.post('/api/user/location', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('📍 [USER LOCATION] Request received', {
      hasAuthHeader: !!token,
      path: req.path,
      method: req.method
    });

    if (!token) {
      console.warn('📍 [USER LOCATION] Missing token');
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('📍 [USER LOCATION] Token decoded', {
        userId: decoded?.userId,
        type: decoded?.type || 'unknown'
      });
    } catch (error) {
      console.error('📍 [USER LOCATION] Token verification failed', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'Token expired' });
      }
      throw error;
    }

    const usersData = getUsers();
    const jsonUser = usersData.users.find(u => u.id === decoded.userId);
    console.log('📍 [USER LOCATION] Legacy user lookup', {
      found: !!jsonUser,
      userId: decoded.userId
    });

    if (!jsonUser || !jsonUser.isActive) {
      console.warn('📍 [USER LOCATION] User inactive or not found in legacy store', {
        userId: decoded.userId
      });
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      capturedAt,
      source,
      isMocked
    } = req.body || {};

    const isValidNumber = (value) => typeof value === 'number' && !Number.isNaN(value);

    if (!isValidNumber(latitude) || !isValidNumber(longitude)) {
      console.warn('📍 [USER LOCATION] Invalid coordinates in request', {
        latitude,
        longitude,
        bodyKeys: Object.keys(req.body || {})
      });
      return res.status(400).json({ success: false, error: 'latitude and longitude are required numbers' });
    }

    const normalizeMobileValue = (mobileNumber) => {
      if (!mobileNumber) return null;
      const cleaned = mobileNumber.toString().trim().replace(/^\+?91/, '').replace(/\D/g, '');
      if (!cleaned) return null;
      if (cleaned.length <= 10) return cleaned.slice(-10);
      return cleaned.slice(-10);
    };

    const normalizedMobile = normalizeMobileValue(jsonUser.mobile);
    const mobileCandidates = Array.from(new Set([
      jsonUser.mobile?.toString().trim(),
      normalizedMobile,
      normalizedMobile ? `+91${normalizedMobile}` : null,
      normalizedMobile ? `91${normalizedMobile}` : null,
      normalizedMobile ? `0${normalizedMobile}` : null
    ].filter(Boolean)));
    console.log('📍 [USER LOCATION] Mobile candidates prepared', {
      normalizedMobile,
      candidates: mobileCandidates
    });

    let mongoUser = null;
    if (mobileCandidates.length > 0) {
      console.log('📍 [USER LOCATION] Searching MongoDB user by candidates');
      mongoUser = await User.findOne({ mobile: { $in: mobileCandidates } });
    }

    if (!mongoUser && normalizedMobile) {
      console.log('📍 [USER LOCATION] Searching MongoDB user by regex', { normalizedMobile });
      mongoUser = await User.findOne({ mobile: { $regex: new RegExp(`${normalizedMobile}$`) } });
    }

    if (!mongoUser) {
      console.log('📍 [USER LOCATION] Mongo user not found, creating from legacy data');
      const newUserData = {
        mobile: jsonUser.mobile?.toString().trim(),
        name: jsonUser.name || jsonUser.mobile,
        isActive: jsonUser.isActive !== false
      };
      if (jsonUser.email && typeof jsonUser.email === 'string') {
        const trimmedEmail = jsonUser.email.trim().toLowerCase();
        if (trimmedEmail) {
          newUserData.email = trimmedEmail;
        }
      }
      mongoUser = new User(newUserData);
      // Save user first to get ID, then generate referral code
      await mongoUser.save();
      
      // Generate referral code based on user ID (deterministic and unique)
      if (!mongoUser.referralCode) {
        mongoUser.referralCode = await generateReferralCode(mongoUser._id);
        await mongoUser.save();
      }
    } else if (!mongoUser.referralCode) {
      // Generate referral code for existing user based on their ID
      mongoUser.referralCode = await generateReferralCode(mongoUser._id);
      await mongoUser.save();
    }
    
    console.log('📍 [USER LOCATION] Mongo user ready', {
      userId: mongoUser?._id,
      mobile: mongoUser?.mobile
    });

    const now = new Date();

    let capturedAtDate = now;
    if (capturedAt) {
      const parsedDate = new Date(capturedAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        capturedAtDate = parsedDate;
      }
    }

    const locationData = {
      latitude,
      longitude,
      accuracy: isValidNumber(accuracy) ? Number(accuracy) : undefined,
      altitude: isValidNumber(altitude) ? Number(altitude) : undefined,
      altitudeAccuracy: isValidNumber(altitudeAccuracy) ? Number(altitudeAccuracy) : undefined,
      heading: isValidNumber(heading) ? Number(heading) : undefined,
      speed: isValidNumber(speed) ? Number(speed) : undefined,
      capturedAt: capturedAtDate,
      source: typeof source === 'string' ? source.trim().slice(0, 120) : undefined,
      isMocked: typeof isMocked === 'boolean' ? isMocked : undefined,
      updatedAt: now
    };

    Object.keys(locationData).forEach((key) => {
      if (locationData[key] === undefined || locationData[key] === null) {
        delete locationData[key];
      }
    });

    let resolvedState = mongoUser.lastKnownState || mongoUser.lastKnownLocation?.state || null;
    const previousLatitude = mongoUser.lastKnownLocation?.latitude;
    const previousLongitude = mongoUser.lastKnownLocation?.longitude;
    const hasPreviousCoords = typeof previousLatitude === 'number' && typeof previousLongitude === 'number';
    const hasMovedSignificantly = !hasPreviousCoords ||
      Math.abs(previousLatitude - latitude) > 0.1 ||
      Math.abs(previousLongitude - longitude) > 0.1;

    if (!resolvedState || hasMovedSignificantly) {
      const geocodeResult = await resolveStateFromCoordinates(latitude, longitude);
      if (geocodeResult?.state) {
        resolvedState = geocodeResult.state;
      }
    }

    if (resolvedState) {
      locationData.state = resolvedState;
      mongoUser.lastKnownState = resolvedState;
    }

    console.log('📍 [USER LOCATION] Saving location data', {
      userId: mongoUser?._id,
      location: locationData
    });

    mongoUser.lastKnownLocation = locationData;
    mongoUser.lastLocationUpdatedAt = now;

    await mongoUser.save();

    console.log('📍 [USER LOCATION] Updated location for user', mongoUser.mobile, locationData);

    return res.json({
      success: true,
      message: 'Location updated',
      location: mongoUser.lastKnownLocation,
      locationUpdatedAt: mongoUser.lastLocationUpdatedAt,
      state: resolvedState
    });
  } catch (error) {
    console.error('❌ [USER LOCATION] Error updating location:', error);
    console.error('❌ [USER LOCATION] Stack:', error?.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to update location',
      message: error.message
    });
  }
});

// Get latest fuel prices for a state (public/mobile)
app.get('/api/fuel/latest', async (req, res) => {
  try {
    let stateParam = req.query.state;
    let resolvedState = typeof stateParam === 'string' ? stateParam.trim() : null;
    let resolvedFrom = resolvedState ? 'query' : null;

    if (!resolvedState) {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const usersData = getUsers();
          const jsonUser = usersData.users.find(u => u.id === decoded.userId);
          if (jsonUser) {
            const normalizedMobile = normalizeMobile(jsonUser.mobile);
            const mobileCandidates = Array.from(new Set([
              jsonUser.mobile?.toString().trim(),
              normalizedMobile,
              normalizedMobile ? `+91${normalizedMobile}` : null,
              normalizedMobile ? `91${normalizedMobile}` : null,
              normalizedMobile ? `0${normalizedMobile}` : null
            ].filter(Boolean)));

            let mongoUser = null;
            if (mobileCandidates.length > 0) {
              mongoUser = await User.findOne({ mobile: { $in: mobileCandidates } });
            }
            if (!mongoUser && normalizedMobile) {
              mongoUser = await User.findOne({ mobile: { $regex: new RegExp(`${normalizedMobile}$`) } });
            }
            if (mongoUser?.lastKnownState) {
              resolvedState = mongoUser.lastKnownState;
              resolvedFrom = 'user';
            }
          }
        } catch (error) {
          console.warn('⚠️ [FUEL] Failed to derive state from token', error.message);
        }
      }
    }

    const sendAverageResponse = async (reason) => {
      const average = await getAverageFuelPrice();
      if (!average) {
        return res.status(404).json({
          success: false,
          error: 'Fuel price data is not available yet. Please try again later.'
        });
      }

      return res.json({
        success: true,
        ...average,
        resolvedFrom: reason || 'average'
      });
    };

    if (!resolvedState) {
      return await sendAverageResponse('average');
    }

    const fuelPrice = await FuelPrice.findOne({ state: resolvedState })
      .collation({ locale: 'en', strength: 2 })
      .sort({ date: -1, createdAt: -1 });

    if (!fuelPrice) {
      console.warn('⚠️ [FUEL] No price found for requested state, falling back to average', { resolvedState });
      return await sendAverageResponse('average');
    }

    return res.json({
      success: true,
      state: fuelPrice.state,
      petrolPrice: fuelPrice.petrolPrice,
      dieselPrice: fuelPrice.dieselPrice,
      cngPrice: fuelPrice.cngPrice,
      date: fuelPrice.date,
      notes: fuelPrice.notes,
      source: fuelPrice.source,
      updatedAt: fuelPrice.updatedAt,
      resolvedFrom
    });
  } catch (error) {
    console.error('❌ [FUEL] Failed to fetch latest fuel price:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch fuel price',
      message: error.message
    });
  }
});

// Get list of states with fuel prices
app.get('/api/fuel/states', async (req, res) => {
  try {
    const states = await FuelPrice.distinct('state');
    states.sort((a, b) => a.localeCompare(b));
    return res.json({
      success: true,
      states
    });
  } catch (error) {
    console.error('❌ [FUEL] Failed to fetch state list:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch states',
      message: error.message
    });
  }
});

// Admin: list devices
app.get('/api/admin/devices', authenticateToken, async (req, res) => {
  try {
    // Only admin or users with viewUsers can view for now
    if (!(req.user?.type === 'admin' || req.user?.permissions?.viewUsers)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      q,
      platform,
      isActive,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { userMobile: new RegExp(q, 'i') },
        { appVersion: new RegExp(q, 'i') },
        { deviceModel: new RegExp(q, 'i') },
      ];
    }
    if (platform) query.platform = platform;
    if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Device.find(query).sort({ updatedAt: -1 }).skip(skip).limit(Number(limit)),
      Device.countDocuments(query),
    ]);

    return res.json({
      devices: items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)) || 1,
      }
    });
  } catch (error) {
    console.error('List devices error:', error);
    return res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Admin: delete device
app.delete('/api/admin/devices/:id', authenticateToken, async (req, res) => {
  try {
    if (!(req.user?.type === 'admin' || req.user?.permissions?.viewUsers)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    await Device.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  // Token is managed on client side
  // Just return success
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get user profile
app.get('/api/auth/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = getUsers().users.find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      email: user.email,
      vehicleNumber: user.vehicleNumber || '',
      createdAt: user.createdAt
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update user profile
app.put('/api/auth/profile', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const usersData = getUsers();
    const userIndex = usersData.users.findIndex(u => u.id === decoded.userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, email, vehicleNumber } = req.body;

    // Update user
    usersData.users[userIndex] = {
      ...usersData.users[userIndex],
      name: name || usersData.users[userIndex].name,
      email: email !== undefined ? email : usersData.users[userIndex].email,
      vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : usersData.users[userIndex].vehicleNumber,
      updatedAt: new Date().toISOString()
    };

    saveUsers(usersData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: usersData.users[userIndex].id,
        mobile: usersData.users[userIndex].mobile,
        name: usersData.users[userIndex].name,
        email: usersData.users[userIndex].email,
        vehicleNumber: usersData.users[userIndex].vehicleNumber
      }
    });

  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ============================================
// ADMIN ROUTES
// ============================================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (username === adminUsername && password === adminPassword) {
    const token = jwt.sign({ username, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      token, 
      user: {
        type: 'admin',
        username: username
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get latest version (public - for app)
app.get('/api/updates/check', (req, res) => {
  try {
    const { platform, currentVersion } = req.query;
    const data = getVersions();
    
    // Find the latest version for the platform
    const latestVersion = data.versions
      .filter(v => v.platform === platform && v.active)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    
    if (!latestVersion) {
      return res.json({ 
        updateAvailable: false,
        message: 'No updates available'
      });
    }
    
    // Compare versions
    const updateAvailable = currentVersion !== latestVersion.version;
    
    res.json({
      updateAvailable,
      version: latestVersion.version,
      url: `${process.env.BASE_URL || 'http://10.236.128.10:3001'}/uploads/${latestVersion.filename}`,
      changelog: latestVersion.changelog,
      mandatory: latestVersion.mandatory || false,
      createdAt: latestVersion.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all versions (protected)
app.get('/api/admin/versions', authenticateToken, (req, res) => {
  try {
    // Disable caching for admin endpoints to always get fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    console.log('📋 Fetching versions from:', versionsFile);
    console.log('📋 File exists:', fs.existsSync(versionsFile));
    
    const data = getVersions();
    const versions = data.versions || [];
    console.log(`✅ Found ${versions.length} versions`);
    
    // Log file stats for debugging
    if (fs.existsSync(versionsFile)) {
      const stats = fs.statSync(versionsFile);
      console.log('📊 File stats:', {
        size: stats.size,
        modified: stats.mtime
      });
    }
    
    res.json(versions);
  } catch (error) {
    console.error('❌ Error fetching versions:', error);
    res.status(500).json({ 
      error: error.message, 
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      filePath: versionsFile,
      fileExists: fs.existsSync(versionsFile)
    });
  }
});

// Upload new version (protected)
app.post('/api/admin/upload', authenticateToken, requirePermission('uploadOTA'), (req, res, next) => {
  uploadOTABundle.single('bundle')(req, res, (err) => {
    if (err) {
      console.error('Multer error for OTA upload:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 100MB limit' });
      }
      if (err.message && err.message.includes('ZIP')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'File upload error: ' + (err.message || 'Unknown error') });
    }
    next();
  });
}, (req, res) => {
  try {
    console.log('📤 OTA Upload request received');
    console.log('  - Body:', req.body);
    console.log('  - File:', req.file ? { filename: req.file.filename, size: req.file.size, path: req.file.path } : 'No file');
    
    if (!req.file) {
      console.error('❌ No file in request:', {
        files: req.files,
        body: req.body,
        headers: req.headers['content-type']
      });
      return res.status(400).json({ error: 'No file uploaded. Please ensure the file field is named "bundle" and the file is a ZIP archive.' });
    }
    
    const { version, platform, changelog, mandatory } = req.body;
    
    console.log(`📦 Processing upload: version=${version}, platform=${platform}`);
    
    if (!version || !platform) {
      console.error('❌ Missing required fields:', { version, platform });
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path); // Clean up uploaded file
        } catch (unlinkError) {
          console.error('⚠️  Failed to cleanup file:', unlinkError);
        }
      }
      return res.status(400).json({ error: 'Version and platform are required' });
    }
    
    // Fix Windows paths in the zip file
    console.log('🔧 Checking for Windows paths in zip file...');
    try {
      const zip = new AdmZip(req.file.path);
      const zipEntries = zip.getEntries();
      
      let hasWindowsPaths = false;
      const fixedEntries = [];
      
      zipEntries.forEach(entry => {
        if (entry.entryName.includes('\\')) {
          hasWindowsPaths = true;
          const newName = entry.entryName.replace(/\\/g, '/');
          console.log(`  📝 Renaming: ${entry.entryName} → ${newName}`);
          fixedEntries.push({ oldName: entry.entryName, newName });
        }
      });
      
      if (hasWindowsPaths) {
        console.log('✅ Found Windows paths, creating fixed zip...');
        const newZip = new AdmZip();
        
        zipEntries.forEach(entry => {
          const fixedName = entry.entryName.replace(/\\/g, '/');
          if (entry.isDirectory) {
            newZip.addFile(fixedName, Buffer.alloc(0), '', entry.attr);
          } else {
            newZip.addFile(fixedName, entry.getData(), '', entry.attr);
          }
        });
        
        // Write fixed zip
        newZip.writeZip(req.file.path);
        console.log('✅ Zip file paths fixed successfully!');
      } else {
        console.log('✅ No Windows paths found, zip is good!');
      }
    } catch (zipError) {
      console.error('⚠️  Warning: Could not fix zip paths:', zipError.message);
      // Continue anyway - if it's not a zip or there's an issue, the original file remains
    }
    
    console.log('📖 Reading versions.json...');
    const data = getVersions();
    
    // Ensure versions array exists
    if (!data.versions) {
      data.versions = [];
    }
    
    // Check if version already exists
    const existingVersion = data.versions.find(
      v => v.version === version && v.platform === platform
    );
    
    if (existingVersion) {
      console.error('❌ Version already exists:', { version, platform });
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path); // Clean up uploaded file
        } catch (unlinkError) {
          console.error('⚠️  Failed to cleanup file:', unlinkError);
        }
      }
      return res.status(400).json({ error: 'Version already exists' });
    }
    
    const newVersion = {
      id: Date.now().toString(),
      version,
      platform,
      filename: req.file.filename,
      changelog: changelog || 'No changelog provided',
      mandatory: mandatory === 'true',
      active: true,
      createdAt: new Date().toISOString(),
      size: req.file.size
    };
    
    console.log('💾 Saving new version:', newVersion);
    data.versions.push(newVersion);
    saveVersions(data);
    
    console.log('✅ Version uploaded successfully:', newVersion.id);
    res.json({ 
      success: true, 
      version: newVersion,
      message: 'Version uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Error in OTA upload:', error);
    // Clean up uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up uploaded file after error');
      } catch (unlinkError) {
        console.error('⚠️  Failed to cleanup file:', unlinkError);
      }
    }
    res.status(500).json({ 
      error: error.message || 'Failed to upload version',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Toggle version active status (protected)
app.patch('/api/admin/versions/:id/toggle', authenticateToken, requirePermission('toggleOTA'), (req, res) => {
  try {
    const { id } = req.params;
    const data = getVersions();
    
    const versionIndex = data.versions.findIndex(v => v.id === id);
    if (versionIndex === -1) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    data.versions[versionIndex].active = !data.versions[versionIndex].active;
    saveVersions(data);
    
    res.json({ 
      success: true, 
      version: data.versions[versionIndex],
      message: `Version ${data.versions[versionIndex].active ? 'activated' : 'deactivated'}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete version (protected)
app.delete('/api/admin/versions/:id', authenticateToken, requirePermission('deleteOTA'), (req, res) => {
  try {
    const { id } = req.params;
    const data = getVersions();
    
    const versionIndex = data.versions.findIndex(v => v.id === id);
    if (versionIndex === -1) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    const version = data.versions[versionIndex];
    const filePath = path.join(__dirname, 'uploads', version.filename);
    
    // Delete file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    data.versions.splice(versionIndex, 1);
    saveVersions(data);
    
    res.json({ 
      success: true, 
      message: 'Version deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STATE PLAN ROUTES
// ============================================

// Get all state plans (public - for app)
app.get('/api/state-plans', async (req, res) => {
  try {
    const states = await StatePlan.getActiveStates();
    res.json(states);
  } catch (error) {
    console.error('Error fetching state plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get state plan by ID (public)
app.get('/api/state-plans/:id', async (req, res) => {
  try {
    const state = await StatePlan.findById(req.params.id);
    if (!state) {
      return res.status(404).json({ error: 'State not found' });
    }
    res.json(state);
  } catch (error) {
    console.error('Error fetching state plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tax for specific vehicle (public)
app.get('/api/state-plans/vehicle/:vehicleNumber', async (req, res) => {
  try {
    const { vehicleNumber } = req.params;
    const { day } = req.query;
    
    const state = await StatePlan.findVehicle(vehicleNumber);
    if (!state) {
      return res.status(404).json({ error: 'Vehicle not found in any state plan' });
    }
    
    const vehicle = state.vehicles.find(v => v.number === vehicleNumber.toUpperCase());
    
    if (day) {
      const tax = state.getVehicleTax(vehicleNumber, parseInt(day));
      return res.json({
        state: state.name,
        vehicle: vehicleNumber.toUpperCase(),
        day: parseInt(day),
        tax
      });
    }
    
    res.json({
      state: state.name,
      vehicle: vehicle
    });
  } catch (error) {
    console.error('Error fetching vehicle tax:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CUSTOMER BOOKING ROUTES (Public)
// ============================================

// Get active state plans for booking (public)
app.get('/api/bookings/states', async (req, res) => {
  try {
    const states = await StatePlan.find({ isActive: true }).sort({ name: 1 });
    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// Helper function to normalize mobile number (extract last 10 digits)
const normalizeMobile = (mobile) => {
  if (!mobile) return null;
  const cleaned = mobile.toString().trim().replace(/^\+?91/, '').replace(/\D/g, '');
  return cleaned.slice(-10); // Take last 10 digits
};

const stateResolutionCache = new Map();
const STATE_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const getCachedState = (key) => {
  const cached = stateResolutionCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > STATE_CACHE_TTL_MS) {
    stateResolutionCache.delete(key);
    return null;
  }
  return cached.value;
};

const setCachedState = (key, value) => {
  stateResolutionCache.set(key, { value, cachedAt: Date.now() });
};

const resolveStateFromCoordinates = async (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { state: null, address: null };
  }

  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = getCachedState(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    console.log('📍 [USER LOCATION] Reverse geocoding coordinates', { latitude, longitude });
    const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        zoom: 5,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'SafarTaxApp/1.0 (support@safartax.in)'
      },
      timeout: 10000
    });

    const address = data?.address || {};
    const state =
      address.state ||
      address.region ||
      address.state_district ||
      address.county ||
      null;

    const result = { state, address };
    setCachedState(cacheKey, result);
    console.log('📍 [USER LOCATION] Reverse geocoding result', { state, display_name: data?.display_name });
    return result;
  } catch (error) {
    console.error('❌ [USER LOCATION] Reverse geocoding failed', {
      message: error.message,
      response: error.response?.data
    });
    return { state: null, address: null };
  }
};

const getAverageFuelPrice = async () => {
  const latestPerState = await FuelPrice.aggregate([
    { $sort: { state: 1, date: -1, updatedAt: -1, createdAt: -1 } },
    {
      $group: {
        _id: '$state',
        petrolPrice: { $first: '$petrolPrice' },
        dieselPrice: { $first: '$dieselPrice' },
        cngPrice: { $first: '$cngPrice' },
        date: { $first: '$date' },
        updatedAt: { $first: '$updatedAt' }
      }
    }
  ]);

  if (!latestPerState.length) {
    return null;
  }

  const totals = latestPerState.reduce(
    (acc, item) => {
      acc.petrol += item.petrolPrice || 0;
      acc.diesel += item.dieselPrice || 0;
      acc.cng += item.cngPrice || 0;
      acc.count += 1;
      if (item.date) acc.dates.push(item.date);
      if (item.updatedAt) acc.updated.push(item.updatedAt);
      return acc;
    },
    { petrol: 0, diesel: 0, cng: 0, count: 0, dates: [], updated: [] }
  );

  if (totals.count === 0) {
    return null;
  }

  const latestDate = totals.dates.reduce((latest, current) => {
    const time = current instanceof Date ? current.getTime() : new Date(current).getTime();
    return time > latest ? time : latest;
  }, 0);

  const latestUpdated = totals.updated.reduce((latest, current) => {
    const time = current instanceof Date ? current.getTime() : new Date(current).getTime();
    return time > latest ? time : latest;
  }, 0);

  return {
    state: 'All States Average',
    petrolPrice: Number((totals.petrol / totals.count).toFixed(2)),
    dieselPrice: Number((totals.diesel / totals.count).toFixed(2)),
    cngPrice: Number((totals.cng / totals.count).toFixed(2)),
    date: latestDate ? new Date(latestDate) : undefined,
    updatedAt: latestUpdated ? new Date(latestUpdated) : undefined,
    totals: totals.count
  };
};

// Get recent data for a user (by mobile number)
app.get('/api/bookings/recent/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile || normalizedMobile.length !== 10) {
      console.log('[Get Recent] Invalid mobile format:', mobile);
      return res.json({
        vehicles: [],
        phoneNumbers: [],
        borderSelections: []
      });
    }
    
    console.log('[Get Recent] Looking for mobile:', normalizedMobile);
    
    // Find user in MongoDB
    let user = await User.findOne({ mobile: normalizedMobile });
    
    console.log('[Get Recent] User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      // Also check users.json
      const usersData = getUsers();
      const jsonUser = usersData.users.find(u => {
        const jsonMobile = normalizeMobile(u.mobile);
        return jsonMobile === normalizedMobile;
      });
      
      if (jsonUser) {
        // Use findOneAndUpdate to avoid duplicate key errors
        const defaultUserData = {
          mobile: normalizedMobile,
          name: jsonUser.name || normalizedMobile,
          isActive: jsonUser.isActive !== false,
          recentVehicles: [],
          recentPhoneNumbers: [],
          recentBorderSelections: []
        };
        
        // Only include email if it has a value (avoid duplicate key error on empty string)
        if (jsonUser.email && jsonUser.email.trim()) {
          defaultUserData.email = jsonUser.email.trim().toLowerCase();
        }
        
        try {
          user = await User.findOneAndUpdate(
            { mobile: normalizedMobile },
            { $setOnInsert: defaultUserData },
            { 
              upsert: true, 
              new: true,
              setDefaultsOnInsert: true 
            }
          );
          
          // Generate referral code if user was just created
          if (user && !user.referralCode) {
            user.referralCode = await generateReferralCode(user._id);
            await user.save();
          }
          
          console.log('[Get Recent] Created/found user:', user.mobile);
        } catch (createError) {
          // If still an error, try to find existing user
          console.log('[Get Recent] Error creating user, fetching existing:', createError.message);
          user = await User.findOne({ mobile: normalizedMobile });
          if (user && !user.referralCode) {
            user.referralCode = await generateReferralCode(user._id);
            await user.save();
          }
        }
      }
    }
    
    if (!user) {
      console.log('[Get Recent] No user found, returning empty arrays');
      return res.json({
        vehicles: [],
        phoneNumbers: [],
        borderSelections: []
      });
    }
    
    console.log('[Get Recent] User data:', {
      vehicles: user.recentVehicles?.length || 0,
      phones: user.recentPhoneNumbers?.length || 0,
      borders: user.recentBorderSelections?.length || 0
    });
    
    // Sort and limit recent data (most recent first, max 5 each)
    const recentVehicles = (user.recentVehicles || [])
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 5)
      .map(v => ({ number: v.number, type: v.type }));
    
    const recentPhoneNumbers = (user.recentPhoneNumbers || [])
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 5)
      .map(p => p.number);
    
    const recentBorderSelections = (user.recentBorderSelections || [])
      .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
      .slice(0, 5)
      .map(b => ({ state: b.state, border: b.border }));
    
    res.json({
      vehicles: recentVehicles,
      phoneNumbers: recentPhoneNumbers,
      borderSelections: recentBorderSelections
    });
  } catch (error) {
    console.error('Error fetching recent data:', error);
    res.status(500).json({ error: 'Failed to fetch recent data' });
  }
});

// Save recent vehicle/phone/border selection
app.post('/api/bookings/recent', async (req, res) => {
  try {
    const { mobile, vehicle, phoneNumber, borderSelection } = req.body;
    
    console.log('[Save Recent] Request:', { mobile, vehicle, phoneNumber, borderSelection });
    
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required' });
    }
    
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile || normalizedMobile.length !== 10) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }
    
    console.log('[Save Recent] Normalized mobile:', normalizedMobile);
    
    // Check users.json for existing user data
    const usersData = getUsers();
    const jsonUser = usersData.users.find(u => {
      const jsonMobile = normalizeMobile(u.mobile);
      return jsonMobile === normalizedMobile;
    });
    
    // Use findOneAndUpdate with upsert to handle duplicates gracefully
    // This will find existing user or create new one, avoiding duplicate key errors
    const defaultUserData = {
      mobile: normalizedMobile,
      name: jsonUser?.name || normalizedMobile,
      isActive: jsonUser?.isActive !== false ? true : true,
      recentVehicles: [],
      recentPhoneNumbers: [],
      recentBorderSelections: []
    };
    
    // Only include email if it has a value (avoid duplicate key error on empty string)
    if (jsonUser?.email && jsonUser.email.trim()) {
      defaultUserData.email = jsonUser.email.trim().toLowerCase();
    }
    
    let user = await User.findOneAndUpdate(
      { mobile: normalizedMobile },
      { $setOnInsert: defaultUserData }, // Only set these fields on insert, not on update
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );
    
    // Generate referral code if user was just created
    if (user && !user.referralCode) {
      user.referralCode = await generateReferralCode(user._id);
      await user.save();
    }
    
    console.log('[Save Recent] User found/created:', user.mobile);
    
    // Ensure arrays are initialized
    if (!user.recentVehicles) user.recentVehicles = [];
    if (!user.recentPhoneNumbers) user.recentPhoneNumbers = [];
    if (!user.recentBorderSelections) user.recentBorderSelections = [];
    
    let hasChanges = false;
    
    // Add/update recent vehicle
    if (vehicle && vehicle.number && vehicle.type) {
      const vehicleNumber = vehicle.number.toString().trim().toUpperCase();
      const vehicleType = vehicle.type.toString().trim();
      
      const vehicleIndex = user.recentVehicles.findIndex(
        v => v.number === vehicleNumber && v.type === vehicleType
      );
      
      if (vehicleIndex >= 0) {
        // Update existing vehicle timestamp
        user.recentVehicles[vehicleIndex].lastUsed = new Date();
        hasChanges = true;
        console.log('[Save Recent] Updated existing vehicle:', vehicleNumber);
      } else {
        // Add new vehicle
        user.recentVehicles.push({
          number: vehicleNumber,
          type: vehicleType,
          lastUsed: new Date()
        });
        hasChanges = true;
        console.log('[Save Recent] Added new vehicle:', vehicleNumber, vehicleType);
      }
      
      // Sort by most recent and keep only top 5 (delete from end)
      user.recentVehicles.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
      if (user.recentVehicles.length > 5) {
        user.recentVehicles = user.recentVehicles.slice(0, 5);
        console.log('[Save Recent] Trimmed vehicles to top 5');
      }
    }
    
    // Add/update recent phone number
    if (phoneNumber) {
      const phone = phoneNumber.toString().trim();
      
      if (phone.length === 10 || phone.length >= 10) {
        const phoneNum = phone.slice(-10); // Take last 10 digits
        
        const phoneIndex = user.recentPhoneNumbers.findIndex(
          p => p.number === phoneNum
        );
        
        if (phoneIndex >= 0) {
          // Update existing phone timestamp
          user.recentPhoneNumbers[phoneIndex].lastUsed = new Date();
          hasChanges = true;
          console.log('[Save Recent] Updated existing phone:', phoneNum);
        } else {
          // Add new phone
          user.recentPhoneNumbers.push({
            number: phoneNum,
            lastUsed: new Date()
          });
          hasChanges = true;
          console.log('[Save Recent] Added new phone:', phoneNum);
        }
        
        // Sort by most recent and keep only top 5 (delete from end)
        user.recentPhoneNumbers.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
        if (user.recentPhoneNumbers.length > 5) {
          user.recentPhoneNumbers = user.recentPhoneNumbers.slice(0, 5);
          console.log('[Save Recent] Trimmed phones to top 5');
        }
      }
    }
    
    // Add/update recent border selection
    if (borderSelection && borderSelection.state && borderSelection.border) {
      const state = borderSelection.state.toString().trim();
      const border = borderSelection.border.toString().trim();
      
      const borderIndex = user.recentBorderSelections.findIndex(
        b => b.state === state && b.border === border
      );
      
      if (borderIndex >= 0) {
        // Update existing border selection timestamp
        user.recentBorderSelections[borderIndex].lastUsed = new Date();
        hasChanges = true;
        console.log('[Save Recent] Updated existing border selection:', state, border);
      } else {
        // Add new border selection
        user.recentBorderSelections.push({
          state: state,
          border: border,
          lastUsed: new Date()
        });
        hasChanges = true;
        console.log('[Save Recent] Added new border selection:', state, border);
      }
      
      // Sort by most recent and keep only top 5 (delete from end)
      user.recentBorderSelections.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
      if (user.recentBorderSelections.length > 5) {
        user.recentBorderSelections = user.recentBorderSelections.slice(0, 5);
        console.log('[Save Recent] Trimmed border selections to top 5');
      }
    }
    
    if (hasChanges) {
      await user.save();
      console.log('[Save Recent] Successfully saved recent data for:', user.mobile);
    }
    
    res.json({ 
      success: true, 
      message: 'Recent data saved',
      saved: {
        vehicle: vehicle ? true : false,
        phoneNumber: phoneNumber ? true : false,
        borderSelection: borderSelection ? true : false
      }
    });
  } catch (error) {
    console.error('[Save Recent] Error saving recent data:', error);
    console.error('[Save Recent] Error details:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Failed to save recent data',
      details: error.message 
    });
  }
});

// Get user bookings (customer side)
app.get('/api/bookings/my-bookings/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const { status, payment_status } = req.query;
    
    const normalizedMobile = normalizeMobile(mobile);
    if (!normalizedMobile || normalizedMobile.length !== 10) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }
    
    // Find user
    const user = await User.findOne({ mobile: normalizedMobile });
    
    if (!user) {
      return res.json({
        bookings: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 50,
          pages: 0
        }
      });
    }
    
    // Build query
    const query = { user: user._id };
    if (status) {
      query.status = status;
    }
    if (payment_status) {
      query.payment_status = payment_status;
    }
    
    // Get bookings
    const bookings = await Booking.find(query)
      .populate('visiting_state', 'name districts')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({
      bookings,
      pagination: {
        total: bookings.length,
        page: 1,
        limit: 100,
        pages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings', details: error.message });
  }
});

// Get booking details by ID (customer side)
app.get('/api/bookings/details/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name districts vehicles')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Failed to fetch booking details', details: error.message });
  }
});

// Create booking (customer side)
app.post('/api/bookings/create', async (req, res) => {
  const startTime = Date.now();
  console.log('🔵 [DEBUG BOOKING] ===== START: Create Booking =====');
  console.log('📥 [DEBUG BOOKING] Request received:', {
    timestamp: new Date().toISOString(),
    hasMobile: !!req.body.mobile,
    mobile: req.body.mobile || 'not provided',
    hasVisitingState: !!req.body.visiting_state,
    hasVehicleNumber: !!req.body.vehicle_number,
    hasPaymentId: !!req.body.payment_id,
    paymentId: req.body.payment_id || 'not provided',
    paymentStatus: req.body.payment_status || 'not provided',
    mongoState: mongoose.connection.readyState,
    mongoStateName: mongoose.connection.readyState === 1 ? 'connected' : mongoose.connection.readyState === 0 ? 'disconnected' : mongoose.connection.readyState === 2 ? 'connecting' : 'unknown'
  });

  try {
    const {
      mobile,
      visiting_state,
      vehicle_number,
      seat_capacity,
      whatsapp_number,
      entry_border,
      tax_mode,
      tax_from_date,
      tax_upto_date,
      amount,
      payment_id,
      payment_status,
      payment_details
    } = req.body;

    console.log('🔍 [DEBUG BOOKING] Step 1: Validating request data');
    console.log('🔍 [DEBUG BOOKING] Request body fields:', {
      mobile: mobile ? 'provided' : 'missing',
      visiting_state: visiting_state ? 'provided' : 'missing',
      vehicle_number: vehicle_number ? 'provided' : 'missing',
      seat_capacity: seat_capacity ? 'provided' : 'missing',
      whatsapp_number: whatsapp_number ? 'provided' : 'missing',
      entry_border: entry_border ? 'provided' : 'missing',
      tax_mode: tax_mode ? 'provided' : 'missing',
      tax_from_date: tax_from_date ? 'provided' : 'missing',
      tax_upto_date: tax_upto_date ? 'provided' : 'missing',
      amount: amount ? 'provided' : 'missing',
      payment_id: payment_id ? 'provided' : 'missing',
      payment_status: payment_status || 'not provided'
    });

    // Validation
    if (!mobile || !visiting_state || !vehicle_number || !seat_capacity || 
        !whatsapp_number || !entry_border || !tax_mode || !tax_from_date || 
        !tax_upto_date || !amount) {
      console.log('❌ [DEBUG BOOKING] Validation failed - missing required fields');
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    console.log('✅ [DEBUG BOOKING] Validation passed');

    // Find or create user
    console.log('🔍 [DEBUG REFERRAL] Booking create - Searching for user:', {
      mobile: mobile.trim(),
      searchPattern: mobile.trim()
    });
    
    let mongoUser = await User.findOne({ mobile: mobile.trim() });
    
    console.log('🔍 [DEBUG REFERRAL] Booking create - User found:', {
      found: !!mongoUser,
      userId: mongoUser?._id?.toString(),
      mobile: mongoUser?.mobile,
      isFirstBookingDone: mongoUser?.is_first_booking_done,
      referredCode: mongoUser?.referred_code,
      usedReferralCode: mongoUser?.usedReferralCode
    });
    
    if (!mongoUser) {
      console.log('🔍 [DEBUG REFERRAL] User not found, creating new user in booking endpoint');
      // Check users.json
      const usersData = getUsers();
      const jsonUser = usersData.users.find(u => u.mobile === mobile.trim());
      
      if (jsonUser) {
        console.log('🔍 [DEBUG REFERRAL] Found user in JSON, creating from JSON data');
        const userData = {
          mobile: jsonUser.mobile,
          name: jsonUser.name,
          isActive: jsonUser.isActive !== false,
          is_first_booking_done: false // New user hasn't completed first booking yet
        };
        // Only include email if it has a value
        if (jsonUser.email && jsonUser.email.trim()) {
          userData.email = jsonUser.email.trim().toLowerCase();
        }
        mongoUser = new User(userData);
        console.log('🔍 [DEBUG REFERRAL] Created user from JSON:', {
          mobile: mongoUser.mobile,
          name: mongoUser.name,
          isFirstBookingDone: mongoUser.is_first_booking_done
        });
      } else {
        console.log('🔍 [DEBUG REFERRAL] User not in JSON, creating new user');
        // Create new user
        mongoUser = new User({
          mobile: mobile.trim(),
          name: mobile.trim(), // Default name
          isActive: true,
          is_first_booking_done: false // New user hasn't completed first booking yet
        });
        console.log('🔍 [DEBUG REFERRAL] Created new user:', {
          mobile: mongoUser.mobile,
          name: mongoUser.name,
          isFirstBookingDone: mongoUser.is_first_booking_done
        });
      }
      
      // Save user first to get ID, then generate referral code
      await mongoUser.save();
      console.log('🔍 [DEBUG REFERRAL] Saved new user:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        isFirstBookingDone: mongoUser.is_first_booking_done
      });
      
      // Generate referral code based on user ID (deterministic and unique)
      if (!mongoUser.referralCode) {
        mongoUser.referralCode = await generateReferralCode(mongoUser._id);
        await mongoUser.save();
      }
    }

    // Save recent data
    if (vehicle_number && seat_capacity) {
      const vehicleIndex = mongoUser.recentVehicles.findIndex(
        v => v.number === vehicle_number.toUpperCase() && v.type === seat_capacity
      );
      
      if (vehicleIndex >= 0) {
        mongoUser.recentVehicles[vehicleIndex].lastUsed = new Date();
      } else {
        mongoUser.recentVehicles.push({
          number: vehicle_number.toUpperCase(),
          type: seat_capacity,
          lastUsed: new Date()
        });
      }
    }
    
    if (whatsapp_number) {
      const phoneIndex = mongoUser.recentPhoneNumbers.findIndex(
        p => p.number === whatsapp_number.trim()
      );
      
      if (phoneIndex >= 0) {
        mongoUser.recentPhoneNumbers[phoneIndex].lastUsed = new Date();
      } else {
        mongoUser.recentPhoneNumbers.push({
          number: whatsapp_number.trim(),
          lastUsed: new Date()
        });
      }
    }
    
    // Get state name for border selection
    const statePlan = await StatePlan.findById(visiting_state);
    if (statePlan && entry_border) {
      const borderIndex = mongoUser.recentBorderSelections.findIndex(
        b => b.state === statePlan.name && b.border === entry_border
      );
      
      if (borderIndex >= 0) {
        mongoUser.recentBorderSelections[borderIndex].lastUsed = new Date();
      } else {
        mongoUser.recentBorderSelections.push({
          state: statePlan.name,
          border: entry_border,
          lastUsed: new Date()
        });
      }
    }
    
    await mongoUser.save();

    // Create booking
    console.log('🔍 [DEBUG BOOKING] Step 2: Creating booking record');
    console.log('📝 [DEBUG BOOKING] Booking data:', {
      userId: mongoUser._id.toString(),
      visiting_state: visiting_state,
      vehicle_number: vehicle_number.toUpperCase().trim(),
      seat_capacity: seat_capacity,
      entry_border: entry_border,
      tax_mode: tax_mode,
      tax_from_date: tax_from_date,
      tax_upto_date: tax_upto_date,
      amount: amount,
      payment_id: payment_id,
      payment_status: payment_status || 'pending',
      willSetStatus: payment_status === 'paid' ? 'paid' : 'pending'
    });

    const booking = new Booking({
      user: mongoUser._id,
      visiting_state,
      vehicle_number: vehicle_number.toUpperCase().trim(),
      seat_capacity,
      whatsapp_number,
      entry_border,
      tax_mode,
      tax_from_date: new Date(tax_from_date),
      tax_upto_date: new Date(tax_upto_date),
      amount,
      status: payment_status === 'paid' ? 'paid' : 'pending',
      payment_id,
      payment_status: payment_status || 'pending',
      payment_details: payment_details || {}
    });

    console.log('💾 [DEBUG BOOKING] Saving booking to database...');
    await booking.save();
    console.log('✅ [DEBUG BOOKING] Booking saved successfully:', {
      bookingId: booking._id.toString(),
      status: booking.status,
      payment_status: booking.payment_status,
      amount: booking.amount,
      vehicle_number: booking.vehicle_number
    });

    // Check if this is the first booking for the user
    console.log('🔍 [DEBUG REFERRAL] Checking first booking status:', {
      userId: mongoUser._id.toString(),
      mobile: mongoUser.mobile,
      isFirstBookingDone: mongoUser.is_first_booking_done,
      type: typeof mongoUser.is_first_booking_done,
      willCheck: !mongoUser.is_first_booking_done,
      referredCode: mongoUser.referred_code,
      usedReferralCode: mongoUser.usedReferralCode
    });
    
    if (!mongoUser.is_first_booking_done) {
      console.log('🎯 [REFERRAL] First booking detected for user:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        currentStatus: mongoUser.is_first_booking_done,
        bookingId: booking._id.toString()
      });
      
      // Update user's first booking status
      const beforeStatus = mongoUser.is_first_booking_done;
      mongoUser.is_first_booking_done = true;
      await mongoUser.save();
      
      console.log('🔍 [DEBUG REFERRAL] Updated user first booking status:', {
        userId: mongoUser._id.toString(),
        before: beforeStatus,
        after: mongoUser.is_first_booking_done,
        saved: true
      });
      
      // Find the pending or loggedin referral where this user is the referee
      // IMPORTANT: Search by normalized mobile number instead of user ID
      // because the same phone number might have different user IDs due to normalization differences
      try {
        const normalizedMobile = String(mongoUser.mobile).replace(/\D/g, '').slice(-10);
        
        // Find all users with the same normalized mobile number
        const allUsersWithMobile = await User.find({
          mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
        }).select('_id mobile');
        
        const userIds = allUsersWithMobile.map(u => u._id);
        
        console.log('🔍 [DEBUG REFERRAL] Searching for referrals by normalized mobile:', {
          normalizedMobile: normalizedMobile,
          currentUserId: mongoUser._id.toString(),
          currentUserMobile: mongoUser.mobile,
          allUserIds: userIds.map(id => id.toString()),
          allUserMobiles: allUsersWithMobile.map(u => u.mobile),
          searchQuery: {
            referee: { $in: userIds },
            status: { $in: ['pending', 'loggedin'] }
          }
        });
        
        // Search for referrals where any of these user IDs is the referee and status is pending or loggedin
        const pendingReferral = await Referral.findOne({
          referee: { $in: userIds },
          status: { $in: ['pending', 'loggedin'] }
        });
        
        console.log('🔍 [DEBUG REFERRAL] Pending/loggedin referral search result:', {
          found: !!pendingReferral,
          referralId: pendingReferral?._id?.toString(),
          referrerId: pendingReferral?.referrer?.toString(),
          refereeId: pendingReferral?.referee?.toString(),
          status: pendingReferral?.status,
          referralCode: pendingReferral?.referralCode,
          createdAt: pendingReferral?.createdAt,
          allFields: pendingReferral ? {
            _id: pendingReferral._id.toString(),
            referrer: pendingReferral.referrer.toString(),
            referee: pendingReferral.referee.toString(),
            referralCode: pendingReferral.referralCode,
            status: pendingReferral.status,
            cycleNumber: pendingReferral.cycleNumber,
            signedUpAt: pendingReferral.signedUpAt,
            loggedInAt: pendingReferral.loggedInAt
          } : null
        });
        
        if (pendingReferral) {
          console.log('✅ [REFERRAL] Found pending/loggedin referral to update:', {
            referralId: pendingReferral._id.toString(),
            referrer: pendingReferral.referrer.toString(),
            referee: pendingReferral.referee.toString(),
            status: pendingReferral.status,
            beforeUpdate: {
              status: pendingReferral.status,
              completedAt: pendingReferral.completedAt,
              refereeHasBooking: pendingReferral.refereeHasBooking,
              refereeBookingDate: pendingReferral.refereeBookingDate
            }
          });
          
          // Update referral: set refereeHasBooking and check if both have bookings to mark as completed
          const oldStatus = pendingReferral.status;
          const oldRefereeHasBooking = pendingReferral.refereeHasBooking;
          
          // Set refereeHasBooking to true (referee just made a booking)
          pendingReferral.refereeHasBooking = true;
          pendingReferral.refereeBookingDate = new Date();
          
          // Check if referrer also has bookings
          const referrerBookingsCount = await Booking.countDocuments({ 
            user: pendingReferral.referrer, 
            status: 'paid' 
          });
          
          if (referrerBookingsCount > 0 && !pendingReferral.referrerHasBooking) {
            pendingReferral.referrerHasBooking = true;
            pendingReferral.referrerBookingDate = new Date();
          }
          
          // Mark as completed when referee makes a booking (referee has completed their part)
          // Note: This marks it as completed when referee books, even if referrer hasn't booked yet
          // The referrer can still make bookings later, but the referral is considered complete
          if (pendingReferral.refereeHasBooking && pendingReferral.status !== 'completed') {
            pendingReferral.status = 'completed';
            pendingReferral.completedAt = new Date();
            console.log('✅ [REFERRAL] Marking referral as completed - referee has made a booking');
          } else if (pendingReferral.referrerHasBooking && pendingReferral.refereeHasBooking && pendingReferral.status !== 'completed') {
            // Also mark as completed if both have bookings (backup check)
            pendingReferral.status = 'completed';
            pendingReferral.completedAt = new Date();
            console.log('✅ [REFERRAL] Marking referral as completed - both have bookings');
          }
          
          console.log('🔍 [DEBUG REFERRAL] About to save referral update:', {
            referralId: pendingReferral._id.toString(),
            oldStatus: oldStatus,
            oldRefereeHasBooking: oldRefereeHasBooking,
            newStatus: pendingReferral.status,
            referrerHasBooking: pendingReferral.referrerHasBooking,
            refereeHasBooking: pendingReferral.refereeHasBooking,
            referrerBookingsCount: referrerBookingsCount,
            completedAt: pendingReferral.completedAt,
            refereeBookingDate: pendingReferral.refereeBookingDate
          });
          
          await pendingReferral.save();
          
          // Verify the update
          const verifyReferral = await Referral.findById(pendingReferral._id);
          console.log('🔍 [DEBUG REFERRAL] Verified referral after save:', {
            referralId: verifyReferral._id.toString(),
            status: verifyReferral.status,
            completedAt: verifyReferral.completedAt,
            refereeHasBooking: verifyReferral.refereeHasBooking,
            refereeBookingDate: verifyReferral.refereeBookingDate
          });
          
          if (verifyReferral.status === 'completed') {
            console.log('✅ [REFERRAL] Referral status updated to completed:', {
              referralId: pendingReferral._id.toString(),
              oldStatus: oldStatus,
              newStatus: 'completed',
              completedAt: verifyReferral.completedAt,
              referrerHasBooking: verifyReferral.referrerHasBooking,
              refereeHasBooking: verifyReferral.refereeHasBooking
            });
          } else {
            console.log('⏳ [REFERRAL] Referral updated but not completed yet:', {
              referralId: pendingReferral._id.toString(),
              oldStatus: oldStatus,
              currentStatus: verifyReferral.status,
              referrerHasBooking: verifyReferral.referrerHasBooking,
              refereeHasBooking: verifyReferral.refereeHasBooking,
              referrerBookingsCount: referrerBookingsCount,
              message: verifyReferral.referrerHasBooking && verifyReferral.refereeHasBooking 
                ? 'Both have bookings but status not updated - possible bug'
                : verifyReferral.refereeHasBooking 
                  ? 'Waiting for referrer to make a booking'
                  : 'Waiting for referee to make a booking'
            });
          }
        } else {
          // Also search for any referrals with this referee (by normalized mobile) to see what's there
          const allUsersWithMobile = await User.find({
            mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
          }).select('_id mobile');
          
          const userIds = allUsersWithMobile.map(u => u._id);
          
          const allReferrals = await Referral.find({
            referee: { $in: userIds }
          }).populate('referee', 'name mobile');
          
          console.log('ℹ️ [REFERRAL] No pending/loggedin referral found for referee:', {
            mobile: mongoUser.mobile,
            normalizedMobile: normalizedMobile,
            currentUserId: mongoUser._id.toString(),
            allUserIds: userIds.map(id => id.toString()),
            totalReferralsFound: allReferrals.length,
            referrals: allReferrals.map(r => ({
              id: r._id.toString(),
              status: r.status,
              referrer: r.referrer.toString(),
              referee: r.referee?._id?.toString(),
              refereeMobile: r.referee?.mobile,
              createdAt: r.createdAt
            }))
          });
        }
      } catch (refErr) {
        console.error('❌ [REFERRAL] Error updating referral status:', {
          error: refErr.message,
          errorName: refErr.name,
          errorCode: refErr.code,
          stack: refErr.stack,
          userId: mongoUser._id.toString(),
          mobile: mongoUser.mobile,
          bookingId: booking._id.toString(),
          mongoState: mongoose.connection.readyState
        });
        // Don't fail booking creation if referral update fails
      }
    } else {
      console.log('ℹ️ [REFERRAL] Not first booking - skipping referral update:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        isFirstBookingDone: mongoUser.is_first_booking_done
      });
    }

    // Check and process referrals when booking is created (fire-and-forget)
    if (payment_status === 'paid') {
      setImmediate(() => {
        checkAndProcessReferrals(mongoUser._id).catch(err => 
          console.error('Error processing referrals after booking:', err)
        );
      });
    }

    console.log('🔍 [DEBUG BOOKING] Step 3: Populating booking data for response');
    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name districts vehicles');

    console.log('✅ [DEBUG BOOKING] Booking data populated:', {
      bookingId: bookingData._id.toString(),
      userId: bookingData.user?._id?.toString(),
      userMobile: bookingData.user?.mobile,
      status: bookingData.status,
      payment_status: bookingData.payment_status,
      amount: bookingData.amount,
      vehicle_number: bookingData.vehicle_number
    });

    // Emit WebSocket update for customer bookings too
    console.log('🔍 [DEBUG BOOKING] Step 4: Emitting WebSocket update');
    const fullBookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');
    
    emitBookingUpdate('created', fullBookingData);
    console.log('✅ [DEBUG BOOKING] WebSocket update emitted');

    // Fire-and-forget WhatsApp notification (do not block response)
    try {
      // Ensure we have full populated doc for template fields
      const notifyDoc = await Booking.findById(booking._id)
        .populate('user', 'name mobile email')
        .populate('visiting_state', 'name');
      // No await to keep fast response
      setImmediate(() => {
        sendWhatsAppBookingConfirmation(notifyDoc);
      });
    } catch (notifyErr) {
      console.warn('⚠️ WhatsApp notification scheduling failed:', notifyErr?.message);
    }

    // Fire-and-forget push notification (do not block response)
    try {
      // Fetch user with push tokens for notification
      const userWithTokens = await User.findById(mongoUser._id);
      console.log("dfsdfsd")
      console.log(userWithTokens)
      if (userWithTokens && userWithTokens.pushTokens && userWithTokens.pushTokens.length > 0) {
        const stateName = bookingData?.visiting_state?.name || '';
        const vehicleNo = bookingData?.vehicle_number || '';
        const bookingId = booking._id.toString();
        
        // No await to keep fast response
        setImmediate(() => {
          sendPushNotificationToUser(
            userWithTokens,
            {
              title: 'Booking Confirmed! 🎉',
              body: `Your booking for ${vehicleNo} (${stateName}) has been confirmed. Booking ID: ${bookingId.substring(0, 8).toUpperCase()}`
            },
            {
              type: 'booking_created',
              bookingId: bookingId,
              screen: '/dashboard'
            }
          );
        });
      }
    } catch (pushNotifyErr) {
      console.warn('⚠️ Push notification scheduling failed:', pushNotifyErr?.message);
    }

    // Create scratch card for this booking (fire-and-forget)
    if (payment_status === 'paid') {
      try {
        setImmediate(async () => {
          try {
            await ScratchCard.createForBooking(booking._id, mongoUser._id, payment_id);
            console.log(`✅ Scratch card created for booking ${booking._id}`);
          } catch (scratchErr) {
            if (scratchErr.code !== 11000) { // Ignore duplicate key errors
              console.warn('⚠️ Scratch card creation failed:', scratchErr?.message);
            }
          }
        });
      } catch (scratchErr) {
        console.warn('⚠️ Scratch card scheduling failed:', scratchErr?.message);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log('✅ [DEBUG BOOKING] Booking creation completed successfully');
    console.log('📤 [DEBUG BOOKING] Sending response to client:', {
      bookingId: bookingData._id.toString(),
      status: bookingData.status,
      payment_status: bookingData.payment_status,
      amount: bookingData.amount,
      vehicle_number: bookingData.vehicle_number,
      userId: bookingData.user?._id?.toString(),
      userMobile: bookingData.user?.mobile
    });
    console.log('⏱️ [DEBUG BOOKING] Total processing time:', `${totalDuration}ms`);
    console.log('🟢 [DEBUG BOOKING] ===== END: Create Booking (SUCCESS) =====');

    res.status(201).json(bookingData);
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ [DEBUG BOOKING] ===== ERROR: Create Booking =====');
    console.error('❌ [DEBUG BOOKING] Error details:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      errorCode: error.code,
      duration: `${totalDuration}ms`,
      requestBody: {
        mobile: req.body.mobile,
        vehicle_number: req.body.vehicle_number,
        payment_id: req.body.payment_id
      }
    });
    console.error('🔴 [DEBUG BOOKING] ===== END: Create Booking (ERROR) =====');
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// ============================================
// SCRATCH CARD ROUTES
// ============================================

// Get scratch card by booking ID or payment ID
app.get('/api/scratch-card/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by booking ID (ObjectId) or payment ID
    let scratchCard;
    
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      // Search by booking ID
      scratchCard = await ScratchCard.findOne({ booking: identifier })
        .populate('booking', 'bookingId vehicle_number')
        .populate('user', 'name mobile');
    } else {
      // Search by payment ID
      scratchCard = await ScratchCard.findOne({ paymentId: identifier })
        .populate('booking', 'bookingId vehicle_number')
        .populate('user', 'name mobile');
    }
    
    if (!scratchCard) {
      return res.status(404).json({ 
        error: 'Scratch card not found',
        message: 'No scratch card found for this booking or payment'
      });
    }
    
    // Don't reveal cashback amount if not scratched
    const response = {
      _id: scratchCard._id,
      booking: scratchCard.booking,
      user: scratchCard.user,
      isScratched: scratchCard.isScratched,
      scratchedAt: scratchCard.scratchedAt,
      status: scratchCard.status,
      cashbackAmount: scratchCard.isScratched ? scratchCard.cashbackAmount : null,
      createdAt: scratchCard.createdAt
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching scratch card:', error);
    res.status(500).json({ error: 'Failed to fetch scratch card', details: error.message });
  }
});

// Scratch the card (reveal cashback)
app.post('/api/scratch-card/:id/scratch', async (req, res) => {
  try {
    const { id } = req.params;
    
    const scratchCard = await ScratchCard.findById(id);
    if (!scratchCard) {
      return res.status(404).json({ error: 'Scratch card not found' });
    }
    
    if (scratchCard.isScratched) {
      return res.status(400).json({ 
        error: 'Already scratched',
        cashbackAmount: scratchCard.cashbackAmount,
        status: scratchCard.status
      });
    }
    
    await scratchCard.scratch();
    
    res.json({
      success: true,
      cashbackAmount: scratchCard.cashbackAmount,
      message: `Congratulations! You won ₹${scratchCard.cashbackAmount} cashback!`,
      status: scratchCard.status
    });
  } catch (error) {
    console.error('Error scratching card:', error);
    res.status(500).json({ error: 'Failed to scratch card', details: error.message });
  }
});

// Redeem cashback
app.post('/api/scratch-card/:id/redeem', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💰 [CASHBACK API] Redeem request received', { scratchCardId: id });
    
    let scratchCard = await ScratchCard.findById(id).populate('user');
    if (!scratchCard) {
      console.error('❌ [CASHBACK API] Scratch card not found', { scratchCardId: id });
      return res.status(404).json({ error: 'Scratch card not found' });
    }

    await scratchCard.populate('booking', 'bookingId');
    
    console.log('💰 [CASHBACK API] Scratch card found', {
      scratchCardId: id,
      userId: scratchCard.user?._id,
      userMobile: scratchCard.user?.mobile,
      cashbackAmount: scratchCard.cashbackAmount,
      isScratched: scratchCard.isScratched,
      status: scratchCard.status,
      paymentId: scratchCard.paymentId
    });
    
    if (!scratchCard.isScratched) {
      console.error('❌ [CASHBACK API] Card not scratched yet', { scratchCardId: id });
      return res.status(400).json({ error: 'Scratch card must be scratched before redemption' });
    }
    
    if (scratchCard.status === 'redeemed') {
      console.error('❌ [CASHBACK API] Already redeemed', { 
        scratchCardId: id,
        walletCredit: scratchCard.walletCredit
      });
      return res.status(400).json({ 
        error: 'Cashback has already been redeemed',
        walletCredit: scratchCard.walletCredit
      });
    }

    if (!scratchCard.user) {
      console.error('❌ [CASHBACK API] Scratch card missing user', { scratchCardId: id });
      return res.status(400).json({ error: 'Scratch card is not linked to a user' });
    }

    const user = scratchCard.user;
    const now = new Date();
    user.wallet = user.wallet || {};
    user.wallet.balance = Number(user.wallet.balance || 0);
    user.wallet.totalEarned = Number(user.wallet.totalEarned || 0);
    user.wallet.totalRedeemed = Number(user.wallet.totalRedeemed || 0);
    user.wallet.transactions = Array.isArray(user.wallet.transactions) ? user.wallet.transactions : [];

    const transactionId = new mongoose.Types.ObjectId();
    const newBalance = user.wallet.balance + scratchCard.cashbackAmount;
    const transaction = {
      _id: transactionId,
      type: 'credit',
      amount: scratchCard.cashbackAmount,
      source: 'scratch_card',
      referenceId: scratchCard.booking?.bookingId || scratchCard.paymentId || scratchCard._id.toString(),
      description: `Cashback for booking ${scratchCard.booking?.bookingId || scratchCard._id.toString()}`,
      balanceAfter: newBalance,
      metadata: {
        scratchCardId: scratchCard._id.toString(),
        paymentId: scratchCard.paymentId || null
      },
      createdAt: now
    };

    user.wallet.balance = newBalance;
    user.wallet.totalEarned += scratchCard.cashbackAmount;
    user.wallet.lastUpdatedAt = now;
    user.wallet.transactions.unshift(transaction);
    if (user.wallet.transactions.length > 100) {
      user.wallet.transactions = user.wallet.transactions.slice(0, 100);
    }

    await user.save();
    await scratchCard.redeemToWallet(transactionId, scratchCard.cashbackAmount, newBalance);

    console.log('💾 [DATABASE] Wallet credited successfully', {
      userId: user._id,
      newBalance,
      transactionId: transactionId.toString()
    });

    if (user.pushTokens && user.pushTokens.length > 0) {
      try {
        await sendPushNotificationToUser(
          user,
          {
            title: '🎉 Cashback Added!',
            body: `₹${scratchCard.cashbackAmount} has been added to your SafarTax Wallet.`
          },
          {
            type: 'cashback_wallet_credit',
            cashbackAmount: scratchCard.cashbackAmount.toString(),
            walletBalance: newBalance,
            transactionId: transactionId.toString(),
            scratchCardId: scratchCard._id.toString()
          }
        );
        console.log(`✅ [PUSH NOTIFICATION] Wallet credit notification sent to ${user.mobile}`);
      } catch (notifErr) {
        console.error('❌ [PUSH NOTIFICATION] Failed to send wallet notification:', {
          error: notifErr.message,
          userMobile: user.mobile
        });
      }
    }

    console.log('🎉 [CASHBACK API] Redemption completed successfully!', {
      scratchCardId: id,
      walletBalance: newBalance,
      transactionId: transactionId.toString()
    });
    
    res.json({
      success: true,
      message: `₹${scratchCard.cashbackAmount} has been added to your SafarTax Wallet!`,
      cashbackAmount: scratchCard.cashbackAmount,
      walletBalance: newBalance,
      walletTransactionId: transactionId.toString(),
      walletSummary: {
        balance: newBalance,
        totalEarned: user.wallet.totalEarned,
        totalRedeemed: user.wallet.totalRedeemed,
        lastUpdated: now.toISOString()
      },
      status: scratchCard.status,
      redeemedAt: scratchCard.redeemedAt
    });
  } catch (error) {
    console.error('❌ [CASHBACK API] Unexpected error redeeming cashback:', {
      error: error.message,
      stack: error.stack,
      scratchCardId: req.params.id
    });
    res.status(500).json({ error: 'Failed to redeem cashback', details: error.message });
  }
});

// ============================================
// WALLET ROUTES
// ============================================

app.get('/api/wallet/summary', async (req, res) => {
  try {
    // Authenticate mobile app user (like referrals/history endpoint)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user in JSON file
    const jsonUser = getUsers().users.find(u => u.id === decoded.userId);
    if (!jsonUser || !jsonUser.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Find user in MongoDB
    const normalizedMobile = String(jsonUser.mobile).replace(/\D/g, '').slice(-10);
    const user = await User.findOne({ 
      mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const userId = user._id;

    user.wallet = user.wallet || {
      balance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      transactions: [],
      lastUpdatedAt: null
    };

    const pendingAgg = await ScratchCard.aggregate([
      {
        $match: {
          user: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
          status: { $in: ['pending', 'scratched'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$cashbackAmount' }
        }
      }
    ]);

    const pendingCashback = pendingAgg.length > 0 ? pendingAgg[0].total : 0;
    const lastUpdated =
      user.wallet.lastUpdatedAt ||
      (user.wallet.transactions && user.wallet.transactions.length > 0
        ? user.wallet.transactions[0].createdAt
        : user.updatedAt || new Date());

    res.json({
      balance: user.wallet.balance || 0,
      totalEarned: user.wallet.totalEarned || 0,
      totalRedeemed: user.wallet.totalRedeemed || 0,
      pendingCashback,
      lastUpdated: lastUpdated instanceof Date ? lastUpdated.toISOString() : new Date(lastUpdated).toISOString()
    });
  } catch (error) {
    console.error('[Wallet] Failed to fetch summary', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch wallet summary', details: error.message });
  }
});

app.post('/api/wallet/redeem', async (req, res) => {
  try {
    // Authenticate mobile app user (like referrals/history endpoint)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user in JSON file
    const jsonUser = getUsers().users.find(u => u.id === decoded.userId);
    if (!jsonUser || !jsonUser.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Find user in MongoDB
    const normalizedMobile = String(jsonUser.mobile).replace(/\D/g, '').slice(-10);
    const user = await User.findOne({ 
      mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const { amount, bookingId } = req.body;
    const redeemAmount = Number(amount);

    if (!redeemAmount || redeemAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    user.wallet = user.wallet || {
      balance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      transactions: [],
      lastUpdatedAt: null
    };

    if ((user.wallet.balance || 0) < redeemAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const transactionId = new mongoose.Types.ObjectId();
    const newBalance = (user.wallet.balance || 0) - redeemAmount;
    const now = new Date();

    const transaction = {
      _id: transactionId,
      type: 'debit',
      amount: redeemAmount,
      source: 'booking',
      referenceId: bookingId || undefined,
      description: bookingId ? `Wallet applied to booking ${bookingId}` : 'Wallet redeemed for booking',
      balanceAfter: newBalance,
      metadata: {
        bookingId: bookingId || null
      },
      createdAt: now
    };

    user.wallet.balance = newBalance;
    user.wallet.totalRedeemed = (user.wallet.totalRedeemed || 0) + redeemAmount;
    user.wallet.lastUpdatedAt = now;
    user.wallet.transactions = Array.isArray(user.wallet.transactions) ? user.wallet.transactions : [];
    user.wallet.transactions.unshift(transaction);
    if (user.wallet.transactions.length > 100) {
      user.wallet.transactions = user.wallet.transactions.slice(0, 100);
    }

    await user.save();

    res.json({
      success: true,
      message: `₹${redeemAmount} has been applied from your wallet.`,
      balance: newBalance,
      redeemedAmount: redeemAmount,
      transactionId: transactionId.toString()
    });
  } catch (error) {
    console.error('[Wallet] Failed to redeem balance', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id || req.user?.id
    });
    res.status(500).json({ error: 'Failed to redeem wallet balance', details: error.message });
  }
});

// ============================================
// REFERRAL SYSTEM
// ============================================

// Helper function to encode a number to base30 (using safe characters)
// Removes confusing characters: 0, O, 1, I, L, l
// Only includes: 2-9, A-H, J-K, M-N, P-Z (30 safe characters)
// This ensures codes are easy to type on mobile signup screens
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 30 characters (removed 0,O,1,I,L,l)
const BASE = SAFE_CHARS.length; // 30

// Capacity: 30^6 = 729,000,000 unique codes (more than enough for 10 lakh users)
// Format: SAFAR + 6 safe characters (total 11 characters)

function encodeToSafeBase36(num) {
  if (num === 0) return SAFE_CHARS[0];
  
  let encoded = '';
  let number = num;
  
  while (number > 0) {
    encoded = SAFE_CHARS[number % BASE] + encoded;
    number = Math.floor(number / BASE);
  }
  
  return encoded;
}

// Helper function to create referral record when user signs up with referral code
async function createReferralRecordOnSignup(mobile, name, email, referralCode) {
  const startTime = Date.now();
  console.log('🔵 [DEBUG REFERRAL] ===== START: createReferralRecordOnSignup =====');
  console.log('📥 [DEBUG REFERRAL] Input parameters:', {
    mobile: mobile,
    name: name,
    email: email || 'not provided',
    referralCode: referralCode,
    timestamp: new Date().toISOString()
  });

  try {
    if (!referralCode || !mobile) {
      console.log('⚠️ [DEBUG REFERRAL] Missing required parameters:', {
        hasReferralCode: !!referralCode,
        hasMobile: !!mobile
      });
      return;
    }

    const normalizedMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const codeToSearch = referralCode.trim().toUpperCase();

    console.log('📝 [DEBUG REFERRAL] Normalized values:', {
      originalMobile: mobile,
      normalizedMobile: normalizedMobile,
      originalCode: referralCode,
      codeToSearch: codeToSearch
    });

    // Find or create MongoDB user (referee)
    console.log('🔍 [DEBUG REFERRAL] Step 1: Finding/creating MongoDB user (referee)');
    let mongoUser = await User.findOne({ 
      mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
    });

    console.log('🔍 [DEBUG REFERRAL] MongoDB user lookup result:', {
      found: !!mongoUser,
      userId: mongoUser?._id?.toString(),
      mobile: mongoUser?.mobile,
      name: mongoUser?.name
    });

    if (!mongoUser) {
      console.log('👤 [DEBUG REFERRAL] Creating new MongoDB user (referee)');
      mongoUser = new User({
        mobile: mobile,
        name: name || mobile,
        email: email || undefined,
        isActive: true,
        is_first_booking_done: false
      });
      await mongoUser.save();
      console.log('✅ [DEBUG REFERRAL] MongoDB user created:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        name: mongoUser.name
      });
    } else {
      console.log('✅ [DEBUG REFERRAL] Using existing MongoDB user:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        name: mongoUser.name
      });
    }

    // Generate referral code for referee if missing
    console.log('🔍 [DEBUG REFERRAL] Step 2: Checking/ generating referral code for referee');
    if (!mongoUser.referralCode) {
      console.log('🔑 [DEBUG REFERRAL] Generating referral code for referee');
      mongoUser.referralCode = await generateReferralCode(mongoUser._id);
      await mongoUser.save();
      console.log('✅ [DEBUG REFERRAL] Referral code generated:', {
        userId: mongoUser._id.toString(),
        referralCode: mongoUser.referralCode
      });
    } else {
      console.log('✅ [DEBUG REFERRAL] Referee already has referral code:', mongoUser.referralCode);
    }

    // Check if referral already exists
    console.log('🔍 [DEBUG REFERRAL] Step 3: Checking for existing referral record');
    const existingReferral = await Referral.findOne({
      referee: mongoUser._id,
      referralCode: codeToSearch
    });

    console.log('🔍 [DEBUG REFERRAL] Existing referral check result:', {
      found: !!existingReferral,
      referralId: existingReferral?._id?.toString(),
      status: existingReferral?.status,
      createdAt: existingReferral?.createdAt
    });

    if (existingReferral) {
      console.log('ℹ️ [DEBUG REFERRAL] Referral already exists, skipping creation:', {
        referralId: existingReferral._id.toString(),
        status: existingReferral.status,
        referrerId: existingReferral.referrer.toString(),
        refereeId: existingReferral.referee.toString()
      });
      console.log('🔴 [DEBUG REFERRAL] ===== END: createReferralRecordOnSignup (skipped - exists) =====');
      return;
    }

    // Find referrer by referral code
    console.log('🔍 [DEBUG REFERRAL] Step 4: Finding referrer by referral code');
    let referrer = await User.findOne({ 
      referralCode: codeToSearch
    });

    console.log('🔍 [DEBUG REFERRAL] Exact match search result:', {
      found: !!referrer,
      userId: referrer?._id?.toString(),
      mobile: referrer?.mobile,
      code: referrer?.referralCode
    });

    if (!referrer) {
      // Try case-insensitive regex search
      console.log('🔍 [DEBUG REFERRAL] Trying case-insensitive regex search');
      const regexPattern = `^${codeToSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
      referrer = await User.findOne({ 
        referralCode: { $regex: new RegExp(regexPattern, 'i') }
      });
      console.log('🔍 [DEBUG REFERRAL] Regex search result:', {
        found: !!referrer,
        userId: referrer?._id?.toString(),
        mobile: referrer?.mobile,
        code: referrer?.referralCode
      });
    }

    if (!referrer) {
      console.warn('⚠️ [DEBUG REFERRAL] Referrer not found for code:', {
        searchedCode: codeToSearch,
        codeLength: codeToSearch.length,
        refereeId: mongoUser._id.toString()
      });
      console.log('🔴 [DEBUG REFERRAL] ===== END: createReferralRecordOnSignup (referrer not found) =====');
      return;
    }

    // Prevent self-referral
    console.log('🔍 [DEBUG REFERRAL] Step 5: Checking for self-referral');
    if (referrer._id.toString() === mongoUser._id.toString()) {
      console.warn('⚠️ [DEBUG REFERRAL] Self-referral detected:', {
        userId: mongoUser._id.toString(),
        mobile: mongoUser.mobile,
        referralCode: codeToSearch,
        userReferralCode: mongoUser.referralCode
      });
      console.log('🔴 [DEBUG REFERRAL] ===== END: createReferralRecordOnSignup (self-referral blocked) =====');
      return;
    }

    console.log('✅ [DEBUG REFERRAL] Referrer found:', {
      referrerId: referrer._id.toString(),
      referrerMobile: referrer.mobile,
      referrerName: referrer.name,
      referrerCode: referrer.referralCode
    });

    // Get referrer's current cycle
    console.log('🔍 [DEBUG REFERRAL] Step 6: Getting referrer stats and cycle');
    const currentCycle = referrer.referralStats?.currentCycle || 1;
    console.log('📊 [DEBUG REFERRAL] Referrer stats:', {
      currentCycle: currentCycle,
      totalReferrals: referrer.referralStats?.totalReferrals || 0,
      currentCycleReferrals: referrer.referralStats?.currentCycleReferrals || 0,
      completedReferrals: referrer.referralStats?.completedReferrals || 0
    });

    // Create referral record with 'pending' status
    console.log('📝 [DEBUG REFERRAL] Step 7: Creating referral record with pending status');
    const referral = new Referral({
      referrer: referrer._id,
      referee: mongoUser._id,
      referralCode: codeToSearch,
      status: 'pending',
      cycleNumber: currentCycle,
      signedUpAt: new Date()
    });

    console.log('💾 [DEBUG REFERRAL] Saving referral record to database...');
    await referral.save();
    const savedReferral = await Referral.findById(referral._id).populate('referrer', 'name mobile').populate('referee', 'name mobile');
    
    console.log('✅ [DEBUG REFERRAL] Referral record created with pending status:', {
      referralId: referral._id.toString(),
      referrerId: referrer._id.toString(),
      referrerMobile: referrer.mobile,
      referrerName: referrer.name,
      refereeId: mongoUser._id.toString(),
      refereeMobile: mongoUser.mobile,
      refereeName: mongoUser.name,
      referralCode: codeToSearch,
      status: 'pending',
      cycleNumber: currentCycle,
      signedUpAt: referral.signedUpAt,
      createdAt: referral.createdAt,
      verified: savedReferral ? 'Yes' : 'No'
    });

    // Update referrer stats
    console.log('📊 [DEBUG REFERRAL] Step 8: Updating referrer stats');
    const oldStats = {
      totalReferrals: referrer.referralStats?.totalReferrals || 0,
      currentCycleReferrals: referrer.referralStats?.currentCycleReferrals || 0
    };

    referrer.referralStats = referrer.referralStats || {
      totalReferrals: 0,
      completedReferrals: 0,
      rewardedReferrals: 0,
      currentCycleReferrals: 0,
      currentCycle: 1,
      totalRewardsEarned: 0
    };

    referrer.referralStats.totalReferrals = (referrer.referralStats.totalReferrals || 0) + 1;
    referrer.referralStats.currentCycleReferrals = (referrer.referralStats.currentCycleReferrals || 0) + 1;
    
    console.log('📊 [DEBUG REFERRAL] Referrer stats update:', {
      before: oldStats,
      after: {
        totalReferrals: referrer.referralStats.totalReferrals,
        currentCycleReferrals: referrer.referralStats.currentCycleReferrals
      },
      changes: {
        totalReferrals: `+1 (${oldStats.totalReferrals} → ${referrer.referralStats.totalReferrals})`,
        currentCycleReferrals: `+1 (${oldStats.currentCycleReferrals} → ${referrer.referralStats.currentCycleReferrals})`
      }
    });

    await referrer.save();
    console.log('✅ [DEBUG REFERRAL] Referrer stats saved');

    // Update referee's used referral code
    console.log('📝 [DEBUG REFERRAL] Step 9: Updating referee user fields');
    const oldRefereeFields = {
      usedReferralCode: mongoUser.usedReferralCode,
      referred_code: mongoUser.referred_code
    };

    mongoUser.usedReferralCode = codeToSearch;
    mongoUser.referred_code = codeToSearch;
    await mongoUser.save();

    console.log('✅ [DEBUG REFERRAL] Referee fields updated:', {
      before: oldRefereeFields,
      after: {
        usedReferralCode: mongoUser.usedReferralCode,
        referred_code: mongoUser.referred_code
      }
    });

    const duration = Date.now() - startTime;
    console.log('✅ [DEBUG REFERRAL] ===== END: createReferralRecordOnSignup (SUCCESS) =====');
    console.log('⏱️ [DEBUG REFERRAL] Total execution time:', `${duration}ms`);
    console.log('📋 [DEBUG REFERRAL] Summary:', {
      referralId: referral._id.toString(),
      status: 'pending',
      referrer: referrer.mobile,
      referee: mongoUser.mobile,
      referralCode: codeToSearch,
      duration: `${duration}ms`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [DEBUG REFERRAL] ===== ERROR: createReferralRecordOnSignup =====');
    console.error('❌ [DEBUG REFERRAL] Error details:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      mobile: mobile,
      referralCode: referralCode,
      duration: `${duration}ms`
    });
    console.error('🔴 [DEBUG REFERRAL] ===== END: createReferralRecordOnSignup (ERROR) =====');
    throw error;
  }
}

// Helper function to generate unique referral code based on user ID
// Format: SAFAR + 6 characters (base30 encoded user ID hash)
// This ensures uniqueness and is easy to type (no confusing 0/O, 1/I, L/l)
// Capacity: 30^6 = 729 million unique codes (more than enough for 10 lakh users)
async function generateReferralCode(userId = null) {
  const maxAttempts = 10;
  
  // If userId is provided, generate deterministic code from it
  if (userId) {
    try {
      // Convert ObjectId to string and create a hash from it
      const userIdStr = userId.toString();
      
      // Use last 8 hex characters of ObjectId for better distribution
      // ObjectId is 24 hex chars, last 8 gives us 16^8 = 4.3 billion combinations
      const hexHash = userIdStr.substring(userIdStr.length - 8);
      const numFromHash = parseInt(hexHash, 16); // Convert hex to number (max: 4,294,967,295)
      
      // Encode to safe base30 (6 characters = 30^6 = 729 million combinations)
      let encoded = encodeToSafeBase36(numFromHash);
      
      // Pad or truncate to exactly 6 characters
      if (encoded.length < 6) {
        // Pad with leading 2s (safe char) if needed for consistent length
        encoded = encoded.padStart(6, SAFE_CHARS[0]);
      } else if (encoded.length > 6) {
        // Take last 6 characters if longer
        encoded = encoded.substring(encoded.length - 6);
      }
      
      const code = `SAFAR${encoded}`;
      
      // Verify uniqueness (should never collide with deterministic generation)
      // But check to be safe, especially for existing users without codes
      const existing = await User.findOne({ referralCode: code, _id: { $ne: userId } });
      if (!existing) {
        return code;
      }
      
      // If collision detected (extremely rare), add suffix
      console.warn(`[REFERRAL CODE] Collision detected for code ${code}, generating with suffix`);
      let attempt = 1;
      while (attempt < 100) {
        const suffix = encodeToSafeBase36(attempt).padStart(2, SAFE_CHARS[0]).substring(0, 2);
        const newCode = `SAFAR${encoded.substring(0, 4)}${suffix}`;
        const checkExisting = await User.findOne({ referralCode: newCode, _id: { $ne: userId } });
        if (!checkExisting) {
          return newCode;
        }
        attempt++;
      }
      
      // Fall through to random generation if all attempts fail
    } catch (error) {
      console.error('Error generating deterministic referral code:', error);
      // Fall through to random generation
    }
  }
  
  // Fallback: Random generation with collision detection
  for (let i = 0; i < maxAttempts; i++) {
    // Generate 6 random safe characters
    let randomCode = '';
    for (let j = 0; j < 6; j++) {
      const randomIdx = Math.floor(Math.random() * BASE);
      randomCode += SAFE_CHARS[randomIdx];
    }
    
    const code = `SAFAR${randomCode}`;
    
    // Check if code already exists
    const existing = await User.findOne({ referralCode: code });
    if (!existing) {
      return code;
    }
  }
  
  // Final fallback: timestamp-based with safe encoding
  const timestamp = Date.now();
  const encoded = encodeToSafeBase36(timestamp % Math.pow(BASE, 6)); // Last 6 digits in base30
  const padded = encoded.padStart(6, SAFE_CHARS[0]);
  return `SAFAR${padded.substring(padded.length - 6)}`;
}

// Helper function to check and process referrals after booking
async function checkAndProcessReferrals(userId) {
  try {
    // Check if this user has bookings (any booking)
    const userBookings = await Booking.countDocuments({ user: userId, status: 'paid' });
    const userHasBooking = userBookings > 0;

    if (!userHasBooking) {
      return; // No bookings, nothing to process
    }

    // Update referrals where this user is the referrer
    const referrerReferrals = await Referral.find({
      referrer: userId,
      status: 'pending'
    });

    for (const referral of referrerReferrals) {
      let updated = false;
      
      // Update referrer booking status if not already set
      if (!referral.referrerHasBooking) {
        referral.referrerHasBooking = true;
        referral.referrerBookingDate = new Date();
        updated = true;
      }

      // Check if referee also has bookings
      const refereeBookingsCount = await Booking.countDocuments({ 
        user: referral.referee, 
        status: 'paid' 
      });
      
      if (refereeBookingsCount > 0 && !referral.refereeHasBooking) {
        referral.refereeHasBooking = true;
        referral.refereeBookingDate = new Date();
        updated = true;
      }

      // If both have bookings, mark as completed
      if (updated) {
        await referral.save();
        if (referral.referrerHasBooking && referral.refereeHasBooking) {
          await referral.markAsCompleted();
          await checkAndAwardReferralReward(referral.referrer);
        }
      }
    }

    // Update referrals where this user is the referee
    const refereeReferrals = await Referral.find({
      referee: userId,
      status: 'pending'
    });

    for (const referral of refereeReferrals) {
      let updated = false;
      
      // Update referee booking status if not already set
      if (!referral.refereeHasBooking) {
        referral.refereeHasBooking = true;
        referral.refereeBookingDate = new Date();
        updated = true;
      }

      // Check if referrer also has bookings
      const referrerBookingsCount = await Booking.countDocuments({ 
        user: referral.referrer, 
        status: 'paid' 
      });
      
      if (referrerBookingsCount > 0 && !referral.referrerHasBooking) {
        referral.referrerHasBooking = true;
        referral.referrerBookingDate = new Date();
        updated = true;
      }

      // If both have bookings, mark as completed
      if (updated) {
        await referral.save();
        if (referral.referrerHasBooking && referral.refereeHasBooking) {
          await referral.markAsCompleted();
          await checkAndAwardReferralReward(referral.referrer);
        }
      }
    }

  } catch (error) {
    console.error('Error checking and processing referrals:', error);
  }
}

// Helper function to check if user should get ₹100 reward after 5 completed referrals
async function checkAndAwardReferralReward(userId) {
  const startTime = Date.now();
  console.log('🔵 [DEBUG REWARD] ===== START: checkAndAwardReferralReward =====');
  console.log('📥 [DEBUG REWARD] Input:', {
    userId: userId.toString(),
    timestamp: new Date().toISOString()
  });

  try {
    console.log('🔍 [DEBUG REWARD] Step 1: Finding user in database');
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('⚠️ [DEBUG REWARD] User not found:', userId.toString());
      return;
    }

    console.log('✅ [DEBUG REWARD] User found:', {
      userId: user._id.toString(),
      mobile: user.mobile,
      name: user.name,
      currentCycle: user.referralStats?.currentCycle || 1,
      totalRewardsEarned: user.referralStats?.totalRewardsEarned || 0
    });

    // Get current cycle referrals
    const currentCycle = user.referralStats?.currentCycle || 1;
    console.log('🔍 [DEBUG REWARD] Step 2: Counting completed referrals in current cycle');
    const completedReferrals = await Referral.find({
      referrer: userId,
      status: 'completed',
      cycleNumber: currentCycle
    }).countDocuments();

    console.log('📊 [DEBUG REWARD] Completed referrals count:', {
      currentCycle: currentCycle,
      completedReferrals: completedReferrals,
      requiredForReward: 5,
      eligibleForReward: completedReferrals >= 5
    });

    // Check if user has 5 completed referrals in current cycle
    if (completedReferrals >= 5) {
      console.log('🎉 [DEBUG REWARD] User is eligible for reward!');
      // Award ₹100
      console.log('💰 [DEBUG REWARD] Step 3: Processing reward award');
      const rewardAmount = 100;
      const transactionId = new mongoose.Types.ObjectId();
      const now = new Date();
      
      const oldWallet = {
        balance: user.wallet?.balance || 0,
        totalEarned: user.wallet?.totalEarned || 0
      };
      
      user.wallet = user.wallet || {
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        transactions: [],
        lastUpdatedAt: null
      };

      const newBalance = (user.wallet.balance || 0) + rewardAmount;
      const transaction = {
        _id: transactionId,
        type: 'credit',
        amount: rewardAmount,
        source: 'referral_reward',
        description: `Referral reward for 5 completed referrals (Cycle ${currentCycle})`,
        balanceAfter: newBalance,
        metadata: {
          cycleNumber: currentCycle,
          referralCount: completedReferrals
        },
        createdAt: now
      };

      console.log('💰 [DEBUG REWARD] Wallet update:', {
        before: oldWallet,
        rewardAmount: rewardAmount,
        newBalance: newBalance,
        transactionId: transactionId.toString()
      });

      user.wallet.balance = newBalance;
      user.wallet.totalEarned = (user.wallet.totalEarned || 0) + rewardAmount;
      user.wallet.lastUpdatedAt = now;
      user.wallet.transactions = Array.isArray(user.wallet.transactions) ? user.wallet.transactions : [];
      user.wallet.transactions.unshift(transaction);
      if (user.wallet.transactions.length > 100) {
        user.wallet.transactions = user.wallet.transactions.slice(0, 100);
      }

      console.log('✅ [DEBUG REWARD] Wallet updated:', {
        newBalance: user.wallet.balance,
        totalEarned: user.wallet.totalEarned,
        transactionAdded: true
      });

      // Update referral stats
      console.log('📊 [DEBUG REWARD] Step 4: Updating referral stats');
      const oldStats = {
        rewardedReferrals: user.referralStats?.rewardedReferrals || 0,
        totalRewardsEarned: user.referralStats?.totalRewardsEarned || 0,
        currentCycle: user.referralStats?.currentCycle || 1,
        currentCycleReferrals: user.referralStats?.currentCycleReferrals || 0
      };

      user.referralStats = user.referralStats || {
        totalReferrals: 0,
        completedReferrals: 0,
        rewardedReferrals: 0,
        currentCycleReferrals: 0,
        currentCycle: 1,
        totalRewardsEarned: 0
      };

      user.referralStats.rewardedReferrals = (user.referralStats.rewardedReferrals || 0) + 5;
      user.referralStats.totalRewardsEarned = (user.referralStats.totalRewardsEarned || 0) + rewardAmount;
      user.referralStats.lastRewardedAt = now;
      user.referralStats.currentCycleReferrals = 0; // Reset for new cycle
      user.referralStats.currentCycle = currentCycle + 1; // Move to next cycle

      console.log('📊 [DEBUG REWARD] Referral stats update:', {
        before: oldStats,
        after: {
          rewardedReferrals: user.referralStats.rewardedReferrals,
          totalRewardsEarned: user.referralStats.totalRewardsEarned,
          currentCycle: user.referralStats.currentCycle,
          currentCycleReferrals: user.referralStats.currentCycleReferrals
        },
        changes: {
          cycleTransition: `${oldStats.currentCycle} → ${user.referralStats.currentCycle}`,
          rewardedReferrals: `+5 (${oldStats.rewardedReferrals} → ${user.referralStats.rewardedReferrals})`,
          totalRewardsEarned: `+${rewardAmount} (${oldStats.totalRewardsEarned} → ${user.referralStats.totalRewardsEarned})`
        }
      });

      // Mark the 5 referrals as rewarded
      console.log('🔍 [DEBUG REWARD] Step 5: Finding referrals to mark as rewarded');
      const referralsToMark = await Referral.find({
        referrer: userId,
        status: 'completed',
        cycleNumber: currentCycle
      }).limit(5);

      console.log('🔍 [DEBUG REWARD] Referrals to mark as rewarded:', {
        count: referralsToMark.length,
        referralIds: referralsToMark.map(r => r._id.toString())
      });

      for (let i = 0; i < referralsToMark.length; i++) {
        const referral = referralsToMark[i];
        console.log(`📝 [DEBUG REWARD] Marking referral ${i + 1}/${referralsToMark.length} as rewarded:`, {
          referralId: referral._id.toString(),
          currentStatus: referral.status,
          willSetStatus: 'rewarded',
          rewardAmount: rewardAmount
        });
        
        await referral.markAsRewarded(rewardAmount, transactionId);
        
        const updated = await Referral.findById(referral._id);
        console.log('✅ [DEBUG REWARD] Referral marked as rewarded:', {
          referralId: referral._id.toString(),
          status: updated.status,
          rewardAmount: updated.rewardAmount,
          rewardedAt: updated.rewardedAt
        });
      }

      console.log('💾 [DEBUG REWARD] Step 6: Saving user with updated stats and wallet');
      await user.save();
      console.log('✅ [DEBUG REWARD] User saved successfully');

      const duration = Date.now() - startTime;
      console.log('🎉 [DEBUG REWARD] ===== END: Reward awarded successfully =====');
      console.log('📋 [DEBUG REWARD] Summary:', {
        userId: userId.toString(),
        mobile: user.mobile,
        rewardAmount: rewardAmount,
        newBalance: newBalance,
        cycleCompleted: currentCycle,
        nextCycle: user.referralStats.currentCycle,
        referralsMarked: referralsToMark.length,
        duration: `${duration}ms`
      });

      // Send push notification
      console.log('📱 [DEBUG REWARD] Step 7: Sending push notification');
      if (user.pushTokens && user.pushTokens.length > 0) {
        console.log('📱 [DEBUG REWARD] User has push tokens:', {
          tokenCount: user.pushTokens.length
        });
        try {
          await sendPushNotificationToUser(
            user,
            {
              title: '🎉 Referral Reward!',
              body: `Congratulations! ₹${rewardAmount} has been added to your wallet for 5 successful referrals.`
            },
            {
              type: 'referral_reward',
              amount: rewardAmount.toString(),
              cycle: currentCycle.toString()
            }
          );
          console.log('✅ [DEBUG REWARD] Push notification sent successfully');
        } catch (notifErr) {
          console.error('❌ [DEBUG REWARD] Failed to send push notification:', {
            error: notifErr.message,
            stack: notifErr.stack
          });
        }
      } else {
        console.log('ℹ️ [DEBUG REWARD] User has no push tokens, skipping notification');
      }
    } else {
      console.log('ℹ️ [DEBUG REWARD] User not eligible for reward:', {
        completedReferrals: completedReferrals,
        required: 5,
        needMore: 5 - completedReferrals
      });
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [DEBUG REWARD] ===== ERROR: checkAndAwardReferralReward =====');
    console.error('❌ [DEBUG REWARD] Error details:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      userId: userId.toString(),
      duration: `${duration}ms`
    });
    console.error('🔴 [DEBUG REWARD] ===== END: Reward check (ERROR) =====');
  }
}

// Get referral stats for a user
app.get('/api/referrals/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Find user by mobile
    const jsonUser = getUsers().users.find(u => u.id === decoded.userId);
    if (!jsonUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedMobile = String(jsonUser.mobile).replace(/\D/g, '').slice(-10);
    let mongoUser = await User.findOne({ 
      mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
    });

    if (!mongoUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Generate referral code if user doesn't have one
    if (!mongoUser.referralCode) {
      mongoUser.referralCode = await generateReferralCode(mongoUser._id);
      await mongoUser.save();
      console.log('✅ [REFERRAL STATS] Generated referral code for user:', mongoUser.mobile, mongoUser.referralCode);
    }

    const currentCycle = mongoUser.referralStats?.currentCycle || 1;
    
    // Get detailed referral counts by status
    const pendingReferrals = await Referral.find({
      referrer: mongoUser._id,
      status: 'pending',
      cycleNumber: currentCycle
    }).countDocuments();

    const loggedinReferrals = await Referral.find({
      referrer: mongoUser._id,
      status: 'loggedin',
      cycleNumber: currentCycle
    }).countDocuments();

    const completedReferrals = await Referral.find({
      referrer: mongoUser._id,
      status: 'completed',
      cycleNumber: currentCycle
    }).countDocuments();

    const rewardedReferrals = await Referral.find({
      referrer: mongoUser._id,
      status: 'rewarded',
      cycleNumber: currentCycle
    }).countDocuments();

    // Total referrals across all cycles
    const totalReferrals = await Referral.find({
      referrer: mongoUser._id
    }).countDocuments();

    // Total referrals in current cycle
    const totalCurrentCycleReferrals = pendingReferrals + loggedinReferrals + completedReferrals + rewardedReferrals;

    // Referrals that have signed up (pending + loggedin + completed + rewarded)
    const signedUpReferrals = pendingReferrals + loggedinReferrals + completedReferrals + rewardedReferrals;
    
    // Referrals that have logged in (loggedin + completed + rewarded)
    const loggedInReferrals = loggedinReferrals + completedReferrals + rewardedReferrals;
    
    // Referrals that have booked (completed + rewarded)
    const bookedReferrals = completedReferrals + rewardedReferrals;

    // Get referral required count and reward amount from settings or defaults
    const settings = await Settings.findOne({});
    const referralRequiredCount = settings?.referralRequiredCount || 5;
    const referralRewardAmount = settings?.referralRewardAmount || 100;

    const referralsUntilReward = Math.max(0, referralRequiredCount - completedReferrals);

    res.json({
      referralCode: mongoUser.referralCode || null,
      currentCycle,
      // Detailed breakdown
      pendingReferrals,        // Signed up but not logged in
      loggedinReferrals,       // Logged in but no booking
      completedReferrals,      // Have bookings (completed)
      rewardedReferrals,       // Have bookings and rewarded
      // Summary counts
      signedUpReferrals,       // Total signed up (all statuses)
      loggedInReferrals,       // Total logged in (loggedin + completed + rewarded)
      bookedReferrals,         // Total booked (completed + rewarded)
      totalReferrals,          // Total across all cycles
      totalCurrentCycleReferrals, // Total in current cycle
      // Progress tracking
      referralsUntilReward,
      progress: Math.min(100, (completedReferrals / referralRequiredCount) * 100),
      totalRewardsEarned: mongoUser.referralStats?.totalRewardsEarned || 0,
      canGetReward: completedReferrals >= referralRequiredCount,
      referralRequiredCount,
      referralRewardAmount
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// Diagnostic endpoint to check referral code and user data
app.get('/api/debug/referral-check', async (req, res) => {
  try {
    const { referralCode, mobile } = req.query;
    
    if (!referralCode && !mobile) {
      return res.status(400).json({ error: 'Please provide referralCode or mobile parameter' });
    }

    const results = {};

    // Check referral code if provided
    if (referralCode) {
      const codeUpper = referralCode.trim().toUpperCase();
      const referrer = await User.findOne({ referralCode: codeUpper });
      
      results.referralCode = {
        searched: codeUpper,
        found: !!referrer,
        referrer: referrer ? {
          id: referrer._id.toString(),
          mobile: referrer.mobile,
          name: referrer.name,
          referralCode: referrer.referralCode,
          referralStats: referrer.referralStats
        } : null
      };

      // Get all referrals for this referrer
      if (referrer) {
        const referrals = await Referral.find({ referrer: referrer._id })
          .populate('referee', 'mobile name')
          .sort({ createdAt: -1 })
          .limit(10);
        
        results.referralCode.referrals = referrals.map(r => ({
          id: r._id.toString(),
          referee: {
            id: r.referee?._id?.toString(),
            mobile: r.referee?.mobile,
            name: r.referee?.name
          },
          status: r.status,
          referralCode: r.referralCode,
          createdAt: r.createdAt,
          completedAt: r.completedAt
        }));
      }
    }

    // Check user by mobile if provided
    if (mobile) {
      const normalizedMobile = String(mobile).replace(/\D/g, '').slice(-10);
      const user = await User.findOne({ 
        mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
      });

      results.user = {
        searched: mobile,
        normalized: normalizedMobile,
        found: !!user,
        user: user ? {
          id: user._id.toString(),
          mobile: user.mobile,
          name: user.name,
          referralCode: user.referralCode,
          usedReferralCode: user.usedReferralCode,
          referred_code: user.referred_code,
          is_first_booking_done: user.is_first_booking_done,
          referralStats: user.referralStats
        } : null
      };

      // Get referrals where this user is the referee
      if (user) {
        const referralsAsReferee = await Referral.find({ referee: user._id })
          .populate('referrer', 'mobile name referralCode')
          .sort({ createdAt: -1 });
        
        results.user.referralsAsReferee = referralsAsReferee.map(r => ({
          id: r._id.toString(),
          referrer: {
            id: r.referrer?._id?.toString(),
            mobile: r.referrer?.mobile,
            name: r.referrer?.name,
            referralCode: r.referrer?.referralCode
          },
          status: r.status,
          referralCode: r.referralCode,
          createdAt: r.createdAt,
          completedAt: r.completedAt
        }));
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    });
  } catch (error) {
    console.error('Error in referral diagnostic:', error);
    res.status(500).json({ 
      error: 'Failed to check referral data',
      details: error.message 
    });
  }
});

// Get referral history
app.get('/api/referrals/history', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const jsonUser = getUsers().users.find(u => u.id === decoded.userId);
    if (!jsonUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedMobile = String(jsonUser.mobile).replace(/\D/g, '').slice(-10);
    const mongoUser = await User.findOne({ 
      mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
    });

    if (!mongoUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    console.log('🔍 [DEBUG REFERRAL HISTORY] Fetching referral history for user:', {
      userId: mongoUser._id.toString(),
      mobile: mongoUser.mobile,
      name: mongoUser.name,
      referralCode: mongoUser.referralCode
    });

    const referrals = await Referral.find({
      referrer: mongoUser._id
    })
      .populate('referee', 'name mobile')
      .populate('referrer', 'name mobile')
      .sort({ createdAt: -1 })
      .limit(100);

    console.log('🔍 [DEBUG REFERRAL HISTORY] Found referrals:', {
      count: referrals.length,
      referrals: referrals.map(r => ({
        referralId: r._id.toString(),
        referrerId: r.referrer?._id?.toString(),
        referrerMobile: r.referrer?.mobile,
        refereeId: r.referee?._id?.toString(),
        refereeMobile: r.referee?.mobile,
        refereeName: r.referee?.name,
        status: r.status,
        referrerHasBooking: r.referrerHasBooking,
        refereeHasBooking: r.refereeHasBooking,
        signedUpAt: r.signedUpAt,
        loggedInAt: r.loggedInAt,
        completedAt: r.completedAt
      }))
    });

    res.json({
      referrals: referrals.map(r => ({
        id: r._id,
        refereeName: r.referee?.name || 'Unknown',
        refereeMobile: r.referee?.mobile || '',
        status: r.status,
        referrerHasBooking: r.referrerHasBooking,
        refereeHasBooking: r.refereeHasBooking,
        signedUpAt: r.signedUpAt,
        completedAt: r.completedAt,
        rewardedAt: r.rewardedAt,
        rewardAmount: r.rewardAmount,
        cycleNumber: r.cycleNumber
      }))
    });
  } catch (error) {
    console.error('Error fetching referral history:', error);
    res.status(500).json({ error: 'Failed to fetch referral history' });
  }
});

// Admin: Get all referrals
app.get('/api/admin/referrals', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const {
      status,
      referrerMobile,
      refereeMobile,
      referralCode,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (referralCode) {
      query.referralCode = { $regex: referralCode.trim().toUpperCase(), $options: 'i' };
    }

    // Build referrer filter if provided
    let referrerQuery = {};
    if (referrerMobile) {
      const normalizedMobile = String(referrerMobile).replace(/\D/g, '').slice(-10);
      referrerQuery.mobile = { $regex: new RegExp(`${normalizedMobile}$`) };
    }

    // Build referee filter if provided
    let refereeQuery = {};
    if (refereeMobile) {
      const normalizedMobile = String(refereeMobile).replace(/\D/g, '').slice(-10);
      refereeQuery.mobile = { $regex: new RegExp(`${normalizedMobile}$`) };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find referrers if filter provided
    let referrerIds = null;
    if (Object.keys(referrerQuery).length > 0) {
      const referrers = await User.find(referrerQuery).select('_id');
      referrerIds = referrers.map(u => u._id);
      if (referrerIds.length === 0) {
        return res.json({
          referrals: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
          stats: { total: 0, pending: 0, completed: 0, rewarded: 0 }
        });
      }
      query.referrer = { $in: referrerIds };
    }

    // Find referees if filter provided
    let refereeIds = null;
    if (Object.keys(refereeQuery).length > 0) {
      const referees = await User.find(refereeQuery).select('_id');
      refereeIds = referees.map(u => u._id);
      if (refereeIds.length === 0) {
        return res.json({
          referrals: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
          stats: { total: 0, pending: 0, completed: 0, rewarded: 0 }
        });
      }
      query.referee = { $in: refereeIds };
    }

    const referrals = await Referral.find(query)
      .populate('referrer', 'name mobile referralCode')
      .populate('referee', 'name mobile')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Referral.countDocuments(query);
    
    console.log('📊 [ADMIN REFERRALS] Query result:', {
      query,
      total,
      returned: referrals.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Get stats
    const totalReferrals = await Referral.countDocuments({});
    const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
    const completedReferrals = await Referral.countDocuments({ status: 'completed' });
    const rewardedReferrals = await Referral.countDocuments({ status: 'rewarded' });

    res.json({
      referrals: referrals.map(r => ({
        id: r._id,
        referrer: {
          id: r.referrer?._id,
          name: r.referrer?.name || 'Unknown',
          mobile: r.referrer?.mobile || '',
          referralCode: r.referrer?.referralCode || ''
        },
        referee: {
          id: r.referee?._id,
          name: r.referee?.name || 'Unknown',
          mobile: r.referee?.mobile || ''
        },
        referralCode: r.referralCode,
        status: r.status,
        referrerHasBooking: r.referrerHasBooking,
        refereeHasBooking: r.refereeHasBooking,
        signedUpAt: r.signedUpAt,
        referrerBookingDate: r.referrerBookingDate,
        refereeBookingDate: r.refereeBookingDate,
        completedAt: r.completedAt,
        rewardedAt: r.rewardedAt,
        rewardAmount: r.rewardAmount,
        cycleNumber: r.cycleNumber,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: {
        total: totalReferrals,
        pending: pendingReferrals,
        completed: completedReferrals,
        rewarded: rewardedReferrals
      }
    });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

// Admin: Get referral stats summary
app.get('/api/admin/referrals/stats', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const totalReferrals = await Referral.countDocuments({});
    const pendingReferrals = await Referral.countDocuments({ status: 'pending' });
    const completedReferrals = await Referral.countDocuments({ status: 'completed' });
    const rewardedReferrals = await Referral.countDocuments({ status: 'rewarded' });

    // Get total rewards given
    const rewardsAgg = await Referral.aggregate([
      { $match: { status: 'rewarded', rewardAmount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
    ]);
    const totalRewardsGiven = rewardsAgg.length > 0 ? rewardsAgg[0].total : 0;

    // Get top referrers
    const topReferrers = await Referral.aggregate([
      {
        $group: {
          _id: '$referrer',
          totalReferrals: { $sum: 1 },
          completedReferrals: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rewardedReferrals: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } },
          totalRewards: { $sum: { $ifNull: ['$rewardAmount', 0] } }
        }
      },
      { $sort: { totalReferrals: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          referrerId: '$_id',
          referrerName: '$user.name',
          referrerMobile: '$user.mobile',
          referralCode: '$user.referralCode',
          totalReferrals: 1,
          completedReferrals: 1,
          rewardedReferrals: 1,
          totalRewards: 1
        }
      }
    ]);

    // Get referrals by cycle
    const cycleStats = await Referral.aggregate([
      {
        $group: {
          _id: '$cycleNumber',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      overview: {
        totalReferrals,
        pendingReferrals,
        completedReferrals,
        rewardedReferrals,
        totalRewardsGiven
      },
      topReferrers,
      cycleStats
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// ============================================
// RAZORPAY PAYMENT ROUTES
// ============================================

const Razorpay = require('razorpay');
const crypto = require('crypto');

const RAZORPAY_KEY_ID = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.trim()) || 'rzp_test_123456789';
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.trim()) || 'test_secret';

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Create Razorpay order
app.post('/api/payments/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency.toUpperCase(),
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture
    };

    console.log('🧾 [RAZORPAY ORDER] Creating order', {
      requestedAmountRupees: amount,
      amountPaise: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      keyPresent: !!RAZORPAY_KEY_ID
    });

    const order = await razorpay.orders.create(options);
    
    console.log('✅ [RAZORPAY ORDER] Order created', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
    
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create payment order', details: error.message });
  }
});

// Verify Razorpay payment
app.post('/api/payments/razorpay/verify', async (req, res) => {
  const startTime = Date.now();
  console.log('🔵 [DEBUG PAYMENT] ===== START: Razorpay Payment Verification =====');
  console.log('📥 [DEBUG PAYMENT] Request received:', {
    timestamp: new Date().toISOString(),
    hasOrderId: !!req.body.razorpay_order_id,
    hasPaymentId: !!req.body.razorpay_payment_id,
    hasSignature: !!req.body.razorpay_signature,
    hasMobile: !!req.body.mobile,
    mobile: req.body.mobile || 'not provided',
    mongoState: mongoose.connection.readyState,
    mongoStateName: mongoose.connection.readyState === 1 ? 'connected' : mongoose.connection.readyState === 0 ? 'disconnected' : mongoose.connection.readyState === 2 ? 'connecting' : 'unknown'
  });

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mobile } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log('❌ [DEBUG PAYMENT] Missing payment verification data');
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    console.log('🔐 [DEBUG PAYMENT] Verifying payment signature...');
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', razorpay.key_secret)
      .update(text)
      .digest('hex');

    const isSignatureValid = generatedSignature === razorpay_signature;
    
    console.log('🔐 [DEBUG PAYMENT] Signature verification result:', {
      isValid: isSignatureValid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });
    
    if (!isSignatureValid) {
      console.log('❌ [DEBUG PAYMENT] Invalid payment signature');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    console.log('📡 [DEBUG PAYMENT] Fetching payment details from Razorpay...');
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    
    console.log('✅ [DEBUG PAYMENT] Payment details fetched:', {
      paymentId: razorpay_payment_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      createdAt: payment.created_at
    });
    
    const isPaymentSuccessful = payment.status === 'captured';
    
    console.log('💰 [DEBUG PAYMENT] Payment status check:', {
      status: payment.status,
      isPaymentSuccessful: isPaymentSuccessful,
      willProcessReferrals: isPaymentSuccessful && !!mobile
    });
    
    // Process referral updates if payment is successful and user mobile is provided
    if (isPaymentSuccessful && mobile) {
      const referralStartTime = Date.now();
      try {
        console.log('🔵 [DEBUG REFERRAL] ===== Razorpay Verify: Processing referral updates =====');
        console.log('📥 [DEBUG REFERRAL] Payment verification - Input:', {
          mobile: mobile,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          paymentStatus: payment.status,
          isPaymentSuccessful: isPaymentSuccessful,
          amount: payment.amount / 100,
          currency: payment.currency
        });

        // Check MongoDB connection
        const mongoState = mongoose.connection.readyState;
        console.log('🔍 [DEBUG REFERRAL] MongoDB connection check:', {
          state: mongoState,
          stateName: mongoState === 1 ? 'connected' : mongoState === 0 ? 'disconnected' : mongoState === 2 ? 'connecting' : 'unknown',
          canProceed: mongoState === 1
        });

        if (mongoState !== 1) {
          console.warn('⚠️ [DEBUG REFERRAL] MongoDB not connected, cannot process referrals');
          throw new Error('MongoDB not connected');
        }

        // Normalize mobile number
        const normalizedMobile = String(mobile).replace(/\D/g, '').slice(-10);
        const fullMobile = mobile.startsWith('+') ? mobile : `91${normalizedMobile}`;
        
        console.log('🔍 [DEBUG REFERRAL] Searching for user:', {
          originalMobile: mobile,
          normalizedMobile: normalizedMobile,
          fullMobile: fullMobile
        });

        // Find user in MongoDB
        let mongoUser = await User.findOne({ 
          mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
        });

        if (!mongoUser) {
          console.log('⚠️ [DEBUG REFERRAL] User not found in MongoDB, skipping referral update');
        } else {
          console.log('✅ [DEBUG REFERRAL] User found:', {
            userId: mongoUser._id.toString(),
            mobile: mongoUser.mobile,
            name: mongoUser.name
          });

          // Find all referrals where this user is the referee
          // IMPORTANT: Search by normalized mobile number instead of user ID
          // because the same phone number might have different user IDs due to normalization differences
          console.log('🔍 [DEBUG REFERRAL] Step 1: Searching for referrals by normalized mobile number');
          console.log('🔍 [DEBUG REFERRAL] Query details:', {
            normalizedMobile: normalizedMobile,
            currentUserId: mongoUser._id.toString(),
            currentUserMobile: mongoUser.mobile
          });

          // Find all users with the same normalized mobile number
          const allUsersWithMobile = await User.find({
            mobile: { $regex: new RegExp(`${normalizedMobile}$`) }
          }).select('_id mobile');
          
          const userIds = allUsersWithMobile.map(u => u._id);
          
          console.log('🔍 [DEBUG REFERRAL] Found users with same normalized mobile:', {
            normalizedMobile: normalizedMobile,
            userCount: allUsersWithMobile.length,
            userIds: userIds.map(id => id.toString()),
            userMobiles: allUsersWithMobile.map(u => u.mobile)
          });

          // Search for referrals where any of these user IDs is the referee
          const referrals = await Referral.find({
            referee: { $in: userIds }
          }).populate('referrer', 'name mobile referralCode').populate('referee', 'name mobile');

          console.log('🔍 [DEBUG REFERRAL] Found referrals where user is referee (by mobile):', {
            count: referrals.length,
            referralIds: referrals.map(r => r._id.toString()),
            referrals: referrals.map(r => ({
              referralId: r._id.toString(),
              status: r.status,
              referrerId: r.referrer?._id?.toString(),
              referrerMobile: r.referrer?.mobile,
              referrerName: r.referrer?.name,
              refereeId: r.referee?._id?.toString(),
              refereeMobile: r.referee?.mobile,
              refereeName: r.referee?.name,
              referralCode: r.referralCode,
              referrerHasBooking: r.referrerHasBooking,
              refereeHasBooking: r.refereeHasBooking,
              signedUpAt: r.signedUpAt,
              loggedInAt: r.loggedInAt,
              completedAt: r.completedAt
            }))
          });

          if (referrals.length > 0) {
            console.log(`🔄 [DEBUG REFERRAL] Step 2: Processing ${referrals.length} referral(s)`);
            let updatedCount = 0;
            let completedCount = 0;
            
            // Update each referral
            for (let i = 0; i < referrals.length; i++) {
              const referral = referrals[i];
              console.log(`🔄 [DEBUG REFERRAL] Processing referral ${i + 1}/${referrals.length}:`, {
                referralId: referral._id.toString(),
                currentStatus: referral.status,
                currentRefereeHasBooking: referral.refereeHasBooking,
                currentReferrerHasBooking: referral.referrerHasBooking,
                referrerId: referral.referrer._id.toString(),
                referrerMobile: referral.referrer.mobile,
                referrerName: referral.referrer.name,
                refereeId: referral.referee._id.toString(),
                refereeMobile: referral.referee.mobile,
                referralCode: referral.referralCode,
                cycleNumber: referral.cycleNumber
              });

              const beforeUpdate = {
                status: referral.status,
                refereeHasBooking: referral.refereeHasBooking,
                refereeBookingDate: referral.refereeBookingDate
              };

              // Update refereeHasBooking to true
              console.log('🔍 [DEBUG REFERRAL] Step 2.1: Checking refereeHasBooking status');
              if (!referral.refereeHasBooking) {
                console.log('📝 [DEBUG REFERRAL] Setting refereeHasBooking to true (referee just made a payment)');
                referral.refereeHasBooking = true;
                referral.refereeBookingDate = new Date();
                updatedCount++;
                console.log('✅ [DEBUG REFERRAL] Updated refereeHasBooking to true:', {
                  refereeBookingDate: referral.refereeBookingDate
                });
              } else {
                console.log('ℹ️ [DEBUG REFERRAL] refereeHasBooking already true, skipping update');
              }

              // Check if referrer also has booking
              console.log('🔍 [DEBUG REFERRAL] Step 2.2: Checking if referrer has bookings');
              const referrerBookingsCount = await Booking.countDocuments({ 
                user: referral.referrer._id, 
                status: 'paid' 
              });

              console.log('🔍 [DEBUG REFERRAL] Referrer booking check:', {
                referrerId: referral.referrer._id.toString(),
                referrerMobile: referral.referrer.mobile,
                referrerName: referral.referrer.name,
                referrerBookingsCount: referrerBookingsCount,
                currentReferrerHasBooking: referral.referrerHasBooking,
                hasBookings: referrerBookingsCount > 0
              });

              // Update referrerHasBooking if not already set
              if (referrerBookingsCount > 0 && !referral.referrerHasBooking) {
                console.log('📝 [DEBUG REFERRAL] Setting referrerHasBooking to true (referrer has bookings)');
                referral.referrerHasBooking = true;
                referral.referrerBookingDate = new Date();
                updatedCount++;
                console.log('✅ [DEBUG REFERRAL] Updated referrerHasBooking to true:', {
                  referrerBookingDate: referral.referrerBookingDate
                });
              } else if (referrerBookingsCount === 0) {
                console.log('ℹ️ [DEBUG REFERRAL] Referrer has no bookings yet, waiting...');
              } else {
                console.log('ℹ️ [DEBUG REFERRAL] referrerHasBooking already true, skipping update');
              }

              // Mark as completed when referee makes a booking (referee has completed their part)
              // Note: This marks it as completed when referee books, even if referrer hasn't booked yet
              console.log('🔍 [DEBUG REFERRAL] Step 2.3: Checking if referral should be marked as completed');
              const canComplete = referral.status === 'pending' || referral.status === 'loggedin';
              const refereeHasBooking = referral.refereeHasBooking;
              
              console.log('🔍 [DEBUG REFERRAL] Completion check:', {
                referrerHasBooking: referral.referrerHasBooking,
                refereeHasBooking: referral.refereeHasBooking,
                currentStatus: referral.status,
                canComplete: canComplete,
                willComplete: refereeHasBooking && canComplete
              });

              if (refereeHasBooking && canComplete) {
                console.log('📝 [DEBUG REFERRAL] Marking referral as completed (referee has made a booking)');
                referral.status = 'completed';
                referral.completedAt = new Date();
                completedCount++;
                console.log('✅ [DEBUG REFERRAL] Updated status to completed:', {
                  completedAt: referral.completedAt,
                  oldStatus: beforeUpdate.status,
                  newStatus: 'completed',
                  refereeHasBooking: referral.refereeHasBooking,
                  referrerHasBooking: referral.referrerHasBooking
                });
              } else if (refereeHasBooking && !canComplete) {
                console.log('ℹ️ [DEBUG REFERRAL] Referee has booking but status is already:', referral.status);
              } else {
                console.log('⏳ [DEBUG REFERRAL] Waiting for referee to make a booking:', {
                  refereeHasBooking: referral.refereeHasBooking
                });
              }

              console.log('💾 [DEBUG REFERRAL] Saving referral to database...');
              await referral.save();
              console.log('✅ [DEBUG REFERRAL] Referral saved successfully');

              // Verify the update
              const updatedReferral = await Referral.findById(referral._id)
                .populate('referrer', 'name mobile')
                .populate('referee', 'name mobile');
              
              console.log('✅ [DEBUG REFERRAL] Referral update verified:', {
                referralId: referral._id.toString(),
                before: beforeUpdate,
                after: {
                  status: updatedReferral.status,
                  refereeHasBooking: updatedReferral.refereeHasBooking,
                  referrerHasBooking: updatedReferral.referrerHasBooking,
                  refereeBookingDate: updatedReferral.refereeBookingDate,
                  referrerBookingDate: updatedReferral.referrerBookingDate,
                  completedAt: updatedReferral.completedAt
                },
                changes: {
                  statusChanged: beforeUpdate.status !== updatedReferral.status,
                  refereeHasBookingChanged: beforeUpdate.refereeHasBooking !== updatedReferral.refereeHasBooking,
                  statusTransition: `${beforeUpdate.status} → ${updatedReferral.status}`
                }
              });
            }

            console.log('📊 [DEBUG REFERRAL] Referral processing summary:', {
              totalReferrals: referrals.length,
              updatedCount: updatedCount,
              completedCount: completedCount,
              stillPending: referrals.length - completedCount
            });

            // Check and award referral rewards if applicable
            console.log('🔍 [DEBUG REFERRAL] Step 3: Checking and awarding referral rewards');
            const uniqueReferrers = [...new Set(referrals.map(r => r.referrer._id.toString()))];
            console.log('🔍 [DEBUG REFERRAL] Unique referrers to check:', {
              count: uniqueReferrers.length,
              referrerIds: uniqueReferrers
            });

            for (let i = 0; i < uniqueReferrers.length; i++) {
              const referrerIdStr = uniqueReferrers[i];
              console.log(`🎁 [DEBUG REFERRAL] Checking rewards for referrer ${i + 1}/${uniqueReferrers.length}:`, {
                referrerId: referrerIdStr
              });
              
              try {
                const referrerId = new mongoose.Types.ObjectId(referrerIdStr);
                await checkAndAwardReferralReward(referrerId);
                console.log('✅ [DEBUG REFERRAL] Reward check completed for referrer:', referrerIdStr);
              } catch (rewardError) {
                console.error('❌ [DEBUG REFERRAL] Error checking rewards for referrer:', {
                  referrerId: referrerIdStr,
                  error: rewardError.message
                });
              }
            }

            const referralDuration = Date.now() - referralStartTime;
            console.log('🟢 [DEBUG REFERRAL] ===== Razorpay Verify: Referral updates complete =====');
            console.log('⏱️ [DEBUG REFERRAL] Referral processing time:', `${referralDuration}ms`);
            console.log('📋 [DEBUG REFERRAL] Final summary:', {
              totalReferralsProcessed: referrals.length,
              referralsUpdated: updatedCount,
              referralsCompleted: completedCount,
              uniqueReferrersChecked: uniqueReferrers.length,
              duration: `${referralDuration}ms`
            });
          } else {
            console.log('ℹ️ [DEBUG REFERRAL] No referrals found for this user as referee');
            console.log('💡 [DEBUG REFERRAL] This user did not sign up using a referral code');
          }
        }
      } catch (referralError) {
        const referralDuration = Date.now() - referralStartTime;
        console.error('❌ [DEBUG REFERRAL] ===== ERROR: Referral processing failed =====');
        console.error('❌ [DEBUG REFERRAL] Error details:', {
          error: referralError.message,
          stack: referralError.stack,
          errorName: referralError.name,
          mobile: mobile,
          duration: `${referralDuration}ms`
        });
        console.error('🔴 [DEBUG REFERRAL] ===== END: Referral processing (ERROR) =====');
        // Don't fail payment verification if referral update fails
      }
    } else {
      if (!isPaymentSuccessful) {
        console.log('ℹ️ [DEBUG REFERRAL] Payment not successful, skipping referral update:', {
          paymentStatus: payment.status,
          expectedStatus: 'captured'
        });
      }
      if (!mobile) {
        console.log('ℹ️ [DEBUG REFERRAL] Mobile not provided, skipping referral update');
        console.log('💡 [DEBUG REFERRAL] Tip: Pass mobile number in request body to enable referral tracking');
      }
    }
    
    const totalDuration = Date.now() - startTime;
    console.log('✅ [DEBUG PAYMENT] Payment verification successful');
    console.log('📤 [DEBUG PAYMENT] Sending response to client:', {
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount / 100,
      status: payment.status
    });
    console.log('⏱️ [DEBUG PAYMENT] Total processing time:', `${totalDuration}ms`);
    console.log('🟢 [DEBUG PAYMENT] ===== END: Razorpay Payment Verification (SUCCESS) =====');

    res.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: payment.amount / 100, // Convert from paise
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('❌ [DEBUG PAYMENT] ===== ERROR: Razorpay Payment Verification =====');
    console.error('❌ [DEBUG PAYMENT] Error details:', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      duration: `${totalDuration}ms`
    });
    console.error('🔴 [DEBUG PAYMENT] ===== END: Razorpay Payment Verification (ERROR) =====');
    res.status(500).json({ error: 'Failed to verify payment', details: error.message });
  }
});

// ============================================
// ADMIN STATE PLAN ROUTES (Protected)
// ============================================

// Get all state plans for admin (includes inactive)
app.get('/api/admin/state-plans', authenticateToken, requirePermission('viewStatePlans'), async (req, res) => {
  try {
    const states = await StatePlan.find().sort({ name: 1 });
    res.json(states);
  } catch (error) {
    console.error('Error fetching state plans:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new state plan
app.post('/api/admin/state-plans', authenticateToken, requirePermission('createStatePlans'), async (req, res) => {
  try {
    const { name, code, districts, vehicles, isActive, defaultDistrict } = req.body;
    
    // Validation
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }
    
    // Check if state already exists
    const existing = await StatePlan.findOne({ 
      $or: [{ name }, { code: code.toUpperCase() }] 
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'State with this name or code already exists' 
      });
    }
    
    const statePlan = new StatePlan({
      name,
      code: code.toUpperCase(),
      districts: districts || [],
      defaultDistrict: defaultDistrict || null,
      vehicles: vehicles || [],
      isActive: isActive !== undefined ? isActive : true
    });
    
    await statePlan.save();
    
    console.log(`✅ State plan created: ${name}`);
    res.status(201).json({
      success: true,
      message: 'State plan created successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error creating state plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update state plan
app.put('/api/admin/state-plans/:id', authenticateToken, requirePermission('editStatePlans'), async (req, res) => {
  try {
    const { name, code, districts, vehicles, isActive, defaultDistrict } = req.body;
    
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    // Check if name/code is being changed and if it conflicts
    if (name && name !== statePlan.name) {
      const existing = await StatePlan.findOne({ 
        name, 
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ error: 'State with this name already exists' });
      }
      statePlan.name = name;
    }
    
    if (code && code.toUpperCase() !== statePlan.code) {
      const existing = await StatePlan.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: req.params.id } 
      });
      if (existing) {
        return res.status(400).json({ error: 'State with this code already exists' });
      }
      statePlan.code = code.toUpperCase();
    }
    
    if (districts !== undefined) statePlan.districts = districts;
    if (vehicles !== undefined) statePlan.vehicles = vehicles;
    if (isActive !== undefined) statePlan.isActive = isActive;
    if (defaultDistrict !== undefined) statePlan.defaultDistrict = defaultDistrict;
    
    await statePlan.save();
    
    console.log(`✅ State plan updated: ${statePlan.name}`);
    res.json({
      success: true,
      message: 'State plan updated successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error updating state plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete state plan
app.delete('/api/admin/state-plans/:id', authenticateToken, requirePermission('deleteStatePlans'), async (req, res) => {
  try {
    const statePlan = await StatePlan.findByIdAndDelete(req.params.id);
    
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    console.log(`✅ State plan deleted: ${statePlan.name}`);
    res.json({
      success: true,
      message: 'State plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting state plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add district to state
app.post('/api/admin/state-plans/:id/districts', authenticateToken, requirePermission('manageDistricts'), async (req, res) => {
  try {
    const { district } = req.body;
    
    if (!district) {
      return res.status(400).json({ error: 'District name is required' });
    }
    
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    if (statePlan.districts.includes(district)) {
      return res.status(400).json({ error: 'District already exists' });
    }
    
    statePlan.districts.push(district);
    await statePlan.save();
    
    res.json({
      success: true,
      message: 'District added successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error adding district:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove district from state
app.delete('/api/admin/state-plans/:id/districts/:district', authenticateToken, requirePermission('manageDistricts'), async (req, res) => {
  try {
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    // If removing the default district, unset it
    if (statePlan.defaultDistrict === req.params.district) {
      statePlan.defaultDistrict = null;
    }
    
    statePlan.districts = statePlan.districts.filter(d => d !== req.params.district);
    await statePlan.save();
    
    res.json({
      success: true,
      message: 'District removed successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error removing district:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set default district for a state
app.put('/api/admin/state-plans/:id/default-district', authenticateToken, requirePermission('manageDistricts'), async (req, res) => {
  try {
    const { district } = req.body;
    
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    // Validate district exists in the state
    if (district && !statePlan.districts.includes(district)) {
      return res.status(400).json({ error: 'District not found in this state' });
    }
    
    statePlan.defaultDistrict = district || null;
    await statePlan.save();
    
    res.json({
      success: true,
      message: district ? `Default district set to ${district}` : 'Default district cleared',
      statePlan
    });
  } catch (error) {
    console.error('Error setting default district:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add or update vehicle in state
app.post('/api/admin/state-plans/:id/vehicles', authenticateToken, requirePermission('manageVehicles'), async (req, res) => {
  try {
    const { number, day_wise_tax } = req.body;
    
    if (!number || !day_wise_tax || !Array.isArray(day_wise_tax)) {
      return res.status(400).json({ 
        error: 'Vehicle number and day_wise_tax array are required' 
      });
    }
    
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    await statePlan.addOrUpdateVehicle(number, day_wise_tax);
    
    res.json({
      success: true,
      message: 'Vehicle added/updated successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error adding/updating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove vehicle from state
app.delete('/api/admin/state-plans/:id/vehicles/:vehicleNumber', authenticateToken, requirePermission('manageVehicles'), async (req, res) => {
  try {
    const statePlan = await StatePlan.findById(req.params.id);
    if (!statePlan) {
      return res.status(404).json({ error: 'State plan not found' });
    }
    
    await statePlan.removeVehicle(req.params.vehicleNumber);
    
    res.json({
      success: true,
      message: 'Vehicle removed successfully',
      statePlan
    });
  } catch (error) {
    console.error('Error removing vehicle:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FUEL PRICE MANAGEMENT ROUTES ====================

app.get('/api/admin/fuel-prices', authenticateToken, requirePermission('viewFuelPrices'), async (req, res) => {
  try {
    const { state, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    if (state) {
      const normalizedState = normalizeStateName(state);
      if (normalizedState) {
        query.state = {
          $regex: new RegExp(`^${escapeRegex(normalizedState)}$`, 'i')
        };
      }
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = normalizeDateOnly(startDate);
        if (start) {
          query.date.$gte = start;
        }
      }
      if (endDate) {
        const end = normalizeDateOnly(endDate);
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query.date.$lte = endOfDay;
        }
      }
      if (Object.keys(query.date).length === 0) {
        delete query.date;
      }
    }

    const numericLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (numericPage - 1) * numericLimit;

    const [fuelPrices, total] = await Promise.all([
      FuelPrice.find(query)
        .collation({ locale: 'en', strength: 2 })
        .sort({ date: -1, state: 1 })
        .skip(skip)
        .limit(numericLimit),
      FuelPrice.countDocuments(query)
    ]);

    res.json({
      data: fuelPrices,
      pagination: {
        total,
        page: numericPage,
        limit: numericLimit,
        totalPages: total > 0 ? Math.ceil(total / numericLimit) : 1
      }
    });
  } catch (error) {
    console.error('Error fetching fuel prices:', error);
    res.status(500).json({ error: 'Failed to fetch fuel prices' });
  }
});

app.post('/api/admin/fuel-prices', authenticateToken, requirePermission('createFuelPrices'), async (req, res) => {
  try {
    const { state, date, petrolPrice, dieselPrice, cngPrice, notes, source } = req.body;

    const normalizedState = normalizeStateName(state);
    const normalizedDate = normalizeDateOnly(date);
    const petrol = parsePriceValue(petrolPrice);
    const diesel = parsePriceValue(dieselPrice);
    const cng = parsePriceValue(cngPrice);

    if (!normalizedState) {
      return res.status(400).json({ error: 'State is required' });
    }

    if (!normalizedDate) {
      return res.status(400).json({ error: 'Valid date is required' });
    }

    if (petrol === null || diesel === null || cng === null) {
      return res.status(400).json({ error: 'Valid petrol, diesel, and CNG prices are required' });
    }

    const existing = await FuelPrice.findOne({
      state: normalizedState,
      date: normalizedDate
    }).collation({ locale: 'en', strength: 2 });

    if (existing) {
      return res.status(409).json({
        error: 'Fuel prices for this state and date already exist',
        fuelPrice: existing
      });
    }

    const fuelPrice = new FuelPrice({
      state: normalizedState,
      date: normalizedDate,
      petrolPrice: petrol,
      dieselPrice: diesel,
      cngPrice: cng,
      notes: notes || undefined,
      source: source || undefined
    });

    await fuelPrice.save();

    res.status(201).json({
      success: true,
      fuelPrice
    });
  } catch (error) {
    console.error('Error creating fuel price:', error);
    res.status(500).json({ error: 'Failed to create fuel price' });
  }
});

app.put('/api/admin/fuel-prices/:id', authenticateToken, requirePermission('editFuelPrices'), async (req, res) => {
  try {
    const { state, date, petrolPrice, dieselPrice, cngPrice, notes, source } = req.body;
    const updates = {};

    if (state !== undefined) {
      const normalizedState = normalizeStateName(state);
      if (!normalizedState) {
        return res.status(400).json({ error: 'Valid state is required' });
      }
      updates.state = normalizedState;
    }

    if (date !== undefined) {
      const normalizedDate = normalizeDateOnly(date);
      if (!normalizedDate) {
        return res.status(400).json({ error: 'Valid date is required' });
      }
      updates.date = normalizedDate;
    }

    if (petrolPrice !== undefined) {
      const petrol = parsePriceValue(petrolPrice);
      if (petrol === null) {
        return res.status(400).json({ error: 'Valid petrol price is required' });
      }
      updates.petrolPrice = petrol;
    }

    if (dieselPrice !== undefined) {
      const diesel = parsePriceValue(dieselPrice);
      if (diesel === null) {
        return res.status(400).json({ error: 'Valid diesel price is required' });
      }
      updates.dieselPrice = diesel;
    }

    if (cngPrice !== undefined) {
      const cng = parsePriceValue(cngPrice);
      if (cng === null) {
        return res.status(400).json({ error: 'Valid CNG price is required' });
      }
      updates.cngPrice = cng;
    }

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (source !== undefined) {
      updates.source = source;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const existingFuelPrice = await FuelPrice.findById(req.params.id);
    if (!existingFuelPrice) {
      return res.status(404).json({ error: 'Fuel price entry not found' });
    }

    const nextState = updates.state || existingFuelPrice.state;
    const nextDate = updates.date || existingFuelPrice.date;

    const duplicate = await FuelPrice.findOne({
      _id: { $ne: req.params.id },
      state: nextState,
      date: normalizeDateOnly(nextDate)
    }).collation({ locale: 'en', strength: 2 });

    if (duplicate) {
      return res.status(409).json({
        error: 'Fuel prices for this state and date already exist',
        fuelPrice: duplicate
      });
    }

    Object.assign(existingFuelPrice, updates);
    await existingFuelPrice.save();

    res.json({
      success: true,
      fuelPrice: existingFuelPrice
    });
  } catch (error) {
    console.error('Error updating fuel price:', error);
    res.status(500).json({ error: 'Failed to update fuel price' });
  }
});

app.delete('/api/admin/fuel-prices', authenticateToken, requirePermission('deleteFuelPrices'), async (req, res) => {
  try {
    const result = await FuelPrice.deleteMany({});
    
    res.json({
      success: true,
      message: `All fuel prices deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all fuel prices:', error);
    res.status(500).json({ error: 'Failed to delete all fuel prices' });
  }
});

app.delete('/api/admin/fuel-prices/:id', authenticateToken, requirePermission('deleteFuelPrices'), async (req, res) => {
  try {
    const fuelPrice = await FuelPrice.findByIdAndDelete(req.params.id);
    if (!fuelPrice) {
      return res.status(404).json({ error: 'Fuel price entry not found' });
    }

    res.json({
      success: true,
      message: 'Fuel price entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fuel price:', error);
    res.status(500).json({ error: 'Failed to delete fuel price' });
  }
});

app.post('/api/admin/fuel-prices/import', authenticateToken, requirePermission('importFuelPrices'), (req, res, next) => {
  excelUpload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 5MB limit' });
      }
      if (err.message && err.message.includes('spreadsheet')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'File upload error: ' + (err.message || 'Unknown error') });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      console.error('No file in request:', {
        files: req.files,
        body: req.body,
        headers: req.headers['content-type']
      });
      return res.status(400).json({ error: 'Excel file is required. Please ensure the file field is named "file".' });
    }

    let workbook;
    try {
      workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseError) {
      console.error('Error parsing Excel file:', parseError);
      return res.status(400).json({
        error: 'Unable to parse Excel file. Ensure the file is a valid .xlsx or .xls spreadsheet.'
      });
    }

    const sheetName = req.body.sheetName || workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'Excel file does not contain any sheets' });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
      blankrows: false
    });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in Excel file' });
    }

    const summary = {
      processed: rows.length,
      created: 0,
      updated: 0,
      unchanged: 0
    };
    const errors = [];

    const getRowNumber = (row, index) => {
      if (row && typeof row.__rowNum__ === 'number') {
        return row.__rowNum__ + 1;
      }
      return index + 2;
    };

    const normaliseKey = (key) =>
      String(key || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (!row || typeof row !== 'object') {
        errors.push({ row: index + 2, error: 'Empty row' });
        continue;
      }

    const normalisedRow = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === '__rowNum__') return;
      normalisedRow[normaliseKey(key)] = value;
    });

      const rowNumber = getRowNumber(row, index);

      const stateValue = normalisedRow.state || normalisedRow.statename || normalisedRow.statecode;
      const dateValue = normalisedRow.date || normalisedRow.datestamp || normalisedRow.pricedate;
      const petrolValue = normalisedRow.petrolprice || normalisedRow.petrol || normalisedRow.petrolrate;
      const dieselValue = normalisedRow.dieselprice || normalisedRow.diesel || normalisedRow.dieselrate;
      const cngValue = normalisedRow.cngprice || normalisedRow.cng || normalisedRow.cngrate;
      const notesValue = normalisedRow.notes || normalisedRow.remark || normalisedRow.comments;
      const sourceValue = normalisedRow.source || normalisedRow.reference || normalisedRow.provider;

      const normalizedState = normalizeStateName(stateValue);
      const normalizedDate = parseExcelDateValue(dateValue);
      const petrol = parsePriceValue(petrolValue);
      const diesel = parsePriceValue(dieselValue);
      const cng = parsePriceValue(cngValue);

      if (!normalizedState) {
        errors.push({ row: rowNumber, error: 'Missing state value' });
        continue;
      }

      if (!normalizedDate) {
        errors.push({ row: rowNumber, error: 'Missing or invalid date value' });
        continue;
      }

      if (petrol === null || diesel === null || cng === null) {
        errors.push({
          row: rowNumber,
          error: 'Missing or invalid fuel prices (petrol, diesel, CNG)'
        });
        continue;
      }

      const update = {
        $set: {
          petrolPrice: petrol,
          dieselPrice: diesel,
          cngPrice: cng
        },
        $setOnInsert: {
          state: normalizedState,
          date: normalizedDate
        }
      };

      if (notesValue !== undefined && notesValue !== null) {
        update.$set.notes = String(notesValue);
      }

      if (sourceValue !== undefined && sourceValue !== null) {
        update.$set.source = String(sourceValue);
      }

      const result = await FuelPrice.updateOne(
        {
          state: normalizedState,
          date: normalizedDate
        },
        update,
        {
          upsert: true,
          collation: { locale: 'en', strength: 2 }
        }
      );

      if (result.upsertedCount && result.upsertedCount > 0) {
        summary.created += 1;
      } else if (result.modifiedCount && result.modifiedCount > 0) {
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
    }

    const totalApplied = summary.created + summary.updated + summary.unchanged;

    if (totalApplied === 0) {
      return res.status(400).json({
        error: 'No rows were imported. Please verify the column headers and data values.',
        details: errors
      });
    }

    res.json({
      success: true,
      summary,
      errors,
      partialSuccess: errors.length > 0
    });
  } catch (error) {
    console.error('Error importing fuel prices:', error);
    res.status(500).json({ error: 'Failed to import fuel prices', details: error.message });
  }
});

// ==================== ROLE MANAGEMENT ROUTES ====================

// Get all roles (admin only)
app.get('/api/admin/roles', authenticateToken, requirePermission('viewRoles'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get active roles (for dropdown)
app.get('/api/admin/roles/active', authenticateToken, async (req, res) => {
  try {
    const roles = await Role.getActiveRoles();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching active roles:', error);
    res.status(500).json({ error: 'Failed to fetch active roles' });
  }
});

// Create role
app.post('/api/admin/roles', authenticateToken, requirePermission('createRoles'), async (req, res) => {
  try {
    const { name, description, permissions, isActive } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists
    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    const role = new Role({
      name: name.trim(),
      description: description || '',
      permissions: permissions || {},
      isActive: isActive !== undefined ? isActive : true,
      isSystem: false
    });

    await role.save();
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Update role
app.put('/api/admin/roles/:id', authenticateToken, requirePermission('editRoles'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent editing system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot edit system roles' });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== role.name) {
      const existing = await Role.findOne({ name: name.trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ error: 'Role with this name already exists' });
      }
      role.name = name.trim();
    }

    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Delete role
app.delete('/api/admin/roles/:id', authenticateToken, requirePermission('deleteRoles'), async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // Check if any employees are using this role
    const employeeCount = await Employee.countDocuments({ role: id });
    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. ${employeeCount} employee(s) are assigned to this role.` 
      });
    }

    await Role.findByIdAndDelete(id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// ==================== USER MANAGEMENT ROUTES (Mobile App Users) ====================

// Get all mobile app users
app.get('/api/admin/users', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const usersData = getUsers();
    res.json(usersData.users || []);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ==================== CUSTOMER MANAGEMENT ROUTES (MongoDB Users) ====================

// Get all customers (MongoDB Users)
app.get('/api/admin/customers', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    // Get MongoDB users
    const mongoCustomers = await User.find()
      .sort({ createdAt: -1 });
    
    // Get users from users.json
    const usersData = getUsers();
    const jsonUsers = usersData.users || [];
    
    // Helper to normalize mobile for comparison
    const normalizeMobile = (mobile) => {
      if (!mobile) return null;
      const cleaned = mobile.toString().trim().replace(/^\+?91/, '').replace(/\D/g, '');
      return cleaned.slice(-10); // Take last 10 digits
    };
    
    // Create a map of MongoDB users by normalized mobile
    const mongoUsersMap = new Map();
    mongoCustomers.forEach(user => {
      const normalized = normalizeMobile(user.mobile);
      if (normalized) {
        mongoUsersMap.set(normalized, user);
      }
    });
    
    // Process JSON users and merge with MongoDB users
    const allCustomers = [...mongoCustomers];
    
    jsonUsers.forEach(jsonUser => {
      const normalized = normalizeMobile(jsonUser.mobile);
      if (!normalized) return;
      
      // Check if this user already exists in MongoDB
      const existingMongoUser = mongoUsersMap.get(normalized);
      
      if (!existingMongoUser) {
        // User exists only in users.json - create a virtual customer object
        const virtualCustomer = {
          _id: jsonUser.id || `json_${jsonUser.mobile}`,
          id: jsonUser.id,
          mobile: jsonUser.mobile,
          name: jsonUser.name || jsonUser.mobile,
          email: jsonUser.email || undefined,
          vehicleNumber: undefined,
          isActive: jsonUser.isActive !== false,
          createdAt: jsonUser.createdAt || jsonUser.updatedAt || new Date().toISOString(),
          updatedAt: jsonUser.updatedAt || jsonUser.createdAt || new Date().toISOString(),
          pushTokens: [],
          recentVehicles: [],
          recentPhoneNumbers: [],
          recentBorderSelections: [],
          source: 'users.json', // Flag to indicate source
          _isVirtual: true // Flag to indicate this is not in MongoDB
        };
        
        allCustomers.push(virtualCustomer);
      } else {
        // User exists in both - ensure JSON data is reflected if MongoDB data is missing
        if (jsonUser.name && !existingMongoUser.name) {
          existingMongoUser.name = jsonUser.name;
        }
        if (jsonUser.email && !existingMongoUser.email) {
          existingMongoUser.email = jsonUser.email;
        }
        if (jsonUser.isActive !== undefined && existingMongoUser.isActive === undefined) {
          existingMongoUser.isActive = jsonUser.isActive !== false;
        }
        existingMongoUser.source = 'both'; // Flag to indicate exists in both
      }
    });
    
    // Sort by createdAt (newest first)
    allCustomers.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    res.json(allCustomers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get single customer
app.get('/api/admin/customers/:id', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer
app.post('/api/admin/customers', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const { name, mobile, email, vehicleNumber, isActive } = req.body;

    // Validation
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile are required' });
    }

    // Check if mobile already exists
    const existingCustomer = await User.findOne({ mobile: mobile.trim() });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this mobile number already exists' });
    }

    // Check if email already exists (if provided)
    if (email && email.trim()) {
      const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ error: 'Customer with this email already exists' });
      }
    }

    const customer = new User({
      name: name.trim(),
      mobile: mobile.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : undefined,
      isActive: isActive !== undefined ? isActive : true
    });

    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.code === 11000) {
      // Duplicate key error
      if (error.keyPattern.mobile) {
        return res.status(400).json({ error: 'Mobile number already exists' });
      }
      if (error.keyPattern.email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
app.put('/api/admin/customers/:id', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const { name, mobile, email, vehicleNumber, isActive } = req.body;

    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Update fields
    if (name) customer.name = name.trim();
    if (mobile && mobile !== customer.mobile) {
      // Check if new mobile already exists
      const existingCustomer = await User.findOne({ mobile: mobile.trim() });
      if (existingCustomer && existingCustomer._id.toString() !== req.params.id) {
        return res.status(400).json({ error: 'Mobile number already exists' });
      }
      customer.mobile = mobile.trim();
    }
    if (email !== undefined) {
      if (email && email.trim()) {
        // Check if new email already exists
        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail && existingEmail._id.toString() !== req.params.id) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        customer.email = email.trim().toLowerCase();
      } else {
        customer.email = undefined;
      }
    }
    if (vehicleNumber !== undefined) {
      customer.vehicleNumber = vehicleNumber ? vehicleNumber.trim().toUpperCase() : undefined;
    }
    if (isActive !== undefined) {
      customer.isActive = isActive;
    }

    await customer.save();

    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    if (error.code === 11000) {
      // Duplicate key error
      if (error.keyPattern.mobile) {
        return res.status(400).json({ error: 'Mobile number already exists' });
      }
      if (error.keyPattern.email) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
app.delete('/api/admin/customers/:id', authenticateToken, requirePermission('viewUsers'), async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ==================== EMPLOYEE MANAGEMENT ROUTES ====================

// Get all employees
app.get('/api/admin/employees', authenticateToken, requirePermission('viewEmployees'), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('role')
      .select('-password')
      .sort({ name: 1 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get employee by ID
app.get('/api/admin/employees/:id', authenticateToken, requirePermission('viewEmployees'), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('role')
      .select('-password');
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// Create employee
app.post('/api/admin/employees', authenticateToken, requirePermission('createEmployees'), async (req, res) => {
  try {
    const { name, email, mobile, password, role, department, designation, isActive } = req.body;

    // Validation
    if (!name || !email || !mobile || !password || !role) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if email already exists
    const existingEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check if role exists
    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Generate employee ID
    const employeeId = await Employee.generateEmployeeId();

    const employee = new Employee({
      employeeId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      password, // Will be hashed by pre-save hook
      role,
      department: department || '',
      designation: designation || '',
      isActive: isActive !== undefined ? isActive : true
    });

    await employee.save();

    // Return employee without password
    const employeeData = await Employee.findById(employee._id)
      .populate('role')
      .select('-password');

    res.status(201).json(employeeData);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
app.put('/api/admin/employees/:id', authenticateToken, requirePermission('editEmployees'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, password, role, department, designation, isActive } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email.toLowerCase() !== employee.email) {
      const existingEmail = await Employee.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: id } 
      });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      employee.email = email.toLowerCase().trim();
    }

    // Check if role exists
    if (role && role !== employee.role.toString()) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      employee.role = role;
    }

    if (name) employee.name = name.trim();
    if (mobile) employee.mobile = mobile.trim();
    if (password) employee.password = password; // Will be hashed by pre-save hook
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (isActive !== undefined) employee.isActive = isActive;

    await employee.save();

    // Return employee without password
    const employeeData = await Employee.findById(employee._id)
      .populate('role')
      .select('-password');

    res.json(employeeData);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
app.delete('/api/admin/employees/:id', authenticateToken, requirePermission('deleteEmployees'), async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await Employee.findByIdAndDelete(id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ==================== BOOKING MANAGEMENT ROUTES ====================

// Get all bookings
app.get('/api/admin/bookings', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const {
      status,
      payment_status,
      visiting_state,
      vehicle_number,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (payment_status) query.payment_status = payment_status;
    if (visiting_state) query.visiting_state = visiting_state;
    if (vehicle_number) query.vehicle_number = { $regex: vehicle_number.toUpperCase(), $options: 'i' };

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
app.get('/api/admin/bookings/:id', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking
app.post('/api/admin/bookings', authenticateToken, requirePermission('createBookings'), async (req, res) => {
  try {
    const {
      user,
      visiting_state,
      vehicle_number,
      seat_capacity,
      whatsapp_number,
      entry_border,
      tax_mode,
      tax_from_date,
      tax_upto_date,
      amount,
      status,
      payment_id,
      payment_status,
      payment_details
    } = req.body;

    // Validation
    if (!user || !visiting_state || !vehicle_number || !seat_capacity || 
        !whatsapp_number || !entry_border || !tax_mode || !tax_from_date || 
        !tax_upto_date || !amount) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Get or create user from JSON file users
    let mongoUser = null;
    const usersData = getUsers();
    const jsonUser = usersData.users.find(u => u.id === user);
    
    if (jsonUser) {
      // Check if user exists in MongoDB
      mongoUser = await User.findOne({ mobile: jsonUser.mobile });
      
      if (!mongoUser) {
        // Create user in MongoDB if doesn't exist
        const userData = {
          mobile: jsonUser.mobile,
          name: jsonUser.name,
          isActive: jsonUser.isActive !== false
        };
        // Only include email if it has a value
        if (jsonUser.email && jsonUser.email.trim()) {
          userData.email = jsonUser.email.trim().toLowerCase();
        }
        mongoUser = new User(userData);
        await mongoUser.save();
      }
    } else {
      return res.status(400).json({ error: 'User not found' });
    }

    const booking = new Booking({
      user: mongoUser._id,
      visiting_state,
      vehicle_number: vehicle_number.toUpperCase().trim(),
      seat_capacity,
      whatsapp_number,
      entry_border,
      tax_mode,
      tax_from_date: new Date(tax_from_date),
      tax_upto_date: new Date(tax_upto_date),
      amount,
      status: status || 'pending',
      payment_id,
      payment_status: payment_status || 'pending',
      payment_details: payment_details || {}
    });

    await booking.save();

    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name');

    // Emit WebSocket update
    const fullBookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');
    emitBookingUpdate('created', fullBookingData);

    res.status(201).json(bookingData);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

// Update booking
app.put('/api/admin/bookings/:id', authenticateToken, requirePermission('editBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Remove user field from update - user cannot be changed
    delete updateData.user;

    // Convert date strings to Date objects if present
    if (updateData.tax_from_date) updateData.tax_from_date = new Date(updateData.tax_from_date);
    if (updateData.tax_upto_date) updateData.tax_upto_date = new Date(updateData.tax_upto_date);

    // Uppercase vehicle number if provided
    if (updateData.vehicle_number) {
      updateData.vehicle_number = updateData.vehicle_number.toUpperCase().trim();
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Emit WebSocket update
    emitBookingUpdate('updated', booking);

    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking', details: error.message });
  }
});

// Delete all bookings (admin only)
app.delete('/api/admin/bookings', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to delete all bookings
    if (req.user.type !== 'admin' && req.user.username !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete all bookings' });
    }

    const result = await Booking.deleteMany({});
    
    // Emit WebSocket update for all deleted bookings
    // Note: We emit a single event as the actual bookings are deleted
    if (result.deletedCount > 0) {
      emitBookingUpdate('deleted', { _id: 'all' });
    }
    
    res.json({
      success: true,
      message: `All bookings deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all bookings:', error);
    res.status(500).json({ error: 'Failed to delete all bookings' });
  }
});

// Delete booking
app.delete('/api/admin/bookings/:id', authenticateToken, requirePermission('deleteBookings'), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await Booking.findByIdAndDelete(id);
    
    // Emit WebSocket update
    emitBookingUpdate('deleted', { _id: id });
    
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Assign booking to user
app.post('/api/admin/bookings/:id/assign', authenticateToken, requirePermission('assignBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to_user, notes } = req.body;

    if (!assigned_to_user) {
      return res.status(400).json({ error: 'assigned_to_user is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get current user ID (admin or employee)
    const assignmentData = {
      assigned_to_user,
      assigned_at: new Date(),
      notes: notes || ''
    };

    if (req.user.type === 'employee') {
      assignmentData.assigned_by = req.user.employeeId;
    } else {
      assignmentData.assigned_by_admin = req.user.username;
    }

    // Add assignment to the array
    booking.assigned_to.push(assignmentData);

    await booking.save();

    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId');

    // Emit WebSocket update
    emitBookingUpdate('assigned', bookingData);

    res.json(bookingData);
  } catch (error) {
    console.error('Error assigning booking:', error);
    res.status(500).json({ error: 'Failed to assign booking', details: error.message });
  }
});

// Complete booking (with mandatory PDF upload)
app.post('/api/admin/bookings/:id/complete', authenticateToken, requirePermission('completeBookings'), upload.single('taxSlip'), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.assigned_to || booking.assigned_to.length === 0) {
      return res.status(400).json({ error: 'Booking must be assigned before completion' });
    }

    // Check if PDF file was uploaded (mandatory)
    if (!req.file) {
      return res.status(400).json({ error: 'Tax slip PDF is required to complete booking' });
    }

    const completedAt = new Date();

    // Set completion details based on user type
    if (req.user.type === 'employee') {
      booking.completed_by = req.user.employeeId;
    } else {
      booking.completed_by_admin = req.user.username;
    }
    booking.completed_at = completedAt;
    booking.status = 'delivered'; // Set status to delivered when completed

    // Save tax slip PDF information
    booking.tax_slip_pdf = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      uploaded_at: completedAt,
      uploaded_by: req.user.employeeId || req.user._id
    };

    // Calculate time taken from first assignment to completion
    const firstAssignment = booking.assigned_to[0].assigned_at;
    if (firstAssignment) {
      booking.time_taken = completedAt - firstAssignment;
    }

    await booking.save();

    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');

    // Emit WebSocket update
    emitBookingUpdate('completed', bookingData);

    // Send push notification to user
    try {
      const mongoUser = bookingData.user;
      if (mongoUser && mongoUser.mobile) {
        // Normalize mobile number to find user
        const normalizeMobile = (mobile) => {
          if (!mobile) return null;
          const cleaned = mobile.toString().trim().replace(/^\+?91/, '').replace(/\D/g, '');
          return cleaned.slice(-10);
        };
        
        const normalizedMobile = normalizeMobile(mongoUser.mobile);
        if (normalizedMobile) {
          // Find user in MongoDB with push tokens
          const userWithTokens = await User.findOne({ 
            $or: [
              { mobile: { $regex: new RegExp(normalizedMobile + '$') } },
              { mobile: normalizedMobile },
              { mobile: `91${normalizedMobile}` },
              { mobile: `+91${normalizedMobile}` }
            ]
          });
          
          if (userWithTokens && userWithTokens.pushTokens && userWithTokens.pushTokens.length > 0) {
            const bookingId = bookingData.bookingId || bookingData._id.toString().substring(0, 8).toUpperCase();
            const vehicleNo = bookingData.vehicle_number || '';
            
            // Send push notification
            setImmediate(() => {
              sendPushNotificationToUser(
                userWithTokens,
                {
                  title: 'Tax Slip Ready! 📄',
                  body: `Your booking ${bookingId} tax slip is ready to download. Click to view in dashboard.`
                },
                {
                  type: 'booking_delivered',
                  bookingId: bookingData._id.toString(),
                  screen: '/dashboard',
                  action: 'view_booking'
                }
              );
            });
            console.log(`📱 [Complete Booking] Push notification scheduled for user ${mongoUser.mobile}`);
          } else {
            console.log(`ℹ️ [Complete Booking] User ${mongoUser.mobile} has no push tokens registered`);
          }
        }
      }
    } catch (pushError) {
      console.warn('⚠️ [Complete Booking] Push notification failed:', pushError?.message);
    }

    res.json(bookingData);
  } catch (error) {
    console.error('Error completing booking:', error);
    
    // Clean up uploaded file if booking save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to complete booking', details: error.message });
  }
});

// Download tax slip PDF
app.get('/api/bookings/:id/tax-slip', async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.file_path) {
      return res.status(404).json({ error: 'Tax slip PDF not found for this booking' });
    }

    const filePath = booking.tax_slip_pdf.file_path;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Tax slip PDF file not found on server' });
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${booking.tax_slip_pdf.original_name || booking.tax_slip_pdf.filename}"`);
    res.setHeader('Content-Length', booking.tax_slip_pdf.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading tax slip:', error);
    res.status(500).json({ error: 'Failed to download tax slip', details: error.message });
  }
});

// Update tax slip PDF (replace existing)
app.post('/api/admin/bookings/:id/update-tax-slip', authenticateToken, requirePermission('completeBookings'), upload.single('taxSlip'), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tax_slip_pdf || !booking.tax_slip_pdf.file_path) {
      return res.status(400).json({ error: 'No existing tax slip found. Use complete endpoint instead.' });
    }

    // Check if PDF file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Tax slip PDF is required' });
    }

    // Delete old tax slip file if exists
    if (fs.existsSync(booking.tax_slip_pdf.file_path)) {
      try {
        fs.unlinkSync(booking.tax_slip_pdf.file_path);
      } catch (fileError) {
        console.error('Error deleting old tax slip file:', fileError);
      }
    }

    // Update tax slip PDF information
    booking.tax_slip_pdf = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      uploaded_at: new Date(),
      uploaded_by: req.user.employeeId || req.user._id
    };

    await booking.save();

    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId')
      .populate('tax_slip_pdf.uploaded_by', 'name employeeId');

    // Emit WebSocket update
    emitBookingUpdate('updated', bookingData);

    // Send push notification to user about updated tax slip
    try {
      const mongoUser = bookingData.user;
      if (mongoUser && mongoUser.mobile) {
        // Normalize mobile number to find user
        const normalizeMobile = (mobile) => {
          if (!mobile) return null;
          const cleaned = mobile.toString().trim().replace(/^\+?91/, '').replace(/\D/g, '');
          return cleaned.slice(-10);
        };
        
        const normalizedMobile = normalizeMobile(mongoUser.mobile);
        if (normalizedMobile) {
          // Find user in MongoDB with push tokens
          const userWithTokens = await User.findOne({ 
            $or: [
              { mobile: { $regex: new RegExp(normalizedMobile + '$') } },
              { mobile: normalizedMobile },
              { mobile: `91${normalizedMobile}` },
              { mobile: `+91${normalizedMobile}` }
            ]
          });
          
          if (userWithTokens && userWithTokens.pushTokens && userWithTokens.pushTokens.length > 0) {
            const bookingId = bookingData.bookingId || bookingData._id.toString().substring(0, 8).toUpperCase();
            
            // Send push notification
            setImmediate(() => {
              sendPushNotificationToUser(
                userWithTokens,
                {
                  title: 'Tax Slip Updated! 📄',
                  body: `Your booking ${bookingId} tax slip has been updated. Click to view in dashboard.`
                },
                {
                  type: 'booking_updated',
                  bookingId: bookingData._id.toString(),
                  screen: '/dashboard',
                  action: 'view_booking'
                }
              );
            });
            console.log(`📱 [Update Tax Slip] Push notification scheduled for user ${mongoUser.mobile}`);
          } else {
            console.log(`ℹ️ [Update Tax Slip] User ${mongoUser.mobile} has no push tokens registered`);
          }
        }
      }
    } catch (pushError) {
      console.warn('⚠️ [Update Tax Slip] Push notification failed:', pushError?.message);
    }

    res.json(bookingData);
  } catch (error) {
    console.error('Error updating tax slip:', error);
    
    // Clean up uploaded file if booking save failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to update tax slip', details: error.message });
  }
});

// Uncomplete booking
app.post('/api/admin/bookings/:id/uncomplete', authenticateToken, requirePermission('completeBookings'), async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.completed_at) {
      return res.status(400).json({ error: 'Booking is not completed' });
    }

    // Delete tax slip PDF file if exists
    if (booking.tax_slip_pdf && booking.tax_slip_pdf.file_path) {
      try {
        if (fs.existsSync(booking.tax_slip_pdf.file_path)) {
          fs.unlinkSync(booking.tax_slip_pdf.file_path);
        }
      } catch (fileError) {
        console.error('Error deleting tax slip file:', fileError);
      }
    }

    // Reset completion details
    booking.completed_by = null;
    booking.completed_by_admin = null;
    booking.completed_at = null;
    booking.time_taken = null;
    booking.tax_slip_pdf = null;
    
    // Reset status to paid (or keep current status if it was already paid)
    if (booking.status === 'delivered') {
      booking.status = 'paid';
    }

    await booking.save();

    const bookingData = await Booking.findById(booking._id)
      .populate('user', 'name mobile email')
      .populate('visiting_state', 'name')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .populate('completed_by', 'name employeeId');

    // Emit WebSocket update
    emitBookingUpdate('uncompleted', bookingData);

    res.json(bookingData);
  } catch (error) {
    console.error('Error uncompleting booking:', error);
    res.status(500).json({ error: 'Failed to uncomplete booking', details: error.message });
  }
});

// Employee login
app.post('/api/employee/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    // Find employee
    const employee = await Employee.findOne({ employeeId }).populate('role');
    if (!employee) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if employee is active
    if (!employee.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Check if role is active
    if (!employee.role.isActive) {
      return res.status(403).json({ error: 'Role is inactive' });
    }

    // Verify password
    const isMatch = await employee.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    employee.lastLogin = new Date();
    await employee.save();

    // Generate token
    const token = jwt.sign(
      { 
        employeeId: employee._id,
        type: 'employee'
      },
      JWT_SECRET
    );

    // Get employee with permissions
    const employeeData = await employee.getWithPermissions();

    res.json({
      token,
      user: employeeData
    });
  } catch (error) {
    console.error('Error during employee login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user info (works for both admin and employees)
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.type === 'admin') {
      return res.json({
        type: 'admin',
        username: 'admin',
        permissions: req.user.permissions
      });
    }

    if (req.user.type === 'employee') {
      const employeeData = await req.user.employee.getWithPermissions();
      return res.json(employeeData);
    }

    res.status(400).json({ error: 'Invalid user type' });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// ============================================
// INSURANCE INQUIRY ROUTES
// ============================================

// Create insurance inquiry (public - from mobile app)
app.post('/api/insurance/inquiry', async (req, res) => {
  try {
    const { name, vehicleNumber, mobile, message } = req.body;

    // Validation
    if (!vehicleNumber || vehicleNumber.trim().length === 0) {
      return res.status(400).json({ error: 'Vehicle number is required' });
    }

    const inquiry = new InsuranceInquiry({
      name: name?.trim() || undefined,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      mobile: mobile?.trim() || undefined,
      message: message?.trim() || undefined,
      status: 'pending'
    });

    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Insurance inquiry submitted successfully',
      inquiry: {
        id: inquiry._id,
        vehicleNumber: inquiry.vehicleNumber,
        status: inquiry.status
      }
    });
  } catch (error) {
    console.error('Error creating insurance inquiry:', error);
    res.status(500).json({ error: 'Failed to submit insurance inquiry', details: error.message });
  }
});

// Get all insurance inquiries (admin)
app.get('/api/admin/insurance-inquiries', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const {
      status,
      vehicle_number,
      mobile,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (vehicle_number) query.vehicleNumber = { $regex: vehicle_number.toUpperCase(), $options: 'i' };
    if (mobile) query.mobile = { $regex: mobile, $options: 'i' };

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const inquiries = await InsuranceInquiry.find(query)
      .populate('contactedBy', 'name employeeId')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await InsuranceInquiry.countDocuments(query);

    res.json({
      inquiries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching insurance inquiries:', error);
    res.status(500).json({ error: 'Failed to fetch insurance inquiries' });
  }
});

// Get insurance inquiry by ID (admin)
app.get('/api/admin/insurance-inquiries/:id', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const inquiry = await InsuranceInquiry.findById(req.params.id)
      .populate('contactedBy', 'name employeeId')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId');

    if (!inquiry) {
      return res.status(404).json({ error: 'Insurance inquiry not found' });
    }

    res.json(inquiry);
  } catch (error) {
    console.error('Error fetching insurance inquiry:', error);
    res.status(500).json({ error: 'Failed to fetch insurance inquiry' });
  }
});

// Update insurance inquiry (admin)
app.put('/api/admin/insurance-inquiries/:id', authenticateToken, requirePermission('editBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Uppercase vehicle number if provided
    if (updateData.vehicleNumber) {
      updateData.vehicleNumber = updateData.vehicleNumber.toUpperCase().trim();
    }

    // Convert recontact_date string to Date if provided
    if (updateData.recontact_date && typeof updateData.recontact_date === 'string') {
      updateData.recontact_date = new Date(updateData.recontact_date);
    }

    // Handle status change to contacted
    if (updateData.status === 'contacted' && !updateData.contactedAt) {
      updateData.contactedAt = new Date();
      if (req.user && req.user.employee) {
        updateData.contactedBy = req.user.employee._id;
      }
    }

    const inquiry = await InsuranceInquiry.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('contactedBy', 'name employeeId')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId');

    if (!inquiry) {
      return res.status(404).json({ error: 'Insurance inquiry not found' });
    }

    res.json(inquiry);
  } catch (error) {
    console.error('Error updating insurance inquiry:', error);
    res.status(500).json({ error: 'Failed to update insurance inquiry', details: error.message });
  }
});

// Assign insurance inquiry to employee
app.post('/api/admin/insurance-inquiries/:id/assign', authenticateToken, requirePermission('assignBookings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to_user, notes } = req.body;

    if (!assigned_to_user) {
      return res.status(400).json({ error: 'assigned_to_user is required' });
    }

    const inquiry = await InsuranceInquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ error: 'Insurance inquiry not found' });
    }

    // Get current user ID (admin or employee)
    const assignmentData = {
      assigned_to_user,
      assigned_at: new Date(),
      notes: notes || ''
    };

    if (req.user.type === 'employee') {
      assignmentData.assigned_by = req.user.employeeId;
    } else {
      assignmentData.assigned_by_admin = req.user.username || 'admin';
    }

    // Add assignment to the array
    inquiry.assigned_to.push(assignmentData);

    await inquiry.save();

    const inquiryData = await InsuranceInquiry.findById(inquiry._id)
      .populate('contactedBy', 'name employeeId')
      .populate('assigned_to.assigned_to_user', 'name employeeId')
      .populate('assigned_to.assigned_by', 'name employeeId');

    res.json(inquiryData);
  } catch (error) {
    console.error('Error assigning insurance inquiry:', error);
    res.status(500).json({ error: 'Failed to assign insurance inquiry', details: error.message });
  }
});

// Delete insurance inquiry (admin)
app.delete('/api/admin/insurance-inquiries/:id', authenticateToken, requirePermission('deleteBookings'), async (req, res) => {
  try {
    const inquiry = await InsuranceInquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ error: 'Insurance inquiry not found' });
    }

    res.json({ message: 'Insurance inquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance inquiry:', error);
    res.status(500).json({ error: 'Failed to delete insurance inquiry' });
  }
});

// ============================================
// COUPON MANAGEMENT ROUTES
// ============================================

// Get all coupons (admin)
app.get('/api/admin/coupons', authenticateToken, requirePermission('viewCoupons'), async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Get coupon by ID (admin)
app.get('/api/admin/coupons/:id', authenticateToken, requirePermission('viewCoupons'), async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.json(coupon);
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({ error: 'Failed to fetch coupon' });
  }
});

// Create coupon (admin)
app.post('/api/admin/coupons', authenticateToken, requirePermission('createCoupons'), async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discount,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validTo,
      maxUses,
      isActive,
      applicableTo
    } = req.body;

    // Validation
    if (!code || !discountType || !discount || !validFrom || !validTo) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if coupon code already exists
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }

    // Validate discount based on type
    if (discountType === 'percentage' && discount > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase().trim(),
      description: description || '',
      discountType,
      discount: parseFloat(discount),
      minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : 0,
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      maxUses: maxUses ? parseInt(maxUses) : null,
      isActive: isActive !== undefined ? isActive : true,
      applicableTo: applicableTo || 'all'
    });

    await coupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to create coupon', details: error.message });
  }
});

// Update coupon (admin)
app.put('/api/admin/coupons/:id', authenticateToken, requirePermission('editCoupons'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discount,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validTo,
      maxUses,
      isActive,
      applicableTo
    } = req.body;

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // Check if code is being changed and if it conflicts
    if (code && code.toUpperCase().trim() !== coupon.code) {
      const existing = await Coupon.findOne({ 
        code: code.toUpperCase().trim(), 
        _id: { $ne: id } 
      });
      if (existing) {
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
      coupon.code = code.toUpperCase().trim();
    }

    // Validate discount based on type
    if (discountType === 'percentage' && discount > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%' });
    }

    if (description !== undefined) coupon.description = description;
    if (discountType !== undefined) coupon.discountType = discountType;
    if (discount !== undefined) coupon.discount = parseFloat(discount);
    if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = parseFloat(minPurchaseAmount);
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount ? parseFloat(maxDiscountAmount) : null;
    if (validFrom !== undefined) coupon.validFrom = new Date(validFrom);
    if (validTo !== undefined) coupon.validTo = new Date(validTo);
    if (maxUses !== undefined) coupon.maxUses = maxUses ? parseInt(maxUses) : null;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableTo !== undefined) coupon.applicableTo = applicableTo;

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to update coupon', details: error.message });
  }
});

// Delete coupon (admin)
app.delete('/api/admin/coupons/:id', authenticateToken, requirePermission('deleteCoupons'), async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// Public API: Validate coupon code
app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, amount, userId } = req.body;

    if (!code || !amount) {
      return res.status(400).json({ error: 'Coupon code and amount are required' });
    }

    const coupon = await Coupon.findValidByCode(code);
    if (!coupon) {
      return res.status(400).json({ 
        error: 'Invalid or expired coupon',
        valid: false
      });
    }

    // Check minimum purchase amount
    if (amount < coupon.minPurchaseAmount) {
      return res.status(400).json({
        error: `Minimum purchase amount of ₹${coupon.minPurchaseAmount} required`,
        valid: false
      });
    }

    // Check user applicability
    if (coupon.applicableTo === 'new_users' && userId) {
      // Check if user has previous bookings
      const userBookings = await Booking.countDocuments({ user: userId });
      if (userBookings > 0) {
        return res.status(400).json({
          error: 'This coupon is only for new users',
          valid: false
        });
      }
    }

    const discount = coupon.calculateDiscount(amount);

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discount: discount,
        originalDiscount: coupon.discount
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// ============================================
// PRODUCT MANAGEMENT ROUTES
// ============================================

// Upload product image
app.post('/api/admin/products/upload-image', authenticateToken, requirePermission('createProducts'), uploadProduct.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const imageUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get all products (admin)
app.get('/api/admin/products', authenticateToken, requirePermission('viewProducts'), async (req, res) => {
  try {
    const { q, isActive } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { sku: { $regex: q, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID (admin)
app.get('/api/admin/products/:id', authenticateToken, requirePermission('viewProducts'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin)
app.post('/api/admin/products', authenticateToken, requirePermission('createProducts'), async (req, res) => {
  try {
    const { name, sku, description, price, originalPrice, category, imageUrl, stock, isActive, rating, reviewsCount, keyFeatures, specifications } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    if (sku) {
      const existing = await Product.findOne({ sku: sku.trim() });
      if (existing) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    const product = new Product({
      name: name.trim(),
      sku: sku ? sku.trim() : undefined,
      description: description || '',
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      category: category || '',
      imageUrl: imageUrl || '',
      stock: stock ? parseInt(stock) : 0,
      rating: rating ? parseFloat(rating) : 0,
      reviewsCount: reviewsCount ? parseInt(reviewsCount) : 0,
      keyFeatures: Array.isArray(keyFeatures) ? keyFeatures.filter(f => f && f.trim()) : [],
      specifications: specifications && typeof specifications === 'object' ? new Map(Object.entries(specifications)) : new Map(),
      isActive: isActive !== undefined ? isActive : true
    });

    await product.save();
    res.status(201).json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    console.error('Error creating product:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate key error (possibly SKU)' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (admin)
app.put('/api/admin/products/:id', authenticateToken, requirePermission('editProducts'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, description, price, originalPrice, category, imageUrl, stock, isActive, rating, reviewsCount, keyFeatures, specifications } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (sku && sku.trim() !== product.sku) {
      const existing = await Product.findOne({ sku: sku.trim(), _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      product.sku = sku.trim();
    }

    if (name !== undefined) product.name = name.trim();
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
    if (category !== undefined) product.category = category;
    if (imageUrl !== undefined) product.imageUrl = imageUrl;
    if (stock !== undefined) product.stock = parseInt(stock);
    if (rating !== undefined) product.rating = parseFloat(rating);
    if (reviewsCount !== undefined) product.reviewsCount = parseInt(reviewsCount);
    if (keyFeatures !== undefined) product.keyFeatures = Array.isArray(keyFeatures) ? keyFeatures.filter(f => f && f.trim()) : [];
    if (specifications !== undefined) product.specifications = specifications && typeof specifications === 'object' ? new Map(Object.entries(specifications)) : new Map();
    if (isActive !== undefined) product.isActive = !!isActive;

    await product.save();
    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin)
app.delete('/api/admin/products/:id', authenticateToken, requirePermission('deleteProducts'), async (req, res) => {
  try {
    const { id} = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get active products for shop (public/user)
app.get('/api/products', async (req, res) => {
  try {
    const { category, q, minPrice, maxPrice } = req.query;
    const filter = { isActive: true };
    
    if (category && category !== 'All') {
      filter.category = category;
    }
    
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { category: new RegExp(q, 'i') }
      ];
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID (public/user)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!product.isActive) {
      return res.status(404).json({ error: 'Product not available' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ============================================
// CART ROUTES
// ============================================

// Get user's cart
app.get('/api/cart', authenticateToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Add item to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (!product.isActive) {
      return res.status(400).json({ error: 'Product is not available' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }
    
    const existingItemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }
    
    await cart.save();
    await cart.populate('items.product');
    
    res.json({ success: true, message: 'Item added to cart', cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update cart item quantity
app.put('/api/cart/update/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate('items.product');
    
    res.json({ success: true, message: 'Cart updated', cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(item => item.product.toString() !== productId);
    await cart.save();
    await cart.populate('items.product');
    
    res.json({ success: true, message: 'Item removed from cart', cart });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Clear cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// ============================================
// ORDER ROUTES
// ============================================

// Create order from cart
app.post('/api/orders/create', authenticateToken, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'cod', notes } = req.body;
    
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.addressLine1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({ error: 'Complete shipping address is required' });
    }
    
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    
    // Validate stock and prepare order items
    const orderItems = [];
    let subtotal = 0;
    
    for (const item of cart.items) {
      const product = item.product;
      
      if (!product.isActive) {
        return res.status(400).json({ error: `Product ${product.name} is no longer available` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
      
      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;
      
      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.imageUrl,
        quantity: item.quantity,
        price: product.price,
        subtotal: itemSubtotal
      });
      
      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Calculate shipping fee
    const shippingFee = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shippingFee;
    
    // Create order
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingFee,
      total,
      paymentMethod,
      notes,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
    });
    
    await order.save();
    
    // Clear cart
    cart.items = [];
    await cart.save();
    
    // Populate order details
    await order.populate('user', 'name mobile email');
    
    res.status(201).json({ success: true, message: 'Order created successfully', order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user's orders
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Cancel order
app.post('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }
    
    if (order.status === 'shipped') {
      return res.status(400).json({ error: 'Order already shipped. Please contact support.' });
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason || 'Cancelled by user';
    
    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }
    
    await order.save();
    
    res.json({ success: true, message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// ============================================
// ADMIN ORDER ROUTES
// ============================================

// Get all orders (admin)
app.get('/api/admin/orders', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const { status, q, startDate, endDate } = req.query;
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (q) {
      filter.$or = [
        { orderNumber: new RegExp(q, 'i') },
        { 'shippingAddress.fullName': new RegExp(q, 'i') },
        { 'shippingAddress.phone': new RegExp(q, 'i') }
      ];
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(filter)
      .populate('user', 'name mobile email')
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get order by ID (admin)
app.get('/api/admin/orders/:id', authenticateToken, requirePermission('viewBookings'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name mobile email')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Update order status (admin)
app.put('/api/admin/orders/:id/status', authenticateToken, requirePermission('editBookings'), async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    order.status = status;
    
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }
    
    await order.save();
    await order.populate('user', 'name mobile email');
    await order.populate('items.product');
    
    res.json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order (admin)
app.delete('/api/admin/orders/:id', authenticateToken, requirePermission('deleteBookings'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ==================== BANNER ROUTES ====================

// Debug endpoint to check if banner file exists
app.get('/api/banners/debug/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', 'banners', filename);
    
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const stats = fs.statSync(filePath);
      res.json({
        exists: true,
        path: filePath,
        size: stats.size,
        url: `/uploads/banners/${filename}`,
        fullUrl: `${process.env.BASE_URL || 'http://localhost:3001'}/uploads/banners/${filename}`
      });
    } else {
      res.json({
        exists: false,
        path: filePath,
        message: 'File not found',
        uploadDir: path.join(__dirname, 'uploads', 'banners'),
        files: fs.existsSync(path.join(__dirname, 'uploads', 'banners')) 
          ? fs.readdirSync(path.join(__dirname, 'uploads', 'banners'))
          : []
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Serve banner images with proper headers
app.get('/uploads/banners/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', 'banners', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Banner image not found' });
    }
    
    // Set proper headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Determine content type based on extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm'
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving banner file:', error);
    res.status(500).json({ error: 'Failed to serve banner file' });
  }
});

// Get active banners (public)
app.get('/api/banners', async (req, res) => {
  try {
    const banners = await Banner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    
    // Construct full URLs for media files
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const bannersWithUrls = banners.map(banner => {
      if (banner.mediaType !== 'custom' && banner.mediaUrl) {
        return {
          ...banner,
          mediaUrl: banner.mediaUrl.startsWith('http') 
            ? banner.mediaUrl 
            : `${baseUrl}${banner.mediaUrl}`
        };
      }
      return banner;
    });
    
    res.json({ banners: bannersWithUrls });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Track banner view
app.post('/api/banners/:id/view', async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking banner view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Track banner click
app.post('/api/banners/:id/click', async (req, res) => {
  try {
    await Banner.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking banner click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Admin: Get all banners (including inactive)
app.get('/api/admin/banners', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const banners = await Banner.find()
      .sort({ order: 1, createdAt: -1 });
    
    // Construct full URLs for media files
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const bannersWithUrls = banners.map(banner => {
      const bannerObj = banner.toObject();
      if (bannerObj.mediaType !== 'custom' && bannerObj.mediaUrl) {
        return {
          ...bannerObj,
          mediaUrl: bannerObj.mediaUrl.startsWith('http') 
            ? bannerObj.mediaUrl 
            : `${baseUrl}${bannerObj.mediaUrl}`
        };
      }
      return bannerObj;
    });
    
    res.json({ banners: bannersWithUrls });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Admin: Get single banner
app.get('/api/admin/banners/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const bannerObj = banner.toObject();
    if (bannerObj.mediaType !== 'custom' && bannerObj.mediaUrl) {
      bannerObj.mediaUrl = bannerObj.mediaUrl.startsWith('http') 
        ? bannerObj.mediaUrl 
        : `${baseUrl}${bannerObj.mediaUrl}`;
    }
    
    res.json(bannerObj);
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// Admin: Create banner with image/video upload
app.post('/api/admin/banners', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), uploadBanner.single('media'), async (req, res) => {
  try {
    const { title, description, mediaType, customContent, actionType, actionScreen, actionLink, order, isActive } = req.body;
    
    const bannerData = {
      title,
      description,
      mediaType,
      actionType: actionType || 'none',
      order: order || 0,
      isActive: isActive === 'true' || isActive === true
    };
    
    // Handle media upload for image/video
    if (mediaType === 'image' || mediaType === 'video') {
      if (!req.file) {
        return res.status(400).json({ error: 'Media file is required for image/video banners' });
      }
      bannerData.mediaUrl = `/uploads/banners/${req.file.filename}`;
    }
    
    // Handle custom content for custom banners
    if (mediaType === 'custom') {
      try {
        bannerData.customContent = typeof customContent === 'string' 
          ? JSON.parse(customContent) 
          : customContent;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid custom content JSON' });
      }
    }
    
    // Handle action configuration
    if (actionType === 'screen') {
      bannerData.actionScreen = actionScreen;
    } else if (actionType === 'link') {
      bannerData.actionLink = actionLink;
    }
    
    const banner = new Banner(bannerData);
    await banner.save();
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const bannerObj = banner.toObject();
    if (bannerObj.mediaType !== 'custom' && bannerObj.mediaUrl) {
      bannerObj.mediaUrl = `${baseUrl}${bannerObj.mediaUrl}`;
    }
    
    res.status(201).json(bannerObj);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner', details: error.message });
  }
});

// Admin: Update banner
app.put('/api/admin/banners/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), uploadBanner.single('media'), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    const { title, description, mediaType, customContent, actionType, actionScreen, actionLink, order, isActive } = req.body;
    
    // Update basic fields
    if (title) banner.title = title;
    if (description !== undefined) banner.description = description;
    if (mediaType) banner.mediaType = mediaType;
    if (actionType !== undefined) banner.actionType = actionType;
    if (order !== undefined) banner.order = order;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;
    
    // Handle media file update
    if (req.file) {
      // Delete old media file if it exists
      if (banner.mediaUrl && !banner.mediaUrl.startsWith('http')) {
        const oldFilePath = path.join(__dirname, banner.mediaUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      banner.mediaUrl = `/uploads/banners/${req.file.filename}`;
    }
    
    // Handle custom content update
    if (customContent) {
      try {
        banner.customContent = typeof customContent === 'string' 
          ? JSON.parse(customContent) 
          : customContent;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid custom content JSON' });
      }
    }
    
    // Handle action updates
    if (actionType === 'screen') {
      banner.actionScreen = actionScreen;
      banner.actionLink = undefined;
    } else if (actionType === 'link') {
      banner.actionLink = actionLink;
      banner.actionScreen = undefined;
    } else if (actionType === 'none') {
      banner.actionScreen = undefined;
      banner.actionLink = undefined;
    }
    
    await banner.save();
    
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const bannerObj = banner.toObject();
    if (bannerObj.mediaType !== 'custom' && bannerObj.mediaUrl) {
      bannerObj.mediaUrl = bannerObj.mediaUrl.startsWith('http') 
        ? bannerObj.mediaUrl 
        : `${baseUrl}${bannerObj.mediaUrl}`;
    }
    
    res.json(bannerObj);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Failed to update banner', details: error.message });
  }
});

// Admin: Toggle banner active status
app.patch('/api/admin/banners/:id/toggle', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    banner.isActive = !banner.isActive;
    await banner.save();
    
    res.json({ success: true, isActive: banner.isActive });
  } catch (error) {
    console.error('Error toggling banner:', error);
    res.status(500).json({ error: 'Failed to toggle banner' });
  }
});

// Admin: Reorder banners
app.post('/api/admin/banners/reorder', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const { bannerIds } = req.body;
    
    if (!Array.isArray(bannerIds)) {
      return res.status(400).json({ error: 'bannerIds must be an array' });
    }
    
    // Update order for each banner
    const updatePromises = bannerIds.map((id, index) => 
      Banner.findByIdAndUpdate(id, { order: index })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ success: true, message: 'Banners reordered successfully' });
  } catch (error) {
    console.error('Error reordering banners:', error);
    res.status(500).json({ error: 'Failed to reorder banners' });
  }
});

// Admin: Delete banner
app.delete('/api/admin/banners/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }
    
    // Delete media file if it exists
    if (banner.mediaUrl && !banner.mediaUrl.startsWith('http')) {
      const filePath = path.join(__dirname, banner.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await Banner.findByIdAndDelete(req.params.id);
    
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// ==================== MARKETPLACE ROUTES ====================

// Get all marketplace items (public - with optional auth for favorites)
app.get('/api/marketplace', async (req, res) => {
  try {
    const { category, search, status = 'active', userId } = req.query;
    
    let query = { status };
    
    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }
    
    // Text search
    if (search) {
      query.$text = { $search: search };
    }
    
    const items = await MarketplaceItem.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Add favorite status and format seller info
    const itemsWithFavorites = items.map(item => ({
      ...item,
      seller: {
        _id: item.seller,
        name: item.sellerName,
        phone: item.sellerPhone
      },
      isFavorite: userId ? item.favoritedBy.some(id => id === userId) : false,
      favoriteCount: item.favoritedBy ? item.favoritedBy.length : 0
    }));
    
    res.json(itemsWithFavorites);
  } catch (error) {
    console.error('Error fetching marketplace items:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace items' });
  }
});

// Get user's own ads
app.get('/api/marketplace/my-ads', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const items = await MarketplaceItem.find({ seller: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    const itemsWithFavorites = items.map(item => ({
      ...item,
      seller: {
        _id: item.seller,
        name: item.sellerName,
        phone: item.sellerPhone
      },
      isFavorite: item.favoritedBy.some(id => id === userId),
      favoriteCount: item.favoritedBy ? item.favoritedBy.length : 0
    }));
    
    res.json(itemsWithFavorites);
  } catch (error) {
    console.error('Error fetching user ads:', error);
    res.status(500).json({ error: 'Failed to fetch user ads' });
  }
});

// Get user's favorited items
app.get('/api/marketplace/favorites', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const items = await MarketplaceItem.find({ 
      favoritedBy: userId,
      status: 'active' 
    })
      .sort({ createdAt: -1 })
      .lean();
    
    const itemsWithFavorites = items.map(item => ({
      ...item,
      seller: {
        _id: item.seller,
        name: item.sellerName,
        phone: item.sellerPhone
      },
      isFavorite: true,
      favoriteCount: item.favoritedBy ? item.favoritedBy.length : 0
    }));
    
    res.json(itemsWithFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get single marketplace item
app.get('/api/marketplace/:id', async (req, res) => {
  try {
    const item = await MarketplaceItem.findById(req.params.id).lean();
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Increment view count
    await MarketplaceItem.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    
    res.json({
      ...item,
      seller: {
        _id: item.seller,
        name: item.sellerName,
        phone: item.sellerPhone
      }
    });
  } catch (error) {
    console.error('Error fetching marketplace item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create marketplace item with images
app.post('/api/marketplace', uploadMarketplace.array('images', 5), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      category, 
      location, 
      userId,
      sellerName,
      sellerPhone,
      condition,
      negotiable,
      year,
      mileage,
      fuelType,
      transmission
    } = req.body;
    
    console.log('📝 [MARKETPLACE] Creating ad with userId:', userId);
    
    // Validation
    if (!title || !description || !price || !category || !location || !userId || !sellerName || !sellerPhone) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, description, price, category, location, userId, sellerName, sellerPhone' 
      });
    }
    
    // Verify user exists (check both file-based and MongoDB users)
    let userExists = false;
    
    // Check file-based users (legacy system)
    const usersData = getUsers();
    const fileUser = usersData.users.find(u => u.id === userId);
    if (fileUser) {
      userExists = true;
      console.log('✅ [MARKETPLACE] User found in file-based storage');
    }
    
    // Also check MongoDB users if needed
    if (!userExists) {
      try {
        const mongoUser = await User.findById(userId);
        if (mongoUser) {
          userExists = true;
          console.log('✅ [MARKETPLACE] User found in MongoDB');
        }
      } catch (e) {
        // Not a valid MongoDB ID, that's okay if user exists in file storage
        console.log('⚠️  [MARKETPLACE] Not a MongoDB ID format, using file-based user');
      }
    }
    
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Process uploaded images
    const images = req.files ? req.files.map(file => `/uploads/marketplace/${file.filename}`) : [];
    
    console.log('📸 [MARKETPLACE] Images uploaded:', images.length);
    
    const item = new MarketplaceItem({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      location: location.trim(),
      images,
      seller: userId, // Store as string (will work for both file-based and MongoDB IDs)
      sellerName: sellerName.trim(),
      sellerPhone: sellerPhone.trim(),
      condition,
      negotiable: negotiable === 'true' || negotiable === true,
      year: year ? parseInt(year) : undefined,
      mileage,
      fuelType,
      transmission
    });
    
    await item.save();
    
    console.log('✅ [MARKETPLACE] Ad created successfully:', item._id);
    
    // Return the item without population (since seller might not be in MongoDB)
    const createdItem = await MarketplaceItem.findById(item._id).lean();
    
    res.status(201).json({
      success: true,
      message: 'Ad posted successfully',
      item: {
        ...createdItem,
        seller: {
          _id: userId,
          name: sellerName,
          phone: sellerPhone
        }
      }
    });
  } catch (error) {
    console.error('❌ [MARKETPLACE] Error creating item:', error);
    res.status(500).json({ 
      error: 'Failed to create ad',
      details: error.message 
    });
  }
});

// Update marketplace item
app.put('/api/marketplace/:id', uploadMarketplace.array('images', 5), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      category, 
      location,
      userId,
      condition,
      negotiable,
      year,
      mileage,
      fuelType,
      transmission,
      removeImages
    } = req.body;
    
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check ownership (string comparison)
    if (item.seller !== userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this ad' });
    }
    
    // Update fields
    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (price) item.price = parseFloat(price);
    if (category) item.category = category;
    if (location) item.location = location.trim();
    if (condition) item.condition = condition;
    if (negotiable !== undefined) item.negotiable = negotiable === 'true' || negotiable === true;
    if (year) item.year = parseInt(year);
    if (mileage) item.mileage = mileage;
    if (fuelType) item.fuelType = fuelType;
    if (transmission) item.transmission = transmission;
    
    // Handle image removal
    if (removeImages) {
      const imagesToRemove = JSON.parse(removeImages);
      item.images = item.images.filter(img => !imagesToRemove.includes(img));
      
      // Delete files from disk
      imagesToRemove.forEach(imgPath => {
        const filePath = path.join(__dirname, imgPath.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
    
    // Add new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/marketplace/${file.filename}`);
      item.images = [...item.images, ...newImages];
    }
    
    await item.save();
    
    const updatedItem = await MarketplaceItem.findById(item._id).lean();
    
    res.json({
      success: true,
      message: 'Ad updated successfully',
      item: {
        ...updatedItem,
        seller: {
          _id: updatedItem.seller,
          name: updatedItem.sellerName,
          phone: updatedItem.sellerPhone
        }
      }
    });
  } catch (error) {
    console.error('Error updating marketplace item:', error);
    res.status(500).json({ error: 'Failed to update ad' });
  }
});

// Mark item as sold
app.patch('/api/marketplace/:id/mark-sold', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check ownership (string comparison)
    if (item.seller !== userId) {
      return res.status(403).json({ error: 'Unauthorized to modify this ad' });
    }
    
    item.status = 'sold';
    await item.save();
    
    res.json({
      success: true,
      message: 'Item marked as sold',
      item: {
        ...item.toObject(),
        seller: {
          _id: item.seller,
          name: item.sellerName,
          phone: item.sellerPhone
        }
      }
    });
  } catch (error) {
    console.error('Error marking item as sold:', error);
    res.status(500).json({ error: 'Failed to mark item as sold' });
  }
});

// Delete marketplace item (soft delete)
app.delete('/api/marketplace/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check ownership (string comparison)
    if (item.seller !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this ad' });
    }
    
    item.status = 'deleted';
    await item.save();
    
    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting marketplace item:', error);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

// Toggle favorite
app.post('/api/marketplace/:id/favorite', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const isFavorited = item.toggleFavorite(userId);
    await item.save();
    
    res.json({
      success: true,
      isFavorite: isFavorited,
      favoriteCount: item.favoritedBy.length
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Report item
app.post('/api/marketplace/:id/report', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId || !reason) {
      return res.status(400).json({ error: 'userId and reason are required' });
    }
    
    const item = await MarketplaceItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check if user already reported
    const alreadyReported = item.reportedBy.some(
      report => report.user.toString() === userId
    );
    
    if (alreadyReported) {
      return res.status(400).json({ error: 'You have already reported this item' });
    }
    
    item.reportedBy.push({
      user: userId,
      reason: reason.trim()
    });
    item.isReported = true;
    
    await item.save();
    
    res.json({
      success: true,
      message: 'Item reported successfully'
    });
  } catch (error) {
    console.error('Error reporting item:', error);
    res.status(500).json({ error: 'Failed to report item' });
  }
});

// ==================== END MARKETPLACE ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== POPUP ROUTES ====================

// Get active popups for a user (public/authenticated)
app.get('/api/popups/active', async (req, res) => {
  try {
    const { userId } = req.query;
    const now = new Date();
    
    // Find active popups within date range
    const query = {
      isActive: true,
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: null }
      ]
    };
    
    let popups = await Popup.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();
    
    // Filter based on user interactions if userId provided
    if (userId) {
      popups = popups.filter(popup => {
        const userInteraction = popup.userInteractions?.find(ui => ui.userId === userId);
        
        if (!userInteraction) return true; // Never shown to this user
        
        // Check if max display count reached
        if (popup.maxDisplayCount && userInteraction.viewCount >= popup.maxDisplayCount) {
          return false;
        }
        
        // Check frequency
        if (popup.displayFrequency === 'once' && userInteraction.viewCount > 0) {
          return false;
        }
        
        if (popup.displayFrequency === 'daily') {
          const lastViewed = new Date(userInteraction.lastViewed);
          const daysSince = (now - lastViewed) / (1000 * 60 * 60 * 24);
          if (daysSince < 1) return false;
        }
        
        if (popup.displayFrequency === 'weekly') {
          const lastViewed = new Date(userInteraction.lastViewed);
          const daysSince = (now - lastViewed) / (1000 * 60 * 60 * 24);
          if (daysSince < 7) return false;
        }
        
        return true;
      });
    }
    
    // Remove userInteractions from response
    popups = popups.map(p => {
      const { userInteractions, ...popup } = p;
      return popup;
    });
    
    res.json({ popups });
  } catch (error) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ error: 'Failed to fetch popups' });
  }
});

// Track popup view
app.post('/api/popups/:id/view', async (req, res) => {
  try {
    const { userId } = req.body;
    const popup = await Popup.findById(req.params.id);
    
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    // Increment total views
    popup.views += 1;
    
    // Track user interaction
    if (userId) {
      const interactionIndex = popup.userInteractions.findIndex(ui => ui.userId === userId);
      
      if (interactionIndex >= 0) {
        popup.userInteractions[interactionIndex].viewCount += 1;
        popup.userInteractions[interactionIndex].lastViewed = new Date();
      } else {
        popup.userInteractions.push({
          userId,
          viewCount: 1,
          lastViewed: new Date(),
          clicked: false,
          dismissed: false
        });
      }
    }
    
    await popup.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking popup view:', error);
    res.status(500).json({ error: 'Failed to track view' });
  }
});

// Track popup click
app.post('/api/popups/:id/click', async (req, res) => {
  try {
    const { userId } = req.body;
    const popup = await Popup.findById(req.params.id);
    
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    popup.clicks += 1;
    
    if (userId) {
      const interaction = popup.userInteractions.find(ui => ui.userId === userId);
      if (interaction) {
        interaction.clicked = true;
      }
    }
    
    await popup.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking popup click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Track popup dismissal
app.post('/api/popups/:id/dismiss', async (req, res) => {
  try {
    const { userId } = req.body;
    const popup = await Popup.findById(req.params.id);
    
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    popup.dismissals += 1;
    
    if (userId) {
      const interaction = popup.userInteractions.find(ui => ui.userId === userId);
      if (interaction) {
        interaction.dismissed = true;
      }
    }
    
    await popup.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking popup dismissal:', error);
    res.status(500).json({ error: 'Failed to track dismissal' });
  }
});

// Admin: Get all popups
app.get('/api/admin/popups', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const popups = await Popup.find().sort({ priority: -1, createdAt: -1 });
    res.json({ popups });
  } catch (error) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ error: 'Failed to fetch popups' });
  }
});

// Admin: Get single popup
app.get('/api/admin/popups/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    res.json(popup);
  } catch (error) {
    console.error('Error fetching popup:', error);
    res.status(500).json({ error: 'Failed to fetch popup' });
  }
});

// Admin: Create popup
app.post('/api/admin/popups', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), uploadBanner.single('image'), async (req, res) => {
  try {
    const popupData = { ...req.body };
    
    // Parse JSON fields
    if (typeof popupData.templateConfig === 'string') {
      try {
        popupData.templateConfig = JSON.parse(popupData.templateConfig);
      } catch (e) {
        // Ignore parse error
      }
    }
    
    // Handle image upload
    if (req.file) {
      popupData.imageUrl = `/uploads/banners/${req.file.filename}`;
    }
    
    // Parse dates
    if (popupData.startDate) popupData.startDate = new Date(popupData.startDate);
    if (popupData.endDate) popupData.endDate = new Date(popupData.endDate);
    
    const popup = new Popup(popupData);
    await popup.save();
    
    res.status(201).json(popup);
  } catch (error) {
    console.error('Error creating popup:', error);
    res.status(500).json({ error: 'Failed to create popup', details: error.message });
  }
});

// Admin: Update popup
app.put('/api/admin/popups/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), uploadBanner.single('image'), async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    const updateData = { ...req.body };
    
    // Parse JSON fields
    if (typeof updateData.templateConfig === 'string') {
      try {
        updateData.templateConfig = JSON.parse(updateData.templateConfig);
      } catch (e) {
        // Ignore
      }
    }
    
    // Handle image upload
    if (req.file) {
      // Delete old image if exists
      if (popup.imageUrl && !popup.imageUrl.startsWith('http')) {
        const oldPath = path.join(__dirname, popup.imageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      updateData.imageUrl = `/uploads/banners/${req.file.filename}`;
    }
    
    // Parse dates
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    
    Object.assign(popup, updateData);
    await popup.save();
    
    res.json(popup);
  } catch (error) {
    console.error('Error updating popup:', error);
    res.status(500).json({ error: 'Failed to update popup', details: error.message });
  }
});

// Admin: Toggle popup active status
app.patch('/api/admin/popups/:id/toggle', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    popup.isActive = !popup.isActive;
    await popup.save();
    
    res.json({ success: true, isActive: popup.isActive });
  } catch (error) {
    console.error('Error toggling popup:', error);
    res.status(500).json({ error: 'Failed to toggle popup' });
  }
});

// Admin: Delete popup
app.delete('/api/admin/popups/:id', authenticateToken, requireAnyPermission(['viewDashboard', 'viewProducts']), async (req, res) => {
  try {
    const popup = await Popup.findById(req.params.id);
    if (!popup) {
      return res.status(404).json({ error: 'Popup not found' });
    }
    
    // Delete image if exists
    if (popup.imageUrl && !popup.imageUrl.startsWith('http')) {
      const filePath = path.join(__dirname, popup.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    await Popup.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Popup deleted successfully' });
  } catch (error) {
    console.error('Error deleting popup:', error);
    res.status(500).json({ error: 'Failed to delete popup' });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get settings (public - for payment calculations)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      appEnabled: settings.appEnabled,
      disableMessage: settings.disableMessage,
      platformFee: settings.platformFee,
      paymentGatewayFeePercent: settings.paymentGatewayFeePercent,
      whatsappNumber: settings.whatsappNumber || ''
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Return defaults if error
    res.json({
      appEnabled: true,
      disableMessage: 'We are not accepting bookings at the moment. Please try again later.',
      platformFee: 20,
      paymentGatewayFeePercent: 2,
      whatsappNumber: ''
    });
  }
});

// Admin: Get all settings (including metadata)
app.get('/api/admin/settings', authenticateToken, requireAnyPermission(['viewSettings', 'viewDashboard']), async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Admin: Update settings
app.put('/api/admin/settings', authenticateToken, requireAnyPermission(['viewSettings', 'viewDashboard']), async (req, res) => {
  try {
    const { appEnabled, disableMessage, platformFee, paymentGatewayFeePercent, whatsappNumber } = req.body;
    
    // Validation
    if (appEnabled !== undefined && typeof appEnabled !== 'boolean') {
      return res.status(400).json({ error: 'App enabled must be a boolean' });
    }
    
    if (disableMessage !== undefined && (typeof disableMessage !== 'string' || disableMessage.length > 200)) {
      return res.status(400).json({ error: 'Disable message must be a string (max 200 characters)' });
    }
    
    if (platformFee !== undefined && (platformFee < 0 || typeof platformFee !== 'number')) {
      return res.status(400).json({ error: 'Platform fee must be a non-negative number' });
    }
    
    if (paymentGatewayFeePercent !== undefined && (paymentGatewayFeePercent < 0 || paymentGatewayFeePercent > 100 || typeof paymentGatewayFeePercent !== 'number')) {
      return res.status(400).json({ error: 'Payment gateway fee must be between 0 and 100' });
    }
    
    if (whatsappNumber !== undefined) {
      // Validate WhatsApp number if provided
      const cleanedNumber = String(whatsappNumber).replace(/\D/g, '');
      if (cleanedNumber && !/^[6-9]\d{9}$/.test(cleanedNumber)) {
        return res.status(400).json({ error: 'WhatsApp number must be a valid 10-digit Indian phone number' });
      }
    }
    
    const updates = {};
    if (appEnabled !== undefined) updates.appEnabled = appEnabled;
    if (disableMessage !== undefined) updates.disableMessage = disableMessage;
    if (platformFee !== undefined) updates.platformFee = platformFee;
    if (paymentGatewayFeePercent !== undefined) updates.paymentGatewayFeePercent = paymentGatewayFeePercent;
    if (whatsappNumber !== undefined) updates.whatsappNumber = String(whatsappNumber).replace(/\D/g, ''); // Store only digits
    
    const updatedBy = req.user?.username || req.user?.name || 'Admin';
    const settings = await Settings.updateSettings(updates, updatedBy);
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});

// Admin: Reset settings to defaults
app.post('/api/admin/settings/reset', authenticateToken, requireAnyPermission(['viewSettings', 'viewDashboard']), async (req, res) => {
  try {
    const updatedBy = req.user?.username || req.user?.name || 'Admin';
    const settings = await Settings.updateSettings({
      appEnabled: true,
      disableMessage: 'We are not accepting bookings at the moment. Please try again later.',
      platformFee: 20,
      paymentGatewayFeePercent: 2,
      whatsappNumber: ''
    }, updatedBy);
    
    res.json({
      success: true,
      message: 'Settings reset to defaults',
      settings
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ SafarTax OTA Backend running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadsDir}`);
  console.log(`🔐 Admin login: ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log(`🌐 Accessible on all network interfaces (0.0.0.0:${PORT})`);
  // Mask MongoDB URI for security (show only connection type and database)
  const mongoUriMasked = MONGODB_URI ? MONGODB_URI.replace(/(mongodb:\/\/|mongodb\+srv:\/\/)[^@]+@/, '$1***:***@') : 'Not set';
  console.log(`🗄️  MongoDB: ${mongoUriMasked}`);
  console.log(`🔌 WebSocket server is ready for connections`);
});

