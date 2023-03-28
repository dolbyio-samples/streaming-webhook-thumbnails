# Store Stream Thumbnails Locally
To be able to use the code in this repository you need to have npm installed and then run `npm install`. After installing required packages, you need to go to the `config` folder and change the fields under `default.json5` file. 
- Set the ` "thumbnailDir"` to the directory you wanted to save the images locally. You can set it as `"."` for the current directory or you can create a new directory and use the path of it to replace the `null`.

- To receive thumbnail images locally, we need to give our localhost's URL to the webhook we'll be creating in the next steps. Ngrok will create a public facing URL for some amount of time and re-direct any traffic to that URL to your local machine. To install ngrok see this website: https://ngrok.com/download
- - MacOS users can install ngrok via Homebrew: `brew install ngrok/ngrok/ngrok`
Http port in the `default.json5` file is served on 8080, so in a new terminal type `ngrok http 8080`. The terminal will clear and show the status with two Forwarding http address, such as http://123456789.ngrok.io/. You can copy the Forwarding URL to use creating a webhook. The terminal shows a log of requests while ngrok is active, in our case we will be seeing POST requests every 30 seconds.

- Next, you need to create a webhook from the [Dolby.io Dashboard](https://streaming.dolby.io/#/webhooks) by clicking `Create`, enable `Thumbnail hooks` and paste the Forwarding URL you recieved from the previous step to the `Webhook url` part.

- To set the `"webhookSecret"`, go to the [Dolby.io Dashboard](https://streaming.dolby.io/#/webhooks) and click to the webhook you created, copy the Webhook Secret from the Settings of that webhook and replace the `null` in the `default.json5` file.

- Lastly, from your terminal type `node index.js` and see the `Server listening` then go to your [Dolby.io Dashboard](https://streaming.dolby.io/#/tokens) and start a broadcast clicking the `BROADCAST` button.

You should be able to see the POST requests with 200 OK response in ngrok and images from the stream are being saved in the directory that you set in your `default.json5` file.

![Here's the demo](../assets/save-thumbnails-locally.gif)
