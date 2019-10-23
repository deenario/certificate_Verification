const imageThumbnail = require('image-thumbnail');
const {imageHash} = require('image-hash');
const database = require("../utils");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const invokeBlockchain = require("../blockchain/invokeNetwork");
const queryBlockchain = require("../blockchain/queryNetwork");
const mime = require('mime-types');

let now = new Date();
const date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

exports.gallery = async (req, res, next) => {
    try {
        console.log("Get Files API called");
        console.log(req.body);
        const query = "select * from user_data where user_id = " + req.query.user_id + " order by id desc";
        database.executeQuery(res, "", query);
    } catch (e) {
        const response = {'status_code': 500, 'error': "Internal Server Error"};
        res.status(500).json(response);
    }
};

exports.verify = (req, res) => {
    try {
        let filePath;
        let dataType = req.body.data_type;
        let user_id = req.body.user_id ? req.body.user_id : null;
        let verifier = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        verifier = verifier.split('ffff:').pop();
        console.log("BODY", req.body);
        console.log("Verifier", verifier);

        if (dataType === "image") {
            if (typeof req.body.url === 'undefined' || req.body.url === "") {
                filePath = req.file.path;
                console.log("FileBased", filePath);
            } else {
                filePath = req.body.url;
                filePath = filePath.split('https://whatthefake.tk/').pop();
                filePath = "/home/ubuntu/whatthefake/backendServer/public/" + filePath;
                console.log("URLBased", filePath);
                console.log(filePath);
            }

            imageHash(filePath, 16, true, (error, dataHash) => {
                if (error) {
                    console.log(error);
                    const response = {'status_code': 500, 'error': error};
                    res.status(500).json(response);
                } else {
                    const query = "select * from user_data where data_hash='" + dataHash + "'";
                    var _request = {
                        chaincodeId: 'whatthefake',
                        fcn: 'queryFileHash',
                        args: [
                            dataHash
                        ]
                    };
                    let blockchainresponse = queryBlockchain.invokeQuery(_request);
                    console.log(blockchainresponse);

                    database.con.query(query, function (err, resultQuery) {
                        if (err) {
                            console.log(err);
                        } else {
                            if (resultQuery.length > 0) {
                                console.log(resultQuery.id);
                                const Querylog = "INSERT INTO data_logs (data_id,verifier,created_at,user_id) " +
                                    "VALUES (" + resultQuery[0].id + ",'" + verifier + "','" + date + "'," + user_id + ")";
                                database.con.query(Querylog, function (err, result) {
                                    if (err) {
                                        console.log(err);
                                    }
                                });
                            }
                        }
                    });

                    database.executeQuery(res, "", query, true);
                }
            });
        } else {

            filePath = req.file.path;
            console.log("FileBased", filePath);
            console.log(filePath);
            let algorithm = 'sha1';
            let shasum = crypto.createHash(algorithm);

            let s = fs.ReadStream(filePath);
            s.on('data', function (data) {
                shasum.update(data)
            });
            s.on('end', function () {
                let dataHash = shasum.digest('hex');
                const query = "select * from user_data where data_hash='" + dataHash + "'";
                let _request = {
                    chaincodeId: 'whatthefake',
                    fcn: 'queryFileHash',
                    args: [
                        dataHash
                    ]
                };
                database.con.query(query, function (err, resultQuery) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (resultQuery.length > 0) {
                            console.log(resultQuery.id);
                            const Querylog = "INSERT INTO data_logs (data_id,verifier,created_at,user_id) " +
                                "VALUES (" + resultQuery[0].id + ",'" + verifier + "','" + date + "'," + user_id + ")";
                            database.con.query(Querylog, function (err, result) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        }
                    }
                });
                let blockchainresponse = queryBlockchain.invokeQuery(_request);
                database.executeQuery(res, "", query, true);
            });
        }
    } catch (e) {
        const response = {'status_code': 500, 'error': "Error Occurred"};
        res.status(500).json(response);
        console.log(e);
    }
};

