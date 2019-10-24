require('dotenv').config();
const app = require("./app");
const database = require("./utils");
const fs = require('fs');
const http = require('http');

const port = process.env.PORT || 8000;

app.set('port', port);
const httpServer = http.createServer(app);

httpServer.listen(port, () => {
	console.log('HTTPS Server running on port ', process.env.PORT);
});


database.con.connect(function (err) {
    if (err) {
        console.log("Error while connecting database :- " + err);
    } else {
        console.log("Database Connected");
    }
});
