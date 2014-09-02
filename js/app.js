(function() {
// Models
// --------------------

// Model for an individual tweet
var TweetModel = Backbone.Model.extend({
  validate: function(attrs) {
    if (!attrs.user) return "Cannot find the user attribute.";
    if (!attrs.created_at) return "Cannot find the created_at attribute.";
    if (!attrs.text) return "Cannot find the text attribute.";
  },
  getUserProfileImageURL: function() {
    if (this.get("user").profile_image_url)
      return this.get("user").profile_image_url.replace("normal", "bigger");
    else
      return "";
  },
  getLocalCreatedTime: function() {
    var date = new Date(Date.parse(this.get("created_at").replace(/( +)/, ' UTC$1')));
    return date.getHours() + ":" + date.getMinutes();
  },
  getLocalCreatedDate: function() {
    var date = new Date(Date.parse(this.get("created_at").replace(/( +)/, ' UTC$1')));
    return date.toDateString();
  }
});


// Collection for list of tweets retrieved from the twitter api
var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  initialize: function(model, options) {
    if (options && options.query) this.query = options.query; else this.query = "";
  },
  url: function () {
    return PROXY_ADDRESS + "?q=" + this.query + REQUEST_PARAMS;
  },
  parse: function(response) {
    return response.statuses;
  }
});

// Collection for the tweets put in the bucket  
var TweetsBucketCollection = Backbone.Collection.extend({
  model: TweetModel,
  initialize: function(model) {
  }
});

// Views
// --------------------

// Tweet template (uses underscore templates)
var tweetTemplate = _.template('<time class="tweet_time"><span><%= model.getLocalCreatedDate() %></span> <span><%= model.getLocalCreatedTime() %></span></time>'+
'<div class="tweet_user" style="background-image: url(\'<%= model.getUserProfileImageURL() %>\')"></div>'+
'<div class="tweet_body"><span><a href="https://twitter.com/<%= model.get("user").screen_name %>"><%= model.get("user").name %></a></span>'+
'<span><%= model.get("user").screen_name %></span><hr><p><%= processTweetBody(model.get("text")) %></p></div><div class="tweet_bucket_icon"</div>');

// View for individual tweets, uses a TweetModel as the model
var TweetView = Backbone.View.extend({
  // Tweets are in a li tags
  tagName: 'li',
  // Tweets use the underscore tweetTemplate
  template: tweetTemplate,
  // Just checking if the view has a model otherwise throws an error
  initialize: function(){
    if( !this.model ){
      throw new Error('You must provide a Tweet model');
    }
  },
  // Render method populates the template with data from model
  render: function(){
    this.$el.html( this.template( this ) );
    return this.$el;
  },
  // Each tweet only responds to the 'addToBucket' event which adds the model to the bucket
  events: {
    'click .tweet_bucket_icon': 'addToBucket' // click handler for the bucket icon
  },
  // Adds the model associated to this view to the bucket collection
  addToBucket: function() { 
    tweetBucket.add(this.model);
  },
  // This is a utility method that processes the tweet text, and creates a new string 
  // containing the links, media, mentions, and hashtags wrapped in anchor tags 
  // pointing to the appropriate href
  processTweetBody: function(text){
      var transforms = new Array();
      if (this.model.get('entities').urls) this.model.get('entities').urls.forEach(function(item) {
        transforms[item.indices[0]] = {end: item.indices[1], replacement: "<a href='" + item.url + "'>" + item.display_url + "</a>"};
      });
      if (this.model.get('entities').media) this.model.get('entities').media.forEach(function(item) {
        transforms[item.indices[0]] = {end: item.indices[1], replacement: "<a href='" + item.url + "'>" + item.display_url + "</a>"};
      });
      if (this.model.get('entities').user_mentions) this.model.get('entities').user_mentions.forEach(function (item) {
        transforms[item.indices[0]] = {end: item.indices[1], replacement: "<a href='https://twitter.com/" + item.screen_name + "'>@" + item.screen_name + "</a>"};
      });
      if (this.model.get('entities').hashtags) this.model.get('entities').hashtags.forEach(function (item) {
        transforms[item.indices[0]] = {end: item.indices[1], replacement: "<a href='#/search/" + item.text + "'>#" + item.text + "</a>"};
      });

      var processedText = "";
      var current = 0;
      while (current < text.length) {
        if (transforms[current]) {
          processedText = processedText + transforms[current].replacement;
          current = transforms[current].end-1;
        } else {
          processedText = processedText + text[current];
        }
        current++;
      }
      return processedText;
    }
  });

