# Caliber Payment

A Solana program for handling decentralized payments with price-based order matching and protocol fees.

## Overview

Caliber Payment is a Solana program that enables users to create, match, and settle payment orders between different tokens using Pyth price feeds. The program supports protocol fees and administrator controls for token whitelisting. 

## Features

- Create payment orders with specified token pairs
- Match orders based on Pyth oracle price feeds
- Protocol fee collection system
- Token whitelisting with admin controls
- Partial and full order matching
- Order expiration handling

## Order Matching Mechanism

### Partial Order Matching

The program supports partial order matching to provide flexibility in order execution. There are two scenarios for partial matching:

1. **Partial Match from Order Side**
   - When a user wants to match with a smaller amount than the full order
   - The original order remains active with the remaining balance
   - Example:
     - Order has 10 SOL to sell
     - User matches with 4 SOL
     - Order keeps 6 SOL available for future matches

2. **Partial Match from User Side** 
   - When a user provides more tokens than needed for the order
   - Only the required amount is transferred
   - Example:
     - Order wants to buy 5 USDC worth of SOL
     - User provides 10 USDC
     - Only 5 USDC is transferred, user keeps remaining 5 USDC

The matching process:
- Calculates equivalent amounts using Pyth price feeds
- Validates price ranges are within order constraints
- Transfers the smaller of:
  - Available amount in the order
  - Amount provided by matching user
- Updates order state to track remaining amounts
- Emits events with match details

This partial matching system enables:
- More efficient order filling
- Better liquidity utilization
- Flexibility for users with different amount requirements


### Protocol Fee Mechanism

The protocol implements a fee system that:
- Charges a percentage fee on the token Y (receiving token) amount in each match
- Fee is collected at the time of order matching
- Fees are sent to a designated fee recipient account

The fee calculation and collection process:
1. Fee percentage is configured at the protocol level
2. When an order is matched:
   - The Y token amount for the match is determined
   - Protocol fee is calculated as: y_amount * fee_rate
   - Fee amount is transferred from the matching user to fee recipient
   - The remaining amount goes to the order

Example:
- Protocol fee rate: 1%
- Order match amount: 100 USDC
- Fee charged: 1 USDC to fee recipient
- Net amount to order: 101 USDC

Benefits:
- Sustainable protocol revenue model
- Transparent fee structure
- Automated fee collection
- Configurable fee rates by admin

The collected fees can be claimed by the protocol admin using the `admin_claim_fee` instruction.


### Core Components

1. **Config**: Manages protocol-wide settings including:
   - Admin authority
   - Fee recipient
   - Protocol fee rate

2. **AllowedTokenConfig**: Handles whitelisted tokens with:
   - Token mint address
   - Pyth oracle configuration
   - Enabled/disabled status

3. **Orders**: Manages payment orders with:
   - Token pair information
   - Price range constraints
   - Order amounts and status

### Instructions

#### Admin Instructions

- `admin_initialize`: Initialize the protocol configuration
- `admin_add_allowed_token`: Whitelist a new token with Pyth oracle
- `admin_update_allowed_token_enabled_status`: Enable/disable tokens
- `admin_update_allowed_token_oracle`: Update Pyth oracle settings
- `admin_claim_fee`: Withdraw collected protocol fees

#### User Instructions

- `user_create_order`: Create a new payment order
- `user_match_order`: Match and execute an existing order
- `user_finish_order`: Complete and close an order

## Dependencies

- Anchor Framework v0.29.0
- Node.js v20.12.2
- Solana CLI v1.18.11
- Rustc v1.79.0
- Pyth Price Feeds
- SPL Token Program

## Building
```bash
anchor build
```

## Testing
```bash
anchor test
```

## Event Notification system
## Event Notification System

The event notification system consists of three main components:

### 1. Smart Contract Events

The smart contract emits events for important actions:

- `CreateOrderEvent`: When a new order is created
- `MatchOrderEvent`: When an order is matched/executed 
- `FinishOrderEvent`: When an order is completed

Each event contains relevant data like order ID, amounts, timestamps, and user addresses.

### 2. Event Crawler Service

A dedicated crawler service monitors the blockchain for program events, example in `scripts/event_notification.ts`. After getting the event from blockchain, the crawler can call backend API to forward the event, or publish the event to a message queue for later processing.

### 3. Backend Service

The backend service receives events from the crawler service, and then sends email notifications to the users. The backend service can have functions for managing user accounts, and sending email notifications.