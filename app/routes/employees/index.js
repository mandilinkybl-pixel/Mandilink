const express = require('express');
const app = express.Router();


app.use('/', require('./pages.routes'));
app.use('/auth', require('./authemployee'));
app.use('/jobs', require('./jobs.routes'));
app.use('/ads', require('./ad.routes'));
app.use('/blogs', require('./blog.routes'));
app.use('/mandis', require('./mandi.routes'));
app.use('/commodities', require('./comidities.routes'));


module.exports = app;