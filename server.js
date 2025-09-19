const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require("express-session");
const flash = require("connect-flash");
const cookieParser = require('cookie-parser'); // ✅ Add this
const ConnectDB = require('./app/config/db');


require('dotenv').config();

const app = express();
ConnectDB();

// Middlewares
app.use(
  session({
    secret: "yoursecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(flash());

  // Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  next();
});
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // ✅ Must come before routes
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/admin', require('./app/routes/admin/index.js'));
app.use('/employees', require('./app/routes/employees/index.js'));
app.use('/api',require('./app/routes/api/index.js'))

// Server start
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${process.env.DATABASE_URL || 'MANDILINK'}`);
});
