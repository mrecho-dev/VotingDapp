// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract VoteAsset is ERC721PresetMinterPauserAutoId {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdTracker;
    // voted event
    event mintingEvent(address mintedAddress);

    constructor() ERC721PresetMinterPauserAutoId("VoteAsset", "VAST", "https://") {}

    // Overriding mint function to remove minter role so that everyone can mint nft.
    function mint(address to) public override virtual 
    {
        _mint(to, _tokenIdTracker.current());
        _tokenIdTracker.increment();

        emit mintingEvent(to);
    }
}