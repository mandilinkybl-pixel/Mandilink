const express = require("express");
const app =express.Router()

app.use('/',require('./auth'))
app.use("/fillter",require("./filter"))
app.use("/job",require("./job"))
app.use("/blog",require("./blog"))
app.use("/ad",require("./ad"))
app.use("/bid",require("./bid"))
app.use("/bot",require("./bot"))


module.exports = app;
