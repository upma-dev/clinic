/**
 * MeetingService.ts
 * 
 * Generates video meeting links. Defaults to Jitsi Meet for instant, keyless telemedicine rooms.
 */

export class MeetingService {
  /**
   * Generates a new meeting for a given appointment.
   * @param appointmentId Unique ID of the appointment
   * @param patientName Name of the patient
   * @returns Meeting details object
   */
  static generateMeeting(appointmentId: string, patientName: string) {
    // Sanitize string for URL
    const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, '');
    const roomName = `SkinHub-Consult-${sanitizedName}-${appointmentId.substring(0, 8)}`;
    
    // Jitsi meet URL format
    const meetingUrl = `https://meet.jit.si/${roomName}`;

    return {
      provider: 'Jitsi',
      roomId: roomName,
      meetingUrl: meetingUrl,
      password: '', // Jitsi doesn't strictly need one unless set by host, we leave empty for simplicity
    };
  }
}
