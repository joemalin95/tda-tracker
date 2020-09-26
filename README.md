# tda-tracker
Static web application for tracking TD Ameritrade option positions opened and closed in the same day.

## Configuration

You will need to create a TD Ameritrade Developer app in order to run this third-party app.

Follow TD Ameritrade's [Getting Started Guide](https://developer.tdameritrade.com/content/getting-started) to create your app.

Then, find the **Consumer Key** and **Callback URL** in your dasboard. (pictured below)

![](https://github.com/joemalin95/tda-tracker/blob/master/assets/consumer_key_example.png)
![](https://github.com/joemalin95/tda-tracker/blob/master/assets/redirect_uri_example.png)

Finally, add these credentials to `utils.js` to finish configuring your tda-tracker app.
