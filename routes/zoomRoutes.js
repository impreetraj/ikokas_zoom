const express = require('express');
const {
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
  zoomAuth,
  zoomCallback,
} = require('../controllers/zoomController');

const router = express.Router();


router.get('/auth', zoomAuth);
router.get('/callback', zoomCallback);

router.post('/meetings', createMeeting);


router.get('/meetings', listMeetings);


router.get('/meetings/:id', getMeetingDetails);


router.put('/meetings/:id', updateMeeting);


router.delete('/meetings/:id', deleteMeeting);

module.exports = router;