exports.upload = async (req, res) => {
    try {
        console.log("Body", req.body);
        console.log("File", req.file);
        let ts = Math.floor(new Date() / 1000);
        let id = (ts + (Math.floor(Math.random() * 1000) + 1)).toString();
        const url = req.protocol + "://" + req.get("host");
        let dataType = req.body.data_type;
        let userId = req.body.user_id;
        let createdAt = date;
        let updatedAt = date;
        let latitude = req.body.lat ? req.body.lat : null;
        let longitude = req.body.lng ? req.body.lng : null;
        let location = req.body.location ? req.body.location : null;
        let fileName = req.file.originalname;
        let dataLink = "files/" + req.file.filename;
        let dataThumbnail = "thumbnail/" + req.file.filename;
        let storeTumbnail = "/home/ubuntu/whatthefake/backendServer/public/" + dataThumbnail;
        let dataLinkStore = "public/" + dataLink;
        let generatedURl = url + "/" + dataLink;

        console.log("URL", generatedURl);
        console.log("THUMBNAIL", url + "/" + dataThumbnail);
        console.log(mime.lookup(generatedURl));
        if (dataType !== 'image') {
            let query = "insert into user_data (file_name, data_type, data_link, data_thumbnail, user_id, created_at, updated_at, latitude, longitude , location, data_hash) " +
                "values ('"+fileName+"', '" + dataType + "','" + dataLink + "', '" + null + "', '" + userId + "','" + createdAt + "'," +
                "'" + updatedAt + "','" + latitude + "','" + longitude + "', '" + location + "',";
            hashFile(query, dataLink, id, userId, res);

        } else {
            let options = {width: 200, height: 200, responseType: 'base64'};
            const thumbnail = await imageThumbnail("/home/ubuntu/whatthefake/backendServer/public/" + dataLink, options);
            fs.writeFile(storeTumbnail, thumbnail, {encoding: 'base64'}, function (result, error) {
                if (error) {
                    console.log(error);
                    res.send(result);
                } else {
                    let query = "insert into user_data (file_name, data_type, data_link, data_thumbnail, user_id, created_at, updated_at, latitude, longitude , location, data_hash) " +
                        "values ('"+fileName+"','" + dataType + "','" + dataLink + "', '" + dataThumbnail + "', '" + userId + "','" + createdAt + "'," +
                        "'" + updatedAt + "','" + latitude + "','" + longitude + "', '" + location + "',";
                    hashImage(query, dataLinkStore, id, userId, res);
                }
            });
        }
    } catch (error) {
        console.log(error);
        const response = {'status_code': 500, 'error': "Invalid File Type"};
        res.status(500).json(response);
    }
};

