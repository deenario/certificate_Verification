require('dotenv').config();
const express = require("express");
const path = require('path');
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./routes/auth");

const app = express();
app.use("/certificates", express.static(path.join(__dirname, 'public/certificates')));
app.use("/", express.static(path.join('/home/deenario/certificate_Verification/webPortal')));

// Body Parser Middleware
app.use(bodyParser.json({limit:'100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(cors());

app.use('/api/auth' , authRoutes);
app.get('/',function(req,res){
    res.sendFile(path.join("/home/deenario/certificate_Verification/webPortal/login.html"));
});

module.exports = app;
