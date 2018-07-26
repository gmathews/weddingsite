const assert = require('assert');
const AWS = require('aws-sdk');
const Rsvp = require('../rsvp');

const tableName = 'testGuest';
// Stub that does nothing, makes tests less verbose
const logger = {
    log:()=>{},
    error:()=>{}
};

suite('RSVP', () => {
    // Setup each time
    suiteSetup((done)=>{

        AWS.config.update({
            region: 'us-west-2',
            endpoint: 'http://dynamodb:8000'
        });

        this.rsvp = new Rsvp(AWS, tableName, logger);
        this.rsvp.createTable(AWS, done);
        this.docClient = new AWS.DynamoDB.DocumentClient();
    });

    // Empty each time
    suiteTeardown((done)=>{
        // Delete our test DB
        const dynamodb = new AWS.DynamoDB();
        const params = {
            TableName: tableName
        };
        dynamodb.deleteTable(params, (err, data)=>{
            done(err, data);
        });
    });

    const standardTestGuestName = 'test name';
    const standardTestGuestPIN = '42069';
    const standardTestGuest = {
        rsvpname: standardTestGuestName,
        pin: standardTestGuestPIN,
        hasPlusOne: false,
        members: {
            standardTestGuestName: false
        }
    };
    function createStandardTestGuest(rsvp, next){
        rsvp.addItem(standardTestGuest, next);
    }

    test('Make sure add item works for testing', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            assert.equal(err, null);

            let params = {
                TableName: tableName,
                Key: {
                    'rsvpname': standardTestGuestName,
                    'pin': standardTestGuestPIN
                }
            };
            // Make sure we added the item we wanted to
            this.docClient.get(params, (err, data) => {
                assert.deepEqual(data.Item, standardTestGuest);
                done();
            });
        });
    });

    // Test Get
    test('Get item works', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            this.rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData) =>{
                assert.deepEqual(guestData, standardTestGuest);
                done();
            });
        });
    });

    test('Invalid PIN Get item errors out', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            this.rsvp.get(standardTestGuestName, '90210', (err, guestData) =>{
                // Should have an error
                assert(err);
                // Shouldn't send anything back
                assert(!guestData);
                done();
            });
        });
    });

    test('Invalid Name Get item errors out', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            this.rsvp.get('Invalid Name', standardTestGuestPIN, (err, guestData) =>{
                // Should have an error
                assert(err);
                // Shouldn't send anything back
                assert(!guestData);
                done();
            });
        });
    });

    test('Invalid item Get item errors out', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            this.rsvp.get('Invalid Name', '90210', (err, guestData) =>{
                // Should have an error
                assert(err);
                // Shouldn't send anything back
                assert(!guestData);
                done();
            });
        });
    });

    //Test Update
    test('Update works', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {
                    standardTestGuestName: true
                }
            };
            this.rsvp.update(params, (err, data)=>{
                this.rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    assert.deepEqual(guestData.members, params.members);
                    done();
                });
            });
        });
    });
});
