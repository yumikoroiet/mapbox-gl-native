#!/usr/bin/env node

// This script measures the size of all binaries for the Mapbox Maps SDK
// for Android, and then uploads the data to AWS S3 to be processed by
// an internal data pipeline.

const fs = require('fs');
const zlib = require('zlib');
const AWS = require('aws-sdk');
var s3 = new AWS.S3();

const date = new Date();

// Name of Android variant and path to compiled binary.
const binaries = [
  ["aar", "platform/android/MapboxGLAndroidSDK/build/outputs/aar/MapboxGLAndroidSDK-release.aar"],
  ["armv7", "platform/android/MapboxGLAndroidSDK/build/intermediates/intermediate-jars/release/jni/armeabi-v7a/libmapbox-gl.so"],
  ["arm64_v8a", "platform/android/MapboxGLAndroidSDK/build/intermediates/intermediate-jars/release/jni/arm64-v8a/libmapbox-gl.so"],
  ["x86", "platform/android/MapboxGLAndroidSDK/build/intermediates/intermediate-jars/release/jni/x86/libmapbox-gl.so"],
  ["x86_64", "platform/android/MapboxGLAndroidSDK/build/intermediates/intermediate-jars/release/jni/x86_64/libmapbox-gl.so"]
]

// Generate binary metrics to upload to S3.
const androidMetrics = binaries.map(binary => {
  return JSON.stringify({
      'sdk': 'maps',
      'platform' : 'Android',
      'arch': binary[0],
      'size' : fs.statSync(binary[1]).size,
      'created_at': `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  })
}).join('\n');

// Check if existing binary metrics exist for iOS metrics.
s3.getObject({
  Bucket: 'mapbox-loading-dock', 
  Key: `raw/nadia_staging_test_v4/${process.env['CIRCLE_SHA1']}.json.gz`
}, (getObjectError, existingData) => {
  if (getObjectError) {
    // If no existing iOS metrics are found,
    // create new metrics object.
    if (getObjectError.statusCode == 404) {
      return new AWS.S3({region: 'us-east-1'}).putObject({
          Body: zlib.gzipSync(androidMetrics),
          Bucket: 'mapbox-loading-dock',
          Key: `raw/nadia_staging_test_v4/${process.env['CIRCLE_SHA1']}.json.gz`,
          CacheControl: 'max-age=300',
          ContentType: 'application/json'
      }, function (putObjectError, res) {
        if (putObjectError) {
          console.log("Error uploading new binary size metrics: ", putObjectError);
        } else {
          console.log("Successfully uploaded new binary size metrics");
        }
      });

    } else {
      console.log('Unknown error checking for existing metrics in S3: ' + getObjectError);
    } 
  } else {
    // Read existing data and append additional Android metrics to it.
    var buf = Buffer.from(existingData.Body);
    
    zlib.unzip(buf, (unzipError, existingData) => {
     if (unzipError) throw unzipError;
     
     var iosMetrics = existingData.toString();
     var updatedMetrics = iosMetrics + '\n' + androidMetrics;
      
      // Upload updated data to S3.
      return new AWS.S3({region: 'us-east-1'}).putObject({
          Body: zlib.gzipSync(updatedMetrics),
          Bucket: 'mapbox-loading-dock',
          Key: `raw/nadia_staging_test_v4/${process.env['CIRCLE_SHA1']}.json.gz`,
          CacheControl: 'max-age=300',
          ContentType: 'application/json'
      }, function (putObjectError, res) {
        if (putObjectError) {
          console.log("Error uploading Android binary size metrics to existing metrics: ", putObjectError);
        } else {
          console.log("Successfully uploaded Android binary size metrics to existing metrics.")
        }
      });
    });
  }
});