App = {
  provider: null,
  contracts: {},
  account: '',
  hasVoted: false,
  candidates: [],

  init: function() 
  {
    return App.initWeb3();
  },

  // Connects client side application to local blockchain
  initWeb3: function() 
  {
    if (typeof web3 !== 'undefined') 
    {
      // Web3 instance is provided by Meta Mask.
      const ethEnabled = () => {
        if (window.ethereum) 
        {
          window.web3 = new Web3(window.ethereum);
          return true;
        }
        return false;
      };

      // If Metamask is not installed
      if (!ethEnabled()) 
      {
        alert('Missing web3 connection! Please install MetaMask.');
      }
      web3 = window.web3;
      App.provider = web3.currentProvider;
    } 
    else 
    {
      // Web3 instance is not provided by Meta Mask. New instance is created from local blockchain.
      App.provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.provider);
    }

    App.walletChangeListener();
    return App.initContract();
  },

  initContract: function() 
  {
    $.getJSON('Voting.json',  voting => {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Voting = TruffleContract(voting);
      // Connect provider to interact with contract
      App.contracts.Voting.setProvider(App.provider);
      App.votingEventListener();
      
      return App.display();
    });

    $.getJSON('VoteAsset.json', voteAsset => {
      // Instantiate a new truffle contract from the artifact
      App.contracts.VoteAsset = TruffleContract(voteAsset);
      // Connect provider to interact with contract
      App.contracts.VoteAsset.setProvider(App.provider);
      App.mintingEventListener();
    });
  },

  // Listen for events from Voting contract
  votingEventListener: function() 
  {
    App.contracts.Voting.deployed().then(instance => { 
      instance.votingEvent({}, {
            // Looks entire blockchain for votingEvent
            fromBlock: 0,
            toBlock: 'latest',
          }).watch(function (err, evt) {
            console.log('Voting event triggered', evt);
            // Reload the page when users voted
            App.display();
        });
    });
  },

  // Listen for events from VoteAsset contract
  mintingEventListener: function() 
  {
    App.contracts.VoteAsset.deployed().then(instance => {
      instance.mintingEvent({}, {
            // Looks entire blockchain for mintingEvent
            fromBlock: 0,
            toBlock: 'latest',
          }).watch(function (err, evt) {
            console.log('Minting event triggered', evt);
            App.display();
        });
    });
  },

  // Displays content on the webpage
  display: async () => {
    var votingInstance;
    var title = $('#title');
    var resultsTitle = $('#resultsTitle');
    var loader = $('#loader');
    var content = $('#content');
    var nftButton = $('#nftButton');
    var nftClaim = $('#nftClaim');
    var nftShow = $('#nftShow');

    loader.show();
    title.show();
    resultsTitle.hide();
    content.hide();
    nftButton.hide();
    nftClaim.hide();
    nftShow.hide();

    // Displays account address
    try 
    {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      App.account = accounts[0];
      $('#accountAddress').html('Your wallet address: <i>' + App.account + '</i>');
    } 
    catch (err) 
    {
      console.log(err);
    }

    // Displays candidates for election
    App.contracts.Voting.deployed()
      .then(instance => {
        votingInstance = instance;
        return votingInstance.count();
      })
      .then(async (count) => {
        const promiseList = [];
        
        for (var i = 1; i <= count; i++) 
          promiseList.push(votingInstance.candidatesMap(i));

        const candidatesMap = await Promise.all(promiseList);
        App.candidates = candidatesMap;
        var candidatesResults = $('#candidatesResults');
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        for (var i = 0; i < count; i++) 
        {
          var id = candidatesMap[i][0];
          var name = candidatesMap[i][1];
          var voteCount = candidatesMap[i][2];

          // Candidates results template
          var template = '<tr><th>' + id + '</th><td>' + name + '</td><td>' + voteCount + '</td></tr>'; 
          candidatesResults.append(template);

          // Displays candidates voting options
          var candidateOption =
            "<option value='" + id + "' >" + name + '</option>';
          candidatesSelect.append(candidateOption);
        }
        return votingInstance.votersMap(App.account);
      })
      .then(async (hasVoted) => {
        if (hasVoted) {
          // Voted candidates name is shown
          Promise.resolve(votingInstance.votersMapID(App.account)).
            then(value => { 
              var votedName = $('#votedCandidate'); 
              votedName.empty(); 
              votedName.append("Congratulations. You've voted for <b>" + App.candidates[parseInt(value.toString()) - 1][1] + "</b>");
            });
          // Voter can't vote twice, so form is hidden after voting
          $('form').hide();
          // After voting, claim NFT button is shown
          nftButton.show();
          nftClaim.hide();
          nftShow.hide();
          title.hide();
          resultsTitle.show();
          $('votedCandidate').show();
        }
        App.displayNFT();
        loader.hide();
        content.show(); 
      })
      .catch(function (err) {
        console.warn(err);
        title.hide();
        document.getElementById("loaderText").innerHTML = "<h2>Please connect to the correct network</h2>";
        alert(err);
        
      });
  },

  // Votes for selected candidate
  castVote: function () 
  {
    var loader = $('#loader');
    var content = $('#content');
    var nftButton = $('#nftButton');
    var nftClaim = $('#nftClaim');
    var nftShow = $('#nftShow');
    var title = $('#title');
    var resultsTitle = $('#resultsTitle');
    var candidateId = $('#candidatesSelect').val();

    App.contracts.Voting.deployed()
      .then(instance => {
        var vote = instance.vote(candidateId, { from: App.account });
        return vote;
      })
      .then(() => {
        // Waits for votes to update
        content.hide();
        loader.show();
        nftButton.hide();
        nftClaim.hide();
        nftShow.hide();
        title.hide();
        resultsTitle.show();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  // Mints nft
  mintNFT: function () 
  {
    App.contracts.VoteAsset.deployed()
      .then(instance => {
        instance.mint(App.account, { from: App.account });
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  // Sets display after minting
  displayNFT: function() 
  {
    var nftButton = $('#nftButton');
    var nftClaim = $('#nftClaim');
    var nftShow = $('#nftShow');
    var nftContractHTML = $('#nftContract');
    var voteAssetInstance;
    
    App.contracts.VoteAsset.deployed()
      .then(instance => {
        voteAssetInstance = instance;
        return voteAssetInstance.mintersMap(App.account, { from: App.account });
      }).
      then (hasMinted => {
        if (hasMinted) {
          nftButton.hide();
          nftClaim.show();
          nftShow.show();
          Promise.resolve(voteAssetInstance.getContractAddress().
            then(contract => {
              nftContractHTML.html("NFT contract address: <i>" + contract + "</i>");
            }));
        }
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  // Listens wallet movements
  walletChangeListener: async function () 
  {
    // Listens wallet change and refreshes the page
    try 
    {
      window.ethereum.on("accountsChanged", async () => {
        // Refreshes the page
        document.location.reload(true);
      });
    }
    catch(err) 
    {
      console.error(err);
    } 

    // Listens network change and refreshes the page
    try 
    {
      window.ethereum.on("networkChanged", async () => {
        // Refreshes the page
        document.location.reload(true);
      });
    }
    catch(err) 
    {
      console.error(err);
    } 
  }
};

$(document).ready(function() 
{
  $(window).on("load", function() 
  {
    App.init();
  });
});