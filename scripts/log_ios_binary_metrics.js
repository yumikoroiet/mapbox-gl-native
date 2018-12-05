#!/usr/bin/env node

// This script measures the size of all binaries for the Mapbox Maps SDK
// for iOS, and then uploads the data to AWS S3 to be processed by
// an internal data pipeline.

const fs = require('fs');
const zlib = require('zlib');
const AWS = require('aws-sdk');
var s3 = new AWS.S3();

const date = new Date();

// Name of iOS variant and path to compiled binary.
const binaries = [
  ["universal", "build/ios/pkg/dynamic/Mapbox-stripped"],
  ["armv7", "build/ios/pkg/dynamic/Mapbox-stripped-armv7"],
  ["arm64", "build/ios/pkg/dynamic/Mapbox-stripped-arm64"],
  ["x86_64", "build/ios/pkg/dynamic/Mapbox-stripped-x86_64"]
]

// Generate binary metrics to upload to S3.
const iosMetrics = binaries.map(binary => {
  return JSON.stringify({
      'sdk': 'maps',
      'platform' : 'iOS',
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
    // If no existing Android metrics are found,
    // create new metrics object.
    if (getObjectError.statusCode == 404) {
      return new AWS.S3({region: 'us-east-1'}).putObject({
          Body: zlib.gzipSync(iosMetrics),
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
      
      var androidMetrics = existingData.toString();
      var updatedMetrics = androidMetrics + '\n' + iosMetrics
      
      // Upload updated data to S3.
      return new AWS.S3({region: 'us-east-1'}).putObject({
          Body: zlib.gzipSync(updatedMetrics),
          Bucket: 'mapbox-loading-dock',
          Key: `raw/nadia_staging_test_v4/${process.env['CIRCLE_SHA1']}.json.gz`,
          CacheControl: 'max-age=300',
          ContentType: 'application/json'
      }, function (putObjectError, res) {
        if (putObjectError) {
          console.log("Error uploading iOS binary size metrics to existing metrics: ", putObjectError);
        } else {
          console.log("Successfully uploaded iOS binary size metrics to existing metrics.")
        }
      });
     });
  }
});