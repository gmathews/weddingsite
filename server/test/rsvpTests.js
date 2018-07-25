const assert = require('assert');

suite('String#split', function(){
    // setup();
    // teardown();
    // suiteSetup();//Before each
    // suiteTeardown();//After each
    test('should return an array', function(done){
        assert(Array.isArray('a,b,c'.split(',')));
        done();
    });
});
