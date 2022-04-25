// var Voting = artifacts.require("./Voting.sol");
// var VoteAsset = artifacts.require("./VoteAsset.sol");

// module.exports = function(deployer) {
//   deployer.deploy(Voting);
//   deployer.deploy(VoteAsset);
// };


const Voting = artifacts.require("./Voting.sol");
const VoteAsset = artifacts.require("./VoteAsset.sol");

// module.exports = async function(deployer) 
// {
// 	// deploy Voting and store return value
// 	let vote = await deployer.deploy(Voting);
//   	// deploy the VoteAsset and pass vote
// 	deployer.deploy(VoteAsset, vote);
// }

module.exports = function(deployer) 
{
    deployer.deploy(Voting);
    deployer.link(Voting, VoteAsset);
    deployer.deploy(VoteAsset);
};