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

    showInfo: function(info, isCurrentLocation) {
        if (info != null &&
            this._infoList[0] != info &&
            this._infoList.length > 1) {
            this._moveLocationToFront(info, isCurrentLocation);
        }

        this._showInfoInternal(info);
    },

    _showInfoInternal: function(info) {
        this.currentlyLoadedInfo = info;
        this.emit('show-info', info);
        if (info != null)
            this.emit('revalidate', info.location);
    },

    showRecent: function(listbox) {
        if (this._infoList.length > 0)
            this.showInfo(this._infoList[0], false);
        else
            this.showInfo(null, false);
    },

    load: function () {
        let locations = this._settings.get_value('locations').deep_unpack();

        if (locations.length > 5) {
            locations = locations.slice(0, 5);
            this._settings.set_value('locations', new GLib.Variant('av', locations));
        }

        let info = null;
        for (let i = locations.length - 1; i >= 0; i--) {
            let variant = locations[i];
            let location = this._world.deserialize(variant);

            info = this._addLocationInternal(location, false);
        }

        if (info)
            this._showAddedLocation(info, false);
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
                    this.showInfo(info, false);
                    return;
                }
            }
        }

        let info = this._addLocationInternal(newLocation, isCurrentLocation);
        this._showAddedLocation(info, isCurrentLocation);

        if (!isCurrentLocation)
            this._queueSaveSettings();
    },

    _queueSaveSettings: function() {
        if (this._queueSaveSettingsId)
            return;

        let id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 10,
                                          Lang.bind(this, function() {
                                              this._queueSaveSettingsId = 0;
                                              this._saveSettingsInternal();
                                              return false;
                                          }));
        this._queueSaveSettingsId = id;
    },

    _saveSettingsInternal: function() {
        let locations = [];

        for (let i = 0; i < this._infoList.length; i++) {
            if (!this._infoList[i]._isCurrentLocation)
                locations.push(this._infoList[i].location.serialize());
        }

        this._settings.set_value('locations', new GLib.Variant('av', locations));
    },

    saveSettingsNow: function() {
        if (!this._queueSaveSettingsId)
            return;

        GLib.source_remove(this._queueSaveSettingsId);
        this._queueSaveSettingsId = 0;

        this._saveSettingsInternal();
    },

    _moveLocationToFront: function(info, isCurrentLocation) {
        this._removeLocationInternal(info, true);
        this._addInfoInternal(info, isCurrentLocation);

        // mark info as a manually chosen location so that we
        // save it
        info._isCurrentLocation = false;

        this._queueSaveSettings();
    },

    _removeLocationInternal: function(oldInfo, skipDisconnect) {
        if (oldInfo._loadingId && !skipDisconnect) {
            oldInfo.disconnect(oldInfo._loadingId);
            oldInfo._loadingId = 0;
            this._updateLoadingCount(-1);
        }

        for (let i = 0; i < this._infoList.length; i++) {
            if (this._infoList[i] == oldInfo) {
                this._infoList.splice(i, 1);
                break;
            }
        }

        this.emit('location-removed', oldInfo);
    },

    _addLocationInternal: function(newLocation, isCurrentLocation) {
        let info = new GWeather.Info({ location: newLocation,
                                       enabled_providers: this._providers });
        this._addInfoInternal(info, isCurrentLocation);

        return info;
    },

    _addInfoInternal: function(info, isCurrentLocation) {
        info._isCurrentLocation = isCurrentLocation;
        this._infoList.unshift(info);
        this.updateInfo(info);

        this.emit('location-added', info, isCurrentLocation);

        if (this._infoList.length > 5) {
            let oldInfo = this._infoList.pop();
            this._removeLocationInternal(oldInfo);
        }
    },

    _showAddedLocation: function(info, isCurrentLocation) {
        if (isCurrentLocation) {
            if(!this.addedCurrentLocation)
                this._showInfoInternal(info);

            this.addedCurrentLocation = true;
        } else {
            this._showInfoInternal(info);
        }
    }
});
