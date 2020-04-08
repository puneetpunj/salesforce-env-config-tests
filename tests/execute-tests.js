
const { runMochaTests } = require('../lib/mocha-setup');
const { buildTests } = require('./define-tests');

(async () => {

    await buildTests();

    try {
        const result = await runMochaTests()
        console.log(result);
    }
    catch (e) { console.log(e) }
})()
