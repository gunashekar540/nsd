const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cassandra = require('cassandra-driver');

const app = express();
const port = 3000;
let loggedInUsername = null;

// Cassandra setup
const client = new cassandra.Client({
  contactPoints: ['localhost'],
  localDataCenter: 'datacenter1',
  keyspace: 'guna'
});

client.connect((err) => {
  if (err) {
    console.error('Error connecting to Cassandra', err);
  } else {
    console.log('Connected to Cassandra');
  }
});

// Express middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Function to get the currently logged-in username
const getCurrentLoggedInUsername = () => {
  return loggedInUsername;
};

// Function to set the currently logged-in username
const setLoggedInUsername = (username) => {
  loggedInUsername = username;
};

// Routes
app.post('/register', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const query = 'INSERT INTO sample.users (username, password) VALUES (?, ?)';
  client.execute(query, [username, password], { prepare: true }, (err) => {
    if (err) {
      console.error('Error registering user:', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Redirect to the dashboard upon successful registration
      res.redirect('/dashboard');
    }
  });
});

app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const query = 'SELECT * FROM sample.users WHERE username = ?';
  client.execute(query, [username], { prepare: true }, (err, result) => {
    if (err) {
      console.error('Error during login:', err);
      res.status(500).send('Internal Server Error');
    } else {
      if (result.rows.length === 0) {
        res.status(401).send('User not found');
      } else {
        const user = result.rows[0];
        if (user.password === password) {
          // Set the logged-in username
          setLoggedInUsername(username);
          // Redirect to the dashboard with the username as a query parameter
          res.redirect(`/dashboard?username=${encodeURIComponent(username)}`);
        } else {
          res.status(401).send('Incorrect password');
        }
      }
    }
  });
});

app.get('/dashboard', (req, res) => {
  // Retrieve the username from the query parameters
  const username = req.query.username;

  // Serve the dashboard.html file with the username
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/get-username', (req, res) => {
  // Retrieve the username from the global variable
  const loggedInUsername = getCurrentLoggedInUsername();

  if (loggedInUsername) {
    res.status(200).send(loggedInUsername);
  } else {
    res.status(401).send('User not logged in');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
