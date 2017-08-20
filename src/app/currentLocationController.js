// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2014 Saurabh Patel <srp201201051@gmail.com>
//
// Gnome Weather is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by the
// Free Software Foundation; either version 2 of the License, or (at your
// option) any later version.
//
// Gnome Weather is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
// for more details.
//
// You should have received a copy of the GNU General Public License along
// with Gnome Weather; if not, write to the Free Software Foundation,
// Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const GWeather = imports.gi.GWeather;
const Geoclue = imports.gi.Geoclue;

const Util = imports.misc.util;

var AutoLocation = {
    DISABLED: 0,
    ENABLED: 1,
    NOT_AVAILABLE: 2
};

var CurrentLocationController = new Lang.Class({
    Name: 'CurrentLocationController',

    _init: function(world) {
        this._world = world;
        this._processStarted = false;
        this._settings = Util.getSettings('org.gnome.Weather.Application');
        let autoLocation = this._settings.get_value('automatic-location').deep_unpack();
        this._syncAutoLocation(autoLocation);
        if (this.autoLocation == AutoLocation.ENABLED)
            this._startGeolocationService();
        this.currentLocation = null;
    },

    _startGeolocationService: function() {
        this._processStarted = true;
        Geoclue.Simple.new(pkg.name,
                           Geoclue.AccuracyLevel.CITY,
                           null,
                           Lang.bind (this, this._onSimpleReady));
    },

    _geoLocationFailed: function(e) {
        log ("Failed to connect to GeoClue2 service: " + e.message);
        this.autoLocation = AutoLocation.NOT_AVAILABLE;
        GLib.idle_add(GLib.PRIORITY_DEFAULT, Lang.bind(this, function() {
            this._world.currentLocationChanged(null);
        }));
    },

    _onSimpleReady: function(object, result) {
        try {
            this._simple = Geoclue.Simple.new_finish(result);
        }
        catch (e) {
            this._geoLocationFailed(e);
            return;
        }

        let client = this._simple.get_client();
        client.distance_threshold = 100;

        this._findLocation();
    },

    _findLocation: function() {
        this._locationUpdatedId =
                    this._simple.connect("notify::location",
                                         this._onLocationUpdated.bind(this));

        this._onLocationUpdated(this._simple);
    },

    _onLocationUpdated: function(simple) {
        let geoclueLocation = simple.get_location();

        this.currentLocation = GWeather.Location.new_detached(geoclueLocation.description,
                                                              null,
                                                              geoclueLocation.latitude,
                                                              geoclueLocation.longitude);
        this._world.currentLocationChanged(this.currentLocation);
    },

    setAutoLocation: function(active) {
        this._settings.set_value('automatic-location', new GLib.Variant('b', active));

        if (this.autoLocation == AutoLocation.NOT_AVAILABLE)
            return;
        this._autoLocationChanged(active);
        this._syncAutoLocation(active);
    },

    _syncAutoLocation: function(autoLocation) {
        if (autoLocation)
            this.autoLocation = AutoLocation.ENABLED;
        else
            this.autoLocation = AutoLocation.DISABLED;
    },

    _autoLocationChanged: function(active) {
        if (active) {
            if (!this._processStarted) {
                this._startGeolocationService();
            } else {
                this._locationUpdatedId =
                    this._simple.connect("notify::location",
                                         this._onLocationUpdated.bind(this));
            }
        } else {
            this._simple.disconnect(this._locationUpdatedId);
        }
    }
});
