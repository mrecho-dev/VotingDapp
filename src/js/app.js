App = {
  provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: function() 
  {
    return App.initWeb3();
  },

  // Connects client side application to local blockchain.
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

      // If Metamask is not installed.
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

    return App.initContract();
  },

  initContract: function() 
  {
    $.getJSON('Voting.json', function (voting) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Voting = TruffleContract(voting);
      // Connect provider to interact with contract
      App.contracts.Voting.setProvider(App.provider);
      App.eventListener();
      
      return App.display();
    });

    $.getJSON('VoteAsset.json', function (nft) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.VoteAsset = TruffleContract(nft);
      // Connect provider to interact with contract
      App.contracts.VoteAsset.setProvider(App.provider);
      App.mintingEventListener();
    });
  },

  // Listen for events from Voting contract.
  eventListener: function() 
  {
    App.contracts.Voting.deployed().then(function (instance) 
    {
      instance.votingEvent({},{
            // Looks entire blockchain for votingEvent.
            fromBlock: 0,
            toBlock: 'latest',
          }).watch(function (error, evt) {
            console.log('Voting event triggered', evt);
            // Reload the page when users voted.
            App.display();
        });
    });
  },

  // Listen for events from VoteAsset contract.
  mintingEventListener: function() 
  {
    App.contracts.VoteAsset.deployed().then(function (instance) 
    {
      instance.mintingEvent({},{
            // Looks entire blockchain for votingEvent.
            fromBlock: 0,
            toBlock: 'latest',
          }).watch(function (error, evt) {
            console.log('Minting event triggered', evt);
        });
    });
  },

  // Displays content on the webpage.
  display: async () => {
    var votingInstance;
    var loader = $('#loader');
    var content = $('#content');
    var nft = $('#nft');

    loader.show();
    content.hide();
    nft.hide();

    // Displays account address.
    try 
    {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      App.account = accounts[0];
      $('#accountAddress').html('Account address: ' + App.account);
    } 
    catch (error) 
    {
      console.log(error);
    }

    // Displays candidates for election.
    App.contracts.Voting.deployed()
      .then(function (instance) {
        votingInstance = instance;
        return votingInstance.count();
      })
      .then(async (count) => {
        const promiseList = [];
        
        for (var i = 1; i <= count; i++) 
        {
          promiseList.push(votingInstance.candidatesMap(i));
        }

        const candidatesMap = await Promise.all(promiseList);
        var candidatesResults = $('#candidatesResults');
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        for (var i = 0; i < count; i++) 
        {
          var id = candidatesMap[i][0];
          var name = candidatesMap[i][1];
          var voteCount = candidatesMap[i][2];

          // Candidates results template.
          var template = '<tr><th>' + id + '</th><td>' + name + '</td><td>' + voteCount + '</td></tr>'; 
          candidatesResults.append(template);

          // Displays candidates voting options.
          var candidateOption =
            "<option value='" + id + "' >" + name + '</ option>';
          candidatesSelect.append(candidateOption);
        }
        return votingInstance.votersMap(App.account);
      })
      .then(function (hasVoted) 
      {
        // Voter can't vote twice, so form is hidden after voting.
        if (hasVoted) {
          $('form').hide();
          nft.show();
        }
        loader.hide();
        content.show();
      })
      .catch(function (error) {
        console.warn(error);
      });
  },

  castVote: function () {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Voting.deployed()
      .then(function (instance) {
        return instance.vote(candidateId, { from: App.account });
      })
      .then(function (result) 
      {
        // Wait for votes to update
        $('#content').hide();
        $('#loader').show();
        $('#nft').hide();
      })
      .catch(function (err) {
        console.error(err);
      });
  },

  mintNFT: function () {
    App.contracts.VoteAsset.deployed()
      .then(function (instance) {
        instance.mint(App.account, { from: App.account });
      })
      .catch(function (err) {
        console.error(err);
      });
  },
};


$(document).ready(function() 
{
  $(window).on("load", function() 
  {
    App.init();
  });
});