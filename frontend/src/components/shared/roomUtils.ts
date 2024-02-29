import type {
    ICameraVideoTrack,
    IMicrophoneAudioTrack,
    IAgoraRTCClient,
    IAgoraRTCRemoteUser,
  } from "agora-rtc-sdk-ng/esm";
import {
    VERSION,
    createClient,
    createCameraVideoTrack,
    createMicrophoneAudioTrack,
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
const client: IAgoraRTCClient = createClient({
mode: "rtc",
codec: "vp8",
});
let audioTrack: IMicrophoneAudioTrack;
let videoTrack: ICameraVideoTrack;