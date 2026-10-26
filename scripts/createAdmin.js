// Creates an admin account, or promotes an existing user to admin.
// Usage: npm run create-admin -- <email> <password> "<name>"
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const [email, password, name = 'Administrator'] = process.argv.slice(2);

if (!email || !password || password.length < 8) {
  console.error('Usage: npm run create-admin -- <email> <password (min. 8 characters)> "<name>"');
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { name, email: email.toLowerCase(), password: hashedPassword, role: 'admin' },
    { upsert: true, new: true }
  );
  console.log(`Admin account ready: ${user.email}`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
