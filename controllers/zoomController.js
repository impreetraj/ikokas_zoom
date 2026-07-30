const zoomService = require('../services/zoomService');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

// Helper function to get valid token
const getValidAccessToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.zoomRefreshToken) {
    throw new Error('User has not connected their Zoom account');
  }

  // Check if token is expired (adding 5 min buffer)
  if (user.zoomTokenExpiry && new Date(Date.now() + 5 * 60 * 1000) > user.zoomTokenExpiry) {
    const tokens = await zoomService.refreshToken(user.zoomRefreshToken);
    user.zoomAccessToken = tokens.access_token;
    user.zoomRefreshToken = tokens.refresh_token;
    user.zoomTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    await user.save();
  }

  return user.zoomAccessToken;
};

const zoomAuth = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const redirectUri = encodeURIComponent(process.env.ZOOM_REDIRECT_URI);
    const clientId = process.env.ZOOM_CLIENT_ID;
    
    // Pass userId in state so we know who logged in during callback
    const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${userId}`;
    
    res.redirect(zoomAuthUrl);
  } catch (error) {
    next(error);
  }
};

const zoomCallback = async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;
    if (!code) return res.status(400).json({ message: 'Authorization code is missing' });
    if (!userId) return res.status(400).json({ message: 'User ID state is missing' });

    const tokens = await zoomService.exchangeToken(code);
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.zoomAccessToken = tokens.access_token;
    user.zoomRefreshToken = tokens.refresh_token;
    user.zoomTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    await user.save();

    res.json({ message: 'Zoom account connected successfully. You can close this window and return to the app.' });
  } catch (error) {
    next(error);
  }
};

const createMeeting = async (req, res, next) => {
  try {
    const { topic, type, duration, start_time, timezone, userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    
    const accessToken = await getValidAccessToken(userId);

    const meetingData = {
      topic,
      type: type || 2, 
      duration,
      start_time,
      timezone,
      settings: {
        join_before_host: true,
        jbh_time: 0,
        waiting_room: false
      }
    };

    const zoomResponse = await zoomService.createMeeting(accessToken, meetingData);
    
    const meeting = await Meeting.create({
      user: userId,
      zoomMeetingId: zoomResponse.id,
      topic: zoomResponse.topic,
      joinUrl: zoomResponse.join_url,
      startUrl: zoomResponse.start_url,
      startTime: zoomResponse.start_time,
      duration: zoomResponse.duration,
      password: zoomResponse.password,
    });

    res.status(201).json(meeting);
  } catch (error) {
    next(error);
  }
};

const getMeetingDetails = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const accessToken = await getValidAccessToken(userId);
    const meeting = await zoomService.getMeeting(accessToken, meetingId);
    res.json(meeting);
  } catch (error) {
    next(error);
  }
};

const listMeetings = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    
    // Instead of querying Zoom, we query our own DB. But if we need Zoom's data, we could fetch it.
    // For now, listing meetings from DB based on userId.
    const query = { user: userId };
    const meetings = await Meeting.find(query).sort({ createdAt: -1 });
    res.json(meetings);
  } catch (error) {
    next(error);
  }
};

const updateMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { userId, ...updateData } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const accessToken = await getValidAccessToken(userId);
    
    await zoomService.updateMeeting(accessToken, meetingId, updateData);
    
    if (updateData.topic) {
      await Meeting.findOneAndUpdate({ zoomMeetingId: meetingId }, { topic: updateData.topic });
    }

    res.json({ message: 'Meeting updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required (passed as query param)' });

    const accessToken = await getValidAccessToken(userId);
    
    await zoomService.deleteMeeting(accessToken, meetingId);

    await Meeting.findOneAndDelete({ zoomMeetingId: meetingId });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  zoomAuth,
  zoomCallback,
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
};
