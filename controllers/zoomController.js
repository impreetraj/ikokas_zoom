const zoomService = require('../services/zoomService');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

const zoomAuth = (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).send('userId is required in query params');
  }

  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = process.env.ZOOM_REDIRECT_URI || 'http://localhost:5000/api/zoom/callback';

  const zoomOauthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${userId}`;

  res.redirect(zoomOauthUrl);
};

const zoomCallback = async (req, res, next) => {
  const { code, state } = req.query;
  const userId = state;

  if (!code || !userId) {
    return res.status(400).send('Authorization code and state (userId) are required');
  }

  try {
    const tokens = await zoomService.getTokensFromCode(code);
    
    // Save to user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.zoomAccessToken = tokens.access_token;
    user.zoomRefreshToken = tokens.refresh_token;
    
    // Calculate expiry (expires_in is in seconds)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    user.zoomTokenExpiresAt = expiresAt;

    await user.save();

    res.send(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f2f5; margin: 0; }
            .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h2 { color: #0b5cff; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Zoom Connected Successfully!</h2>
            <p>You can now close this window and return to the app.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in zoom callback:', error);
    res.status(500).send('Failed to authenticate with Zoom');
  }
};

const createMeeting = async (req, res, next) => {
  try {
    const { topic, type, duration, start_time, timezone, userId } = req.body;
    
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

    const zoomResponse = await zoomService.createMeeting(userId, meetingData);
    
  
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
    const meetingDb = await Meeting.findOne({ zoomMeetingId: meetingId });
    if (!meetingDb) return res.status(404).json({ message: 'Meeting not found in DB' });
    const userId = meetingDb.user;

    const meeting = await zoomService.getMeeting(userId, meetingId);
    res.json(meeting);
  } catch (error) {
    next(error);
  }
};


const listMeetings = async (req, res, next) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    
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
    const updateData = req.body;
    
    const meetingDb = await Meeting.findOne({ zoomMeetingId: meetingId });
    if (!meetingDb) return res.status(404).json({ message: 'Meeting not found in DB' });
    const userId = meetingDb.user;

    await zoomService.updateMeeting(userId, meetingId, updateData);
    
 
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
    
    const meetingDb = await Meeting.findOne({ zoomMeetingId: meetingId });
    if (!meetingDb) return res.status(404).json({ message: 'Meeting not found in DB' });
    const userId = meetingDb.user;

    await zoomService.deleteMeeting(userId, meetingId);

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
