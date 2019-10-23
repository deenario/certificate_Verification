const mysql = require('mysql');

const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATBASE
});
exports.con = con;

exports.executeQuery = function (res, msg, query, isSingle = false) {
    con.query(query, function (err, result) {
        if (err) {
            const response = {'status_code': 500, 'error': err};
            console.log(response);
            res.status(500).json(response);
        } else if (msg === "") {
            let data = {'base_url': process.env.BASE_URL, 'files': result};
            if (isSingle) {
                const rs = (result.length > 0) ? result[0] : {};
                data = {'base_url': process.env.BASE_URL, 'file': rs};
            }

            const response = {'status_code': 200, 'data': data};
            console.log(response);
            res.status(200).json(response);
        } else {
            const response = {'status_code': 200, 'message': msg};
            console.log(response);
            res.status(200).json(response);
        }
    });
};
