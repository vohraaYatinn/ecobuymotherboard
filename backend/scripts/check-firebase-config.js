import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔍 Checking Firebase Configuration...\n');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

console.log('Environment Variables:');
console.log(`  FIREBASE_PROJECT_ID: ${projectId ? '✅ Found' : '❌ Missing'}`);
if (projectId) {
  console.log(`    Value: ${projectId.substring(0, 20)}...`);
}

console.log(`  FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅ Found' : '❌ Missing'}`);
if (clientEmail) {
  console.log(`    Value: ${clientEmail.substring(0, 30)}...`);
}

console.log(`  FIREBASE_PRIVATE_KEY: ${privateKey ? '✅ Found' : '❌ Missing'}`);
if (privateKey) {
  const keyLength = privateKey.length;
  const hasBegin = privateKey.includes('-----BEGIN');
  const hasEnd = privateKey.includes('-----END');
  const hasNewlines = privateKey.includes('\n') || privateKey.includes('\\n');
  
  console.log(`    Length: ${keyLength} characters`);
  console.log(`    Has BEGIN marker: ${hasBegin ? '✅' : '❌'}`);
  console.log(`    Has END marker: ${hasEnd ? '✅' : '❌'}`);
  console.log(`    Has newlines: ${hasNewlines ? '✅' : '❌'}`);
  
  if (!hasBegin || !hasEnd) {
    console.log('    ⚠️  Warning: Private key should include -----BEGIN and -----END markers');
  }
}

console.log('\n📁 .env file location:');
console.log(`  Expected: ${path.join(__dirname, '..', '.env')}`);

if (projectId && clientEmail && privateKey) {
  console.log('\n✅ All Firebase credentials are present!');
  console.log('💡 If push notifications still don\'t work, try:');
  console.log('   1. Restart the backend server');
  console.log('   2. Check server logs for Firebase initialization messages');
  console.log('   3. Verify the private key format is correct');
} else {
  console.log('\n❌ Some Firebase credentials are missing!');
  console.log('💡 Please add the missing credentials to your .env file');
}



