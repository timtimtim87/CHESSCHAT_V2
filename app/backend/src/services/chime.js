import {
  ChimeSDKMeetingsClient,
  CreateAttendeeCommand,
  CreateMeetingCommand,
  DeleteMeetingCommand
} from "@aws-sdk/client-chime-sdk-meetings";
import { config } from "../config.js";

const chime = new ChimeSDKMeetingsClient({ region: config.chime.region });

export async function createMeeting(roomCode) {
  const response = await chime.send(
    new CreateMeetingCommand({
      ClientRequestToken: roomCode,
      ExternalMeetingId: roomCode,
      MediaRegion: config.chime.region
    })
  );
  return response.Meeting;
}

export async function createAttendee(meetingId, userId) {
  const response = await chime.send(
    new CreateAttendeeCommand({
      MeetingId: meetingId,
      ExternalUserId: userId.slice(0, 64)
    })
  );
  return response.Attendee;
}

export async function deleteMeeting(meetingId) {
  await chime.send(new DeleteMeetingCommand({ MeetingId: meetingId }));
}
