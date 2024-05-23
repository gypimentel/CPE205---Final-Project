const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // Ensure bcrypt is imported
const database = require('../database');

router.use(bodyParser.urlencoded({ extended: true }));

// Handle GET request for login page
router.get('/', (req, res) => {
  res.render('login', { error: null }); // Initialize with null error
});

// Handle POST request for login
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Fetch user from the database by username
    const user = await database.findUserByUsername(username);

    // Check if user exists
    if (!user) {
      return res.render('login', { error: 'User not found' });
    }

    // Compare the plain text password with the hashed password
    const isValid = await bcrypt.compare(password, user.password);

    if (isValid) {
      // Redirect the user to the root path
      return res.redirect('/');
    } else {
      // Authentication failed
      return res.render('login', { error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).send('Error during login: ' + error.message);
  }
});

module.exports = router;
