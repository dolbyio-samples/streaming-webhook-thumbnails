/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
import Crypto from "crypto";
import AWS from "aws-sdk";

// Get your webhook secret from Streaming dashboard webhook menu and set it as an environment variable in the AWS Console.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const AWS_S3_BUCKET_REGION = process.env.AWS_REGION;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const lambdaHandler = async (event, context) => {
  try {
    const now = new Date();
    
    // Make sure the content is a jpeg
    if (event["headers"]["content-type"].valueOf() != "image/jpeg".valueOf()) {
      return {
        statusCode: 400,
        body: 'Invalid content!',
      };
    }

    // Compute signature
    const body = Buffer.from(event.body, "base64");
    const webhookSecret = Buffer.from(WEBHOOK_SECRET, "base64");
    const calculatedSignature =  "sha1=" + Crypto.createHmac("sha1", webhookSecret).update(body).digest("hex");
    const headerSignature = event["headers"]["x-millicast-signature"];

    if (calculatedSignature !== headerSignature) {
      console.warn(`Invalid signature - received: ${headerSignature} - calculated: ${calculatedSignature}.`);
      return {
        statusCode: 400,
        body: 'Invalid signature!',
      };
    }

    const thumbTimestamp = event["headers"]["x-millicast-timestamp"];
    const thumbFeedId = event["headers"]["x-millicast-feed-id"];
    const thumbStreamId = event["headers"]["x-millicast-stream-id"];
    console.log(
      `DeliveredOn: ${now.toISOString()}. GeneratedOn: ${new Date(
        Number(thumbTimestamp)
      ).toISOString()}. ` +
        `FeedId: ${thumbFeedId}. StreamId: ${thumbStreamId}. ThumbnailSize: ${body.length}`
    );

    // Setting up the AWS S3 SDK
    AWS.config.update({ region: AWS_S3_BUCKET_REGION });
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    const params = {
      Bucket: AWS_S3_BUCKET_NAME,
      Key: `${thumbFeedId}_${thumbTimestamp}.jpg`,
      Body: body,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg',
    };

    // Upload the thumbnail to S3
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully -> ${data.Location}`);

    return {
      statusCode: 200,
      body: 'OK',
    };
  } catch (err) {
    console.log(err);

    return {
      statusCode: 500,
      body: 'An error occurred!',
    };
  }
};
