/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    // Helpers
    var Utils = require('utils');
    var $ = require('jquery-adapter');
    var Handlebars = require('lib2/handlebars-helpers');

    var TabBar = require('famous/widgets/TabBar');
    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    // common views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardCardDeck = require('views/common/StandardCardDeck');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var AllView      = require('./Subviews/All');
    var IncomingView      = require('./Subviews/Incoming');
    var OutgoingView      = require('./Subviews/Outgoing');
    

    // Models
    var MediaModel = require('models/media');
    var PotentialSelectModel = require('models/potential_select');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 0
        });

        this.createHeader();

        this._subviews = [];

        // Wait for User to be resolved
        // App.Data.User.populated().then((function(){
            this.createContent();
        // }).bind(this));

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        this.room_hash = 'default';
        try {
            this.room_hash = this.params.args[0].toLowerCase();
            if(this.room_hash == ''){
                this.room_hash = 'default';
            }
        }catch(err){
            this.room_hash = 'default';
        }

        this.collection = new PotentialSelectModel.PotentialSelectCollection([],{
            hash: this.room_hash
        });

        this.collection.infiniteResults = 0;
        this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        // this.collection.on("add", this.addOne, this);
        this.collection.on("error", function(){
            console.error('Collection error');
        });

        this.collection.fetch();


    };

    PageView.prototype.createDefaultViews = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        this.contentController = new RenderController({
            size: [undefined, undefined]
        });
        // this.contentController.getSize = function(){
        //     try {
        //         var s = this._renderables[this._showing].getSize(true);
        //         if(s){
        //             this.lastSize = [undefined, s[1]];
        //             return [undefined, s[1]];
        //         }
        //     }catch(err){}
        //     // Last Size?
        //     if(this.lastSize){
        //         return this.lastSize;
        //     }
        //     return [undefined, true];
        // };

        // Loading (initial view)
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        
        // No Results (click to refresh)
        this.noResultsView = new View();
        this.noResultsView.ZMod = new StateModifier();
        this.noResultsView.Surface = new Surface({
            content: "No More Results!",
            size: [undefined, 100],
            classes: ['loading-surface-default'],
            // properties: {
            //     backgroundColor: 'red'
            // }
        });
        this.noResultsView.Surface.on('click', function(){
            that.collection.fetch();
        });
        this.noResultsView.add(this.noResultsView.ZMod).add(this.noResultsView.Surface);
        this.noResultsView.Surface.pipe(this._eventOutput);

    };
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // // Icons

        // // Invite somebody
        // this.headerContent = new View();
        // this.headerContent.Invite = new Surface({
        //     content: '<i class="icon ion-ios7-plus-outline"></i>',
        //     size: [60, undefined],
        //     classes: ['header-tab-icon-text-big']
        // });
        // this.headerContent.Invite.on('click', function(){
        //     // App.Cache.FriendListOptions = {
        //     //     default: 'outgoing'
        //     // };
        //     App.history.navigate('friend/add');
        // });

        // create the header
        this.header = new StandardHeader({
            content: '#' + this.room_hash,
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreContent: false
            // backContent: false,
            // moreClasses: ["normal-header"],
            // moreSurfaces: [
            //     this.headerContent.Invite
            // ]
            // moreContent: "New", //'<span class="icon ion-navicon-round"></span>'
        });
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });

        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // // Node for Modifier and background
        // this.HeaderNode = new RenderNode();
        // this.HeaderNode.add(this.headerBg);
        // this.HeaderNode.add(this.header.StateModifier).add(this.header);

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };
    
    PageView.prototype.createContent = function(){
        var that = this;


        this.createDefaultViews();

        // show "loading" surface by default
        this.contentController.show(this.loadingSurface);

        this.cardLayout = new StandardCardDeck();
        this.cardLayout.Views = [];

        // // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        // this.contentLayout = new FlexibleLayout({
        //     direction: FlexibleLayout.DIRECTION_Y,
        //     ratios: [true, 1]
        // });
        // this.contentLayout.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();


        this.layout.content.add(this.ContentStateModifier).add(this.contentController);

        // // Flexible Layout sequencing
        // this.contentLayout.sequenceFrom(this.contentLayout.Views);

    };

    PageView.prototype.build_cards = function() { 
        var that = this;



    };


    PageView.prototype.ignore_user = function(tmpCard) { 
        // swiped left, tapped No
        var that = this;

        console.log('clicked, ignoring');
        console.log(tmpCard);

        // remove from the collection
        this.collection.remove(tmpCard.Model.get('_id'));

        // transition view out
        tmpCard.StateModifier.setTransform(Transform.translate(-1 * window.innerWidth, 0, 0), {
            duration: 350,
            curve: 'linear'
        }, function(){
            console.info('complete animation');
        });

    };

    PageView.prototype.match_user = function(tmpCard) { 
        // wanted to match with this user! 
        var that = this;

        console.log('clicked, matching');
        console.log(tmpCard);

        // remove from the collection
        this.collection.remove(tmpCard.Model.get('_id'));

        // transition view out
        tmpCard.StateModifier.setTransform(Transform.translate(window.innerWidth, 0, 0), {
            duration: 350,
            curve: 'linear'
        }, function(){
            console.info('complete animation');
        });
        

    };

    PageView.prototype.addOne = function(Model) { 
        var that = this;

        // Add a Card to the cardLayout

        var tmpCard = new View();
        tmpCard.ZMod = new StateModifier();
        tmpCard.StateModifier = new StateModifier({
            // origin: [0.5, 0.5]
        });


        tmpCard.SeqLayout = new SequentialLayout();
        tmpCard.SeqLayout.Views = [];

        // Name Surface
        tmpCard.NameSurface = new Surface({
            content: Model.get('name'),
            size: [undefined, 80],
            classes: [],
            properties: {
                textAlign: 'center',
                background: '#fefefe'
            }
        });

        // Options (grid)
        tmpCard.OptionGridView = new View();
        tmpCard.OptionGrid = new GridLayout({
            dimensions: [2,1]
        });
        tmpCard.OptionGrid.Views = [];

        // No
        tmpCard.NoSurface = new Surface({
            content: 'No',
            size: [undefined, undefined],
            classes: [],
            properties: {
                textAlign: 'center',
                background: 'red',
                color: 'white'
            }
        });
        tmpCard.NoSurface.on('click', function(){
            that.ignore_user(tmpCard);
        });
        tmpCard.OptionGrid.Views.push(tmpCard.NoSurface);

        // Yes
        tmpCard.YesSurface = new Surface({
            content: 'Yes',
            size: [undefined, undefined],
            classes: [],
            properties: {
                textAlign: 'center',
                background: 'green',
                color: 'white'
            }
        });
        tmpCard.YesSurface.on('click', function(){
            that.match_user(tmpCard);
        });
        tmpCard.OptionGrid.Views.push(tmpCard.YesSurface);

        tmpCard.OptionGrid.SizeMod = new StateModifier({
            size: [undefined, 60]
        });

        tmpCard.OptionGrid.sequenceFrom(tmpCard.OptionGrid.Views);
        tmpCard.OptionGridView.add(tmpCard.OptionGrid.SizeMod).add(tmpCard.OptionGrid);

        // SequentialLayout push
        tmpCard.SeqLayout.Views.push(tmpCard.NameSurface);
        tmpCard.SeqLayout.Views.push(tmpCard.OptionGridView);

        // tmpCard.getSize = function(){
        //     return tmpCard.SeqLayout.getSize();
        // };

        tmpCard.SeqLayout.sequenceFrom(tmpCard.SeqLayout.Views);
        tmpCard.add(tmpCard.ZMod).add(tmpCard.StateModifier).add(tmpCard.SeqLayout);

        tmpCard.Model = Model;

        // Add to cards model
        this.cardLayout.Views.push(tmpCard);

        this._subviews.push(tmpCard);

    };


    PageView.prototype.updateCollectionStatus = function() { 

        var that = this;

        // Have any results?

        this.contentController.show(this.cardLayout);


        // Make sure the last card in the stack is the "no more results" card (switch it to the loading...no results render controller!)
        this.cardLayout.Views = _.without(this.cardLayout.Views, this.noResultsView);

        // Clean out the beginning, and add any "new" cards to the back
        
        // Figure out which surfaces to remove/keep, re-order, etc.
        var player_ids_to_keep = _.pluck(this.collection.toJSON(), '_id'),
            views_to_add = [];

        // Remove unneeded views
        this.cardLayout.Views = _.filter(this.cardLayout.Views, function(tmpPersonView, index){
            // don't remove the one we are looking at!
            if(index === 0){
                return true;
            }
            if(player_ids_to_keep.indexOf(tmpPersonView.Model.get('_id')) !== -1){
                return true;
            }
            return false;
        });

        // get existing, to figure out which to create
        var existing_view_player_ids = _.map(this.cardLayout.Views, function(tmpPersonView){
            return tmpPersonView.Model.get('_id');
        });

        // create new surfaces
        var to_create_ids = _.difference(player_ids_to_keep, existing_view_player_ids);
        this.collection.forEach(function(tmpPotentialModel){
            if(to_create_ids.indexOf(tmpPotentialModel.get('_id')) === -1){
                // already added!
                return;
            }

            that.addOne(tmpPotentialModel);

        });


        // Add "no more results" to the back
        this.cardLayout.Views.push(this.noResultsView);

        // redo ZMod's
        var topLevel = 0.001;
        this.cardLayout.Views.forEach(function(tmpView, index){
            // tmpView.Surface.setContent(index);
            tmpView.ZMod.setTransform(Transform.translate(0,0,topLevel+0.0));
            topLevel -= 0.0001;
        });

        // re-sequence
        this.cardLayout.sequenceFrom(this.cardLayout.Views);
        // this.cardLayout.close(); // make sure it is closed/stacked!
        // this.cardLayout.open(); // make sure it is closed/stacked!

        console.log(this.cardLayout.Views);

        // return;



        // // get existing, to figure out which to create
        // var existing_view_player_ids = _.map(this.contentScrollView.Views, function(tmpPlayerView){
        //     return tmpPlayerView.Model.get('_id');
        // });

        // // create new surfaces
        // var to_create_ids = _.difference(player_ids_to_keep, existing_view_player_ids);
        // this.collection.forEach(function(tmpPlayerModel){
        //     if(to_create_ids.indexOf(tmpPlayerModel.get('_id')) === -1){
        //         // already added!
        //         return;
        //     }

        //     that.addOne(tmpPlayerModel);
        //     // var userView = new View(),
        //     //     name = tmpPlayerModel.get('profile.name') || '&nbsp;',
        //     //     username = tmpPlayerModel.get('username');

        //     // userView.Model = tmpPlayerModel;
        //     // userView.Surface = new Surface({
        //     //      content: '<div>@' +username+'</div><div>' + name + '</div>',
        //     //      size: [undefined, 60],
        //     //      classes: ['player-list-item-default']
        //     // });
        //     // userView.Surface.on('click', function(){
        //     //     App.history.navigate('player/' + tmpPlayerModel.get('_id'));
        //     // });
        //     // userView.add(userView.Surface);

        //     // that.contentScrollView.Views.push(userView);
        // });

        // // sort existing
        // this.contentScrollView.Views = _.sortBy(this.contentScrollView.Views, function(tmpPlayerView){
        //     return tmpPlayerView.Model.get('username').toLowerCase();
        // });


        // return;





        // // Update amounts left
        // var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        // this.infinityShowMoreSurface.setContent(amount_left + ' more');
        // this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        // var nextRenderable;
        // if(this.collection.length == 0 && this.collection.infiniteResults == 0){
        //     nextRenderable = this.emptyListSurface;
        // } else {
        //     nextRenderable = this.contentLayout;
        // }

        // if(nextRenderable != this.lightboxContent.lastRenderable){
        //     this.lightboxContent.lastRenderable = nextRenderable;
        //     this.lightboxContent.show(nextRenderable);
        // }

        // // // Splice out the lightboxButtons before sorting
        // // this.contentLayout.Views.pop();

        // // Resort the contentLayout.Views
        // this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(v){
        //     try {
        //         var m = moment(v.Surface.Model.get('created'));
        //         return m.format('X') * -1;
        //     }catch(err){
        //         // normal view?
        //         if(v.Surface){
        //             console.error('====', v);
        //         }
        //         return 1000000;
        //     }
        // });

        // // this.contentLayout.Views.push();

        // // Re-sequence?
        // if(this.contentLayout.Views.length > 0){
        //     this.contentLayout.sequenceFrom(this.contentLayout.Views);
        // }

        // // this.layout.sequenceFrom([]);
        // // this.layout.sequenceFrom([
        // //     // this.contentLayout, // another SequentialLayout
        // //     this.lightboxContent,
        // //     this.lightboxButtons
        // // ]);

        // // Show correct infinity buttons (More, All, etc.)
        // this.render_infinity_buttons();

    };

    PageView.prototype.refreshData = function() {
        try {
            // this.model.fetch();
            // this.media_collection.fetch();
            // this.errorList.fetch();
            // this.alert_collection.fetch();
            // this.CarTripListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':

                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        window.setTimeout(function(){

                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            // Slide down
                            // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;

            case 'showing':
                if(this._refreshData){
                    window.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // // Default position
                        // if(goingBack){
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.ContentStateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        // that.ContentStateModifier.setTransform(Transform.translate(0, window.innerHeight, 0));

                        // Header
                        window.setTimeout(function(){

                            // // Change header opacity
                            // that.header.StateModifier.setOpacity(1, transitionOptions.outTransition);


                        }, delayShowing);

                        // Content
                        // - extra delay
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        // //Fade out the header
                        // // var previousTransform = transitionOptions.outTransform;
                        // transitionOptions.outTransform = Transform.identity;

                        // // Move the content to the left
                        // // - not the footer
                        // // console.log(transitionOptions.outTransform);
                        // // debugger;
                        // window.setTimeout(function(){

                        //     // Bring map content back
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                        //     // Bring Footer Up
                        //     that.layout.footer.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        // }, delayShowing);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };


    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
        },
        footer: {
            size: [0,0]
        },
        content: {
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});