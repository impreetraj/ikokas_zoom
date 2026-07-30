const axios = require('axios');
const User = require('../models/User');

class ZoomService {
  constructor() {
    this.clientId = process.env.ZOOM_CLIENT_ID;
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET;
    this.zoomOauthUrl = 'https://zoom.us/oauth/token';
    this.zoomApiUrl = 'https://api.zoom.us/v2';
  }

  async getTokensFromCode(code) {
    const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const redirectUri = process.env.ZOOM_REDIRECT_URI || 'http://localhost:5000/api/zoom/callback';

    try {
      const response = await axios.post(
        this.zoomOauthUrl,
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
          },
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching Zoom Tokens from code:', error.response ? error.response.data : error.message);
      throw new Error('Failed to obtain Zoom tokens from code');
    }
  }

  async refreshUserToken(user) {
    const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await axios.post(
        this.zoomOauthUrl,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: user.zoomRefreshToken,
          },
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      user.zoomAccessToken = response.data.access_token;
      user.zoomRefreshToken = response.data.refresh_token;
      user.zoomTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      await user.save();
      
      return user.zoomAccessToken;
    } catch (error) {
      console.error('Error refreshing token:', error.response ? error.response.data : error.message);
      throw new Error('Failed to refresh Zoom token. User needs to re-authenticate.');
    }
  }

  async getValidUserToken(userId) {
    if (!userId || userId === 'default_user') {
       throw new Error('userId is required to interact with Zoom on behalf of a user');
    }

    const user = await User.findById(userId);
    if (!user || !user.zoomAccessToken) {
      throw new Error('User has not connected their Zoom account');
    }
    
    // Check if token is expired (giving a 1-minute buffer)
    const now = new Date();
    const expiry = new Date(user.zoomTokenExpiresAt);
    expiry.setMinutes(expiry.getMinutes() - 1);

    if (now >= expiry) {
      return await this.refreshUserToken(user);
    }
    
    return user.zoomAccessToken;
  }

  async createMeeting(userId, meetingData) {
    const accessToken = await this.getValidUserToken(userId);
    try {
      const response = await axios.post(
        `${this.zoomApiUrl}/users/me/meetings`,
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

  async getMeeting(userId, meetingId) {
    const accessToken = await this.getValidUserToken(userId);
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

  async listMeetings(userId) {
    const accessToken = await this.getValidUserToken(userId);
    try {
      const response = await axios.get(
        `${this.zoomApiUrl}/users/me/meetings`,
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

  async updateMeeting(userId, meetingId, updateData) {
    const accessToken = await this.getValidUserToken(userId);
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

  async deleteMeeting(userId, meetingId) {
    const accessToken = await this.getValidUserToken(userId);
    try {
      await axios.delete(
        `${this.zoomApiUrl}/meetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return true;
    } catch (error) {
      console.error('Error deleting Zoom meeting:', error.response ? error.response.data : error.message);
      throw new Error('Failed to delete Zoom meeting');
    }
  }
}

module.exports = new ZoomService();
