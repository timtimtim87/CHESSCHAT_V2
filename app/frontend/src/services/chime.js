import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration
} from "amazon-chime-sdk-js";

function normalizeMeeting(meetingData) {
  if (!meetingData) {
    throw new Error("Missing meeting data.");
  }
  const mediaPlacement = meetingData.MediaPlacement || meetingData.mediaPlacement;
  return {
    MeetingId: meetingData.MeetingId || meetingData.meetingId,
    ExternalMeetingId: meetingData.ExternalMeetingId || meetingData.externalMeetingId,
    MediaRegion: meetingData.MediaRegion || meetingData.mediaRegion,
    MediaPlacement: {
      AudioHostUrl: mediaPlacement?.AudioHostUrl || mediaPlacement?.audioHostUrl,
      AudioFallbackUrl: mediaPlacement?.AudioFallbackUrl || mediaPlacement?.audioFallbackUrl,
      SignalingUrl: mediaPlacement?.SignalingUrl || mediaPlacement?.signalingUrl,
      TurnControlUrl: mediaPlacement?.TurnControlUrl || mediaPlacement?.turnControlUrl,
      EventIngestionUrl: mediaPlacement?.EventIngestionUrl || mediaPlacement?.eventIngestionUrl
    }
  };
}

function normalizeAttendee(attendeeData) {
  if (!attendeeData) {
    throw new Error("Missing attendee data.");
  }
  return {
    AttendeeId: attendeeData.AttendeeId || attendeeData.attendeeId,
    ExternalUserId: attendeeData.ExternalUserId || attendeeData.externalUserId,
    JoinToken: attendeeData.JoinToken || attendeeData.joinToken
  };
}

export function createMeetingSession({ meetingData, attendeeData, loggerLevel = LogLevel.WARN }) {
  const logger = new ConsoleLogger("chime", loggerLevel);
  const deviceController = new DefaultDeviceController(logger);
  const configuration = new MeetingSessionConfiguration(
    normalizeMeeting(meetingData),
    normalizeAttendee(attendeeData)
  );
  return new DefaultMeetingSession(configuration, logger, deviceController);
}

export async function listDevices(audioVideo) {
  const [audioInputs, videoInputs] = await Promise.all([
    audioVideo.listAudioInputDevices(),
    audioVideo.listVideoInputDevices()
  ]);
  return { audioInputs, videoInputs };
}

export async function startMedia(audioVideo, { audioInputDeviceId, videoInputDeviceId } = {}) {
  if (audioInputDeviceId) {
    if (typeof audioVideo.chooseAudioInputDevice === "function") {
      await audioVideo.chooseAudioInputDevice(audioInputDeviceId);
    } else if (typeof audioVideo.startAudioInput === "function") {
      await audioVideo.startAudioInput(audioInputDeviceId);
    } else {
      throw new Error("Audio input selection is not supported by this browser/runtime.");
    }
  }
  if (videoInputDeviceId) {
    if (typeof audioVideo.chooseVideoInputDevice === "function") {
      await audioVideo.chooseVideoInputDevice(videoInputDeviceId);
    } else if (typeof audioVideo.startVideoInput === "function") {
      await audioVideo.startVideoInput(videoInputDeviceId);
    } else {
      throw new Error("Video input selection is not supported by this browser/runtime.");
    }
  }
  audioVideo.start();
  if (videoInputDeviceId) {
    audioVideo.startLocalVideoTile();
  }
}

export function stopMedia(audioVideo) {
  if (!audioVideo) {
    return;
  }
  audioVideo.stopLocalVideoTile();
  audioVideo.stop();
}
