(function($){

$(document).ready(function(){
  var mbdConfig
  , date = getReleaseWeek()
  , configURL = 'json/'+ date +'/mdbConfig.json'
  , movieCollectionURL = 'json/'+ date +'/movies-collection.json';

  //////// backbone routes ////////

  var AppRouter  = Backbone.Router.extend({
    routes:{
      "":"index"
    },
    index: function(){
      // get the config film for MDB and reset films so it renders
      $.ajax({
          url: configURL
        }).success(function(data){
          films.fetch();
          mbdConfig = data;
      });
    }
  });

  var appRouter = new AppRouter;
  Backbone.history.start();

  //////// start of film model/view/collection creation ////////

  //// film model
  var Film = Backbone.Model.extend({
      defaults:{
      active:false
    }
  });

  //// film view
  var FilmView = Backbone.View.extend({
    tagName:'li',
    events:{
      'click a.poster-link': 'viewOpened'
    },
    initialize: function(){
      _.bindAll(this, 'render');
    },
    render: function(){
      var model = this.model;
      // set the base poster URL in the model
      model.set({'posterURL': mbdConfig.images.base_url+mbdConfig.images.poster_sizes[3]+(this.model.get('poster_path'))});
      // set the base backdrop URL
      model.set({'backgroundURL': mbdConfig.images.base_url+mbdConfig.images.backdrop_sizes[1]+(this.model.get('backdrop_path'))});
      
      // run everything through the template and render
      this.template = _.template($('#film-template').html());
      var renderContent = this.template(this.model.toJSON());
      this.$el.html(renderContent);

      return this;
    },
    remove: function(){
      $(this.el).remove();
    },
    viewOpened: function(e){
      filmCollectionView.firstItemSelected = false;

      // reset all views back to disabled
      $('.films-view li').removeClass('active');
      films.forEach(function(film){film.set({'active':false})}, this);

      // make the currently item active
      this.model.set({'active':true});
      if(this.model.get('active') === true){
        this.$el.toggleClass('active');
      }
      this.$el.removeClass('disabled');
      
      // run transitions animation and display details
      changeBackgroundImg();
      showDetails(e);

      // create a new details view with the clicked item as the model
      var detailsView = new DetailsView({model:this.model});
      detailsView.render();

      function changeBackgroundImg(){
        var id = $(e.currentTarget).attr('data-id')
        ,modelClicked = films.get(id)
        ,theImage = $('img')[1]
        ,$backgroundImage = $('.background-image')
        ,$backgroundImageNew
        ,$backgroundImageOld
        ,imgUrl;

        $backgroundImage.addClass('old');
        $backgroundImage.removeClass('new');
        $('body').append('<div class="background-image new"></div>');
        $backgroundImageNew = $('.background-image.new');
        $backgroundImageOld = $('.background-image.old');
        $backgroundImageNew.css({
          'background':'url('+modelClicked.attributes.backgroundURL + ') no-repeat'
        });

        // Waits for the image, when fully loaded background image in
        $('<img>').attr('src',function(){
          imgUrl = $backgroundImageNew.css('background-image');
          imgUrl = imgUrl.substring(4, imgUrl .length-1);
          return imgUrl;
        }).load(function(){
        // image has loaded lets animate
          $backgroundImageNew.css({'background-size':'cover'});
          $backgroundImageNew.addClass('show');
          $backgroundImageOld.addClass('hide');
        });
      }

      function showDetails(e){
        $films = $('.films-view li');
        $filmsNotActive = $(".films-view li:not(.active)");

        // fade all items apart from the old clicked
        $filmsNotActive.addClass('disabled');
        e.preventDefault();
      }
    }
  });


  //// film collections
  var Films = Backbone.Collection.extend({model:Film, url:movieCollectionURL});
  var films = new Films();

  //// film collection view
  var FilmsCollectionView = Backbone.View.extend({
    firstItemSelected: true,
    initialize: function(){ 
      _.bindAll(this, 'render');
      // set collection events
      this.collection.on('reset', this.render, this);
 
      // change the first render value so we know if it's already been run
      // attach next and prev event to targets
      $('.pager .next').on('click', this.nextFilm);
      $('.pager .prev').on('click', this.prevFilm);
    },
    addOne: function(film){
      var filmView = new FilmView({model: film});
      film._viewPointers = filmView;
      this.$el.append(filmView.render().el); 
      if(this.firstItemSelected === false){
        if(film.get('active') === true){
          filmView.$el.addClass('active');
        }
        else{
          filmView.$el.addClass('disabled');
        }
      }
    },
    addOneToStart: function(film){
      var filmView = new FilmView({model: film});
      film._viewPointers = filmView;
      this.$el.prepend(filmView.render().el);

      if(this.firstItemSelected === false){
        if(film.get('active') === true){
        filmView.$el.addClass('active');
        }
        else{
          filmView.$el.addClass('disabled');
        }
      }
    },
    render: function(){
      var firstFour = this.collection.first(6);
      firstFour.forEach(this.addOne, this);
      return this;
    },
    nextFilm: function(e){
      that = filmCollectionView;
      var lastItemAttr = $('.films-view li:last .poster-link').attr('data-id');
      var lastItem = films.get(lastItemAttr);
      var lastItemIndex = _.indexOf(films.models, lastItem);
      var nextItem = films.at(lastItemIndex+1);

      if(nextItem != undefined){
        // remove first item in view
        $('.films-view li:first').remove();
        // render new Item
        that.addOne(nextItem);
      }
    },
    prevFilm: function(){
      that = filmCollectionView;
      var firstItemAttr = $('.films-view li:first .poster-link').attr('data-id');
      var firstItem = films.get(firstItemAttr);
      var firstItemIndex = _.indexOf(films.models, firstItem);
      var prevItem = films.at(firstItemIndex-1);

      if(prevItem != undefined){
        // remove last item in view
        $('.films-view li:last').remove();
        // render new Item
        that.addOneToStart(prevItem);
      }
    }
  });

  filmCollectionView = new FilmsCollectionView({collection: films, el: $('.films-view')});

  //// details view
  DetailsView = Backbone.View.extend({
    events:{},
    el:$('.details-view'),
    initialize: function(){
      _.bindAll(this, 'render');
    },
    render:function(){
      $('.select-item').remove();
      var model = this.model;
      this.template = _.template($('#details-template').html());
      var renderContent = this.template(this.model.toJSON());
      this.$el.html(renderContent);
      return this;
    }
  });


  //// binding keypress events
  console.log(document.body);
  document.body.addEventListener('keydown', showKeyCode, false);

  function showKeyCode(e) {
    if(e.keyCode === 39){filmCollectionView.nextFilm();}
    if(e.keyCode === 37){filmCollectionView.prevFilm();}   
  }

 //// utility functions used across the app

function getReleaseWeek(){
  var curr = new Date // get current date
  , first = curr.getDate() - curr.getDay() // First day is the day of the month - the day of the week
  , last = first + 6 // last day is the first day + 6
  , firstday = new Date(curr.setDate(first)) // first sunday of the week
  , momentObject = moment(firstday) // date converted to moment.js
  , phasedDate = momentObject.format("D-M-YYYY"); // format with moment.js

  return phasedDate;
}
});
})(jQuery);