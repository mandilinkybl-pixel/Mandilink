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
// setupNotifications.js
const autoNotify = require("./app/utills/notification.js");
const Bid = require("./app/models/bidpost.js");
const Job = require("./app/models/job.js");
const Mandi = require("./app/models/mandilistmodel.js");
const MandiRate = require("./app/models/dealymandiRateuapdate.js");
const Listing = require("./app/models/lisingSchema.js");
const Company = require("./app/models/companylisting.js");
const BlogPost = require("./app/models/bidpost.js");
const Commodity = require("./app/models/commodityname.js");
const PurchasePlan = require("./app/models/purchase.js");



// Attach auto-notification hooks
[Bid, Job, Mandi, MandiRate, Listing, Company, BlogPost, Commodity, PurchasePlan].forEach(autoNotify);

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
