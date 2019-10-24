require('dotenv').config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const database = require("../utils");
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');

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
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "03d4327438b410",
        pass: "05b328419d4347"
    }
});

var now = new Date();
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
                        "(email, password, user_type, reset_token, created_at, ) " +
                        "values " + "('" + email + "','" + hash + "','" + userType + "','" + null + "','"+createdAt+"')";
                    database.executeQuery(res, "User Successfully Created", query);

                    readHTMLFile('/home/deenario/certificate_Verification/backend/email/registerUser.html', function (err, html) {
                        let template = handlebars.compile(html);
                        let replacements = {
                            firstname: firstName,
                            username: username,
                            email: email
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
                                    jwt.sign({_uid: username}, process.env.JWTSECRET
                                        , (err, token) => {
                                            const user = {
                                                'id': resultQuery[0].id,
                                                'email': resultQuery[0].email,
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
                                    jwt.sign({_uid: username}, process.env.JWTSECRET, {expiresIn: '1h'}
                                        , (err, token) => {
                                            const user = {
                                                'id': resultQuery[0].id,
                                                'email': resultQuery[0].email,
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
                            const url = req.protocol + "://" + req.get("host") + "/reset/password/" + token;
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
                                            from: process.env.EMAIL,
                                            to: email,
                                            subject: 'Password Reset',
                                            html: htmlToSend

                                        };
                                        transporter.sendMail(mailOptions, function (error, info) {
                                            if (error) {
                                                console.log(error);
                                                callback(error);
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

exports.update = async (req, res, next) => {
    try {
        console.log("Body =========> ", req.body);
        console.log("File =========>", req.file);
        let firstName = req.body.firstname;
        let lastName = req.body.lastname;
        let username = req.userData._uid;
        let avatar = "";
        let updatedAt = date;
        let email = req.body.email;
        if (req.file !== undefined) {
            avatar = "/avatar/" + req.file.filename;
        } else {
            avatar = req.body.avatar;
        }

        let searchEmailQuery = "select * from user where email='" + email + "' and username !='" + username + "'";
        database.con.query(searchEmailQuery, function (err, resultQuery) {
                if (err) {
                    console.log(err);
                    const response = {'status_code': 500, 'error': err};
                    res.status(500).json(response);
                } else {
                    if (resultQuery.length === 0) {
                        let query = "UPDATE user SET firstname = '" + firstName + "', lastname = '" + lastName + "', avatar = '" + avatar + "' , " +
                            "updated_at = '" + updatedAt + "', email= '" + email + "' where username = '" + username + "';";
                        database.con.query(query, function (err, resultQuery) {
                            if (err) {
                                console.log(err);
                                const response = {'status_code': 500, 'error': "Internal Server Error"};
                                res.status(500).json(response);
                            } else {
                                let query = "select * from user where username = '" + username + "';";
                                database.con.query(query, function (err, resultQuery) {
                                    if (err) {
                                        console.log(err);
                                        const response = {'status_code': 500, 'error': "Internal Server Error"};
                                        res.status(500).json(response);
                                    } else {
                                        const user = {
                                            'id': resultQuery[0].id,
                                            'firstname': resultQuery[0].firstname,
                                            'lastname': resultQuery[0].lastname,
                                            'email': resultQuery[0].email,
                                            'avatar': resultQuery[0].avatar,
                                            'username': resultQuery[0].username
                                        };
                                        const response = {
                                            'status_code': 200,
                                            'message': "User Successfully Updated",
                                            'data': user
                                        };
                                        res.status(200).json(response);
                                    }
                                });
                            }
                        });
                    } else {
                        const response = {'status_code': 422, 'error': "Email Address Already Exists"};
                        res.status(422).json(response);
                    }
                }
            }
        );
    } catch (e) {
        console.log(e);
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        let oldpassword = req.body.old_password;
        let password = req.body.password;
        let userid = req.body.user_id;
        let token = "";
        let username = req.userData._uid;
        let hash = await bcrypt.hash(password.trim(), 10);
        console.log(username);
        let query = "select * from user where username='" + username + "' limit 1";
        database.con.query(query, function (err, resultQuery) {
            if (err) {
                const response = {'status_code': 500, 'error': err};
                res.status(500).json(response);
            } else {
                bcrypt.compare(oldpassword.trim(), resultQuery[0].password.trim(), (err, resultBcrypt) => {
                    if (err) {
                        const response = {'status_code': 500, 'error': err};
                        res.status(500).json(response);
                    } else {
                        if (resultBcrypt) {
                            let Query = "update user set password='" + hash + "' where username='" + username + "'";
                            database.con.query(Query, function (err, resultQuery) {
                                if (err) {
                                    const response = {'status_code': 500, 'error': err};
                                    res.status(500).json(response);
                                } else {
                                    const response = {'status_code': 200, 'message': "Password Successfully Updated"};
                                    res.status(200).json(response);
                                }
                            });
                        } else {
                            const response = {'status_code': 422, 'error': "Old Password doesn't match"};
                            res.status(422).json(response);
                        }
                    }
                });
            }
        });
    } catch (e) {
        console.log(e);
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

function checkEmail(email) {
    let find1 = email.indexOf("@");
    let find2 = email.indexOf(".");
    return find1 !== -1 && find2 !== -1 && find2 > find1;
}