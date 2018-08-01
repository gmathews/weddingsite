const parse = require('csv-parse');
const fs = require('fs');

module.exports = class Rsvp {

    constructor(awsSDK, tableName, logger) {
        this.tableName = tableName;
        this.docClient = new awsSDK.DynamoDB.DocumentClient();
        this.logger = logger;
    }

    createTable(awsSDK, next){
        const dynamodb = new awsSDK.DynamoDB();

        const params = {
            TableName : this.tableName,
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

        // Create the RSVP table
        dynamodb.createTable(params, (err, data) => {
            if (err) {
                this.logger.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                this.logger.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            }
            next(err, data);
        });
    }

    loadCSV(filename){
        // Add all the data
        this.logger.log("Importing guests into DynamoDB. Please wait.");
        fs.readFile(filename, 'utf8', (err, file) => {
            if (err) {
                this.logger.log(JSON.stringify(err));
                return;
            }

            this.logger.log(file);

            parse(file, {relax_column_count: true, trim: true}, (err, guestGroups) => {
                this.logger.log('Error parsing CSV:', err);
                guestGroups.forEach((guestGroup) => {
                    // FirstName LastName, SecondFirstName SecondLastName, ... +1, PIN
                    let members = {};
                    let hasPlusOne = false;
                    const pin = guestGroup[guestGroup.length - 1];
                    // Last item is the PIN, so don't bother parsing it
                    for(let i = 0; i < guestGroup.length - 1; i++){
                        const item = guestGroup[i];
                        if(item === '+1'){
                            hasPlusOne = true;
                        }else{
                            members[item] = false;
                        }
                    }
                    const rsvpname = guestGroup[0];

                    this.addItem({
                        'rsvpname': rsvpname,
                        'pin': pin,
                        'hasPlusOne': hasPlusOne,
                        'members': members
                    },()=>{});
                });
            });
        });
    }

    addItem(data, next){
        let dynamoItem = {
            TableName: this.tableName,
            Item: data
        };
        // Make sure the key is lowercase
        dynamoItem.Item.rsvpname = data.rsvpname.toLowerCase();

        this.docClient.put(dynamoItem, (err, returnedData) => {
            if (err) {
                this.logger.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                this.logger.log("Added item:", JSON.stringify(returnedData, null, 2));
            }
            next(err, returnedData);
        });
    }

    get(rsvpname, pin, next) {
        const notFoundError = 'Please double check name &amp; zip';
        // Make sure we supply a usable query
        if(rsvpname && pin){
            let params = {
                TableName: this.tableName,
                Key: {
                    "rsvpname": rsvpname.toLowerCase(),
                    "pin": pin
                }
            };
            this.docClient.get(params, (err, data) => {
                let item = {};
                if (err) {
                    this.logger.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    if(Object.keys(data).length === 0) {
                        err = notFoundError;
                    }
                    item = data.Item;
                    this.logger.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                }
                next(err, item);
            });
        }else{
            next(notFoundError);
        }
    }

    update(data, next) {
        let params = {
            TableName: this.tableName,
            Key: {
                "rsvpname": data.rsvpname.toLowerCase(),
                "pin": data.pin
            },
            // Filter data, don't allow users to add extra stuff or change read only fields
            UpdateExpression: "set ",
            ExpressionAttributeValues:{},
            ExpressionAttributeNames: {},
            // Only update if item already exists
            ConditionExpression: "attribute_exists(rsvpname)",
            ReturnValues:"ALL_NEW"
        };

        // Add conditional expressions to make sure we aren't trying anything funny
        let i = 0;
        for(let k in data.members){
            if(data.members.hasOwnProperty(k)){
                let keyname = '#m' + i;
                // Add a comma if we need it
                if(i > 0){
                    params.UpdateExpression += ', ';
                }
                params.UpdateExpression += 'members.' + keyname + ' = :m' + i;
                params.ExpressionAttributeNames[keyname] = k;
                params.ExpressionAttributeValues[':m' + i] = data.members[k];
                // Don't allow members keys to be changed, only allow the bool value
                params.ConditionExpression += ' AND attribute_exists(members.' + keyname + ')';
                i++;
            }
        }

        // Manipulate our plus one name
        if(data.hasOwnProperty('plusOneName')){
            if(!data.plusOneName){ // Remove the plus one
                params.UpdateExpression += " remove plusOneName";
            }else{ // Assign a plus one
                // Don't allow plushOneName to be set if we don't have hasPlusOne set to true in the record
                params.ConditionExpression += " AND hasPlusOne = :b";
                params.ExpressionAttributeValues[":b"] = true;
                // Assign our plus one
                params.ExpressionAttributeValues[":n"] = data.plusOneName;
                params.UpdateExpression += ", plusOneName = :n";
            }
        }
        this.logger.log(params);
        this.docClient.update(params, (err, updatedData) => {
            let result = {};
            if (err) {
                this.logger.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                this.logger.log("UpdateItem succeeded:", JSON.stringify(updatedData, null, 2));
                // See if they are coming
                let coming = false;
                // Do the first name?
                let name = data.rsvpname.split(' ')[0];
                for (let name of Object.getOwnPropertyNames(updatedData.Attributes.members)) {
                    if (updatedData.Attributes.members[name]) {
                        coming = true;
                        break;
                    }
                }
                result = {coming: coming, name: name };
            }
            next(err, result);
        });
    }

    all(next) {
        let params = {
            TableName: this.tableName,
            Key:{
                "rsvpname": "",
                "pin": ""
            }
        };

        // Deal with this scope
        let docClient = this.docClient;
        let logger = this.logger;

        let csv = 'Going,Not Going\n';
        docClient.scan(params, onScan);

        function onScan(err, data) {
            if (err) {
                logger.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                logger.log("Scan succeeded.");
                // Go through everything, and format the way we need
                for (let guest of data.Items) {
                    let confirmedGuests = [];
                    let unconfirmedGuests = [];
                    for (let name of Object.getOwnPropertyNames(guest.members)) {
                        if (guest.members[name]) {
                            confirmedGuests.push(name);
                        }else{
                            unconfirmedGuests.push(name);
                        }
                    }

                    // Plus one, if confirmed will be part of the guest list
                    if (guest.hasPlusOne && guest.hasOwnProperty('plusOneName')) {
                        confirmedGuests.push(guest.plusOneName);
                    }

                    let goingi = confirmedGuests.length;
                    let notGoingi = unconfirmedGuests.length;
                    while(goingi > 0 || notGoingi > 0){
                        if(goingi > 0){
                            csv += confirmedGuests[goingi - 1];
                        }
                        csv += ',';

                        if(notGoingi > 0){
                            csv += unconfirmedGuests[notGoingi - 1];
                        }

                        csv += '\n';
                        goingi--;
                        notGoingi--;
                    }
                    csv += ',\n';// Add our group break
                }

                // continue scanning if we have more guests, because
                // scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey != "undefined") {
                    logger.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    docClient.scan(params, onScan);
                }else{
                    // Only send data at the very end
                    next(null, csv);
                }
            }
        }
    }
};
