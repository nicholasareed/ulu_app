define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Utils               = require('utils'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        Contact = Backbone.DeepModel.extend({

            idAttribute: 'id', // Local contacts, not stored on server!
            
            urlRoot: Credentials.server_root + "contact",

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

    Contact = Backbone.UniqueModel(Contact);

    var ContactCollection = Backbone.Collection.extend({

            model: Contact,

            urlRoot: Credentials.server_root + "contacts",

            initialize: function(models, options) {
                options = options || {};
                this.options = options;

                this.url = this.urlRoot + '';

                if(options.type == 'all'){
                    // this.url = Credentials.server_root + 'mobile/users/contacts';
                }
            },

            filterContacts: function(){
                // Filter through "this.AllContacts" and return matched ones
                var that = this;

                var def = $.Deferred();

                var filter = that.options.filter;

                setTimeout(function(){

                    var models = [];
                    that.AllContacts.forEach(function(Contact){
                        if(Contact.displayName.toLowerCase().indexOf( filter ) !== -1){
                            // Found it
                            models.push(Contact);
                        }
                    });
                    def.resolve(models);

                },1);

                return def.promise();

            },

            fetchContacts: function(){
                var that = this;

                var def = $.Deferred();

                // find all contacts
                var options      = new ContactFindOptions();
                options.filter   = "*"; // any/all contacts
                options.multiple = true;
                options.desiredFields = [navigator.contacts.fieldType.id]; // required fields? requires a phone number?
                var fields       = [navigator.contacts.fieldType.displayName, navigator.contacts.fieldType.name];
                navigator.contacts.find(fields, function(contacts){
                    that.AllContacts = contacts;
                    def.resolve();
                }, function(err){
                    Utils.Notification.Toast('Failed loading contacts');
                    def.reject(err);
                }, options);

                return def.promise();

            },

            comparator: function(model){
                return model.get('name').toString().toLowerCase();
            },

        });

    return {
        Contact: Contact,
        ContactCollection: ContactCollection
    };

});