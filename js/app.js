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


var AppRouter = Backbone.Router.extend({
    searchModel : null,
    initialize:  function(options){
        var self = this;
        self.tweetList = options.tweetList;
        self.listenTo(self.tweetList, 'change:query', self.navigateToSearch)
    },
    navigateToSearch: function(model, options){
        //manually navigate to the search url
        this.navigate("search/" + model.get('query'), {trigger: true});
    },
    routes: {'search/:query' : 'search'},
    search: function(query){
        var self = this;
        console.log('search for ' + query);
        if(self.searchModel.get('query') !== query){
            self.searchModel.set('query', query, {silent:true});
        }
    //now go the that view
        self.searchModel.fetch(
            {
                success: function(model){
                var resultsView = new com.apress.view.ResultsView({model:model});
                },
                error: function(e){
                  alert('No results available');
                }
            });
      }
    });




$(function(){
  
  $('#searchButton').click(function() {
    var tweetCollection = new TweetsCollection([], {query: $('#searchBox').val()});
    window.tweets = new TweetsList({collection: tweetCollection});
    tweetCollection.fetch();
  });

/*
  window.tweetRouter = new TweetRouter ({
    main: $('.tweets')
  });
  Backbone.history.start({pushState: true});
*/

});