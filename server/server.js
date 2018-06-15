'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const AWS = require("aws-sdk");
const Rsvp = require('./rsvp');

AWS.config.update({
    region: "us-west-2",
    endpoint: "http://dynamodb:8000"
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// Setup
const rsvp = new Rsvp(AWS);

// App
const app = express();
// for parsing application/json
app.use(bodyParser.json());
// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));

app.route('/rsvp')
    .get((req, res) => {
        console.log(req.query);
        let name = req.query.lastname;
        let pin = req.query.pin;
        rsvp.get(name, pin, (err, data) => {
            if(err){
                res.status(404).send(err);
            }else{
                res.send(data);
            }
        });
    })
    .put((req, res) => {
        console.log(req.body);
        rsvp.update(req.body, res.send);
    });

app.get('/rsvp/all', (req, res) => {
    console.log(req.body);
    let password = req.body.password;
    rsvp.all(password, res.send);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
