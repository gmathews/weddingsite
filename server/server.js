'use strict';

const express = require('express');
const AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://dynamodb:8000"
});

const dynamodb = new AWS.DynamoDB();

var params = {
    TableName : "Guests",
    KeySchema: [
        { AttributeName: "lastname", KeyType: "HASH"},  //Partition key
        { AttributeName: "pin", KeyType: "RANGE" }  //Sort key
    ],
    AttributeDefinitions: [
        { AttributeName: "lastname", AttributeType: "S" },
        { AttributeName: "pin", AttributeType: "S" }
    ],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    }
};

// Create the RSVP table
dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/rsvp', (req, res) => {
  res.send('Hello world\n');
});
app.put('/rsvp', (req, res) => {
  res.send('Hello world\n');
});
app.get('/rsvp/all', (req, res) => {
  res.send('Hello world\n');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
