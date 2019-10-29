require('dotenv').config();
const imageThumbnail = require('image-thumbnail');
const {imageHash} = require('image-hash');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const database = require("../utils");
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const invokeBlockchain = require("../blockchain/invokeNetwork");
const queryBlockchain = require("../blockchain/queryNetwork");
const mime = require('mime-types');

let readHTMLFile = function (path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        } else {
            callback(null, html);
        }
    });
};

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    auth: {
        user: "blockchain.certification.lk@gmail.com",
        pass: "Abc@1234"
    }
});

let now = new Date();
const date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

exports.register = async (req, res, next) => {
    try {
        console.log("Body", req.body);
        console.log("File", req.file);
        let createdAt = date;
        let email = req.body.email ? req.body.email : "";
        let password = req.body.password ? req.body.password : "";
        let userType = req.body.user_type;
        let hash = await bcrypt.hash(password.trim(), 10);

        let query = "select * from user where email='" + email + "' limit 1";
        database.con.query(query, function (err, resultQuery) {
            if (err) {
                const response = {'status_code': 500, 'error': err};
                res.status(500).json(response);
            } else {
                if (resultQuery.length <= 0) {

                    const query = "insert into user " +
                        "(email, password, status, user_type, reset_token, created_at ) " +
                        "values " + "('" + email + "','" + hash + "','active','" + userType + "','" + null + "','" + createdAt + "')";
                    database.executeQuery(res, "User Successfully Created", query);

                    readHTMLFile('/home/deenario/certificate_Verification/backend/email/registerUser.html', function (err, html) {
                        let template = handlebars.compile(html);
                        let replacements = {
                            email: email,
                            password: password
                        };
                        let htmlToSend = template(replacements);
                        let mailOptions = {
                            from: process.env.EMAIL,
                            to: email,
                            subject: 'User Registered',
                            html: htmlToSend

                        };
                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                console.log("Email Sent", info.response);
                            }
                        });
                    });

                } else {
                    res.status(500).json({
                        "status_code": 500,
                        "error": "Emails Already Exist"
                    });
                }
            }
        });
    } catch (e) {
        res.status(500).json({
            "status_code": 500,
            "error": "Internal server error" + e
        });
    }
};

