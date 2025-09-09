const express = require('express');
const app = express.Router();


app.use('/', require('./pages.routes'));
app.use('/auth', require('./authemployee'));
app.use('/jobs', require('./jobs.routes'));
app.use('/ads', require('./ad.routes'));
app.use('/blogs', require('./blog.routes'));
// app.use('/mandis', require('./mandi.routes'));
// app.use('/commodities', require('./comidities.routes'));
app.use('/commodities', require('./commodities'));
app.use('/mandirates', require('./mandirates'));
app.use('/companylist', require('./company.js'));
app.use('/mandis', require('./mandi.js'));
app.use("/category",require('./category.routes.js'))
app.use('/mandirate', require('./mandirates.js'));
app.use('/userlist', require('./listing.js'));



module.exports = app;