#!/usr/bin/env node

/**
 * Script to copy the latest Flutter APK to the frontend public directory
 * for Docker builds.
 */

const fs = require('fs');
const path = require('path');

const APK_SOURCE = path.join(__dirname, '..', 'mobile_app', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const APK_DEST_DIR = path.join(__dirname, '..', 'frontend', 'public', 'downloads');
const APK_DEST = path.join(APK_DEST_DIR, 'family-tracker.apk');

function copyAPK() {
  // Check if source APK exists
  if (!fs.existsSync(APK_SOURCE)) {
    console.error('❌ APK not found at:', APK_SOURCE);
    console.error('   Please build the APK first:');
    console.error('   cd mobile_app && flutter build apk --release');
    process.exit(1);
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(APK_DEST_DIR)) {
    fs.mkdirSync(APK_DEST_DIR, { recursive: true });
    console.log('✓ Created directory:', APK_DEST_DIR);
  }

  // Copy the APK
  try {
    fs.copyFileSync(APK_SOURCE, APK_DEST);
    
    // Get file sizes for confirmation
    const sourceStats = fs.statSync(APK_SOURCE);
    const destStats = fs.statSync(APK_DEST);
    
    console.log('✓ APK copied successfully!');
    console.log(`  Source: ${APK_SOURCE}`);
    console.log(`  Destination: ${APK_DEST}`);
    console.log(`  Size: ${(destStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Check if files are the same size
    if (sourceStats.size !== destStats.size) {
      console.warn('⚠ Warning: File sizes do not match!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error copying APK:', error.message);
    process.exit(1);
  }
}

copyAPK();





