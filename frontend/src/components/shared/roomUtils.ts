import {
    VERSION,
    onCameraChanged,
    onMicrophoneChanged,
  } from "agora-rtc-sdk-ng/esm";
console.log("Current SDK VERSION: ", VERSION);

onCameraChanged((device) => {
console.log("onCameraChanged: ", device);
});
onMicrophoneChanged((device) => {
console.log("onMicrophoneChanged: ", device);
});
