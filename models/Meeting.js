const mongoose = require('mongoose');

const meetingSchema = mongoose.Schema(
  {
    user: {
      type: String,
      required: true,
    },
    zoomMeetingId: {
      type: String,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    joinUrl: {
      type: String,
    },
    startUrl: {
      type: String,
    },
    startTime: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    password: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
