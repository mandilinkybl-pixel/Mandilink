const express = require("express");
const app =express.Router()

app.use('/',require('./auth'))
app.use("/fillter",require("./filter"))


module.exports = app;
