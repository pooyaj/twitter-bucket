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

    return "/tweetproxy/proxy.php?q="+ this.query;
  },
  parse: function(response) {
    return response.statuses;
  }
});

var tweetTemplate = _.template('<%= model.get("text") %>');

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

});

var TweetsList = Backbone.View.extend({
  el: $('.tweets'),
  initialize: function(options){
    if (options.collection) this.collection = options.collection; else this.collection = new TweetsCollection();
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.collection.fetch();
  },
  renderTweet: function(model){
    model.view = new TweetView({ model: model });
    this.$('#tweet-list').prepend( model.view.render() );
  },
});

// creating the event handler
var vent = _.extend({}, Backbone.Events);

var AppRouter = Backbone.Router.extend({
    routes: {
      'search/:query' : 'search',
      '': 'index'
    },
    search: function(query) {
      console.log("search:" + query);
      vent.trigger("search:query", query);
    },
    index: function()  {
      console.log("index");
    }
  });

vent.on("search:query", function(query) {
  console.log("Here you go :"+query);
});

$(function(){

/*  
  $('#searchButton').click(function() {
    var tweetCollection = new TweetsCollection([], {query: $('#searchBox').val()});
    window.tweets = new TweetsList({collection: tweetCollection});
    tweetCollection.fetch();
  });
*/
  window.tweetRouter = new AppRouter();
  Backbone.history.start();
});