// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 public constant STATUS_CODE_UNKNOWN = 0;
    uint8 public constant STATUS_CODE_ON_TIME = 10;
    uint8 public constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 public constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 public constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 public constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;      // Account used to deploy contract
    bool private operational = true;    // Blocks all state changes throughout the contract if false

    mapping(address => bool) authorizedCallers;

    struct Airline {
        string name;
        bool isRegistered;
        bool isFunded;
        uint256 fundedAmount;
    }

    mapping(address => Airline) public airlines;
    uint256 public airlineCounter = 0;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 timestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;

    struct Insurance {
        address insuree;
        uint256 amount;
        uint256 amountToPay;
        bool eligible;
    }
    mapping(bytes32 => Insurance[]) private insurances;

    mapping(address => uint256) private balance;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Constructor
    *   The deploying account becomes contractOwner
    */
    constructor(address firstAirline, string memory firstAirlineName) {
        contractOwner = msg.sender;
        _registerAirline(firstAirline, firstAirlineName);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *   This is used on all state changing functions to pause the contract in 
    *   the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsAuthorized() {
        require(authorizedCallers[msg.sender], "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *   When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperationalStatus(bool mode) external requireContractOwner {
        require(operational != mode, "Operational status is already on that mode");
        operational = mode;
    }

    function authorizeCaller(address _address) external requireContractOwner {
        require(!authorizedCallers[_address], "Caller already authorized");
        authorizedCallers[_address] = true;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
    * @dev Add an airline to the registration queue
    *   Can only be called from FlightSuretyApp contract
    */   
    function registerAirline(address airlineAddress, string memory name) external requireIsOperational requireIsAuthorized {
       _registerAirline(airlineAddress, name);
    } 

    function _registerAirline(address airlineAddress, string memory name) internal requireIsOperational {
        require(!airlines[airlineAddress].isRegistered, "Airline already registered");
        airlines[airlineAddress].isRegistered = true;
        airlines[airlineAddress].name = name;
        airlineCounter++;
    }

    /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *   resulting in insurance payouts, the contract should be self-sustaining
    */   
    function fundAirline(address airline) public payable requireIsOperational requireIsAuthorized {
        require(isAirlineRegistered(airline), "Airline not registered");
        airlines[airline].fundedAmount += msg.value;
    }

    function setAirlineFunded(address airline, bool funded) external requireIsOperational requireIsAuthorized {
        airlines[airline].isFunded = funded;
    } 

    function isAirlineRegistered(address airline) public view returns(bool) {
        return airlines[airline].isRegistered;
    }

    function isAirlineFunded(address airline) public view returns(bool) {
        return airlines[airline].isFunded;
    }

    function getAirlineFundedAmount(address airline) public view returns(uint256) {
        return airlines[airline].fundedAmount;
    }

    function getAirlinesCount() public view returns(uint256) {
        return airlineCounter;
    }

    function getAirlineInformation(address airline) external view returns (string memory, bool, bool, uint256){
        string memory name = airlines[airline].name;
        bool isRegistered = airlines[airline].isRegistered;
        bool isFunded = airlines[airline].isFunded;
        uint256 fundedAmount = airlines[airline].fundedAmount;
        return (name, isRegistered, isFunded, fundedAmount);
    }

    function registerFlight(string memory flight, uint256 timestamp, address airline) external requireIsOperational requireIsAuthorized {
        bytes32 flightKey = getFlightKey(flight);
        require(!flights[flightKey].isRegistered, "Fligh already registered");
        flights[flightKey] = Flight({
            isRegistered: true,
            statusCode: STATUS_CODE_UNKNOWN,
            timestamp: timestamp,
            airline: airline
        });
    }

    function flightIsRegistered(string memory flight) external view returns(bool) {
        bytes32 flightKey = getFlightKey(flight);
        return flights[flightKey].isRegistered;
    }

    function setFlightStatus(string memory flight, uint8 statusCode) external requireIsOperational requireIsAuthorized {
        bytes32 flightKey = getFlightKey(flight);
        require(flights[flightKey].isRegistered, "Flight not registered");
        flights[flightKey].statusCode = statusCode;
    }
    
    function getFlightKey(string memory flight) pure internal returns(bytes32) {
        return keccak256(abi.encodePacked(flight));
    }

    function getFlightInformation(string memory flight) external view returns(bool, uint8, uint256, address) {
        bytes32 flightKey = getFlightKey(flight);
        bool isRegistered = flights[flightKey].isRegistered;
        uint8 statusCode = flights[flightKey].statusCode;
        uint256 timestamp = flights[flightKey].timestamp;
        address airline = flights[flightKey].airline;
        return (isRegistered, statusCode, timestamp, airline); 
    }

    /**
    * @dev Buy insurance for a flight
    */   
    function buyInsurance(string memory flight, address insuree, uint256 amountToPay) external payable requireIsOperational requireIsAuthorized {
        bytes32 flightKey = getFlightKey(flight);
        require(!hasInsuranceForFlight(flight, msg.sender), "Already bought insurace for that flight");
        insurances[flightKey].push(Insurance({
            insuree: insuree,
            amount: msg.value,
            amountToPay: amountToPay,
            eligible: false
        }));
    }

    function hasInsuranceForFlight(string memory flight, address insuree) public view returns (bool) {
        bytes32 flightKey = getFlightKey(flight);
        for (uint256 i = 0; i < insurances[flightKey].length; i++) {
            if (insurances[flightKey][i].insuree == insuree) {
                return true;
            }
        }
        return false;
    }

    /**
    *  @dev Credits payouts to insurees
    */
    function creditInsurees(string memory flight) external requireIsOperational requireIsAuthorized {
        bytes32 flightKey = getFlightKey(flight);
        for (uint256 i = 0; i < insurances[flightKey].length; i++) {
            if (!insurances[flightKey][i].eligible) {
                insurances[flightKey][i].eligible = true;
                address insuree = insurances[flightKey][i].insuree;
                balance[insuree] += insurances[flightKey][i].amountToPay;
            }
        }
    }

    function getBalance() external view returns (uint256) {
        return balance[msg.sender];
    }
    
    /**
    *  @dev Transfers eligible payout funds to insuree
    */
    function payInsurance(address insuree) external requireIsOperational requireIsAuthorized {
        require(balance[insuree] > 0, "You have no balance");
        uint256 amount = balance[insuree];
        balance[insuree] = 0;
        payable(insuree).transfer(amount);
    }

    /**
    * @dev Fallback function for funding smart contract.
    */
    fallback() external payable {
        fundAirline(msg.sender);
    }

    receive() external payable {
        fundAirline(msg.sender);
    }
}
