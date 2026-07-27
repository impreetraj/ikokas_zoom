const express = require('express');
const {
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/zoomController');

const router = express.Router();


router.post('/meetings', createMeeting);


router.get('/meetings', listMeetings);


router.get('/meetings/:id', getMeetingDetails);


router.put('/meetings/:id', updateMeeting);


router.delete('/meetings/:id', deleteMeeting);

module.exports = router;
