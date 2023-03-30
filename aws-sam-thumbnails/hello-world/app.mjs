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
import Crypto from 'crypto';
import Util from 'util';
import AWS from 'aws-sdk';
export const lambdaHandler = async (event, context) => {
    try {
        // Get your webhook secret from Streaming dashboard webhook menu and set it as an enviornment variable in the AWS Console.
        const webhookSecret = Buffer.from(process.env.WEBHOOK_SECRET, 'base64');
        const now = new Date();
        const isThumbnail =  event['headers']['content-type'].valueOf() == 'image/jpeg'.valueOf();
        const body = Buffer.from(event.body,'base64');
        const calculatedSignature = 'sha1=' + Crypto.createHmac('sha1', webhookSecret).update(body).digest('hex');
        const headerSignature = event['headers']['x-millicast-signature'];
        if (calculatedSignature !== headerSignature) {
            console.warn('Invalid signature sent to us, unsafe data. ' +
            `HeaderSignature: ${headerSignature}. CalculatedSignature: ${calculatedSignature}. ` +
            `IsThumbnail: ${isThumbnail}}. Body: ${isThumbnail ? 'binary data': body.toString()}`);
            return {
                'statusCode': 400,
                'body': JSON.stringify({
                    message: 'BAD SIGNATURE',
                })
            }
        }
        if (!isThumbnail) {
            const webhookEvent = event.body
            // operate on webhook data
            console.log(`DeliveredOn: ${now.toISOString()}. Event:`, Util.inspect(webhookEvent, false, null, true));
        } else {
            const thumbTimestamp = event['headers']['x-millicast-timestamp'];
            const thumbFeedId = event['headers']['x-millicast-feed-id'];
            const thumbStreamId = event['headers']['x-millicast-stream-id'];
            console.log(`DeliveredOn: ${now.toISOString()}. GeneratedOn: ${(new Date(Number(thumbTimestamp))).toISOString()}. ` +
            `FeedId: ${thumbFeedId}. StreamId: ${thumbStreamId}. ThumbnailSize: ${body.length}`);
            const fileName =  `${thumbFeedId}_${thumbTimestamp}.jpg`;
            // Setting up an S3 bucket and uploading the thumbnail image
            AWS.config.update({ region: 'us-west-1' });
            const s3 = new AWS.S3({apiVersion: '2006-03-01'});
            const params = {
                // Update the Bucket name with your S3 bucket's name
                Bucket: 'blog-thumbnails-bucket',
                Key:fileName,
                Body: body,
                ContentEncoding: 'base64',
                ContentType: 'image/jpeg'
            }
            await s3.upload(params).promise().then(function(data) {
                console.log(`File uploaded successfully. ${data.Location}`);
            }, function (err) {
                console.error("Upload failed", err);
            })
        }
    
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'hello world',
            })
        }
    } catch (err) {
        console.log(err);
        return err;
    }
};
