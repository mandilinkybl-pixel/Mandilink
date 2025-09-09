const express = require('express');

const app = express.Router();



app

app.use('/', require('./pages.routes.js'));
app.use('/employees', require('./secureemployee.js'));
app.use('/blogs', require('./blog.routes.js'));

app.use('/auth', require('./auth.routes.js'));
// app.use('/roles', require('./role.routes.js'));
app.use('/subroles', require('./subroles.js'));

app.use('/jobs', require('./adminjobs.js'));
app.use('/ads', require('./adminAds.js'));
app.use('/plans', require('./plan.routes.js'));
app.use('/commodities', require('./commodity.js'));
app.use('/mandis', require('./mandi.routes.js'));
app.use("/category",require('./category.routes.js'))
app.use('/state', require('./state.routes.js'));
app.use('/companylist', require('./company.js'));
app.use('/mandirate', require('./mandirate.js'));
app.use('/userlist', require('./listing.js'));

module.exports = app;