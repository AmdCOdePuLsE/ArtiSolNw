// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArtisolNFT
 * @dev ERC721 NFT contract for minting authentic artisan products on ArtiSol marketplace
 * Each NFT represents a unique handcrafted product with metadata stored on IPFS
 */
contract ArtisolNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    // Mapping from token ID to product metadata hash (for verification)
    mapping(uint256 => bytes32) public productHashes;
    
    // Mapping from token ID to creation timestamp
    mapping(uint256 => uint256) public mintTimestamps;
    
    // Mapping from token ID to artisan (original minter)
    mapping(uint256 => address) public artisans;

    // Events
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed artisan,
        string tokenURI,
        bytes32 productHash,
        uint256 timestamp
    );

    constructor() ERC721("ArtiSol Artisan NFT", "ARTISOL") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a new NFT for an artisan product
     * @param to The address that will own the NFT (artisan)
     * @param uri The token URI containing metadata (IPFS link or JSON)
     * @param productHash Hash of product details for verification
     * @return tokenId The ID of the newly minted NFT
     */
    function mintNFT(
        address to,
        string memory uri,
        bytes32 productHash
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        productHashes[tokenId] = productHash;
        mintTimestamps[tokenId] = block.timestamp;
        artisans[tokenId] = to;

        emit NFTMinted(tokenId, to, uri, productHash, block.timestamp);

        return tokenId;
    }

    /**
     * @dev Get the current token counter (next token ID)
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Get full NFT details
     */
    function getNFTDetails(uint256 tokenId) public view returns (
        address owner,
        address artisan,
        string memory uri,
        bytes32 productHash,
        uint256 mintTimestamp
    ) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        
        return (
            ownerOf(tokenId),
            artisans[tokenId],
            tokenURI(tokenId),
            productHashes[tokenId],
            mintTimestamps[tokenId]
        );
    }

    /**
     * @dev Verify product authenticity by comparing hash
     */
    function verifyProduct(uint256 tokenId, bytes32 hash) public view returns (bool) {
        require(tokenId < _tokenIdCounter, "Token does not exist");
        return productHashes[tokenId] == hash;
    }

    /**
     * @dev Get total supply of minted NFTs
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }

    // Override required functions
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
