import Contract from './contract';
import './flightsurety.css';

window.addEventListener('load', async () => {
    let contract = new Contract();
    await contract.initialize('localhost');

    let dataContractAddress = await contract.getDataContractAddress();
    document.getElementById('data-contract-address').value = dataContractAddress;

    let appContractAddress = await contract.getAppContractAddress();
    document.getElementById('app-contract-address').value = appContractAddress;
    document.getElementById('address-to-authorize').value = appContractAddress;

    let dataContractOperational = await contract.isDataContractOperational();
    document.getElementById('data-contract-operational-status').checked = dataContractOperational;

    let appContractOperational = await contract.isAppContractOperational();
    document.getElementById('app-contract-operational-status').checked = appContractOperational;

    document.getElementById('set-data-operational-status').addEventListener('click', async () => {
        let status = document.getElementById('data-contract-operational-status').checked;
        await contract.setDataContractOperationalStatus(status);
    });

    document.getElementById('set-app-operational-status').addEventListener('click', async () => {
        let status = document.getElementById('app-contract-operational-status').checked;
        await contract.setAppContractOperationalStatus(status);
    });

    document.getElementById('authorize-address').addEventListener('click', async () => {
        let address = document.getElementById('address-to-authorize').value;
        await contract.authorizeAddress(address);
    });

    document.getElementById('get-airline').addEventListener('click', async () => {
        let airlineAddress = document.getElementById('airline-address').value;
        let result = await contract.getAirline(airlineAddress);
        document.getElementById('airline-name').value = result.name;
        document.getElementById('airline-registered').checked = result.isRegistered;
        document.getElementById('airline-funded').checked = result.isFunded;
        document.getElementById('airline-funded-amount').value = result.fudnedAmount;
    });

    document.getElementById('register-airline').addEventListener('click', async () => {
        let airlineAddress = document.getElementById('register-airline-address').value;
        let airlineName = document.getElementById('register-airline-name').value;
        await contract.registerAirline(airlineAddress, airlineName);
    });

    document.getElementById('fund-airline').addEventListener('click', async () => {
        let airlineAddress = document.getElementById('fund-airline-address').value;
        let amount = document.getElementById('fund-airline-amount').value;
        await contract.fundAirline(airlineAddress, amount);
    });

    document.getElementById('get-flight').addEventListener('click', async () => {
        let flightNumber = document.getElementById('flight-number').value;
        let result = await contract.getFlight(flightNumber);
        document.getElementById('flight-airline').value = result.airline;
        let date = new Date(result.timestamp*1000);
        document.getElementById('flight-date').value = date.toLocaleDateString() + " " + date.toLocaleTimeString();
        document.getElementById('flight-status').value = result.statusCode;
    });

    document.getElementById('request-flight-status').addEventListener('click', async () => {
        let flightNumber = document.getElementById('register-flight-number').value;
        await contract.requestFlightStatus(flightNumber);
    });

    document.getElementById('register-flight').addEventListener('click', async () => {
        let flightNumber = document.getElementById('register-flight-number').value;
        let date = document.getElementById('register-flight-date').value;
        let dateTimestamp = Date.parse(date)/1000;
        await contract.registerFlight(flightNumber, dateTimestamp);
    });

    document.getElementById('buy-insurance').addEventListener('click', async () => {
        let flightNumber = document.getElementById('buy-insurance-flight').value;
        let amount = document.getElementById('buy-insurance-amount').value;
        await contract.buyInsurance(flightNumber, amount);
    });

    document.getElementById('get-balance').addEventListener('click', async () => {
        let balance = await contract.getBalance();
        document.getElementById('balance').value = balance;
    });

    document.getElementById('withdraw-balance').addEventListener('click', async () => {
        await contract.withdrawBalance();
    });

    document.getElementById('set-status-unknown').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=0', {
            method: 'POST',
            mode: 'no-cors'
        });
    });

    document.getElementById('set-status-on-time').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=10', {
            method: 'POST',
            mode: 'no-cors'
        });
    });

    document.getElementById('set-status-late-airline').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=20', {
            method: 'POST',
            mode: 'no-cors'
        });
    });

    document.getElementById('set-status-late-weather').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=30', {
            method: 'POST',
            mode: 'no-cors'
        });
    });

    document.getElementById('set-status-late-technical').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=40', {
            method: 'POST',
            mode: 'no-cors'
        });
    });

    document.getElementById('set-status-late-other').addEventListener('click', async () => {
        await fetch('http://localhost:3000/api/status?statusCode=50', {
            method: 'POST',
            mode: 'no-cors'
        });
    });
});

