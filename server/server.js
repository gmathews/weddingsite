'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const AWS = require("aws-sdk");
const Rsvp = require('./rsvp');

AWS.config.update({
    region: "us-east-2"
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// Setup
const rsvp = new Rsvp(AWS, 'Guests', console);
// Create table and load data for manual testing
// rsvp.createTable(AWS, (err, data)=>{
//     if(!err){
//         rsvp.loadCSV('./guests.csv');
//     }
// });

// App
const app = express();
// for parsing application/json
app.use(bodyParser.json());
// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: true}));
// Setup CORS for security
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');// TODO: tighten to specific URL?
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
});

// Health check
app.get('/api', (req, res) => {
    res.send({});
});

app.route('/api/rsvp')
    .get((req, res) => {
        console.log('/rsvp GET', req.query);
        let name = req.query.rsvpname;
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
        console.log('/rsvp PUT', req.body);
        rsvp.update(req.body, (err, data) => {
            if(err){
                res.status(500).send(err);
            }else{
                res.send(data);
            }
        });
    });
//TODO: add add with jwt auth middleware to add more guests later

// TODO: add jwt auth middleware
app.get('/api/rsvp/all', (req, res) => {
    console.log('/rsvp/all GET', req.body);
    rsvp.all((err, data) => {
        if(err){
            res.status(404).send(err);
        }else{
            // Send as a CSV file
            res.writeHead(200, {'Content-Type': 'text/csv','Content-disposition':'attachment; filename=guestlist.csv'});

            res.end(data);
        }
    });
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
