define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        Friend = Backbone.DeepModel.extend({

            idAttribute: '_id',
            
            urlRoot: Credentials.server_root + "friend",

            initialize: function (opts) {
                // set ids,etc
                this.url = this.urlRoot + '';
                if(this.id){
                  this.url = this.urlRoot + '/' + this.id;
                } else {
                  this.url = this.urlRoot;
                }
                // console.log(this.url);
            }

        });

    Friend = Backbone.UniqueModel(Friend);

    var FriendCollection = Backbone.Collection.extend({

            model: Friend,

            urlRoot: Credentials.server_root + "friends",

            initialize: function(models, options) {
                options = options || {};

                this.url = this.urlRoot + '';

                if(options.type == 'all'){
                    // this.url = Credentials.server_root + 'mobile/users/friends';
                }
            },

            comparator: function(model){
                return model.get('name').toString().toLowerCase();
            },

        });

    return {
        Friend: Friend,
        FriendCollection: FriendCollection
    };

});