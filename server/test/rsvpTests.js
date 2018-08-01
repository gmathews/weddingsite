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
        rsvp.addItem(standardTestGuest, true, next);
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

    function testUpdate(rsvp, coming, done){
        createStandardTestGuest(rsvp, (err, data)=>{
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {}
            };
            params.members[standardTestGuestName] = coming;

            rsvp.update(params, (err, data)=>{
                assert.equal(data.coming, coming);
                assert.equal(data.name, 'Test');// Make sure it is capital and correct
                rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    assert.deepEqual(guestData.members, params.members);
                    done();
                });
            });
        });
    }
    //Test Update
    test('Update works', (done) => {
        testUpdate(this.rsvp, true, done);
    });
    test('Update not coming works', (done) => {
        testUpdate(this.rsvp, false, done);
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

    function allowPlusOne(rsvp, guestName, done){
        let allowedPlusOneGuest = {
            rsvpname: standardTestGuestName,
            pin: standardTestGuestPIN,
            hasPlusOne: true,
            members: desiredMembers
        };
        rsvp.addItem(allowedPlusOneGuest, true, (err, data) => {
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {},
                plusOneName: guestName
            };

            params.members[standardTestGuestName] = true;
            rsvp.update(params, (err, data)=>{
                rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    if(guestName){
                        assert.equal(guestData.plusOneName, guestName);
                    }else{
                        assert(!guestData.hasOwnProperty('plusOneName'),
                            'We shouldn\'t have added a plus one');
                    }
                    done();
                });
            });
        });
    }

    test('Add plus one works', (done) => {
        allowPlusOne(this.rsvp, 'My Date', done);
    });

    test('No plus one for people with plus ones', (done) => {
        allowPlusOne(this.rsvp, '', done);
    });

    test('Remove plus one works', (done) => {
        allowPlusOne(this.rsvp, 'My Date', (err, data) => {
            // Remove our guest
            let params = {
                rsvpname: standardTestGuestName,
                pin: standardTestGuestPIN,
                members: {},
                plusOneName: ''
            };
            params.members[standardTestGuestName] = true;
            this.rsvp.update(params, (err, data)=>{
                this.rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
                    assert(!guestData.hasOwnProperty('plusOneName'),
                        'We should have removed our plus one');
                    done();
                });
            });
        });
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
                        'We shouldn\'t have been able to add a plus one');
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
                rsvp.get(standardTestGuestName, standardTestGuestPIN, (err, guestData)=>{
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

    // CSV generation
    test('Uneven rows work', (done) => {
        // Guest that has 0 going and 3 not going
        const guest0G3N = {
            rsvpname: '0Going 3Not',
            pin: standardTestGuestPIN,
            hasPlusOne: false,
            members: {
                '0Going 3Not': false,
                '0Going 3Not1': false,
                '0Going 3Not2': false
            }
        };
        this.rsvp.addItem(guest0G3N, true, () =>{
            // Guest that has 1 going and 0 not going
            const guest1G0N = {
                rsvpname: '0Going 1Not',
                pin: standardTestGuestPIN,
                hasPlusOne: false,
                members: {
                    '0Going 1Not': false
                }
            };
            this.rsvp.addItem(guest1G0N, true, () =>{
                // Guest that has 1 going and 1 not going
                const guest1G1N = {
                    rsvpname: '1Going 1Not',
                    pin: standardTestGuestPIN,
                    hasPlusOne: false,
                    members: {
                        '1Going 1Not': true,
                        '1Going 1Not1': false
                    }
                };
                this.rsvp.addItem(guest1G1N, true, () =>{
                    // Guest that has 2 going and 0 not going
                    const guest2G0N = {
                        rsvpname: '2Going 0Not',
                        pin: standardTestGuestPIN,
                        hasPlusOne: false,
                        members: {
                            '2Going 0Not': true,
                            '2Going 0Not1': true
                        }
                    };
                    this.rsvp.addItem(guest2G0N, true, () => {
                        this.rsvp.all((err, data) => {
                            // Make sure it is all right
                            let lines = data.split('\n');
                            // First line should be our header
                            assert.equal(lines[0], 'Going,Not Going');

                            // Find this item
                            let index = lines.indexOf('1Going 1Not,1Going 1Not1');
                            assert.notEqual(index, -1, 'Make sure we lined up correctly');
                            assert.equal(lines[index + 1], ',', 'We should end the group here');

                            // Find this item
                            index = lines.indexOf(',0Going 1Not');
                            assert.notEqual(index, -1, 'Make sure we lined up correctly');
                            assert.equal(lines[index + 1], ',', 'We should end the group here');

                            // Find this item
                            index = lines.indexOf('2Going 0Not,');
                            assert.notEqual(index, -1, 'Make sure we lined up correctly');
                            assert.equal(lines[index + 1], ',', 'We should end the group here');
                            // Our logic counts the guests in reverse
                            assert.equal(lines[index - 1], '2Going 0Not1,', 'We should have more entries');
                            assert.equal(lines[index - 2], ',', 'We should end the group here');

                            // Find this item
                            index = lines.indexOf(',0Going 3Not');
                            assert.notEqual(index, -1, 'Make sure we lined up correctly');
                            assert.equal(lines[index + 1], ',', 'We should end the group here');
                            // Our logic counts the guests in reverse
                            assert.equal(lines[index - 1], ',0Going 3Not1', 'We should have more entries');
                            assert.equal(lines[index - 2], ',0Going 3Not2', 'We should have more entries');
                            assert.equal(lines[index - 3], ',', 'We should end the group here');
                            done();
                        });
                    });
                });
            });
        });
    });
});
