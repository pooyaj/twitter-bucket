var TweetModel = Backbone.Model.extend({
  validate: function(attrs){
  }
});

var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  initialize: function(model, options) {
    this.query = options.query;
  },
  url: function () {
    return "/tweetproxy/proxy.php?q="+ this.query+"&count=50";
  },
  parse: function(response) {
    return response.statuses;
  },
  update: function() {
    console.log("updating...");
    this.fetch({
      add: true
    });
  }
});


var tweetTemplate = _.template('<time class="tweet_time"><span><%= model.get("created_at").slice(0,10) %></span> <span><%= model.get("created_at").slice(10,16) %></span></time>'+
'<div class="tweet_user" style="background-image: url(\'<%= model.get("user").profile_background_image_url %>\')"></div>'+
'<div class="tweet_body"><p><%= fixURL(model.get("text")) %></p></div>');

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
  fixURL: function(text){    
    return text.replace(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi, function(text){
      return text.link(text);
    });
  }
});

var TweetsList = Backbone.View.extend({
  el: $('.tweets'),
  initialize: function(options){
    this.collection = new TweetsCollection([], {query: options.query});
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.listenTo( this.collection, 'reset', this.reset );
  },
  renderTweet: function(model){
    model.view = new TweetView({ model: model });
    this.$('#tweet-list').prepend(model.view.render()).hide().fadeIn('slow');
  },
  reset: function() {
    this.$('#tweet-list').empty();
  },
  updateSearch: function(query) {
    this.collection.query = query;
    clearInterval(this.interval);
    this.collection.reset();
    this.collection.fetch();
    this.interval = setInterval(_.bind(this.collection.update, this.collection), 30000);
  },
  events: {
    'click #searchButton': 'doSearch'
  },
  doSearch: function() {
    var query = $('#searchBox').val();
    tweetRouter.navigate("#/search/"+query, {trigger: true});
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
      if (!window.tweets) createCollections();
    }
  });

vent.on("search:query", function(query) {
  if (window.tweets) window.tweets.updateSearch(query); else createCollections(query);
});

function createCollections(query) {
  var tweetCollection = new TweetsCollection([], {query: query});
  window.tweets = new TweetsList({collection: tweetCollection});
}

$(function(){
  window.tweetRouter = new AppRouter();
  Backbone.history.start();
});