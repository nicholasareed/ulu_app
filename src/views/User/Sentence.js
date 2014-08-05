/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    
    // Extras
    var crypto = require('lib2/crypto');

    // Models
    var UserModel = require('models/user');
    var SentenceModel = require('models/sentence');


    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Model
        this.model = App.Data.User;

        this._activityViews = {};
        this.old_sentence = {};
        this.sentence = {
            start_time: {
                text: 'now',
                value: 'now'
            },
            duration: {
                text: '1 hour',
                value: ['h',1]
            },
            activities: []
        };

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: 50,
            footerSize: 0
        });

        this.createHeader();
        this.createContent();
        
        // Attach to render tree
        this.add(this.layout);

        // // Fetch
        // this.model.fetch({prefill: true});

        // Wait for model to get populated, then add the input surfaces
        // - model should be ready immediately!
        this.model.populated().then(function(){
            that.addSurfaces();
            that.add_activity({
                text: 'whatever',
                value: 'whatever'
            });

            that.update_content();
        });


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // Invite somebody
        this.headerContent = new View();
        this.headerContent.Settings = new Surface({
            content: '<i class="icon ion-gear-a"></i><div>Settings</div>',
            size: [60, undefined],
            classes: ['header-tab-icon-text']
        });
        this.headerContent.Settings.on('click', function(){
            App.history.navigate('settings');
        });

        // create the header
        this.header = new StandardHeader({
            content: "",
            classes: ["normal-header"],
            backContent: false,
            // backClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Settings
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this.header.pipe(this._eventInput);
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })

        // Attach header to the layout        
        this.layout.header.add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;
        
        // create the scrollView of content
        this.contentScrollView = new ScrollView(App.Defaults.ScrollView);
        this.scrollSurfaces = [];

        // link endpoints of layout to widgets

        // Sequence
        this.contentScrollView.sequenceFrom(this.scrollSurfaces);

        // Content Modifiers
        this.layout.content.StateModifier = new StateModifier();

        // Now add content
        this.layout.content.add(this.layout.content.StateModifier).add(this.contentScrollView);


    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // Build Surfaces
        // - add to scrollView

        // I'm down to hang (text)
        this.surface1 = new Surface({
            content: "I'm down to hang",
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        this.surface1.pipe(this.contentScrollView);
        this.surface1.View = new View();
        this.surface1.View.getSize = function(){
            return that.surface1.getSize(true);
        };
        this.surface1.View.StateModifier = new StateModifier();
        this.surface1.View.add(this.surface1.View.StateModifier).add(this.surface1);
        this.scrollSurfaces.push(this.surface1.View);


        // at START TIME
        this.startTimeSurface = new Surface({
            content: "at <span></span>",
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        this.startTimeSurface.on('click', function(){
            var timeOptions = [{
                text: 'Now',
                value: 'now'
            }]
            if(moment().hour() < 12){
                timeOptions.push({
                text: 'Noon',
                value: '12'
                });
            }
            if(moment().hour() < 5){
                timeOptions.push({
                text: 'Evening',
                value: '17'
                });
            }
            if(moment().hour() < 10){
                timeOptions.push({
                text: 'Late Night',
                value: '22'
                });
            }
            // Launch popover/modal list of times
            App.Cache.OptionModal = {
                list: timeOptions,
                on_choose: function(chosen_type){
                    that.sentence.start_time = chosen_type;
                    that.update_content();
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                    // debugger;
                },
                title: 'Change Timeframe',
                back_to_default_hint: false
            };
            App.history.navigate('modal/list', {history: false});

        });
        this.startTimeSurface.View = new View();
        this.startTimeSurface.View.getSize = function(){
            return that.startTimeSurface.getSize(true);
        };
        this.startTimeSurface.View.StateModifier = new StateModifier();
        this.startTimeSurface.View.add(this.startTimeSurface.View.StateModifier).add(this.startTimeSurface);
        this.scrollSurfaces.push(this.startTimeSurface.View);


        // for DURATION
        this.durationSurface = new Surface({
            content: "for <span>1 hour</span>",
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        this.durationSurface.on('click', function(){
            var durationOptions = [{
                text: '30m',
                value: ['m',30]
            },{
                text: '1 hour',
                value: ['h',1]
            },{
                text: '2 hours',
                value: ['h',2]
            },{
                text: '3 hours',
                value: ['h',3]
            }];
            // Launch popover/modal list of times
            App.Cache.OptionModal = {
                list: durationOptions,
                on_choose: function(chosen_type){
                    that.sentence.duration = chosen_type;
                    that.update_content();
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                    // debugger;
                },
                title: 'Change Timeframe',
                back_to_default_hint: false
            };
            App.history.navigate('modal/list', {history: false});

        });
        this.durationSurface.View = new View();
        this.durationSurface.View.getSize = function(){
            return that.durationSurface.getSize(true);
        };
        this.durationSurface.View.StateModifier = new StateModifier();
        this.durationSurface.View.add(this.durationSurface.View.StateModifier).add(this.durationSurface);
        this.scrollSurfaces.push(this.durationSurface.View);


        this.createActivities();


        // Everyone or Select
        this.EveryoneOrSelectLayout = new FlexibleLayout({
            ratios: [1,1]
        });
        this.EveryoneOrSelectLayout.Views = [];
        this.EveryoneOrSelectLayout.View = new View();
        this.EveryoneOrSelectLayout.SizeMod = new StateModifier({
            size: [undefined, 60]
        });
        this.EveryoneOrSelectLayout.StateModifier = new StateModifier();
        this.EveryoneOrSelectLayout.View.add(this.EveryoneOrSelectLayout.StateModifier).add(this.EveryoneOrSelectLayout.SizeMod).add(this.EveryoneOrSelectLayout);

        // Everyone
        this.EveryoneSurface = new Surface({
            content: "All Friends",
            size: [undefined, undefined],
            classes: ['sentence-normal-default', 'sentence-normal-button-default']
        });
        this.EveryoneSurface.on('click', function(){
            // Submit your sentence
            // - loading dialogue

            var start_time = new Date();
            if(that.sentence.start_time.value != 'now'){
                start_time = moment().hour(that.sentence.start_time.value).minute(0).second(0).millisecond(0).format();
            }
            console.log(that.sentence.activities);
            var Sentence = new SentenceModel.Sentence({
                start_time: start_time, // Javascript new Date
                end_time: moment(start_time).add(that.sentence.duration.value[0],that.sentence.duration.value[1]).format(),
                duration: that.sentence.duration.text, // just a string
                location: null,
                activities: that.sentence.activities
            });

            Sentence.save()
            .then(function(result){
                App.history.navigate('user/sentence_friends/' + CryptoJS.SHA3(new Date().toString()));
                // SentenceModel.set(result);
                // App.Cache.current_sentence = SentenceModel;
                // App.history.navigate('user/sentence_friends');
            });

            // App.history.navigate('user/sentence_friends');
            
        });
        this.EveryoneOrSelectLayout.Views.push(this.EveryoneSurface);

        // Select Friends
        this.SelectSurface = new Surface({
            content: "Select 'em",
            size: [undefined, undefined],
            classes: ['sentence-normal-default']
        });
        this.EveryoneOrSelectLayout.Views.push(this.SelectSurface);

        this.EveryoneOrSelectLayout.sequenceFrom(this.EveryoneOrSelectLayout.Views);
        this.scrollSurfaces.push(this.EveryoneOrSelectLayout.View);

    };

    PageView.prototype.createActivities = function(){
        var that = this;

        this.activitiesLayout = new SequentialLayout();
        this.activitiesLayout.Views = [];


        this.activitiesInstrSurface = new Surface({
            content: "I'm down to",
            size: [window.innerWidth, true],
            classes: ['sentence-normal-default']
        });
        this.activitiesInstrSurface.View = new View();
        this.activitiesInstrSurface.View.getSize = function(){
            return that.activitiesInstrSurface.getSize(true);
        };
        this.activitiesInstrSurface.View.StateModifier = new StateModifier();
        this.activitiesInstrSurface.View.add(this.activitiesInstrSurface.View.StateModifier).add(this.activitiesInstrSurface);
        // this.scrollSurfaces.push(this.activitiesInstrSurface.View);

        this.activitiesLayout.Views.push(this.activitiesInstrSurface.View);


        // Add the first "add +" activity

        // wanna ACTIVITIES
        this.activitiesAddSurface = new Surface({
            content: '<i class="icon ion-plus"></i>',
            size: [window.innerWidth, true],
            classes: ['sentence-normal-default']
        });
        this.activitiesAddSurface.on('click', function(){
            // Choose a few activities via popup
            var tmpactivities = ['whatever','just chill','outside','competition','movie','go out','a drink or two','lets rage'];

            var activityOptions = [];

            tmpactivities.forEach(function(act){
                activityOptions.push({
                    text: act,
                    value: act
                });
            });


            // Launch popover/modal list of times
            App.Cache.OptionModal = {
                list: activityOptions,
                on_choose: function(chosen_type){

                    if(that.sentence.activities.indexOf(chosen_type.value) === -1){
                        // add to array
                        that.add_activity(chosen_type);

                    } else {
                        // remove it
                        that.sentence.activities = _.without(that.sentence.activities, chosen_type.value);

                        // Remove an activity from SequentialLayout
                        that.activitiesLayout.Views = _.without(that.activitiesLayout.Views, that._activityViews[chosen_type.value]);

                        that.activitiesLayout.sequenceFrom(that.activitiesLayout.Views);
                    }

                    // Already in list (remove it)
                    that.update_content();
                },
                on_cancel: function(){
                    // App.history.navigate(that.previousPage);
                    // debugger;
                },
                title: 'Change Timeframe',
                back_to_default_hint: false
            };
            App.history.navigate('modal/list', {history: false});

        });
        this.activitiesAddSurface.View = new View();
        this.activitiesAddSurface.View.getSize = function(){
            // console.log(that.activitiesAddSurface.getSize(true));
            return that.activitiesAddSurface.getSize(true);
        };
        this.activitiesAddSurface.View.StateModifier = new StateModifier();
        this.activitiesAddSurface.View.add(this.activitiesAddSurface.View.StateModifier).add(this.activitiesAddSurface);
        // this.scrollSurfaces.push(this.activitiesAddSurface.View);

        this.activitiesLayout.Views.push(this.activitiesAddSurface.View);

        this.activitiesLayout.sequenceFrom(this.activitiesLayout.Views);

        this.activitiesLayout.View = new View();
        this.activitiesLayout.View.StateModifier = new StateModifier();
        this.activitiesLayout.View.add(this.activitiesLayout.View.StateModifier).add(this.activitiesLayout);

        this.scrollSurfaces.push(this.activitiesLayout.View);

    };

    PageView.prototype.update_content = function(){
        var that = this;

        // this.startTimeSurface.setContent(this.model.get('position') || 0);

        if(this.old_sentence == this.sentence){
            return;
        }

        // Update the values

        // Start Time
        switch(this.sentence.start_time.value){
            case 'now':
                that.startTimeSurface.setContent('<span>now</span>');
                break;
            default:
                // time chosen
                that.startTimeSurface.setContent('at <span>'+ this.sentence.start_time.text +'</span>');
                break;
        }

        // Duration
        switch(this.sentence.duration.value){
            case 'today':
                that.durationSurface.setContent('for <span>tonight</span>');
                break;
            default:
                // time chosen
                that.durationSurface.setContent('for <span>'+ this.sentence.duration.text +'</span>');
                break;
        }

        // Activities (things to do)
        // - handled 

        this.old_sentence = _.clone(this.sentence);

    };

    PageView.prototype.add_activity = function(chosen_type){
        var that = this;
        
        // Activities (things to do)
        // - need to resequence them

        // add it to sentence summary obj
        that.sentence.activities.push(chosen_type.value);

        // I'm down to hang (text)
        var tmpSurface = new Surface({
            content: '<span>' + chosen_type.value + '</span>',
            size: [undefined, true],
            classes: ['sentence-normal-default']
        });
        tmpSurface.on('click', function(){
            // remove it
            that.sentence.activities = _.without(that.sentence.activities, chosen_type.value);
            // Remove an activity from SequentialLayout
            that.activitiesLayout.Views = _.without(that.activitiesLayout.Views, tmpSurface.View);
            that.activitiesLayout.sequenceFrom(that.activitiesLayout.Views);
            console.log(that.activitiesLayout.Views);
        });
        tmpSurface.View = new View();
        tmpSurface.View.getSize = function(){
            return that.surface1.getSize(true);
        };
        tmpSurface.View.StateModifier = new StateModifier();
        tmpSurface.View.add(tmpSurface.View.StateModifier).add(tmpSurface);

        this.activitiesLayout.Views.splice(this.activitiesLayout.Views.length - 1, 0, tmpSurface.View);

        this._activityViews[chosen_type.value] = tmpSurface.View;

    };

    PageView.prototype.refreshData = function(ev){
        var that = this;

        this.model.fetch();

        return false;
    };

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hide/move elements
                        window.setTimeout(function(){

                            // Slide content left
                            that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    // window.setTimeout(that.refreshData.bind(that), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default position
                        // if(goingBack){
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth * -1,0,0));
                        // } else {
                        //     that.layout.content.StateModifier.setTransform(Transform.translate(window.innerWidth + 100,0,0));
                        // }
                        that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0));
                        // that.scrollSurfaces.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        window.setTimeout(function(){

                            // // Bring content back
                            // that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.inTransition);

                            // // Bring in button surfaces individually
                            // that.scrollSurfaces.forEach(function(surf, index){
                            //     window.setTimeout(function(){
                            //         surf.StateModifier.setTransform(Transform.translate(0,0,0), {
                            //             duration: 1500,
                            //             curve: Easing.inOutElastic
                            //         });
                            //     }, index * 50);
                            // });

                        }, delayShowing); // + transitionOptions.outTransition.duration);

                        break;
                }
                break;
        }
        
        return transitionOptions;
    };



    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50],
            // inTransition: true,
            // outTransition: true,
            // look: {
            //     size: [undefined, 50]
            // }
        },
        footer: {
            size: [undefined, 0]
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
