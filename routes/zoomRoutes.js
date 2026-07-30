const express = require('express');
const {
  zoomAuth,
  zoomCallback,
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/zoomController');

const router = express.Router();

// OAuth Routes
router.get('/auth', zoomAuth);
router.get('/callback', zoomCallback);

router.post('/meetings', createMeeting);


router.get('/meetings', listMeetings);


router.get('/meetings/:id', getMeetingDetails);


router.put('/meetings/:id', updateMeeting);


router.delete('/meetings/:id', deleteMeeting);

module.exports = router;
