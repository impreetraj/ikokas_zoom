const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const user = await User.findOne();
    if (user) {
      console.log('====================================================');
      console.log('PLEASE COPY AND PASTE THIS EXACT URL IN YOUR BROWSER:');
      console.log(`http://localhost:5000/api/zoom/auth?userId=${user._id}`);
      console.log('====================================================');
    } else {
      console.log('No users found in the database. Please sign up a user first.');
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