exports.login = (req, res, next) => {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let is_mobile = true;
        let query = "";
        if (checkEmail(email)) {
            query = "select * from user where email='" + email + "' limit 1";
        } else {
            const response = {'status_code': 404, 'error': "Not a Valid Email Address"};
            res.status(404).json(response);
        }
        database.con.query(query, function (err, resultQuery) {
            if (err) {
                const response = {'status_code': 500, 'error': err};
                res.status(500).json(response);
            } else {
                if (resultQuery.length > 0) {
                    console.log(resultQuery);
                    bcrypt.compare(password.trim(), resultQuery[0].password.trim(), (err, resultBcrypt) => {
                        if (err) {
                            const response = {'status_code': 500, 'error': err};
                            res.status(500).json(response);
                        } else {
                            if (resultBcrypt) {
                                if (is_mobile) {
                                    jwt.sign({_uid: email}, process.env.JWTSECRET
                                        , (err, token) => {
                                            const user = {
                                                'id': resultQuery[0].id,
                                                'email': resultQuery[0].email,
                                                'user_type': resultQuery[0].user_type
                                            };
                                            let _token = {
                                                'value': token
                                            };
                                            const data = {
                                                'user': user,
                                                'token': _token
                                            };
                                            const response = {
                                                'status_code': 200,
                                                'message': "Successful Login",
                                                'data': data
                                            };
                                            res.status(200).json(response);
                                        });
                                } else {
                                    jwt.sign({_uid: email}, process.env.JWTSECRET, {expiresIn: '1h'}
                                        , (err, token) => {
                                            const user = {
                                                'id': resultQuery[0].id,
                                                'email': resultQuery[0].email,
                                                'user_type': resultQuery[0].user_type
                                            };
                                            let _token = {
                                                'value': token,
                                                'expiry': 3600
                                            };
                                            const data = {
                                                'user': user,
                                                'token': _token
                                            };
                                            const response = {
                                                'status_code': 200,
                                                'message': "Successful Login",
                                                'data': data
                                            };
                                            res.status(200).json(response);
                                        });
                                }
                            } else {
                                const response = {'status_code': 401, 'error': "Username/Password Incorrect"};
                                res.status(401).json(response);
                            }
                        }
                    });
                } else {
                    const response = {'status_code': 401, 'error': "Username/Password Incorrect"};
                    res.status(401).json(response);
                }
            }
        });
    } catch (e) {
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.resetRequest = async (req, res, next) => {
    let email = req.body.email;
    let query = "select * from user where email='" + email + "' limit 1";
    database.con.query(query, function (err, resultQuery) {
        if (err) {
            const response = {'status_code': 500, 'error': err};
            res.status(500).json(response);
        } else {
            if (resultQuery.length > 0) {
                jwt.sign({_uid: email}, process.env.JWTSECRET
                    , (err, token) => {
                        if (err) {
                            console.log(err);
                        } else {
                            const url = token;
                            let query = "update user set reset_token='" + token + "' where email='" + email + "' limit 1";
                            database.con.query(query, function (err, resultQuery) {
                                if (err) {
                                    const response = {'status_code': 500, 'error': err};
                                    res.status(500).json(response);
                                } else {

                                    readHTMLFile('/home/deenario/certificate_Verification/backend/email/passwordReset.html', function (err, html) {
                                        let template = handlebars.compile(html);
                                        let replacements = {
                                            url: url
                                        };
                                        let htmlToSend = template(replacements);
                                        let mailOptions = {
                                            from: "blockchain.certification.lk@gmail.com",
                                            to: email,
                                            subject: 'Password Reset',
                                            html: htmlToSend

                                        };
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                const response = {
                                                    'status_code': 200,
                                                    'message': "Password reset link sent successfully. Check your Email."
                                                };
                                                res.status(200).json(response);
                                            }
                                        });
                                    });

                                }
                            });
                        }
                    });
            } else {
                const response = {'status_code': 404, 'error': "Email is not Valid"};
                res.status(404).json(response);
            }
        }
    });
};

exports.resetPassword = async (req, res, next) => {
    let token = req.body.token;
    let password = req.body.password;
    let hash = await bcrypt.hash(password.trim(), 10);
    let query = "select * from user where reset_token='" + token + "' limit 1";
    database.con.query(query, function (err, resultQuery) {
        if (err) {
            const response = {'status_code': 500, 'error': err};
            res.status(500).json(response);
        } else {
            if (resultQuery.length > 0) {
                let query = "update user set password='" + hash + "' where reset_token='" + token + "' limit 1";
                database.con.query(query, function (err, resultQuery) {
                    if (err) {
                        const response = {'status_code': 500, 'error': err};
                        res.status(500).json(response);
                    } else {
                        let query = "update user set reset_token=null where reset_token='" + token + "' limit 1";
                        database.con.query(query, function (err, resultQuery) {
                            if (err) {
                                const response = {'status_code': 500, 'error': err};
                                res.status(500).json(response);
                            } else {
                                const response = {'status_code': 200, 'message': "Password Updated"};
                                res.status(200).json(response);
                            }
                        });
                    }
                });
            } else {
                const response = {'status_code': 401, 'error': "Invalid Token"};
                res.status(401).json(response);
            }
        }
    });
};

