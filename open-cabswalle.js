import { remote } from "webdriverio";

const caps = {
  platformName: "Android",
  deviceName: "Android Emulator", // or your device name
  automationName: "UiAutomator2",

  appPackage: "com.app.cabswalle",
  appActivity: "com.app.cabswalle.ui.MainActivity", // replace if different

  noReset: true,
  newCommandTimeout: 300
};

const driver = await remote({
  hostname: "localhost",
  port: 4723,
  path: "/",
  capabilities: caps
});

// App will open here
console.log("CabsWalle app opened");
