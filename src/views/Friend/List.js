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

    // Subviews
    var StandardHeader = require('views/common/StandardHeader');

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var numeral = require('lib2/numeral.min');

    // Side menu of options
    var GameMenuView      = require('views/Game/GameMenu');

    // Notifications SubView
    var AllView      = require('./Subviews/All');
    var PotentialView      = require('./Subviews/Potential');
    var IncomingView      = require('./Subviews/Incoming');
    var OutgoingView      = require('./Subviews/Outgoing');
    

    // Models
    var MediaModel = require('models/media');

    function PageView(params) {
        var that = this;
        View.apply(this, arguments);
        this.params = params;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: 60
        });

        this.createHeader();

        this._subviews = [];

        // Wait for User to be resolved
        App.Data.User.populated().then((function(){
            this.createContent();
        }).bind(this));

        this.add(this.layout);

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Invite somebody
        this.headerContent = new View();
        this.headerContent.Invite = new Surface({
            content: '<i class="icon ion-ios7-plus-outline"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Invite.on('click', function(){
            // App.Cache.FriendListOptions = {
            //     default: 'outgoing'
            // };
            App.history.navigate('friend/add');
        });

        // create the header
        this.header = new StandardHeader({
            content: "Friends",
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            // moreContent: false
            // backContent: false,
            // moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Invite
            ]
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

        // this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.contentScrollView = new FlexibleLayout({
            direction: FlexibleLayout.DIRECTION_Y,
            ratios: [true, 1]
        });
        this.contentScrollView.Views = [];

        // Content
        this.ContentStateModifier = new StateModifier();

        // Create the Tabs
        this.TopTabs = new View();
        this.TopTabs.Bar = new TabBar();
        this.TopTabs.BarSizeMod = new StateModifier({
            size: [undefined, 50]
        });
        this.TopTabs.getSize = function(){
            return [undefined, 50];
        };
        this.TopTabs.add(this.TopTabs.BarSizeMod).add(this.TopTabs.Bar);

        this.TopTabs.Bar.defineSection('all', {
            content: '<i class="icon ion-android-friends"></i><div>All</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        this.TopTabs.Bar.defineSection('potential', {
            content: '<i class="icon ion-android-social"></i><div>Potential</div>',
            onClasses: ['inbox-tabbar-default', 'on'],
            offClasses: ['inbox-tabbar-default', 'off']
        });
        // this.TopTabs.Bar.defineSection('incoming', {
        //     content: '<i class="icon ion-arrow-down-a"></i><div>Incoming</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });
        // this.TopTabs.Bar.defineSection('outgoing', {
        //     content: '<i class="icon ion-ios7-checkmark-outline"></i><div>Outgoing</div>',
        //     onClasses: ['inbox-tabbar-default', 'on'],
        //     offClasses: ['inbox-tabbar-default', 'off']
        // });

        // Add tabs to sequence
        this.contentScrollView.Views.push(this.TopTabs);

        // Tab content
        this.TopTabs.Content = new RenderController();

        // All 
        this.TopTabs.Content.AllFriends = new View();
        this.TopTabs.Content.AllFriends.View = new AllView();
        this.TopTabs.Content.AllFriends.add(this.TopTabs.Content.AllFriends.View);
        this._subviews.push(this.TopTabs.Content.AllFriends.View);

        // Potential 
        this.TopTabs.Content.PotentialFriends = new View();
        this.TopTabs.Content.PotentialFriends.View = new PotentialView();
        this.TopTabs.Content.PotentialFriends.add(this.TopTabs.Content.PotentialFriends.View);
        this._subviews.push(this.TopTabs.Content.PotentialFriends.View);

        // // Incoming
        // this.TopTabs.Content.IncomingInvites = new View();
        // this.TopTabs.Content.IncomingInvites.View = new IncomingView();
        // this.TopTabs.Content.IncomingInvites.add(this.TopTabs.Content.IncomingInvites.View);
        // this._subviews.push(this.TopTabs.Content.IncomingInvites.View);

        // // Outgoing
        // this.TopTabs.Content.OutgoingInvites = new View();
        // this.TopTabs.Content.OutgoingInvites.View = new OutgoingView();
        // this.TopTabs.Content.OutgoingInvites.add(this.TopTabs.Content.OutgoingInvites.View);
        // this._subviews.push(this.TopTabs.Content.OutgoingInvites.View);

        // Add Lightbox to sequence
        this.contentScrollView.Views.push(this.TopTabs.Content);

        // Listeners for Tabs
        this.TopTabs.Bar.on('select', function(result){
            switch(result.id){

                case 'all':
                    that.TopTabs.Content.show(that.TopTabs.Content.AllFriends);
                    // that.TopTabs.Content.AllFriends.View.collection.fetch();
                    break;

                case 'potential':
                    that.TopTabs.Content.show(that.TopTabs.Content.PotentialFriends);
                    // that.TopTabs.Content.AllFriends.View.collection.fetch();
                    break;

                case 'incoming':
                    that.TopTabs.Content.show(that.TopTabs.Content.IncomingInvites);
                    // that.TopTabs.Content.IncomingInvites.View.collection.fetch();
                    break;

                case 'outgoing':
                    that.TopTabs.Content.show(that.TopTabs.Content.OutgoingInvites);
                    // that.TopTabs.Content.OutgoingInvites.View.collection.fetch();
                    break;

                default:
                    alert('none chosen');
                    break;
            }
        });

        // This depends on the previously selected! 
        var default_selected = 'all';
        // try {
        //     default_selected = App.Cache.FriendListOptions.default || 'all';
        // }catch(err){console.error(err);}
        this.TopTabs.Bar.select(default_selected);

        this.layout.content.add(this.ContentStateModifier).add(this.contentScrollView);

        // Flexible Layout sequencing
        this.contentScrollView.sequenceFrom(this.contentScrollView.Views);

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
