# README

* Uses `requestTokenPopup()` method to grab token, see the docs [here](https://github.com/egnyte/egnyte-js-sdk/blob/master/src/docs/api.md#initialize-and-connect-to-api)
* Must make sure browser allows popups from your testing URL for this to work
* Other methods (`requestTokenRelaod()`, `requestTokenIframe()`) work fine, but the popup method seemed to work best within the skinny angular app I set up
