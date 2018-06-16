const parse = require('csv-parse');
const fs = require('fs');

const table = "Guests";
module.exports = class Rsvp {

    constructor(awsSDK) {
        // Create our table
        const dynamodb = new awsSDK.DynamoDB();

        const params = {
            TableName : table,
            KeySchema: [
                { AttributeName: "rsvpname", KeyType: "HASH"},  //Partition key
                { AttributeName: "pin", KeyType: "RANGE" }  //Sort key
            ],
            AttributeDefinitions: [
                { AttributeName: "rsvpname", AttributeType: "S" },
                { AttributeName: "pin", AttributeType: "S" }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 10,
                WriteCapacityUnits: 10
            }
        };

        const docClient = new awsSDK.DynamoDB.DocumentClient();

        this.docClient = docClient;

        // Create the RSVP table
        dynamodb.createTable(params, function(err, data) {
            if (err) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                function addItem(data){
                    docClient.put(data, function(err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log("Added item:", JSON.stringify(data, null, 2));
                        }
                    });
                }
                // Add all the data
                console.log("Importing guests into DynamoDB. Please wait.");
                fs.readFile('./guests.csv', 'utf8', (err, file) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                        return;
                    }

                    console.log(file);

                    parse(file, {relax_column_count: true, trim: true}, (err, guestGroups) => {
                        console.log('Error parsing CSV:', err);
                        guestGroups.forEach((guestGroup) => {
                            // FirstName LastName, SecondFirstName SecondLastName, ... +1, PIN
                            let members = [];
                            let hasPlusOne = false;
                            const pin = guestGroup[guestGroup.length - 1];
                            // Last item is the PIN, so don't bother parsing it
                            for(let i = 0; i < guestGroup.length - 1; i++){
                                const item = guestGroup[i];
                                if(item === '+1'){
                                    hasPlusOne = true;
                                }else{
                                    members.push({'name': item, 'confirmed': false});
                                }
                            }
                            const rsvpname = guestGroup[0];

                            addItem({
                                TableName: table,
                                Item: {
                                    'rsvpname': rsvpname,
                                    'pin': pin,
                                    'hasPlusOne': hasPlusOne,
                                    'members': members
                                }
                            });
                        });
                    });
                });
            }
        });
    }

    get(name, pin, next) {
        let params = {
            TableName: table,
            Key: {
                "rsvpname": name,
                "pin": pin
            }
        };
        this.docClient.get(params, function(err, data) {
            if (err) {
                console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                if(Object.keys(data).length === 0) {
                    err = "name or pin wrong";
                }
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            }
            next(err, data);
        });
    }

    update(data, next) {
        let params = {
            TableName: table,
            Key: {
                "rsvpname": data.rsvpname,
                "pin": data.pin
                // TODO: filter data, don't all users to add extra stuff or change read only fields
            },
            // Only update if item already exists
            ConditionExpression: "attribute_exists(rsvpname)"
        };
        this.docClient.update(params, function(err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
            next(err, data);
        });
    }

    all(next) {
        var params = {
            TableName: table,
            Key:{
                "rsvpname": "",
                "pin": ""
            }
        };

        let listOfGuestGroups = [];
        this.docClient.scan(params, onScan);

        function onScan(err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Scan succeeded.");
                // Go through everything, and format the way we need
                for (let guest of data.Items) {
                    let confirmedGuests = [];
                    let unconfirmedGuests = [];
                    for (let item of guest.members) {
                        if (item.confirmed) {
                            confirmedGuests.push(item.name);
                        }else{
                            unconfirmedGuests.push(item.name);
                        }
                    }

                    // Plus one, if confirmed will be part of the guest list
                    if (guest.hasPlusOne && guest.hasOwnProperty('plusOneName')) {
                        confirmedGuests.push(guest.plusOneName);
                    }

                    const prettyPrint = {
                        group: guest.rsvpname,
                        'confirmed': confirmedGuests,
                        'unconfirmed': unconfirmedGuests
                    };
                    if (guest.hasPlusOne) {
                        prettyPrint.hasPlusOne = guest.hasPlusOne;
                    }
                    listOfGuestGroups.push(prettyPrint);
                }

                // continue scanning if we have more guests, because
                // scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey != "undefined") {
                    console.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    this.docClient.scan(params, onScan);
                }else{
                    // Only send data at the very end
                    next(listOfGuestGroups);
                }
            }
        }
    }
};
