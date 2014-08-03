// -*- Mode: js; indent-tabs-mode: nil; c-basic-offset: 4; tab-width: 4 -*-
//
// Copyright (c) 2012 Giovanni Campagna <scampa.giovanni@gmail.com>
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
const GObject = imports.gi.GObject;
const GWeather = imports.gi.GWeather;
const Lang = imports.lang;

const Params = imports.misc.params;
const Util = imports.misc.util;

const WorldModel = new Lang.Class({
    Name: 'WorldModel',
    Extends: GObject.Object,
    Signals: {
        'show-info': { param_types: [ GWeather.Info ] },
        'current-location-changed': { param_types: [ GWeather.Location ] },
        'revalidate': { param_types: [ GWeather.Location ] },
        'location-added': { param_types: [ GWeather.Info, GObject.Boolean ] },
        'location-removed': { param_types: [ GWeather.Info ] }
    },
    Properties: {
        'loading': GObject.ParamSpec.boolean('loading', '', '', GObject.ParamFlags.READABLE, false)
    },

    _init: function(world, enableGtk) {
        this.parent();

        this._world = world;

        this._settings = Util.getSettings('org.gnome.Weather.Application');
        this._providers = Util.getEnabledProviders();

        this._loadingCount = 0;

        this._infoList = [];

        this.currentlyLoadedInfo = null;
        this.addedCurrentLocation = false;
    },

    get length() {
        return this._infoList.length;
    },

    getAll: function() {
        return [].concat(this._infoList);
    },

    getAtIndex: function(index) {
        return this._infoList[index];
    },

    currentLocationChanged: function(location) {
        if (location) {
            this.addNewLocation(location, true);
        } else {
            if (!this.addedCurrentLocation)
                this.showRecent();
        }

        this.emit('current-location-changed', location);
    },

    showInfo: function(info) {
        this.currentlyLoadedInfo = info;
        this.emit('show-info', info);
        if (info != null)
            this.emit('revalidate', info.location);
    },

    showRecent: function(listbox) {
        if (this._infoList.length > 0)
            this.showInfo(this._infoList[0]);
        else
            this.showInfo(null);
    },

    load: function () {
        let locations = this._settings.get_value('locations').deep_unpack();

        if (locations.length > 5) {
            locations = locations.slice(0, 5);
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        for (let i = 0; i < locations.length; i++) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);

            this._addLocationInternal(location, false);
        }
    },

    _updateLoadingCount: function(delta) {
        let wasLoading = this._loadingCount > 0;
        this._loadingCount += delta;
        let isLoading = this._loadingCount > 0;

        if (wasLoading != isLoading)
            this.notify('loading');
    },

    updateInfo: function(info) {
        if (info._loadingId)
            return;

        info._loadingId = info.connect('updated', Lang.bind(this, function(info) {
            info.disconnect(info._loadingId);
            info._loadingId = 0;

            this._updateLoadingCount(-1);
        }));

        info.update();
        this._updateLoadingCount(+1);
    },

    get loading() {
        return this._loadingCount > 0;
    },

    addNewLocation: function(newLocation, isCurrentLocation) {
        if (!isCurrentLocation) {
            for (let info of this._infoList) {
                let location = info.location;
                if (location.equal(newLocation)) {
                    this.showInfo(info);
                    return;
                }
            }

            let locations = this._settings.get_value('locations').deep_unpack();
            locations.push(newLocation.serialize());
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        this._addLocationInternal(newLocation, isCurrentLocation);
    },

    _removeLocationInternal: function(oldInfo) {
        if (oldInfo._loadingId) {
            oldInfo.disconnect(oldInfo._loadingId);
            oldInfo._loadingId = 0;
            this._updateLoadingCount(-1);
        }

        this.emit('location-removed', oldInfo);
    },

    _addLocationInternal: function(newLocation, isCurrentLocation) {
        let info = new GWeather.Info({ location: newLocation,
                                       enabled_providers: this._providers });
        this._infoList.push(info);
        this.updateInfo(info);

        this.emit('location-added', info, isCurrentLocation);

        if (this._infoList.length > 5) {
            let oldInfo = this._infoList.pop();
            this._removeLocationInternal(oldInfo);
        }

        if (isCurrentLocation) {
            if(!this.addedCurrentLocation)
                this.showInfo(info);

            this.addedCurrentLocation = true;
        } else {
            this.showInfo(info);
        }
    }
});