exports.camera = async (req, res) => {
    try {
        let base64String = req.body.file;
        let base64Image = base64String.split(';base64,').pop();
        let dataType = 'image';
        let userId = req.body.user_id;
        let createdAt = date;
        let updatedAt = date;
        let latitude = req.body.lat ? req.body.lat : null;
        let longitude = req.body.lng ? req.body.lng : null;
        let location = req.body.location ? req.body.location : null;
        const url = req.protocol + "://" + req.get("host");
        let ts = Math.floor(new Date() / 1000);
        let id = (ts + (Math.floor(Math.random() * 1000) + 1)).toString();
        let storeTumbnail = '/home/ubuntu/whatthefake/backendServer/public/thumbnail/img-' + id + '.png';
        let imageName = '/home/ubuntu/whatthefake/backendServer/public/files/img-' + id + '.png';
        let fileName = 'upload-' + id +'.png';

        fs.writeFile(imageName, base64Image, {encoding: 'base64'}, function (result, error) {
            if (error) {
                console.log(error);
                const response = {'status_code': 500, 'error': error};
                res.status(500).json(response);
            } else {
                let options = {width: 200, height: 200, responseType: 'base64'};
                imageThumbnail(imageName, options).then(thumbnail => {
                    fs.writeFile(storeTumbnail, thumbnail, {encoding: 'base64'}, function (result, error) {
                        if (error) {
                            console.log(error);
                            const response = {'status_code': 500, 'error': error};
                            res.status(500).json(response);
                        } else {
                            let dataLink = imageName.split('/backendServer/').pop();
                            let dataLinkStore = imageName.split('/public/').pop();
                            storeTumbnail = storeTumbnail.split('/public/').pop();
                            let generatedURl = url + "/" + dataLink;
                            console.log("URL", generatedURl);

                            let query = "insert into user_data (file_name, data_type, data_link, data_thumbnail, user_id, created_at, updated_at, latitude, longitude , location, data_hash) " +
                                "values ('"+fileName+"','" + dataType + "', '" + dataLinkStore + "','" + storeTumbnail + "','" + userId + "','" + createdAt + "'," +
                                "'" + updatedAt + "','" + latitude + "','" + longitude + "', '" + location + "',";
                            hashImage(query, dataLink, id, userId, res);
                        }
                    });
                });
            }
        });
    } catch (error) {
        console.log(error);
        const response = {'status_code': 500, 'error': error};
        res.status(500).json(response);
    }
};

function hashFile(queryString, dataLink, id, userID, res) {
    try {
        let algorithm = 'sha1';
        let shasum = crypto.createHash(algorithm);
        const filePath = path.join(__dirname, '../public/' + dataLink);
        let s = fs.ReadStream(filePath);
        s.on('data', function (data) {
            shasum.update(data)
        });
        s.on('end', function () {
            let dataHash = shasum.digest('hex');
            console.log(dataHash);
            const selectQuery = "select * from user_data where data_hash='" + dataHash + "'";
            database.con.query(selectQuery, function (err, resultQuery) {
                if (err) {
                    const response = {'status_code': 500, 'error': err};
                    res.status(500).json(response);
                } else {
                    if (resultQuery.length <= 0) {
                        let queryHashString = "'" + dataHash + "')";
                        let queryInsert = queryString + queryHashString;
                        let _request = {
                            chaincodeId: 'whatthefake',
                            fcn: 'addFileHash',
                            args: [
                                id,
                                userID,
                                dataHash,
                                now.toISOString()
                            ]
                        };

                        let blockchainResponse = invokeBlockchain.invokeCreate(_request);
                        database.executeQuery(res, "File Uploaded Successfully", queryInsert);
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

function hashImage(queryString, generatedURl, id, userID, res) {
    try {
        imageHash(generatedURl, 16, true, (error, dataHash) => {
            if (error) {
                console.log(error);
                const response = {'status_code': 500, 'error': error};
                res.status(500).json(response);
            } else {
                const querySelect = "select * from user_data where data_hash='" + dataHash + "'";
                database.con.query(querySelect, function (err, resultQuery) {
                    if (err) {
                        const response = {'status_code': 500, 'error': err};
                        res.status(500).json(response);
                    } else {
                        if (resultQuery.length <= 0) {
                            let queryHashString = "'" + dataHash + "')";
                            let queryInsert = queryString + queryHashString;
                            let _request = {
                                chaincodeId: 'whatthefake',
                                fcn: 'addFileHash',
                                args: [
                                    id,
                                    userID,
                                    dataHash,
                                    now.toISOString()
                                ]
                            };
                            let blockchainResponse = invokeBlockchain.invokeCreate(_request);
                            database.executeQuery(res, "File Uploaded Successfully", queryInsert);
                        } else {
                            const response = {'status_code': 500, 'error': "File already exists"};
                            res.status(500).json(response);
                        }
                    }
                });
            }
        });
    } catch (error) {
        const response = {'status_code': 500, 'error': "Invalid File Type"};
        res.status(500).json(response);
    }
}
