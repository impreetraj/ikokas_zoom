const express = require('express');
const {
  createMeeting,
  getMeetingDetails,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} = require('../controllers/zoomController');

const router = express.Router();

router.route('/meetings')
  .post(createMeeting)
  .get(listMeetings);

router.route('/meetings/:id')
  .get(getMeetingDetails)
  .put(updateMeeting)
  .delete(deleteMeeting);

module.exports = router;
