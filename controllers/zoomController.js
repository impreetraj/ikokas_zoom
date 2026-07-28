const zoomService = require('../services/zoomService');
const Meeting = require('../models/Meeting');


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

    const zoomResponse = await zoomService.createMeeting(userId || 'default_user', meetingData);
    
  
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
    const meeting = await zoomService.getMeeting(meetingId);
    res.json(meeting);
  } catch (error) {
    next(error);
  }
};


const listMeetings = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const query = {};
    if (userId) {
      query.user = userId;
    }
    
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
    
    await zoomService.updateMeeting(meetingId, updateData);
    
 
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
    
    await zoomService.deleteMeeting(meetingId);

    await Meeting.findOneAndDelete({ zoomMeetingId: meetingId });

    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
};
