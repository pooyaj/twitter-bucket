var TweetModel = Backbone.Model.extend({
  validate: function(attrs){
  }
});

var TweetsCollection = Backbone.Collection.extend({
  model: TweetModel,
  url: "/tweetproxy/proxy.php?q=canucks",
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
  initialize: function(){
    this.collection = new TweetsCollection();
    this.listenTo( this.collection, 'add', this.renderTweet );
    this.collection.fetch();
  },

  renderTweet: function(model){
    model.view = new TweetView({ model: model });
    this.$('#tweet-list').prepend( model.view.render() );
  },

});

$(function(){
  window.tweets = new TweetsList();
  setInterval(function () {
    window.tweets.collection.fetch();
  }, 1000);
});