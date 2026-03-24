// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Escrow
 * @dev A simple escrow contract where a depositor sends funds, and an arbiter
 * can release them to a beneficiary or refund the depositor.
 * This contract is for demonstration purposes.
 */
contract Escrow {

    address public depositor;
    address public beneficiary;
    address public arbiter;

    uint256 public amount;
    bool public isFunded;
    bool public isReleased;

    event Funded(uint256 amount);
    event Released(uint256 amount);
    event Refunded(uint256 amount);

    /**
     * @dev Sets the beneficiary and arbiter of the escrow.
     * The depositor is the address that deploys the contract.
     * @param _beneficiary The address of the beneficiary who will receive the funds.
     * @param _arbiter The address of the arbiter who can resolve the transaction.
     */
    constructor(address _beneficiary, address _arbiter) payable {
        require(_beneficiary != address(0), "Beneficiary address cannot be zero.");
        require(_arbiter != address(0), "Arbiter address cannot be zero.");
        
        depositor = msg.sender;
        beneficiary = _beneficiary;
        arbiter = _arbiter;

        if (msg.value > 0) {
            amount = msg.value;
            isFunded = true;
            emit Funded(msg.value);
        }
    }

    /**
     * @dev Allows the depositor to deposit funds into the escrow after deployment.
     * The amount sent with the transaction will be held in the contract.
     * Can only be called once if not funded at deployment.
     */
    function deposit() external payable {
        require(msg.sender == depositor, "Only the depositor can deposit funds.");
        require(!isFunded, "Contract has already been funded.");
        require(msg.value > 0, "Deposit amount must be greater than zero.");
        
        amount = msg.value;
        isFunded = true;
        emit Funded(amount);
    }

    /**
     * @dev Allows the arbiter to release the funds to the beneficiary.
     * Can only be called if the contract is funded and funds have not been released.
     */
    function release() external {
        require(msg.sender == arbiter, "Only the arbiter can release funds.");
        require(isFunded, "Contract is not funded yet.");
        require(!isReleased, "Funds have already been released.");

        isReleased = true;
        uint256 balance = address(this).balance;
        (bool success, ) = beneficiary.call{value: balance}("");
        require(success, "Failed to send funds to the beneficiary.");

        emit Released(balance);
    }

    /**
     * @dev Allows the arbiter to refund the funds to the depositor.
     * Can only be called if the contract is funded and funds have not been released.
     */
    function refund() external {
        require(msg.sender == arbiter, "Only the arbiter can refund funds.");
        require(isFunded, "Contract is not funded yet.");
        require(!isReleased, "Funds have already been released.");

        isReleased = true;
        uint256 balance = address(this).balance;
        (bool success, ) = depositor.call{value: balance}("");
        require(success, "Failed to send funds back to the depositor.");

        emit Refunded(balance);
    }

    /**
     * @dev Gets the current balance of the escrow contract.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
