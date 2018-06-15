const table = "Guests";
module.exports = class Rsvp {

    constructor(awsSDK) {
        // Create our table
        const dynamodb = new awsSDK.DynamoDB();

        const params = {
            TableName : table,
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
                // Add all the data
                // TODO: figure out the CSV format
                function addItem(data){
                    docClient.put(data, function(err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log("Added item:", JSON.stringify(data, null, 2));
                        }
                    });
                }
            }
        });

        this.docClient = new awsSDK.DynamoDB.DocumentClient();
    }

    get(name, pin, next) {
        let params = {
            TableName: table,
            Key: {
                "lastname": name,
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

    update(data) {
        // TODO: setup params
        let params = {
            TableName: table,
            Key: {
                "lastname": data.lastname,
                "pin": data.pin
            },
            // Only update if item already exists
            ConditionExpression: "attribute_exists(lastname)"
        };
        this.docClient.update(params, function(err, data) {
            if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            }
            // TODO: res gets the response
        });
    }

    all(password) {
        var params = {
            TableName: table,
            Key:{
                "lastname": "",
                "pin": ""
            }
        };
        this.docClient.scan(params, onScan);

        function onScan(err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                // TODO: Setup the response
                console.log("Scan succeeded.");
                data.Items.forEach(function(guest) {
                    console.log(
                        guest.lastname + ": ",
                        guest.pin,
                        "- info:", guest.info);
                });

                // continue scanning if we have more guests, because
                // scan can retrieve a maximum of 1MB of data
                if (typeof data.LastEvaluatedKey != "undefined") {
                    console.log("Scanning for more...");
                    params.ExclusiveStartKey = data.LastEvaluatedKey;
                    this.docClient.scan(params, onScan);
                }
            }
        }
    }
};
