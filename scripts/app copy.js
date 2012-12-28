(function($){

$(document).ready(function(){
  var mbdConfig;

  //////// start of film model/view/collection creation ////////

  //// film model
  var Film = Backbone.Model.extend({});

  //// film view
  var FilmView = Backbone.View.extend({
    tagName:'li',
    events:{
      'click a.poster-link': 'viewOpened',
      'click a.close-link': 'viewClosed'
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
    viewOpened: function(e){
      $('ul.films-view li:last-child').off('transitionend webkitTransitionEnd oTransitionEnd otransitionend');
      // remove the click event so we can't exit the view without pressing close
      $('ul.films-view li').undelegate('a.poster-link', 'click');
      // destory any currently active items
      $('.films-view li').removeClass('active');
      // add active to item clicked
      this.$el.toggleClass('active');
      this.$el.children('.close-link').toggleClass('show');

      // run transitions animation and display details
      changeBackgroundImg();
      showDetails(e);
      eventHandlers();

      function eventHandlers(){
    
      }

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


        // this waits for the image to load before it starts to fade it in
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
        var itemTopPosition = $films.filter(':first-child').offset();

        $films = $('.films-view li');
        $films.css({'position':'absolute'});
        $(e.currentTarget).next('.close-link').addClass('show');

        $films.each(function(){
          var theItem = $(this),
          itemPosition = theItem.offset();
           
          // store the left and right poisition of each item to use later
          theItem.data('cssPosition', {left:itemPosition.left, top:itemPosition.top});
        });

        
        // lets hide all the posters after one is clicked CSS transforms to those that
        // support it jQuery animation for thoes who don't
        if(Modernizr.csstransforms){
          $films.css({
          'left': 40,
          'top': itemTopPosition.top
          }, 600);
        }
        else{
          $films.animate({
          'left': 40,
          'top': itemTopPosition.top
          }, 600);
        }
      }
   
      $(e.currentTarget).parent('.poster').next().css({'display':'block'});

      e.preventDefault();
    },
    viewClosed: function(e){
          var $films =  $('.films-view li');
          $films.find('.close-link').removeClass('show');

          $('.films-view li').filter('.active').removeClass('active');

          $films.each(function(){
            $(this).css({
              'left':$(this).data('cssPosition').left,
              'top':$(this).data('cssPosition').top
            });
          });

    $('ul.films-view li:last-child').on('transitionend webkitTransitionEnd oTransitionEnd otransitionend', function() {
      // redelegate the viewOpened function to each a.poster-link

     films.forEach(function(film){      
          film._viewPointers.$el.delegate('a.poster-link', 'click', function(e){
            film._viewPointers.viewOpened.call(film._viewPointers, e);
          });
      });
    });

      $films.filter('active').children('.close-link').css({'display':'block'});
      
      // reattach the open click events to the posters
       // $(this.el).delegate('a.poster-link', 'click', this.viewOpened);
    }
  });

  //// film collections
  var Films = Backbone.Collection.extend({model:Film, url:'../movies/Sun/movies-collection.json'});
  var films = new Films();

  //// film collection view
  var FilmsCollectionView = Backbone.View.extend({
    initialize: function(){ 
      _.bindAll(this, 'render');
      this.collection.on('reset', this.render, this);
      this.collection.on('add', this.render, this);
    },
    addOne: function(film){
      var filmView = new FilmView({model: film});
      film._viewPointers = filmView;
      this.$el.append(filmView.render().el);
    },
    render: function(){
      this.collection.forEach(this.addOne, this);

       $films = $('.films-view li');
       $films.each(function(){
          var theItem = $(this),
          itemPosition = theItem.offset();

          theItem.css({
            'left':  itemPosition.left,
            'top': itemPosition.top
          });
        });

      return this;
    },
    nextFilm: function(){},
    prevFilm: function(){}
  });

  filmCollectionView = new FilmsCollectionView({collection: films, el: $('.films-view')});

  //////// seprate animations for later use on other models/views ////////

  viewTransitions = {} 

  //////// get the config film for MDB ////////
  $.ajax({
    url: '/movies/Sun/mdbConfig.json' 
  }).success(function(data){
    films.fetch();
    mbdConfig = data;
  });

});
})(jQuery);