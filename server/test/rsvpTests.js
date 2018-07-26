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

    const standardTestGuestName = 'Test Name';
    const standardTestGuestPIN = '42069';
    const desiredMembers = {};
    desiredMembers[standardTestGuestName] = false;
    const standardTestGuest = {
        rsvpname: standardTestGuestName,
        pin: standardTestGuestPIN,
        hasPlusOne: false,
        members: desiredMembers
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
                    'rsvpname': standardTestGuestName.toLowerCase(),
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
    test('Get item works with lower case', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            this.rsvp.get(standardTestGuestName.toLowerCase(), standardTestGuestPIN, (err, guestData) =>{
                assert.deepEqual(guestData, standardTestGuest);
                done();
            });
        });
    });

    function testBadGet(rsvp, name, pin, done){
        createStandardTestGuest(rsvp, (err, data)=>{
            rsvp.get(name, pin, (err, guestData) =>{
                assert(err, 'Should have an error');
                assert(!guestData, 'Shouldn\'t send anything back');
                done();
            });
        });
    }

    test('Invalid PIN Get item errors out', (done) => {
        testBadGet(this.rsvp, standardTestGuestName, '90210', done);
    });

    test('Invalid Name Get item errors out', (done) => {
        testBadGet(this.rsvp, 'Invalid Name', standardTestGuestPIN, done);
    });

    test('Invalid item Get item errors out', (done) => {
        testBadGet(this.rsvp, 'Invalid Name', '90210', done);
    });

    //Test Update
    test('Update works', (done) => {
        createStandardTestGuest(this.rsvp, (err, data)=>{
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {}
            };
            params.members[standardTestGuestName] = true;

            this.rsvp.update(params, (err, data)=>{
                this.rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    assert.deepEqual(guestData.members, params.members);
                    done();
                });
            });
        });
    });

    function testBadUpdate(rsvp, name, pin, done){
        createStandardTestGuest(rsvp, (err, data)=>{
            let params = {
                rsvpname: name,
                pin: pin,
                members: {}
            };
            params.members[name] = true;

            rsvp.update(params, (err, data)=>{
                rsvp.get(name, pin, (err, guestData)=>{
                    assert(err, 'Should have an error');
                    assert(!guestData, 'Shouldn\'t send anything back');
                    done();
                });
            });
        });
    }
    test('Invalid name update fails', (done) => {
        testBadUpdate(this.rsvp, 'Invalid Name', standardTestGuestPIN, done);
    });

    test('Invalid pin update fails', (done) => {
        testBadUpdate(this.rsvp, standardTestGuestName, '90210', done);
    });

    test('Add plus one works', (done) => {
        assert.fail('Need to implement');
        rsvp.addItem(standardTestGuest, next);
    });

    test('No plus one for people with plus ones', (done) => {
        assert.fail('Need to implement');
        rsvp.addItem(standardTestGuest, next);
    });

    test('Remove plus one works', (done) => {
        assert.fail('Need to implement');
        rsvp.addItem(standardTestGuest, next);
    });

    function testPlusOne(rsvp, going, hasPlusOne, plusOneName, done){
        createStandardTestGuest(rsvp, (err, data)=>{
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {}
            };
            params.members[standardTestGuestName] = going;
            if(hasPlusOne){
                params.hasPlusOne = hasPlusOne;
            }
            if(plusOneName){
                params.plusOneName = plusOneName;
            }

            rsvp.update(params, (err, data)=>{
                rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    assert(!guestData.hasPlusOne,
                        'We shouldn\'t be able to change if we are allowed a plus one');
                    assert(!guestData.hasOwnProperty('plusOneName'),
                        'We shouldn\' have been able to add a plus one');
                    done();
                });
            });
        });
    }

    test('Don\'t allow us to change has plus one', (done) => {
        testPlusOne(this.rsvp, false, true, undefined, done);
    });

    test('Don\'t allow us to change has plus one if we are going', (done) => {
        testPlusOne(this.rsvp, true, true, undefined, done);
    });

    test('Don\'t allow us to add a plus one', (done) => {
        testPlusOne(this.rsvp, false, true, 'Wedding Crasher', done);
    });

    test('Don\'t allow us to add a plus one even if we are going', (done) => {
        testPlusOne(this.rsvp, true, true, 'Wedding Crasher', done);
    });

    test('Don\'t allow us to add a plus one even if we don\'t modify hasPlusOne', (done) => {
        testPlusOne(this.rsvp, false, false, 'Wedding Crasher', done);
    });

    test('Don\'t allow us to add a plus one even if we are going and we don\'t modify hasPlusOne',
        (done) => {
            testPlusOne(this.rsvp, true, false, 'Wedding Crasher', done);
        });

    function messWithMembers(rsvp, members, done){
        createStandardTestGuest(rsvp, (err, data)=>{
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: members
            };

            rsvp.update(params, (err, data)=>{
                console.log(err, data);
                rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    console.log(err, guestData);
                    assert.equal(Object.getOwnPropertyNames(guestData.members).length, 1,
                        'Shouldn\'t be able to add items');
                    assert(!guestData.members.hasOwnProperty('Invalid Name'),
                        'Shouldn\'t be able to add an invalid name');
                    done();
                });
            });
        });
    }
    test('Don\'t allow us to change member names', (done) => {
        let badMembers = {};
        badMembers['Invalid Name'] = true;

        messWithMembers(this.rsvp, badMembers, done);
    });

    test('Don\'t allow us to change the number of members', (done) => {
        let badMembers = {};
        badMembers[standardTestGuestName] = true;
        badMembers['Invalid Name'] = true;

        messWithMembers(this.rsvp, badMembers, done);
    });

    test('Don\'t allow us to change member names', (done) => {
        let badMembers = {};
        badMembers['Invalid Name'] = false;

        messWithMembers(this.rsvp, badMembers, done);
    });

    test('Don\'t allow us to change the number of members', (done) => {
        let badMembers = {};
        badMembers[standardTestGuestName] = false;
        badMembers['Invalid Name'] = false;

        messWithMembers(this.rsvp, badMembers, done);
    });
});
