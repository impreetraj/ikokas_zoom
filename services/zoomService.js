const axios = require('axios');

class ZoomService {
  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID;
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.zoomOauthUrl = 'https://zoom.us/oauth/token';
    this.zoomApiUrl = 'https://api.zoom.us/v2';
  }

  async getAccessToken() {
    const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await axios.post(
        this.zoomOauthUrl,
        null,
        {
          params: {
            grant_type: 'account_credentials',
            account_id: this.accountId,
          },
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      return response.data.access_token;
    } catch (error) {
      console.error('Error fetching Zoom Access Token:', error.response ? error.response.data : error.message);
      throw new Error('Failed to obtain Zoom access token');
    }
  }

  async createMeeting(userId, meetingData) {
    const accessToken = await this.getAccessToken();
    try {
      const zoomUserEmail = process.env.ZOOM_USER_EMAIL;
      if (!zoomUserEmail) throw new Error('ZOOM_USER_EMAIL is not defined in .env');

      const response = await axios.post(
        `${this.zoomApiUrl}/users/${zoomUserEmail}/meetings`,
        meetingData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error.response ? error.response.data : error.message);
      throw new Error('Failed to create Zoom meeting');
    }
  }

  async getMeeting(meetingId) {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios.get(
        `${this.zoomApiUrl}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching Zoom meeting:', error.response ? error.response.data : error.message);
      throw new Error('Failed to fetch Zoom meeting');
    }
  }

  async listMeetings() {
    const accessToken = await this.getAccessToken();
    try {
      const zoomUserEmail = process.env.ZOOM_USER_EMAIL;
      if (!zoomUserEmail) throw new Error('ZOOM_USER_EMAIL is not defined in .env');

      const response = await axios.get(
        `${this.zoomApiUrl}/users/${zoomUserEmail}/meetings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error listing Zoom meetings:', error.response ? error.response.data : error.message);
      throw new Error('Failed to list Zoom meetings');
    }
  }

  async updateMeeting(meetingId, updateData) {
    const accessToken = await this.getAccessToken();
    try {
      await axios.patch(
        `${this.zoomApiUrl}/meetings/${meetingId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true; 
    } catch (error) {
      console.error('Error updating Zoom meeting:', error.response ? error.response.data : error.message);
      throw new Error('Failed to update Zoom meeting');
    }
  }

  async deleteMeeting(meetingId) {
    const accessToken = await this.getAccessToken();
    try {
      await axios.delete(
        `${this.zoomApiUrl}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return true; //
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error.response ? error.response.data : error.message);
      throw new Error('Failed to delete Zoom meeting');
    }
  }
}

module.exports = new ZoomService();
