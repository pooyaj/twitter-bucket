(function() {
// Model for an individual tweet
var TweetModel = Backbone.Model.extend({
  validate: function(attrs) {
  },
  getUserProfileImageURL: function() {
    if (this.get("user").profile_image_url)
      return this.get("user").profile_image_url.replace("normal", "bigger");
    else
      return "";
  }
});


// Model for list of tweets 
var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  initialize: function(model, options) {
    if (options.query) this.query = options.query; else this.query = "";
  },
  url: function () {
    return "/tweetproxy/proxy.php?q="+ this.query+"&count=50";
  },
  parse: function(response) {
    return response.statuses;
  }
});


var tweetTemplate = _.template('<time class="tweet_time"><span><%= model.get("created_at").slice(0,10) %></span> <span><%= model.get("created_at").slice(10,16) %></span></time>'+
'<div class="tweet_user" style="background-image: url(\'<%= model.getUserProfileImageURL() %>\')"></div>'+
'<div class="tweet_body"><span><a href="https://twitter.com/<%= model.get("user").screen_name %>"><%= model.get("user").name %></a></span>'+
'<span><%= model.get("user").screen_name %></span><hr><p><%= processTweetBody(model.get("text")) %></p></div>');

var TweetView = Backbone.View.extend({
  tagName: 'li',
  template: tweetTemplate,
  initialize: function(){
    if( !this.model ){
      throw new Error('You must provide a Tweet model');
    }
    this.listenTo( this.model, 'remove', this.remove);
  },
  render: function(){
    this.$el.html( this.template( this ) );
    return this.$el;
  },
  processTweetBody: function(text){
      console.log(this.model.get('entities').symbols);
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

var TweetsList = Backbone.View.extend({
  el: $('.tweets'),
  initialize: function(options){
    if (options.collection)
      this.collection = options.collection;
    else
      this.collection = new TweetsCollection();
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.listenTo( this.collection, 'reset', this.reset);
  },
  renderTweet: function(model){
    model.view = new TweetView({ model: model });
    this.$('#tweet-entry').append(model.view.render());
  },
  reset: function() {
    this.$('#tweet-list').empty();
    this.$('#tweet-entry').empty();
    this.$('#tweet-stage').empty();
    clearInterval(this.interval);
  },
  fetchResults: function() {
    this.collection.fetch({success: this.emptyEntry});
    this.interval = setInterval(_.bind(this.refreshResults, this), 3000000);
  },
  refreshResults: function() {
    this.collection.fetch({remove: false, success: this.emptyEntryToStage});
  },
  updateSearch: function(query) {
    this.collection.query = query;
    this.collection.reset();
    this.fetchResults();
  },
  events: {
    'click #searchButton': 'doSearch',
    'click #tweet-stage-status': 'showMore',
    'keyup #searchBox': 'checkKey',
    'click #refreshButton': 'refreshResults'
  },
  doSearch: function() {
    var query = $('#searchBox').val();
    tweetRouter.navigate("#/search/"+query, {trigger: true});
  },
  emptyEntry: function() {
    $('#tweet-entry li').appendTo('#tweet-list');
  },
  emptyEntryToStage: function() {
    $('#tweet-entry li').prependTo('#tweet-stage');
    var stage_count = $('#tweet-stage li').size();
    if (stage_count > 0) {
      $('#tweet-stage-status').slideDown("slow");
      $('#tweet-stage-status').html(stage_count == 1 ? stage_count + " new tweet !" : stage_count + " new tweets !");
    }
  },
  showMore: function() {
    var currentOffset = $('#tweet-list:first');
    $('#tweet-stage-status').hide();
    $('#tweet-stage li').prependTo('#tweet-list').hide().slideDown("slow");
  },
  checkKey: function (e, b) {
    if (e.which == 13) this.doSearch();
  }
});

// creating the event handler
var vent = _.extend({}, Backbone.Events);

var AppRouter = Backbone.Router.extend({
    routes: {
      'search/:query' : 'search',
      '': 'index'
    },
    search: function(query) {
      vent.trigger("search:query", query);
    },
    index: function()  {
      if (!window.tweets) index();
    }
  });

vent.on("search:query", function(query) {
  // set the passed query as the last query in localStorage
  if ('localStorage' in window && window['localStorage'] !== null) {
    localStorage.setItem("lastQuery", query);
  }
  if (window.tweets) window.tweets.updateSearch(query); else initializeSearch(query);
});

function index() {
  if ('localStorage' in window && window['localStorage'] !== null && localStorage.getItem("lastQuery")) {
    var query = localStorage.getItem("lastQuery");
    initializeSearch(query);
    tweetRouter.navigate("#/search/"+query, {trigger: true});
  } else {
    initializeSearch();
  }
}

function initializeSearch(query) {
  var tweetCollection = new TweetsCollection([], {query: query});
  window.tweets = new TweetsList({collection: tweetCollection});
  window.tweets.fetchResults();
}

$(function(){
  window.tweetRouter = new AppRouter();
  Backbone.history.start();
});
})();