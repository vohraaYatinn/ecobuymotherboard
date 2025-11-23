import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables explicitly from multiple possible locations
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config(); // Also try default location

let messaging = null;

// Debug: Check if environment variables are loaded
const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

console.log('🔍 [Firebase Admin] Checking credentials...');
console.log(`   FIREBASE_PROJECT_ID: ${hasProjectId ? '✅ Found' : '❌ Missing'}`);
console.log(`   FIREBASE_CLIENT_EMAIL: ${hasClientEmail ? '✅ Found' : '❌ Missing'}`);
console.log(`   FIREBASE_PRIVATE_KEY: ${hasPrivateKey ? '✅ Found' : '❌ Missing'}`);

// Initialize Firebase Admin if credentials are provided
if (hasProjectId && hasClientEmail && hasPrivateKey) {
  try {
    // Check if already initialized
    if (!admin.apps.length) {
      // Handle private key - it might be in different formats
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Replace escaped newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // If private key doesn't start with -----BEGIN, it might need formatting
      if (!privateKey.includes('-----BEGIN')) {
        console.log('⚠️  [Firebase Admin] Private key format might be incorrect');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      console.log('✅ [Firebase Admin] Firebase Admin SDK initialized successfully');
      console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      console.log('✅ [Firebase Admin] Firebase Admin SDK already initialized');
    }
    
    messaging = admin.messaging();
    console.log('✅ [Firebase Admin] Firebase Messaging service initialized');
  } catch (firebaseError) {
    console.error('❌ [Firebase Admin] Initialization failed:', firebaseError.message);
    console.error('   Error details:', firebaseError);
    console.log('💡 Push notifications will not work until Firebase is properly configured');
    
    // Provide helpful debugging info
    if (firebaseError.message.includes('private_key')) {
      console.log('💡 Tip: Check that FIREBASE_PRIVATE_KEY includes the full key with -----BEGIN and -----END lines');
    }
    if (firebaseError.message.includes('credential')) {
      console.log('💡 Tip: Verify all three credentials are correct in your .env file');
    }
  }
} else {
  console.log('⚠️  [Firebase Admin] Firebase credentials not found in environment variables');
  console.log('💡 Push notifications will not work until Firebase is configured');
  console.log('   Required variables:');
  console.log('   - FIREBASE_PROJECT_ID');
  console.log('   - FIREBASE_CLIENT_EMAIL');
  console.log('   - FIREBASE_PRIVATE_KEY');
  console.log('');
  console.log('   Make sure your .env file is in the backend/ directory');
  console.log('   And that the server has been restarted after adding the credentials');
}

// Function to re-initialize Firebase (useful if credentials are added after server start)
export function reinitializeFirebase() {
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

  if (hasProjectId && hasClientEmail && hasPrivateKey) {
    try {
      // Delete existing app if any
      if (admin.apps.length > 0) {
        admin.apps.forEach(app => app.delete());
      }

      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });

      messaging = admin.messaging();
      console.log('✅ [Firebase Admin] Re-initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [Firebase Admin] Re-initialization failed:', error.message);
      return false;
    }
  }
  return false;
}

export { messaging, admin };