// View for the list of tweets, uses a TweetsCollection as the model
var TweetsList = Backbone.View.extend({
  // View uses the '.tweets' div as the container
  el: $('.tweets'),
  // On initialize we make sure that a collection is associated with the view
  // Also we set event handlers for changes to the collection
  initialize: function(options){
    if (options.collection)
      this.collection = options.collection;
    else
      this.collection = new TweetsCollection();
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.listenTo( this.collection, 'reset', this.reset);
  },
  // This method is responsible for rendering an individual tweet 
  // given the model. It appends the rendered tweet to the hidden 
  // container ('#tweet-entry'). 
  renderTweet: function(model){
    model.view = new TweetView({ model: model });
    this.$('#tweet-entry').append(model.view.render());
  },
  // This method is used to render an already populated collection
  // and is particularly used for rendering bucket 
  renderAll: function() {
    _.each(this.collection.models, function(item) {
      this.renderTweet(item);
    }, this);
    this.emptyEntry();
  },
  // This method resets the view upon changin the collection and 
  // clears the interval for fetching data
  reset: function() {
    this.$('#tweet-list').empty();
    this.$('#tweet-entry').empty();
    this.$('#tweet-stage').empty();
    clearInterval(this.interval);
  },
  // This method is called for each search query once and 
  // fetch data by calling collection.fetch. Upon successful completion, 
  // the tweets will be transfered from hidden area to the actual tweet 
  // timeline. Then the method sets an interval for fetching data from the server.
  fetchResults: function() {
    this.collection.fetch({validate:true, success: this.emptyEntry});
    this.interval = setInterval(_.bind(this.refreshResults, this), FETCH_INTERVAL);
  },
  emptyEntry: function() {
    $('#tweet-entry li').appendTo('#tweet-list');
  },
  // This method is called by the setInterval and fetch new tweets, and add it to the hidden stage area
  refreshResults: function() {
    this.collection.fetch({validate:true, remove: false, success: this.emptyEntryToStage});
  },
  // This moves the tweets from entery div to the stage div. The tweets are still invisible but 
  // a new button will appear to notify user about new tweets
  emptyEntryToStage: function() {
    $('#tweet-entry li').prependTo('#tweet-stage');
    var stage_count = $('#tweet-stage li').size();
    if (stage_count > 0) {
      $('#tweet-stage-status').slideDown("slow");
      $('#tweet-stage-status').html(stage_count == 1 ? stage_count + " new tweet !" : stage_count + " new tweets !");
    }
  },
  // This methdo is used to update the query associated to the collection
  updateSearch: function(query) {
    $("#searchBox").val(query);
    this.collection.query = query;
    this.collection.reset();
    this.fetchResults();
  },
  // event handlers
  events: {
    'click #searchButton': 'doSearch',
    'click #tweet-stage-status': 'showMore',
    'keyup #searchBox': 'checkKey',
    'click #refreshButton': 'refreshResults'
  },
  // fired when user clicks on the search icon or presses return key
  doSearch: function() {
    var query = $('#searchBox').val().replace("#", " ");
    tweetRouter.navigate("#/search/"+query, {trigger: true});
  },
  // fired when user clicks on the show new tweets button appearing due 
  // to interval refresh
  showMore: function() {
    var currentOffset = $('#tweet-list:first');
    $('#tweet-stage-status').hide();
    $('#tweet-stage li').prependTo('#tweet-list').hide().slideDown("slow");
  },
  // fired when user presses enter in the search box
  checkKey: function (e, b) {
    if (e.which == 13) this.doSearch();
  }
});

// View for the bucket (the bucket icon on the top right), uses a TweetsCollection as the model
// The view listens to the add events to the associated collection, and updates the 
// count of items in the bucket accordingly
var BucketView = Backbone.View.extend({
  
  el: $('.tweet_bucket'),
  initialize: function(options){
    this.collection = options.collection;
    this.listenTo( this.collection, 'add', this.renderBucket );
  },
  renderBucket: function() {
    this.$('span').html(this.collection.length);
  }
});


// Routers and event handlers 
// --------------------

// The router provides three different routes. 
// (1) index route (2) search route with query, 
// (3) bucket route shows the bucket contents, 
// (4) any other route is redirected to the index 
var AppRouter = Backbone.Router.extend({
    routes: {
      '': 'index',
      'search/:query': 'search',
      'bucket': 'bucket',
      '*other': 'index'
    },
    // This method is called for every search. It checks if localStorage is 
    // available, saves the query as the last query to localStorage. Then 
    // updates the query. 
    search: function(query) {        
        if ('localStorage' in window && window['localStorage'] !== null) {
          localStorage.setItem("lastQuery", query);
        }
        if (tweets && tweets.collection && tweets.collection.url) {
          tweets.updateSearch(query);
        } else {
          tweets.collection = tweetCollection;
          tweets.updateSearch(query);
        }
    },
    // This route update the model in the view with the bucket and show it.
    bucket: function() {
      tweets.reset();
      tweets.collection = tweetBucket;
      tweets.renderAll();
    },
    // This load the last query if there is a last query available from the localStorage. 
    // Otherwise shows an empty searchbox.
    index: function() {
      if ('localStorage' in window && window['localStorage'] !== null && localStorage.getItem("lastQuery")) {
        var query = localStorage.getItem("lastQuery");
        tweetRouter.navigate("#/search/"+query, {trigger: true});
        tweets.updateSearch(query);
      }
    }
  });

// App constants
var FETCH_INTERVAL = 15000; // fetch data every 15 seconds
var PROXY_ADDRESS = "http://jaferian.com/tweetproxy/proxy.php"; // twitter api proxy address;
var REQUEST_PARAMS = "&count=30&callback=?"; // additional search params;

// Variables for router, collections, and views
var tweetRouter = new AppRouter();
var tweetBucket = new TweetsBucketCollection();
var tweetCollection = new TweetsCollection([], {query: ""});
var tweets = new TweetsList({collection: tweetCollection});
var bucketView = new BucketView({collection: tweetBucket});
Backbone.history.start();
})();