exports.getUniversityAdmins = async (req, res, next) => {
    try {
        console.log("Get Admins API called");
        console.log(req.body);
        const query = "select * from user where user_type = 'university' order by id desc";
        database.executeQuery(res, "", query);
    } catch (e) {
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.createUniversity = async (req, res, next) => {
    try {
        console.log("Body", req.body);
        console.log("File", req.file);
        let name = req.body.name;
        let address = req.body.address;
        let number = req.body.number;
        let user_id = req.body.user_id;

        let query = "insert into university (name, address, number , user_id) " +
            "values ('" + name + "','" + address + "','" + number + "','" + user_id + "')";
        database.executeQuery(res, "University Successfully Created", query);

    } catch (e) {
        console.log(e);
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.createStudent = async (req, res, next) => {
    try {
        console.log("Body", req.body);
        console.log("File", req.file);
        let firstName = req.body.firstname;
        let lastName = req.body.lastname;
        let createdAt = date;
        let universityName = req.body.university_name;
        let studentNumber = req.body.student_number;
        let email = req.body.email;
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;
        let certificate = "certificates/" + req.file.filename;

        let query = "insert into student (firstname, lastname, created_at , university_name, email, student_number,start_date, end_date, certificate, certificate_hash) " +
            "values ('" + firstName + "','" + lastName + "','" + createdAt + "','" + universityName + "','"+email+"','" + studentNumber + "','" + start_date + "','" + end_date + "','" + certificate + "',";

        let replacements = {
            stuNumber: studentNumber,
            firstname: firstName,
            lastname: lastName,
            uniName: universityName,
            start: start_date,
            end: end_date,
            link: process.env.BASE_URL + certificate
        };

        hashFile(query, certificate, firstName, universityName, replacements, email, res);

    } catch (e) {
        console.log(e);
        const response = {'status_code': 500, 'error': "File format Incorrect."};
        res.status(500).json(response);
    }
};

exports.getStudents = async (req, res, next) => {
    try {
        console.log("Get Admins API called");
        console.log(req.body);
        const query = "Select * from student order by id desc";
        database.executeQuery(res, "", query);
    } catch (e) {
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.getUniversity = async (req, res, next) => {
    try {
        console.log("Get Admins API called");
        console.log(req.body);
        const query = "Select university.name,university.address,university.number,user.email,user.status from university join user on university.user_id = user.id order by university.id desc";
        database.executeQuery(res, "", query);
    } catch (e) {
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.verify = (req, res) => {
    try {
        console.log("BODY", req.query);
        let dataHash = req.query.hash;
        const query = "select * from student where certificate_hash='" + dataHash + "'";
        database.executeQuery(res, "", query, true);

    } catch
        (e) {
        const response = {'status_code': 500, 'error': "Error Occurred"};
        res.status(500).json(response);
        console.log(e);
    }
};

function checkEmail(email) {
    let find1 = email.indexOf("@");
    let find2 = email.indexOf(".");
    return find1 !== -1 && find2 !== -1 && find2 > find1;
}

function hashFile(query, certificate, firstName, universityName, replacements, email, res) {
    try {
        let algorithm = 'sha1';
        let shasum = crypto.createHash(algorithm);
        const filePath = path.join(__dirname, '../public/' + certificate);
        let s = fs.ReadStream(filePath);
        s.on('data', function (data) {
            shasum.update(data)
        });
        s.on('end', function () {
            let dataHash = shasum.digest('hex');
            console.log(dataHash);
            const selectQuery = "select * from student where certificate_hash='" + dataHash + "'";
            database.con.query(selectQuery, function (err, resultQuery) {
                if (err) {
                    const response = {'status_code': 500, 'error': err};
                    res.status(500).json(response);
                } else {
                    if (resultQuery.length <= 0) {
                        let queryHashString = "'" + dataHash + "')";
                        let queryInsert = query + queryHashString;

                        let _request = {
                            chaincodeId: 'certificate',
                            fcn: 'addCertificate',
                            args: [
                                now.toISOString(),
                                universityName,
                                firstName,
                                dataHash,
                                now.toISOString()
                            ]
                        };
                        console.log(_request);
                        let blockchainResponse = invokeBlockchain.invokeCreate(_request);

                        database.executeQuery(res, "Student Created Successfully", queryInsert);

                        readHTMLFile('/home/deenario/certificate_Verification/backend/email/certificateEmail.html', function (err, html) {
                            let template = handlebars.compile(html);

                            Object.assign(replacements, {hash: dataHash});

                            let htmlToSend = template(replacements);
                            let mailOptions = {
                                from: process.env.EMAIL,
                                to: email,
                                subject: 'Certificate Created',
                                html: htmlToSend

                            };
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log("Email Sent", info.response);
                                }
                            });
                        });

                    } else {
                        const response = {'status_code': 500, 'error': "File already exists"};
                        res.status(500).json(response);
                    }
                }
            });
        });
    } catch (error) {
        const response = {'status_code': 500, 'error': "Invalid File Type"};
        res.status(500).json(response);
    }
}
