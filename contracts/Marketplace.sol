// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Marketplace
 * @dev Escrow-based NFT marketplace for ArtiSol
 * 
 * Flow:
 * 1. Seller lists NFT with price (must approve marketplace first)
 * 2. Buyer purchases - ETH goes to escrow, NFT is locked
 * 3. Seller ships physical product
 * 4. Buyer confirms delivery - NFT transfers to buyer, ETH releases to seller
 * 5. If dispute: owner can refund buyer or release to seller
 */
contract Marketplace is Ownable, ReentrancyGuard {
    
    // Purchase status enum
    enum PurchaseStatus {
        NONE,           // Not purchased
        ESCROW,         // Buyer paid, waiting for delivery
        DELIVERED,      // Seller marked as delivered
        COMPLETED,      // Buyer confirmed, NFT transferred, funds released
        REFUNDED,       // Buyer refunded
        DISPUTED        // Under dispute
    }

    struct Listing {
        address seller;
        uint256 priceWei;
        bool active;    // Is the listing active
    }

    struct Purchase {
        address buyer;
        uint256 amountPaid;
        PurchaseStatus status;
        uint256 purchaseTime;
        uint256 deliveryTime;
        uint256 completionTime;
    }

    struct ListingKey {
        address nftContract;
        uint256 tokenId;
    }

    // Events
    event Listed(address indexed seller, address indexed nftContract, uint256 indexed tokenId, uint256 priceWei);
    event ListingCancelled(address indexed seller, address indexed nftContract, uint256 indexed tokenId);
    event Purchased(address indexed buyer, address indexed nftContract, uint256 indexed tokenId, uint256 priceWei);
    event DeliveryMarked(address indexed seller, address indexed nftContract, uint256 indexed tokenId);
    event DeliveryConfirmed(address indexed buyer, address indexed nftContract, uint256 indexed tokenId);
    event TransactionCompleted(address indexed buyer, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 amount);
    event RefundIssued(address indexed buyer, address indexed nftContract, uint256 indexed tokenId, uint256 amount);
    event DisputeRaised(address indexed buyer, address indexed nftContract, uint256 indexed tokenId);
    event DisputeResolved(address indexed nftContract, uint256 indexed tokenId, bool buyerWins);

    // Storage
    mapping(bytes32 => Listing) private _listings;
    mapping(bytes32 => Purchase) private _purchases;
    ListingKey[] private _listingKeys;

    // Platform fee (in basis points, 100 = 1%)
    uint256 public platformFeeBps = 250; // 2.5% platform fee
    uint256 public totalFeesCollected;

    // Auto-release timeout (7 days in seconds)
    uint256 public autoReleaseTimeout = 7 days;

    constructor() Ownable(msg.sender) {}

    // ============ Helper Functions ============

    function _key(address nftContract, uint256 tokenId) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(nftContract, tokenId));
    }

    // ============ View Functions ============

    function listingCount() external view returns (uint256) {
        return _listingKeys.length;
    }

    function getListingByIndex(uint256 index)
        external
        view
        returns (
            address nftContract,
            uint256 tokenId,
            address seller,
            uint256 priceWei,
            bool sold
        )
    {
        ListingKey memory k = _listingKeys[index];
        nftContract = k.nftContract;
        tokenId = k.tokenId;
        bytes32 key = _key(nftContract, tokenId);
        Listing memory l = _listings[key];
        Purchase memory p = _purchases[key];
        
        // sold = true if purchase is completed or in escrow
        bool isSold = p.status == PurchaseStatus.COMPLETED || 
                      p.status == PurchaseStatus.ESCROW ||
                      p.status == PurchaseStatus.DELIVERED;
        
        return (nftContract, tokenId, l.seller, l.priceWei, isSold);
    }

    function getListing(address nftContract, uint256 tokenId)
        external
        view
        returns (address seller, uint256 priceWei, bool sold)
    {
        bytes32 key = _key(nftContract, tokenId);
        Listing memory l = _listings[key];
        Purchase memory p = _purchases[key];
        
        bool isSold = p.status == PurchaseStatus.COMPLETED || 
                      p.status == PurchaseStatus.ESCROW ||
                      p.status == PurchaseStatus.DELIVERED;
        
        return (l.seller, l.priceWei, isSold);
    }

    function getPurchase(address nftContract, uint256 tokenId)
        external
        view
        returns (
            address buyer,
            uint256 amountPaid,
            PurchaseStatus status,
            uint256 purchaseTime,
            uint256 deliveryTime,
            uint256 completionTime
        )
    {
        bytes32 key = _key(nftContract, tokenId);
        Purchase memory p = _purchases[key];
        return (p.buyer, p.amountPaid, p.status, p.purchaseTime, p.deliveryTime, p.completionTime);
    }

    function getFullListingInfo(address nftContract, uint256 tokenId)
        external
        view
        returns (
            address seller,
            uint256 priceWei,
            bool active,
            address buyer,
            PurchaseStatus status,
            uint256 purchaseTime
        )
    {
        bytes32 key = _key(nftContract, tokenId);
        Listing memory l = _listings[key];
        Purchase memory p = _purchases[key];
        return (l.seller, l.priceWei, l.active, p.buyer, p.status, p.purchaseTime);
    }

    // ============ Seller Functions ============

    /**
     * @dev List an NFT for sale. Seller must approve this contract first.
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to list
     * @param priceWei Price in wei
     */
    function listItem(address nftContract, uint256 tokenId, uint256 priceWei) external nonReentrant {
        require(nftContract != address(0), "NFT_ZERO");
        require(priceWei > 0, "PRICE_ZERO");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "NOT_OWNER");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) || 
            nft.getApproved(tokenId) == address(this),
            "NOT_APPROVED"
        );

        bytes32 key = _key(nftContract, tokenId);
        Listing storage existing = _listings[key];
        require(!existing.active, "ALREADY_LISTED");

        _listings[key] = Listing({
            seller: msg.sender,
            priceWei: priceWei,
            active: true
        });
        _listingKeys.push(ListingKey({ nftContract: nftContract, tokenId: tokenId }));

        emit Listed(msg.sender, nftContract, tokenId, priceWei);
    }

    /**
     * @dev Cancel a listing (only if not purchased yet)
     */
    function cancelListing(address nftContract, uint256 tokenId) external nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase memory p = _purchases[key];

        require(l.seller == msg.sender, "NOT_SELLER");
        require(l.active, "NOT_ACTIVE");
        require(p.status == PurchaseStatus.NONE, "ALREADY_PURCHASED");

        l.active = false;

        emit ListingCancelled(msg.sender, nftContract, tokenId);
    }

    /**
     * @dev Seller marks item as delivered (physical product shipped)
     */
    function markDelivered(address nftContract, uint256 tokenId) external nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing memory l = _listings[key];
        Purchase storage p = _purchases[key];

        require(l.seller == msg.sender, "NOT_SELLER");
        require(p.status == PurchaseStatus.ESCROW, "NOT_IN_ESCROW");

        p.status = PurchaseStatus.DELIVERED;
        p.deliveryTime = block.timestamp;

        emit DeliveryMarked(msg.sender, nftContract, tokenId);
    }

    // ============ Buyer Functions ============

    /**
     * @dev Buy an NFT - funds go to escrow
     * @param nftContract Address of the NFT contract
     * @param tokenId Token ID to buy
     */
    function buyItem(address nftContract, uint256 tokenId) external payable nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase storage p = _purchases[key];

        require(l.seller != address(0), "NOT_LISTED");
        require(l.active, "NOT_ACTIVE");
        require(p.status == PurchaseStatus.NONE, "ALREADY_PURCHASED");
        require(msg.value == l.priceWei, "BAD_VALUE");
        require(msg.sender != l.seller, "SELF_BUY");

        // Store purchase info - funds stay in contract (escrow)
        p.buyer = msg.sender;
        p.amountPaid = msg.value;
        p.status = PurchaseStatus.ESCROW;
        p.purchaseTime = block.timestamp;

        emit Purchased(msg.sender, nftContract, tokenId, msg.value);
    }

    /**
     * @dev Buyer confirms delivery - triggers NFT transfer and payment release
     */
    function confirmDelivery(address nftContract, uint256 tokenId) external nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase storage p = _purchases[key];

        require(p.buyer == msg.sender, "NOT_BUYER");
        require(
            p.status == PurchaseStatus.ESCROW || p.status == PurchaseStatus.DELIVERED,
            "INVALID_STATUS"
        );

        // Update status
        p.status = PurchaseStatus.COMPLETED;
        p.completionTime = block.timestamp;
        l.active = false;

        // Calculate platform fee
        uint256 platformFee = (p.amountPaid * platformFeeBps) / 10000;
        uint256 sellerAmount = p.amountPaid - platformFee;
        totalFeesCollected += platformFee;

        // Transfer NFT to buyer
        IERC721(nftContract).safeTransferFrom(l.seller, msg.sender, tokenId);

        // Transfer funds to seller
        (bool ok, ) = payable(l.seller).call{ value: sellerAmount }("");
        require(ok, "PAY_FAIL");

        emit DeliveryConfirmed(msg.sender, nftContract, tokenId);
        emit TransactionCompleted(msg.sender, l.seller, nftContract, tokenId, sellerAmount);
    }

    /**
     * @dev Buyer raises a dispute
     */
    function raiseDispute(address nftContract, uint256 tokenId) external nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Purchase storage p = _purchases[key];

        require(p.buyer == msg.sender, "NOT_BUYER");
        require(
            p.status == PurchaseStatus.ESCROW || p.status == PurchaseStatus.DELIVERED,
            "INVALID_STATUS"
        );

        p.status = PurchaseStatus.DISPUTED;

        emit DisputeRaised(msg.sender, nftContract, tokenId);
    }

    // ============ Admin Functions ============

    /**
     * @dev Resolve dispute - can refund buyer or release to seller
     * @param buyerWins If true, refund buyer. If false, complete transaction.
     */
    function resolveDispute(
        address nftContract,
        uint256 tokenId,
        bool buyerWins
    ) external onlyOwner nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase storage p = _purchases[key];

        require(p.status == PurchaseStatus.DISPUTED, "NOT_DISPUTED");

        if (buyerWins) {
            // Refund buyer
            p.status = PurchaseStatus.REFUNDED;
            l.active = false;

            (bool ok, ) = payable(p.buyer).call{ value: p.amountPaid }("");
            require(ok, "REFUND_FAIL");

            emit RefundIssued(p.buyer, nftContract, tokenId, p.amountPaid);
        } else {
            // Complete transaction - seller wins
            p.status = PurchaseStatus.COMPLETED;
            p.completionTime = block.timestamp;
            l.active = false;

            uint256 platformFee = (p.amountPaid * platformFeeBps) / 10000;
            uint256 sellerAmount = p.amountPaid - platformFee;
            totalFeesCollected += platformFee;

            IERC721(nftContract).safeTransferFrom(l.seller, p.buyer, tokenId);

            (bool ok, ) = payable(l.seller).call{ value: sellerAmount }("");
            require(ok, "PAY_FAIL");

            emit TransactionCompleted(p.buyer, l.seller, nftContract, tokenId, sellerAmount);
        }

        emit DisputeResolved(nftContract, tokenId, buyerWins);
    }

    /**
     * @dev Auto-release funds after timeout (buyer didn't respond)
     */
    function autoRelease(address nftContract, uint256 tokenId) external nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase storage p = _purchases[key];

        require(p.status == PurchaseStatus.DELIVERED, "NOT_DELIVERED");
        require(block.timestamp >= p.deliveryTime + autoReleaseTimeout, "TIMEOUT_NOT_REACHED");

        // Auto-complete after timeout
        p.status = PurchaseStatus.COMPLETED;
        p.completionTime = block.timestamp;
        l.active = false;

        uint256 platformFee = (p.amountPaid * platformFeeBps) / 10000;
        uint256 sellerAmount = p.amountPaid - platformFee;
        totalFeesCollected += platformFee;

        IERC721(nftContract).safeTransferFrom(l.seller, p.buyer, tokenId);

        (bool ok, ) = payable(l.seller).call{ value: sellerAmount }("");
        require(ok, "PAY_FAIL");

        emit TransactionCompleted(p.buyer, l.seller, nftContract, tokenId, sellerAmount);
    }

    /**
     * @dev Withdraw collected platform fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = totalFeesCollected;
        require(amount > 0, "NO_FEES");
        totalFeesCollected = 0;

        (bool ok, ) = payable(owner()).call{ value: amount }("");
        require(ok, "WITHDRAW_FAIL");
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "FEE_TOO_HIGH"); // Max 10%
        platformFeeBps = newFeeBps;
    }

    /**
     * @dev Update auto-release timeout
     */
    function setAutoReleaseTimeout(uint256 newTimeout) external onlyOwner {
        require(newTimeout >= 1 days, "TIMEOUT_TOO_SHORT");
        autoReleaseTimeout = newTimeout;
    }

    // Emergency refund by owner
    function emergencyRefund(address nftContract, uint256 tokenId) external onlyOwner nonReentrant {
        bytes32 key = _key(nftContract, tokenId);
        Listing storage l = _listings[key];
        Purchase storage p = _purchases[key];

        require(p.status == PurchaseStatus.ESCROW || p.status == PurchaseStatus.DELIVERED, "INVALID_STATUS");

        p.status = PurchaseStatus.REFUNDED;
        l.active = false;

        (bool ok, ) = payable(p.buyer).call{ value: p.amountPaid }("");
        require(ok, "REFUND_FAIL");

        emit RefundIssued(p.buyer, nftContract, tokenId, p.amountPaid);
    }
}
