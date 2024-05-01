const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const app = express();
const port = 3000;
const jwt = require('jsonwebtoken');
const jwtSecret = 'your_jwt_secret';  // Keep this secret and secure

// Mock database storage for simplicity
let users = [];
let books = [];
let nextUserId = 1;
let nextBookId = 1;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'very secret secret',
    resave: false,
    saveUninitialized: false
}));
app.set('view engine', 'ejs');

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    function(username, password, done) {
        const user = users.find(u => u.username === username);
        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }
        if (!bcrypt.compareSync(password, user.password)) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        console.log(user)
        return done(null, user);
    }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = users.find(u => u.id === id);
    if (!user) {
        return done(new Error('user not found'));
    }
    done(null, user);
});
app.get("/", (req, res) => {
    try {
        if (req.isAuthenticated()) {
            const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
            const userBooks = books.filter(book => book.userId === req.user.id);
            res.render('bookshelf', { user: req.user, token, books: userBooks });
        } else {
            res.render('index');
        }
    } catch (err) {
        console.error('Error in root route:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Route to render the registration page
app.get('/register', (req, res) => {
    res.render('register');
});

// Registration endpoint
// app.post('/register', (req, res) => {
//     const { username, password } = req.body;
//     if (users.some(u => u.username === username)) {
//         return res.status(400).json({ error: 'Username already exists' });
//     }
//     const hashedPassword = bcrypt.hashSync(password, 10);
//     const user = { id: nextUserId++, username, password: hashedPassword };
//     users.push(user);
//     res.json({ message: 'User registered' });
// });

// app.post('/register', (req, res) => {
//     const { username, password } = req.body;
//     if (users.some(u => u.username === username)) {
//         return res.status(400).json({ error: 'Username already exists' });
//     }
//     const hashedPassword = bcrypt.hashSync(password, 10);
//     const user = { id: nextUserId++, username, password: hashedPassword };
//     users.push(user);
//     res.redirect('/'); // Redirect to the homepage after successful registration
// });

// Route to render the login page
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = { id: nextUserId++, username, password: hashedPassword };
    users.push(user);
    res.redirect('/login'); // Redirect to the login page after successful registration
});

// Login endpoint
// app.post('/login', passport.authenticate('local'), (req, res) => {
//     console.log(req.user)
//     const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
//     res.json({ message: 'Logged in', token });
// });

// app.post('/login', passport.authenticate('local'), (req, res) => {
//     console.log(req.user)
//     const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
//     res.json({ message: 'Logged in', token });
// });

// app.post('/login', passport.authenticate('local'), (req, res) => {
//     console.log(req.user);
//     const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
//     const userBooks = books.filter(book => book.userId === req.user.id);
//     req.session.token = token; // Store the token in the session
//     console.log('before redirect');
//     res.redirect('/bookshelf'); // Redirect to the bookshelf page
//     console.log('after redirect');
// });

app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }), (req, res) => {
    console.log(req.user);
    const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
    const userBooks = books.filter(book => book.userId === req.user.id);
    req.session.token = token; // Store the token in the session
    res.redirect('/bookshelf'); // Redirect to the bookshelf page
});

// Bookshelf route
// app.get('/bookshelf', isAuthenticated, (req, res) => {
//     const userBooks = books.filter(book => book.userId === req.user.id);
//     res.render('bookshelf', { user: req.user, books: userBooks, token: req.session.token });
// });

app.get('/bookshelf', isAuthenticated, (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const userBooks = books.filter(book => book.userId === req.user.id);
    console.log(userBooks);
    res.render('bookshelf', { user: req.user, books: userBooks, booksJSON: JSON.stringify(userBooks), token: req.session.token }); //issues not working together w bookshelf.ejs line 67&82
});

// Logout endpoint
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        // Set the logoutSuccess flag in the session
        req.session.logoutSuccess = true;
        // Redirect to the homepage after successful logout
        res.redirect('/');
    });
});

// Root route handler
app.get("/", (req, res) => {
    try {
        const logoutSuccess = req.session.logoutSuccess || false; // Get the logoutSuccess flag from the session
        if (req.isAuthenticated()) {
            const token = jwt.sign({ id: req.user.id }, jwtSecret, { expiresIn: '1h' });
            const userBooks = books.filter(book => book.userId === req.user.id);
            res.render('bookshelf', { user: req.user, token, books: userBooks });
        } else {
            res.render('index', { logoutSuccess }); // Pass the logoutSuccess flag to the index view
        }
        // Clear the logoutSuccess flag from the session after rendering the view
        req.session.logoutSuccess = false;
    } catch (err) {
        console.error('Error in root route:', err);
        res.status(500).send('Internal Server Error');
    }
});

// Middleware to check if user is authenticated
// function isAuthenticated(req, res, next) {
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];
//     console.log(token);
//     if (token == null) return res.status(401).send({ error: 'Unauthorized' });

//     jwt.verify(token, jwtSecret, (err, user) => {
//         if (err) return res.status(403).send({ error: 'Forbidden' });
//         req.user = user;
//         next();
//     });
// }
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// Define a protected route
app.get('/protected-route', isAuthenticated, (req, res) => {
    res.json({ message: 'You have accessed a protected area', user: req.user });
});

// Books endpoint: Get all books for logged-in user
app.get('/books', isAuthenticated, (req, res) => {
    const userBooks = books.filter(book => book.userId === req.user.id);
    res.json(userBooks);
});

// Books endpoint: Add a new book for logged-in user
app.post('/books', isAuthenticated, (req, res) => {
    const book = { id: nextBookId++, userId: req.user.id, title: req.body.title, author: req.body.author, genre: req.body.genre };
    books.push(book);
    res.json(book);
});

app.put('/books/:id', isAuthenticated, (req, res) => {
    const index = books.findIndex(book => book.id == req.params.id);
    if (index >= 0) {
      books[index] = { ...books[index], ...req.body };
      res.send(books[index]);
    } else {
      res.status(404).send({ message: 'Book not found' });
    }
  });

app.delete('/books/:id', isAuthenticated, (req, res) => {
    const index = books.findIndex(book => book.id == req.params.id);
    if (index >= 0) {
      books.splice(index, 1);
      res.send({ message: 'Book deleted' });
    } else {
      res.status(404).send({ message: 'Book not found' });
    }
  });

// // Start the server
// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// }).on('error', (err) => {
//     console.error('Server error:', err);
// });

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
}).on('error', (err) => {
    console.error('Server error:', err);
});