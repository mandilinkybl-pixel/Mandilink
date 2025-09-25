const express = require("express");
const app =express.Router()

app.use('/',require('./auth'))
app.use("/fillter",require("./filter"))
app.use("/job",require("./job"))
app.use("/blog",require("./blog"))
app.use("/ad",require("./ad"))
app.use("/bid",require("./bid"))
app.use("/bot",require("./bot"))
app.use("/applyjob",require("./jobs"))
app.use("/plans",require("./plans"))
app.use("/mandirates",require("./mandirate"))
app.use("/mandis",require("./mandi"))
app.use('/categories',require("./categories"))
app.use("/users",require("./categorywise"))

module.exports = app;




