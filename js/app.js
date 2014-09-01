// Model for an individual tweet
var TweetModel = Backbone.Model.extend({
  validate: function(attrs){
  }
});


// Model for list of tweets 
var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  comparator: function(model) {
    return model.get('text');
  },
  initialize: function(model, options) {
    this.query = options.query;
  },
  url: function () {
    return "/tweetproxy/proxy.php?q="+ this.query+"&count=5";
  },
  parse: function(response) {
    return response.statuses;
  },
  update: function() {
    console.log("updating...");
    this.fetch({
      remove: false
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
      console.log(this.model.get('entities').urls);
      var urlUpdater = function (item) {
        text = text.replace(text.slice(item.indices[0], item.indices[1]), "<a href='" + item.url + "'>" + item.display_url + "</a>");
      };
      this.model.get('entities').urls.forEach(urlUpdater);
      if (this.model.get('entities').media) this.model.get('entities').media.forEach(urlUpdater);
      return text;
    }
  });

var TweetsList = Backbone.View.extend({
  el: $('.tweets'),
  initialize: function(options){
    console.log("tweetlist:initialize");
    this.collection = new TweetsCollection([], {query: options.query});
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.listenTo( this.collection, 'reset', this.reset);
  },
  renderTweet: function(model){
    console.log("tweetlist:renderTweet");
    model.view = new TweetView({ model: model });
    //this.$('#tweet-list').prepend(model.view.render().hide().fadeIn('slow'));
    this.$('#tweet-entry').append(model.view.render());
  },
  reset: function() {
    console.log("resting ...");
    this.$('#tweet-list').empty();
  },
  updateSearch: function(query) {
    this.collection.query = query;
    clearInterval(this.interval);
    this.collection.reset();
    this.collection.fetch({success: this.emptyEntry});
    //this.interval = setInterval(_.bind(this.collection.update, this.collection), 1000000);
    this.interval = setInterval(_.bind(function() {
      console.log("updating");
      this.collection.fetch({remove: false, success: this.emptyEntryToStage});
    }, this), 15000);
  },
  events: {
    'click #searchButton': 'doSearch',
    'click #tweet-stage-status': 'showMore'
  },
  doSearch: function() {
    var query = $('#searchBox').val();
    tweetRouter.navigate("#/search/"+query, {trigger: true});
  },
  emptyEntry: function() {
    $('#tweet-entry li').appendTo('#tweet-list');
  },
  emptyEntryToStage: function() {
    console.log("finished updating");
    $('#tweet-entry li').prependTo('#tweet-stage');
    var stage_count = $('#tweet-stage li').size();
    if (stage_count > 0) {
      $('#tweet-stage-status').show();
      $('#tweet-stage-status').html(stage_count + " More tweets");
    }
  },
  showMore: function() {
    console.log("showmore");
    $('#tweet-stage li').prependTo('#tweet-list');
    $('#tweet-stage-status').hide();
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