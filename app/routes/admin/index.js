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
app.use('/commodities', require('./admin.comidity.js'));
app.use('/mandis', require('./mandies.routes.js'));
app.use("/category",require('./admin.category.routes.js'))

module.exports = app;