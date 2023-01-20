
const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  const TEST_ORACLES_COUNT = 20;

  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;

  let config;

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  it(`(operational) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(operational) blocks access to setOperationalStatus() for non-Contract Owner account`, async function () {
      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try {
          await config.flightSuretyData.setOperationalStatus(false, { from: config.testAddresses[2] });
      } catch(e) {
          accessDenied = true;
      }
      let status = await config.flightSuretyData.isOperational.call();

      assert.equal(status, true, "Incorrect operating status value");
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(operational) allows access to setOperationalStatus() for Contract Owner account`, async function () {
      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try {
          await config.flightSuretyData.setOperationalStatus(false, { from: config.owner });
      } catch(e) {
          accessDenied = true;
      }
      let status = await config.flightSuretyData.isOperational.call();

      assert.equal(status, false, "Incorrect operating status value");
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(operational) blocks access to functions using requireIsOperational when operating status is false`, async function () {
      try {
        await config.flightSuretyData.setOperationalStatus(false);
      } catch(e) {}

      let reverted = false;
      try  {
        let amount = web3.utils.toWei("9.99", "ether");
        await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: amount});
      } catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperationalStatus(true);
  });

  it('(airline) cannot register an airline if caller is not an airline', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: config.owner});
    } catch(e) {
      // console.log(e);
    }
    let registered = await config.flightSuretyData.isAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(registered, false);
  });

  it('(airline) cannot register an airline using if caller is not funded', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: config.firstAirline});
    } catch(e) {
      // console.log(e);
    }
    let registered = await config.flightSuretyData.isAirlineRegistered.call(newAirline); 

    // ASSERT
    assert.equal(registered, false);
  });

  it('(airline) cannot fund an airline with less then 10 eth', async () => {
    // ARRANGE
    let amount = web3.utils.toWei("9.99", "ether");

    // ACT
    try {
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: amount});
    } catch(e) {
      // console.log(e);
    }
    let funded = await config.flightSuretyData.isAirlineFunded(config.firstAirline);

    // ASSERT
    assert.equal(funded, false);
  });

  it('(airline) can fund an airline with 10 eth', async () => {
    // ARRANGE
    let amount = web3.utils.toWei("10", "ether");

    // ACT
    try {
      await config.flightSuretyApp.fundAirline(config.firstAirline, {from: config.firstAirline, value: amount});
    } catch(e) {
      console.log(e);
    }
    let funded = await config.flightSuretyData.isAirlineFunded(config.firstAirline);

    // ASSERT
    assert.equal(funded, true);
  });

  it('(airline) can instantly register an airline if there are less than 4 total airlines', async () => {
    // ARRANGE
    let newAirline1 = accounts[2];
    let newAirline2 = accounts[3];
    let newAirline3 = accounts[4];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline1, 'test', {from: config.firstAirline});
      await config.flightSuretyApp.registerAirline(newAirline2, 'test', {from: config.firstAirline});
      await config.flightSuretyApp.registerAirline(newAirline3, 'test', {from: config.firstAirline});
    } catch(e) {
      // console.log(e);
    }
    let registered1 = await config.flightSuretyData.isAirlineRegistered(newAirline1);
    let registered2 = await config.flightSuretyData.isAirlineRegistered(newAirline2);
    let registered3 = await config.flightSuretyData.isAirlineRegistered(newAirline3);

    // ASSERT
    assert.equal(registered1, true);
    assert.equal(registered2, true);
    assert.equal(registered3, true);
  });

  it('(airline) requires 50% of airlines to vote to register a new airline after there are 4 or more airlines', async () => {
    // ARRANGE
    let amount = web3.utils.toWei("10", "ether");
    let airline2 = accounts[2];
    await config.flightSuretyApp.fundAirline(airline2, {from: airline2, value: amount});
    let newAirline = accounts[5];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: config.firstAirline});
      await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: config.firstAirline});
      await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: config.firstAirline});
    } catch(e) {
      // console.log(e);
    }
    let registered1 = await config.flightSuretyData.isAirlineRegistered(newAirline);

    await config.flightSuretyApp.registerAirline(newAirline, 'test', {from: airline2});
    let registered2 = await config.flightSuretyData.isAirlineRegistered(newAirline);

    let votes = await config.flightSuretyApp.getRegisterAirlineVotes(newAirline);

    // ASSERT
    assert.equal(registered1, false);
    assert.equal(registered2, true);
    assert.equal(votes, 2);
  });

  it('(airline) can register a flight', async () => {
    // ARRANGE
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // ACT
    await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.firstAirline });
    let result = await config.flightSuretyData.getFlightInformation(flight);

    // ASSERT
    assert(result[0], true);
  });

  it('(insurance) can buy insurance for a flight', async () => {
    // ARRANGE
    let flight = 'ND1309';
    let amount = web3.utils.toWei('1', 'ether');

    // ACT
    await config.flightSuretyApp.buyInsurance(flight, { from: config.firstAirline, value: amount});
    let result = await config.flightSuretyData.hasInsuranceForFlight(flight, config.firstAirline, { from: config.firstAirline });

    // ASSERT
    assert.equal(result, true);
  });

  it('(oracles) can register oracles', async () => {
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      // console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('(oracles) can request flight status', async () => {
    // ARRANGE
    let flight = 'ND1309';
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.requestFlightStatus(flight);
    
    // ACT
    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    let statusCode = STATUS_CODE_ON_TIME;
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});

      for(let idx=0; idx<3; idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], flight, timestamp, statusCode, { from: accounts[a] });
        } catch(e) {
          // Enable this when debugging
          //  console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
          //  console.log(e);
        }
      }
    }

    let result = await config.flightSuretyData.getFlightInformation(flight, { from: config.firstAirline });
    let balance = await config.flightSuretyData.getBalance({ from: config.firstAirline} );
    assert.equal(result[1].toString(), statusCode);
    assert.equal(balance.toString(), "0");
  });

  it('(oracles) credits 1.5 times the amount insureed if the flight was delayed', async () => {
    // ARRANGE
    let flight = 'ND1310';
    let timestamp = Math.floor(Date.now() / 1000);
    await config.flightSuretyApp.registerFlight(flight, timestamp, { from: config.firstAirline });
    let amount = web3.utils.toWei('1', 'ether');
    await config.flightSuretyApp.buyInsurance(flight, { from: config.firstAirline, value: amount});

    await config.flightSuretyApp.requestFlightStatus(flight);
    
    // ACT
    let statusCode = STATUS_CODE_LATE_AIRLINE;
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {

      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});

      for(let idx=0; idx<3; idx++) {
        try {
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], flight, timestamp, statusCode, { from: accounts[a] });
        } catch(e) {
          // Enable this when debugging
          //  console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp);
        }
      }
    }

    let result = await config.flightSuretyData.getFlightInformation(flight, { from: config.firstAirline });
    let balance = await config.flightSuretyData.getBalance({ from: config.firstAirline} );
    assert.equal(result[1].toString(), statusCode);
    
    let expectedBalance = web3.utils.toWei("1.5", "ether");
    assert.equal(balance.toString(), expectedBalance);
  });

  it('(insurance) can withdraw credit', async () => {
    // ARRANGE
    let flight = 'ND1310';

    // ACT
    let balanceBefore = web3.utils.toBN(await web3.eth.getBalance(config.firstAirline));
    let receipt = await config.flightSuretyApp.withdraw({ from: config.firstAirline });
    let tx = await web3.eth.getTransaction(receipt.tx);
    let balanceAfter = web3.utils.toBN(await web3.eth.getBalance(config.firstAirline));
    let gasUsed = web3.utils.toBN(receipt.receipt.gasUsed);
    let gasPrice = web3.utils.toBN(tx.gasPrice);
    let gasCost = gasUsed.mul(gasPrice);

    // ASSERT
    let creditAmount = web3.utils.toBN(web3.utils.toWei("1.5", "ether"));
    assert.equal(balanceAfter.toString(), balanceBefore.sub(gasCost).add(creditAmount).toString());
  });
});
