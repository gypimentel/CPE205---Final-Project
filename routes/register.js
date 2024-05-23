const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('../database');

// Handle GET request for registration page
router.get('/', (req, res) => {
  res.render('register');
});

// Handle POST request for registration
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await database.createUser(username, hashedPassword);

    // Redirect the user to the login page after successful registration
    res.redirect('/login');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user');
  }
});

module.exports = router;
