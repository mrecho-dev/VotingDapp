const Voting = artifacts.require("./Voting.sol");
const VoteAsset = artifacts.require("./VoteAsset.sol");

module.exports = function(deployer) 
{
    deployer.deploy(Voting);
    deployer.link(Voting, VoteAsset);
    deployer.deploy(VoteAsset);
};